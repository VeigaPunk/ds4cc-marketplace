#!/usr/bin/env node
/* hardest/validate.mjs — corpus validator.
 * Usage:
 *   node hardest/validate.mjs              → validate every levels/*.js
 *   node hardest/validate.mjs --only FILE  → validate one level file (lane self-check)
 *   node hardest/validate.mjs --no-auto    → schema+reachability only (skip autopilot)
 *
 * Checks per level: schema (map chars, ragged rows, S/G present, patrol shape),
 * filename↔id match, BFS reachability of every coin/goal/patrol-waypoint from
 * start, then a deterministic autopilot clear (hard completability evidence).
 * Exit 0 = all checked levels pass.
 */
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { basename, join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const DIR = dirname(fileURLToPath(import.meta.url));
require(join(DIR, 'engine.js'));
require(join(DIR, 'autopilot.js'));
const E = globalThis.HardestEngine;
const A = globalThis.HardestAutopilot;

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const noAuto = args.includes('--no-auto');
const MAX_SIM = 120, MAX_DEATHS = 400;

function loadLevelFile(path) {
  globalThis.HARDEST_LEVELS = [];
  require(path);
  const arr = globalThis.HARDEST_LEVELS;
  if (!arr.length) throw new Error('file registered no level (must push to globalThis.HARDEST_LEVELS)');
  return arr[0];
}

function reachable(P, tx, ty, doorsOpen) {
  // BFS from start; 'D' blocks unless doorsOpen; 'T' pads add pair edges.
  const [sx, sy] = P.zones.start[0];
  const Pv = { grid: P.grid, doorsOpen };
  const tp = new Map();
  P.telepads.forEach(([x, y], i) => tp.set(y * P.w + x, P.telepads[i ^ 1]));
  const key = (x, y) => y * P.w + x;
  const seen = new Set([key(sx, sy)]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) return true;
    const nbrs = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    const pair = tp.get(key(x, y));
    if (pair) nbrs.push(pair);
    for (const [nx, ny] of nbrs) {
      if (E.solid(Pv, nx, ny) || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny)); q.push([nx, ny]);
    }
  }
  return false;
}

function checkFile(path) {
  const errs = [];
  const file = basename(path);
  let level = null;
  try { level = loadLevelFile(path); } catch (e) { return { file, errs: [`load: ${e.message}`] }; }

  if (!Number.isInteger(level.id)) errs.push('id: missing/non-integer');
  else {
    const m = file.match(/^(\d{2,3})-[a-z0-9-]+\.js$/);
    if (!m) errs.push(`filename '${file}' must match NN-slug.js (2-3 digit id)`);
    else if (parseInt(m[1], 10) !== level.id) errs.push(`filename id ${m[1]} != level.id ${level.id}`);
  }
  if (typeof level.name !== 'string' || !level.name) errs.push('name: missing');

  let P = null;
  try { P = E.parseLevel(level); } catch (e) { errs.push(`parse: ${e.message}`); }
  if (P) {
    if (P.telepads.length % 2) errs.push(`telepads: odd count ${P.telepads.length} (pads pair in scan order)`);
    // design contract: every key reachable with doors CLOSED
    for (const k of P.keys) if (!reachable(P, k.tx, k.ty, false)) errs.push(`key @${k.tx},${k.ty} unreachable (keys must not sit behind doors)`);
    // everything else reachable with doors OPEN + teleport edges
    for (const c of P.coins) if (!reachable(P, c.tx, c.ty, true)) errs.push(`coin @${c.tx},${c.ty} unreachable`);
    for (const g of P.zones.goal) if (!reachable(P, g[0], g[1], true)) errs.push(`goal @${g} unreachable`);
    for (const [i, p] of (level.patrols || []).entries()) {
      if (!(p.speed > 0)) errs.push(`patrol[${i}]: speed must be > 0`);
      if (p.r !== undefined && !(p.r > 0 && p.r <= 20)) errs.push(`patrol[${i}]: r out of range`);
      for (const [tx, ty] of p.path) {
        if (!Number.isInteger(tx) || !Number.isInteger(ty)) errs.push(`patrol[${i}]: non-integer waypoint ${tx},${ty}`);
        else if (tx < 0 || ty < 0 || tx >= P.w || ty >= P.h || P.grid[ty][tx] === '#')
          errs.push(`patrol[${i}]: waypoint ${tx},${ty} inside wall/OOB`);
        else if (!reachable(P, tx, ty, true)) errs.push(`patrol[${i}]: waypoint ${tx},${ty} unreachable`);
      }
    }
    // movers: solid w×h-tile blocks on waypoint paths. Sweep must never touch
    // '#' (they live in open floor) and never cover S/K (respawn must be safe).
    for (const [i, m] of (level.movers || []).entries()) {
      if (!(m.speed > 0)) errs.push(`mover[${i}]: speed must be > 0`);
      const wT = m.w || 1, hT = m.h || 1;
      if (!Number.isInteger(wT) || !Number.isInteger(hT) || wT < 1 || hT < 1 || wT > 4 || hT > 4)
        errs.push(`mover[${i}]: w/h must be integer 1-4 tiles`);
      const pm = P.movers[i];
      if (!pm) continue;
      const sweepBad = (cx, cy, what) => {
        const x0 = Math.floor((cx - pm.w / 2) / E.TILE), x1 = Math.floor((cx + pm.w / 2 - 0.001) / E.TILE);
        const y0 = Math.floor((cy - pm.h / 2) / E.TILE), y1 = Math.floor((cy + pm.h / 2 - 0.001) / E.TILE);
        for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
          const ch = (ty >= 0 && ty < P.h && tx >= 0 && tx < P.w) ? P.grid[ty][tx] : '#';
          if (ch === '#') errs.push(`mover[${i}]: ${what} sweeps wall @${tx},${ty}`);
          else if (ch === 'S' || ch === 'K') errs.push(`mover[${i}]: ${what} sweeps ${ch} zone @${tx},${ty} (respawn must stay safe)`);
        }
      };
      for (const s of pm.segs) {
        const n = Math.max(1, Math.ceil(s.len / 8));
        for (let k = 0; k <= n; k++) sweepBad(s.a[0] + (s.b[0] - s.a[0]) * k / n, s.a[1] + (s.b[1] - s.a[1]) * k / n, 'path');
      }
      for (const [tx, ty] of m.path) {
        if (!Number.isInteger(tx) || !Number.isInteger(ty)) errs.push(`mover[${i}]: non-integer waypoint ${tx},${ty}`);
        else if (tx < 0 || ty < 0 || tx >= P.w || ty >= P.h || P.grid[ty][tx] === '#')
          errs.push(`mover[${i}]: waypoint ${tx},${ty} inside wall/OOB`);
        else if (!reachable(P, tx, ty, true)) errs.push(`mover[${i}]: waypoint ${tx},${ty} unreachable`);
      }
    }
  }

  let auto = null;
  if (!errs.length && !noAuto) {
    try { auto = A.solve(level, { maxSim: MAX_SIM, maxDeaths: MAX_DEATHS }); }
    catch (e) { errs.push(`autopilot threw: ${e.message}`); }
    if (auto && !auto.clear) errs.push(`autopilot FAIL (${auto.reason}, deaths=${auto.deaths}, simT=${auto.simT.toFixed(1)}s)`);
  }
  return { file, errs, auto, level };
}

const files = only
  ? [resolve(process.cwd(), only)]
  : readdirSync(join(DIR, 'levels')).filter(f => f.endsWith('.js')).sort().map(f => join(DIR, 'levels', f));

if (!files.length) { console.log('no level files'); process.exit(1); }

let fail = 0;
const ids = new Map();
for (const f of files) {
  const r = checkFile(f);
  const lvl = r.level;
  if (lvl && Number.isInteger(lvl.id)) {
    if (ids.has(lvl.id)) r.errs.push(`duplicate id ${lvl.id} (also ${basename(ids.get(lvl.id))})`);
    else ids.set(lvl.id, f);
  }
  if (r.errs.length) {
    fail++;
    console.log(`FAIL ${r.file}`);
    for (const e of r.errs) console.log(`     - ${e}`);
  } else {
    const a = r.auto;
    console.log(`PASS ${r.file}${a ? `  clear t=${a.time.toFixed(1)}s deaths=${a.deaths}` : ''}`);
  }
}
console.log(`\n${files.length - fail}/${files.length} levels pass${noAuto ? ' (autopilot skipped)' : ''}`);
process.exit(fail ? 1 : 0);
