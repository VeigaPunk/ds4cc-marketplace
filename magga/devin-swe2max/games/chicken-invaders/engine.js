/* games/chicken-invaders/engine.js — pure vertical-shmup sim, Node-safe.
 * Ported from prototypes/chicken-invaders.html + shmup-core/sim.ts with the
 * recorded defect fixes carried forward:
 *   P-1 formation geometry declared (proto crashed on undeclared vars)
 *   P-2 boss radial fires exactly once per telegraph (proto refired ~36x)
 *   P-3 wave-script lookup is null-safe during boss/intermission phases
 *   P-4 all formation descent is bounded above the ship lane (proto softlock)
 *
 * Determinism: all randomness flows through st.rng (mulberry32) — validate.mjs
 * replays the same seed. The browser shell seeds from Date.now().
 *
 * Level data lives in packs.js: pack.chapters[ch] = [waveDefs...] + boss.
 *   waveDef = { pattern:'straight'|'swoop'|'dive', rows, cols, hp, eggEvery,
 *               type?: forced enemy-type index }
 */
(function (root) {
'use strict';

const STAGE_W = 960, STAGE_H = 540;
const DT = 1 / 120;
const SHIP_ACC = 2600, SHIP_DAMP = 7.5, SHIP_MAXV = 400;   // inertia / float feel
const SHIP_R = 13, SHIP_Y0 = STAGE_H - 60;
const FIRE_EVERY = 0.17, BULLET_V = -560, BULLET_DMG = 1;
const MISSILE_V = -330, MISSILE_DMG = 12, MISSILE_START = 2, MISSILE_CAP = 6;
const EGG_V = 170, EGG_R = 6;
const PICKUP_V = 95, GIFT_CHANCE = 0.12;
const LIVES_START = 3, RESPAWN_S = 1.2, INVULN_S = 2.0;
const CHAPTER_CLEAR_S = 2.6;
const FORM_CW = 72, FORM_CH = 56, FORM_OY = 70;
// P-4: descent clamps per pattern — formations must never reach the ship lane
const DESCENT_CAP = { straight: 300, swoop: 320, dive: 280 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function create(pack, seed = 1) {
  const st = {
    pack, rng: mulberry32(seed),
    mode: 'title',           // 'title' | 'play' | 'clear' | 'gameover' | 'win'
    ship: { x: STAGE_W / 2, y: SHIP_Y0, vx: 0, vy: 0, alive: true, invuln: 0 },
    bullets: [], missiles: [], eggs: [], pickups: [], chickens: [], boss: null, parts: [],
    stars: [],
    chapter: 1, waveIdx: 0, score: 0, lives: LIVES_START,
    missileN: MISSILE_START, weaponLv: 0, killsInChapter: 0,
    waveT: 0, eggT: 1.2, diveT: 1.5, clearT: 0, deadT: 0, jokeT: 0,
    paused: false, fireHeld: false, fireT: 0,
    moveAxis: { x: 0, y: 0 },          // intent set by shell each frame
    dragPos: null,                      // touch layout B: absolute drag target {x,y} or null
    stickVel: null,                     // touch layout A: {vx,vy} set directly
    lastDeath: null, titleSel: 1,
    events: [],
    stats: { kills: 0, eggsDodged: 0, gifts: 0, missilesFired: 0 },
  };
  for (let i = 0; i < 90; i++) st.stars.push({ x: st.rng() * STAGE_W, y: st.rng() * STAGE_H, s: st.rng() * 2 + 0.5, v: 12 + st.rng() * 40 });
  return st;
}

const wavesOf = st => st.pack.chapters[st.chapter - 1].waves;
const bossDef = st => st.pack.chapters[st.chapter - 1].boss;

function startGame(st, ch) {
  st.chapter = ch; st.waveIdx = 0; st.score = 0; st.lives = LIVES_START;
  st.missileN = MISSILE_START; st.weaponLv = 0; st.killsInChapter = 0;
  st.ship = { x: STAGE_W / 2, y: SHIP_Y0, vx: 0, vy: 0, alive: true, invuln: 0 };
  st.bullets = []; st.missiles = []; st.eggs = []; st.pickups = []; st.parts = [];
  st.boss = null; st.fireT = 0; st.deadT = 0; st.jokeT = 2.2;
  st.mode = 'play'; st.paused = false;
  spawnWave(st);
}

function spawnWave(st) {
  const w = wavesOf(st)[st.waveIdx];
  const ox = (STAGE_W - (w.cols - 1) * FORM_CW) / 2;
  st.chickens = []; st.waveT = 0; st.eggT = 1.2; st.diveT = 1.5;
  for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) {
    const type = w.type !== undefined ? w.type : (r * w.cols + c) % st.pack.enemyTypes.length;
    const variant = st.pack.enemyTypes[type];
    st.chickens.push({
      bx: ox + c * FORM_CW, by: FORM_OY + r * FORM_CH,
      x: ox + c * FORM_CW, y: -60 - r * 30,
      hp: Math.max(w.hp, variant.hp), dive: 0, dvx: 0, dvy: 0, enter: 1,
      type, t: st.rng() * 6,
    });
  }
}

function spawnBoss(st) {
  const bd = bossDef(st);
  st.boss = { x: STAGE_W / 2, y: -80, hp: bd.hp, max: bd.hp, t: 0, volley: 2.0, radial: 5.0, warn: 0, radialArmed: false };
  st.chickens = [];
  st.events.push('bossSpawn');
}

function burst(st, x, y, n, col) {
  for (let i = 0; i < n; i++) st.parts.push({
    x, y, vx: (st.rng() - .5) * 420, vy: (st.rng() - .5) * 420 - 80,
    s: 2 + st.rng() * 5, life: .4 + st.rng() * .5, col, spin: (st.rng() - .5) * 4,
  });
}

function dropPickup(st, x, y) {
  st.killsInChapter++;
  let kind = null;
  if (st.killsInChapter === 1) kind = 'gift';        // deterministic: 1st kill = weapon cycle
  else if (st.killsInChapter === 2) kind = 'food';   // deterministic: 2nd kill = missile refill
  else if (st.rng() < GIFT_CHANCE) kind = st.rng() < 0.6 ? 'gift' : 'food';
  if (kind) st.pickups.push({ x, y, vy: PICKUP_V, kind });
}

function fireMissile(st) {
  if (st.mode !== 'play' || st.paused || !st.ship.alive || st.missileN <= 0) return;
  st.missileN--;
  st.stats.missilesFired++;
  st.missiles.push({ x: st.ship.x, y: st.ship.y - 18, vy: MISSILE_V });
  st.events.push('missile');
}

function fireGuns(st) {
  const y = st.ship.y - 16, v = BULLET_V;
  if (st.weaponLv === 0) st.bullets.push({ x: st.ship.x, y, vx: 0, vy: v });
  else if (st.weaponLv === 1) st.bullets.push({ x: st.ship.x - 9, y, vx: 0, vy: v }, { x: st.ship.x + 9, y, vx: 0, vy: v });
  else st.bullets.push({ x: st.ship.x, y, vx: 0, vy: v }, { x: st.ship.x - 8, y, vx: -70, vy: v * .96 }, { x: st.ship.x + 8, y, vx: 70, vy: v * .96 });
  st.events.push('shoot');
}

function hitShip(st, cause) {
  if (!st.ship.alive || st.ship.invuln > 0) return;
  st.ship.alive = false; st.deadT = 0; st.lives--;
  st.lastDeath = { cause, x: st.ship.x | 0, y: st.ship.y | 0, t: +st.waveT.toFixed(1) };
  burst(st, st.ship.x, st.ship.y, 30, st.pack.ship);
  st.events.push('death');
}

function killChicken(st, c) {
  burst(st, c.x, c.y, 16, st.pack.foe);
  st.score += 100;
  st.stats.kills++;
  dropPickup(st, c.x, c.y);
  st.events.push('hit');
}

function step(st, dt) {
  if (st.mode === 'clear') {
    st.clearT += dt;
    if (st.clearT >= CHAPTER_CLEAR_S) {
      st.chapter++; st.waveIdx = 0; st.killsInChapter = 0; st.jokeT = 2.2;
      if (st.chapter > st.pack.chapters.length) { st.mode = 'win'; st.events.push('win'); return; }
      st.mode = 'play'; spawnWave(st);
    }
    return;
  }
  if (st.mode !== 'play' || st.paused) return;
  st.waveT += dt;
  for (const s of st.stars) { s.y += s.v * dt; if (s.y > STAGE_H) { s.y = -2; s.x = st.rng() * STAGE_W; } }

  // ship: inertial movement (float feel). Shell sets moveAxis / dragPos / stickVel.
  const ship = st.ship;
  if (ship.alive) {
    if (st.stickVel) {                                   // layout A twin-thumb
      ship.vx = st.stickVel.vx; ship.vy = st.stickVel.vy;
      ship.x = Math.max(20, Math.min(STAGE_W - 20, ship.x + ship.vx * dt));
      ship.y = Math.max(STAGE_H - 220, Math.min(STAGE_H - 30, ship.y + ship.vy * dt));
    } else if (st.dragPos) {                             // layout B / mouse drag
      ship.x = Math.max(20, Math.min(STAGE_W - 20, st.dragPos.x));
      ship.y = Math.max(STAGE_H - 220, Math.min(STAGE_H - 30, st.dragPos.y));
      ship.vx = ship.vy = 0;
    } else {
      ship.vx += st.moveAxis.x * SHIP_ACC * dt;
      ship.vy += st.moveAxis.y * SHIP_ACC * dt;
      ship.vx -= ship.vx * SHIP_DAMP * dt;
      ship.vy -= ship.vy * SHIP_DAMP * dt;
      ship.vx = Math.max(-SHIP_MAXV, Math.min(SHIP_MAXV, ship.vx));
      ship.vy = Math.max(-SHIP_MAXV, Math.min(SHIP_MAXV, ship.vy));
      ship.x = Math.max(20, Math.min(STAGE_W - 20, ship.x + ship.vx * dt));
      ship.y = Math.max(STAGE_H - 220, Math.min(STAGE_H - 30, ship.y + ship.vy * dt));
    }
    ship.invuln = Math.max(0, ship.invuln - dt);
    st.fireT -= dt;
    if (st.fireHeld && st.fireT <= 0) { fireGuns(st); st.fireT = FIRE_EVERY; }
  } else {
    st.deadT += dt;
    if (st.deadT >= RESPAWN_S) {
      if (st.lives > 0) {
        ship.alive = true; ship.x = STAGE_W / 2; ship.y = SHIP_Y0;
        ship.vx = ship.vy = 0; ship.invuln = INVULN_S;
      } else { st.mode = 'gameover'; st.events.push('gameOver'); return; }
    }
  }
  st.jokeT = Math.max(0, st.jokeT - dt);

  // chickens: formation patterns (Galaxian-ish, readable — not danmaku)
  const wlist = wavesOf(st);
  const wdef = wlist[Math.min(st.waveIdx, wlist.length - 1)];   // P-3: null-safe during boss phase
  for (const c of st.chickens) {
    c.t += dt;
    const spd = st.pack.enemyTypes[c.type].speed || 1;
    if (c.enter) {
      c.y += (c.by - c.y) * Math.min(1, 3 * dt) + 40 * dt;
      if (Math.abs(c.y - c.by) < 4) { c.y = c.by; c.enter = 0; }
      c.x = c.bx; continue;
    }
    if (c.dive) {
      c.x += c.dvx * dt; c.y += c.dvy * dt;
      if (c.y > STAGE_H + 30) { c.dive = 0; c.y = -40; c.enter = 1; }
      continue;
    }
    const mt = st.waveT * spd;
    const cap = DESCENT_CAP[wdef.pattern];
    if (wdef.pattern === 'straight') {
      c.x = c.bx + Math.sin(mt * 0.7) * 130;
      c.y = Math.min(c.by + mt * 4, cap);
    } else if (wdef.pattern === 'swoop') {
      c.x = c.bx + Math.sin(mt * 1.1 + c.bx * 0.01) * 170;
      c.y = Math.min(c.by + Math.sin(mt * 0.9 + c.bx * 0.02) * 36 + mt * 6, cap);
    } else { // dive formation: mild sway; individuals peel off
      c.x = c.bx + Math.sin(mt * 0.5) * 70;
      c.y = Math.min(c.by + mt * 3, cap);
    }
  }
  // dive scheduler — cap simultaneous divers at 2 (readability: spec wants
  // Galaxian-ish readable patterns, not a swarm)
  if (wdef && wdef.pattern === 'dive' && st.chickens.length) {
    st.diveT -= dt;
    if (st.diveT <= 0) {
      const diving = st.chickens.filter(c => c.dive).length;
      const cand = st.chickens.filter(c => !c.dive && !c.enter);
      if (cand.length && diving < 2) {
        const c = cand[(st.rng() * cand.length) | 0];
        c.dive = 1;
        const dx = ship.x - c.x, dy = ship.y - c.y, d = Math.hypot(dx, dy) || 1;
        const sp = 240; c.dvx = dx / d * sp; c.dvy = Math.max(160, dy / d * sp);
      }
      st.diveT = 1.4 + st.rng();
    }
  }
  // egg drops (aimed-ish, readable speed)
  st.eggT -= dt;
  if (st.eggT <= 0 && st.chickens.length) {
    const c = st.chickens[(st.rng() * st.chickens.length) | 0];
    if (!c.enter && c.y < ship.y - 40) {
      const dx = ship.x - c.x, dy = ship.y - c.y, d = Math.hypot(dx, dy) || 1;
      const spread = (st.rng() - 0.5) * 0.35;
      st.eggs.push({ x: c.x, y: c.y + 12, vx: (dx / d + spread) * EGG_V * 0.5, vy: EGG_V });
    }
    st.eggT = wdef.eggEvery * (0.7 + st.rng() * 0.6);
  }
  // wave cleared? clear in-flight eggs between waves (era convention —
  // the field resets; a leftover egg sniping a respawn reads as unfair)
  if (!st.chickens.length && !st.boss) {
    st.eggs.length = 0;
    st.waveIdx++;
    if (st.waveIdx < wlist.length) spawnWave(st);
    else spawnBoss(st);
  }

  const boss = st.boss;
  if (boss) {
    boss.t += dt;
    boss.y += (110 - boss.y) * Math.min(1, 1.5 * dt);
    boss.x = STAGE_W / 2 + Math.sin(boss.t * 0.7) * 240;
    boss.volley -= dt; boss.radial -= dt; boss.warn = Math.max(0, boss.warn - dt);
    if (boss.volley <= 0) { // aimed 3-egg volley
      for (let i = -1; i <= 1; i++) {
        const dx = ship.x - boss.x, dy = ship.y - boss.y, d = Math.hypot(dx, dy) || 1;
        st.eggs.push({ x: boss.x, y: boss.y + 30, vx: dx / d * EGG_V * 0.6 + i * 60, vy: EGG_V * 1.05 });
      }
      boss.volley = 2.4;
    }
    if (boss.radial <= 0) { boss.warn = 0.7; boss.radial = 6.0; boss.radialArmed = true; }
    if (boss.radialArmed && boss.warn <= 0) {  // P-2: fires exactly once per telegraph
      boss.radialArmed = false;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        st.eggs.push({ x: boss.x, y: boss.y + 20, vx: Math.cos(a) * EGG_V * 0.7, vy: Math.abs(Math.sin(a)) * EGG_V * 0.7 + 60 });
      }
    }
    if (boss.hp <= 0) {
      burst(st, boss.x, boss.y, 60, st.pack.foe2); st.score += 1000; st.boss = null;
      st.events.push('bossDown');
      if (st.chapter >= st.pack.chapters.length) { st.mode = 'win'; st.events.push('win'); }
      else { st.mode = 'clear'; st.clearT = 0; st.events.push('chapterClear'); }
    }
  }

  // projectiles
  for (const b of st.bullets) { b.x += (b.vx || 0) * dt; b.y += b.vy * dt; }
  for (const m of st.missiles) m.y += m.vy * dt;
  for (const e of st.eggs) { e.x += e.vx * dt; e.y += e.vy * dt; }
  for (const p of st.pickups) p.y += p.vy * dt;
  st.bullets = st.bullets.filter(b => b.y > -20 && b.x > -20 && b.x < STAGE_W + 20);
  st.missiles = st.missiles.filter(m => m.y > -40);
  st.eggs = st.eggs.filter(e => e.y < STAGE_H + 20 && e.x > -20 && e.x < STAGE_W + 20);
  st.pickups = st.pickups.filter(p => p.y < STAGE_H + 20);

  // bullet/missile vs chickens
  const hitC = (b, dmg) => {
    for (const c of st.chickens) {
      if (Math.abs(b.x - c.x) < 24 && Math.abs(b.y - c.y) < 18) {
        c.hp -= dmg; burst(st, b.x, b.y, 4, st.pack.foe);
        if (c.hp <= 0) { killChicken(st, c); st.chickens = st.chickens.filter(k => k !== c); }
        return true;
      }
    }
    return false;
  };
  st.bullets = st.bullets.filter(b => !hitC(b, BULLET_DMG));
  st.missiles = st.missiles.filter(m => !hitC(m, MISSILE_DMG));
  // vs boss
  if (st.boss) {
    const hitB = b => Math.abs(b.x - boss.x) < 56 && Math.abs(b.y - boss.y) < 40;
    for (const b of st.bullets) if (hitB(b)) { boss.hp -= BULLET_DMG; b.y = -99; burst(st, b.x, b.y, 3, st.pack.foe2); }
    for (const m of st.missiles) if (hitB(m)) { boss.hp -= MISSILE_DMG; m.y = -99; burst(st, m.x, m.y, 12, st.pack.foe2); }
    st.bullets = st.bullets.filter(b => b.y > -20);
    st.missiles = st.missiles.filter(m => m.y > -40);
    if (ship.alive && ship.invuln <= 0 && Math.abs(ship.x - boss.x) < 50 && Math.abs(ship.y - boss.y) < 36) hitShip(st, 'boss');
  }
  // chicken body collision
  if (ship.alive && ship.invuln <= 0) {
    for (const c of st.chickens) {
      if (Math.abs(ship.x - c.x) < 26 && Math.abs(ship.y - c.y) < 20) { hitShip(st, 'chicken'); break; }
    }
  }
  // eggs vs ship
  if (ship.alive && ship.invuln <= 0) {
    for (const e of st.eggs) {
      if (Math.hypot(e.x - ship.x, e.y - ship.y) < SHIP_R + EGG_R) { hitShip(st, 'egg'); e.y = STAGE_H + 99; break; }
    }
  }
  // pickups vs ship
  if (ship.alive) {
    for (const p of st.pickups) {
      if (Math.abs(p.x - ship.x) < 26 && Math.abs(p.y - ship.y) < 22) {
        p.y = STAGE_H + 99; st.score += 50;
        if (p.kind === 'gift') {
          // CI-style power ladder: gifts upgrade through the pack's weapon
          // tiers; at max tier a gift is bonus score, never a downgrade.
          if (st.weaponLv < st.pack.weapons.length - 1) st.weaponLv++;
          else st.score += 200;
          st.stats.gifts++;
        }
        else st.missileN = Math.min(MISSILE_CAP, st.missileN + 1);
        st.events.push('pickup');
      }
    }
  }
  st.pickups = st.pickups.filter(p => p.y < STAGE_H + 20);

  // particles
  for (const p of st.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
  st.parts = st.parts.filter(p => p.life > 0);
}

root.FowlEngine = {
  STAGE_W, STAGE_H, DT, SHIP_MAXV, SHIP_R, SHIP_Y0,
  LIVES_START, MISSILE_START, MISSILE_CAP,
  create, step, startGame, spawnWave, spawnBoss, fireMissile,
  mulberry32,
};
})(typeof globalThis !== 'undefined' ? globalThis : this);
