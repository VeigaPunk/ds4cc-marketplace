/* games/boxhead/engine.js — pure top-down arena survival sim, Node-safe.
 * BOX RIOT: 2PLAY ROOMS — a remake of the Boxhead: 2Play Rooms (2007) formula.
 *
 * Carries forward the verified systems from armor-games/apps/boxhead
 * (axis-separated wall slide, chase+separation swarm, fused chain barrels,
 * grenade-owner blast exemption, Dt-capped combat) and fills the dossier's
 * declared gaps with authored tables: rooms, endless wave director, weapon
 * streak ladder, devils, co-op revive rule, deathmatch target.
 *
 * Determinism: all randomness flows through st.rng (mulberry32) — validate.mjs
 * replays seeds. The browser shell seeds from Date.now().
 *
 * Modes: 'solo' | 'coop' | 'dm'. Engine covers combat only; menus are shell.
 * st.over ends a run (solo/coop wipe). st.dmWinner ends a deathmatch.
 */
(function (root) {
'use strict';

const W = 640, H = 400;                 // dossier provisional stage (UNVERIFIED in original)
const DT = 1 / 120;

// --- combat tables (authored — dossier marks all numbers as gaps) --------------
const PLAYER_SPEED = 128, PLAYER_R = 9, PLAYER_HP = 100;
const ZOMBIE_TOUCH_DMG = 10, ZOMBIE_TOUCH_INVULN = 0.8;
const START_AMMO = 40, CRATE_AMMO = 24, MAX_CRATES = 2, CRATE_EVERY = 11;
const BARREL_R = 58, BARREL_FUSE = 0.12, BLAST_PLAYER_DMG = 25;
const DM_TARGET = 5, DM_RESPAWN = 1.4, DM_AMMO = 40;
const COOP_REVIVE_DELAY = 1.0;          // dead partner revives at next wave clear

// Weapon ladder — unlocks ride the kill-streak multiplier (spec order
// pistol → shotgun → uzi → grenades, extended with rockets + mines).
const WEAPONS = [
  { id: 'pistol',  name: 'PISTOL',   mult: 0,  delay: 0.30, cost: 0, speed: 360, dmg: 1 },
  { id: 'shotgun', name: 'SHOTGUN',  mult: 4,  delay: 0.55, cost: 2, speed: 340, dmg: 1, pellets: 5, spread: 0.34 },
  { id: 'uzi',     name: 'UZI',      mult: 7,  delay: 0.09, cost: 1, speed: 400, dmg: 1 },
  { id: 'grenade', name: 'GRENADES', mult: 10, delay: 0.70, cost: 2, speed: 240, dmg: 1, lob: true,  blastR: 55 },
  { id: 'rocket',  name: 'ROCKETS',  mult: 14, delay: 0.50, cost: 2, speed: 430, dmg: 1, blastR: 70 },
  { id: 'mine',    name: 'MINES',    mult: 18, delay: 0.45, cost: 3, speed: 0,   dmg: 0, mine: true, blastR: 62 },
];
function weaponForMult(m) {
  let w = WEAPONS[0];
  for (const c of WEAPONS) if (m >= c.mult) w = c;
  return w;
}

// --- rooms ----------------------------------------------------------------------
// obstacles: solid AABBs. doors: spawn gaps on the arena edge — the swarm
// pours in through them like the original. barrels: anchor points.
const ROOMS = [
  { id: 'open-yard', name: 'OPEN YARD',
    obstacles: [
      { x: 200, y: 140, w: 60, h: 40 }, { x: 380, y: 220, w: 60, h: 40 },
    ],
    barrels: [{ x: 150, y: 300 }, { x: 500, y: 110 }],
    doors: [{ x: 320, y: 10 }, { x: 320, y: H - 10 }, { x: 10, y: 200 }, { x: W - 10, y: 200 }],
    spawn: { x: 320, y: 200 }, spawn2: { x: 220, y: 200 } },

  { id: 'pillars', name: 'PILLARS',
    obstacles: [
      { x: 140, y: 110, w: 36, h: 36 }, { x: 464, y: 110, w: 36, h: 36 },
      { x: 140, y: 254, w: 36, h: 36 }, { x: 464, y: 254, w: 36, h: 36 },
    ],
    barrels: [{ x: 320, y: 110 }, { x: 320, y: 300 }, { x: 90, y: 200 }],
    doors: [{ x: 320, y: 10 }, { x: 320, y: H - 10 }],
    spawn: { x: 320, y: 200 }, spawn2: { x: 320, y: 300 } },

  { id: 'crossroads', name: 'CROSSROADS',
    obstacles: [
      { x: 150, y: 90, w: 110, h: 24 }, { x: 380, y: 90, w: 110, h: 24 },
      { x: 150, y: 286, w: 110, h: 24 }, { x: 380, y: 286, w: 110, h: 24 },
      { x: 300, y: 160, w: 40, h: 80 },
    ],
    barrels: [{ x: 80, y: 60 }, { x: 560, y: 60 }, { x: 80, y: 340 }, { x: 560, y: 340 }],
    doors: [{ x: 60, y: 10 }, { x: 580, y: 10 }, { x: 60, y: H - 10 }, { x: 580, y: H - 10 }],
    spawn: { x: 200, y: 200 }, spawn2: { x: 440, y: 200 } },

  { id: 'the-box', name: 'THE BOX',
    obstacles: [
      { x: 120, y: 80, w: 24, h: 140 }, { x: 496, y: 80, w: 24, h: 140 },
      { x: 120, y: 80, w: 160, h: 24 }, { x: 360, y: 80, w: 160, h: 24 },
      { x: 120, y: 296, w: 160, h: 24 }, { x: 360, y: 296, w: 160, h: 24 },
    ],
    barrels: [{ x: 320, y: 60 }, { x: 200, y: 340 }, { x: 440, y: 340 }],
    doors: [{ x: 320, y: 10 }, { x: 10, y: 60 }, { x: 10, y: 340 }, { x: W - 10, y: 60 }, { x: W - 10, y: 340 }],
    spawn: { x: 320, y: 250 }, spawn2: { x: 320, y: 150 } },

  { id: 'alley', name: 'THE ALLEY',
    obstacles: [
      { x: 90, y: 60, w: 24, h: 200 }, { x: 526, y: 140, w: 24, h: 200 },
      { x: 240, y: 140, w: 160, h: 24 }, { x: 240, y: 236, w: 160, h: 24 },
    ],
    barrels: [{ x: 60, y: 320 }, { x: 580, y: 80 }, { x: 320, y: 200 }],
    doors: [{ x: 320, y: 10 }, { x: 10, y: 200 }, { x: W - 10, y: 200 }, { x: 320, y: H - 10 }],
    spawn: { x: 320, y: 60 }, spawn2: { x: 320, y: 340 } },

  { id: 'meat-grinder', name: 'MEAT GRINDER',
    obstacles: [
      { x: 150, y: 100, w: 60, h: 16 }, { x: 430, y: 100, w: 60, h: 16 },
      { x: 150, y: 284, w: 60, h: 16 }, { x: 430, y: 284, w: 60, h: 16 },
      { x: 100, y: 190, w: 16, h: 60 }, { x: 524, y: 190, w: 16, h: 60 },
      { x: 300, y: 90, w: 40, h: 40 }, { x: 300, y: 270, w: 40, h: 40 },
    ],
    barrels: [{ x: 320, y: 200 }, { x: 60, y: 60 }, { x: 580, y: 340 }],
    doors: [{ x: 60, y: 10 }, { x: 320, y: 10 }, { x: 580, y: 10 },
            { x: 60, y: H - 10 }, { x: 320, y: H - 10 }, { x: 580, y: H - 10 },
            { x: 10, y: 200 }, { x: W - 10, y: 200 }],
    spawn: { x: 200, y: 200 }, spawn2: { x: 440, y: 200 } },
];

// --- endless wave director --------------------------------------------------------
// Original runs forever — waves escalate until they don't. Parametric table:
// density and pace ramp, runners join from wave 2, devils from wave 4.
function waveDef(w) {
  return {
    count: 5 + w * 3 + Math.floor(w * w * 0.12),      // 8 → 20 → 38 → 60+
    aliveCap: Math.min(26, 7 + w),                    // perf/readability ceiling
    speed: Math.min(72, 32 + w * 2.4),
    runnerFrac: Math.min(0.38, Math.max(0, (w - 1) * 0.07)),
    devils: w >= 4 ? Math.min(4, 1 + Math.floor((w - 4) / 2)) : 0,
    spawnEvery: Math.max(0.32, 1.25 - w * 0.075),
  };
}

// --- helpers ----------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const bodyRect = (p, r) => ({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 });
const INSET = 14;                        // wall thickness — bodies stay inside

function slideMove(p, dx, dy, r, solids) {
  const try1 = (nx, ny) => {
    if (nx < INSET + r || nx > W - INSET - r || ny < INSET + r || ny > H - INSET - r) return;
    const rr = bodyRect({ x: nx, y: ny }, r);
    for (const s of solids) if (overlap(rr, s)) return;
    p.x = nx; p.y = ny;
  };
  try1(p.x + dx, p.y);
  try1(p.x, p.y + dy);
}

// --- create ------------------------------------------------------------------------
function create(mode, roomIdx, seed = 1) {
  const room = ROOMS[clamp(roomIdx | 0, 0, ROOMS.length - 1)];
  const mkPlayer = (sp, idx) => ({
    idx, x: sp.x, y: sp.y, facing: { x: idx === 0 ? 1 : -1, y: 0 },
    hp: PLAYER_HP, ammo: mode === 'dm' ? DM_AMMO : START_AMMO,
    weapon: 0,                            // selected tier — input picks among unlocked
    invuln: 0, cooldown: 0, alive: true, kills: 0,
    respawnT: 0, reviveT: 0, flash: 0,
  });
  const st = {
    rng: mulberry32(seed), mode, room,
    players: [mkPlayer(room.spawn, 0)],
    zombies: [], bullets: [], efire: [], mines: [], barrels: [], crates: [],
    blasts: [], parts: [],
    wave: 0, spawnQueue: 0, spawnT: 0, waveBreak: 0, crateT: 5,
    score: 0, mult: 1, multT: 0,
    // streak UNLOCKS tiers permanently for the run (original behavior) —
    // players select among them; dm starts fully unlocked.
    unlockMax: mode === 'dm' ? WEAPONS.length - 1 : 0,
    over: false, dmWinner: -1, t: 0,
    events: [],
    stats: { kills: 0, shots: 0, crates: 0, barrels: 0, devilsKilled: 0, highestWave: 0 },
  };
  if (mode !== 'solo') st.players.push(mkPlayer(room.spawn2, 1));
  for (const b of room.barrels) st.barrels.push({ x: b.x, y: b.y, fuse: -1, dead: false });
  if (mode !== 'dm') startWave(st);
  else st.events.push('dmStart');
  return st;
}

function startWave(st) {
  st.wave += 1;
  st.stats.highestWave = st.wave;
  const def = waveDef(st.wave);
  st.spawnQueue = def.count;
  st.devilQueue = def.devils;
  st.spawnT = 0.6;
  st.waveBreak = 0;
  st.events.push('wave');
}

// --- step ---------------------------------------------------------------------------
// inputs: [{mx,my,fire,aimX,aimY}] per player. aim* optional (mouse/autoaim sugar).
function step(st, inputs, dt) {
  if (st.over || st.dmWinner >= 0) return;
  dt = Math.min(dt, 0.05);              // D-16: tab-throttle can't batch-hit players
  st.t += dt;

  updatePlayers(st, inputs, dt);
  if (st.mode !== 'dm') { updateSpawning(st, dt); updateZombies(st, dt); }
  updateEFire(st, dt);
  updateBullets(st, dt);
  updateMines(st, dt);
  updateProps(st, dt);
  updateParts(st, dt);

  // streak decay
  if (st.mult > 1) {
    st.multT -= dt;
    if (st.multT <= 0) { st.mult = Math.max(1, st.mult - 1); st.multT = 1.2; }
  }

  if (st.mode !== 'dm' && st.players.every(p => !p.alive)) {
    st.over = true; st.events.push('gameOver');
  }
}

// --- players ------------------------------------------------------------------------
function updatePlayers(st, inputs, dt) {
  const solids = st.room.obstacles;
  st.players.forEach((p, i) => {
    if (!p.alive) {
      if (st.mode === 'dm') {
        p.respawnT -= dt;
        if (p.respawnT <= 0) {
          const sp = i === 0 ? st.room.spawn : st.room.spawn2;
          Object.assign(p, { x: sp.x, y: sp.y, hp: PLAYER_HP, ammo: DM_AMMO, invuln: 2, alive: true });
          st.events.push('respawn');
        }
      }
      return;
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.flash > 0) p.flash -= dt;
    p.cooldown -= dt;

    const inp = inputs[i] || {};
    let mx = inp.mx || 0, my = inp.my || 0;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (mx || my) { const d = Math.hypot(mx, my) || 1; p.facing = { x: mx / d, y: my / d }; }
    slideMove(p, mx * PLAYER_SPEED * dt, my * PLAYER_SPEED * dt, PLAYER_R, solids);

    if (typeof inp.weapon === 'number') p.weapon = clamp(inp.weapon | 0, 0, st.unlockMax);
    if (inp.fire && p.cooldown <= 0) tryFire(st, p, inp);
  });
}

function aimDir(st, p, inp) {
  if (typeof inp.aimX === 'number') {
    const d = dist({ x: inp.aimX, y: inp.aimY }, p);
    if (d > 4) return { x: (inp.aimX - p.x) / d, y: (inp.aimY - p.y) / d };
  }
  return p.facing;
}

function tryFire(st, p, inp) {
  const w = WEAPONS[Math.min(p.weapon, st.unlockMax)];
  if (p.ammo < w.cost) { p.cooldown = 0.25; st.events.push('dry'); return; }
  p.ammo -= w.cost;
  p.cooldown = w.delay;
  st.stats.shots++;

  if (w.mine) {
    st.mines.push({ x: p.x, y: p.y, owner: p.idx, arm: 0.6, life: 20, r: w.blastR });
    st.events.push('mine');
    return;
  }
  const dir = aimDir(st, p, inp);
  const from = { x: p.x + dir.x * 14, y: p.y + dir.y * 14 };
  const fire = (d, kind) => st.bullets.push({
    x: from.x, y: from.y, vx: d.x * w.speed, vy: d.y * w.speed,
    life: kind === 'bullet' ? 1.3 : 1.7, owner: p.idx, kind, blastR: w.blastR || 0, dmg: w.dmg,
  });
  if (w.pellets) {
    const a = Math.atan2(dir.y, dir.x);
    for (let k = 0; k < w.pellets; k++) {
      const off = (k - (w.pellets - 1) / 2) * (w.spread / (w.pellets - 1)) * 2;
      fire({ x: Math.cos(a + off), y: Math.sin(a + off) }, 'bullet');
    }
  } else {
    fire(dir, w.lob ? 'grenade' : w.blastR ? 'rocket' : 'bullet');
  }
  st.events.push(w.pellets ? 'shotgun' : w.id === 'uzi' ? 'uzi' : w.id);
}

// --- spawning -----------------------------------------------------------------------
function doorSpot(st) {
  const doors = st.room.doors;
  const d = doors[Math.floor(st.rng() * doors.length)];
  // jitter along the edge perpendicular to the door normal
  const j = (st.rng() - 0.5) * 60;
  const onXEdge = d.y === 10 || d.y === H - 10;
  return {
    x: clamp(d.x + (onXEdge ? j : 0), INSET + 10, W - INSET - 10),
    y: clamp(d.y + (onXEdge ? 0 : j), INSET + 10, H - INSET - 10),
  };
}

function updateSpawning(st, dt) {
  const def = waveDef(st.wave);
  if (st.spawnQueue > 0) {
    st.spawnT -= dt;
    if (st.spawnT <= 0 && st.zombies.length < def.aliveCap) {
      // devils join late in the queue so the floor fills with fodder first
      const isDevil = st.devilQueue > 0 && st.spawnQueue <= st.devilQueue * 3;
      const runner = !isDevil && st.rng() < def.runnerFrac;
      const pos = doorSpot(st);
      st.zombies.push({
        x: pos.x, y: pos.y, kind: isDevil ? 'devil' : runner ? 'runner' : 'walker',
        hp: isDevil ? 6 : runner ? 1 : 2,
        speed: isDevil ? def.speed * 0.75 : runner ? def.speed * 1.8 : def.speed,
        flash: 0, fireT: 1 + st.rng() * 1.5, telegraph: 0,
      });
      if (isDevil) st.devilQueue--;
      st.spawnQueue--;
      st.spawnT = def.spawnEvery;
      st.events.push('spawn');
    }
  } else if (st.zombies.length === 0) {
    st.waveBreak += dt;
    // co-op mercy rule: wave clear revives a downed partner (era co-op feel)
    if (st.mode === 'coop') {
      for (const p of st.players) {
        if (!p.alive) {
          p.reviveT += dt;
          if (p.reviveT > COOP_REVIVE_DELAY) {
            const sp = p.idx === 0 ? st.room.spawn : st.room.spawn2;
            Object.assign(p, { x: sp.x, y: sp.y, hp: PLAYER_HP, invuln: 2, alive: true });
            st.events.push('revive');
          }
        }
      }
    }
    if (st.waveBreak > 2.5) startWave(st);
  }
}

// --- zombies ------------------------------------------------------------------------
function updateZombies(st, dt) {
  const solids = st.room.obstacles;
  for (const z of st.zombies) {
    // nearest living player
    let target = null, bd = Infinity;
    for (const p of st.players) {
      if (!p.alive) continue;
      const d = dist(z, p);
      if (d < bd) { bd = d; target = p; }
    }
    if (!target) continue;

    if (z.kind === 'devil') {
      // devils stand off and hurl fireballs — telegraph, then lob
      const d = dist(z, target);
      if (z.telegraph > 0) {
        z.telegraph -= dt;
        if (z.telegraph <= 0) {
          const dd = d || 1;
          st.efire.push({
            x: z.x, y: z.y, vx: ((target.x - z.x) / dd) * 150, vy: ((target.y - z.y) / dd) * 150,
            life: 2.4,
          });
          z.fireT = 2.2 + st.rng();
          st.events.push('devilFire');
        }
      } else {
        z.fireT -= dt;
        if (d > 190) chaseMove(z, target, dt, solids, st);
        else if (d < 120) chaseMove(z, { x: 2 * z.x - target.x, y: 2 * z.y - target.y }, dt, solids, st);
        if (z.fireT <= 0 && d < 320) z.telegraph = 0.5;
      }
    } else {
      chaseMove(z, target, dt, solids, st);
    }

    // touch damage
    for (const p of st.players) {
      if (!p.alive || p.invuln > 0) continue;
      if (dist(z, p) < 16) {
        hurtPlayer(st, p, z.kind === 'devil' ? 14 : ZOMBIE_TOUCH_DMG);
      }
    }
  }
}

function chaseMove(z, target, dt, solids, st) {
  const d = dist(z, target) || 1;
  const ux = (target.x - z.x) / d, uy = (target.y - z.y) / d;
  const ox = z.x, oy = z.y;
  slideMove(z, ux * z.speed * dt, uy * z.speed * dt, 8, solids);
  // Greedy chase stalls when the target sits directly behind cover (dx or dy
  // ≈ 0 → no slide component). Wall-follow tangentially with a per-zombie
  // bias; flip the bias if it's still pinned after a beat.
  const moved = Math.hypot(z.x - ox, z.y - oy);
  if (moved < z.speed * dt * 0.3) {
    z.stuckT = (z.stuckT || 0) + dt;
    if (z.stuckT > 0.15) {
      if (!z.bias) z.bias = st.rng() < 0.5 ? 1 : -1;
      slideMove(z, -uy * z.bias * z.speed * dt, ux * z.bias * z.speed * dt, 8, solids);
      if (z.stuckT > 1.4) { z.bias = -z.bias; z.stuckT = 0.6; }
    }
  } else z.stuckT = 0;
  // separation so the swarm doesn't collapse into a blob — routed through
  // slideMove so crowding can never push a zombie inside a wall (softlock)
  let sx = 0, sy = 0;
  for (const o of st.zombies) {
    if (o === z) continue;
    const sd = dist(z, o);
    if (sd > 0 && sd < 15) { sx += ((z.x - o.x) / sd) * 22 * dt; sy += ((z.y - o.y) / sd) * 22 * dt; }
  }
  if (sx || sy) slideMove(z, sx, sy, 8, solids);
  if (z.flash > 0) z.flash -= dt;
}

function hurtPlayer(st, p, dmg) {
  p.hp -= dmg;
  p.invuln = ZOMBIE_TOUCH_INVULN;
  p.flash = 0.15;
  if (st.mode !== 'dm') { st.mult = 1; st.multT = 0; }
  st.events.push('playerHit');
  if (p.hp <= 0) {
    p.alive = false;
    p.reviveT = 0;
    st.events.push('playerDie');
    if (st.mode === 'dm') p.respawnT = DM_RESPAWN;
  }
}

// --- enemy fire ---------------------------------------------------------------------
function updateEFire(st, dt) {
  const solids = st.room.obstacles;
  for (let i = st.efire.length - 1; i >= 0; i--) {
    const f = st.efire[i];
    f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
    let dead = f.life <= 0 ||
      f.x < INSET || f.x > W - INSET || f.y < INSET || f.y > H - INSET ||
      solids.some(s => overlap(bodyRect(f, 4), s));
    if (!dead) {
      for (const p of st.players) {
        if (!p.alive || p.invuln > 0) continue;
        if (dist(f, p) < 13) { hurtPlayer(st, p, 15); dead = true; break; }
      }
    }
    if (dead) st.efire.splice(i, 1);
  }
}

// --- bullets -------------------------------------------------------------------------
function updateBullets(st, dt) {
  const solids = st.room.obstacles;
  for (let i = st.bullets.length - 1; i >= 0; i--) {
    const b = st.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0 ||
      b.x < INSET || b.x > W - INSET || b.y < INSET || b.y > H - INSET ||
      solids.some(s => overlap(bodyRect(b, 2), s));

    if (!dead) {
      for (const barrel of st.barrels) {
        if (!barrel.dead && barrel.fuse < 0 && dist(barrel, b) < 11) {
          barrel.fuse = 0; dead = true; break;
        }
      }
    }
    if (!dead) {
      for (let j = st.zombies.length - 1; j >= 0; j--) {
        const z = st.zombies[j];
        if (dist(z, b) < 12) {
          z.hp -= b.dmg; z.flash = 0.1;
          dead = true;
          if (z.hp <= 0) killZombie(st, j);
          else st.events.push('zombieHit');
          break;
        }
      }
    }
    if (!dead && st.mode === 'dm') {
      for (const p of st.players) {
        if (p.idx === b.owner || !p.alive || p.invuln > 0) continue;
        if (dist(p, b) < 12) {
          dead = true;
          p.hp -= 12;
          p.flash = 0.15;
          if (p.hp <= 0) {
            p.alive = false;
            p.respawnT = DM_RESPAWN;
            const killer = st.players[b.owner];
            killer.kills += 1;
            st.events.push('playerDie');
            if (killer.kills >= DM_TARGET) { st.dmWinner = b.owner; st.events.push('dmWin'); }
          } else { p.invuln = 0.35; st.events.push('playerHit'); }
          break;
        }
      }
    }
    if (dead) {
      if (b.kind === 'grenade' || b.kind === 'rocket') detonate(st, { x: b.x, y: b.y }, b.blastR, b.owner);
      st.bullets.splice(i, 1);
    }
  }
}

function updateMines(st, dt) {
  for (let i = st.mines.length - 1; i >= 0; i--) {
    const m = st.mines[i];
    m.life -= dt;
    if (m.arm > 0) m.arm -= dt;
    let boom = m.life <= 0;
    if (!boom && m.arm <= 0) {
      boom = st.zombies.some(z => dist(z, m) < 26);
      if (!boom && st.mode === 'dm')
        boom = st.players.some(p => p.idx !== m.owner && p.alive && dist(p, m) < 26);
    }
    if (boom) { detonate(st, m, m.r, m.owner); st.mines.splice(i, 1); }
  }
}

function killZombie(st, j) {
  const z = st.zombies[j];
  if (z.kind === 'devil') st.stats.devilsKilled++;
  st.stats.kills++;
  st.score += 100 * st.mult;
  st.mult = Math.min(20, st.mult + 1);
  st.multT = 3.5;
  const nu = WEAPONS.indexOf(weaponForMult(st.mult));
  if (nu > st.unlockMax) { st.unlockMax = nu; st.events.push('unlock'); }
  st.zombies.splice(j, 1);
  st.events.push('zombieDie');
  // gibs
  for (let k = 0; k < 4; k++) {
    st.parts.push({
      x: z.x, y: z.y, vx: (st.rng() - 0.5) * 160, vy: (st.rng() - 0.5) * 160,
      t: 0, dur: 0.4 + st.rng() * 0.3, kind: 'gib', shade: z.kind,
    });
  }
}

// --- props / blasts --------------------------------------------------------------------
function detonate(st, pos, radius, owner) {
  st.blasts.push({ x: pos.x, y: pos.y, r: radius, t: 0, dur: 0.35 });
  st.events.push('explode');
  for (let j = st.zombies.length - 1; j >= 0; j--) {
    if (dist(st.zombies[j], pos) < radius) killZombie(st, j);
  }
  for (const p of st.players) {
    if (!p.alive || p.invuln > 0) continue;
    if (owner !== undefined && p.idx === owner) continue;   // shooter exempt from own ordnance
    if (dist(p, pos) < radius * 0.8) hurtPlayer(st, p, BLAST_PLAYER_DMG);
  }
  for (const b of st.barrels) {
    if (!b.dead && b.fuse < 0 && dist(b, pos) < radius) b.fuse = 0;
  }
}

function updateProps(st, dt) {
  st.crateT -= dt;
  if (st.crateT <= 0 && st.crates.length < MAX_CRATES) {
    st.crateT = CRATE_EVERY;
    const pos = freeSpot(st);
    if (pos) { st.crates.push(pos); st.events.push('crateSpawn'); }
  }
  for (let i = st.crates.length - 1; i >= 0; i--) {
    const c = st.crates[i];
    for (const p of st.players) {
      if (p.alive && dist(c, p) < 16) {
        p.ammo += CRATE_AMMO;
        st.stats.crates++;
        st.crates.splice(i, 1);
        st.events.push('pickup');
        break;
      }
    }
  }
  for (const b of st.barrels) {
    if (b.dead || b.fuse < 0) continue;
    b.fuse += dt;
    if (b.fuse > BARREL_FUSE) { b.dead = true; st.stats.barrels++; detonate(st, b, BARREL_R); }
  }
  for (let i = st.blasts.length - 1; i >= 0; i--) {
    const bl = st.blasts[i];
    bl.t += dt;
    if (bl.t >= bl.dur) st.blasts.splice(i, 1);
  }
}

function updateParts(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const p = st.parts[i];
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.t >= p.dur) st.parts.splice(i, 1);
  }
}

function freeSpot(st) {
  for (let tries = 0; tries < 20; tries++) {
    const pos = { x: 40 + st.rng() * (W - 80), y: 40 + st.rng() * (H - 80) };
    if (st.players.some(p => dist(pos, p) < 60)) continue;
    if (st.room.obstacles.some(o => overlap(bodyRect(pos, 9), o))) continue;
    return pos;
  }
  return null;
}

const BH = { W, H, DT, ROOMS, WEAPONS, DM_TARGET, weaponForMult, waveDef, create, step };
if (typeof module !== 'undefined' && module.exports) module.exports = BH;
root.BOXENGINE = BH;
})(typeof globalThis !== 'undefined' ? globalThis : this);
