/* games/impossible/game.js — IMPOSSIBLE RUN browser shell.
 * One-button rhythm autorunner in the spirit of The Impossible Game (2010).
 * Render layer ported from prototypes/impossible-game.html, parameterized by
 * level data; sim lives in engine.js (same file the Node validator runs).
 *
 * Screens: menu (level select + practice + offset + mute) | play | pause | clear.
 * Persistence: maga:impossible:* (unlocked, best deaths per level, medal, mute,
 * input-offset calibration).
 */
(function () {
'use strict';
const E = globalThis.ImpossibleEngine;
const AU = globalThis.MAGA_AUDIO, CORE = globalThis.MAGA;
const W = E.W, H = E.H, CUBE = E.CUBE, GROUND_Y = E.GROUND_Y, DT = 1 / 120;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const LEVELS = globalThis.IMPOSSIBLE_LEVELS;

/* ---------- persistence ---------- */
const SAVE_KEY = 'impossible';
function freshSave() { return { unlocked: 1, best: {}, mute: false, offset: 0 }; }
function sanitize(s) {
  const out = freshSave();
  if (!s || typeof s !== 'object') return out;
  if (Number.isInteger(s.unlocked)) out.unlocked = Math.max(1, Math.min(LEVELS.length, s.unlocked));
  if (s.best && typeof s.best === 'object') for (const k of Object.keys(s.best)) {
    const b = s.best[k];
    if (b && Number.isFinite(b.deaths) && b.deaths >= 0 &&
        ['gold', 'silver', 'bronze'].includes(b.medal)) out.best[k] = { deaths: b.deaths | 0, medal: b.medal };
  }
  out.mute = !!s.mute;
  if (Number.isFinite(s.offset)) out.offset = Math.max(0, Math.min(200, s.offset | 0));
  return out;
}
const save = sanitize(CORE.load(SAVE_KEY, 'save', null));
const persist = () => CORE.save(SAVE_KEY, 'save', save);

/* ---------- audio ---------- */
const bus = new AU.AudioBus();
bus.muted = save.mute;
bus.register([
  { id: 'sfx.jump', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 90, freq: 340, freqEnd: 620, gain: 0.10,
              envelope: { a: 0.002, d: 0.05, s: 0, r: 0.03 } } },
  { id: 'sfx.land', kind: 'sfx', polyphony: 3,
    recipe: { type: 'noise_burst', durationMs: 55, gain: 0.10,
              filter: { type: 'lowpass', freq: 900 }, noise: { amount: 1 },
              envelope: { a: 0.001, d: 0.03, s: 0, r: 0.02 } } },
  { id: 'sfx.die', kind: 'sfx', polyphony: 2,
    recipe: { type: 'saw_thud', durationMs: 240, freq: 220, freqEnd: 55, gain: 0.30,
              filter: { type: 'lowpass', freq: 1400 }, noise: { amount: 0.35 },
              envelope: { a: 0.002, d: 0.18, s: 0, r: 0.06 } } },
  { id: 'sfx.checkpoint', kind: 'sfx', polyphony: 2,
    recipe: { type: 'square_blip', durationMs: 140, freq: 660, freqEnd: 990, gain: 0.12,
              envelope: { a: 0.003, d: 0.08, s: 0, r: 0.05 } } },
  { id: 'sfx.clear', kind: 'sfx', polyphony: 1,
    recipe: { type: 'square_blip', durationMs: 420, freq: 523, freqEnd: 1046, gain: 0.16,
              envelope: { a: 0.004, d: 0.3, s: 0.1, r: 0.12 } } },
  { id: 'sfx.ui', kind: 'ui', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 45, freq: 700, gain: 0.07,
              envelope: { a: 0.001, d: 0.03, s: 0, r: 0.015 } } },
]);

/* Music bed keyed to the level's beat grid: kick-ish bass on beats, off-beat
 * hats, 16th arp. The track IS the timing reference. */
let musicId = null;
function musicFor(L) {
  musicId = 'music.L' + L.id;
  if (bus.recipes.has(musicId)) return musicId;
  const A = [0, 0, 7, 0, 10, 0, 7, 0, 12, 0, 10, 7, 0, 7, 5, 0];  // 16th arp degrees (semitone offsets over A2)
  const bass = [], arp = [], hat = [];
  for (let i = 0; i < 16; i++) {
    bass.push(i % 4 === 0 ? 'A1' : (i % 4 === 2 ? 'E2' : 0));
    arp.push(A[i] === 0 ? (i % 8 === 0 ? 'A3' : 0) : 440 * Math.pow(2, A[i] / 12) * 2);
    hat.push(i % 2 === 1 ? 'C6' : 0);
  }
  bus.register([{ id: musicId, kind: 'music', recipe: { bpm: L.bpm, stepsPerBeat: 4, tracks: [
    { wave: 'triangle', gain: 0.16, pattern: bass, legato: true },
    { wave: 'square', gain: 0.045, pattern: arp },
    { wave: 'square', gain: 0.02, pattern: hat, octaveShift: 1 },
  ] } }]);
  return musicId;
}

/* ---------- state ---------- */
let screen = 'menu';            // 'menu' | 'play' | 'pause' | 'clear'
let levelIdx = 0, L = LEVELS[0];
let st = E.create(L);           // live sim state
let practice = false;
let runDeaths = 0;              // deaths this clear attempt chain (session)
let paused = false;
const keys = CORE.keyboard();
const UI = CORE.hitRects();
let hoverId = null;

function startLevel(i) {
  levelIdx = i; L = LEVELS[i];
  st = E.create(L);
  E.setOffsetMs(st, save.offset);
  runDeaths = 0;
  screen = 'play'; paused = false;
  particles.length = 0; trail.length = 0;
  deathX = -1e9; deathMarkT = 0; flashT = shakeT = squashT = 0;
  bus.music(musicFor(L));
}
function medalFor(d) { return d === 0 ? 'gold' : d <= 5 ? 'silver' : 'bronze'; }
const MEDAL_COL = { gold: '#d9a400', silver: '#9aa4ad', bronze: '#a05f2c' };
function onClear() {
  const id = L.id;
  const prev = save.best[id];
  const medal = medalFor(runDeaths);
  const better = !prev || runDeaths < prev.deaths;
  if (better) save.best[id] = { deaths: runDeaths, medal };
  if (levelIdx + 1 < LEVELS.length) save.unlocked = Math.max(save.unlocked, levelIdx + 2);
  persist();
  screen = 'clear';
  bus.stopMusic();
}
function pressJump() { if (screen === 'play' && !paused && st.state === 'running') E.press(st); }

/* ---------- input ---------- */
addEventListener('keydown', e => {
  if (e.repeat) return;
  bus.unlock();
  const c = e.code;
  if (screen === 'menu') {
    if (c === 'ArrowLeft' || c === 'KeyA') { levelIdx = Math.max(0, levelIdx - 1); bus.play('sfx.ui'); }
    if (c === 'ArrowRight' || c === 'KeyD') { levelIdx = Math.min(save.unlocked - 1, levelIdx + 1); bus.play('sfx.ui'); }
    if (c === 'Enter' || c === 'Space') { bus.play('sfx.ui'); startLevel(levelIdx); }
    if (c === 'KeyP') { practice = !practice; bus.play('sfx.ui'); }
    if (c === 'Minus') setOffset(save.offset - 10);
    if (c === 'Equal') setOffset(save.offset + 10);
    if (c === 'KeyM') toggleMute();
    return;
  }
  if (screen === 'clear') {
    if (c === 'Enter' || c === 'Space') { bus.play('sfx.ui'); startLevel(levelIdx); }
    if (c === 'KeyN' && levelIdx + 1 < LEVELS.length) { bus.play('sfx.ui'); startLevel(levelIdx + 1); }
    if (c === 'Escape' || c === 'KeyQ') { screen = 'menu'; bus.stopMusic(); }
    return;
  }
  if (['Space', 'ArrowUp', 'KeyZ', 'KeyW'].includes(c)) { pressJump(); e.preventDefault(); }
  if (c === 'KeyR') startLevel(levelIdx);
  if (c === 'KeyM') toggleMute();
  if (c === 'KeyQ') { screen = 'menu'; bus.stopMusic(); }
  if (c === 'Escape' || c === 'KeyP') paused = !paused;
});
function setOffset(ms) { save.offset = Math.max(0, Math.min(200, ms)); E.setOffsetMs(st, save.offset); persist(); }
function toggleMute() { save.mute = !save.mute; bus.setMuted(save.mute); persist(); }
addEventListener('blur', () => { keys.down.clear(); if (screen === 'play') paused = true; });
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); bus.unlock();
  const p = CORE.toStage(cv, W, H, e);
  if (screen === 'menu' || screen === 'clear' || paused) { UI.tap(p); return; }
  pressJump();
});
cv.addEventListener('pointermove', e => {
  const p = CORE.toStage(cv, W, H, e);
  hoverId = null;
  for (const r of UI.all()) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) hoverId = r.id;
});
CORE.fitCanvas(cv, W, H);
addEventListener('resize', () => CORE.fitCanvas(cv, W, H));

/* ---------- sim step ---------- */
function stepSim() {
  if (screen !== 'play' || paused) { st.events.length = 0; return; }
  E.step(st, DT);
  for (const ev of st.events) {
    if (ev === 'jump') bus.play('sfx.jump');
    else if (ev === 'land') bus.play('sfx.land');
    else if (ev === 'die') {
      bus.play('sfx.die'); bus.duck(0.7, 400);
      runDeaths++;
      if (!practice) st.lastCp = 0;
    } else if (ev === 'clear') { bus.play('sfx.clear'); onClear(); }
  }
  st.events.length = 0;
}
CORE.fixedLoop(120, stepSim, render);

/* ================= render layer =================
 * Ported from prototypes/impossible-game.html; parameterized by current level
 * (rows/end/checkpoints/accent). Draw-only juice never feeds the sim. */
const INK = '#28241e', PAPER = '#f2efe9', BLOCK_INK = '#363026';
let particles = [], trail = [];
let drawT = 0, drawLast = performance.now();
let squashT = 0, shakeT = 0, flashT = 0, deathX = -1e9, deathY = 0, deathMarkT = 0;
let prevGrounded = true, prevState = 'running';
let camX = -220;

function mkCv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const bgCv = (() => {
  const c = mkCv(W, H), g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, '#f7f4ed'); lg.addColorStop(.6, '#f2efe9'); lg.addColorStop(1, '#e9e3d6');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(40,36,30,${(Math.random() * .05).toFixed(3)})`; g.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  for (let y = 0; y < H; y += 3) { g.fillStyle = 'rgba(40,36,30,.016)'; g.fillRect(0, y, W, 1); }
  const rg = g.createRadialGradient(W / 2, H * .42, H * .42, W / 2, H * .55, H * .95);
  rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(40,32,20,.20)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return c;
})();
function bandTile(seed, yBase, amp, n, tone) {
  const c = mkCv(1600, H), g = c.getContext('2d');
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = tone;
  for (let i = 0; i < n; i++) {
    const w = 140 + rnd() * 320, x = rnd() * 1600, y = yBase + (rnd() - .5) * amp, h = 6 + rnd() * 14;
    g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
    if (x + w > 1600) { g.beginPath(); g.roundRect(x - 1600, y, w, h, h / 2); g.fill(); }
  }
  return c;
}
const bandFarCv = bandTile(11, 130, 60, 9, 'rgba(60,52,40,.05)');
const bandNearCv = bandTile(29, 240, 80, 7, 'rgba(60,52,40,.075)');
const skylineCv = (() => {
  const c = mkCv(2400, H), g = c.getContext('2d');
  g.fillStyle = 'rgba(70,60,45,.10)';
  let x = 60;
  while (x < 2360) {
    const kind = (x * 7919) % 3;
    if (kind === 0) {
      for (let k = 0; k < 2 + (x % 2); k++) {
        const sx = x + k * 46;
        g.beginPath(); g.moveTo(sx, GROUND_Y); g.lineTo(sx + 20, GROUND_Y - 52); g.lineTo(sx + 40, GROUND_Y); g.fill();
      }
      x += 150;
    } else {
      const bw = 60 + (x % 90), bh = 40 + (x % 70);
      g.fillRect(x, GROUND_Y - bh, bw, bh); x += bw + 60;
    }
  }
  const hz = g.createLinearGradient(0, GROUND_Y - 120, 0, GROUND_Y);
  hz.addColorStop(0, 'rgba(242,239,233,0)'); hz.addColorStop(1, 'rgba(242,239,233,.55)');
  g.fillStyle = hz; g.fillRect(0, GROUND_Y - 120, 2400, 120);
  return c;
})();
const groundPatCv = (() => {
  const c = mkCv(12, 12), g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-2, 14); g.lineTo(14, -2); g.moveTo(-2, -2); g.lineTo(14, 14); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.07)';
  g.fillRect(3, 4, 1, 1); g.fillRect(8, 9, 1, 1); g.fillRect(10, 2, 1, 1);
  return c;
})();
const hatchPatCv = (() => {
  const c = mkCv(7, 7), g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-1, 8); g.lineTo(8, -1); g.stroke();
  return c;
})();
const abyssCv = (() => {
  const c = mkCv(4, H - GROUND_Y), g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 0, c.height);
  lg.addColorStop(0, '#060504'); lg.addColorStop(.55, '#0b0806'); lg.addColorStop(1, '#2a1608');
  g.fillStyle = lg; g.fillRect(0, 0, 4, c.height);
  return c;
})();
const hazardCv = (() => {
  const c = mkCv(16, 16), g = c.getContext('2d');
  g.fillStyle = '#151009'; g.fillRect(0, 0, 16, 16);
  g.strokeStyle = 'rgba(240,140,0,.5)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(-4, 12); g.lineTo(12, -4); g.moveTo(-4, 28); g.lineTo(28, -4); g.stroke();
  return c;
})();
const redVinCv = (() => {
  const c = mkCv(W, H), g = c.getContext('2d');
  const rg = g.createRadialGradient(W / 2, H / 2, H * .32, W / 2, H / 2, H * .78);
  rg.addColorStop(0, 'rgba(200,30,20,0)'); rg.addColorStop(1, 'rgba(200,30,20,.55)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return c;
})();
const bannerBandCv = (() => {
  const c = mkCv(W, 96), g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(20,17,12,0)'); lg.addColorStop(.12, 'rgba(20,17,12,.85)');
  lg.addColorStop(.88, 'rgba(20,17,12,.85)'); lg.addColorStop(1, 'rgba(20,17,12,0)');
  g.fillStyle = lg; g.fillRect(0, 0, W, 96);
  const vg = g.createLinearGradient(0, 0, 0, 96);
  vg.addColorStop(0, 'rgba(20,17,12,0)'); vg.addColorStop(.5, 'rgba(20,17,12,.35)'); vg.addColorStop(1, 'rgba(20,17,12,0)');
  g.fillStyle = vg; g.fillRect(0, 0, W, 96);
  return c;
})();
const bannerRuleCv = (() => {
  const c = mkCv(W, 2), g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(240,140,0,0)'); lg.addColorStop(.5, 'rgba(240,140,0,.8)'); lg.addColorStop(1, 'rgba(240,140,0,0)');
  g.fillStyle = lg; g.fillRect(0, 0, W, 2);
  return c;
})();
const progFillCv = (() => {
  const c = mkCv(300, 8), g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 300, 0);
  lg.addColorStop(0, '#c96a00'); lg.addColorStop(1, '#ffb03a');
  g.fillStyle = lg; g.fillRect(0, 0, 300, 8);
  return c;
})();
let groundPat, hatchPat, hazardPat;
function accent() { return L.accent || '#f08c00'; }

function drawParallax(px) {
  const tile = (cv2, f) => {
    const off = -(((px * f) % cv2.width) + cv2.width) % cv2.width;
    ctx.drawImage(cv2, off, 0); ctx.drawImage(cv2, off + cv2.width, 0);
  };
  tile(bandFarCv, .22); tile(skylineCv, .32); tile(bandNearCv, .42);
}
function gaps() { return L.rows.filter(r => r[0] === 'gap'); }
function drawGround() {
  ctx.fillStyle = INK;
  ctx.fillRect(camX - 60, GROUND_Y, W + 120, H - GROUND_Y);
  ctx.fillStyle = groundPat;
  ctx.fillRect(camX - 60, GROUND_Y, W + 120, H - GROUND_Y);
  const GAPS = gaps();
  for (const [, gx, gw] of GAPS) {
    ctx.drawImage(abyssCv, 0, 0, 4, H - GROUND_Y, gx, GROUND_Y, gw, H - GROUND_Y);
    ctx.save(); ctx.translate(gx, GROUND_Y);
    ctx.fillStyle = hazardPat;
    ctx.fillRect(0, 0, 7, H - GROUND_Y); ctx.fillRect(gw - 7, 0, 7, H - GROUND_Y);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(7, 0, 2, H - GROUND_Y); ctx.fillRect(gw - 9, 0, 2, H - GROUND_Y);
    ctx.restore();
  }
  ctx.fillStyle = '#f8f4ea';
  let hx = camX - 60;
  for (const [, gx, gw] of GAPS) { if (gx > hx) ctx.fillRect(hx, GROUND_Y, gx - hx, 2); hx = gx + gw; }
  ctx.fillRect(hx, GROUND_Y, camX + W + 60 - hx, 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (const [, gx, gw] of GAPS) { ctx.fillRect(gx - 2, GROUND_Y, 2, 5); ctx.fillRect(gx + gw, GROUND_Y, 2, 5); }
}
function drawSpike(ox, ow) {
  const mid = ox + ow / 2, top = GROUND_Y - 34;
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.moveTo(ox, GROUND_Y); ctx.lineTo(mid, top); ctx.lineTo(ox + ow, GROUND_Y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.30)';
  ctx.beginPath(); ctx.moveTo(mid, top); ctx.lineTo(ox + ow, GROUND_Y); ctx.lineTo(mid, GROUND_Y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(248,244,234,.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ox + 1, GROUND_Y - 1); ctx.lineTo(mid, top); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(ox - 2, GROUND_Y - 2, ow + 4, 2);
}
function drawBlock(ox, ow, oh) {
  const top = GROUND_Y - oh;
  ctx.fillStyle = BLOCK_INK; ctx.fillRect(ox, top, ow, oh);
  ctx.save(); ctx.beginPath(); ctx.rect(ox, top, ow, oh); ctx.clip();
  ctx.fillStyle = hatchPat; ctx.fillRect(ox, top, ow, oh);
  ctx.restore();
  ctx.fillStyle = 'rgba(248,244,234,.5)'; ctx.fillRect(ox, top, ow, 3);
  ctx.fillStyle = 'rgba(248,244,234,.18)'; ctx.fillRect(ox, top, 3, oh);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(ox, GROUND_Y - 4, ow, 4);
  ctx.strokeStyle = '#1a1712'; ctx.lineWidth = 2; ctx.strokeRect(ox + 1, top + 1, ow - 2, oh - 2);
}
function drawFinish() {
  const X = L.end;
  ctx.globalAlpha = .8 + Math.sin(drawT * 2.4) * .2;
  const c = finishGlowCv();
  ctx.drawImage(c, X - 66, GROUND_Y - 300);
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK; ctx.fillRect(X - 2, GROUND_Y - 170, 5, 170);
  ctx.fillStyle = accent(); ctx.beginPath(); ctx.arc(X + .5, GROUND_Y - 174, 5, 0, 7); ctx.fill();
  const fw = 72, fh = 40, cs = 8;
  for (let r = 0; r < fh / cs; r++) for (let c2 = 0; c2 < fw / cs; c2++) {
    const wy = Math.sin(drawT * 6 + c2 * .8) * (c2 / (fw / cs)) * 5;
    ctx.fillStyle = (r + c2) % 2 ? INK : PAPER;
    ctx.fillRect(X + 3 + c2 * cs, GROUND_Y - 170 + r * cs + wy, cs, cs);
  }
  ctx.strokeStyle = '#1a1712'; ctx.lineWidth = 1.5;
  ctx.strokeRect(X + 3, GROUND_Y - 170, fw, fh);
}
let _finishGlow = null;
function finishGlowCv() {
  if (_finishGlow) return _finishGlow;
  const c = mkCv(140, 300), g = c.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 140, 0);
  lg.addColorStop(0, 'rgba(43,138,62,0)'); lg.addColorStop(.5, 'rgba(43,138,62,.30)'); lg.addColorStop(1, 'rgba(43,138,62,0)');
  g.fillStyle = lg; g.fillRect(0, 0, 140, 300);
  const vg = g.createLinearGradient(0, 0, 0, 300);
  vg.addColorStop(0, 'rgba(43,138,62,0)'); vg.addColorStop(1, 'rgba(43,138,62,.25)');
  g.fillStyle = vg; g.fillRect(0, 0, 140, 300);
  return _finishGlow = c;
}
function drawFlags() {
  for (const cx of L.checkpoints || []) {
    const on = st.lastCp >= cx;
    if (on) {
      const rg = ctx.createRadialGradient(cx + 2, GROUND_Y - 44, 4, cx + 2, GROUND_Y - 44, 46);
      rg.addColorStop(0, 'rgba(43,138,62,.4)'); rg.addColorStop(1, 'rgba(43,138,62,0)');
      ctx.fillStyle = rg; ctx.fillRect(cx - 44, GROUND_Y - 90, 92, 92);
    }
    ctx.fillStyle = on ? '#2b8a3e' : '#868e96';
    ctx.fillRect(cx, GROUND_Y - 56, 4, 56);
    const wob = Math.sin(drawT * 5 + cx) * 2;
    ctx.beginPath();
    ctx.moveTo(cx + 4, GROUND_Y - 56); ctx.lineTo(cx + 26, GROUND_Y - 49 + wob); ctx.lineTo(cx + 4, GROUND_Y - 41);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = on ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.2)';
    ctx.fillRect(cx + 4, GROUND_Y - 54, 3, 12);
  }
}
function drawParticles() {
  for (const p of particles) {
    if (p.kind === 'dust') {
      ctx.globalAlpha = Math.max(0, p.life * 2.2);
      ctx.fillStyle = '#b9b0a0';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * .8, 0, 7); ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = (p.s % 2 < 1) ? accent() : INK;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.x * .1 + p.life * 6);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
function burst() {
  for (let i = 0; i < 26; i++) particles.push({
    x: st.cube.x + CUBE / 2, y: st.cube.y + CUBE / 2,
    vx: (Math.random() - .5) * 700, vy: -Math.random() * 600 - 100,
    s: 4 + Math.random() * 8, life: .5 + Math.random() * .4
  });
}
function drawDeathMarks() {
  if (drawT < deathMarkT) {
    const a = Math.max(0, (deathMarkT - drawT) / 1.6);
    ctx.save(); ctx.globalAlpha = a * .8; ctx.translate(deathX, deathY);
    ctx.strokeStyle = '#c0341d'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const r = 14 + (1 - a) * 10;
    ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(r, -r); ctx.lineTo(-r, r);
    ctx.stroke(); ctx.restore();
  }
}
function drawCube() {
  const c = st.cube;
  for (const t of trail) {
    ctx.save(); ctx.globalAlpha = t.a * .22;
    ctx.translate(t.x + CUBE / 2, t.y + CUBE / 2); ctx.rotate(t.rot);
    ctx.fillStyle = accent(); ctx.fillRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE);
    ctx.restore();
  }
  const sq = squashT > 0 ? Math.sin(Math.min(1, squashT / .12) * Math.PI) * .18 : 0;
  const stretch = c.grounded ? 0 : Math.max(0, 1 - Math.abs(c.vy) / 700) * .12;
  const sx = 1 + sq - stretch * .5, sy = 1 - sq + stretch;
  ctx.save();
  ctx.translate(c.x + CUBE / 2, c.y + CUBE / 2);
  ctx.rotate(c.rot); ctx.scale(sx, sy);
  const rg = ctx.createRadialGradient(-6, -8, 2, 0, 0, CUBE * .75);
  rg.addColorStop(0, '#ffc25e'); rg.addColorStop(.55, accent()); rg.addColorStop(1, '#c96a00');
  ctx.fillStyle = rg; ctx.fillRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE);
  ctx.strokeStyle = '#7a4500'; ctx.lineWidth = 3; ctx.strokeRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-CUBE / 2 + 4, -CUBE / 2 + 4, 7, 7);
  ctx.restore();
}
function drawHUD() {
  ctx.fillStyle = INK; ctx.font = '16px monospace'; ctx.textAlign = 'left';
  const prog = Math.min(100, Math.max(0, st.cube.x / L.end * 100));
  ctx.fillText(`${L.name}   ATTEMPT ${st.attempt}   DEATHS ${runDeaths}   ${prog.toFixed(0)}%`, 16, 26);
  ctx.fillStyle = 'rgba(40,36,30,.28)';
  ctx.fillRect(16, 36, 300, 8);
  ctx.strokeStyle = 'rgba(40,36,30,.5)'; ctx.lineWidth = 1; ctx.strokeRect(15.5, 35.5, 301, 9);
  ctx.fillStyle = 'rgba(40,36,30,.55)';
  for (const cx of L.checkpoints || []) ctx.fillRect(16 + 300 * cx / L.end - .5, 34, 1, 12);
  const pw = 300 * prog / 100;
  if (pw > 0) {
    ctx.save(); ctx.shadowColor = accent() + 'cc'; ctx.shadowBlur = 7;
    ctx.drawImage(progFillCv, 0, 0, Math.min(300, pw), 8, 16, 36, Math.min(300, pw), 8);
    ctx.restore();
    ctx.fillStyle = '#ffd9a0'; ctx.fillRect(16 + pw - 2, 36, 2, 8);
  }
  ctx.fillStyle = '#6f675a'; ctx.font = '13px monospace';
  ctx.fillText(`SPACE/CLICK jump · R restart · ESC pause · Q quit${practice ? ' · PRACTICE' : ''}${save.mute ? ' · MUTED' : ''}`, 16, H - 14);
}
function banner(t) {
  ctx.drawImage(bannerBandCv, 0, H / 2 - 48);
  ctx.drawImage(bannerRuleCv, 0, H / 2 - 46);
  ctx.drawImage(bannerRuleCv, 0, H / 2 + 44);
  ctx.save();
  ctx.shadowColor = accent() + 'a6'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
  ctx.fillText(t, W / 2, H / 2 + 10);
  ctx.restore(); ctx.textAlign = 'left';
}
function chip(r, t, on, id, fn) {
  if (id) UI.add(id, r.x, r.y, r.w, r.h, fn);
  const hov = id && hoverId === id;
  ctx.fillStyle = 'rgba(40,36,30,.35)'; ctx.fillRect(r.x + 3, r.y + 4, r.w, r.h);
  ctx.fillStyle = on ? accent() : INK; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = on ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.14)';
  ctx.fillRect(r.x, r.y, r.w, 3); ctx.fillRect(r.x, r.y, 3, r.h);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(r.x, r.y + r.h - 3, r.w, 3); ctx.fillRect(r.x + r.w - 3, r.y, 3, r.h);
  ctx.strokeStyle = hov ? accent() : '#1a1712'; ctx.lineWidth = hov ? 3 : 2;
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.fillStyle = on ? '#241a08' : '#f2efe9'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  ctx.fillText(t, r.x + r.w / 2, r.y + r.h / 2 + 6);
  ctx.textAlign = 'left';
}
function attractStrip() {
  const y0 = 300, S = 150, x0 = 90, span = 780;
  ctx.fillStyle = INK; ctx.fillRect(x0 - 30, y0, span + 60, 5);
  ctx.fillStyle = '#f8f4ea'; ctx.fillRect(x0 - 30, y0, span + 60, 2);
  for (let k = 0; k < 5; k++) {
    const sx = x0 + k * S;
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.moveTo(sx - 16, y0); ctx.lineTo(sx, y0 - 26); ctx.lineTo(sx + 16, y0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.moveTo(sx, y0 - 26); ctx.lineTo(sx + 16, y0); ctx.lineTo(sx, y0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(248,244,234,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - 15, y0 - 1); ctx.lineTo(sx, y0 - 26); ctx.stroke();
  }
  const d = (drawT * 150) % (S * 5);
  const ph = ((d + S / 2) % S) / S;
  const h = Math.sin(ph * Math.PI) * 58;
  const bx = x0 + d - 13, by = y0 - 26 - h;
  for (let i = 1; i <= 3; i++) {
    const dd = d - i * 16; if (dd < 0) continue;
    const php = ((dd + S / 2) % S) / S;
    ctx.globalAlpha = .1; ctx.fillStyle = accent();
    ctx.fillRect(x0 + dd - 13, y0 - 26 - Math.sin(php * Math.PI) * 58, 26, 26);
  }
  ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(bx + 13, by + 13);
  ctx.rotate(h > 1 ? ph * Math.PI / 2 : 0);
  const rg = ctx.createRadialGradient(-4, -5, 2, 0, 0, 20);
  rg.addColorStop(0, '#ffc25e'); rg.addColorStop(1, '#d97a00');
  ctx.fillStyle = rg; ctx.fillRect(-13, -13, 26, 26);
  ctx.strokeStyle = '#7a4500'; ctx.lineWidth = 2.5; ctx.strokeRect(-13, -13, 26, 26);
  ctx.restore();
}

function drawMenu() {
  ctx.drawImage(bgCv, 0, 0);
  drawParallax(drawT * 40);
  attractStrip();
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px monospace';
  ctx.fillStyle = 'rgba(240,140,0,.9)'; ctx.fillText('IMPOSSIBLE RUN', W / 2 + 3, 128 + 3);
  ctx.fillStyle = 'rgba(40,36,30,.35)'; ctx.fillText('IMPOSSIBLE RUN', W / 2 + 1.5, 128 + 1.5);
  ctx.fillStyle = INK; ctx.fillText('IMPOSSIBLE RUN', W / 2, 128);
  ctx.fillStyle = accent(); ctx.fillRect(W / 2 - 250, 142, 500, 3);
  ctx.fillStyle = INK; ctx.fillRect(W / 2 - 250, 145, 500, 1);

  // level select row
  const bw = 150, gap = 14, totW = LEVELS.length * bw + (LEVELS.length - 1) * gap;
  let x = W / 2 - totW / 2;
  for (let i = 0; i < LEVELS.length; i++) {
    const lv = LEVELS[i], locked = i >= save.unlocked;
    const r = { x, y: 356, w: bw, h: 74 };
    const sel = i === levelIdx;
    chip(r, locked ? 'LOCKED' : lv.name, sel && !locked, 'lv' + i, () => { if (!locked) { levelIdx = i; startLevel(i); } });
    const b = save.best[lv.id];
    ctx.font = '12px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = locked ? '#9a917e' : '#6f675a';
    ctx.fillText(locked ? '—' : (b ? `best ${b.deaths}` : `${lv.bpm} bpm`), x + bw / 2, 446);
    if (b) { ctx.fillStyle = MEDAL_COL[b.medal]; ctx.beginPath(); ctx.arc(x + bw / 2, r.y - 10, 6, 0, 7); ctx.fill(); }
    x += bw + gap;
  }
  chip({ x: W / 2 - 160, y: 462, w: 320, h: 30 }, 'PRACTICE CHECKPOINTS: ' + (practice ? 'ON' : 'OFF'), practice, 'practice', () => { practice = !practice; });
  chip({ x: W / 2 - 170, y: 500, w: 60, h: 28 }, '−', false, 'ominus', () => setOffset(save.offset - 10));
  chip({ x: W / 2 + 110, y: 500, w: 60, h: 28 }, '+', false, 'oplus', () => setOffset(save.offset + 10));
  chip({ x: W / 2 + 190, y: 500, w: 110, h: 28 }, save.mute ? 'UNMUTE' : 'MUTE', false, 'mute', toggleMute);
  ctx.font = '13px monospace'; ctx.fillStyle = INK; ctx.textAlign = 'center';
  ctx.fillText(`INPUT OFFSET ${save.offset}ms`, W / 2, 520);
  ctx.font = '12px monospace'; ctx.fillStyle = '#8a8172';
  ctx.fillText('◀ ▶ select · ENTER run · P practice · −/+ offset · M mute · touch: tap', W / 2, 340);
  ctx.fillText('one button. one beat grid. five trials.', W / 2, 168);
  ctx.textAlign = 'left';
}
function drawClear() {
  ctx.drawImage(bgCv, 0, 0);
  drawParallax(camX);
  ctx.save(); ctx.translate(-camX, 0);
  drawGround();
  for (const r of L.rows) {
    if (r[0] === 'spike' && r[1] > camX - 60 && r[1] < camX + W + 60) drawSpike(r[1], r[2]);
    else if (r[0] === 'block' && r[1] + r[2] > camX - 60 && r[1] < camX + W + 60) drawBlock(r[1], r[2], r[3]);
  }
  drawFinish();
  ctx.restore();
  banner(`${L.name} — CLEAR`);
  const medal = medalFor(runDeaths);
  ctx.textAlign = 'center';
  ctx.fillStyle = MEDAL_COL[medal]; ctx.font = 'bold 22px monospace';
  ctx.fillText(`${medal.toUpperCase()} — ${runDeaths} death${runDeaths === 1 ? '' : 's'}`, W / 2, H / 2 + 56);
  ctx.fillStyle = INK; ctx.font = '14px monospace';
  ctx.fillText('ENTER retry · N next level · Q menu', W / 2, H / 2 + 82);
  ctx.textAlign = 'left';
  chip({ x: W / 2 - 240, y: H / 2 + 100, w: 140, h: 40 }, 'RETRY', false, 'retry', () => startLevel(levelIdx));
  if (levelIdx + 1 < LEVELS.length)
    chip({ x: W / 2 - 70, y: H / 2 + 100, w: 140, h: 40 }, 'NEXT ▶', true, 'next', () => startLevel(levelIdx + 1));
  chip({ x: W / 2 + (levelIdx + 1 < LEVELS.length ? 100 : -70), y: H / 2 + 100, w: 140, h: 40 }, 'MENU', false, 'tomenu', () => { screen = 'menu'; });
}

function render() {
  const now = performance.now();
  const fdt = Math.min(.05, (now - drawLast) / 1000); drawLast = now; drawT += fdt;
  if (!groundPat) {
    groundPat = ctx.createPattern(groundPatCv, 'repeat');
    hatchPat = ctx.createPattern(hatchPatCv, 'repeat');
    hazardPat = ctx.createPattern(hazardCv, 'repeat');
  }
  UI.clear();
  if (screen === 'menu') return drawMenu();
  if (screen === 'clear') return drawClear();

  // draw-only transition detection
  const c = st.cube;
  if (st.state === 'dead' && prevState !== 'dead') {
    shakeT = .3; flashT = .3; deathX = c.x + CUBE / 2; deathY = Math.min(c.y + CUBE / 2, GROUND_Y - 10);
    deathMarkT = drawT + 1.6; trail.length = 0; burst();
  }
  if (st.state === 'running' && prevState === 'dead') trail.length = 0;
  if (st.state === 'running' && !paused) {
    if (!prevGrounded && c.grounded) {
      squashT = .12;
      for (let i = 0; i < 6; i++) particles.push({
        kind: 'dust', x: c.x + CUBE / 2 + (Math.random() - .5) * CUBE, y: c.y + CUBE - 2,
        vx: (Math.random() - .5) * 130, vy: -Math.random() * 70 - 15, s: 2 + Math.random() * 3, life: .3 + Math.random() * .15
      });
    }
    trail.unshift({ x: c.x, y: c.y, rot: c.rot, a: 1 });
    if (trail.length > 6) trail.pop();
  }
  for (const t of trail) t.a -= fdt * 6;
  while (trail.length && trail[trail.length - 1].a <= 0) trail.pop();
  for (const p of particles) { p.x += p.vx * fdt; p.y += p.vy * fdt; p.vy += E.GRAV * fdt * .6; p.life -= fdt; }
  particles = particles.filter(p => p.life > 0);
  prevGrounded = c.grounded; prevState = st.state;
  squashT = Math.max(0, squashT - fdt); shakeT = Math.max(0, shakeT - fdt); flashT = Math.max(0, flashT - fdt);

  camX = c.x - 220;
  const shx = shakeT > 0 ? (Math.random() - .5) * 7 * (shakeT / .3) : 0;
  const shy = shakeT > 0 ? (Math.random() - .5) * 5 * (shakeT / .3) : 0;

  ctx.drawImage(bgCv, 0, 0);
  drawParallax(camX);
  ctx.save(); ctx.translate(-camX + shx, shy);
  drawGround();
  for (const r of L.rows) {
    if (r[1] + (r[2] || 0) < camX - 60 || r[1] > camX + W + 60) continue;
    if (r[0] === 'spike') drawSpike(r[1], r[2]);
    else if (r[0] === 'block') drawBlock(r[1], r[2], r[3]);
  }
  drawFinish();
  if (practice) drawFlags();
  drawParticles();
  drawDeathMarks();
  if (st.state !== 'dead') drawCube();
  ctx.restore();
  drawHUD();
  if (flashT > 0) { ctx.globalAlpha = flashT / .3; ctx.drawImage(redVinCv, 0, 0); ctx.globalAlpha = 1; }
  if (paused) banner('PAUSED — ESC resume · Q menu');
  else if (st.state === 'dead') banner('DEAD — respawning…');
}

/* ---------- verification hook (read-only) ---------- */
window.__imp = {
  get screen() { return screen; }, get level() { return levelIdx; },
  get state() { return st.state; }, get x() { return st.cube ? st.cube.x : null; },
  get y() { return st.cube ? st.cube.y : null; },
  get attempt() { return st.attempt; }, get deaths() { return runDeaths; },
  get grounded() { return st.cube ? st.cube.grounded : null; },
  get progress() { return st.cube ? st.cube.x / L.end : 0; },
  get practice() { return practice; }, get paused() { return paused; },
  get offset() { return save.offset; }, get muted() { return save.mute; },
  get unlocked() { return save.unlocked; }, get best() { return save.best; },
  get levels() { return LEVELS.map(l => ({ id: l.id, name: l.name, bpm: l.bpm, end: l.end })); },
};
})();
