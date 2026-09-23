/* games/swords-and-sandals/game.js — browser shell for
 * DUST & STEEL: ARENA OF CHAMPIONS (Swords & Sandals 2 remake).
 * Canvas2D, zero-dep, file:// safe. Engine = engine.js (pure sim).
 * Mouse-primary + keyboard shortcuts + touch (>=48px targets).
 * 3 save slots via MAGA.save/load. Read-only probe: window.__sas.
 *
 * Art layer ported from prototypes/swords-and-sandals.html (verified 2026-09-22):
 * painted colosseum, crowd twinkle, torch braziers, Roman UI kit, figure builder.
 */
'use strict';
(() => {
const E = globalThis.SASENGINE;
const CORE = globalThis.MAGA, AU = globalThis.MAGA_AUDIO;
const W = 960, H = 600;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const hits = CORE.hitRects();

/* ---------- persistence: 3 gladiator slots ---------- */
const slotKey = i => `slot${i}`;
const slotMeta = i => { try { const d = JSON.parse(CORE.load('sas', slotKey(i), 'null')); return d && d.glad ? d.glad : null; } catch (e) { return null; } };
const saveSlot = i => CORE.save('sas', slotKey(i), E.save(st.glad));
const loadSlot = i => { const g = slotMeta(i); return g ? E.restore(st, JSON.stringify({ v: 1, glad: g })) : false; };
const prefs = CORE.load('sas', 'prefs', null) || {};
prefs.mute = !!prefs.mute;

/* ---------- audio ---------- */
const bus = new AU.AudioBus();
bus.register([
  { id: 'sfx.hit', kind: 'sfx', polyphony: 5,
    recipe: { type: 'noise_burst', durationMs: 90, gain: 0.12,
      noise: { amount: 0.8, freq: 2000 }, envelope: { a: 0.001, d: 0.06, s: 0, r: 0.03 } } },
  { id: 'sfx.crit', kind: 'sfx', polyphony: 3,
    recipe: { type: 'saw_thud', durationMs: 200, freq: 400, freqEnd: 90, gain: 0.2,
      noise: { amount: 0.4, freq: 1500 }, envelope: { a: 0.001, d: 0.15, s: 0, r: 0.05 } } },
  { id: 'sfx.miss', kind: 'sfx', polyphony: 4,
    recipe: { type: 'noise_burst', durationMs: 120, gain: 0.06,
      noise: { amount: 0.95, freq: 3600 }, envelope: { a: 0.01, d: 0.08, s: 0, r: 0.04 } } },
  { id: 'sfx.rage', kind: 'sfx', polyphony: 2,
    recipe: { type: 'saw_thud', durationMs: 450, freq: 140, freqEnd: 380, gain: 0.24,
      envelope: { a: 0.02, d: 0.35, s: 0, r: 0.1 } } },
  { id: 'sfx.potion', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 180, freq: 380, freqEnd: 760, gain: 0.10,
      envelope: { a: 0.01, d: 0.12, s: 0, r: 0.06 } } },
  { id: 'sfx.cast', kind: 'sfx', polyphony: 3,
    recipe: { type: 'fm_chirp', durationMs: 280, freq: 520, freqEnd: 1200, gain: 0.14,
      vibrato: { hz: 18, depth: 90 }, envelope: { a: 0.01, d: 0.2, s: 0, r: 0.08 } } },
  { id: 'sfx.taunt', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 160, freq: 220, freqEnd: 330, gain: 0.10,
      envelope: { a: 0.005, d: 0.1, s: 0, r: 0.05 } } },
  { id: 'sfx.buy', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 140, freq: 880, freqEnd: 1320, gain: 0.12,
      envelope: { a: 0.002, d: 0.09, s: 0, r: 0.05 } } },
  { id: 'sfx.deny', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 100, freq: 160, freqEnd: 110, gain: 0.09,
      envelope: { a: 0.001, d: 0.07, s: 0, r: 0.03 } } },
  { id: 'sfx.victory', kind: 'sfx', polyphony: 1,
    recipe: { type: 'arpeggio', durationMs: 700, gain: 0.2,
      pattern: ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'], bpm: 200, wave: 'square',
      envelope: { a: 0.003, d: 0.5, s: 0, r: 0.2 } } },
  { id: 'sfx.defeat', kind: 'sfx', polyphony: 1,
    recipe: { type: 'arpeggio', durationMs: 900, gain: 0.18,
      pattern: ['A3', 'F3', 'D3', 'A2'], bpm: 130, wave: 'sawtooth',
      envelope: { a: 0.005, d: 0.7, s: 0, r: 0.2 } } },
  { id: 'sfx.levelup', kind: 'sfx', polyphony: 1,
    recipe: { type: 'arpeggio', durationMs: 500, gain: 0.16,
      pattern: ['E4', 'G4', 'B4', 'E5'], bpm: 220, wave: 'square',
      envelope: { a: 0.002, d: 0.35, s: 0, r: 0.15 } } },
  { id: 'sfx.champ', kind: 'sfx', polyphony: 1,
    recipe: { type: 'arpeggio', durationMs: 1400, gain: 0.22,
      pattern: ['C4', 'E4', 'G4', 'C5', 'D5', 'E5', 'G5', 'C6'], bpm: 150, wave: 'square',
      envelope: { a: 0.004, d: 1.0, s: 0, r: 0.4 } } },
  { id: 'sfx.ui', kind: 'ui', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 45, freq: 700, gain: 0.06,
      envelope: { a: 0.001, d: 0.03, s: 0, r: 0.01 } } },
]);
bus.register([{ id: 'music.hub', kind: 'music', recipe: { bpm: 96, stepsPerBeat: 2, tracks: [
  { wave: 'triangle', gain: 0.12, legato: true, pattern: [
    'A2', 0, 'E3', 0, 'A2', 0, 'G2', 0, 'A2', 0, 'E3', 0, 'D3', 0, 'C3', 0] },
  { wave: 'square', gain: 0.028, pattern: [
    'A4', 0, 0, 0, 'E5', 0, 0, 0, 'D5', 0, 'C5', 0, 'B4', 0, 0, 0] },
] } }]);
bus.register([{ id: 'music.fight', kind: 'music', recipe: { bpm: 128, stepsPerBeat: 4, tracks: [
  { wave: 'triangle', gain: 0.13, legato: true, pattern: [
    'A2', 'A2', 0, 'A2', 'C3', 0, 'A2', 0, 'A2', 'A2', 0, 'G2', 'A2', 0, 'E2', 0] },
  { wave: 'square', gain: 0.03, pattern: [
    'A4', 0, 0, 'C5', 0, 0, 'E5', 0, 0, 0, 'D5', 0, 'C5', 0, 'B4', 0] },
] } }]);
bus.muted = prefs.mute;

/* ---------- state ---------- */
const st = E.create((Date.now() % 2147483647) | 0);
let screen = 'title';                    // title | create | hub | fight | shop | over | champion
let shopTab = 'smithy';                  // smithy | armory | alchemist | arcanum
let subMenu = null;                      // 'potion' | 'cast' | null
let typing = false;
let slot = 0;
let createSt = null;
let shopMsg = '';
let anims = [], floats = [], shake = 0;
let prevLevel = 0;

const STAT_LABEL = {
  str: 'STR — damage', agi: 'AGI — dodge & hit', atk: 'ATK — accuracy', def: 'DEF — soak',
  vit: 'VIT — health', cha: 'CHA — haggle & rage', sta: 'STA — stamina', mag: 'MAG — mana & spells',
};

/* ---------- engine event → anim/sfx ---------- */
function drainEvents() {
  for (const ev of st.events) {
    const p = { hit: ['hit', 'e'], crit: ['hit', 'e'], eHit: ['hit', 'p'], eCrit: ['hit', 'p'],
      rageHit: ['hit', 'e'] }[ev];
    if (ev === 'hit' || ev === 'crit' || ev === 'rageHit') { anims.push({ kind: 'lunge', who: 'p', t: 0, dur: 26 }); anims.push({ kind: 'hit', who: 'e', t: 0, dur: 16 }); }
    if (ev === 'eHit' || ev === 'eCrit') { anims.push({ kind: 'lunge', who: 'e', t: 0, dur: 26 }); anims.push({ kind: 'hit', who: 'p', t: 0, dur: 16 }); }
    if (ev === 'hit' || ev === 'eHit') bus.play('sfx.hit');
    if (ev === 'crit' || ev === 'eCrit') { bus.play('sfx.crit'); shake = 7; }
    if (ev === 'rageHit') { bus.play('sfx.rage'); shake = 10; }
    if (ev === 'miss' || ev === 'eMiss') bus.play('sfx.miss');
    if (ev === 'potion' || ev === 'ePotion') bus.play('sfx.potion');
    if (ev === 'cast' || ev === 'eCast') bus.play('sfx.cast');
    if (ev === 'taunt') bus.play('sfx.taunt');
    if (ev === 'buy') { bus.play('sfx.buy'); shopMsg = 'Purchased and equipped.'; }
    if (ev === 'victory') { bus.play('sfx.victory'); }
    if (ev === 'defeat') bus.play('sfx.defeat');
    if (ev === 'emperorDown' || ev === 'champion') bus.play('sfx.champ');
    if (ev === 'fightStart') { subMenu = null; floats = []; }
  }
  st.events.length = 0;
  if (st.glad && st.glad.level > prevLevel) { prevLevel = st.glad.level; bus.play('sfx.levelup'); }
  if (st.glad && prevLevel === 0) prevLevel = st.glad.level;
}

/* ---------- actions ---------- */
function doAct(act, arg) {
  if (E.playerAct(st, act, arg)) { subMenu = null; drainEvents(); }
  else bus.play('sfx.deny');
}
function toFight() { if (E.startFight(st)) { screen = 'fight'; bus.music('music.fight'); drainEvents(); } }
function fightDone() { return st.fight && st.fight.done; }
function leaveFight() {
  if (E.leaveFight(st)) {
    saveSlot(slot);
    screen = st.scene === 'champion' ? 'champion' : 'hub';
    bus.music('music.hub');
    drainEvents();
  }
}

/* ---------- input ---------- */
function stagePos(e) { return CORE.toStage(cv, W, H, e); }
cv.addEventListener('pointerdown', e => {
  const p = stagePos(e);
  bus.unlock();
  if (hits.tap(p)) { bus.play('sfx.ui'); drainEvents(); }
});
addEventListener('keydown', e => {
  bus.unlock();
  if (typing) {
    if (e.key === 'Enter' || e.key === 'Escape') typing = false;
    else if (e.key === 'Backspace') createSt.name = createSt.name.slice(0, -1);
    else if (/^[a-zA-Z \-']$/.test(e.key) && createSt.name.length < 14) createSt.name += e.key.toUpperCase();
    e.preventDefault(); return;
  }
  if (e.code === 'KeyM') { prefs.mute = !prefs.mute; bus.muted = prefs.mute; CORE.save('sas', 'prefs', prefs); }
  if (screen === 'fight' && st.fight && st.fight.phase === 'player' && !st.fight.done) {
    const k = { Digit1: 'attack', Digit2: 'heavy', Digit3: 'rage', Digit6: 'taunt', Digit7: 'bow', Digit8: 'hold',
      KeyA: 'attack', KeyH: 'heavy', KeyR: 'rage', KeyT: 'taunt', KeyB: 'bow', Enter: 'attack' }[e.code];
    if (k) { doAct(k); e.preventDefault(); }
    if (e.code === 'Digit4' || e.code === 'KeyP') subMenu = subMenu === 'potion' ? null : 'potion';
    if (e.code === 'Digit5' || e.code === 'KeyC') subMenu = subMenu === 'cast' ? null : 'cast';
    if (e.code === 'Escape') subMenu = null;
  } else if ((screen === 'over' || screen === 'champion') && (e.code === 'Enter' || e.code === 'Space')) {
    leaveFight();
  } else if (e.code === 'Escape' && screen === 'shop') { screen = 'hub'; }
  else if (e.code === 'Enter' && screen === 'title') { /* chips only */ }
  e.preventDefault();
});

/* ---------- art kit (ported from prototype) ---------- */
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function text(t, x, y, size, col, align) {
  ctx.fillStyle = col || '#ffe9b8'; ctx.font = (size >= 20 ? 'bold ' : '') + size + 'px Georgia';
  ctx.textAlign = align || 'center'; ctx.fillText(t, x, y);
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.min(255, Math.round(((n >> 16) & 255) * f))},${Math.min(255, Math.round(((n >> 8) & 255) * f))},${Math.min(255, Math.round((n & 255) * f))})`;
}
function btn(id, x, y, w, h, label, sub, dis) {
  hits.add(id, x, y, w, h, dis ? () => bus.play('sfx.deny') : () => onBtn(id));
  const g = ctx.createLinearGradient(x, y, x, y + h);
  if (dis) { g.addColorStop(0, '#5a5348'); g.addColorStop(.5, '#4a4238'); g.addColorStop(1, '#38322a'); }
  else { g.addColorStop(0, '#b3813f'); g.addColorStop(.45, '#8a5a28'); g.addColorStop(.55, '#6e4520'); g.addColorStop(1, '#54340f'); }
  ctx.fillStyle = g; rrect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = dis ? '#6a6258' : '#e8c37a'; ctx.lineWidth = 2; rrect(x, y, w, h, 8); ctx.stroke();
  ctx.font = 'bold 17px Georgia'; ctx.textAlign = 'center';
  ctx.fillStyle = dis ? 'rgba(0,0,0,.4)' : 'rgba(40,18,0,.7)';
  ctx.fillText(label, x + w / 2, y + (sub ? h / 2 - 2 : h / 2 + 6) + 1);
  ctx.fillStyle = dis ? '#8a8074' : '#ffe9b8';
  ctx.fillText(label, x + w / 2, y + (sub ? h / 2 - 2 : h / 2 + 6));
  if (sub) { ctx.font = '11px Georgia'; ctx.fillStyle = dis ? '#6a6258' : '#d8b988'; ctx.fillText(sub, x + w / 2, y + h / 2 + 15); }
}
function bar(x, y, w, h, frac, col, label) {
  ctx.fillStyle = '#241708'; rrect(x - 3, y - 3, w + 6, h + 6, 4); ctx.fill();
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5; rrect(x - 3, y - 3, w + 6, h + 6, 4); ctx.stroke();
  ctx.fillStyle = '#180f06'; ctx.fillRect(x, y, w, h);
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    const fg = ctx.createLinearGradient(x, y, x, y + h);
    fg.addColorStop(0, shade(col, 1.4)); fg.addColorStop(.5, col); fg.addColorStop(1, shade(col, .55));
    ctx.fillStyle = fg; ctx.fillRect(x, y, w * f, h);
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x, y, w * f, Math.max(2, h * .38));
  }
  if (label) text(label, x + w / 2, y + h - 3, 10, '#fff');
}
function plaque(x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#c8a068'); g.addColorStop(.5, '#a87f4c'); g.addColorStop(1, '#8a6238');
  ctx.fillStyle = g; rrect(x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 2; rrect(x, y, w, h, 6); ctx.stroke();
}
function parchment(x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#e8d0a0'); g.addColorStop(.5, '#dfc088'); g.addColorStop(1, '#cfa96a');
  ctx.fillStyle = g; rrect(x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 3; rrect(x, y, w, h, 10); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,58,24,.35)'; ctx.lineWidth = 1; rrect(x + 6, y + 6, w - 12, h - 12, 7); ctx.stroke();
}
function laurel(x, y, s, col) {
  ctx.strokeStyle = col || '#3a6a2a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, s, Math.PI * .55, Math.PI * 1.45); ctx.stroke();
  ctx.fillStyle = col || '#3a6a2a';
  for (let i = 0; i < 5; i++) {
    const an = Math.PI * .6 + i * Math.PI * .2;
    ctx.save(); ctx.translate(x + Math.cos(an) * s, y + Math.sin(an) * s); ctx.rotate(an + Math.PI / 2);
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, 7); ctx.fill(); ctx.restore();
  }
}
function pedestal(x, y, w) {
  const g = ctx.createLinearGradient(x, y - 14, x, y + 16);
  g.addColorStop(0, '#c8a068'); g.addColorStop(1, '#7a5836');
  ctx.fillStyle = g; rrect(x - w / 2, y - 12, w, 24, 4); ctx.fill();
  ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 2; rrect(x - w / 2, y - 12, w, 24, 4); ctx.stroke();
}
function htext(t, y) {
  ctx.font = 'bold 34px Georgia'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(50,25,5,.8)'; ctx.fillText(t, W / 2, y + 2);
  ctx.fillStyle = '#ffd23a'; ctx.fillText(t, W / 2, y);
}
function coin(x, y) {
  ctx.fillStyle = '#d8a83a'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 1.5; ctx.stroke();
}

/* ---------- arena painter (ported) ---------- */
const ART = { ready: false, crowd: [], motes: [], confetti: [] };
let arenaCv = null;
function buildArena() {
  arenaCv = document.createElement('canvas'); arenaCv.width = W; arenaCv.height = H;
  const a = arenaCv.getContext('2d');
  let g = a.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, '#f4d98f'); g.addColorStop(.55, '#e8b96a'); g.addColorStop(1, '#d99a52');
  a.fillStyle = g; a.fillRect(0, 0, W, 300);
  g = a.createRadialGradient(700, 60, 10, 700, 60, 260);
  g.addColorStop(0, 'rgba(255,246,214,.95)'); g.addColorStop(1, 'rgba(255,246,214,0)');
  a.fillStyle = g; a.fillRect(0, 0, W, 300);
  const tiers = [{ y: 64, h: 88, c1: '#c8a068', c2: '#a87f4c' }, { y: 152, h: 88, c1: '#b89058', c2: '#96703f' }, { y: 240, h: 88, c1: '#a87f4c', c2: '#84603a' }];
  const bannerCols = ['#8a2a22', '#3a5a8a', '#7a5a20', '#5a3a6a'];
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  tiers.forEach((t, ti) => {
    g = a.createLinearGradient(0, t.y, 0, t.y + t.h);
    g.addColorStop(0, t.c1); g.addColorStop(1, t.c2);
    a.fillStyle = g; a.fillRect(0, t.y, W, t.h);
    a.fillStyle = 'rgba(255,240,200,.35)'; a.fillRect(0, t.y, W, 4);
    a.fillStyle = 'rgba(60,35,15,.4)'; a.fillRect(0, t.y + t.h - 6, W, 6);
    for (let x = 10; x < W - 30; x += 56) {
      a.fillStyle = 'rgba(52,32,16,.85)';
      a.beginPath(); a.moveTo(x, t.y + t.h - 8); a.lineTo(x, t.y + 34); a.arc(x + 20, t.y + 34, 20, Math.PI, 0); a.lineTo(x + 40, t.y + t.h - 8); a.closePath(); a.fill();
      for (let k = 0; k < 9; k++) ART.crowd.push({ x: x + 6 + rnd() * 28, y: t.y + 30 + rnd() * (t.h - 44), ph: rnd() * 6.28, c: rnd() < .5 ? '#e8c890' : '#5a3a20' });
    }
    for (let x = 56 + ti * 28; x < W - 40; x += 224) {
      a.fillStyle = bannerCols[(x / 56 + ti) % 4 | 0];
      a.beginPath(); a.moveTo(x, t.y + t.h - 6); a.lineTo(x + 26, t.y + t.h - 6); a.lineTo(x + 26, t.y + t.h + 26); a.lineTo(x + 13, t.y + t.h + 16); a.lineTo(x, t.y + t.h + 26); a.closePath(); a.fill();
    }
  });
  g = a.createLinearGradient(0, 328, 0, 382);
  g.addColorStop(0, '#9a7448'); g.addColorStop(1, '#7a5836');
  a.fillStyle = g; a.fillRect(0, 328, W, 54);
  a.fillStyle = '#c8a068'; a.fillRect(0, 328, W, 6);
  a.strokeStyle = 'rgba(60,35,15,.35)'; a.lineWidth = 2;
  for (let x = 40; x < W; x += 80) { a.beginPath(); a.moveTo(x, 334); a.lineTo(x, 382); a.stroke(); }
  g = a.createRadialGradient(480, 470, 60, 480, 470, 560);
  g.addColorStop(0, '#e8c078'); g.addColorStop(.6, '#d8a860'); g.addColorStop(1, '#b8863f');
  a.fillStyle = g; a.fillRect(0, 382, W, H - 382);
  a.strokeStyle = 'rgba(120,80,35,.22)'; a.lineWidth = 2;
  for (let r = 60; r < 620; r += 42) { a.beginPath(); a.arc(480, 560, r, Math.PI * 1.15, Math.PI * 1.85); a.stroke(); }
  [[300, 500, 46], [640, 540, 60], [480, 430, 30]].forEach(s => {
    g = a.createRadialGradient(s[0], s[1], 4, s[0], s[1], s[2]);
    g.addColorStop(0, 'rgba(110,60,25,.20)'); g.addColorStop(1, 'rgba(110,60,25,0)');
    a.fillStyle = g; a.fillRect(s[0] - s[2], s[1] - s[2], s[2] * 2, s[2] * 2);
  });
  a.save(); a.translate(370, 520); a.rotate(.5);
  a.fillStyle = '#7a7f88'; a.fillRect(-2, -26, 4, 22);
  a.fillStyle = '#5a5f68'; a.beginPath(); a.moveTo(-2, -26); a.lineTo(2, -26); a.lineTo(0, -33); a.closePath(); a.fill();
  a.fillStyle = '#6a4a20'; a.fillRect(-7, -6, 14, 4); a.fillRect(-2, -2, 4, 10); a.restore();
  a.save(); a.translate(600, 505); a.rotate(-.35);
  a.fillStyle = '#8a5a28'; a.beginPath(); a.arc(0, 0, 17, 0, 7); a.fill();
  a.strokeStyle = '#5a3a18'; a.lineWidth = 3; a.beginPath(); a.arc(0, 0, 17, 0, 7); a.stroke();
  a.fillStyle = '#c9a86a'; a.beginPath(); a.arc(0, 0, 5, 0, 7); a.fill(); a.restore();
  [56, 904].forEach(bx => {
    a.fillStyle = '#3a2a18'; a.fillRect(bx - 4, 340, 8, 42);
    a.fillStyle = '#54340f'; a.beginPath(); a.moveTo(bx - 16, 340); a.lineTo(bx + 16, 340); a.lineTo(bx + 9, 322); a.lineTo(bx - 9, 322); a.closePath(); a.fill();
    a.strokeStyle = '#c9a86a'; a.lineWidth = 2; a.beginPath(); a.moveTo(bx - 15, 338); a.lineTo(bx + 15, 338); a.stroke();
  });
  for (let i = 0; i < 26; i++) ART.motes.push({ x: rnd() * W, y: 400 + rnd() * 180, r: .8 + rnd() * 1.6, ph: rnd() * 6.28, sp: .12 + rnd() * .3 });
  for (let i = 0; i < 70; i++) ART.confetti.push({ x: rnd() * W, y: rnd() * H * .7, ph: rnd() * 6.28, c: ['#ffd23a', '#e8c37a', '#fff2c8', '#c9a86a'][i % 4] });
  ART.ready = true;
}
function arenaOverlay(t) {
  for (const p of ART.crowd) {
    ctx.globalAlpha = .55 + .35 * Math.sin(t / 700 + p.ph);
    ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
  const fr = Math.floor(t / 140) % 2;
  [56, 904].forEach(bx => {
    const g = ctx.createRadialGradient(bx, 318, 4, bx, 318, 60);
    g.addColorStop(0, 'rgba(255,190,80,.4)'); g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g; ctx.fillRect(bx - 60, 258, 120, 120);
    ctx.fillStyle = '#ff9a2a';
    ctx.beginPath(); ctx.moveTo(bx - 8, 322);
    ctx.quadraticCurveTo(bx - 10, 306, bx + (fr ? 3 : -3), 296);
    ctx.quadraticCurveTo(bx + 10, 306, bx + 8, 322); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.moveTo(bx - 4, 322);
    ctx.quadraticCurveTo(bx - 5, 312, bx + (fr ? -2 : 2), 305);
    ctx.quadraticCurveTo(bx + 5, 312, bx + 4, 322); ctx.closePath(); ctx.fill();
  });
  for (const m of ART.motes) {
    const my = m.y - ((t * m.sp / 40) % 190);
    ctx.globalAlpha = .12 + .12 * Math.sin(t / 900 + m.ph);
    ctx.fillStyle = '#ffe9b8'; ctx.beginPath(); ctx.arc(m.x, my < 395 ? my + 190 : my, m.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ---------- gladiator figure (ported, parameterized) ---------- */
const WKIND = ['sword', 'sword', 'axe', 'axe', 'dagger', 'club', 'sword', 'sword'];  // WEAPONS idx → icon
function drawWeapon(wk, gold) {
  const steel = gold ? '#e8c37a' : '#b8bec8', dark = gold ? '#a87f2c' : '#7a7f88';
  if (wk === 'club') {
    ctx.strokeStyle = '#6a4a20'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, -24); ctx.stroke();
    ctx.fillStyle = '#7a5a30'; ctx.beginPath(); ctx.arc(16, -32, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#54340f'; ctx.beginPath(); ctx.arc(14, -34, 3, 0, 7); ctx.fill();
  } else if (wk === 'dagger') {
    ctx.strokeStyle = steel; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -20); ctx.stroke();
    ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(3, -3); ctx.stroke();
  } else if (wk === 'axe') {
    ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(17, -38); ctx.stroke();
    ctx.fillStyle = steel;
    ctx.beginPath(); ctx.moveTo(17, -38); ctx.quadraticCurveTo(38, -42, 34, -22); ctx.quadraticCurveTo(24, -26, 13, -24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(17, -38, 3, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = steel; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(17, -32); ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(19, -36); ctx.stroke();
    ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(4, -4); ctx.stroke();
    ctx.fillStyle = '#c9a86a'; ctx.beginPath(); ctx.arc(-1, 3, 3, 0, 7); ctx.fill();
  }
}
function drawGlad(x, y, look, flip, hurt, lunge, gear) {
  const skin = E.SKINS[look.skin % E.SKINS.length];
  const hair = E.HAIRS[look.hair % E.HAIRS.length];
  const wk = gear.w || 'sword', armorTier = gear.armor || 0, gold = !!gear.gold;
  const bob = Math.sin(performance.now() / 450 + x) * 1.2;
  ctx.fillStyle = 'rgba(60,30,10,.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 3, 30, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x + (lunge ? (flip ? -30 : 30) : 0), y); if (flip) ctx.scale(-1, 1);
  if (hurt) ctx.globalAlpha = .5 + Math.sin(performance.now() / 40) * .3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = skin; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-8, -62 + bob); ctx.lineTo(-15, -42 + bob); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(-9, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -30); ctx.lineTo(10, -2); ctx.stroke();
  ctx.fillStyle = '#4a3a20';
  ctx.beginPath(); ctx.ellipse(-10, -2, 7, 4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, -2, 7, 4, 0, 0, 7); ctx.fill();
  if (armorTier === 0) {
    ctx.fillStyle = '#b8a888'; rrect(-14, -70 + bob, 28, 42, 6); ctx.fill();
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -56 + bob); ctx.lineTo(14, -60 + bob); ctx.moveTo(-12, -44 + bob); ctx.lineTo(10, -40 + bob); ctx.stroke();
  } else if (armorTier === 1) {
    ctx.fillStyle = '#7a5a30'; rrect(-14, -70 + bob, 28, 42, 6); ctx.fill();
    ctx.strokeStyle = '#54340f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -58 + bob); ctx.lineTo(14, -58 + bob); ctx.moveTo(-14, -46 + bob); ctx.lineTo(14, -46 + bob); ctx.stroke();
  } else {
    const plate = armorTier >= 3 ? '#d8b36a' : '#9aa0a8', trim = armorTier >= 3 ? '#8a5a10' : '#6a7078';
    ctx.fillStyle = '#8a2a22'; rrect(-13, -70 + bob, 26, 42, 6); ctx.fill();
    ctx.fillStyle = plate; rrect(-15, -71 + bob, 30, 34, 7); ctx.fill();
    ctx.strokeStyle = trim; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-15, -62 + bob + i * 9); ctx.lineTo(15, -62 + bob + i * 9); ctx.stroke(); }
    if (armorTier >= 3) { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(0, -56 + bob, 4, 0, 7); ctx.fill(); }
  }
  ctx.fillStyle = '#3a2a14'; ctx.fillRect(-15, -32 + bob, 30, 7);
  ctx.fillStyle = '#c9a86a'; ctx.fillRect(-3, -32 + bob, 6, 7);
  ctx.strokeStyle = skin; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(8, -62 + bob); ctx.lineTo(17, -46 + bob); ctx.stroke();
  ctx.save(); ctx.translate(18, -46 + bob); drawWeapon(wk, gold); ctx.restore();
  // head
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -84 + bob, 13, 0, 7); ctx.fill();
  if (hair !== 'none') { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0, -88 + bob, 13, Math.PI, 0); ctx.fill(); }
  if (look.beard) { ctx.fillStyle = hair === 'none' ? '#5a3a1a' : hair; ctx.fillRect(-7, -78 + bob, 14, 8); }
  ctx.fillStyle = '#2a1a0e'; ctx.fillRect(4, -87 + bob, 3, 3);
  // helm when armored
  if (armorTier >= 2) {
    const helm = armorTier >= 3 ? '#d8b36a' : '#9aa0a8';
    ctx.fillStyle = helm; ctx.beginPath(); ctx.arc(0, -86 + bob, 14, Math.PI, 0); ctx.fill();
    ctx.fillRect(-14, -87 + bob, 28, 5);
    ctx.fillRect(-14, -84 + bob, 5, 10); ctx.fillRect(9, -84 + bob, 5, 10);
    ctx.fillRect(-2, -84 + bob, 4, 9);
    ctx.fillStyle = '#8a2a22'; ctx.fillRect(-3, -108 + bob, 6, 14);
  }
  ctx.restore();
}
const armorTierOf = g => Math.min(3, Math.floor((g.armor.helm + g.armor.chest + g.armor.shield + g.armor.legs) / 3));
const oppArmorTier = o => Math.min(3, Math.floor((o.armor.helm + o.armor.chest + o.armor.shield + o.armor.legs) / 4));
const oppLook = i => ({ skin: i % E.SKINS.length, hair: (i * 2) % E.HAIRS.length, beard: i % 3 === 0 });

/* ---------- screens ---------- */
function drawTitle() {
  ctx.strokeStyle = '#a87f4c'; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(120, 560); ctx.lineTo(120, 240); ctx.arc(W / 2, 240, W / 2 - 120, Math.PI, 0); ctx.lineTo(840, 560); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,235,190,.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(128, 560); ctx.lineTo(128, 244); ctx.arc(W / 2, 244, W / 2 - 128, Math.PI, 0); ctx.lineTo(832, 560); ctx.stroke();
  plaque(W / 2 - 300, 70, 600, 102);
  laurel(W / 2 - 236, 122, 26); laurel(W / 2 + 236, 122, 26);
  ctx.font = 'bold 50px Georgia'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(60,30,8,.85)'; ctx.fillText('DUST & STEEL', W / 2, 140);
  ctx.fillStyle = '#ffd23a'; ctx.fillText('DUST & STEEL', W / 2, 137);
  text('ARENA OF CHAMPIONS', W / 2, 182, 18, '#e8c37a');
  drawGlad(200, 330, { skin: 0, hair: 0, beard: 1 }, false, false, false, { w: 'sword', armor: 2 });
  drawGlad(760, 330, { skin: 2, hair: 1, beard: 0 }, true, false, false, { w: 'axe', armor: 1 });
  pedestal(200, 342, 110); pedestal(760, 342, 110);
  // three save slots
  text('CHOOSE YOUR FATE', W / 2, 240, 16, '#8a6238');
  for (let i = 0; i < 3; i++) {
    const g = slotMeta(i);
    const x = W / 2 - 350 + i * 240;
    parchment(x, 268, 220, 150);
    if (g) {
      text(g.name, x + 110, 300, 17, '#4a2a10');
      text(`level ${g.level} · bout ${Math.min(g.nextOpp + 1, E.ROSTER.length)}/${E.ROSTER.length}`, x + 110, 324, 12, '#6a4a20');
      text(`${g.gold}g · ${g.wins}W/${g.losses}L`, x + 110, 342, 12, '#8a6238');
      if (g.champion) text('CHAMPION', x + 110, 360, 12, '#8a1a12');
      btn(`slot${i}:load`, x + 30, 376, 76, 36, 'LOAD');
      btn(`slot${i}:new`, x + 114, 376, 76, 36, 'NEW', 'overwrites');
    } else {
      text('— EMPTY —', x + 110, 310, 14, '#8a6238');
      btn(`slot${i}:new`, x + 55, 356, 110, 42, 'BEGIN');
    }
  }
  text(prefs.mute ? 'M — unmute' : 'M — mute', W / 2, 460, 12, '#7a5a30');
  text('turn-based duels · gear treadmill · thirteen souls between you and the throne', W / 2, 500, 13, '#8a6238');
}

function drawCreate() {
  const c = createSt;
  htext('CREATE YOUR GLADIATOR', 52);
  parchment(24, 78, 480, 460);
  text('name:', 240, 120, 16, '#6a4a20', 'right');
  btn('name', 260, 92, 220, 44, '');
  const sg = ctx.createLinearGradient(268, 98, 268, 128);
  sg.addColorStop(0, '#f0dca8'); sg.addColorStop(1, '#d8bc80');
  ctx.fillStyle = sg; rrect(268, 98, 204, 30, 5); ctx.fill();
  ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 1.5; rrect(268, 98, 204, 30, 5); ctx.stroke();
  ctx.fillStyle = '#4a2a10'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center';
  ctx.fillText(c.name + (typing ? '_' : ''), 370, 119);
  text(typing ? 'type · ENTER done' : 'click to inscribe', 370, 152, 11, '#8a6238');
  // look pickers
  text('skin', 120, 190, 13, '#6a4a20');
  E.SKINS.forEach((s, i) => {
    ctx.fillStyle = s; ctx.fillRect(160 + i * 34, 176, 26, 26);
    ctx.strokeStyle = c.look.skin === i ? '#8a1a12' : '#8a6238'; ctx.lineWidth = c.look.skin === i ? 3 : 1;
    ctx.strokeRect(160 + i * 34, 176, 26, 26);
    hits.add('skin' + i, 160 + i * 34, 176, 26, 26, () => { c.look.skin = i; });
  });
  text('hair', 120, 236, 13, '#6a4a20');
  E.HAIRS.forEach((h, i) => {
    ctx.fillStyle = h === 'none' ? '#c8b090' : h; ctx.fillRect(160 + i * 34, 222, 26, 26);
    ctx.strokeStyle = c.look.hair === i ? '#8a1a12' : '#8a6238'; ctx.lineWidth = c.look.hair === i ? 3 : 1;
    ctx.strokeRect(160 + i * 34, 222, 26, 26);
    if (h === 'none') text('✕', 173 + i * 34, 241, 14, '#8a6238');
    hits.add('hair' + i, 160 + i * 34, 222, 26, 26, () => { c.look.hair = i; });
  });
  text('beard', 120, 282, 13, '#6a4a20');
  ['NONE', 'SHORT', 'FULL'].forEach((b, i) => {
    const sel = c.look.beard === i;
    hits.add('beard' + i, 160 + i * 76, 268, 68, 30, () => { c.look.beard = i; });
    ctx.fillStyle = sel ? '#8a2a22' : '#c8b090'; rrect(160 + i * 76, 268, 68, 30, 5); ctx.fill();
    ctx.strokeStyle = '#8a6238'; rrect(160 + i * 76, 268, 68, 30, 5); ctx.stroke();
    text(b, 194 + i * 76, 288, 11, sel ? '#ffe9b8' : '#6a4a20');
  });
  // stat spread
  text(`skill points: ${c.pts}`, 250, 330, 18, '#8a2a22', 'right');
  E.STATS.forEach((k, i) => {
    const col = i % 2, row = (i / 2) | 0;
    const x = 60 + col * 210, y = 348 + row * 46;
    text(k.toUpperCase(), x + 62, y + 22, 13, '#4a2a10', 'right');
    text('' + c.stats[k], x + 84, y + 23, 18, '#8a2a22');
    btn(`st-${k}`, x + 100, y, 40, 34, '−', '', c.stats[k] <= E.BASE_STAT);
    btn(`st+${k}`, x + 146, y, 40, 34, '+', '', c.pts <= 0 || c.stats[k] >= E.CREATE_CAP);
  });
  const g = { stats: c.stats, level: 1 };
  text(`HP ${E.maxHp(g)} · stam ${E.maxSta(g)} · mana ${E.maxMana(g)} · dmg +${c.stats.str * 2}`, 264, 528, 13, '#6a4a20', 'right');
  // figure preview
  pedestal(740, 380, 130);
  drawGlad(740, 368, c.look, false, false, false, { w: 'sword', armor: 0 });
  parchment(560, 96, 360, 200);
  text('THE EIGHT VINTAGES', 740, 128, 15, '#8a2a22');
  text('Every champion was poured from', 740, 156, 13, '#6a4a20');
  text('a different cup. Spend wisely —', 740, 174, 13, '#6a4a20');
  text('STR hits · AGI dodges · VIT endures', 740, 206, 12, '#8a6238');
  text('MAG fuels the Arcanum’s fires', 740, 224, 12, '#8a6238');
  text('DEF soaks · CHA haggles & rages', 740, 242, 12, '#8a6238');
  btn('begin', W / 2 - 140, 548, 280, 44, 'ENTER THE ARENA', '', c.name.length === 0);
}

function drawHub() {
  const g = st.glad;
  htext('THE ARENA GROUNDS', 60);
  pedestal(200, 352, 150);
  drawGlad(200, 340, g.look, false, false, false, { w: WKIND[g.weapon], armor: armorTierOf(g), gold: g.weapon >= 6 });
  plaque(112, 352, 176, 86);
  text(g.name, 200, 376, 18, '#ffd23a');
  text(`Lv ${g.level} · ${g.gold}g`, 200, 396, 13, '#ffe9b8');
  text(`${E.WEAPONS[g.weapon].name}`, 200, 414, 11, '#c9a86a');
  text(`${g.wins}W / ${g.losses}L`, 200, 430, 11, '#c9a86a');
  // xp bar
  bar(96, 452, 208, 12, g.xp / E.XP_NEXT(g.level), '#c9a020', `${g.xp}/${E.XP_NEXT(g.level)} xp`);
  // stat training (level-up points)
  if (g.statPts > 0) {
    parchment(52, 480, 300, 96);
    text(`${g.statPts} stat points to spend`, 202, 504, 15, '#8a1a12');
    E.STATS.forEach((k, i) => {
      const x = 66 + (i % 4) * 72, y = 516 + ((i / 4) | 0) * 34;
      text(`${k.toUpperCase()} ${g.stats[k]}`, x + 26, y + 20, 11, '#4a2a10');
      btn(`train:${k}`, x + 52, y + 2, 26, 26, '+', '', false);
    });
  }
  // next opponent poster
  if (g.nextOpp >= E.ROSTER.length) {
    parchment(452, 96, 336, 200);
    text('ALL SANDS CONQUERED', 620, 140, 18, '#8a1a12');
    text('The throne is yours.', 620, 170, 14, '#6a4a20');
  } else {
    const o = E.ROSTER[g.nextOpp];
    parchment(452, 96, 336, 330);
    ctx.fillStyle = 'rgba(138,42,34,.16)'; rrect(462, 106, 316, 40, 6); ctx.fill();
    text('NEXT OPPONENT', 620, 132, 15, '#8a2a22');
    text(o.name, 620, 168, 22, o.champion ? '#8a1a12' : '#4a2a10');
    text(`“${o.title}”`, 620, 190, 13, '#8a6238');
    text(`level ${o.lvl} · hp ${40 + o.stats.vit * 6 + (o.lvl - 1) * 5}`, 620, 214, 13, '#6a4a20');
    text(`purse ${o.gold}g · ${o.xp} xp`, 620, 234, 13, '#8a6238');
    ctx.strokeStyle = 'rgba(90,58,24,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(470, 250); ctx.lineTo(770, 250); ctx.stroke();
    pedestal(620, 380, 110);
    drawGlad(620, 368, oppLook(g.nextOpp), true, false, false,
      { w: WKIND[o.weapon], armor: oppArmorTier(o), gold: !!o.champion });
    btn('fight', 470, 442, 210, 56, 'TO BATTLE!', `${o.name} awaits`);
  }
  // four shop doors — bottom row
  const shops = [
    ['smithy', 'THE SMITHY', 'weapons & bows'],
    ['armory', 'THE ARMORY', 'helm · chest · shield · legs'],
    ['alchemist', 'ALCHEMIST', 'potions & tonics'],
    ['arcanum', 'THE ARCANUM', 'spells of the pit'],
  ];
  shops.forEach(([id, name, sub], i) => {
    const x = 60 + i * 215;
    btn('shop:' + id, x, 520, 200, 56, name, sub);
  });
  btn('quit', W / 2 - 80, 452, 160, 40, 'SAVE & QUIT');
  text(`victories: ${g.nextOpp}/${E.ROSTER.length}`, 620, 506, 13, '#7a5a30');
}

function drawFight() {
  const f = st.fight, g = st.glad, o = f.opp;
  const lp = anims.find(a => a.who === 'p' && a.kind === 'lunge'), le = anims.find(a => a.who === 'e' && a.kind === 'lunge');
  const hp = anims.find(a => a.who === 'p' && a.kind === 'hit'), he = anims.find(a => a.who === 'e' && a.kind === 'hit');
  drawGlad(260, 340, g.look, false, !!hp, !!lp, { w: WKIND[g.weapon], armor: armorTierOf(g), gold: g.weapon >= 6 });
  drawGlad(700, 340, oppLook(E.ROSTER.indexOf(o)), true, !!he, !!le, { w: WKIND[o.weapon], armor: oppArmorTier(o), gold: !!o.champion });
  plaque(150, 96, 220, 30); plaque(590, 96, 220, 30);
  text(g.name, 260, 117, 16, '#ffd23a'); text(o.name, 700, 117, 16, '#ff9a8a');
  const oMax = 40 + o.stats.vit * 6 + (o.lvl - 1) * 5;
  bar(140, 135, 240, 16, f.php / E.maxHp(g), '#d84a3a', `${Math.max(0, f.php)}/${E.maxHp(g)}`);
  bar(580, 135, 240, 16, f.ehp / oMax, '#d84a3a', `${Math.max(0, f.ehp)}/${oMax}`);
  bar(140, 158, 240, 10, f.pstam / E.maxSta(g), '#3a8ad8', `stam ${Math.floor(f.pstam)}`);
  bar(140, 176, 240, 10, f.pmana / E.maxMana(g), '#9a5ad8', `mana ${Math.floor(f.pmana)}`);
  bar(140, 194, 240, 10, f.prage / 100, '#d88a2a', `rage ${Math.floor(f.prage)}`);
  if (f.pAmmo > 0 || g.bow >= 0) text(`bow ammo: ${f.pAmmo}`, 260, 222, 11, '#c9a86a');
  // log tablet
  const lg = ctx.createLinearGradient(140, 395, 140, 488);
  lg.addColorStop(0, '#6a5638'); lg.addColorStop(1, '#4a3a24');
  ctx.fillStyle = lg; rrect(140, 395, 680, 93, 8); ctx.fill();
  ctx.strokeStyle = '#2a1c0e'; ctx.lineWidth = 3; rrect(140, 395, 680, 93, 8); ctx.stroke();
  f.log.slice(-4).forEach((l, i) => text(l, 480, 415 + i * 19, 13, i === f.log.slice(-4).length - 1 ? '#ffe9b8' : '#b8a078'));

  if (f.done) {
    // result overlay
    ctx.fillStyle = 'rgba(30,20,10,.72)'; ctx.fillRect(0, 372, W, 128);
    if (f.won) {
      text('VICTORY!', 480, 424, 30, '#ffd23a');
      text(`+${o.gold} gold · +${o.xp} xp${st.glad.statPts > 0 ? ' · LEVEL UP!' : ''}`, 480, 452, 16, '#7dff8a');
    } else {
      text('DEFEAT', 480, 424, 30, '#ff6a5a');
      text(`dragged from the sand — −${Math.round(0.10 * 100)}% gold`, 480, 452, 14, '#e8c37a');
    }
    btn('confirm', 480 - 110, 508, 220, 52, f.won ? 'RETURN TO HUB' : 'LIMP HOME');
    return;
  }
  // action bar
  const dis = f.phase !== 'player';
  text(f.phase === 'player' ? 'YOUR MOVE' : `${o.name} moves…`, 480, 380, 14, f.phase === 'player' ? '#7dff8a' : '#ff9a8a');
  const legal = E.legalActions(st);
  const A = (id, x, label, sub, okd) => btn('act:' + id, x, 505, 100, 52, label, sub, dis || !okd);
  A('attack', 96, 'ATTACK', '1·A', true);
  A('heavy', 204, 'HEAVY', `×1.7 · ${E.HEAVY_COST}s`, legal.includes('heavy'));
  A('rage', 312, 'RAGE', `×2.5 · ${E.RAGE_COST}r`, legal.includes('rage'));
  btn('sub:potion', 420, 505, 100, 52, 'POTION', '4·P', dis || !legal.includes('potion'));
  btn('sub:cast', 528, 505, 100, 52, 'CAST', '5·C', dis || !legal.includes('cast'));
  A('bow', 636, 'BOW', `${f.pAmmo} left`, legal.includes('bow'));
  A('taunt', 744, 'TAUNT', '+rage', true);
  A('hold', 852, 'HOLD', 'end', true);
  // submenu strip
  if (subMenu === 'potion') {
    parchment(180, 320, 600, 64);
    E.POTIONS.forEach((pt, i) => {
      const n = g.potions[pt.id] || 0;
      btn('pot:' + pt.id, 200 + i * 150, 330, 136, 44, `${pt.name} x${n}`, pt.heal ? `+${pt.heal}hp` : pt.stam ? `+${pt.stam}stam` : `+${pt.rage}rage`, n <= 0 || dis);
    });
  }
  if (subMenu === 'cast') {
    parchment(140, 320, 680, 64);
    g.spells.forEach((sid, i) => {
      const sp = E.SPELLS.find(s => s.id === sid);
      btn('spl:' + sid, 156 + i * 138, 330, 126, 44, sp.name, `${sp.mana} mana`, f.pmana < sp.mana || dis);
    });
    if (!g.spells.length) text('No spells learned — visit the Arcanum.', 480, 355, 13, '#6a4a20');
  }
}

function drawShop() {
  const g = st.glad;
  const names = { smithy: 'THE SMITHY', armory: 'THE ARMORY', alchemist: 'ALCHEMIST', arcanum: 'THE ARCANUM' };
  htext(names[shopTab], 52);
  plaque(280, 62, 400, 30);
  text(`${g.gold} gold · level ${g.level} · ${Object.values(g.potions).reduce((a, b) => a + b, 0)}/${E.MAX_POTIONS} potions`, W / 2, 84, 14, '#ffe9b8');
  // tab row
  Object.keys(names).forEach((k, i) => {
    const x = 60 + i * 215;
    const sel = k === shopTab;
    if (sel) { ctx.fillStyle = 'rgba(255,210,58,.2)'; rrect(x - 4, 100, 208, 44, 8); ctx.fill(); }
    btn('tab:' + k, x, 100, 200, 40, names[k]);
  });
  if (shopTab === 'smithy') {
    E.WEAPONS.forEach((w, i) => {
      const owned = g.ownedW.includes(i), eq = g.weapon === i, locked = g.level < w.lvl;
      const y = 158 + i * 50;
      drawWeaponIcon(w, i, 120, y + 18);
      text(`${w.name}  +${w.dmg} dmg`, 160, y + 16, 14, locked ? '#777' : '#ffe9b8', 'left');
      if (!owned && !locked) coin(160, y + 33);
      text(locked ? `lvl ${w.lvl}` : owned ? (eq ? 'EQUIPPED' : 'owned') : `${E.price(g, w.price)}g`, owned || locked ? 160 : 172, y + 36, 12, '#a89878', 'left');
      if (owned && !eq) btn('eqW:' + i, 660, y, 110, 42, 'EQUIP');
      else if (!owned) btn('buyW:' + i, 660, y, 110, 42, 'BUY', '', locked || g.gold < E.price(g, w.price));
    });
    // bows column
    text('RANGED (per-fight ammo)', 810, 150, 13, '#ffe9b8');
    E.BOWS.forEach((b, i) => {
      const owned = g.ownedB.includes(i), eq = g.bow === i, locked = g.level < b.lvl;
      const y = 170 + i * 80;
      text(`${b.name}`, 780, y + 16, 13, locked ? '#777' : '#ffe9b8', 'left');
      text(`+${b.dmg} · ${b.ammo} shots`, 780, y + 34, 11, '#a89878', 'left');
      text(locked ? `lvl ${b.lvl}` : owned ? (eq ? 'CARRIED' : 'owned') : `${E.price(g, b.price)}g`, 780, y + 50, 11, '#a89878', 'left');
      if (owned && !eq) btn('eqB:' + i, 870, y, 80, 40, 'CARRY');
      else if (!owned) btn('buyB:' + i, 870, y, 80, 40, 'BUY', '', locked || g.gold < E.price(g, b.price));
    });
  } else if (shopTab === 'armory') {
    const slots = ['helm', 'chest', 'shield', 'legs'];
    slots.forEach((slotName, c) => {
      const x = 60 + c * 215;
      text(slotName.toUpperCase(), x + 100, 160, 14, '#ffe9b8');
      E.ARMOR[slotName].forEach((a, i) => {
        const owned = g.ownedA[slotName].includes(i), eq = g.armor[slotName] === i, locked = g.level < a.lvl;
        const y = 176 + i * 62;
        text(`${a.name}`, x + 100, y + 14, 12, locked ? '#777' : '#ffe9b8');
        text(`+${a.def} def`, x + 100, y + 30, 11, '#a89878');
        text(locked ? `lvl ${a.lvl}` : owned ? (eq ? 'WORN' : 'owned') : `${E.price(g, a.price)}g`, x + 100, y + 46, 11, '#a89878');
        if (owned && !eq) btn(`eqA:${slotName}:${i}`, x + 130, y, 66, 36, 'WEAR');
        else if (!owned) btn(`buyA:${slotName}:${i}`, x + 130, y, 66, 36, 'BUY', '', locked || g.gold < E.price(g, a.price));
      });
    });
  } else if (shopTab === 'alchemist') {
    E.POTIONS.forEach((pt, i) => {
      const n = g.potions[pt.id] || 0, locked = g.level < pt.lvl;
      const y = 180 + i * 76;
      ctx.fillStyle = '#8a2a5a'; ctx.beginPath(); ctx.arc(140, y + 20, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8c37a'; ctx.fillRect(136, y + 2, 8, 8);
      text(`${pt.name} — held x${n}`, 170, y + 16, 15, locked ? '#777' : '#ffe9b8', 'left');
      text(pt.heal ? `+${pt.heal} hp` : pt.stam ? `+${pt.stam} stamina` : `+${pt.rage} rage`, 170, y + 36, 12, '#a89878', 'left');
      if (!locked) coin(170, y + 52);
      text(locked ? `lvl ${pt.lvl}` : `${E.price(g, pt.price)}g`, locked ? 170 : 182, y + 56, 12, '#a89878', 'left');
      btn('buyP:' + i, 660, y, 120, 44, 'BUY', '', locked || g.gold < E.price(g, pt.price) || Object.values(g.potions).reduce((a, b) => a + b, 0) >= E.MAX_POTIONS);
    });
    text(`belt holds ${E.MAX_POTIONS} vials`, 480, 500, 13, '#8a6238');
  } else if (shopTab === 'arcanum') {
    E.SPELLS.forEach((sp, i) => {
      const known = g.spells.includes(sp.id), locked = g.level < sp.lvl;
      const y = 180 + i * 66;
      ctx.fillStyle = '#3a2a5a'; ctx.beginPath(); ctx.arc(140, y + 20, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = '#9a5ad8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(140, y + 20, 14, 0, 7); ctx.stroke();
      text(`${sp.name} — ${sp.mana} mana`, 170, y + 16, 15, locked ? '#777' : '#ffe9b8', 'left');
      const desc = { dmg: `burns for ~${g.stats.mag * 3 + g.level * 2} dmg`, dmgBig: `doombolt ~${g.stats.mag * 4.5 + g.level * 2} piercing`, heal: `heals ~${g.stats.mag * 4 + g.level * 3} hp`, rage: '+40 rage', sap: 'saps 30 stamina, dulls aim' }[sp.kind];
      text(desc, 170, y + 36, 12, '#a89878', 'left');
      if (!known && !locked) coin(170, y + 52);
      text(locked ? `lvl ${sp.lvl}` : known ? 'LEARNED' : `${E.price(g, sp.price)}g`, known || locked ? 170 : 182, y + 56, 12, known ? '#7dff8a' : '#a89878', 'left');
      if (!known) btn('buyS:' + sp.id, 660, y, 120, 44, 'LEARN', '', locked || g.gold < E.price(g, sp.price));
    });
    text(`mana pool ${E.maxMana(g)} — MAG fuels every spell`, 480, 500, 13, '#8a6238');
  }
  if (shopMsg) text(shopMsg, W / 2, 545, 14, '#ffd23a');
  btn('back', W / 2 - 100, 555, 200, 40, 'BACK TO HUB');
}
function drawWeaponIcon(w, i, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.9); ctx.scale(.6, .6);
  drawWeapon(WKIND[i], i >= 6);
  ctx.restore();
}

function drawOver() {
  // end screen after fight done (reached via confirm? no — fight.done shows inline)
}
function drawChampion() {
  const t = performance.now();
  for (const p of ART.confetti) {
    const cy = (p.y + t * .06) % 420, cx = p.x + Math.sin(t / 600 + p.ph) * 14;
    ctx.globalAlpha = .8; ctx.fillStyle = p.c; ctx.fillRect(cx, 60 + cy, 4, 7);
  }
  ctx.globalAlpha = 1;
  laurel(W / 2, 168, 52, '#c9a020');
  ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(W / 2, 116, 6, 0, 7); ctx.fill();
  text('CHAMPION OF THE ARENA!', W / 2, 170, 44, '#ffd23a');
  text('Emperor Varus falls. The Undying Sovereign — dethroned.', W / 2, 215, 18, '#7dff8a');
  text(`${st.glad.name} · level ${st.glad.level} · ${st.glad.wins} victories`, W / 2, 245, 14, '#c9a86a');
  pedestal(W / 2, 392, 130);
  drawGlad(W / 2, 380, st.glad.look, false, false, false, { w: WKIND[st.glad.weapon], armor: armorTierOf(st.glad), gold: true });
  btn('confirm', W / 2 - 120, 470, 240, 56, 'RETURN TO HUB');
}

/* ---------- button dispatch ---------- */
function onBtn(id) {
  if (screen === 'title') {
    const m = id.match(/^slot(\d):(load|new)$/);
    if (m) {
      slot = +m[1];
      if (m[2] === 'load' && loadSlot(slot)) { prevLevel = st.glad.level; screen = 'hub'; bus.music('music.hub'); }
      else if (m[2] === 'new') {
        createSt = {
          name: E.NAMES[(Math.random() * E.NAMES.length) | 0],
          look: { skin: 0, hair: 0, beard: 0 },
          pts: E.CREATE_POINTS,
          stats: Object.fromEntries(E.STATS.map(k => [k, E.BASE_STAT])),
        };
        screen = 'create';
      }
    }
  } else if (screen === 'create') {
    const c = createSt;
    if (id === 'name') typing = true;
    if (id.startsWith('st+')) { const k = id.slice(3); if (c.pts > 0 && c.stats[k] < E.CREATE_CAP) { c.stats[k]++; c.pts--; } }
    if (id.startsWith('st-')) { const k = id.slice(3); if (c.stats[k] > E.BASE_STAT) { c.stats[k]--; c.pts++; } }
    if (id === 'begin' && c.name.length > 0) {
      E.enroll(st, c.name, c.look, c.stats);
      saveSlot(slot);
      prevLevel = 1;
      screen = 'hub'; bus.music('music.hub');
    }
  } else if (screen === 'hub') {
    if (id === 'fight') toFight();
    else if (id.startsWith('shop:')) { shopTab = id.slice(5); shopMsg = ''; screen = 'shop'; }
    else if (id.startsWith('train:')) { const k = id.slice(6); if (st.glad.statPts > 0) { st.glad.stats[k]++; st.glad.statPts--; } }
    else if (id === 'quit') { saveSlot(slot); screen = 'title'; bus.stopMusic(); }
  } else if (screen === 'fight') {
    if (id.startsWith('act:')) doAct(id.slice(4));
    else if (id === 'sub:potion') subMenu = subMenu === 'potion' ? null : 'potion';
    else if (id === 'sub:cast') subMenu = subMenu === 'cast' ? null : 'cast';
    else if (id.startsWith('pot:')) doAct('potion', id.slice(4));
    else if (id.startsWith('spl:')) doAct('cast', id.slice(4));
    else if (id === 'confirm') leaveFight();
  } else if (screen === 'shop') {
    if (id === 'back') { saveSlot(slot); screen = 'hub'; }
    else if (id.startsWith('tab:')) { shopTab = id.slice(4); shopMsg = ''; }
    else if (id.startsWith('buyW:')) { if (!E.buy(st, 'weapon', null, +id.slice(5))) { bus.play('sfx.deny'); shopMsg = 'Cannot buy — check level and gold.'; } }
    else if (id.startsWith('eqW:')) { E.equip(st.glad, 'weapon', null, +id.slice(4)); shopMsg = 'Equipped.'; }
    else if (id.startsWith('buyB:')) { if (!E.buy(st, 'bow', null, +id.slice(5))) { bus.play('sfx.deny'); shopMsg = 'Cannot buy — check level and gold.'; } }
    else if (id.startsWith('eqB:')) { E.equip(st.glad, 'bow', null, +id.slice(4)); shopMsg = 'Carried.'; }
    else if (id.startsWith('buyA:')) { const [, k, i] = id.split(':'); if (!E.buy(st, 'armor', k, +i)) { bus.play('sfx.deny'); shopMsg = 'Cannot buy — check level and gold.'; } }
    else if (id.startsWith('eqA:')) { const [, k, i] = id.split(':'); E.equip(st.glad, 'armor', k, +i); shopMsg = 'Worn.'; }
    else if (id.startsWith('buyP:')) { if (!E.buy(st, 'potion', null, +id.slice(5))) { bus.play('sfx.deny'); shopMsg = 'Cannot buy — belt full, level, or gold.'; } }
    else if (id.startsWith('buyS:')) { if (!E.buy(st, 'spell', id.slice(5), null)) { bus.play('sfx.deny'); shopMsg = 'Cannot learn — check level and gold.'; } }
  } else if (screen === 'champion') {
    if (id === 'confirm') { screen = 'hub'; }
  }
}

/* ---------- frame ---------- */
function frame(now) {
  const dt = Math.min(0.1, (now - (frame.l || now)) / 1000); frame.l = now;
  E.tick(st, dt);
  drainEvents();
  anims.forEach(a => a.t += dt * 60); anims = anims.filter(a => a.t < a.dur);
  floats.forEach(f => f.t += dt * 60); floats = floats.filter(f => f.t < 50);
  render();
  requestAnimationFrame(frame);
}
function render() {
  if (!ART.ready) buildArena();
  hits.clear(); ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .9; if (shake < .5) shake = 0; }
  ctx.drawImage(arenaCv, -12, -12, W + 24, H + 24);
  arenaOverlay(performance.now());
  if (screen === 'title') drawTitle();
  else if (screen === 'create') drawCreate();
  else if (screen === 'hub') drawHub();
  else if (screen === 'fight') drawFight();
  else if (screen === 'shop') drawShop();
  else if (screen === 'champion') drawChampion();
  floats.forEach(f => text(f.txt, f.x, f.y - f.t * 1.2, 20, f.c));
  ctx.restore();
}
addEventListener('resize', () => CORE.fitCanvas(cv, W, H));
CORE.fitCanvas(cv, W, H);
requestAnimationFrame(frame);

/* ---------- read-only probe ---------- */
window.__sas = {
  get screen() { return screen; },
  get slot() { return slot; },
  get glad() {
    const g = st.glad;
    return g ? {
      name: g.name, level: g.level, xp: g.xp, gold: g.gold, statPts: g.statPts,
      nextOpp: g.nextOpp, champion: g.champion, wins: g.wins, losses: g.losses,
      stats: { ...g.stats }, weapon: g.weapon, bow: g.bow, potions: { ...g.potions }, spells: [...g.spells],
      armor: { ...g.armor },
    } : null;
  },
  get fight() {
    const f = st.fight;
    return f ? { phase: f.phase, php: f.php, ehp: f.ehp, pstam: f.pstam, prage: f.prage, pmana: f.pmana,
      pAmmo: f.pAmmo, opp: f.opp.name, done: f.done, won: f.won, legal: E.legalActions(st), log: [...f.log] } : null;
  },
  get shopTab() { return shopTab; },
  get hitList() { return hits.all().map(h => h.id); },
  get muted() { return bus.muted; },
};
})();
