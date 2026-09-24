/* hardest/game.js — browser shell: canvas render, input, level select, save.
 * All game logic lives in engine.js; this file only draws and feeds input. */
(function () {
'use strict';
const E = globalThis.HardestEngine;
const STAGE_W = 960, STAGE_H = 576;
// Isolate hosted editions while preserving root and file:// development saves.
const deploymentBase = typeof location !== 'undefined' && /^https?:$/.test(location.protocol)
  ? location.pathname.match(/^(.*)\/hardest(?:\/(?:index\.html)?)?$/)?.[1] ?? ''
  : '';
const SAVE_KEY = deploymentBase ? `maga:${deploymentBase}:hardest.save.v1` : 'hardest.save.v1';
const MENU_COLS = 12;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
cv.width = STAGE_W; cv.height = STAGE_H;

/* ---------- save ---------- */
function loadSave() {
  try { return HardestSave.sanitize(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch { return HardestSave.sanitize({}); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { const el = document.getElementById('save-status'); if (el) el.textContent = 'Storage unavailable. Keep this tab open to retain progress.'; } }
let save = loadSave();

/* ---------- audio (WebAudio blips, no assets; M mutes) ---------- */
let AC = null;
function beep(f, d, type, g, slide) {
  if (save.mute) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), gn = AC.createGain();
    o.type = type || 'square'; o.frequency.value = f;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, AC.currentTime + d);
    gn.gain.value = (g || 0.05) * save.volume;
    gn.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(gn); gn.connect(AC.destination);
    o.start(); o.stop(AC.currentTime + d);
  } catch {}
}

/* ---------- medals + tiers ---------- */
const medalFor = HardestSave.medal;
const MEDAL_COL = { gold: '#ffd36a', silver: '#c9d8ed', bronze: '#d69b71' };
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = save.reducedMotion ?? motionPreference.matches;
motionPreference.addEventListener?.('change', e => { if (save.reducedMotion === null) reducedMotion = e.matches; });
const TIERS = [[10, '#7ec850', 'WARM-UP'], [20, '#9be15d', 'DEMANDING'], [30, '#ffd23f', 'BRUTAL'], [40, '#ff9f3f', 'HARD+'], [50, '#ff6f3f', 'SAVAGE'], [60, '#d21f26', 'NIGHTMARE'], [96, '#cb9ce9', 'INHUMAN'], [Infinity, '#ff3f6f', 'APEX']];
function tierOf(id) { for (const [max, c, n] of TIERS) if (id <= max) return { c, n }; }

/* ---------- levels ---------- */
let LEVELS = [];
function levelsReady() {
  const want = (globalThis.HARDEST_MANIFEST || []).length;
  return (globalThis.HARDEST_LEVELS || []).length >= want && want > 0;
}
function collectLevels() {
  LEVELS = (globalThis.HARDEST_LEVELS || []).slice().sort((a, b) => a.id - b.id);
}

/* ---------- input ---------- */
const keys = new Set();
const AXIS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
let joy = null; // {id, ox, oy, x, y}
addEventListener('keydown', e => {
  if (e.target instanceof HTMLElement && e.target.closest('select, input, dialog')) return;
  if (e.target instanceof HTMLElement && e.target.closest('button') && (e.code === 'Space' || e.code === 'Enter')) return;
  if (AXIS[e.code] || ['Space', 'Enter', 'Escape', 'KeyR', 'KeyM', 'KeyQ'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  onKey(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
function axis() {
  let x = 0, y = 0;
  for (const k of keys) if (AXIS[k]) { x += AXIS[k][0]; y += AXIS[k][1]; }
  if (joy) { x += joy.x; y += joy.y; }
  const m = Math.hypot(x, y);
  return m > 1 ? { x: x / m, y: y / m } : { x, y };
}

/* ---------- state ---------- */
let screen = 'menu';           // 'menu' | 'play' | 'pause' | 'clear'
let st = null;                 // engine state
let levelIdx = 0;
let sel = 0;                   // menu selection index
let particles = [];
let flash = 0, flashColor = '#f45059', intro = 0;
let seenDeaths = 0;
const statusEl = document.getElementById('status');
const picker = document.getElementById('picker'), levelChoice = document.getElementById('level-choice');
let pickerStamp = '';
function updatePicker() {
  picker.hidden = screen !== 'menu';
  document.querySelector('main').dataset.screen = screen;
  if (screen !== 'menu') return;
  const stamp = `${save.unlocked}:${Object.keys(save.best).length}`;
  if (stamp !== pickerStamp) {
    pickerStamp = stamp; levelChoice.replaceChildren();
    LEVELS.forEach((L, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = `${L.id}. ${L.name}${save.best[L.id] ? ' · ' + save.best[L.id].medal : ''}${i >= save.unlocked ? ' · locked' : ''}`; option.disabled = i >= save.unlocked; levelChoice.append(option); });
  }
  if (levelChoice.value !== String(sel)) levelChoice.value = String(sel);
  document.getElementById('play-level').disabled = sel >= save.unlocked;
}
levelChoice.addEventListener('change', () => { sel = Number(levelChoice.value); });
document.getElementById('play-level').addEventListener('click', () => { if (sel < save.unlocked) startLevel(sel); });
const controls = Object.fromEntries(['levels', 'pause', 'restart', 'sound', 'settings'].map(id => [id, document.getElementById(id)]));
function announce(text) { statusEl.textContent = text; }
function releaseInput() { keys.clear(); joy = null; acc = 0; }
function showMenu() { cv.focus({ preventScroll: true }); releaseInput(); screen = 'menu'; sel = levelIdx; announce('Chamber atlas. Arrow keys choose a chamber; Enter starts.'); }
function togglePause() {
  if (screen !== 'play' && screen !== 'pause') return;
  cv.focus({ preventScroll: true });
  screen = screen === 'play' ? 'pause' : 'play'; releaseInput();
  announce(screen === 'pause' ? 'Paused. Resume, restart, or choose Levels.' : 'Resumed.');
}
function toggleSound() { cv.focus({ preventScroll: true }); save.mute = !save.mute; persist(); if (!save.mute) beep(440, .08, 'sine', .03); }
controls.levels.addEventListener('click', showMenu);
controls.pause.addEventListener('click', togglePause);
controls.restart.addEventListener('click', () => { if (st) startLevel(levelIdx); });
controls.sound.addEventListener('click', toggleSound);
const settingsDialog = document.getElementById('settings-dialog');
const volumeInput = document.getElementById('volume'), motionInput = document.getElementById('motion');
volumeInput.value = String(Math.round(save.volume * 100)); motionInput.checked = reducedMotion;
document.getElementById('volume-value').value = `${volumeInput.value}%`;
controls.settings.addEventListener('click', () => {
  if (screen === 'play') togglePause();
  releaseInput(); settingsDialog.showModal();
});
settingsDialog.addEventListener('close', () => { releaseInput(); cv.focus({ preventScroll: true }); });
volumeInput.addEventListener('input', () => { save.volume = Number(volumeInput.value) / 100; document.getElementById('volume-value').value = `${volumeInput.value}%`; persist(); });
volumeInput.addEventListener('change', () => beep(660, .1, 'sine', .06));
motionInput.addEventListener('change', () => { reducedMotion = save.reducedMotion = motionInput.checked; persist(); });
document.getElementById('continue').addEventListener('click', () => { if (screen === 'pause') togglePause(); else if (screen === 'clear') onKey('Enter'); });
document.getElementById('retry-clear').addEventListener('click', () => { if (st) startLevel(levelIdx); });
document.getElementById('return-menu').addEventListener('click', showMenu);
addEventListener('blur', () => { releaseInput(); if (screen === 'play') { screen = 'pause'; announce('Paused while the game was out of focus.'); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseInput(); if (screen === 'play') screen = 'pause'; } });
let menuRects = [];
let prevCoins = 0, prevKeys = 0, prevTps = 0, prevDoors = true;

function startLevel(i) {
  if (!Number.isInteger(i) || i < 0 || i >= LEVELS.length) return;
  cv.focus({ preventScroll: true });
  releaseInput();
  levelIdx = i;
  st = E.create(LEVELS[i]);
  screen = 'play';
  particles = []; flash = 0; intro = 1.8; seenDeaths = 0;
  announce(`Level ${LEVELS[i].id}: ${LEVELS[i].name}. Collect ${st.coinsTotal} gold shards and reach the green exit.`);
  prevCoins = st.coinsLeft; prevKeys = st.keysLeft; prevTps = 0; prevDoors = st.P.doorsOpen;
}
function onKey(code) {
  if (code === 'KeyM') { toggleSound(); return; }
  if (screen === 'menu') {
    if (code === 'ArrowRight' || code === 'KeyD') sel = Math.min(LEVELS.length - 1, sel + 1);
    if (code === 'ArrowLeft' || code === 'KeyA') sel = Math.max(0, sel - 1);
    if (code === 'ArrowDown' || code === 'KeyS') sel = Math.min(LEVELS.length - 1, sel + MENU_COLS);
    if (code === 'ArrowUp' || code === 'KeyW') sel = Math.max(0, sel - MENU_COLS);
    if (AXIS[code] && LEVELS[sel]) announce(`Level ${LEVELS[sel].id}: ${LEVELS[sel].name}. ${sel < save.unlocked ? 'Enter to play.' : 'Locked.'}`);
    if (code === 'Enter' || code === 'Space') { if (sel < save.unlocked) startLevel(sel); }
  } else if (screen === 'play') {
    if (code === 'Escape') togglePause();
    if (code === 'KeyR') startLevel(levelIdx);
  } else if (screen === 'pause') {
    if (code === 'Escape') togglePause();
    if (code === 'KeyQ') showMenu();
    if (code === 'KeyR') startLevel(levelIdx);
  } else if (screen === 'clear') {
    if (code === 'Enter' || code === 'Space') {
      showMenu();
      if (levelIdx + 1 < LEVELS.length) startLevel(levelIdx + 1);
    }
    if (code === 'Escape') showMenu();
  }
}

/* pointer: menu taps + in-game joystick */
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * STAGE_W / r.width, y: (e.clientY - r.top) * STAGE_H / r.height };
}
cv.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  cv.focus({ preventScroll: true });
  const p = canvasPos(e);
  if (screen === 'menu') {
    for (const r of menuRects) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
      if (r.i < save.unlocked) startLevel(r.i);
      return;
    }
  } else if (screen === 'play' && !joy) {
    joy = { id: e.pointerId, ox: p.x, oy: p.y, x: 0, y: 0 };
    cv.setPointerCapture(e.pointerId);
  } else if (screen === 'clear') {
    showMenu();
    if (levelIdx + 1 < LEVELS.length) startLevel(levelIdx + 1);
  } else if (screen === 'pause') {
    togglePause();
  }
});
cv.addEventListener('pointermove', e => {
  if (screen === 'menu' && e.pointerType === 'mouse') {
    const p = canvasPos(e); const r = menuRects.find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (r) sel = r.i;
    cv.style.cursor = r && r.i < save.unlocked ? 'pointer' : 'default';
  }
  if (joy && e.pointerId === joy.id) {
    const p = canvasPos(e);
    let dx = (p.x - joy.ox) / 48, dy = (p.y - joy.oy) / 48;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    joy.x = dx; joy.y = dy;
  }
});
const endJoy = e => { if (joy && e.pointerId === joy.id) joy = null; };
cv.addEventListener('pointerup', endJoy);
cv.addEventListener('pointercancel', endJoy);
cv.addEventListener('lostpointercapture', endJoy);

/* ---------- render ---------- */
const COL = {
  bg: '#101c29', floorA: '#dce9e9', floorB: '#d5e3e4', wall: '#213847', wallEdge: '#344f5d',
  zone: '#7fc9a7', zoneG: '#97ebc0', player: '#ed735e', playerEdge: '#96493e',
  dot: '#3479da', dotEdge: '#19426d', coin: '#ffd071', coinEdge: '#c18a39',
  door: '#a06828', doorEdge: '#6e4517', pad: '#3fd2d2', padEdge: '#1a7f8f',
  mover: '#263b49', moverEdge: '#e7a855',
  text: '#e8f2f3', dim: '#92afbf', lock: '#172a39',
};
function levelOrigin() {
  return { x: Math.floor((STAGE_W - st.P.pxW) / 2), y: Math.floor((STAGE_H - st.P.pxH) / 2) };
}
function draw() {
  updatePicker();
  const runStatus = document.getElementById('run-status'); runStatus.hidden = screen === 'menu';
  if (st && screen !== 'menu') {
    document.getElementById('run-chamber').textContent = `Chamber ${LEVELS[levelIdx].id}`;
    document.getElementById('run-objective').textContent = st.coinsLeft ? `${st.coinsLeft} shards left` : 'Exit armed';
    document.getElementById('run-deaths').textContent = `${st.deaths} deaths · ${st.time.toFixed(1)}s`;
  }
  document.getElementById('overlay-actions').hidden = screen !== 'pause' && screen !== 'clear';
  document.getElementById('continue').textContent = screen === 'pause' ? 'Resume run' : levelIdx + 1 < LEVELS.length ? 'Next chamber →' : 'Chamber atlas';
  document.getElementById('retry-clear').textContent = screen === 'pause' ? 'Retry chamber' : st && st.deaths === 0 ? 'Improve time' : 'Try for gold';
  controls.pause.disabled = screen !== 'play' && screen !== 'pause';
  controls.pause.textContent = screen === 'pause' ? 'Resume' : 'Pause';
  controls.restart.disabled = !st || screen === 'menu';
  controls.sound.textContent = save.mute ? 'Sound off' : 'Sound on';
  controls.sound.setAttribute('aria-pressed', String(save.mute));
  controls.sound.setAttribute('aria-label', save.mute ? 'Turn sound on' : 'Mute sound');
  ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.textBaseline = 'alphabetic';
  ctx.strokeStyle = '#1b2330'; ctx.lineWidth = 1;
  for (let x = 0; x < STAGE_W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, STAGE_H); ctx.stroke(); }
  for (let y = 0; y < STAGE_H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(STAGE_W, y); ctx.stroke(); }
  if (screen === 'menu') return drawMenu();
  cv.style.cursor = 'default';
  const o = levelOrigin(), T = E.TILE, P = st.P;
  // floor + zones + doors + pads
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    const ch = P.grid[y][x];
    if (ch === '#') continue;
    ctx.fillStyle = (x + y) % 2 ? COL.floorA : COL.floorB;
    if (ch === 'S' || ch === 'K') ctx.fillStyle = COL.zone;
    if (ch === 'G') ctx.fillStyle = st.coinsLeft ? '#63965b' : COL.zoneG;
    if (ch === 'D') ctx.fillStyle = st.P.doorsOpen ? COL.floorA : COL.door;
    if (ch === 'T') ctx.fillStyle = '#b8dfdf';
    ctx.fillRect(o.x + x * T, o.y + y * T, T, T);
    if (ch === 'K') {
      ctx.fillStyle = '#275e35'; ctx.fillRect(o.x + x * T + 10, o.y + y * T + 7, 2, 19);
      ctx.beginPath(); ctx.moveTo(o.x + x * T + 12, o.y + y * T + 7); ctx.lineTo(o.x + x * T + 24, o.y + y * T + 12); ctx.lineTo(o.x + x * T + 12, o.y + y * T + 17); ctx.fill();
    }
    if (ch === 'G') { ctx.fillStyle = '#255c32'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillText(st.coinsLeft ? '·' : '✓', o.x + x * T + 16, o.y + y * T + 22); }
  }
  // walls
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    if (P.grid[y][x] !== '#') continue;
    ctx.fillStyle = COL.wall; ctx.fillRect(o.x + x * T, o.y + y * T, T, T);
    ctx.fillStyle = COL.wallEdge; ctx.fillRect(o.x + x * T, o.y + y * T, T, 2);
    ctx.fillStyle = '#192e3c'; ctx.fillRect(o.x + x * T + T - 1, o.y + y * T + 2, 1, T - 2);
  }
  // closed doors get a frame so they read as doors, not walls
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    if (P.grid[y][x] !== 'D' || st.P.doorsOpen) continue;
    ctx.fillStyle = COL.doorEdge;
    ctx.fillRect(o.x + x * T, o.y + y * T, T, 3);
    ctx.fillRect(o.x + x * T, o.y + y * T + T - 3, T, 3);
  }
  // movers — sliding wall blocks (wall-dark body, hazard-orange edge + stripe)
  for (const mv of P.movers) {
    const r = E.moverRect(mv, st.t);
    ctx.fillStyle = COL.mover; ctx.fillRect(o.x + r.x, o.y + r.y, r.w, r.h);
    ctx.strokeStyle = COL.moverEdge; ctx.lineWidth = 2;
    ctx.strokeRect(o.x + r.x + 1, o.y + r.y + 1, r.w - 2, r.h - 2);
    ctx.fillStyle = COL.moverEdge;
    if (r.w >= r.h) ctx.fillRect(o.x + r.x + r.w / 2 - 1, o.y + r.y + 4, 2, r.h - 8);
    else ctx.fillRect(o.x + r.x + 4, o.y + r.y + r.h / 2 - 1, r.w - 8, 2);
  }
  // teleport pads
  for (const [tx, ty] of P.telepads) {
    const px = o.x + tx * T + T / 2, py = o.y + ty * T + T / 2;
    ctx.strokeStyle = COL.padEdge; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 11, 0, 7); ctx.stroke();
    ctx.strokeStyle = COL.pad; ctx.lineWidth = 2;
    const spin = reducedMotion ? 0 : st.t * 2;
    ctx.beginPath(); ctx.arc(px, py, 6, spin, spin + Math.PI * 1.5); ctx.stroke();
  }
  // coins
  for (const c of st.coins) {
    if (c.taken) continue;
    ctx.fillStyle = COL.coinEdge; ctx.beginPath(); ctx.arc(o.x + c.x, o.y + c.y, c.r + 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = COL.coin; ctx.beginPath(); ctx.arc(o.x + c.x, o.y + c.y, c.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff2b7'; ctx.fillRect(o.x + c.x - 2, o.y + c.y - 4, 2, 6);
    if (!reducedMotion) { ctx.globalAlpha = .3 + .2 * Math.sin(st.t * 4 + c.tx); ctx.strokeStyle = '#ffcb38'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(o.x + c.x, o.y + c.y, c.r + 4, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  // keys
  for (const k of st.keys) {
    if (k.taken) continue;
    ctx.fillStyle = COL.coinEdge; ctx.beginPath(); ctx.arc(o.x + k.x - 2, o.y + k.y, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = COL.coin; ctx.beginPath(); ctx.arc(o.x + k.x - 2, o.y + k.y, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = COL.coinEdge; ctx.fillRect(o.x + k.x + 1, o.y + k.y - 1.5, 8, 3);
    ctx.fillRect(o.x + k.x + 6, o.y + k.y + 1, 2, 4); ctx.fillRect(o.x + k.x + 9, o.y + k.y + 1, 2, 4);
  }
  // dots
  for (const d of P.patrols) {
    const p = E.dotPos(d, st.t);
    ctx.fillStyle = COL.dotEdge; ctx.beginPath(); ctx.arc(o.x + p.x, o.y + p.y, d.r + 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = COL.dot; ctx.beginPath(); ctx.arc(o.x + p.x, o.y + p.y, d.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#a7c3ff'; ctx.beginPath(); ctx.arc(o.x + p.x - 2, o.y + p.y - 2, 1.7, 0, 7); ctx.fill();
  }
  // player
  if (st.status !== 'dead') {
    ctx.fillStyle = COL.playerEdge; ctx.fillRect(o.x + st.player.x - 1, o.y + st.player.y - 1, st.player.w + 2, st.player.h + 2);
    ctx.fillStyle = COL.player; ctx.fillRect(o.x + st.player.x, o.y + st.player.y, st.player.w, st.player.h);
    ctx.fillStyle = '#ffd3b1'; ctx.fillRect(o.x + st.player.x + 3, o.y + st.player.y + 3, st.player.w - 6, 3);
    ctx.fillStyle = '#bc5447'; ctx.fillRect(o.x + st.player.x + 3, o.y + st.player.y + st.player.h - 5, st.player.w - 6, 2);
  }
  // particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.4);
    ctx.fillStyle = p.color || COL.player;
    ctx.fillRect(o.x + p.x, o.y + p.y, p.s, p.s);
  }
  ctx.globalAlpha = 1;
  // joystick hint
  if (joy) {
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 48, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(210,31,38,.5)'; ctx.beginPath(); ctx.arc(joy.ox + joy.x * 36, joy.oy + joy.y * 36, 14, 0, 7); ctx.fill();
  }
  if (flash > 0 && !reducedMotion) { ctx.globalAlpha = flash * .3; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, STAGE_W, STAGE_H); ctx.globalAlpha = 1; }
  drawHud();
  if (intro > 0 && screen === 'play') { ctx.globalAlpha = Math.min(1, intro); ctx.fillStyle = '#101722e8'; ctx.fillRect(260, 510, 440, 34); ctx.fillStyle = '#e7eef9'; ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.fillText(`${LEVELS[levelIdx].id} / ${LEVELS.length}  ·  ${LEVELS[levelIdx].name}`, 480, 532); ctx.globalAlpha = 1; }
  if (screen === 'pause') overlay('TAKE A BREATH', 'Read the room. Find the rhythm. Make your move.');
  if (screen === 'clear') {
    const par = (globalThis.HARDEST_PARS || {})[LEVELS[levelIdx].id];
    const parTxt = par ? ` · par ${par}s ${st.time <= par ? 'BEATEN' : 'missed'}` : '';
    overlay(Object.keys(save.best).length === LEVELS.length ? 'VAULT COMPLETE' : `CHAMBER CLEAR / ${medalFor(st.deaths).toUpperCase()}`, `deaths ${st.deaths} · time ${st.time.toFixed(1)}s${parTxt}`);
  }
}
function drawHud() {
  const L = LEVELS[levelIdx];
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, STAGE_W, 26);
  ctx.fillStyle = COL.text; ctx.font = '14px monospace'; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText(`CH ${String(L.id).padStart(3, '0')} / ${L.name}`, 10, 14);
  ctx.textAlign = 'center';
  const mid = st.keysTotal > 0 ? `SHARDS ${st.coinsTotal - st.coinsLeft}/${st.coinsTotal}  KEYS ${st.keysTotal - st.keysLeft}/${st.keysTotal}` : `SHARDS ${st.coinsTotal - st.coinsLeft}/${st.coinsTotal}`;
  ctx.fillText(mid, STAGE_W / 2, 14);
  ctx.textAlign = 'right';
  const par = (globalThis.HARDEST_PARS || {})[L.id];
  ctx.fillText(`DEATHS ${st.deaths}   ${st.time.toFixed(1)}s${par ? ` / PAR ${par}s` : ''}`, STAGE_W - 10, 14);
}
function overlay(title, sub) {
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.fillStyle = COL.text; ctx.textAlign = 'center';
  ctx.font = '700 34px system-ui'; ctx.fillText(title, STAGE_W / 2, STAGE_H / 2 - 20);
  ctx.font = '14px system-ui'; ctx.fillStyle = '#c0d2dc'; ctx.fillText(sub, STAGE_W / 2, STAGE_H / 2 + 24);
}
function drawCompactMenu() {
  const L = LEVELS[sel]; if (!L) return;
  const locked = sel >= save.unlocked, best = save.best[L.id], tier = tierOf(L.id);
  menuRects = [{ x: 0, y: 0, w: STAGE_W, h: STAGE_H, i: sel }];
  ctx.textAlign = 'left'; ctx.fillStyle = '#8eb1bd'; ctx.font = '600 26px system-ui';
  ctx.fillText(`CHAMBER ${String(L.id).padStart(3, '0')} / ${tier.n}`, 56, 70);
  ctx.fillStyle = '#e7f2f2'; ctx.font = '750 56px system-ui'; ctx.fillText(L.name, 52, 146, 860);
  ctx.fillStyle = '#83ddd2'; ctx.font = '700 54px system-ui'; ctx.fillText(`${Object.keys(save.best).length} / 114`, 56, 265);
  ctx.fillStyle = '#8eb1bd'; ctx.font = '26px system-ui'; ctx.fillText('CHAMBERS CLEARED', 56, 308);
  ctx.fillStyle = '#bfd8df'; ctx.font = '28px system-ui';
  ctx.fillText(locked ? 'Access locked.' : best ? `${best.medal.toUpperCase()} · ${best.deaths} deaths` : 'A fresh route awaits.', 56, 402);
  const scale = Math.min(326 / L.map[0].length, 220 / L.map.length), mx = 720 - L.map[0].length * scale / 2, my = 209;
  L.map.forEach((row,y)=>[...row].forEach((ch,x)=>{ctx.fillStyle=ch==='#'?'#35505e':'SKG'.includes(ch)?'#7fc9a7':'cC'.includes(ch)?'#e9bd6d':ch==='T'?'#70d8d0':ch==='D'?'#bb8b53':'#819da7';ctx.fillRect(mx+x*scale,my+y*scale,Math.ceil(scale),Math.ceil(scale));}));
  ctx.fillStyle = '#294857'; ctx.fillRect(56, 471, 848, 2);
  ctx.fillStyle = locked ? '#8eb1bd' : '#83ddd2'; ctx.font = '600 27px system-ui';
  ctx.fillText(locked ? 'Clear the previous chamber to unlock.' : 'Choose above. Tap the board to begin. →', 56, 533);
}
function drawMenu() {
  if (cv.getBoundingClientRect().width < 600) return drawCompactMenu();
  const completed = Object.keys(save.best).length;
  const golds = Object.values(save.best).filter(b => b.medal === 'gold').length;
  ctx.textAlign = 'left'; ctx.fillStyle = '#77dbd1'; ctx.font = '600 11px system-ui';
  ctx.fillText('THE CHAMBER ATLAS', 36, 34);
  ctx.fillStyle = COL.text; ctx.font = '750 44px system-ui'; ctx.fillText('A route through the impossible.', 34, 86);
  ctx.font = '14px system-ui'; ctx.fillStyle = COL.dim; ctx.fillText('Watch. Commit. Try again. Every chamber has a way through.', 36, 114);
  ctx.fillStyle = '#2b4657'; ctx.fillRect(36, 136, 888, 1);
  ctx.textAlign = 'right'; ctx.font = '600 11px system-ui'; ctx.fillStyle = '#9fbbc8';
  ctx.fillText(`${completed} / ${LEVELS.length} CLEARED    ·    ${golds} GOLD    ·    ${save.deaths} DEATHS`, 924, 34);
  menuRects = [];
  const bw = 44, bh = 30, gx = 6, gy = 6, x0 = 36, y0 = 162;
  for (let i = 0; i < LEVELS.length; i++) {
    const x = x0 + i % MENU_COLS * (bw + gx), y = y0 + Math.floor(i / MENU_COLS) * (bh + gy);
    const locked = i >= save.unlocked, selected = i === sel, b = save.best[LEVELS[i].id];
    menuRects.push({ x, y, w: bw, h: bh, i });
    ctx.fillStyle = selected ? '#436b76' : b ? '#203e46' : locked ? '#142634' : '#2b4351'; ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = selected ? '#8be6d6' : locked ? '#233c4a' : '#4e7786'; ctx.lineWidth = selected ? 2 : 1; ctx.strokeRect(x + .5, y + .5, bw - 1, bh - 1);
    ctx.textAlign = 'center'; ctx.font = selected ? '700 13px system-ui' : '500 12px system-ui';
    ctx.fillStyle = locked ? '#55707f' : selected ? '#edf9f3' : '#b6d5dc';
    ctx.fillText(String(LEVELS[i].id).padStart(2, '0'), x + bw / 2, y + 20);
    if (b) { ctx.fillStyle = MEDAL_COL[b.medal]; ctx.fillRect(x + bw - 6, y + 3, 3, 3); }
    else if (locked) { ctx.fillStyle = '#48616e'; ctx.fillRect(x + bw - 5, y + 3, 2, 2); }
  }
  const chosen = LEVELS[sel];
  if (chosen) {
    const tier = tierOf(chosen.id), best = save.best[chosen.id], locked = sel >= save.unlocked;
    ctx.fillStyle = '#172c3a'; ctx.fillRect(662, 162, 262, 354);
    ctx.fillStyle = tier.c; ctx.fillRect(662, 162, 262, 3);
    ctx.textAlign = 'left'; ctx.fillStyle = '#88a5b6'; ctx.font = '600 10px system-ui'; ctx.fillText(`CHAMBER ${String(chosen.id).padStart(3, '0')} / ${tier.n}`, 682, 191);
    ctx.fillStyle = '#e4eff0'; ctx.font = '700 22px system-ui'; ctx.fillText(chosen.name, 682, 225, 222);
    const scale = Math.min(218 / chosen.map[0].length, 125 / chosen.map.length);
    const mx = 793 - chosen.map[0].length * scale / 2, my = 249;
    chosen.map.forEach((row, y) => [...row].forEach((ch, x) => {
      ctx.fillStyle = ch === '#' ? '#35505e' : 'SKG'.includes(ch) ? '#7fc9a7' : 'cC'.includes(ch) ? '#e9bd6d' : ch === 'T' ? '#70d8d0' : ch === 'D' ? '#bb8b53' : '#819da7';
      ctx.fillRect(mx + x * scale, my + y * scale, Math.ceil(scale), Math.ceil(scale));
    }));
    ctx.fillStyle = '#9bb6c4'; ctx.font = '12px system-ui';
    ctx.fillText(locked ? 'Clear the previous chamber to unlock.' : best ? `Best: ${best.deaths} deaths · ${best.bestTime.toFixed(1)}s` : 'A fresh route. A clean slate.', 682, 407);
    ctx.fillStyle = locked ? '#4f6e7c' : '#83ddd2'; ctx.font = '700 12px system-ui';
    ctx.fillText(locked ? 'ACCESS LOCKED' : 'ENTER / TAP TO BEGIN →', 682, 445);
    ctx.fillStyle = '#294857'; ctx.fillRect(682, 471, 222, 3); ctx.fillStyle = '#79d5bd'; ctx.fillRect(682, 471, 222 * completed / LEVELS.length, 3);
    ctx.fillStyle = '#728f9f'; ctx.font = '10px system-ui'; ctx.fillText('A little farther, every time.', 682, 497);
  }
  ctx.textAlign = 'left'; ctx.fillStyle = '#6c899a'; ctx.font = '11px system-ui';
  ctx.fillText('Choose a chamber with arrow keys or the selector above.', 36, 552);
  ctx.textAlign = 'right'; ctx.fillStyle = '#90adbb'; ctx.fillText('GOLD 0 DEATHS  /  SILVER ≤2  /  BRONZE CLEAR', 924, 552);
}

/* ---------- loop ---------- */
let acc = 0, last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
  flash = Math.max(0, flash - dt * 4); intro = Math.max(0, intro - dt);
  if (screen === 'play') {
    acc += dt;
    const input = axis();
    while (acc + 1e-9 >= E.STEP) { E.step(st, input, E.STEP); acc = Math.max(0, acc - E.STEP); }
    if (st.deaths > seenDeaths) {
      save.deaths += st.deaths - seenDeaths; seenDeaths = st.deaths; persist();
      flash = 1; flashColor = '#e73845';
      beep(160, 0.18, 'sawtooth', 0.06, 60);
      if (!reducedMotion) for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.283, v = 60 + Math.random() * 140;
        particles.push({ x: st.player.x + st.player.w / 2, y: st.player.y + st.player.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 3 + Math.random() * 3, life: 0.4 });
      }
    }
    if (st.coinsLeft < prevCoins) {
      beep(660 * Math.pow(1.06, Math.min(20, st.coinsTotal - st.coinsLeft)), 0.12, 'sine', 0.06);
      if (!reducedMotion) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; particles.push({ x: st.player.x + 10, y: st.player.y + 10, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, s: 3, life: .35, color: COL.coin }); }
      if (!st.coinsLeft) announce('All shards collected. Reach the green exit.');
    }
    if (st.keysLeft < prevKeys) beep(660, 0.12, 'triangle', 0.06);
    if (st.P.doorsOpen && !prevDoors) beep(220, 0.3, 'triangle', 0.06, 440);
    if (st.teleports > prevTps) beep(440, 0.15, 'sine', 0.06, 880);
    prevCoins = st.coinsLeft; prevKeys = st.keysLeft; prevTps = st.teleports; prevDoors = st.P.doorsOpen;
    if (st.status === 'clear') {
      const L = LEVELS[levelIdx];
      HardestSave.record(save, L.id, st.deaths, st.time, LEVELS.length);
      flash = 1; flashColor = '#79d99b';
      announce(`Level ${L.id} clear. ${medalFor(st.deaths)} medal, ${st.deaths} deaths, ${st.time.toFixed(1)} seconds. Enter or tap to continue.`);
      releaseInput();
      persist();
      beep(523, 0.12, 'square', 0.05); setTimeout(() => beep(659, 0.12, 'square', 0.05), 110); setTimeout(() => beep(784, 0.2, 'square', 0.05), 220);
      screen = 'clear';
    }
  }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  draw();
}

/* ---------- boot + probe hook ---------- */
function boot() {
  if (!levelsReady()) return setTimeout(boot, 30);
  collectLevels();
  save = HardestSave.sanitize(save, LEVELS.length); persist();
  sel = Math.min(LEVELS.length - 1, save.unlocked - 1);
  announce(`${LEVELS.length} levels ready. Arrow keys choose a level; Enter starts.`);
  requestAnimationFrame(frame);
}
globalThis.__hardest = {
  state: () => ({ screen, level: LEVELS[levelIdx] && LEVELS[levelIdx].id, status: st && st.status, deaths: st && st.deaths, coinsLeft: st && st.coinsLeft, keysLeft: st && st.keysLeft, teleports: st && st.teleports, doorsOpen: st && st.P.doorsOpen, time: st && st.time, unlocked: save.unlocked, levels: LEVELS.length }),
  start: i => startLevel(i),
  input: (x, y) => { joy = { id: -1, ox: 0, oy: 0, x, y }; }, // probe-only drive
  engine: () => st,
};
boot();
})();
