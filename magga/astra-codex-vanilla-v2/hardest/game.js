/* hardest/game.js — browser shell: canvas render, input, level select, save.
 * All game logic lives in engine.js; this file only draws and feeds input. */
(function () {
'use strict';
const E = globalThis.HardestEngine;
const STAGE_W = 960, STAGE_H = 576;
const SAVE_KEY = 'hardest.save.v1';
const MENU_COLS = 3;
const MEDAL_COL = {gold:"#f8cd69",silver:"#bbcad4",bronze:"#c9946c"};

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
cv.width = STAGE_W; cv.height = STAGE_H;

/* ---------- save ---------- */
function loadSave(){try{return RedlineSave.clean(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch{return RedlineSave.clean(null);}}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} }
let save = loadSave();

/* ---------- audio (WebAudio blips, no assets; M mutes) ---------- */
let AC=null, master=null, musicStep=-1, audioNotes=0;
function unlockAudio(){
  try{if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.connect(AC.destination);}if(AC.state==='suspended')AC.resume();master.gain.value=save.mute?0:save.volume;}catch{}
}
function beep(f,d,type,g,slide){
  if(save.mute||!AC)return;
  try{const o=AC.createOscillator(),gn=AC.createGain();o.type=type||'square';o.frequency.value=f;
    if(slide)o.frequency.exponentialRampToValueAtTime(slide,AC.currentTime+d);
    gn.gain.setValueAtTime(g||.04,AC.currentTime);gn.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);
    o.connect(gn);gn.connect(master);o.start();o.stop(AC.currentTime+d);o.onended=()=>{o.disconnect();gn.disconnect();};audioNotes++;
  }catch{}
}
function musicTick(){
  if(screen!=='play'||!save.music||save.mute||!AC)return;
  const beat=Math.floor(st.time/.3);if(beat===musicStep)return;musicStep=beat;
  const roots=[146.83,130.81,116.54,130.81],root=roots[Math.floor(beat/16)%4];
  const arp=[1,1.5,2,1.2,1,1.5,2.4,2];beep(root*arp[beat%8],.24,'triangle',.023);
  if(beat%4===0)beep(root/2,.5,'sine',.04);
  if(beat%2===0)beep(74,.045,'triangle',.023,36);
}
function soundChanged(){unlockAudio();persist();uiKey='';}
/* ---------- medals + tiers ---------- */
function medalFor(d) { return d === 0 ? 'gold' : d <= 2 ? 'silver' : 'bronze'; }
const TIERS = [[10, '#7ec850', 'WARM-UP'], [20, '#9be15d', 'DEMANDING'], [30, '#ffd23f', 'BRUTAL'], [40, '#ff9f3f', 'HARD+'], [50, '#ff6f3f', 'SAVAGE'], [60, '#d21f26', 'NIGHTMARE'], [120, '#b04fd8', 'INHUMAN'], [Infinity, '#ff3f6f', 'APEX']];
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
  if(e.target instanceof HTMLInputElement)return;
  if(e.target instanceof HTMLButtonElement && ['Enter','Space'].includes(e.code))return;
  unlockAudio();
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
let prevStatus = 'play';
let menuRects = [];
let prevCoins = 0, prevKeys = 0, prevTps = 0, prevDoors = true;

function startLevel(i) {
  if(!LEVELS[i]||i>=save.unlocked)return;
  levelIdx = i;
  keys.clear();joy=null;acc=0;musicStep=-1;sel=i;uiKey='';
  st = E.create(LEVELS[i]);
  screen = 'play';
  particles = [];
  prevStatus = 'play';
  prevCoins = st.coinsLeft; prevKeys = st.keysLeft; prevTps = 0; prevDoors = st.P.doorsOpen;
  syncUI();
}
function onKey(code) {
  if (screen === 'menu') {
    if (code === 'ArrowRight' || code === 'KeyD') sel = Math.min(LEVELS.length - 1, sel + 1);
    if (code === 'ArrowLeft' || code === 'KeyA') sel = Math.max(0, sel - 1);
    if (code === 'ArrowDown' || code === 'KeyS') sel = Math.min(LEVELS.length - 1, sel + MENU_COLS);
    if (code === 'ArrowUp' || code === 'KeyW') sel = Math.max(0, sel - MENU_COLS);
    if (code === 'Enter' || code === 'Space') { if (sel < save.unlocked) startLevel(sel); }
    if (code === 'KeyM') { save.mute = !save.mute; soundChanged(); }
  } else if (screen === 'play') {
    if (code === 'Escape') {screen='pause';keys.clear();joy=null;}
    if (code === 'KeyM') { save.mute = !save.mute; soundChanged(); }
    if (code === 'KeyR') { save.deaths += st.deaths; persist(); startLevel(levelIdx); }
  } else if (screen === 'pause') {
    if (code === 'Escape' || code === 'Enter') screen = 'play';
    if (code === 'KeyM') { save.mute = !save.mute; soundChanged(); }
    if (code === 'KeyQ') { save.deaths += st.deaths; persist(); screen = 'menu'; }
    if (code === 'KeyR') { save.deaths += st.deaths; persist(); startLevel(levelIdx); }
  } else if (screen === 'clear') {
    if (code === 'Enter' || code === 'Space') {
      screen = 'menu';
      if (levelIdx + 1 < LEVELS.length) startLevel(levelIdx + 1);
    }
    if (code === 'KeyM') { save.mute = !save.mute; soundChanged(); }
    if (code === 'Escape') screen = 'menu';
  }
}

/* pointer: menu taps + in-game joystick */
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * STAGE_W / r.width, y: (e.clientY - r.top) * STAGE_H / r.height };
}
cv.addEventListener('pointerdown', e => {
  unlockAudio();
  const p = canvasPos(e);
  if (screen === 'menu') {
    for (const r of menuRects) if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
      if (r.i < save.unlocked) startLevel(r.i);
      return;
    }
  } else if (screen === 'play') {
    joy = { id: e.pointerId, ox: p.x, oy: p.y, x: 0, y: 0 };
    cv.setPointerCapture(e.pointerId);
  } else if (screen === 'clear') {
    screen = 'menu';
    if (levelIdx + 1 < LEVELS.length) startLevel(levelIdx + 1);
  } else if (screen === 'pause') {
    screen = 'play';
  }
});
cv.addEventListener('pointermove', e => {
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
addEventListener('pointerup',endJoy);
addEventListener('pointercancel',endJoy);
function loseFocus(){keys.clear();joy=null;if(screen==='play')screen='pause';}
addEventListener('blur',loseFocus);
document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});

/* ---------- render ---------- */
const COL = {
  bg: '#15232f', floorA: '#eee9dc', floorB: '#e4dfd3', wall: '#30434f', wallEdge: '#20313d',
  zone: '#7ec850', zoneG: '#9be15d', player: '#d21f26', playerEdge: '#8f1218',
  dot: '#1f4fd2', dotEdge: '#12307f', coin: '#ffd23f', coinEdge: '#c8a000',
  door: '#a06828', doorEdge: '#6e4517', pad: '#3fd2d2', padEdge: '#1a7f8f',
  mover: '#3d3d3d', moverEdge: '#ff9f3f',
  text: '#f2f2f2', dim: '#9a9a9a', lock: '#3a3a3a',
};
function levelOrigin() {
  return { x: Math.floor((STAGE_W - st.P.pxW) / 2), y: Math.floor((STAGE_H - st.P.pxH) / 2) };
}
function draw() {
  ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  if (screen === 'menu' || !st) return;
  const o = levelOrigin(), T = E.TILE, P = st.P;
  // floor + zones + doors + pads
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    const ch = P.grid[y][x];
    if (ch === '#') continue;
    ctx.fillStyle = (x + y) % 2 ? COL.floorA : COL.floorB;
    if (ch === 'S' || ch === 'K') ctx.fillStyle = COL.zone;
    if (ch === 'G') ctx.fillStyle = COL.zoneG;
    if (ch === 'D') ctx.fillStyle = st.P.doorsOpen ? COL.floorA : COL.door;
    if (ch === 'T') ctx.fillStyle = '#bfeeee';
    ctx.fillRect(o.x + x * T, o.y + y * T, T, T);
  }
  // walls
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    if (P.grid[y][x] !== '#') continue;
    ctx.fillStyle = COL.wall; ctx.fillRect(o.x + x * T, o.y + y * T, T, T);
    ctx.fillStyle = COL.wallEdge; ctx.fillRect(o.x + x * T, o.y + y * T, T, 3);
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
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.stroke();
  }
  // coins
  for (const c of st.coins) {
    if (c.taken) continue;
    ctx.fillStyle = COL.coinEdge; ctx.beginPath(); ctx.arc(o.x + c.x, o.y + c.y, c.r + 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = COL.coin; ctx.beginPath(); ctx.arc(o.x + c.x, o.y + c.y, c.r, 0, 7); ctx.fill();
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
  }
  // player
  if (st.status !== 'dead') {
    ctx.fillStyle = COL.playerEdge; ctx.fillRect(o.x + st.player.x - 1, o.y + st.player.y - 1, st.player.w + 2, st.player.h + 2);
    ctx.fillStyle = COL.player; ctx.fillRect(o.x + st.player.x, o.y + st.player.y, st.player.w, st.player.h);
  }
  // particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.4);
    ctx.fillStyle = COL.player;
    ctx.fillRect(o.x + p.x, o.y + p.y, p.s, p.s);
  }
  ctx.globalAlpha = 1;
  // joystick hint
  if (joy) {
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 48, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(210,31,38,.5)'; ctx.beginPath(); ctx.arc(joy.ox + joy.x * 36, joy.oy + joy.y * 36, 14, 0, 7); ctx.fill();
  }
  drawHud();

}
function drawHud() {
  const L = LEVELS[levelIdx];
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, STAGE_W, 26);
  ctx.fillStyle = COL.text; ctx.font = '14px monospace'; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText(`LVL ${L.id} — ${L.name}`, 10, 14);
  ctx.textAlign = 'center';
  const mid = st.keysTotal > 0 ? `COINS ${st.coinsTotal - st.coinsLeft}/${st.coinsTotal}  KEYS ${st.keysTotal - st.keysLeft}/${st.keysTotal}` : `COINS ${st.coinsTotal - st.coinsLeft}/${st.coinsTotal}`;
  ctx.fillText(mid, STAGE_W / 2, 14);
  ctx.textAlign = 'right';
  const par = (globalThis.HARDEST_PARS || {})[L.id];
  ctx.fillText(`DEATHS ${st.deaths}   ${st.time.toFixed(1)}s${par ? ` / PAR ${par}s` : ''}`, STAGE_W - 10, 14);
}
/* DOM shell: responsive target sizes and keyboard-accessible state exits. */
const $=id=>document.getElementById(id);
let uiKey='', menuPage=0;
const chapterNames=['First principles','Crosscurrents','Lock & key','Folded space','Pressure tests','The narrow way','Worlds within','No easy exits','Moving mountains','The final passage'];
function menu(){if(st && screen!=='clear'&&screen!=='menu'){save.deaths+=st.deaths;persist();}screen='menu';keys.clear();joy=null;sel=Math.min(sel,save.unlocked-1);menuPage=Math.floor(sel/12);uiKey='';}
function retry(){if(st){if(screen!=='clear'){save.deaths+=st.deaths;persist();}startLevel(levelIdx);}}
function nextLevel(){if(screen==='clear'&&levelIdx+1<LEVELS.length)startLevel(levelIdx+1);else if(screen==='clear')menu();else screen='play';}
$('brand').onclick=e=>{e.preventDefault();menu();};
$('continue').onclick=()=>{unlockAudio();startLevel(save.unlocked-1);};
$('prev').onclick=()=>{menuPage=Math.max(0,menuPage-1);sel=menuPage*12;uiKey='';};
$('next').onclick=()=>{menuPage=Math.min(Math.ceil(LEVELS.length/12)-1,menuPage+1);sel=menuPage*12;uiKey='';};
$('pause').onclick=()=>{if(screen==='play'){screen='pause';keys.clear();joy=null;}else if(screen==='pause')screen='play';};
$('restart').onclick=retry;$('retry').onclick=retry;$('menu-button').onclick=menu;$('select').onclick=menu;
$('resume').onclick=()=>{unlockAudio();nextLevel();};
$('mute').onclick=()=>{save.mute=!save.mute;soundChanged();};
$('music').onclick=()=>{save.music=!save.music;soundChanged();};
$('volume').value=save.volume*100;
$('volume').oninput=e=>{save.volume=+e.target.value/100;soundChanged();};
for(const button of document.querySelectorAll('[data-dir]')){
  button.onpointerdown=e=>{e.preventDefault();unlockAudio();if(screen!=='play')return;keys.add(button.dataset.dir);button.setPointerCapture(e.pointerId);};
  button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.dir);
  button.onlostpointercapture=()=>keys.delete(button.dataset.dir);
}
function syncUI(){
  const key=[screen,sel,save.unlocked,Object.keys(save.best).length,save.mute,save.music,save.volume].join('|');if(uiKey===key)return;uiKey=key;
  $('menu').hidden=screen!=='menu';cv.hidden=screen==='menu';$('dialog').hidden=!['pause','clear'].includes(screen);
  $('pause').disabled=!['play','pause'].includes(screen);$('pause').textContent=screen==='pause'?'Resume':'Pause';
  $('restart').disabled=screen==='menu';$('menu-button').disabled=screen==='menu';
  $('mute').textContent=save.mute?'Sound off':'Sound on';$('mute').setAttribute('aria-pressed',String(save.mute));$('music').textContent=save.music?'Music on':'Music off';
  if(screen==='menu'){
    menuPage=Math.floor(sel/12);
    $('chapter-number').textContent=`CHAPTER ${String(menuPage+1).padStart(2,'0')} / 10`;
    $('chapter-name').textContent=chapterNames[menuPage];$('prev').disabled=menuPage===0;$('next').disabled=menuPage===9;
    $('continue').textContent=save.unlocked===1?'Start your run →':`Continue · room ${save.unlocked} →`;
    $('journey').textContent=`${Object.keys(save.best).length} / 114 rooms cleared · ${save.deaths} total deaths`;
    $('levels').replaceChildren();
    for(let i=menuPage*12;i<Math.min(LEVELS.length,(menuPage+1)*12);i++){
      const l=LEVELS[i],b=save.best[l.id],btn=document.createElement('button');btn.className='level'+(i===sel?' selected':'');btn.dataset.level=i;btn.disabled=i>=save.unlocked;
      const num=document.createElement('strong');num.textContent=String(l.id).padStart(2,'0');const name=document.createElement('span');name.textContent=l.name;
      const medal=document.createElement('em');medal.textContent=b?'●':i>=save.unlocked?'LOCKED':'';if(b)medal.style.color=MEDAL_COL[b.medal];
      btn.append(num,name,medal);btn.title=b?`${b.medal}: ${b.deaths} deaths, ${b.time.toFixed(1)} seconds`:l.name;
      btn.onclick=()=>{unlockAudio();startLevel(i);};$('levels').append(btn);
    }
  }
  if(screen==='pause'){$('dialog-kicker').textContent='TAKE A BREATH';$('dialog-title').textContent='Paused';$('dialog-detail').textContent='The pattern will wait. Your next move is yours.';$('resume').textContent='Resume →';}
  if(screen==='clear'){
    const last=levelIdx===LEVELS.length-1,par=(globalThis.HARDEST_PARS||{})[LEVELS[levelIdx].id];
    $('dialog-kicker').textContent=last?'ALL 114 ROOMS COMPLETE':`${medalFor(st.deaths).toUpperCase()} MEDAL`;
    $('dialog-title').textContent=last?'You found the way.':'Room complete.';
    $('dialog-detail').textContent=`${st.deaths} deaths · ${st.time.toFixed(1)} seconds${par?` · target ${par}s`:''}`;
    $('resume').textContent=last?'Back to your medals →':'Next room →';
  }
}

/* ---------- loop ---------- */
let acc = 0, last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
  if (screen === 'play') {
    acc += dt;
    const input = axis();
    while (acc >= E.STEP) { E.step(st, input, E.STEP); acc -= E.STEP; }
    if (st.status === 'dead' && prevStatus === 'play') {
      beep(160, 0.18, 'sawtooth', 0.06, 60);
      const o = levelOrigin();
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.283, v = 60 + Math.random() * 140;
        particles.push({ x: st.player.x + st.player.w / 2, y: st.player.y + st.player.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 3 + Math.random() * 3, life: 0.4 });
      }
    }
    if (st.coinsLeft < prevCoins) beep(880, 0.09, 'square', 0.05);
    if (st.keysLeft < prevKeys) beep(660, 0.12, 'triangle', 0.06);
    if (st.P.doorsOpen && !prevDoors) beep(220, 0.3, 'triangle', 0.06, 440);
    if (st.teleports > prevTps) beep(440, 0.15, 'sine', 0.06, 880);
    prevCoins = st.coinsLeft; prevKeys = st.keysLeft; prevTps = st.teleports; prevDoors = st.P.doorsOpen;
    prevStatus = st.status;
    if (st.status === 'clear') {
      const L = LEVELS[levelIdx];
      save.deaths += st.deaths;
      save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIdx + 2));
      const b = save.best[L.id];
      if (!b || st.deaths < b.deaths || (st.deaths === b.deaths && st.time < b.time)) save.best[L.id] = { deaths: st.deaths, time: st.time, medal: medalFor(st.deaths) };
      persist();
      beep(523, 0.12, 'square', 0.05); setTimeout(() => beep(659, 0.12, 'square', 0.05), 110); setTimeout(() => beep(784, 0.2, 'square', 0.05), 220);
      screen = 'clear';
    }
  }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  musicTick();
  syncUI();
  draw();
}

/* ---------- boot + probe hook ---------- */
function boot() {
  if (!levelsReady()) return setTimeout(boot, 30);
  collectLevels();
  requestAnimationFrame(frame);
}
globalThis.__hardest=Object.freeze({
  observe:()=>st?JSON.parse(JSON.stringify(st)):null,
  state:()=>({screen,level:LEVELS[levelIdx]?.id,status:st?.status,deaths:st?.deaths,coinsLeft:st?.coinsLeft,keysLeft:st?.keysLeft,teleports:st?.teleports,doorsOpen:st?.P.doorsOpen,time:st?.time,unlocked:save.unlocked,levels:LEVELS.length,player:st?{...st.player}:null,mute:save.mute,volume:save.volume,audio:{state:AC?.state||'locked',notes:audioNotes},best:JSON.parse(JSON.stringify(save.best))}),
});
boot();
})();
