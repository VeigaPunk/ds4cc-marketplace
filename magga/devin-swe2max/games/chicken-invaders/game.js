/* games/chicken-invaders/game.js — browser shell for the shared shmup engine.
 * FOWL ASSAULT (CI2-era formula replica) + CLUCK HORIZON (original IP) run on
 * the same FowlEngine — packs.js swaps content, never mechanics.
 * Render layer ported from prototypes/chicken-invaders.html, parameterized by
 * pack palette; sim lives in engine.js (same file the Node validator runs).
 *
 * Screens: title (pack / chapter / touch-layout select) | play | pause |
 * chapter clear | game over | win.
 * Persistence: maga:fowl:* — per-pack chapter unlock, touch layout, mute.
 */
(function () {
'use strict';
const E = globalThis.FowlEngine, PACKS = globalThis.FOWL_PACKS;
const CORE = globalThis.MAGA, AU = globalThis.MAGA_AUDIO;
const W = E.STAGE_W, H = E.STAGE_H, DT = E.DT, SHIP_MAXV = E.SHIP_MAXV;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');

/* ---------- persistence ---------- */
const SAVE_KEY = 'fowl';
const save = CORE.load(SAVE_KEY, 'save', null) || {};
function persist() { CORE.save(SAVE_KEY, 'save', save); }
save.unlocked = save.unlocked || {};            // per-pack chapter unlock
save.layout = save.layout || 'A';               // touch layout A twin-thumb / B one-thumb
save.mute = !!save.mute;

/* ---------- audio ---------- */
const bus = new AU.AudioBus();
bus.register([
  { id: 'sfx.shoot', kind: 'sfx', polyphony: 4,
    recipe: { type: 'square_blip', durationMs: 60, freq: 880, freqEnd: 620, gain: 0.055,
      envelope: { a: 0.002, d: 0.04, s: 0, r: 0.02 } } },
  { id: 'sfx.hit', kind: 'sfx', polyphony: 5,
    recipe: { type: 'noise_burst', durationMs: 70, gain: 0.09,
      noise: { amount: 0.8, freq: 2400 }, envelope: { a: 0.001, d: 0.05, s: 0, r: 0.02 } } },
  { id: 'sfx.squawk', kind: 'sfx', polyphony: 4,
    recipe: { type: 'square_blip', durationMs: 110, freq: 320, freqEnd: 190, gain: 0.10,
      envelope: { a: 0.002, d: 0.08, s: 0, r: 0.03 } } },
  { id: 'sfx.missile', kind: 'sfx', polyphony: 2,
    recipe: { type: 'noise_burst', durationMs: 320, gain: 0.14,
      noise: { amount: 0.85, freq: 900 }, envelope: { a: 0.01, d: 0.22, s: 0, r: 0.09 } } },
  { id: 'sfx.death', kind: 'sfx', polyphony: 2,
    recipe: { type: 'saw_thud', durationMs: 380, freq: 260, freqEnd: 50, gain: 0.30,
      envelope: { a: 0.003, d: 0.30, s: 0, r: 0.08 } } },
  { id: 'sfx.pickup', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 140, freq: 660, freqEnd: 1180, gain: 0.12,
      envelope: { a: 0.002, d: 0.10, s: 0, r: 0.03 } } },
  { id: 'sfx.boss', kind: 'sfx', polyphony: 1,
    recipe: { type: 'saw_thud', durationMs: 600, freq: 140, freqEnd: 90, gain: 0.24,
      envelope: { a: 0.01, d: 0.5, s: 0, r: 0.1 } } },
  { id: 'sfx.bossdown', kind: 'sfx', polyphony: 1,
    recipe: { type: 'saw_thud', durationMs: 700, freq: 320, freqEnd: 40, gain: 0.32,
      noise: { amount: 0.4, freq: 1200 }, envelope: { a: 0.004, d: 0.55, s: 0, r: 0.15 } } },
  { id: 'sfx.clear', kind: 'sfx', polyphony: 1,
    recipe: { type: 'square_blip', durationMs: 420, freq: 523, freqEnd: 1046, gain: 0.16,
      envelope: { a: 0.003, d: 0.30, s: 0, r: 0.12 } } },
  { id: 'sfx.ui', kind: 'ui', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 45, freq: 700, gain: 0.07,
      envelope: { a: 0.001, d: 0.03, s: 0, r: 0.01 } } },
]);
bus.register([{ id: 'music.bed', kind: 'music', recipe: { bpm: 132, stepsPerBeat: 4, tracks: [
  // driving bass eighths — shmup pulse
  { wave: 'triangle', gain: 0.15, legato: true, pattern: [
    'A2', 0, 'A2', 0, 'C3', 0, 'A2', 0, 'G2', 0, 'G2', 0, 'A2', 0, 'E2', 0] },
  // sparse arp sparkle
  { wave: 'square', gain: 0.035, pattern: [
    'E5', 0, 0, 'A5', 0, 0, 'C6', 0, 0, 'D6', 0, 'A5', 0, 0, 'E5', 0] },
  // hat tick
  { wave: 'square', gain: 0.018, octaveShift: 2, pattern: [
    'C6', 0, 'C6', 0, 'C6', 0, 'C6', 0, 'C6', 0, 'C6', 0, 'C6', 0, 'C6', 'C6'] },
] } }]);
bus.setMuted(save.mute);

/* ---------- engine state ---------- */
let packId = 'fowl';
let pack = PACKS[packId];
let st = E.create(pack, (Math.random() * 2 ** 31) | 0);
function unlocked() { return Math.max(1, Math.min(pack.chapters.length, save.unlocked[pack.id] || 1)); }

function setPack(id) {
  packId = id; pack = PACKS[id];
  st = E.create(pack, (Math.random() * 2 ** 31) | 0);
  SPR.packId = null;                            // force sprite rebuild
  if (ui.titleSel > unlocked()) ui.titleSel = 1;
}
function startChapter(ch) {
  st = E.create(pack, (Math.random() * 2 ** 31) | 0);
  E.startGame(st, ch);
  bus.music('music.bed');
}

/* ---------- input ---------- */
const kb = CORE.keyboard();
let drag = null;                                // layout B / mouse: {id,ox,oy,sx,sy}
let stick = null;                               // layout A: {id,ox,oy,x,y}
const firePtrs = new Set();                     // layout A: right-half hold-fire
let touchMode = false;
const ui = { titleSel: 1 };

const MISSILE_BTN_B = { x: W - 92, y: H - 92, w: 64, h: 64 };
const MISSILE_BTN_A = { x: W - 92, y: H - 172, w: 64, h: 64 };
const FIRE_BTN_A = { x: W - 92, y: H - 92, w: 64, h: 64 };
const missileBtn = () => save.layout === 'A' ? MISSILE_BTN_A : MISSILE_BTN_B;

const BTN = {
  start: { x: W / 2 - 110, y: 330, w: 220, h: 44 },
  pack: { x: W / 2 - 160, y: 392, w: 320, h: 34 },
  ch1: { x: W / 2 - 120, y: 284, w: 110, h: 32 },
  ch2: { x: W / 2 + 10, y: 284, w: 110, h: 32 },
  layout: { x: W / 2 - 160, y: 434, w: 320, h: 30 },
};
const inR = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;

function titleClick(x, y) {
  const p = { x, y };
  if (inR(p, BTN.pack)) { setPack(packId === 'fowl' ? 'cluck' : 'fowl'); return bus.play('sfx.ui'); }
  if (inR(p, BTN.layout)) { setLayout(save.layout === 'A' ? 'B' : 'A'); return bus.play('sfx.ui'); }
  if (inR(p, BTN.ch1)) { ui.titleSel = 1; return bus.play('sfx.ui'); }
  if (inR(p, BTN.ch2) && unlocked() >= 2) { ui.titleSel = 2; return bus.play('sfx.ui'); }
  if (inR(p, BTN.start)) { startChapter(ui.titleSel); return bus.play('sfx.ui'); }
}
function setLayout(l) {
  save.layout = l; persist();
  stick = null; drag = null; firePtrs.clear(); st.stickVel = null; st.dragPos = null; st.fireHeld = false;
}
function endToTitle() { st.mode = 'title'; bus.stopMusic(); }

addEventListener('keydown', e => {
  if (e.repeat) return;
  bus.unlock();
  if (e.code === 'KeyM') { save.mute = !save.mute; bus.setMuted(save.mute); persist(); }
  if (st.mode === 'title') {
    if (e.code === 'KeyT') { setPack(packId === 'fowl' ? 'cluck' : 'fowl'); bus.play('sfx.ui'); }
    if (e.code === 'KeyL') { setLayout(save.layout === 'A' ? 'B' : 'A'); bus.play('sfx.ui'); }
    if (e.code === 'Digit1') ui.titleSel = 1;
    if (e.code === 'Digit2' && unlocked() >= 2) ui.titleSel = 2;
    if (e.code === 'Enter' || e.code === 'Space') { startChapter(ui.titleSel); bus.play('sfx.ui'); }
  } else if (st.mode === 'play') {
    if (['Space', 'KeyZ'].includes(e.code)) { st.fireHeld = true; e.preventDefault(); }
    if (['KeyX', 'ShiftLeft', 'ShiftRight'].includes(e.code)) E.fireMissile(st);
    if (['Escape', 'KeyP'].includes(e.code)) { st.paused = !st.paused; bus.play('sfx.ui'); }
  } else if (['gameover', 'win'].includes(st.mode)) {
    if (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Escape') { endToTitle(); bus.play('sfx.ui'); }
  }
});
addEventListener('keyup', e => {
  if (['Space', 'KeyZ'].includes(e.code))
    st.fireHeld = firePtrs.size > 0 || kb.isDown('Space') || kb.isDown('KeyZ') || !!drag;
});
addEventListener('blur', () => { if (st.mode === 'play') st.paused = true; });   // kb already clears on blur

cv.addEventListener('pointerdown', e => {
  bus.unlock();
  const p = CORE.toStage(cv, W, H, e);
  if (e.pointerType === 'touch') touchMode = true;
  if (st.mode === 'title') { titleClick(p.x, p.y); return; }
  if (st.mode === 'play') {
    if (st.paused) { st.paused = false; return; }
    if (e.button === 2) { E.fireMissile(st); return; }
    const b = missileBtn();
    if (touchMode && inR(p, b)) { E.fireMissile(st); return; }
    if (e.pointerType === 'touch' && save.layout === 'A') {
      if (p.x < W / 2) { if (!stick) stick = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y }; }
      else { firePtrs.add(e.pointerId); st.fireHeld = true; }
      return;
    }
    st.fireHeld = true;
    drag = { id: e.pointerId, ox: p.x, oy: p.y, sx: st.ship.x, sy: st.ship.y };
  }
  else if (['gameover', 'win'].includes(st.mode)) endToTitle();
});
cv.addEventListener('pointermove', e => {
  const p = CORE.toStage(cv, W, H, e);
  if (stick && e.pointerId === stick.id) { stick.x = p.x; stick.y = p.y; }
  if (drag && e.pointerId === drag.id) {
    // relative drag → absolute engine target (ship doesn't hide under finger)
    st.dragPos = { x: drag.sx + (p.x - drag.ox), y: drag.sy + (p.y - drag.oy) };
  }
});
const ptrUp = e => {
  firePtrs.delete(e.pointerId);
  if (stick && e.pointerId === stick.id) { stick = null; st.stickVel = null; }
  if (drag && e.pointerId === drag.id) { drag = null; st.dragPos = null; }
  if (!firePtrs.size && !kb.isDown('Space') && !kb.isDown('KeyZ')) st.fireHeld = false;
};
addEventListener('pointerup', ptrUp);
addEventListener('pointercancel', ptrUp);
cv.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- per-frame input → engine intent ---------- */
function feedInput() {
  if (st.mode !== 'play') { st.moveAxis.x = 0; st.moveAxis.y = 0; return; }
  if (stick) {
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy);
    const cl = m > 48 ? 48 / m : 1;
    st.stickVel = { vx: dx * cl / 48 * SHIP_MAXV, vy: dy * cl / 48 * SHIP_MAXV };
  } else {
    st.stickVel = null;
    st.moveAxis.x = (kb.isDown('ArrowRight') || kb.isDown('KeyD') ? 1 : 0) - (kb.isDown('ArrowLeft') || kb.isDown('KeyA') ? 1 : 0);
    st.moveAxis.y = (kb.isDown('ArrowDown') || kb.isDown('KeyS') ? 1 : 0) - (kb.isDown('ArrowUp') || kb.isDown('KeyW') ? 1 : 0);
  }
  // layout B auto-fires while the drag finger is down (spec 04 §Controls B)
  if (touchMode && save.layout === 'B' && drag) st.fireHeld = true;
}

/* ---------- event → SFX ---------- */
function drainEvents() {
  for (const ev of st.events) {
    if (ev === 'shoot') bus.play('sfx.shoot');
    else if (ev === 'hit') { bus.play('sfx.hit'); bus.play('sfx.squawk', { freqMul: 0.9 + Math.random() * 0.25 }); }
    else if (ev === 'death') { bus.play('sfx.death'); bus.duck(0.5, 400); }
    else if (ev === 'missile') bus.play('sfx.missile');
    else if (ev === 'pickup') bus.play('sfx.pickup');
    else if (ev === 'bossSpawn') bus.play('sfx.boss');
    else if (ev === 'bossDown') { bus.play('sfx.bossdown'); bus.duck(0.6, 600); }
    else if (ev === 'chapterClear') { bus.play('sfx.clear'); }
    else if (ev === 'win') { bus.play('sfx.clear', { freqMul: 1.25 }); }
    else if (ev === 'gameOver') bus.stopMusic();
  }
  st.events.length = 0;
}

/* ---------- chapter unlock ---------- */
function checkUnlock() {
  if (st.mode === 'clear' || st.mode === 'win') {
    const have = save.unlocked[pack.id] || 1;
    const want = Math.min(pack.chapters.length, st.chapter + 1);
    if (want > have) { save.unlocked[pack.id] = want; persist(); }
  }
}

/* ================= render (ported from prototype, pack-parameterized) ================= */
let drawT = 0, drawLast = -1, titleT0 = -1, puffAcc = 0, smokeIdx = 0;
const SPR = { packId: null };
const smoke = [];

function mkSpr(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h); return c;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const r = Math.round((n >> 16 & 255) + (t - (n >> 16 & 255)) * p);
  const g = Math.round((n >> 8 & 255) + (t - (n >> 8 & 255)) * p);
  const b = Math.round((n & 255) + (t - (n & 255)) * p);
  return `rgb(${r},${g},${b})`;
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function rrectG(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
const rrect = (x, y, w, h, r) => rrectG(ctx, x, y, w, h, r);
function txt(t, x, y, col, size, align) {
  ctx.font = size + 'px monospace';
  if (align) ctx.textAlign = align;
  ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(t, x + 1, y + 1);
  ctx.fillStyle = col; ctx.fillText(t, x, y);
  ctx.textAlign = 'left';
}

function bgArt(g) {
  const lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, pack.bg1); lg.addColorStop(1, pack.bg0);
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  const blob = (x, y, r, col, a) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0));
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(W * .2, H * .24, 290, pack.neb1, .5);
  blob(W * .82, H * .16, 230, pack.neb2, .42);
  blob(W * .58, H * .78, 330, pack.neb1, .28);
  blob(W * .06, H * .86, 210, pack.neb2, .24);
  g.save(); g.translate(W / 2, H * .38); g.rotate(-.28);
  const gb = g.createLinearGradient(0, -60, 0, 60);
  gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(.5, 'rgba(255,255,255,.045)'); gb.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gb; g.fillRect(-W, -60, W * 2, 120);
  g.restore();
  const vg = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function planetArt(g) {
  const cx = 120, cy = 120, R = 78;
  const pg = g.createRadialGradient(cx - 26, cy - 30, 8, cx, cy, R + 4);
  pg.addColorStop(0, shade(pack.planet, .3)); pg.addColorStop(.65, pack.planet); pg.addColorStop(1, shade(pack.planet, -.45));
  g.fillStyle = pg; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
  if (pack.id === 'fowl') {
    g.strokeStyle = rgba(pack.ring, .22); g.lineWidth = 9;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(cx, cy + i * 24, R, 13, 0, 0, 7); g.stroke(); }
  } else {
    g.fillStyle = 'rgba(0,0,0,.28)';
    for (const c of [[-28, -18, 12], [14, 8, 9], [-6, 34, 7], [30, -30, 6], [-38, 22, 5]]) {
      g.beginPath(); g.arc(cx + c[0], cy + c[1], c[2], 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (const c of [[-28, -18, 12], [14, 8, 9]]) {
      g.beginPath(); g.arc(cx + c[0] - 2, cy + c[1] - 2, c[2] * .6, 0, 7); g.fill();
    }
  }
  g.restore();
  if (pack.id === 'fowl') {
    g.strokeStyle = rgba(pack.ring, .28); g.lineWidth = 13;
    g.beginPath(); g.ellipse(cx, cy + 8, 112, 28, -.16, 0, 7); g.stroke();
    g.strokeStyle = rgba(pack.ring, .55); g.lineWidth = 5;
    g.beginPath(); g.ellipse(cx, cy + 8, 108, 26, -.16, 0, 7); g.stroke();
  }
  g.strokeStyle = rgba(pack.ring, .55); g.lineWidth = 2.5;
  g.beginPath(); g.arc(cx, cy, R - 1, -2.5, -.55); g.stroke();
}
function bannerArt(g) {
  const lg = g.createLinearGradient(0, 0, 0, 96);
  lg.addColorStop(0, 'rgba(0,0,0,.88)'); lg.addColorStop(.5, 'rgba(6,8,16,.62)'); lg.addColorStop(1, 'rgba(0,0,0,.88)');
  g.fillStyle = lg; g.fillRect(0, 0, W, 96);
  g.strokeStyle = rgba(pack.accent, .4); g.lineWidth = 6;
  g.beginPath(); g.moveTo(0, 4); g.lineTo(W, 4); g.moveTo(0, 92); g.lineTo(W, 92); g.stroke();
  g.strokeStyle = pack.accent; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 1.5); g.lineTo(W, 1.5); g.moveTo(0, 94.5); g.lineTo(W, 94.5); g.stroke();
}
function birdArt(g, k, pose, mad) {
  const cluck = pack.id === 'cluck';
  const body = pack.foe, dk = shade(body, -.3), dk2 = shade(body, -.52);
  const rx = cluck ? 13.5 : 15, ry = cluck ? 14.5 : 13.5;
  g.lineJoin = 'round';
  if (mad) {
    g.fillStyle = dk2;
    g.beginPath();
    for (let i = 0; i < 18; i++) {
      const th = i / 18 * Math.PI * 2, rr = (i % 2 ? 21 : 16.5) * k;
      const px = Math.cos(th) * rr, py = Math.sin(th) * rr * .9;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill();
  }
  g.fillStyle = dk;
  for (let i = -1; i <= 1; i++) {
    g.save(); g.translate(-10 * k, -6 * k); g.rotate(-.75 + i * .3);
    g.beginPath(); g.ellipse(0, -8 * k, (cluck ? 2.8 : 3.4) * k, (cluck ? 10 : 9) * k, 0, 0, 7); g.fill();
    g.restore();
  }
  const phi = pose === 'up' ? -.95 : pose === 'down' ? .7 : pose === 'mid' ? -.2 : 1.15;
  for (const sx of [-1, 1]) {
    g.save(); g.translate(sx * 11 * k, -1 * k); g.scale(sx, 1); g.rotate(phi);
    g.fillStyle = dk;
    g.beginPath();
    g.ellipse(6.5 * k, 0, (pose === 'dive' ? 7 : 10.5) * k, (pose === 'dive' ? 3.4 : 5) * k, 0, 0, 7);
    g.fill();
    g.strokeStyle = dk2; g.lineWidth = 1 * k;
    g.beginPath(); g.moveTo(2.5 * k, 0); g.lineTo((pose === 'dive' ? 10 : 14.5) * k, 0); g.stroke();
    g.restore();
  }
  const bg2 = g.createRadialGradient(-4 * k, -6 * k, 2 * k, 0, 0, 18 * k);
  bg2.addColorStop(0, shade(body, .2)); bg2.addColorStop(1, body);
  g.fillStyle = bg2;
  g.beginPath(); g.ellipse(0, 0, rx * k, (pose === 'dive' ? ry * 1.12 : ry) * k, 0, 0, 7); g.fill();
  g.strokeStyle = dk2; g.lineWidth = 1.2 * k; g.stroke();
  g.fillStyle = pack.belly;
  g.beginPath(); g.ellipse(0, 5 * k, rx * .62 * k, ry * .55 * k, 0, 0, 7); g.fill();
  g.fillStyle = body;
  g.beginPath(); g.arc(0, -14 * k, 7.6 * k, 0, 7); g.fill();
  g.strokeStyle = dk2; g.lineWidth = 1 * k; g.stroke();
  g.fillStyle = pack.beak;
  g.beginPath(); g.moveTo(-3.4 * k, -11.5 * k); g.lineTo(3.4 * k, -11.5 * k); g.lineTo(0, -6.5 * k); g.closePath(); g.fill();
  g.strokeStyle = shade(pack.beak, -.4); g.lineWidth = .8 * k; g.stroke();
  g.fillStyle = pack.comb;
  g.beginPath(); g.ellipse(2.8 * k, -6.2 * k, 1.5 * k, (cluck ? 1.8 : 2.6) * k, .3, 0, 7); g.fill();
  const ey = -16 * k;
  for (const sx of [-1, 1]) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * 3.2 * k, ey, 2.2 * k, 0, 7); g.fill();
    g.fillStyle = mad ? '#ff2b2b' : '#141414'; g.beginPath(); g.arc(sx * 3.2 * k, ey + .7 * k, 1.2 * k, 0, 7); g.fill();
    g.strokeStyle = dk2; g.lineWidth = (mad ? 1.8 : 1.3) * k;
    g.beginPath(); g.moveTo(sx * 6.2 * k, ey - 3.6 * k); g.lineTo(sx * 1.4 * k, ey - 1.7 * k); g.stroke();
  }
  if (!cluck) {
    g.fillStyle = pack.comb;
    for (let i = -1; i <= 1; i++) {
      g.beginPath(); g.ellipse(i * 3.4 * k, -21.3 * k - (i === 0 ? 1.6 * k : 0), 2.4 * k, 3 * k, 0, 0, 7); g.fill();
    }
  } else {
    g.strokeStyle = pack.foe2; g.lineWidth = 2 * k; g.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      g.beginPath(); g.moveTo(i * 2 * k, -20.5 * k);
      g.quadraticCurveTo(i * 4.5 * k, -25 * k, i * 6.5 * k, -27.5 * k); g.stroke();
    }
    g.lineCap = 'butt';
  }
  if (pose === 'dive') {
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.5 * k; g.lineCap = 'round';
    for (const l of [[-12, -22, -33], [-6.5, -26, -35], [6.5, -26, -35], [12, -22, -33]]) {
      g.beginPath(); g.moveTo(l[0] * k, l[1] * k); g.lineTo(l[0] * k, l[2] * k); g.stroke();
    }
    g.lineCap = 'butt';
  }
}
function crownArt(g, k, mad) {
  if (pack.id === 'fowl') {
    const y = -24.2 * k;
    g.fillStyle = '#f6c453'; g.strokeStyle = '#a8741a'; g.lineWidth = 1 * k;
    for (let i = -1; i <= 1; i++) {
      g.beginPath(); g.ellipse(i * 5.6 * k, y - 2.2 * k - (i === 0 ? 1.6 * k : 0), 2.8 * k, 3.6 * k, 0, 0, 7); g.fill(); g.stroke();
    }
    rrectG(g, -8.6 * k, y, 17.2 * k, 4 * k, 1.8 * k); g.fill(); g.stroke();
    g.fillStyle = mad ? '#ff5252' : '#e8590c';
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * 5.6 * k, y + 2 * k, 1 * k, 0, 7); g.fill(); }
  } else {
    const y = -22.5 * k;
    g.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      g.strokeStyle = i % 2 ? pack.ship : '#f1f3f5'; g.lineWidth = 2.6 * k;
      g.beginPath(); g.moveTo(i * 3 * k, y);
      g.quadraticCurveTo(i * 5 * k, y - 6 * k, i * 7.6 * k, y - 9.6 * k); g.stroke();
    }
    g.lineCap = 'butt';
    g.fillStyle = pack.ship;
    rrectG(g, -9.4 * k, y - 1.2 * k, 18.8 * k, 3.6 * k, 1.8 * k); g.fill();
    g.strokeStyle = shade(pack.ship, -.4); g.lineWidth = .9 * k; g.stroke();
  }
}
function bossArt(g, mad) {
  g.translate(100, 104);
  birdArt(g, 3.2, 'mid', mad);
  crownArt(g, 3.2, mad);
}
function shipArt(g, lv) {
  const base = pack.ship, hi = pack.shipHi, dk = shade(base, -.35), dk2 = shade(base, -.55);
  g.lineJoin = 'round';
  g.fillStyle = dk2; rrectG(g, -5, 12, 10, 5, 2); g.fill();
  g.beginPath();
  g.moveTo(0, -21);
  g.quadraticCurveTo(5, -8, 19, 9);
  g.lineTo(15, 13); g.lineTo(7, 11); g.lineTo(4, 15);
  g.lineTo(-4, 15); g.lineTo(-7, 11); g.lineTo(-15, 13); g.lineTo(-19, 9);
  g.quadraticCurveTo(-5, -8, 0, -21);
  g.closePath();
  const hg = g.createLinearGradient(0, -21, 0, 16);
  hg.addColorStop(0, shade(base, .3)); hg.addColorStop(.55, base); hg.addColorStop(1, dk);
  g.fillStyle = hg; g.fill();
  g.strokeStyle = dk2; g.lineWidth = 1.2; g.stroke();
  g.beginPath();
  g.moveTo(0, -21); g.quadraticCurveTo(5, -8, 19, 9); g.lineTo(15, 13); g.lineTo(7, 11); g.lineTo(4, 15); g.lineTo(0, 15);
  g.closePath(); g.fillStyle = 'rgba(0,0,0,.17)'; g.fill();
  const cg = g.createRadialGradient(-1, -8, .5, 0, -5, 6.5);
  cg.addColorStop(0, '#ffffff'); cg.addColorStop(.45, hi); cg.addColorStop(1, rgba(hi, .2));
  g.fillStyle = cg;
  g.beginPath(); g.ellipse(0, -5, 3.4, 6.8, 0, 0, 7); g.fill();
  g.strokeStyle = dk2; g.lineWidth = .8; g.stroke();
  g.strokeStyle = rgba(hi, .8); g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, -19); g.lineTo(0, 5); g.stroke();
  g.strokeStyle = pack.accent; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-13.5, 8.5); g.lineTo(-6, 2.5); g.moveTo(13.5, 8.5); g.lineTo(6, 2.5); g.stroke();
  const barrel = (x, y, l) => {
    g.fillStyle = '#21262b'; rrectG(g, x - 1.7, y - l, 3.4, l + 3.5, 1.5); g.fill();
    g.fillStyle = pack.accent; g.fillRect(x - 1.7, y - l, 3.4, 1.7);
  };
  if (lv === 0) barrel(0, -19.5, 5);
  else if (lv === 1) { barrel(-8.5, -5, 6); barrel(8.5, -5, 6); }
  else { barrel(0, -19.5, 5); barrel(-11.5, -1.5, 6); barrel(11.5, -1.5, 6); }
}
function flameArt(g, i) {
  const l = [19, 25, 22][i], w = [7.5, 5.5, 6.5][i];
  const fg = g.createRadialGradient(10, 5, 1, 10, 9, l);
  fg.addColorStop(0, '#fff7ae'); fg.addColorStop(.35, '#ffd43b');
  fg.addColorStop(.7, 'rgba(255,107,53,.65)'); fg.addColorStop(1, 'rgba(255,107,53,0)');
  g.fillStyle = fg;
  g.beginPath();
  g.moveTo(10 - w / 2, 3);
  g.quadraticCurveTo(10 - w / 2 - 1.5, 13, 10, 3 + l);
  g.quadraticCurveTo(10 + w / 2 + 1.5, 13, 10 + w / 2, 3);
  g.closePath(); g.fill();
}
function bulletArt(g) {
  const hg = g.createRadialGradient(10, 15, 1, 10, 15, 14);
  hg.addColorStop(0, rgba(pack.bullet, .5)); hg.addColorStop(1, rgba(pack.bullet, 0));
  g.fillStyle = hg; g.fillRect(0, 0, 20, 30);
  g.fillStyle = pack.bullet; rrectG(g, 7.3, 8, 5.4, 14, 2.7); g.fill();
  g.fillStyle = '#fff'; rrectG(g, 8.6, 9.6, 2.8, 9.5, 1.4); g.fill();
}
function missileArt(g) {
  g.fillStyle = pack.accent;
  g.beginPath(); g.moveTo(8, 25); g.lineTo(2.5, 34); g.lineTo(8, 31.5); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(16, 25); g.lineTo(21.5, 34); g.lineTo(16, 31.5); g.closePath(); g.fill();
  const fg = g.createLinearGradient(0, 30, 0, 43);
  fg.addColorStop(0, '#fff7ae'); fg.addColorStop(.5, '#ffa94d'); fg.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = fg;
  g.beginPath(); g.moveTo(9, 30); g.quadraticCurveTo(9.5, 39, 12, 43); g.quadraticCurveTo(14.5, 39, 15, 30); g.closePath(); g.fill();
  const mg = g.createLinearGradient(8, 0, 16, 0);
  mg.addColorStop(0, '#868e96'); mg.addColorStop(.45, '#e9ecef'); mg.addColorStop(1, '#adb5bd');
  g.fillStyle = mg; rrectG(g, 8, 10, 8, 22, 3.5); g.fill();
  g.strokeStyle = '#495057'; g.lineWidth = .8; g.stroke();
  g.fillStyle = pack.accent;
  g.beginPath(); g.moveTo(8, 12); g.quadraticCurveTo(12, .5, 16, 12); g.closePath(); g.fill();
  g.fillStyle = '#212529'; g.beginPath(); g.arc(12, 17, 1.8, 0, 7); g.fill();
  g.fillStyle = '#a5d8ff'; g.beginPath(); g.arc(11.4, 16.4, .8, 0, 7); g.fill();
  g.fillStyle = pack.accent; g.fillRect(8, 24, 8, 2.2);
}
function eggArt(g) {
  const eg = g.createRadialGradient(6.5, 7, 1, 9, 11, 10);
  eg.addColorStop(0, '#fffdf5'); eg.addColorStop(.55, pack.egg); eg.addColorStop(1, shade(pack.egg, -.28));
  g.fillStyle = eg;
  g.beginPath(); g.ellipse(9, 11, 6.4, 8.2, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(120,110,80,.7)'; g.lineWidth = .9; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.beginPath(); g.ellipse(6.8, 7.4, 1.5, 2.3, -.5, 0, 7); g.fill();
}
function puffArt(g) {
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(215,220,235,.5)'); r.addColorStop(.6, 'rgba(200,205,220,.22)'); r.addColorStop(1, 'rgba(200,205,220,0)');
  g.fillStyle = r; g.fillRect(0, 0, 32, 32);
}
function giftArt(g) {
  g.fillStyle = shade(pack.giftCol, -.18); rrectG(g, 8, 15, 20, 14, 2.5); g.fill();
  g.fillStyle = pack.giftCol; rrectG(g, 8, 15, 20, 11, 2.5); g.fill();
  g.strokeStyle = shade(pack.giftCol, -.5); g.lineWidth = 1; rrectG(g, 8, 15, 20, 14, 2.5); g.stroke();
  g.fillStyle = shade(pack.giftCol, .15); rrectG(g, 6.5, 11.5, 23, 4.5, 2); g.fill(); g.stroke();
  g.fillStyle = pack.accent;
  g.fillRect(16.4, 11.5, 3.2, 17.5); g.fillRect(8, 19.5, 20, 3);
  g.strokeStyle = pack.accent; g.lineWidth = 1.8;
  g.beginPath(); g.ellipse(14.8, 9.3, 3.4, 2.2, -.5, 0, 7); g.stroke();
  g.beginPath(); g.ellipse(21.2, 9.3, 3.4, 2.2, .5, 0, 7); g.stroke();
  g.fillStyle = pack.accent; g.beginPath(); g.arc(18, 9.8, 1.7, 0, 7); g.fill();
}
function foodArt(g) {
  if (pack.id === 'fowl') {
    g.save(); g.translate(18, 19); g.rotate(-.5);
    g.fillStyle = '#f1f3f5';
    rrectG(g, 2, -2.2, 12, 4.4, 2.2); g.fill();
    g.beginPath(); g.arc(14.5, -3.4, 3, 0, 7); g.arc(15.5, 1.6, 3, 0, 7); g.fill();
    const mg = g.createRadialGradient(-4, -4, 1, 0, 0, 12);
    mg.addColorStop(0, '#d98e4a'); mg.addColorStop(1, '#8c4a1f');
    g.fillStyle = mg;
    g.beginPath(); g.ellipse(-2, 1, 10, 8.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#5f310f'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.ellipse(-5, -2.5, 3.2, 2, -.4, 0, 7); g.fill();
    g.restore();
  } else {
    g.fillStyle = '#868e96'; rrectG(g, 8, 12, 20, 17, 2); g.fill();
    g.fillStyle = '#adb5bd'; rrectG(g, 8, 12, 20, 13.5, 2); g.fill();
    g.strokeStyle = '#495057'; g.lineWidth = 1; rrectG(g, 8, 12, 20, 17, 2); g.stroke();
    g.fillStyle = pack.ship; g.fillRect(8, 18.5, 20, 3); g.fillRect(16.5, 12, 3, 17);
    g.fillStyle = '#343a40'; g.font = 'bold 7px monospace'; g.textAlign = 'center';
    g.fillText('R', 18, 16.8); g.textAlign = 'left';
  }
}
function buildSprites() {
  SPR.packId = pack.id;
  SPR.bg = mkSpr(W, H, bgArt);
  SPR.planet = mkSpr(240, 240, planetArt);
  SPR.banner = mkSpr(W, 96, bannerArt);
  SPR.star = [
    mkSpr(6, 6, g => { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(3, 3, 1.3, 0, 7); g.fill(); }),
    mkSpr(9, 9, g => { const r = g.createRadialGradient(4.5, 4.5, 0, 4.5, 4.5, 4.5); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 9, 9); }),
    mkSpr(15, 15, g => { const r = g.createRadialGradient(7.5, 7.5, 0, 7.5, 7.5, 7.5); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(230,240,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 15, 15);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = .9;
      g.beginPath(); g.moveTo(7.5, 1); g.lineTo(7.5, 14); g.moveTo(1, 7.5); g.lineTo(14, 7.5); g.stroke(); })
  ];
  SPR.birdUp = mkSpr(56, 56, g => { g.translate(28, 30); birdArt(g, 1, 'up', false); });
  SPR.birdDn = mkSpr(56, 56, g => { g.translate(28, 30); birdArt(g, 1, 'down', false); });
  SPR.birdDive = mkSpr(56, 64, g => { g.translate(28, 36); birdArt(g, 1, 'dive', false); });
  SPR.boss = mkSpr(200, 190, g => bossArt(g, false));
  SPR.bossMad = mkSpr(200, 190, g => bossArt(g, true));
  SPR.ship = [0, 1, 2].map(lv => mkSpr(48, 56, g => { g.translate(24, 30); shipArt(g, lv); }));
  SPR.flame = [0, 1, 2].map(i => mkSpr(20, 30, g => flameArt(g, i)));
  SPR.bullet = mkSpr(20, 30, bulletArt);
  SPR.missile = mkSpr(24, 44, missileArt);
  SPR.egg = mkSpr(18, 22, eggArt);
  SPR.puff = mkSpr(32, 32, puffArt);
  SPR.gift = mkSpr(36, 36, giftArt);
  SPR.food = mkSpr(36, 36, foodArt);
}

function draw() {
  const now = performance.now() / 1000;
  const ddt = drawLast < 0 ? 0 : Math.min(0.1, now - drawLast);
  drawLast = now; drawT = now;
  if (SPR.packId !== pack.id) buildSprites();
  titleT0 = st.mode === 'title' ? (titleT0 < 0 ? drawT : titleT0) : -1;

  ctx.drawImage(SPR.bg, 0, 0);
  ctx.globalAlpha = .9;
  ctx.drawImage(SPR.planet, W * .82 - 120 + Math.sin(drawT * .045) * 12, H - 178 + Math.sin(drawT * .03) * 4);
  ctx.globalAlpha = 1;
  // engine-owned star field (seeded) tiered by size, twinkle is draw-side
  for (const s of st.stars) {
    const tier = s.s < 1.4 ? 0 : s.s < 2.2 ? 1 : 2;
    ctx.globalAlpha = [.45, .7, 1][tier] * (.62 + .38 * Math.sin(drawT * (1.2 + s.s) + s.x * .7));
    const o = [3, 4.5, 7.5][tier];
    ctx.drawImage(SPR.star[tier], s.x - o, s.y - o);
  }
  ctx.globalAlpha = 1;

  if (st.mode === 'title') return drawTitle();

  for (const p of st.pickups) {
    const y = p.y + Math.sin(drawT * 4 + p.x * .05) * 3;
    ctx.strokeStyle = rgba(pack.accent, .45 + .3 * Math.sin(drawT * 6 + p.x));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, y, 15 + Math.sin(drawT * 5 + p.x) * 2.5, 0, 7); ctx.stroke();
    ctx.drawImage(p.kind === 'gift' ? SPR.gift : SPR.food, p.x - 18, y - 18);
    for (let i = 0; i < 3; i++) {
      const a = drawT * 2.6 + i * 2.1 + p.x * .01;
      ctx.globalAlpha = .35 + .55 * Math.abs(Math.sin(drawT * 4.5 + i * 2.3 + p.x));
      ctx.drawImage(SPR.star[1], p.x + Math.cos(a) * 14 - 4.5, y + Math.sin(a) * 12 - 4.5);
    }
    ctx.globalAlpha = 1;
  }
  for (const c of st.chickens) drawBird(c);
  const boss = st.boss;
  if (boss) {
    const mad = boss.hp < boss.max * .35;
    if (boss.warn > 0) {
      ctx.strokeStyle = rgba(pack.accent, .85); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(boss.x, boss.y, 74 + Math.sin(boss.t * 30) * 6, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(boss.x, boss.y, 64 + Math.sin(boss.t * 30) * 6, 0, 7); ctx.stroke();
    }
    const bs = mad ? SPR.bossMad : SPR.boss;
    ctx.drawImage(bs, boss.x - 100, boss.y - 104 + Math.sin(boss.t * 2.2) * 5);
    const bx = W / 2 - 160, frac = Math.max(0, boss.hp) / boss.max;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(bx - 4, 10, 328, 18, 5); ctx.fill();
    const seg = 20, sw = 320 / seg;
    for (let i = 0; i < seg; i++) {
      ctx.fillStyle = frac * seg > i
        ? (mad ? rgba(pack.accent, .7 + .3 * Math.sin(drawT * 10)) : pack.accent)
        : 'rgba(255,255,255,.09)';
      ctx.fillRect(bx + i * sw + 1, 14, sw - 2, 10);
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; rrect(bx - 4, 10, 328, 18, 5); ctx.stroke();
    txt(pack.chapters[st.chapter - 1].boss.name, W / 2, 40, '#fff', 11, 'center');
  }
  for (const e of st.eggs) {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.rotate(Math.sin(drawT * 7 + e.x * .13 + e.y * .02) * .18);
    ctx.drawImage(SPR.egg, -9, -11);
    ctx.restore();
  }
  for (const b of st.bullets) {
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx || 0) + Math.PI / 2);
    ctx.drawImage(SPR.bullet, -10, -15);
    ctx.restore();
  }
  if (!st.paused) {
    puffAcc += ddt * 55 * st.missiles.length;
    while (puffAcc >= 1) {
      puffAcc -= 1;
      if (st.missiles.length && smoke.length < 160) {
        const m = st.missiles[smokeIdx++ % st.missiles.length];
        smoke.push({ x: m.x + (Math.random() - .5) * 5, y: m.y + 18, r: 3.5 + Math.random() * 3, life: .5, max: .5 });
      }
    }
    let sw2 = 0;
    for (const p of smoke) { p.y += 34 * ddt; p.r += 16 * ddt; p.life -= ddt; if (p.life > 0) smoke[sw2++] = p; }
    smoke.length = sw2;
  }
  for (const p of smoke) {
    ctx.globalAlpha = Math.max(0, p.life / p.max) * .4;
    ctx.drawImage(SPR.puff, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  ctx.globalAlpha = 1;
  for (const m of st.missiles) ctx.drawImage(SPR.missile, m.x - 12, m.y - 22);
  const ship = st.ship;
  if (ship.alive && (ship.invuln <= 0 || (st.waveT * 16 | 0) % 2 === 0)) drawShip();
  for (const p of st.parts) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    const feather = p.col !== pack.ship;
    if (feather) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + p.spin);
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.s * 1.15, p.s * .38, 0, 0, 7); ctx.fill();
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin + p.life * 9);
      ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .35);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  if (st.mode === 'play' && !ship.alive) {
    const rt = st.deadT / .45;
    if (rt < 1) {
      ctx.globalAlpha = (1 - rt) * .9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * (1 - rt) + 1;
      ctx.beginPath(); ctx.arc(ship.x, ship.y, 12 + rt * 95, 0, 7); ctx.stroke();
      ctx.globalAlpha = (1 - rt) * .5; ctx.strokeStyle = pack.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ship.x, ship.y, 8 + rt * 70, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (st.deadT < .035) {
      ctx.fillStyle = `rgba(255,255,255,${(.55 * (1 - st.deadT / .035)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawHUD();
  if (st.jokeT > 0 && pack.jokes) center2(pack.jokes[(st.chapter - 1) % pack.jokes.length], H - 120, '#8ce99a', 14);
  if (st.paused) banner('PAUSED — ESC resume');
  if (st.mode === 'clear') banner(`CHAPTER ${st.chapter} CLEAR — next: chapter ${st.chapter + 1}`);
  if (st.mode === 'gameover') banner('GAME OVER — R / click for title');
  if (st.mode === 'win') banner('ALL CHAPTERS CLEAR — R / click for title');
}
function drawBird(c) {
  if (c.dive) {
    ctx.save(); ctx.translate(c.x, c.y);
    ctx.rotate(Math.max(-.45, Math.min(.45, (c.dvx || 0) * .0012)));
    ctx.drawImage(SPR.birdDive, -28, -36);
    ctx.restore();
    return;
  }
  const spr = ((c.t * (c.enter ? 11 : 7) | 0) % 2) ? SPR.birdUp : SPR.birdDn;
  ctx.drawImage(spr, c.x - 28, c.y - 30);
}
function drawShip() {
  const ship = st.ship;
  ctx.save(); ctx.translate(ship.x, ship.y);
  ctx.rotate(Math.max(-.16, Math.min(.16, ship.vx / SHIP_MAXV * .16)));
  const fl = SPR.flame[(drawT * 24 | 0) % 3];
  ctx.drawImage(fl, -10, 13, 20, 24 + Math.sin(drawT * 31) * 4);
  ctx.drawImage(SPR.ship[st.weaponLv], -24, -30);
  ctx.restore();
}
function drawHUD() {
  txt(`SCORE ${st.score}`, 14, 22, '#fff', 14);
  txt(`LIVES ${'♥'.repeat(Math.max(0, st.lives))}`, 14, 42, '#ff8787', 14);
  txt(`${pack.weapons[st.weaponLv]}`, 14, 62, pack.bullet, 14);
  txt(`MISSILES ${st.missileN}`, 14, 82, '#ffd43b', 14);
  const chIdx = Math.min(st.chapter, pack.chapters.length) - 1;
  const wl = pack.chapters[chIdx].waves.length;
  txt(`CH ${st.chapter} · ${st.boss ? 'BOSS' : 'WAVE ' + (st.waveIdx + 1) + '/' + wl}`, W - 14, 22, '#fff', 14, 'right');
  txt(`[${pack.id.toUpperCase()}]`, W - 14, 42, pack.accent, 14, 'right');
  txt(save.mute ? 'M unmute' : 'M mute', W - 14, 62, '#889', 11, 'right');
  txt(touchMode
    ? (save.layout === 'A' ? 'LAYOUT A: LEFT-half stick move · RIGHT-half hold fire · MISSILE above'
                          : 'LAYOUT B: DRAG move · auto-fire while dragging · MISSILE btn bottom-right')
    : 'ARROWS/WASD move · SPACE/Z/LMB fire · X/SHIFT/RMB missile · ESC pause · M mute', 14, H - 10, '#889', 11);
  if (touchMode && st.mode === 'play') {
    orbBtn(missileBtn(), pack.accent, SPR.missile, st.missileN > 0, false, 'MISSILE');
    if (save.layout === 'A') {
      orbBtn(FIRE_BTN_A, '#8ce99a', SPR.bullet, true, firePtrs.size > 0, 'FIRE');
      if (stick) {
        const dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy);
        const cl = m > 48 ? 48 / m : 1, kx = stick.ox + dx * cl, ky = stick.oy + dy * cl;
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 48, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 48, 0, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(stick.ox - 48, stick.oy); ctx.lineTo(stick.ox - 38, stick.oy);
        ctx.moveTo(stick.ox + 38, stick.oy); ctx.lineTo(stick.ox + 48, stick.oy);
        ctx.moveTo(stick.ox, stick.oy - 48); ctx.lineTo(stick.ox, stick.oy - 38);
        ctx.moveTo(stick.ox, stick.oy + 38); ctx.lineTo(stick.ox, stick.oy + 48);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath(); ctx.arc(kx, ky, 15, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath(); ctx.arc(kx - 3, ky - 4, 8, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(kx, ky, 15, 0, 7); ctx.stroke();
      }
    }
  }
}
function orbBtn(r, col, spr, enabled, pressed, label) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = Math.min(r.w, r.h) / 2 - 3;
  ctx.globalAlpha = enabled ? 1 : .35;
  ctx.fillStyle = rgba(col, pressed ? .42 : .16);
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = pressed ? 3 : 2;
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.stroke();
  ctx.strokeStyle = rgba(col, .4); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, rad - 5, 0, 7); ctx.stroke();
  if (spr) {
    const sh = spr.height * .62, sw = spr.width * .62;
    ctx.drawImage(spr, cx - sw / 2, cy - sh / 2 - 4, sw, sh);
  }
  ctx.globalAlpha = 1;
  txt(label, cx, cy + rad - 7, col, 8, 'center');
}
function banner(t) {
  ctx.drawImage(SPR.banner, 0, H / 2 - 48);
  ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillText(t, W / 2 + 2, H / 2 + 11);
  ctx.fillStyle = '#fff'; ctx.fillText(t, W / 2, H / 2 + 9);
  ctx.textAlign = 'left';
}
function center2(t, y, col, size) {
  ctx.fillStyle = col; ctx.font = `${size}px monospace`; ctx.textAlign = 'center';
  ctx.fillText(t, W / 2, y); ctx.textAlign = 'left';
}
function drawTitle() {
  const t = drawT - titleT0;
  ctx.textAlign = 'center'; ctx.font = 'bold 46px monospace';
  ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(pack.title, W / 2 + 3, 123);
  ctx.shadowColor = pack.accent; ctx.shadowBlur = 18;
  ctx.fillStyle = pack.accent; ctx.fillText(pack.title, W / 2, 120);
  ctx.shadowBlur = 0; ctx.textAlign = 'left';
  ctx.drawImage(SPR.birdDn, W * .14 - 28, 92);
  ctx.save(); ctx.translate(W * .86, 0); ctx.scale(-1, 1);
  ctx.drawImage(SPR.birdUp, -28, 92); ctx.restore();
  const fp = Math.min(1, t / 1.5), ease = 1 - Math.pow(1 - fp, 3);
  const sx = -70 + (W / 2 + 70) * ease, sy = 300 - 68 * ease + Math.sin(drawT * 2.2) * 6 * fp;
  ctx.save(); ctx.translate(sx, sy);
  ctx.rotate((1 - ease) * .55 + Math.sin(drawT * 1.8) * .06 * fp);
  ctx.drawImage(SPR.flame[(drawT * 24 | 0) % 3], -10, 13, 20, 24 + Math.sin(drawT * 31) * 4);
  ctx.drawImage(SPR.ship[0], -24, -30);
  ctx.restore();

  center2(pack.sub, 152, '#aab', 15);
  btn(BTN.ch1, 'CH 1', ui.titleSel === 1);
  btn(BTN.ch2, unlocked() >= 2 ? 'CH 2' : 'CH 2 [locked]', ui.titleSel === 2 && unlocked() >= 2);
  btn(BTN.start, 'START', true);
  btn(BTN.pack, 'PACK: ' + pack.id.toUpperCase() + '  (T / click to swap)', false);
  btn(BTN.layout, 'TOUCH LAYOUT: ' + save.layout + '  (L / click to swap)', false);
  center2('ENTER start · 1/2 chapter · T swap pack · L touch layout · M mute', 478, '#889', 13);
  center2('fowl = golden-age chicken shmup · cluck = Cluck Horizon original IP · A twin-thumb / B one-thumb', 500, '#667', 12);
}
function btn(r, t, on) {
  ctx.fillStyle = on ? rgba(pack.accent, .24) : 'rgba(18,22,38,.6)';
  rrect(r.x, r.y, r.w, r.h, 12); ctx.fill();
  ctx.strokeStyle = on ? pack.accent : 'rgba(255,255,255,.32)';
  ctx.lineWidth = on ? 2 : 1.2;
  if (on) { ctx.shadowColor = pack.accent; ctx.shadowBlur = 10; }
  rrect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = on ? '#fff' : '#ccd';
  ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
  ctx.fillText(t, r.x + r.w / 2, r.y + r.h / 2 + 5); ctx.textAlign = 'left';
}

/* ---------- main loop ---------- */
function fit() { CORE.fitCanvas(cv, W, H); }
addEventListener('resize', fit); fit();

let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  feedInput();
  while (acc >= DT) { E.step(st, DT); acc -= DT; }
  drainEvents();
  checkUnlock();
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- verification hook (read-only; not gameplay) ---------- */
window.__fowl = {
  get mode() { return st.mode; }, get pack() { return pack.id; }, get chapter() { return st.chapter; },
  get wave() { return st.waveIdx + 1; }, get wavesTotal() { const c = pack.chapters[Math.min(st.chapter, pack.chapters.length) - 1]; return c.waves.length; },
  get score() { return st.score; }, get lives() { return st.lives; }, get missiles() { return st.missileN; },
  get weapon() { return st.weaponLv; }, get weaponName() { return pack.weapons[st.weaponLv]; },
  get shipX() { return st.ship.x; }, get shipY() { return st.ship.y; },
  get shipAlive() { return st.ship.alive; }, get invuln() { return st.ship.invuln; },
  get chickens() { return st.chickens.map(c => ({ x: c.x, y: c.y, hp: c.hp, dive: !!c.dive })); },
  get eggs() { return st.eggs.length; }, get pickups() { return st.pickups.map(p => ({ x: p.x, y: p.y, kind: p.kind })); },
  get bossHp() { return st.boss ? st.boss.hp : null; }, get bossMax() { return st.boss ? st.boss.max : null; },
  get bossX() { return st.boss ? st.boss.x : null; }, get bossWarn() { return st.boss ? st.boss.warn : 0; },
  get unlocked() { return unlocked(); }, get paused() { return st.paused; },
  get layout() { return save.layout; }, get touchMode() { return touchMode; },
  get mute() { return save.mute; },
  get stick() { return stick ? { ox: stick.ox, oy: stick.oy, x: stick.x, y: stick.y } : null; },
  get firePtrs() { return firePtrs.size; },
  get eggList() { return st.eggs.map(e => ({ x: e.x, y: e.y })); },
  get lastDeath() { return st.lastDeath; },
  get bullets() { return st.bullets.length; },
  BTN, PACKS: Object.keys(PACKS),
};
})();
