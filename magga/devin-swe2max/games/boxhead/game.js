/* games/boxhead/game.js — browser shell for BOX RIOT: 2PLAY ROOMS.
 * Canvas2D, zero-dependency, file:// safe. Engine = engine.js (pure sim).
 * Input: dual keyboard (P1 WASD+Space+1-6 · P2 arrows+Enter+numpad1-6),
 * optional mouse aim for P1, touch = left stick + fire pad + auto-aim
 * (co-op touch adds a second stick on the right half — layout A per spec).
 * Persistence: high score per mode + mute via MAGA.save/load.
 * Read-only probe: window.__bh.
 */
'use strict';
(() => {
const E = globalThis.BOXENGINE;
const CORE = globalThis.MAGA, AU = globalThis.MAGA_AUDIO;
const W = E.W, H = E.H;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const kb = CORE.keyboard();
const hits = CORE.hitRects();
const coarse = matchMedia('(pointer: coarse)').matches;

const SAVE_KEY = 'boxhead';
const save = CORE.load(SAVE_KEY, 'save', null) || {};
save.high = save.high || {};
save.mute = !!save.mute;
const persist = () => CORE.save(SAVE_KEY, 'save', save);

/* ---------- audio ---------- */
const bus = new AU.AudioBus();
bus.register([
  { id: 'sfx.pistol', kind: 'sfx', polyphony: 5,
    recipe: { type: 'square_blip', durationMs: 70, freq: 660, freqEnd: 320, gain: 0.10,
      noise: { amount: 0.3, freq: 3000 }, envelope: { a: 0.001, d: 0.05, s: 0, r: 0.02 } } },
  { id: 'sfx.shotgun', kind: 'sfx', polyphony: 3,
    recipe: { type: 'noise_burst', durationMs: 180, gain: 0.20,
      noise: { amount: 0.9, freq: 1600 }, envelope: { a: 0.001, d: 0.13, s: 0, r: 0.05 } } },
  { id: 'sfx.uzi', kind: 'sfx', polyphony: 6,
    recipe: { type: 'square_blip', durationMs: 45, freq: 900, freqEnd: 500, gain: 0.07,
      noise: { amount: 0.25, freq: 3400 }, envelope: { a: 0.001, d: 0.03, s: 0, r: 0.01 } } },
  { id: 'sfx.grenade', kind: 'sfx', polyphony: 3,
    recipe: { type: 'saw_thud', durationMs: 160, freq: 240, freqEnd: 120, gain: 0.12,
      envelope: { a: 0.002, d: 0.12, s: 0, r: 0.04 } } },
  { id: 'sfx.rocket', kind: 'sfx', polyphony: 3,
    recipe: { type: 'noise_burst', durationMs: 220, gain: 0.13,
      noise: { amount: 0.8, freq: 2200 }, envelope: { a: 0.004, d: 0.16, s: 0, r: 0.06 } } },
  { id: 'sfx.mine', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 90, freq: 440, freqEnd: 660, gain: 0.09,
      envelope: { a: 0.002, d: 0.06, s: 0, r: 0.03 } } },
  { id: 'sfx.explode', kind: 'sfx', polyphony: 3,
    recipe: { type: 'saw_thud', durationMs: 420, freq: 110, freqEnd: 34, gain: 0.30,
      noise: { amount: 0.7, freq: 1100 }, envelope: { a: 0.003, d: 0.32, s: 0, r: 0.1 } } },
  { id: 'sfx.zhit', kind: 'sfx', polyphony: 5,
    recipe: { type: 'noise_burst', durationMs: 60, gain: 0.08,
      noise: { amount: 0.75, freq: 2600 }, envelope: { a: 0.001, d: 0.04, s: 0, r: 0.02 } } },
  { id: 'sfx.zdie', kind: 'sfx', polyphony: 5,
    recipe: { type: 'saw_thud', durationMs: 140, freq: 300, freqEnd: 90, gain: 0.13,
      noise: { amount: 0.4, freq: 1800 }, envelope: { a: 0.001, d: 0.10, s: 0, r: 0.04 } } },
  { id: 'sfx.hit', kind: 'sfx', polyphony: 4,
    recipe: { type: 'square_blip', durationMs: 130, freq: 190, freqEnd: 90, gain: 0.16,
      envelope: { a: 0.001, d: 0.09, s: 0, r: 0.04 } } },
  { id: 'sfx.die', kind: 'sfx', polyphony: 2,
    recipe: { type: 'saw_thud', durationMs: 500, freq: 220, freqEnd: 40, gain: 0.26,
      envelope: { a: 0.004, d: 0.4, s: 0, r: 0.1 } } },
  { id: 'sfx.pickup', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 130, freq: 620, freqEnd: 1240, gain: 0.12,
      envelope: { a: 0.002, d: 0.09, s: 0, r: 0.04 } } },
  { id: 'sfx.unlock', kind: 'sfx', polyphony: 1,
    recipe: { type: 'arpeggio', durationMs: 420, freq: 523, gain: 0.16,
      pattern: ['C5', 'E5', 'G5', 'C6'], bpm: 300,
      envelope: { a: 0.002, d: 0.3, s: 0, r: 0.12 } } },
  { id: 'sfx.wave', kind: 'sfx', polyphony: 1,
    recipe: { type: 'square_blip', durationMs: 300, freq: 392, freqEnd: 784, gain: 0.13,
      envelope: { a: 0.004, d: 0.2, s: 0, r: 0.1 } } },
  { id: 'sfx.fireball', kind: 'sfx', polyphony: 3,
    recipe: { type: 'noise_burst', durationMs: 160, gain: 0.09,
      noise: { amount: 0.8, freq: 900 }, envelope: { a: 0.01, d: 0.1, s: 0, r: 0.05 } } },
  { id: 'sfx.dry', kind: 'sfx', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 50, freq: 150, freqEnd: 110, gain: 0.08,
      envelope: { a: 0.001, d: 0.035, s: 0, r: 0.015 } } },
  { id: 'sfx.ui', kind: 'ui', polyphony: 3,
    recipe: { type: 'square_blip', durationMs: 45, freq: 700, gain: 0.07,
      envelope: { a: 0.001, d: 0.03, s: 0, r: 0.01 } } },
  { id: 'sfx.over', kind: 'sfx', polyphony: 1,
    recipe: { type: 'arpeggio', durationMs: 800, freq: 220, gain: 0.18,
      pattern: ['E4', 'C4', 'A3', 'E3'], bpm: 160,
      envelope: { a: 0.004, d: 0.6, s: 0, r: 0.2 } } },
]);
bus.register([{ id: 'music.bed', kind: 'music', recipe: { bpm: 138, stepsPerBeat: 4, tracks: [
  // driving bass eighths — tense combat pulse
  { wave: 'triangle', gain: 0.14, legato: true, pattern: [
    'A2', 0, 'A2', 0, 'C3', 0, 'A2', 0, 'A2', 0, 'G2', 0, 'A2', 0, 'E2', 0,
    'A2', 0, 'A2', 0, 'C3', 0, 'D3', 0, 'E3', 0, 'D3', 0, 'C3', 0, 'G2', 0] },
  // sparse high arp sparkle every other bar
  { wave: 'square', gain: 0.03, pattern: [
    'A4', 0, 0, 0, 0, 0, 'C5', 0, 0, 0, 'E5', 0, 0, 0, 0, 0,
    'D5', 0, 0, 0, 0, 0, 0, 0, 'C5', 0, 0, 0, 'A4', 0, 0, 0] },
  // hat tick — square at +2 octaves stands in for noise hats
  { wave: 'square', gain: 0.02, octaveShift: 2, pattern: [
    'C6', 0, 0, 0, 'C6', 0, 0, 0, 'C6', 0, 0, 0, 'C6', 0, 'C6', 0,
    'C6', 0, 0, 0, 'C6', 0, 0, 'C6', 'C6', 0, 0, 0, 'C6', 0, 0, 0] },
] } }]);
bus.muted = save.mute;

/* ---------- screen state ---------- */
let scene = 'title';            // title | mode | room | play | paused | over
let mode = 'solo', roomIdx = 0, st = null;
let banner = '', bannerSub = '';
let unlockToast = '', unlockT = 0;
let shakeT = 0, shakeMag = 0;
let mouse = { x: -1, y: -1, t: 99 };
let touches = new Map();        // pointerId → touch role state
let p2WeaponCycle = 0;

const P1_COLOR = '#e8e8f0', P2_COLOR = '#7ab8ff';
const MODES = [
  { id: 'solo', name: 'SOLO SURVIVAL', sub: 'you vs the horde — endless waves' },
  { id: 'coop', name: 'LOCAL CO-OP',   sub: 'two guns, one keyboard — revive on wave clear' },
  { id: 'dm',   name: 'DEATHMATCH',    sub: `first to ${E.DM_TARGET} kills — all weapons live` },
];

/* ---------- helpers ---------- */
function stagePos(e) { return CORE.toStage(cv, W, H, e); }
function inPlay() { return scene === 'play' || scene === 'paused'; }

function startRun() {
  st = E.create(mode, roomIdx, (Date.now() % 2147483647) | 0);
  scene = 'play';
  unlockToast = ''; unlockT = 0;
  bus.music('music.bed');
}
function endRun(text, sub) {
  scene = 'over';
  banner = text; bannerSub = sub;
  bus.stopMusic();
  const key = mode === 'dm' ? 'dm' : mode;
  const sc = st.score;
  if (mode !== 'dm' && sc > (save.high[key] || 0)) { save.high[key] = sc; persist(); }
}

/* ---------- input → engine ---------- */
function playerInput(idx) {
  const inp = { mx: 0, my: 0, fire: false };
  if (idx === 0) {
    if (kb.isDown('KeyA') || kb.isDown('ArrowLeft') && st.players.length === 1) inp.mx -= 1;
    if (kb.isDown('KeyD') || kb.isDown('ArrowRight') && st.players.length === 1) inp.mx += 1;
    if (kb.isDown('KeyW') || kb.isDown('ArrowUp') && st.players.length === 1) inp.my -= 1;
    if (kb.isDown('KeyS') || kb.isDown('ArrowDown') && st.players.length === 1) inp.my += 1;
    inp.fire = kb.isDown('Space') || kb.isDown('KeyJ');
    for (let i = 0; i < 6; i++) if (kb.wasPressed('Digit' + (i + 1))) inp.weapon = i;
    // mouse aim sugar — recent cursor position overrides facing
    if (!coarse && mouse.t < 2 && mouse.x >= 0) { inp.aimX = mouse.x; inp.aimY = mouse.y; }
    // touch: virtual stick + fire pad
    const st1 = touches.get('stick1');
    if (st1) { inp.mx = st1.dx; inp.my = st1.dy; }
    if (touches.get('fire1')) {
      inp.fire = true;
      const t = nearestZombie(st.players[0]);
      if (t) { inp.aimX = t.x; inp.aimY = t.y; }        // auto-aim (layout C)
    }
  } else {
    if (kb.isDown('ArrowLeft')) inp.mx -= 1;
    if (kb.isDown('ArrowRight')) inp.mx += 1;
    if (kb.isDown('ArrowUp')) inp.my -= 1;
    if (kb.isDown('ArrowDown')) inp.my += 1;
    inp.fire = kb.isDown('Enter') || kb.isDown('Numpad0') || kb.isDown('Slash') || kb.isDown('ShiftRight');
    for (let i = 0; i < 6; i++) if (kb.wasPressed('Numpad' + (i + 1))) inp.weapon = i;
    if (kb.wasPressed('Comma')) inp.weapon = (st.players[1].weapon + 5) % 6;
    if (kb.wasPressed('Period')) inp.weapon = (st.players[1].weapon + 1) % 6;
    const st2 = touches.get('stick2');
    if (st2) { inp.mx = st2.dx; inp.my = st2.dy; }
    if (touches.get('fire2')) {
      inp.fire = true;
      const t = mode === 'dm' ? st.players[0] : nearestZombie(st.players[1]);
      if (t) { inp.aimX = t.x; inp.aimY = t.y; }
    }
  }
  return inp;
}
function nearestZombie(p) {
  let best = null, bd = Infinity;
  for (const z of st.zombies) { const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < bd) { bd = d; best = z; } }
  return best;
}

/* ---------- touch regions ---------- */
// Solo touch (layout C): left 45% = stick, FIRE pad right-bottom, WEAPON chip right-top.
// Coop/dm touch (layout A): left 50% = P1 stick+fire, right 50% = P2 stick+fire.
function touchRole(p, id) {
  if (scene !== 'play') return null;
  const two = st.players.length > 1;
  if (!two) {
    if (p.x > W - 150 && p.y > H - 170) return 'fire1';
    if (p.x > W - 150 && p.y < 90) return 'wpn';
    if (p.x < W * 0.55) return 'stick1';
    return 'fire1';
  }
  if (p.x < W / 2) {
    if (p.y > H - 150 && p.x < 170) return 'stick1';
    return 'fire1';
  }
  if (p.y > H - 150 && p.x > W - 170) return 'stick2';
  return 'fire2';
}

function onDown(e) {
  const p = stagePos(e);
  bus.unlock();
  if (hits.tap(p)) { bus.play('sfx.ui'); return; }
  if (scene === 'play' && e.pointerType !== 'mouse') {
    const role = touchRole(p, e.pointerId);
    if (role === 'wpn') {
      const pl = st.players[0];
      pl.weapon = (pl.weapon + 1) % (st.unlockMax + 1);
      bus.play('sfx.ui');
      return;
    }
    if (role && role.startsWith('stick')) {
      touches.set(role, { id: e.pointerId, ox: p.x, oy: p.y, dx: 0, dy: 0 });
      return;
    }
    if (role) { touches.set(role, { id: e.pointerId }); return; }
  }
  menuAdvance(p);
}
function onMove(e) {
  const p = stagePos(e);
  if (e.pointerType === 'mouse') { mouse.x = p.x; mouse.y = p.y; mouse.t = 0; }
  for (const [role, t] of touches) {
    if (t.id === e.pointerId && role.startsWith('stick')) {
      const dx = p.x - t.ox, dy = p.y - t.oy;
      const d = Math.hypot(dx, dy);
      const cap = 46;
      t.dx = d <= 6 ? 0 : clampN(dx / cap);
      t.dy = d <= 6 ? 0 : clampN(dy / cap);
    }
  }
}
const clampN = v => Math.max(-1, Math.min(1, v));
function onUp(e) {
  for (const [role, t] of touches) if (t.id === e.pointerId) touches.delete(role);
}

/* ---------- menus ---------- */
function menuAdvance(p) {
  // pointer taps drive menus when chips exist; raw tap = default advance
  switch (scene) {
    case 'title': scene = 'mode'; break;
    case 'mode': setMode('solo'); break;
    case 'room': setRoom(0); break;
    case 'over': startRun(); break;
  }
}
function setMode(m) { mode = m; scene = 'room'; }
function setRoom(i) { roomIdx = i; startRun(); }

/* ---------- frame ---------- */
function tick(dt) {
  mouse.t += dt;
  if (unlockT > 0) unlockT -= dt;
  if (shakeT > 0) shakeT -= dt;

  if (scene === 'play' && (kb.wasPressed('Escape') || kb.wasPressed('KeyP'))) {
    scene = 'paused'; bus.duck(0.4, 200);
  } else if (scene === 'paused' && (kb.wasPressed('Escape') || kb.wasPressed('KeyP'))) {
    scene = 'play'; bus.duck(1, 200);
  }

  if (scene === 'play') {
    const inputs = st.players.map((_, i) => playerInput(i));
    E.step(st, inputs, dt);
    for (const ev of st.events) handleEvent(ev);
    st.events.length = 0;
    if (st.over) endRun(`OVERRUN ON WAVE ${st.wave}`, `SCORE ${st.score} · BEST ${Math.max(st.score, save.high[mode] || 0)}`);
    if (st.dmWinner >= 0) {
      const w = st.dmWinner;
      endRun(`P${w + 1} WINS ${st.players[w].kills}–${st.players[1 - w].kills}`, 'rematch or menu');
    }
  } else if (scene === 'paused') {
    if (kb.wasPressed('Enter') || kb.wasPressed('KeyM')) { scene = 'mode'; bus.stopMusic(); }
  } else {
    // menus on keys
    if (scene === 'title' && (kb.anyPressed('Enter', 'Space'))) scene = 'mode';
    else if (scene === 'mode') {
      if (kb.wasPressed('Digit1')) setMode('solo');
      else if (kb.wasPressed('Digit2')) setMode('coop');
      else if (kb.wasPressed('Digit3')) setMode('dm');
      else if (kb.wasPressed('Escape')) scene = 'title';
    } else if (scene === 'room') {
      for (let i = 0; i < E.ROOMS.length; i++)
        if (kb.wasPressed('Digit' + (i + 1))) setRoom(i);
      if (kb.wasPressed('Escape')) scene = 'mode';
    } else if (scene === 'over') {
      if (kb.wasPressed('Enter') || kb.wasPressed('Space')) startRun();
      else if (kb.wasPressed('KeyM') || kb.wasPressed('Escape')) { scene = 'mode'; }
    }
  }
  kb.endFrame();
}

function handleEvent(ev) {
  const m = {
    pistol: 'sfx.pistol', shotgun: 'sfx.shotgun', uzi: 'sfx.uzi',
    grenade: 'sfx.grenade', rocket: 'sfx.rocket', mine: 'sfx.mine',
    explode: 'sfx.explode', zombieHit: 'sfx.zhit', zombieDie: 'sfx.zdie',
    playerHit: 'sfx.hit', playerDie: 'sfx.die', pickup: 'sfx.pickup',
    wave: 'sfx.wave', devilFire: 'sfx.fireball', dry: 'sfx.dry',
    respawn: 'sfx.pickup', revive: 'sfx.unlock',
  }[ev];
  if (m) bus.play(m);
  if (ev === 'explode') { shakeT = 0.25; shakeMag = 5; }
  if (ev === 'unlock') {
    unlockToast = `${E.WEAPONS[st.unlockMax].name} UNLOCKED`;
    unlockT = 2.5;
    bus.play('sfx.unlock');
  }
  if (ev === 'gameOver' || ev === 'dmWin') bus.play('sfx.over');
}

/* ---------- render ---------- */
function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0c0c12';
  ctx.fillRect(0, 0, W, H);

  if (scene === 'title') drawTitle();
  else if (scene === 'mode') drawMode();
  else if (scene === 'room') drawRoom();
  else drawGame();
  ctx.restore();
}

function panel(x, y, w, h, fill = '#14141d', line = '#2e2e40') {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function text(str, x, y, size = 12, color = '#e8e8f0', align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}
function chip(x, y, w, h, label, sub, keyHint, fn, accent = '#f5c542') {
  panel(x, y, w, h, '#181824', accent);
  if (keyHint) text(keyHint, x + 12, y + 18, 11, accent, 'left');
  text(label, x + w / 2, y + (sub ? 20 : h / 2 + 5), 14, '#fff');
  if (sub) text(sub, x + w / 2, y + 36, 9, '#8a8aa0');
  hits.add(label, x, y, w, h, fn);
}

function drawTitle() {
  hits.clear();
  // ambient room silhouette behind the logo
  drawFloor(0.35);
  ctx.globalAlpha = 0.16;
  for (const o of E.ROOMS[2].obstacles) panel(o.x, o.y, o.w, o.h, '#33334a', '#55557a');
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#f5c542';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BOX RIOT', W / 2, 120);
  text('— 2PLAY ROOMS —', W / 2, 148, 15, '#8a8aa0');
  // little box guys flanking the title
  drawPerson(W / 2 - 150, 108, P1_COLOR, 0, 1.6);
  drawPerson(W / 2 + 150, 108, '#6a8f3a', 0, 1.6, true);
  drawPerson(W / 2 + 178, 108, '#8f2a3a', 0, 1.6, true);

  text('survive the swarm · feed the streak · share the keyboard', W / 2, 200, 11, '#9a9ab0');
  chip(W / 2 - 110, 240, 220, 46, 'ENTER THE ROOMS', '', 'ENTER / TAP', () => { scene = 'mode'; });
  const hs = save.high;
  text(`best — solo ${hs.solo || 0} · coop ${hs.coop || 0}`, W / 2, 330, 10, '#6a6a80');
  text(save.mute ? 'M — unmute' : 'M — mute', W / 2, 352, 10, '#55556a');
}

function drawMode() {
  hits.clear();
  text('SELECT MODE', W / 2, 90, 26, '#f5c542');
  MODES.forEach((m, i) => {
    const y = 140 + i * 70;
    chip(W / 2 - 190, y, 380, 54, m.name, m.sub, String(i + 1), () => setMode(m.id));
  });
  text('1 / 2 / 3 or tap · ESC back', W / 2, 370, 10, '#55556a');
}

function drawRoom() {
  hits.clear();
  text('SELECT ROOM', W / 2, 64, 24, '#f5c542');
  E.ROOMS.forEach((r, i) => {
    const col = i % 3, row = (i / 3) | 0;
    const x = W / 2 - 300 + col * 204, y = 110 + row * 118;
    chip(x, y, 190, 100, r.name, '', String(i + 1), () => setRoom(i));
    // mini floor-plan preview
    ctx.save();
    ctx.translate(x + 15, y + 40);
    const s = 0.16;
    ctx.scale(s, s);
    ctx.strokeStyle = '#f5c542';
    ctx.strokeRect(0, 0, W, H);
    ctx.fillStyle = '#55557a';
    for (const o of r.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#b03030';
    for (const b of r.barrels) ctx.fillRect(b.x - 6, b.y - 8, 12, 16);
    ctx.restore();
  });
  text('1–6 or tap · ESC back', W / 2, 372, 10, '#55556a');
}

function drawFloor(alpha = 1) {
  ctx.globalAlpha = alpha;
  // slab + grout grid + grime speckle — chunky, low-fi
  ctx.fillStyle = '#101018';
  ctx.fillRect(INSETR(), INSETR(), W - INSETR() * 2, H - INSETR() * 2);
  ctx.strokeStyle = '#191924';
  ctx.lineWidth = 1;
  for (let x = INSETR(); x < W - INSETR(); x += 32) { ctx.beginPath(); ctx.moveTo(x, INSETR()); ctx.lineTo(x, H - INSETR()); ctx.stroke(); }
  for (let y = INSETR(); y < H - INSETR(); y += 32) { ctx.beginPath(); ctx.moveTo(INSETR(), y); ctx.lineTo(W - INSETR(), y); ctx.stroke(); }
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = '#1c1c28';
  let h = 7;
  for (let i = 0; i < 90; i++) {
    h = (h * 16807) % 2147483647;
    const x = INSETR() + (h % 560), y = INSETR() + ((h >> 4) % 340);
    ctx.fillRect(x, y, 3 + (h % 5), 2);
  }
  ctx.globalAlpha = 1;
  // walls
  ctx.fillStyle = '#24242f';
  ctx.fillRect(0, 0, W, INSETR()); ctx.fillRect(0, H - INSETR(), W, INSETR());
  ctx.fillRect(0, 0, INSETR(), H); ctx.fillRect(W - INSETR(), 0, INSETR(), H);
  ctx.strokeStyle = '#3a3a4e'; ctx.strokeRect(INSETR() - 0.5, INSETR() - 0.5, W - INSETR() * 2 + 1, H - INSETR() * 2 + 1);
  // door gaps — scuffed edges where the swarm pours in
  if (st) for (const d of st.room.doors) {
    ctx.fillStyle = '#0c0c12';
    const horiz = d.y === 10 || d.y === H - 10;
    ctx.fillRect(horiz ? d.x - 18 : d.x - 8, horiz ? d.y - 8 : d.y - 18, horiz ? 36 : 16, horiz ? 16 : 36);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(horiz ? d.x - 18 : d.x - 6, horiz ? d.y - 6 : d.y - 18, horiz ? 36 : 12, horiz ? 12 : 36);
  }
}
const INSETR = () => 14;

function drawPerson(x, y, color, ang = 0, scale = 1, monster = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.fillRect(-6, -4, 12, 12); ctx.strokeRect(-6, -4, 12, 12);          // body
  ctx.fillRect(-4, -11, 8, 7); ctx.strokeRect(-4, -11, 8, 7);            // head
  ctx.fillStyle = '#101018';
  ctx.fillRect(1, -9, 2, 2);                                             // eye
  if (monster) { ctx.fillStyle = '#ffd23a'; ctx.fillRect(1, -9, 2, 2); } // glowing eye
  ctx.restore();
}

function drawGame() {
  hits.clear();
  ctx.save();
  if (shakeT > 0) ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);

  drawFloor();
  // obstacles — concrete blocks
  for (const o of st.room.obstacles) {
    panel(o.x, o.y, o.w, o.h, '#2c2c3c', '#4a4a62');
    ctx.fillStyle = '#3a3a50';
    ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 3);
  }
  // crates
  for (const c of st.crates) {
    ctx.fillStyle = '#f5c542'; ctx.fillRect(c.x - 7, c.y - 5, 14, 10);
    ctx.fillStyle = '#8a6d1a'; ctx.fillRect(c.x - 7, c.y - 1.5, 14, 3);
    ctx.strokeStyle = '#000'; ctx.strokeRect(c.x - 7.5, c.y - 5.5, 15, 11);
  }
  // barrels — pulsing fuse when lit
  for (const b of st.barrels) {
    if (b.dead) continue;
    const lit = b.fuse >= 0;
    ctx.fillStyle = lit ? (Math.sin(st.t * 60) > 0 ? '#ff7040' : '#b03030') : '#b03030';
    ctx.fillRect(b.x - 6, b.y - 8, 12, 16);
    ctx.fillStyle = lit ? '#ffd23a' : '#701818';
    ctx.fillRect(b.x - 6, b.y - 2, 12, 4);
    ctx.strokeStyle = '#000'; ctx.strokeRect(b.x - 6.5, b.y - 8.5, 13, 17);
  }
  // mines
  for (const m of st.mines) {
    const armed = m.arm <= 0;
    ctx.fillStyle = armed && Math.sin(st.t * 12) > 0 ? '#ff4040' : '#2a2a30';
    ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.stroke();
    if (!armed) { ctx.strokeStyle = '#666'; ctx.strokeRect(m.x - 6, m.y - 6, 12, 12); }
  }
  // zombies
  for (const z of st.zombies) {
    const col = z.kind === 'devil' ? '#7a1f3a' : z.kind === 'runner' ? '#c24040' : '#5f8a38';
    let tgt = null, bd = Infinity;
    for (const p of st.players) if (p.alive) { const d = Math.hypot(p.x - z.x, p.y - z.y); if (d < bd) { bd = d; tgt = p; } }
    const ang = tgt ? Math.atan2(tgt.y - z.y, tgt.x - z.x) : 0;
    if (z.kind === 'devil' && z.telegraph > 0) {
      ctx.strokeStyle = `rgba(255,90,40,${0.4 + 0.4 * Math.sin(st.t * 30)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(z.x, z.y, 14, 0, 7); ctx.stroke();
    }
    drawPerson(z.x, z.y, z.flash > 0 ? '#ffffff' : col, ang, z.kind === 'devil' ? 1.25 : 1, z.kind !== 'walker');
  }
  // players
  st.players.forEach((p, i) => {
    if (!p.alive) {
      if (st.mode === 'coop') { text('DOWN', p.x, p.y - 18, 8, '#ff6060'); drawPerson(p.x, p.y, '#3a3a44', 0, 1); }
      return;
    }
    if (p.invuln > 0 && Math.sin(st.t * 40) > 0) return;   // i-frame blink
    const col = i === 0 ? P1_COLOR : P2_COLOR;
    const face = p.facing;
    const ang = Math.atan2(face.y, face.x);
    drawPerson(p.x, p.y, p.flash > 0 ? '#ff8080' : col, ang, 1.15);
    // gun barrel
    ctx.strokeStyle = '#0c0c12'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + face.x * 13, p.y + face.y * 13); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + face.x * 13, p.y + face.y * 13); ctx.stroke();
  });
  // bullets
  for (const b of st.bullets) {
    if (b.kind === 'grenade') {
      ctx.fillStyle = '#3a5f2a';
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    } else if (b.kind === 'rocket') {
      ctx.fillStyle = '#d8d8e8';
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillRect(-4, -2, 8, 4);
      ctx.fillStyle = '#ff9040'; ctx.fillRect(-7, -1, 3, 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f5c542';
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillRect(-2, -1, 6, 2);
      ctx.restore();
    }
  }
  // devil fireballs
  for (const f of st.efire) {
    ctx.fillStyle = '#ff7020';
    ctx.beginPath(); ctx.arc(f.x, f.y, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, 7); ctx.fill();
  }
  // gibs + blast rings
  for (const g of st.parts) {
    ctx.globalAlpha = 1 - g.t / g.dur;
    ctx.fillStyle = g.shade === 'devil' ? '#7a1f3a' : g.shade === 'runner' ? '#c24040' : '#5f8a38';
    ctx.fillRect(g.x - 2, g.y - 2, 4, 4);
    ctx.globalAlpha = 1;
  }
  for (const bl of st.blasts) {
    const k = bl.t / bl.dur;
    ctx.strokeStyle = `rgba(245,197,66,${1 - k})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bl.x, bl.y, Math.max(1, bl.r * k), 0, 7); ctx.stroke();
    ctx.fillStyle = `rgba(255,140,60,${(1 - k) * 0.3})`;
    ctx.beginPath(); ctx.arc(bl.x, bl.y, Math.max(1, bl.r * k), 0, 7); ctx.fill();
  }
  ctx.restore();

  drawHud();
  if (scene === 'paused') {
    ctx.fillStyle = 'rgba(10,10,16,0.72)'; ctx.fillRect(0, 0, W, H);
    text('PAUSED', W / 2, H / 2 - 10, 24, '#f5c542');
    text('ESC/P resume · ENTER/M menu', W / 2, H / 2 + 16, 11, '#9a9ab0');
  }
  if (scene === 'over') {
    ctx.fillStyle = 'rgba(10,10,16,0.78)'; ctx.fillRect(0, 0, W, H);
    text(banner, W / 2, H / 2 - 26, 20, '#f5c542');
    text(bannerSub, W / 2, H / 2 + 2, 12, '#e8e8f0');
    text('SPACE/ENTER — run it again · M — menu · tap — retry', W / 2, H / 2 + 30, 10, '#9a9ab0');
    chip(W / 2 - 60, H / 2 + 48, 120, 34, 'MENU', '', '', () => { scene = 'mode'; });
  }
}

function drawHud() {
  // top strip
  ctx.fillStyle = 'rgba(12,12,18,0.82)';
  ctx.fillRect(0, 0, W, 30);
  const modeTag = st.mode === 'dm' ? 'DM' : st.mode.toUpperCase();
  text(`${modeTag} · ${st.room.name}`, 8, 19, 11, '#8a8aa0', 'left');
  if (st.mode === 'dm') {
    text(`P1 ${st.players[0].kills} — ${st.players[1].kills} P2   first to ${E.DM_TARGET}`, W / 2, 19, 12, '#f5c542');
  } else {
    text(`WAVE ${st.wave}`, W / 2 - 110, 19, 12, '#e8e8f0');
    text(`SCORE ${st.score}`, W / 2 + 10, 19, 12, '#f5c542');
    text(`x${st.mult}`, W / 2 + 130, 19, 13, st.mult >= 10 ? '#ff7040' : st.mult >= 4 ? '#ffd23a' : '#9a9ab0');
  }
  // per-player plates bottom
  st.players.forEach((p, i) => {
    const x = i === 0 ? 8 : W - 208, y = H - 40;
    panel(x, y, 200, 32, 'rgba(16,16,24,0.85)', i === 0 ? P1_COLOR : P2_COLOR);
    text(`P${i + 1}`, x + 8, y + 14, 10, i === 0 ? P1_COLOR : P2_COLOR, 'left');
    // hp bar
    ctx.fillStyle = '#3a1a1a'; ctx.fillRect(x + 30, y + 6, 70, 6);
    ctx.fillStyle = p.hp > 35 ? '#50c040' : '#e04040';
    ctx.fillRect(x + 30, y + 6, 70 * Math.max(0, p.hp) / 100, 6);
    text(`HP ${Math.max(0, p.hp)}`, x + 104, y + 13, 9, '#c0c0d0', 'left');
    text(`AMMO ${p.ammo}`, x + 104, y + 26, 9, p.ammo < 10 ? '#ff7040' : '#c0c0d0', 'left');
    // weapon strip — unlocked bright, selected boxed, locked dim
    E.WEAPONS.forEach((w, wi) => {
      const wx = x + 30 + wi * 27, wy = y + 17;
      const unlocked = wi <= st.unlockMax, sel = p.weapon === wi && p.alive;
      ctx.fillStyle = unlocked ? (sel ? '#f5c542' : '#4a4a60') : '#232330';
      ctx.fillRect(wx, wy, 22, 9);
      if (sel) { ctx.strokeStyle = '#fff'; ctx.strokeRect(wx - 0.5, wy - 0.5, 23, 10); }
      text(w.name[0], wx + 11, wy + 7.5, 7, unlocked ? (sel ? '#000' : '#c0c0d0') : '#44445a');
    });
    if (!p.alive) text(st.mode === 'coop' ? 'DOWN — revives next wave' : 'DEAD', x + 30, y + 45, 9, '#ff6060', 'left');
  });
  // unlock toast + wave banner
  if (unlockT > 0) {
    ctx.globalAlpha = Math.min(1, unlockT);
    text(unlockToast, W / 2, 52, 15, '#ffd23a');
    text(st.players.length > 1 ? 'P1 keys 1–6 · P2 numpad 1–6' : 'press 1–6 to select', W / 2, 68, 9, '#9a9ab0');
    ctx.globalAlpha = 1;
  }
  // touch chrome
  if (coarse && scene === 'play') {
    for (const [role, t] of touches) {
      if (!role.startsWith('stick')) continue;
      ctx.strokeStyle = 'rgba(245,197,66,0.5)';
      ctx.beginPath(); ctx.arc(t.ox, t.oy, 30, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(245,197,66,0.5)';
      ctx.beginPath(); ctx.arc(t.ox + t.dx * 22, t.oy + t.dy * 22, 10, 0, 7); ctx.fill();
    }
    // fire pad + weapon chip hints
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(W - 80, H - 85, 34, 0, 7); ctx.stroke();
    text('FIRE', W - 80, H - 81, 10, 'rgba(255,255,255,0.4)');
    if (st.players.length === 1) {
      panel(W - 146, 40, 130, 30, 'rgba(16,16,24,0.7)', '#4a4a60');
      text('WEAPON ↻', W - 81, 59, 10, '#9a9ab0');
    }
  }
}

/* ---------- boot ---------- */
function resize() {
  CORE.fitCanvas(cv, W, H);
}
addEventListener('resize', resize);
addEventListener('keydown', e => {
  if (e.code === 'KeyM' && (scene === 'title' || scene === 'over')) {
    save.mute = !save.mute; bus.muted = save.mute; persist();
  }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
});
cv.addEventListener('pointerdown', onDown);
cv.addEventListener('pointermove', onMove);
addEventListener('pointerup', onUp);
addEventListener('pointercancel', onUp);
resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  tick(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// read-only probe for verification
window.__bh = {
  get scene() { return scene; }, get mode() { return mode; }, get room() { return roomIdx; },
  get st() {
    if (!st) return null;
    return {
      wave: st.wave, score: st.score, mult: st.mult, over: st.over, dmWinner: st.dmWinner,
      unlockMax: st.unlockMax, zombies: st.zombies.length, queue: st.spawnQueue,
      players: st.players.map(p => ({ x: p.x, y: p.y, hp: p.hp, ammo: p.ammo, alive: p.alive, kills: p.kills, weapon: p.weapon })),
      bullets: st.bullets.length, crates: st.crates.length, barrels: st.barrels.filter(b => !b.dead).length,
    };
  },
  get muted() { return bus.muted; },
};
})();
