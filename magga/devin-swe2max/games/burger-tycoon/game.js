/* games/burger-tycoon/game.js — BURGER BARON browser shell.
 * Four-pane supply-chain management satire in the spirit of Molleindustria's
 * McDonald's Videogame (2006). Original branding only — no McD marks.
 *
 * Desktop shows ALL FOUR PANES at once (spec §Core loop: "simultaneous
 * panes", feel = frantic multi-panel attention); narrow/mobile falls back to
 * tabbed single pane (the spec's own mobile mapping).
 * Sim lives in engine.js (same file the Node validator runs).
 * Persistence: maga:burger:save — best survival, peak cash, mute.
 */
(function () {
'use strict';
const E = globalThis.BurgerEngine;
const CORE = globalThis.MAGA, AU = globalThis.MAGA_AUDIO;
const W = 960, H = 540;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const PANES = E.PANES, PANE_KEY = E.PANE_KEY, ACTIONS = E.ACTIONS;

/* ---------- persistence ---------- */
const save = CORE.load('burger', 'save', null) || { best: 0, peakCash: 0, mute: false };
function persist() { CORE.save('burger', 'save', save); }

/* ---------- audio ---------- */
const bus = new AU.AudioBus();
bus.register([
  { id: 'sfx.click', kind: 'ui', polyphony: 4,
    recipe: { type: 'square_blip', durationMs: 40, freq: 740, gain: 0.06,
      envelope: { a: 0.001, d: 0.03, s: 0, r: 0.01 } } },
  { id: 'sfx.act', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 110, freq: 520, freqEnd: 760, gain: 0.10,
      envelope: { a: 0.002, d: 0.08, s: 0, r: 0.03 } } },
  { id: 'sfx.cash', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 130, freq: 990, freqEnd: 1560, gain: 0.10,
      noise: { amount: 0.25, freq: 5200 }, envelope: { a: 0.002, d: 0.09, s: 0, r: 0.04 } } },
  { id: 'sfx.dirty', kind: 'sfx', polyphony: 2,
    recipe: { type: 'saw_thud', durationMs: 260, freq: 130, freqEnd: 70, gain: 0.18,
      envelope: { a: 0.01, d: 0.2, s: 0, r: 0.06 } } },
  { id: 'sfx.deny', kind: 'sfx', polyphony: 2,
    recipe: { type: 'square_blip', durationMs: 130, freq: 220, freqEnd: 160, gain: 0.10,
      envelope: { a: 0.002, d: 0.1, s: 0, r: 0.03 } } },
  { id: 'sfx.alarm', kind: 'sfx', polyphony: 2,
    recipe: { type: 'square_blip', durationMs: 300, freq: 620, freqEnd: 480, gain: 0.14,
      envelope: { a: 0.004, d: 0.22, s: 0, r: 0.08 } } },
  { id: 'sfx.milestone', kind: 'sfx', polyphony: 1,
    recipe: { type: 'square_blip', durationMs: 320, freq: 523, freqEnd: 1046, gain: 0.13,
      envelope: { a: 0.003, d: 0.24, s: 0, r: 0.09 } } },
  { id: 'sfx.stamp', kind: 'sfx', polyphony: 1,
    recipe: { type: 'saw_thud', durationMs: 500, freq: 180, freqEnd: 45, gain: 0.34,
      noise: { amount: 0.5, freq: 700 }, envelope: { a: 0.003, d: 0.4, s: 0, r: 0.1 } } },
]);
// muzak-adjacent bed: bossa-ish bass + offbeat stabs + swing hats
bus.register([{ id: 'music.muzak', kind: 'music', recipe: { bpm: 96, stepsPerBeat: 4, tracks: [
  { wave: 'triangle', gain: 0.14, legato: true, pattern: [
    'C3', 0, 'G2', 0, 'A2', 0, 'E2', 0, 'F2', 0, 'G2', 0, 'C3', 0, 'G2', 0] },
  { wave: 'square', gain: 0.030, pattern: [
    0, 0, ['E4', 'G4'], 0, 0, 0, ['F4', 'A4'], 0, 0, 0, ['E4', 'G4'], 0, 0, 0, ['D4', 'G4'], 0] },
  { wave: 'square', gain: 0.016, octaveShift: 2, pattern: [
    'C6', 0, 'C6', 'C6', 0, 'C6', 'C6', 0, 'C6', 0, 'C6', 'C6', 0, 'C6', 'C6', 0] },
] } }]);
bus.setMuted(save.mute);

/* ---------- state ---------- */
let st = E.create((Math.random() * 2 ** 31) | 0);
let screen = 'title';                            // 'title' | 'play'
let pane = 0;                                    // focused pane (tab mode)
let hits = [];

function start() {
  st = E.create((Math.random() * 2 ** 31) | 0);
  screen = 'play'; pane = 0;
  bus.music('music.muzak');
}

/* ---------- input ---------- */
const kb = CORE.keyboard();
let touchMode = false;
const narrow = () => window.innerWidth < 760 || (touchMode && window.innerWidth < window.innerHeight);

addEventListener('keydown', e => {
  if (e.repeat) return;
  bus.unlock();
  if (e.code === 'KeyM') { save.mute = !save.mute; bus.setMuted(save.mute); persist(); return; }
  if (screen === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') { start(); bus.play('sfx.click'); }
    return;
  }
  const n = parseInt(e.key);
  if (n >= 1 && n <= 4) { pane = n - 1; bus.play('sfx.click'); }
  if (e.code === 'KeyR' && st.over) { start(); bus.play('sfx.click'); }
  if (e.code === 'Escape' && !st.over) { screen = 'title'; bus.stopMusic(); }
});

function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
cv.addEventListener('pointerdown', e => {
  bus.unlock();
  if (e.pointerType === 'touch') touchMode = true;
  const p = canvasPos(e);
  if (screen === 'title') { start(); bus.play('sfx.click'); return; }
  if (st.over) { start(); bus.play('sfx.click'); return; }
  for (const h of hits) {
    if (p.x > h.x && p.x < h.x + h.w && p.y > h.y && p.y < h.y + h.h) { h.fn(p); return; }
  }
});

/* ---------- event → SFX ---------- */
function drainEvents() {
  for (const ev of st.events) {
    if (ev === 'act') bus.play('sfx.act');
    else if (ev === 'dirty') { bus.play('sfx.dirty'); bus.duck(0.4, 250); }
    else if (ev === 'deny') bus.play('sfx.deny');
    else if (ev === 'outbreak' || ev === 'protest' || ev === 'expose' || ev === 'board') { bus.play('sfx.alarm'); bus.duck(0.5, 400); }
    else if (ev === 'milestone') bus.play('sfx.milestone');
    else if (ev === 'gameOver') { bus.play('sfx.stamp'); bus.stopMusic(); }
  }
  st.events.length = 0;
}

/* ================= presentation (ported + extended from prototype) ================= */
const PANE_TINT = ['rgba(120,160,60,.07)', 'rgba(160,110,60,.07)', 'rgba(200,120,60,.08)', 'rgba(60,90,160,.08)'];
const PANE_ICON = ['wheat', 'cow', 'burger', 'tower'];
const meterPrev = {}, meterAnim = {};
let cardFlash = { k: '', t: -9 };
const floats = [];
let lastFloatT = -9;

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return `rgb(${Math.round((n >> 16 & 255) + (t - (n >> 16 & 255)) * p)},${Math.round((n >> 8 & 255) + (t - (n >> 8 & 255)) * p)},${Math.round((n & 255) + (t - (n & 255)) * p)})`;
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

/* cached statics */
const bgCv = document.createElement('canvas'); bgCv.width = W; bgCv.height = H;
{
  const b = bgCv.getContext('2d');
  const g = b.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f2e9d4'); g.addColorStop(.55, '#e9dec4'); g.addColorStop(1, '#dcc9a4');
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  for (let i = 0; i < 1200; i++) { b.fillStyle = `rgba(120,90,40,${(i % 7) * 0.006 + 0.008})`; b.fillRect((i * 97) % 960, (i * 57) % 540, 1.4, 1.4); }
  const v = b.createRadialGradient(480, 250, 160, 480, 270, 620);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,40,10,.28)');
  b.fillStyle = v; b.fillRect(0, 0, W, H);
}
const hazCv = document.createElement('canvas'); hazCv.width = hazCv.height = 16;
{
  const h = hazCv.getContext('2d');
  h.fillStyle = '#241d12'; h.fillRect(0, 0, 16, 16);
  h.strokeStyle = '#8a6a1a'; h.lineWidth = 4;
  h.beginPath(); h.moveTo(-4, 20); h.lineTo(20, -4); h.moveTo(4, 28); h.lineTo(28, 4); h.stroke();
}
const HAZ = ctx.createPattern(hazCv, 'repeat');
const meterFill = {}, meterSheen = {};
function meterGrad(col, w) { const k = col + w; return meterFill[k] || (meterFill[k] = (() => { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, col); g.addColorStop(1, '#ffd27a'); return g; })()); }

/* icons (paths only) — same set as proto + 'person' */
function icon(name, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.4, s * 0.14); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const u = s / 10;
  switch (name) {
    case 'wheat':
      ctx.beginPath(); ctx.moveTo(0, 5 * u); ctx.lineTo(0, -5 * u); ctx.stroke();
      for (let k = 0; k < 3; k++) { const yy = -4 * u + k * 2.6 * u;
        ctx.beginPath(); ctx.ellipse(-1.6 * u, yy, 1.7 * u, 0.9 * u, -0.7, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(1.6 * u, yy, 1.7 * u, 0.9 * u, 0.7, 0, 7); ctx.fill(); }
      break;
    case 'cow':
      ctx.beginPath(); ctx.ellipse(0, 0.5 * u, 4.6 * u, 2.8 * u, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(4.4 * u, -1.6 * u, 1.7 * u, 0, 7); ctx.fill();
      ctx.fillRect(-3.4 * u, 2.6 * u, 1.1 * u, 2.6 * u); ctx.fillRect(2.2 * u, 2.6 * u, 1.1 * u, 2.6 * u);
      ctx.beginPath(); ctx.moveTo(3.4 * u, -3 * u); ctx.lineTo(2.6 * u, -4 * u); ctx.moveTo(5.4 * u, -3 * u); ctx.lineTo(6.2 * u, -4 * u); ctx.stroke();
      break;
    case 'dozer':
      ctx.fillRect(-4.6 * u, 1.6 * u, 6.4 * u, 2.6 * u);
      ctx.fillRect(-3.4 * u, -1.8 * u, 3.4 * u, 3.4 * u);
      ctx.beginPath(); ctx.moveTo(1.8 * u, 0.6 * u); ctx.lineTo(5 * u, -1.6 * u); ctx.lineTo(5 * u, 3 * u); ctx.lineTo(1.8 * u, 3 * u); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(-2.8 * u, 4.4 * u, 1 * u, 0, 7); ctx.arc(0.2 * u, 4.4 * u, 1 * u, 0, 7); ctx.fill();
      break;
    case 'cleaver':
      ctx.beginPath(); ctx.moveTo(-4.4 * u, -3.4 * u); ctx.lineTo(2.4 * u, -3.4 * u); ctx.lineTo(3.6 * u, 1.4 * u); ctx.lineTo(-4.4 * u, 1.4 * u); ctx.closePath(); ctx.fill();
      ctx.fillRect(2.6 * u, 1 * u, 1.6 * u, 4.4 * u);
      break;
    case 'feedbag':
      ctx.beginPath(); ctx.moveTo(-3.4 * u, 4.6 * u); ctx.lineTo(-2.4 * u, -2.6 * u); ctx.lineTo(2.4 * u, -2.6 * u); ctx.lineTo(3.4 * u, 4.6 * u); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2.6 * u, -2.6 * u); ctx.lineTo(2.6 * u, -2.6 * u); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 1 * u, 1.2 * u, 0, 7); ctx.stroke();
      break;
    case 'mega':
      ctx.beginPath(); ctx.moveTo(-4.4 * u, 1.4 * u); ctx.lineTo(3.4 * u, -2.8 * u); ctx.lineTo(3.4 * u, 3.4 * u); ctx.lineTo(-4.4 * u, 2.6 * u); ctx.closePath(); ctx.fill();
      ctx.fillRect(-4.8 * u, 0.6 * u, 1.6 * u, 3.2 * u);
      ctx.beginPath(); ctx.moveTo(4.6 * u, -2.4 * u); ctx.lineTo(5.8 * u, -3.4 * u); ctx.moveTo(4.8 * u, 0.4 * u); ctx.lineTo(6.2 * u, 0.4 * u); ctx.stroke();
      break;
    case 'megabadge':
      ctx.beginPath(); ctx.moveTo(-4.4 * u, 1.4 * u); ctx.lineTo(2.2 * u, -2.2 * u); ctx.lineTo(2.2 * u, 3 * u); ctx.lineTo(-4.4 * u, 2.6 * u); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(3.8 * u, -2.6 * u, 2 * u, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.font = `bold ${Math.round(4 * u)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 3.8 * u, -2.6 * u);
      break;
    case 'burger':
      ctx.beginPath(); ctx.ellipse(0, -1.8 * u, 4.6 * u, 2.4 * u, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(-4.6 * u, -0.6 * u, 9.2 * u, 1.4 * u);
      ctx.beginPath(); ctx.moveTo(-4.4 * u, 1.4 * u);
      for (let k = 0; k < 5; k++) ctx.lineTo(-4.4 * u + (k + 0.5) * 1.76 * u, (k % 2 ? 2.4 : 1.2) * u);
      ctx.lineTo(4.4 * u, 1.4 * u); ctx.stroke();
      ctx.fillRect(-4.2 * u, 3 * u, 8.4 * u, 1.6 * u);
      break;
    case 'cash':
      rr(-4.6 * u, -3 * u, 9.2 * u, 6 * u, 1 * u); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.font = `bold ${Math.round(5 * u)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 0.2 * u);
      break;
    case 'spin':
      ctx.beginPath(); ctx.arc(0, 0, 3.6 * u, 0.6, 4.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3.6 * u * Math.cos(4.4), 3.6 * u * Math.sin(4.4)); ctx.lineTo(3.6 * u * Math.cos(4.4) - 2.4 * u, 3.6 * u * Math.sin(4.4) - 0.6 * u); ctx.lineTo(3.6 * u * Math.cos(4.4) + 0.4 * u, 3.6 * u * Math.sin(4.4) - 2.2 * u); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 3.6 * u, 3.8, 7.0); ctx.stroke();
      break;
    case 'tower':
      ctx.fillRect(-3.4 * u, -4.6 * u, 6.8 * u, 9.2 * u);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 2; c2++) ctx.fillRect(-2.4 * u + c2 * 3 * u, -3.4 * u + r2 * 2.8 * u, 1.4 * u, 1.4 * u);
      break;
    case 'warn':
      ctx.beginPath(); ctx.moveTo(0, -4.6 * u); ctx.lineTo(4.6 * u, 3.6 * u); ctx.lineTo(-4.6 * u, 3.6 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(-0.6 * u, -2.2 * u, 1.2 * u, 3 * u); ctx.fillRect(-0.6 * u, 1.6 * u, 1.2 * u, 1.2 * u);
      break;
    case 'person':
      ctx.beginPath(); ctx.arc(0, -2.6 * u, 2.2 * u, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -0.2 * u); ctx.lineTo(-3 * u, 4.6 * u); ctx.lineTo(3 * u, 4.6 * u); ctx.closePath(); ctx.fill();
      break;
  }
  ctx.restore();
}

/* scene props */
function cloud(x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, 7); ctx.arc(x + 9 * s, y - 3 * s, 8 * s, 0, 7); ctx.arc(x + 18 * s, y, 6.5 * s, 0, 7); ctx.fill(); }
function barn(x, y, w, h) { ctx.fillStyle = '#7a2e22'; ctx.fillRect(x, y, w, h); ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + w / 2, y - h * 0.55); ctx.lineTo(x + w + 3, y); ctx.closePath(); ctx.fillStyle = '#5a1f16'; ctx.fill(); ctx.fillStyle = '#3a140e'; ctx.fillRect(x + w * 0.36, y + h * 0.4, w * 0.28, h * 0.6); }
function silo(x, y, w, h) { ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x, y, w, h); ctx.beginPath(); ctx.arc(x + w / 2, y, w / 2, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + w * 0.6, y, w * 0.4, h); }
function cowS(x, y, s) { ctx.fillStyle = '#241a12'; ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 5.5 * s, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 9 * s, y - 3 * s, 3.4 * s, 0, 7); ctx.fill(); ctx.fillRect(x - 6 * s, y + 4 * s, 2 * s, 4.5 * s); ctx.fillRect(x + 4 * s, y + 4 * s, 2 * s, 4.5 * s); }
function person(x, py, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, py - 13 * s, 2.6 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, py - 10 * s); ctx.lineTo(x - 3 * s, py); ctx.lineTo(x + 3 * s, py); ctx.closePath(); ctx.fill(); }
function smokePuff(x, y, r, a) { ctx.fillStyle = `rgba(70,64,60,${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.arc(x + r * 0.7, y - r * 0.4, r * 0.7, 0, 7); ctx.fill(); }

/* gradients are viewport-relative — build per rect */
function lg(x, y, h, stops) { const g = ctx.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }

function scFarm(x, y, w, h, d) {
  ctx.fillStyle = lg(x, y, h, d ? [[0, '#e07840'], [.55, '#a84828'], [1, '#5a2a1a']] : [[0, '#8fd0e8'], [.6, '#cfe8c8'], [1, '#e8e0b0']]);
  ctx.fillRect(x, y, w, h);
  if (!d) { ctx.fillStyle = '#f4e2a0'; ctx.beginPath(); ctx.arc(x + w - 42, y + 26, 13, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = '#ff9a50'; ctx.beginPath(); ctx.arc(x + w - 42, y + 26, 11, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,120,40,.25)'; ctx.beginPath(); ctx.arc(x + w - 42, y + 26, 18, 0, 7); ctx.fill(); }
  const ct = st.t * (d ? 4 : 9);
  cloud(x + ((ct * 1.3) % (w + 80)) - 40, y + 22, .9, d ? 'rgba(90,60,50,.5)' : 'rgba(255,255,255,.85)');
  cloud(x + ((ct * 0.8 + 140) % (w + 80)) - 40, y + 40, .65, d ? 'rgba(90,60,50,.4)' : 'rgba(255,255,255,.7)');
  ctx.fillStyle = d ? '#2a1a12' : '#4a7a3a';
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.55);
  for (let i = 0; i <= 16; i++) ctx.lineTo(x + i * w / 16, y + h * 0.55 - ((i * 37) % 13));
  ctx.lineTo(x + w, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.62); ctx.lineTo(x, y + h * 0.62); ctx.closePath(); ctx.fill();
  barn(x + 14, y + h * 0.40, 42, 28); silo(x + 62, y + h * 0.32, 13, 44);
  ctx.fillStyle = d ? '#6a4a28' : '#7a9a4a'; ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
  for (let r = 0; r < 3; r++) { const ry = y + h * 0.68 + r * h * 0.10;
    for (let i = 0; i < 13; i++) { const px = x + 12 + i * (w - 24) / 12, sway = Math.sin(st.t * 1.6 + i * 0.7 + r) * 1.6;
      ctx.strokeStyle = d ? '#5a4a20' : '#3f7a2e'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(px, ry + 7); ctx.quadraticCurveTo(px + sway, ry + 2, px + sway * 1.4, ry - 3); ctx.stroke();
      ctx.fillStyle = d ? '#8a7a30' : '#5a9a3a'; ctx.beginPath(); ctx.ellipse(px + sway * 1.4, ry - 4, 2.2, 1.3, sway * 0.1, 0, 7); ctx.fill(); } }
  if (d) {
    for (let i = 0; i < 3; i++) { const bx = x + 30 + i * (w / 3.4);
      for (let k = 0; k < 4; k++) { const ph = (st.t * 0.5 + k * 0.25 + i * 0.13) % 1; smokePuff(bx + Math.sin(ph * 6 + i) * 7, y + h * 0.5 - ph * 56, 5 + ph * 11, 0.5 * (1 - ph)); } }
    for (let i = 0; i < 10; i++) { const ph = (st.t * 0.9 + i * 0.31) % 1;
      ctx.fillStyle = `rgba(255,${140 + ((i * 53) % 80)},40,${0.8 * (1 - ph)})`;
      ctx.fillRect(x + ((i * 67) % w) + Math.sin(ph * 9) * 5, y + h * 0.6 - ph * h * 0.5, 2, 2); }
    ctx.fillStyle = 'rgba(60,20,10,.25)'; ctx.fillRect(x, y, w, h);
  }
}
function scFeed(x, y, w, h, d) {
  ctx.fillStyle = lg(x, y, h, d ? [[0, '#9aa0a0'], [1, '#787c74']] : [[0, '#c8d8d0'], [1, '#a8b8a0']]);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#8a7a58'; ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
  if (d) {
    for (let i = 0; i < 2; i++) { const sx = x + w - 60 + i * 36;
      ctx.fillStyle = '#4a4440'; ctx.fillRect(sx, y + h * 0.16, 13, h * 0.42);
      ctx.fillStyle = '#5a5450'; ctx.fillRect(sx - 3, y + h * 0.16, 19, 5);
      for (let k = 0; k < 3; k++) { const ph = (st.t * 0.4 + k * 0.33 + i * 0.2) % 1; smokePuff(sx + 7 + Math.sin(ph * 5 + i) * 8, y + h * 0.14 - ph * 46, 4 + ph * 10, 0.45 * (1 - ph)); } }
    ctx.fillStyle = 'rgba(120,120,110,.22)'; ctx.fillRect(x, y, w, h * 0.6);
  }
  ctx.strokeStyle = '#6a5238'; ctx.lineWidth = 2.4;
  for (let r = 0; r < 3; r++) { const ry = y + h * 0.50 + r * 8; ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); ctx.stroke(); }
  for (let i = 0; i <= 8; i++) { const px = x + i * w / 8; ctx.beginPath(); ctx.moveTo(px, y + h * 0.48); ctx.lineTo(px, y + h * 0.48 + 22); ctx.stroke(); }
  const n = Math.min(7, 3 + Math.floor(st.cattle / 8));
  for (let i = 0; i < n; i++) { const px = x + 24 + ((i * 97) % (w - 60)), py = y + h * 0.70 + ((i * 31) % (h * 0.2)), bob = Math.sin(st.t * 2 + i * 1.7) * 1.3;
    cowS(px, py + bob, 0.75 + (i % 3) * 0.12); }
  ctx.fillStyle = '#5a4630'; ctx.fillRect(x + 12, y + h * 0.86, 58, 9); ctx.fillStyle = '#c8a860'; ctx.fillRect(x + 14, y + h * 0.86 + 2, 54, 3);
  if (st.disease > 8) { for (let i = 0; i < 4; i++) { const ph = (st.t * 0.6 + i * 0.27) % 1;
    ctx.strokeStyle = `rgba(120,180,60,${0.5 * (1 - ph)})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x + 34 + i * 50, y + h * 0.7); ctx.quadraticCurveTo(x + 34 + i * 50 + Math.sin(ph * 8) * 7, y + h * 0.7 - ph * 24, x + 34 + i * 50 + Math.sin(ph * 8 + 1) * 9, y + h * 0.7 - ph * 38); ctx.stroke(); } }
}
function scRest(x, y, w, h, d) {
  ctx.fillStyle = lg(x, y, h, [[0, '#f0c890'], [1, '#d8a060']]);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7a6a58'; ctx.fillRect(x, y + h * 0.80, w, h * 0.20);
  const bx = x + 26, bw = w - 52, by = y + h * 0.28, bh = h * 0.52;
  ctx.fillStyle = '#8a2f26'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 1; i < 5; i++) ctx.fillRect(bx, by + i * bh / 5, bw, 1.2);
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(bx - 5, by - 14, bw + 10, 15);
  ctx.fillStyle = '#ffb224'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('BURGER BARON', bx + bw / 2, by - 3); ctx.textAlign = 'left';
  const ax = bx - 7, aw = bw + 14, ay = by + 15;
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#e8dcc0' : '#c8352a'; ctx.fillRect(ax + i * aw / 8, ay, aw / 8, 13);
    ctx.beginPath(); ctx.arc(ax + (i + 0.5) * aw / 8, ay + 13, aw / 16, 0, Math.PI); ctx.fill(); }
  const wx = bx + 11, wy = ay + 22, ww = bw - 72, wh = by + bh - wy - 6;
  const winG2 = lg(0, wy, wh, [[0, '#ffd890'], [1, '#c89040']]);
  ctx.fillStyle = winG2; ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = 'rgba(255,220,140,.3)'; ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
  ctx.fillStyle = winG2; ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(wx + 5, wy + wh - 11, ww - 10, 6);
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(bx + bw - 48, wy, 36, wh);
  for (let i = 0; i < 3; i++) { const ph = (st.t * 0.5 + i * 0.33) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(wx + 11 + i * 13, wy - 2); ctx.quadraticCurveTo(wx + 11 + i * 13 + Math.sin(ph * 7) * 5, wy - 8 - ph * 12, wx + 11 + i * 13 + Math.sin(ph * 7 + 1) * 7, wy - 15 - ph * 15); ctx.stroke(); }
  const q = Math.min(7, 1 + Math.round(st.demand * 2));
  for (let i = 0; i < q; i++) { const px = bx + bw - 38 - i * 18, py = y + h * 0.86 + ((i * 11) % 5);
    person(px, py + Math.sin(st.t * 2.2 + i) * 1.1, 0.95, ['#2a3450', '#5a2a2a', '#2a4a2a', '#4a3a1a', '#3a2a4a', '#1a3a4a', '#503030'][i % 7]); }
  ctx.fillStyle = '#4a3a2a'; ctx.fillRect(bx + bw - 20, by + bh - 26, 16, 26);
  if (st.lastProfit > st.rates.overhead && floats.length < 9 && st.t - lastFloatT > 0.5) { lastFloatT = st.t; floats.push({ x: x + 50 + Math.random() * (w - 110), y: y + 34, t0: st.t }); }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i], age = st.t - f.t0;
    if (age > 1.6) { floats.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(30,140,60,${0.9 * (1 - age / 1.6)})`; ctx.font = 'bold 11px monospace';
    ctx.fillText('+$', f.x, f.y - age * 22); }
}
function scHQ(x, y, w, h, d) {
  ctx.fillStyle = lg(x, y, h, [[0, '#0c1226'], [1, '#1c2a4a']]);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#e8e8f0'; for (let i = 0; i < 22; i++) { const sx2 = x + ((i * 67) % w), sy2 = y + ((i * 41) % Math.floor(h * 0.5)); ctx.globalAlpha = 0.3 + ((i * 29) % 50) / 100; ctx.fillRect(sx2, sy2, 1.4, 1.4); } ctx.globalAlpha = 1;
  const tx = x + w * 0.30, tw = w * 0.40, ty = y + 10, th = h * 0.60;
  ctx.fillStyle = '#141c30'; ctx.fillRect(tx, ty, tw, th);
  ctx.fillStyle = '#1c2740'; ctx.fillRect(tx + tw * 0.55, ty, tw * 0.45, th);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
    const lit = ((r * 7 + c * 13) % 5) < 2 ^ ((Math.floor(st.t * 0.5) + r + c) % 11 === 0);
    ctx.fillStyle = lit ? '#ffd27a' : '#232c44'; ctx.fillRect(tx + 6 + c * (tw - 12) / 4, ty + 8 + r * (th - 16) / 7, (tw - 12) / 4 - 5, (th - 16) / 7 - 4); }
  ctx.fillStyle = Math.sin(st.t * 3) > 0 ? '#ff5050' : '#5a1a1a'; ctx.beginPath(); ctx.arc(tx + tw / 2, ty - 3, 2.6, 0, 7); ctx.fill();
  ctx.fillStyle = '#0a0e18'; ctx.fillRect(x, y + h * 0.76, w, h * 0.24);
  ctx.fillStyle = '#101828'; ctx.fillRect(x, y + h * 0.68, w, h * 0.08 + 6);
  const msg = st.lastProfit > st.rates.overhead ? '▲ PROFIT BEATS OVERHEAD — BOARD PLEASED' : '▼ PROFIT BELOW OVERHEAD — BOARD UNEASY';
  const tcol = st.lastProfit > st.rates.overhead ? '#51cf66' : '#ff6b6b';
  const ty2 = y + h * 0.68; ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, ty2, w, 13);
  ctx.save(); ctx.beginPath(); ctx.rect(x, ty2, w, 13); ctx.clip();
  ctx.font = 'bold 9px monospace'; const tw2 = ctx.measureText(msg).width + 50, off = (st.t * 46) % tw2;
  ctx.fillStyle = tcol; for (let k = 0; k < 3; k++) ctx.fillText(msg, x + w - off + k * tw2, ty2 + 10);
  ctx.restore();
  if (st.boardPressure > 0) { ctx.fillStyle = `rgba(200,30,30,${0.22 * (st.boardPressure / 100) * (0.6 + 0.4 * Math.sin(st.t * 4))})`; ctx.fillRect(x, y, w, h); }
}
const SCENES = [scFarm, scFeed, scRest, scHQ];

/* meters */
function meter(x, y, w, v, max, col, label, small) {
  const hh = small ? 11 : 16;
  const pv = meterPrev[label];
  if (pv !== undefined && Math.floor(pv) !== Math.floor(v)) meterAnim[label] = st.t;
  meterPrev[label] = v;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(x + 1, y + 2, w, hh, 4); ctx.fill();
  ctx.fillStyle = '#1a1d22'; rr(x, y, w, hh, 4); ctx.fill();
  ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 1; rr(x, y, w, hh, 4); ctx.stroke();
  const f = Math.min(1, Math.max(0, v / max));
  if (f > 0.005) { ctx.save(); rr(x, y, w, hh, 4); ctx.clip();
    ctx.fillStyle = meterGrad(col, w); ctx.fillRect(x, y, w * f, hh);
    const sk = 'sh' + y + 'x' + x; if (!meterSheen[sk]) { const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.5, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); meterSheen[sk] = g; }
    ctx.fillStyle = meterSheen[sk]; ctx.fillRect(x, y, w * f, hh);
    const a = st.t - (meterAnim[label] ?? -9);
    if (a < 0.7) { const sx2 = x + w * f - 26 + a * 80; ctx.fillStyle = `rgba(255,255,255,${0.4 * (1 - a / 0.7)})`; ctx.fillRect(sx2, y, 8, hh); }
    ctx.restore(); }
  ctx.font = `bold ${small ? 8 : 11}px monospace`;
  ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 2.5; ctx.strokeText(`${label} ${v.toFixed(0)}`, x + 5, y + hh - (small ? 3 : 4));
  ctx.fillStyle = '#f2eee0'; ctx.fillText(`${label} ${v.toFixed(0)}`, x + 5, y + hh - (small ? 3 : 4));
}
const PANE_METERS = [
  [['CROPS', s => s.crops, 100, '#2b8a3e'], ['CATTLE', s => s.cattle, 50, '#a0522d']],
  [['PATTIES', s => s.patties, 60, '#d6336c'], ['DISEASE', s => s.disease, 20, '#e8590c']],
  [['STOCK', s => s.patties, 60, '#d6336c'], ['DEMAND', s => s.demand, 3, '#1971c2']],
  [['BACKLASH', s => s.backlash, 100, '#e8590c'], ['BOARD', s => s.boardPressure, 100, '#c2255c']],
];

/* one pane quadrant: scene + plate + meters + action strip */
function drawPane(i, x, y, w, h) {
  const key = PANE_KEY[i], acts = ACTIONS[key];
  const ABH = Math.round(h * 0.24);              // action bar height
  const scH = h - ABH;
  ctx.save(); rr(x, y, w, scH, 6); ctx.clip();
  SCENES[i](x, y, w, scH, !!acts.some(a => a.dirty && st.dirty[a.dirty]));
  ctx.restore();
  // pane plate
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(x + 6, y + 5, 128, 20, 5); ctx.fill();
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1; rr(x + 6, y + 5, 128, 20, 5); ctx.stroke();
  icon(PANE_ICON[i], x + 18, y + 15, 8, '#ffb224');
  ctx.fillStyle = '#f0e6cc'; ctx.font = 'bold 12px monospace';
  ctx.fillText(`${i + 1} ${PANES[i]}`, x + 30, y + 19);
  // meters (top-right of scene)
  PANE_METERS[i].forEach(([label, get, max, col], mi) =>
    meter(x + w - 128, y + 6 + mi * 14, 122, get(st), max, col, label, true));
  // action bar
  ctx.fillStyle = 'rgba(10,12,16,.82)'; rr(x, y + scH, w, ABH, 6); ctx.fill();
  ctx.fillRect(x, y + scH, w, 4);
  const n = acts.length, bw = (w - 10 - (n - 1) * 6) / n;
  acts.forEach((a, ai) => {
    const bx = x + 5 + ai * (bw + 6), by = y + scH + 6, bh = ABH - 12;
    const dirty = !!a.dirty, active = dirty && st.dirty[a.dirty];
    const afford = !a.cost || st.cash >= a.cost;
    const cd = st.cooldowns[a.id] || 0;
    hits.push({ x: bx, y: by, w: bw, h: bh, label: a.label, pane: i,
      fn: () => { if (E.apply(st, key, ai)) cardFlash = { k: a.id, t: st.t }; } });
    ctx.fillStyle = dirty ? '#33270f' : afford ? '#3c5a80' : '#2a2e35';
    rr(bx, by, bw, bh, 5); ctx.fill();
    if (dirty) { ctx.save(); rr(bx, by, bw, bh, 5); ctx.clip(); ctx.globalAlpha = .25; ctx.fillStyle = HAZ; ctx.fillRect(bx, by, bw, bh); ctx.globalAlpha = 1; ctx.restore(); }
    ctx.strokeStyle = active ? '#ffb224' : dirty ? '#6a5420' : afford ? '#4a6a94' : '#3a3f48';
    ctx.lineWidth = active ? 2 : 1; rr(bx, by, bw, bh, 5); ctx.stroke();
    icon(a.icon, bx + 13, by + bh / 2 - (bh > 34 ? 4 : 0), 7.5, dirty ? '#ffb224' : afford ? '#eaf2ff' : '#5a616c');
    ctx.fillStyle = dirty ? '#ffd9a0' : afford ? '#f4f8ff' : '#6a7280';
    ctx.font = `bold ${bw > 150 ? 10 : 8.5}px monospace`;
    ctx.fillText(a.label.replace('DIRTY: ', ''), bx + 24, by + (bh > 34 ? 15 : bh / 2 + 3));
    if (bh > 34) { ctx.fillStyle = afford ? '#9aa8bc' : '#565e68'; ctx.font = '8px monospace'; ctx.fillText(a.desc, bx + 24, by + bh - 8); }
    if (dirty && active) { const pl = 0.5 + 0.5 * Math.sin(st.t * 5);
      ctx.strokeStyle = `rgba(255,178,36,${0.4 + 0.5 * pl})`; ctx.lineWidth = 2; rr(bx, by, bw, bh, 5); ctx.stroke(); }
    if (cd > 0) { ctx.fillStyle = 'rgba(10,12,16,.55)'; rr(bx, by, bw * Math.min(1, cd / (a.cd || 1)), bh, 5); ctx.fill(); }
    if (cardFlash.k === a.id) { const p2 = (st.t - cardFlash.t) / 0.3;
      if (p2 < 1) { ctx.fillStyle = `rgba(255,255,220,${0.5 * (1 - p2)})`; rr(bx, by, bw, bh, 5); ctx.fill(); } }
  });
}

/* HUD strip */
function drawHUD() {
  ctx.fillStyle = '#14161a'; ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = '#b8860b'; ctx.fillRect(0, 39, W, 2);
  const items = [
    ['CASH', `$${st.cash.toFixed(0)}`, st.cash > 100 ? '#51cf66' : '#ff6b6b'],
    ['REP', st.rep.toFixed(0), st.rep > 30 ? '#74c0fc' : '#ff6b6b'],
    ['BACKLASH', st.backlash.toFixed(0), st.backlash > 60 ? '#ff6b6b' : '#ffd43b'],
    ['BOARD', st.boardPressure.toFixed(0), st.boardPressure > 60 ? '#ff6b6b' : '#ffd43b'],
    ['DEMAND', st.demand.toFixed(1) + 'x', '#e599f7'],
    ['PROFIT', `$${st.lastProfit.toFixed(1)}/s`, st.lastProfit > st.rates.overhead ? '#51cf66' : '#ff6b6b'],
  ];
  let hx = 14;
  ctx.font = 'bold 12px monospace';
  for (const [k, v, col] of items) {
    ctx.fillStyle = '#8a929c'; ctx.fillText(k, hx, 17);
    ctx.fillStyle = col; ctx.font = 'bold 14px monospace'; ctx.fillText(v, hx, 33);
    ctx.font = 'bold 12px monospace';
    hx += ctx.measureText(k).width + ctx.measureText(v).width + 46;
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffb224'; ctx.font = 'bold 13px monospace';
  ctx.fillText(`T+${Math.floor(st.t / 60)}:${String(Math.floor(st.t % 60)).padStart(2, '0')}`, W - 14, 18);
  ctx.fillStyle = '#8a929c'; ctx.font = '10px monospace';
  ctx.fillText(save.mute ? 'M unmute' : 'M mute', W - 14, 32);
  ctx.textAlign = 'left';
}

/* event log ticker */
function drawLog(y) {
  ctx.fillStyle = '#0a0c0a'; ctx.fillRect(0, y, W, H - y);
  ctx.fillStyle = '#232323'; ctx.fillRect(0, y, W, 1);
  ctx.font = '11px monospace';
  st.log.slice(0, 2).forEach((l, i) => {
    ctx.fillStyle = i === 0 ? '#8ce99a' : '#4a7a54';
    ctx.fillText(`[${l.t.toFixed(0)}s] ${l.msg}`, 12, y + 15 + i * 13);
  });
}

/* title + gameover */
function drawTitle() {
  ctx.drawImage(bgCv, 0, 0);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(W / 2 - 300, 96, 600, 110, 12); ctx.fill();
  ctx.fillStyle = '#ffb224'; ctx.font = 'bold 52px monospace';
  ctx.shadowColor = '#b8860b'; ctx.shadowBlur = 16;
  ctx.fillText('BURGER BARON', W / 2, 152);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d8cbb0'; ctx.font = '15px monospace';
  ctx.fillText('four panes · one economy · no clean hands', W / 2, 182);
  ctx.fillStyle = '#8a929c'; ctx.font = '13px monospace';
  ctx.fillText('Farm grows crops → feedlot makes patties → restaurant sells → HQ takes the heat.', W / 2, 240);
  ctx.fillText('Dirty shortcuts boost profit and invite backlash. Cash or reputation hits zero = over.', W / 2, 262);
  ctx.fillText('Survive. That is the only score.', W / 2, 284);
  ctx.fillStyle = '#f0e6cc'; ctx.font = 'bold 16px monospace';
  ctx.fillText(save.best ? `BEST: ${Math.floor(save.best / 60)}m ${Math.floor(save.best % 60)}s · peak $${(save.peakCash || 0).toFixed(0)}` : 'CLICK / ENTER TO OPEN FOR BUSINESS', W / 2, 340);
  ctx.fillStyle = '#667'; ctx.font = '12px monospace';
  ctx.fillText('click actions · keys 1-4 focus a pane on small screens · M mute · ESC title', W / 2, 500);
  ctx.textAlign = 'left';
}
function drawOver() {
  ctx.fillStyle = 'rgba(20,16,10,.55)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 240); ctx.rotate(-0.12);
  ctx.strokeStyle = '#a02020'; ctx.lineWidth = 5; rr(-230, -80, 460, 150, 10); ctx.stroke();
  ctx.strokeStyle = '#a02020'; ctx.lineWidth = 2; rr(-222, -72, 444, 134, 8); ctx.stroke();
  ctx.fillStyle = '#a02020'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center';
  ctx.fillText(st.cash <= 0 ? 'BANKRUPT' : 'SHUT DOWN', 0, -22);
  ctx.font = 'bold 14px monospace'; ctx.fillText(st.overWhy, 0, 12);
  ctx.font = '13px monospace';
  ctx.fillText(`survived ${Math.floor(st.t / 60)}m ${Math.floor(st.t % 60)}s · peak $${st.stats.peakCash.toFixed(0)} · ${st.stats.burgersSold.toFixed(0)} burgers`, 0, 40);
  ctx.fillText('R / click — reopen', 0, 62);
  ctx.restore(); ctx.textAlign = 'left';
}

/* ---------- frame ---------- */
function draw() {
  hits = [];
  if (screen === 'title') return drawTitle();
  ctx.drawImage(bgCv, 0, 0);
  drawHUD();
  if (narrow()) {
    // tabbed mobile mapping: one pane large + tab strip
    for (let i = 0; i < 4; i++) {
      const tx = 8 + i * ((W - 16) / 4), tw = (W - 16) / 4 - 6;
      hits.push({ x: tx, y: 48, w: tw, h: 26, fn: () => { pane = i; bus.play('sfx.click'); } });
      ctx.fillStyle = i === pane ? '#2c3e57' : '#1d2026'; rr(tx, 48, tw, 26, 5); ctx.fill();
      ctx.strokeStyle = i === pane ? '#b8860b' : '#2a2e35'; rr(tx, 48, tw, 26, 5); ctx.stroke();
      ctx.fillStyle = i === pane ? '#ffd27a' : '#8a929c'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${i + 1} ${PANES[i]}`, tx + tw / 2, 65); ctx.textAlign = 'left';
    }
    drawPane(pane, 8, 82, W - 16, 400);
    drawLog(490);
  } else {
    // desktop: all four panes at once — the spec's frantic multi-panel attention
    const gw = (W - 24) / 2, gh = 218;
    for (let i = 0; i < 4; i++) drawPane(i, 8 + (i % 2) * (gw + 8), 48 + Math.floor(i / 2) * (gh + 6), gw, gh);
    drawLog(496);
  }
  if (st.over) drawOver();
}

/* sim at 10Hz fixed (economy tick), render every frame */
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000); last = now;
  const DT = 0.1;
  while (acc >= DT) { if (screen === 'play') E.step(st, DT); acc -= DT; }
  drainEvents();
  if (screen === 'play' && st.over) {
    if (st.t > (save.best || 0)) { save.best = st.t; save.peakCash = st.stats.peakCash; persist(); }
  }
  draw();
  requestAnimationFrame(frame);
}
function fit() { CORE.fitCanvas(cv, W, H); }
addEventListener('resize', fit); fit();
requestAnimationFrame(frame);

/* ---------- verification hook (read-only; not gameplay) ---------- */
window.__bt = {
  get screen() { return screen; }, get st() { return st; },
  get cash() { return st.cash; }, get rep() { return st.rep; }, get backlash() { return st.backlash; },
  get board() { return st.boardPressure; }, get demand() { return st.demand; },
  get profit() { return st.lastProfit; }, get t() { return st.t; }, get over() { return st.over; },
  get crops() { return st.crops; }, get cattle() { return st.cattle; }, get patties() { return st.patties; },
  get dirty() { return { ...st.dirty }; }, get pane() { return pane; },
  get narrow() { return narrow(); }, get mute() { return save.mute; },
  get log() { return st.log.slice(0, 6).map(l => l.msg); },
  get hitList() { return hits.map(h => ({ x: h.x, y: h.y, w: h.w, h: h.h, label: h.label, pane: h.pane })); },
};
})();
