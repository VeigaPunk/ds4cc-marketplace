#!/usr/bin/env node
/**
 * lan-relay.mjs — one-command LAN host for BLOCK SIEGE (the 2Play Rooms game).
 *
 * Zero dependencies, Node >= 22 only. It does two jobs on one port:
 *   1. Static file server for the release (so guests just open a URL).
 *   2. WebSocket pair-relay at /lan — the first client to claim 'host' and the
 *      first 'guest' are paired; every {t:'msg'} payload is forwarded to the
 *      peer. No accounts, no internet, no third-party service: the two browsers
 *      and this process are the whole network.
 *
 * Usage:
 *   node lan-relay.mjs [--root DIR] [--port N]
 *     --root  directory to serve (default: ./site next to this script, else ./dist)
 *     --port  listen port (default: 8707)
 *
 * Host flow: open  http://<this-machine-LAN-ip>:8707/boxhead/  → LAN → HOST.
 * Guest flow: open  http://<this-machine-LAN-ip>:8707/boxhead/?join=auto  — done.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const PORT = Number(flag('port', 8707));
let ROOT = flag('root', null);
if (!ROOT) {
  for (const c of [path.join(HERE, '..', 'delivery', 'site'), path.join(HERE, '..', 'dist'), path.join(HERE, 'site'), HERE, process.cwd()]) {
    if (fs.existsSync(path.join(c, 'index.html'))) { ROOT = c; break; }
  }
  ROOT ??= process.cwd();
}
ROOT = path.resolve(ROOT);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(ROOT, '.' + p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

// --- minimal WebSocket framing -------------------------------------------------
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function wsAccept(key) {
  return crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
}

/** encode a server→client text frame (unmasked) */
function encode(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let head;
  if (len < 126) { head = Buffer.from([0x81, len]); }
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}

/** incremental frame parser; calls cb(opcode, payloadBuffer) per complete frame */
function makeParser(cb) {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskLen = masked ? 4 : 0;
      if (buf.length < off + maskLen + len) return;
      let payload = buf.subarray(off + maskLen, off + maskLen + len);
      if (masked) {
        const mask = buf.subarray(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      buf = buf.subarray(off + maskLen + len);
      cb(opcode, payload);
    }
  };
}

// --- pairing --------------------------------------------------------------------
/** rooms: code → { host?: sock, guest?: sock } */
const rooms = new Map();

function send(ws, obj) {
  if (!ws.destroyed) ws.write(encode(JSON.stringify(obj)));
}

server.on('upgrade', (req, ws) => {
  if (!req.url.startsWith('/lan')) { ws.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (!key) { ws.destroy(); return; }
  ws.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
  );
  ws.setNoDelay(true);

  let room = null;

  const leave = () => {
    if (!room) return;
    const r = rooms.get(room.code);
    if (r) {
      const other = r.host === ws ? r.guest : r.guest === ws ? r.host : null;
      if (r.host === ws) r.host = null;
      if (r.guest === ws) r.guest = null;
      if (other && !other.destroyed) send(other, { t: 'peer-left' });
      if (!r.host && !r.guest) rooms.delete(room.code);
    }
    room = null;
  };

  ws.on('data', makeParser((op, payload) => {
    if (op === 0x8) { ws.end(); return; }            // close
    if (op === 0x9) { ws.write(Buffer.from([0x8a, 0])); return; } // ping → pong
    if (op !== 0x1) return;                          // text only
    let m;
    try { m = JSON.parse(payload.toString('utf8')); } catch { return; }

    if (m.t === 'hello') {
      const code = typeof m.room === 'string' && m.room ? m.room.slice(0, 24) : 'main';
      const r = rooms.get(code) ?? { host: null, guest: null };
      rooms.set(code, r);
      if (m.role === 'host' && !r.host) { r.host = ws; room = { code }; }
      else if (!r.guest) { r.guest = ws; room = { code }; }
      else { send(ws, { t: 'full' }); return; }
      if (r.host && r.guest) {
        send(r.host, { t: 'paired' });
        send(r.guest, { t: 'paired' });
      } else {
        send(ws, { t: 'waiting' });
      }
      return;
    }
    if (m.t === 'msg' && room) {
      const r = rooms.get(room.code);
      const other = r && (r.host === ws ? r.guest : r.host);
      if (other && !other.destroyed) send(other, m.d);
    }
  }));
  // a destroyed client delivers FIN ('end') and can linger half-open —
  // treat either terminal event as the peer leaving
  ws.on('end', () => { leave(); ws.end(); });
  ws.on('close', leave);
  ws.on('error', leave);
});

server.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const n of list ?? []) {
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
    }
  }
  console.log(`[lan-relay] serving ${ROOT}`);
  console.log(`[lan-relay] local:   http://localhost:${PORT}/`);
  for (const ip of ips) console.log(`[lan-relay] LAN:     http://${ip}:${PORT}/   ← share this with player 2`);
  console.log('[lan-relay] ws endpoint: /lan  (host picks a room, guest opens .../boxhead/?join=auto)');
});
