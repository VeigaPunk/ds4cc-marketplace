/* games/impossible/engine.js — pure sim for the one-button autorunner.
 * No DOM/canvas/wall-clock — safe under Node for validate.mjs.
 * Constants ported from prototypes/impossible-game.html (verified mechanics:
 * front-edge side-kill, 0.10s buffer, 0.06s coyote, fixed impulse, no
 * variable jump height).
 */
(function (root) {
'use strict';

const SPEED = 360;        // px/s auto-run
const GRAV = 2600;        // px/s^2
const JUMP_V = 880;       // fixed impulse
const CUBE = 34;          // hitbox edge
const JUMP_BUFFER = 0.10; // s
const COYOTE = 0.06;      // s
const RESPAWN_S = 0.16;   // spec: death -> respawn <=200ms feel
const GROUND_Y = 430;
const W = 960, H = 540;

/* Level data contract (levels/*.js push these):
 *   { id, name, bpm, hue, end, checkpoints:[x,...],
 *     rows: [ ['spike',x,w], ['gap',x,w], ['block',x,w,h], ... ] }  (px)
 * Beat-grid helper lives in levels/format.js — rows arrive already in px. */

function create(level) {
  const st = {
    L: level,
    t: 0,                    // sim seconds
    x0: 0,                   // spawn x (practice respawn = checkpoint)
    state: 'running',        // 'running' | 'dead' | 'clear'
    attempt: 1, deaths: 0,
    pressT: -1,              // sim-time of last jump press (-1 none)
    offsetS: 0,              // input-offset calibration (seconds)
    deadT: 0, clearT: 0,
    lastCp: 0,               // furthest checkpoint passed (practice)
    events: [],              // 'die' | 'clear' | 'land' | 'jump' (drained by shell)
  };
  respawn(st, 0);
  return st;
}

function respawn(st, spawnX) {
  st.cube = { x: spawnX, y: GROUND_Y - CUBE, vy: 0, grounded: true, rot: 0 };
  st.pressT = -1; st.deadT = 0; st.state = 'running';
}

function press(st) { st.pressT = st.t; }
function setOffsetMs(st, ms) { st.offsetS = Math.max(0, Math.min(0.2, ms / 1000)); }

function floorAt(P, x) { // highest floor top under point x (ground or block top), or -Infinity in gap
  let top = -Infinity, inGap = false;
  for (const r of P.rows) {
    const t = r[0], ox = r[1], ow = r[2];
    if (x < ox || x > ox + ow) continue;
    if (t === 'gap') inGap = true;
    if (t === 'block') top = Math.max(top, GROUND_Y - r[3]);
  }
  if (top > -Infinity) return top;
  return inGap ? -Infinity : GROUND_Y;
}
function solidSideAt(P, x, y) { // block side/bottom overlap at front edge -> death
  for (const r of P.rows) {
    if (r[0] !== 'block') continue;
    const top = GROUND_Y - r[3];
    if (x > r[1] && x < r[1] + r[2] && y + CUBE > top + 2 && y < GROUND_Y) return true;
  }
  return false;
}
function spikeAt(P, x, y) {
  const cx = x + CUBE / 2, cy = y + CUBE;
  for (const r of P.rows) {
    if (r[0] !== 'spike') continue;
    if (cx > r[1] + 4 && cx < r[1] + r[2] - 4 && cy > GROUND_Y - 26) return true;
  }
  return false;
}

function die(st) {
  st.state = 'dead'; st.deadT = 0; st.deaths++;
  st.events.push('die');
}

function step(st, dt) {
  if (st.state === 'dead') {
    st.deadT += dt;
    if (st.deadT >= RESPAWN_S) { st.attempt++; respawn(st, st.lastCp); }
    return;
  }
  if (st.state === 'clear') { st.clearT += dt; return; }
  st.t += dt;
  const c = st.cube, P = st.L;

  c.x += SPEED * dt;
  const footX = c.x + CUBE / 2;
  const floor = floorAt(P, footX);

  if (c.grounded) {
    if (floor === -Infinity || c.y + CUBE < floor - 1) { c.grounded = false; st.coyote = COYOTE; }
  } else {
    st.coyote = Math.max(0, (st.coyote || 0) - dt);
    c.vy += GRAV * dt;
    c.y += c.vy * dt;
    if (floor > -Infinity && c.vy >= 0 && c.y + CUBE >= floor) {
      c.y = floor - CUBE; c.vy = 0; c.grounded = true;
      c.rot = Math.round(c.rot / (Math.PI / 2)) * (Math.PI / 2);
      st.events.push('land');
    }
  }
  if (!c.grounded) c.rot += dt * 4.2;

  // jump consume — effective press window [offset, offset+buffer] (sim time)
  if (st.pressT >= 0) {
    const age = st.t - st.pressT;
    if (age >= st.offsetS && age <= st.offsetS + JUMP_BUFFER && (c.grounded || st.coyote > 0)) {
      c.vy = -JUMP_V; c.grounded = false; st.coyote = 0; st.pressT = -1;
      st.events.push('jump');
    } else if (age > st.offsetS + JUMP_BUFFER) st.pressT = -1;
  }

  // checkpoint flags (practice)
  for (const cx of P.checkpoints || []) if (c.x >= cx && st.lastCp < cx) st.lastCp = cx;

  // hazards
  if (spikeAt(P, c.x, c.y) || solidSideAt(P, c.x + CUBE, c.y)) return die(st);
  if (floor === -Infinity && c.y + CUBE > GROUND_Y + 8) return die(st);
  if (c.y > H + 200) return die(st);
  if (c.x >= P.end) { st.state = 'clear'; st.clearT = 0; st.events.push('clear'); }
}

root.ImpossibleEngine = {
  SPEED, GRAV, JUMP_V, CUBE, JUMP_BUFFER, COYOTE, RESPAWN_S, GROUND_Y, W, H,
  create, step, press, setOffsetMs, respawn, floorAt, solidSideAt, spikeAt,
};
})(typeof globalThis !== 'undefined' ? globalThis : this);
