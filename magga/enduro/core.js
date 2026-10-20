/*
 * Enduro — shared race simulation.
 *
 * Both the Classic and Remastered builds run this exact simulation; they only
 * differ in how they draw and sound. Rules follow the 1983 cartridge manual:
 * pass 200 cars on day one and 300 on every later day before daybreak, the
 * button accelerates and releasing it holds the current speed, pulling back
 * brakes, ice dulls the steering, fog hides the road ahead, and at night only
 * tail lights are visible. Five full days earns the trophy.
 *
 * World units: `d` is distance along the road ahead of the player, `x` is the
 * lateral position where the road edges sit at -1 and +1.
 */
(function (global) {
  'use strict';

  var C = {
    SIM_HZ: 60,
    VMAX: 150,            // player top speed (units/s)
    ACCEL: 34,            // base acceleration (units/s^2), tapers near top speed
    BRAKE: 115,
    CAM_BACK: 60,         // camera distance behind the player
    HORIZON_D: 200,       // distance ahead that projects onto the horizon
    CAR_LEN: 5.5,         // collision length along the road
    CAR_HALF_W: 0.14,     // car half width in road units
    STEER: 1.25,          // lateral speed at full grip (road units/s)
    DRIFT: 0.62,          // centrifugal push on a full-strength bend at top speed
    ODO_DIV: 18.75,       // world units per odometer tick (~8 ticks/s flat out)
    DAY_LENGTH: 216,      // seconds of race clock per day
    BEND_STEP: 2,
    BEND_SAMPLES: 120,
    TROPHY_DAYS: 5
  };

  // Time of day, in order, from first light to the next daybreak.
  var PHASES = [
    { id: 'day', dur: 34 },
    { id: 'snow', dur: 34 },
    { id: 'day', dur: 24 },
    { id: 'dusk', dur: 30 },
    { id: 'night', dur: 26 },
    { id: 'fog', dur: 24 },
    { id: 'night', dur: 22 },
    { id: 'dawn', dur: 22 }
  ];

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function quotaFor(day) { return day === 1 ? 200 : 300; }

  // Later days: faster rivals, denser and wider traffic. The density keeps a
  // flawless run at roughly 1.85 passes a second, so mistakes decide the day.
  function difficulty(day) {
    var n = day - 1;
    var vOpp = Math.min(100, 60 + 5 * n);
    return {
      vOpp: vOpp,
      gap: day === 1 ? 62 : Math.max(28, (C.VMAX - vOpp) / 1.85),
      spread: Math.min(0.78, 0.4 + 0.08 * n),
      pairChance: Math.min(0.38, 0.12 + 0.05 * n)
    };
  }

  function phaseAt(t) {
    var acc = 0;
    for (var i = 0; i < PHASES.length; i++) {
      var p = PHASES[i];
      if (t < acc + p.dur || i === PHASES.length - 1) {
        return { index: i, id: p.id, t: clamp((t - acc) / p.dur, 0, 1), start: acc, dur: p.dur };
      }
      acc += p.dur;
    }
  }

  // Projection shared by both renderers: 1 at the player's bumper, 0 at the horizon.
  function depthScale(d) {
    var z = d + C.CAM_BACK;
    if (z <= 1) return 99;
    var far = C.CAM_BACK / (C.HORIZON_D + C.CAM_BACK);
    return (C.CAM_BACK / z - far) / (1 - far);
  }

  // Inverse of depthScale: the road distance seen at screen fraction p.
  function depthAt(p) {
    var far = C.CAM_BACK / (C.HORIZON_D + C.CAM_BACK);
    var k = p * (1 - far) + far;
    return C.CAM_BACK / k - C.CAM_BACK;
  }

  function Game(seed) {
    this.seed = seed == null ? (Date.now() & 0x7fffffff) : seed;
    this.reset();
  }

  Game.prototype.reset = function () {
    this.rng = mulberry32(this.seed);
    this.state = 'ready';       // ready -> race -> over
    this.day = 1;
    this.clock = 0;             // seconds into the current day
    this.raceTime = 0;
    this.s = 0;                 // distance travelled along the road
    this.v = 0;
    this.x = 0;
    this.vx = 0;
    this.odo = 0;
    this.carsLeft = quotaFor(1);
    this.quotaMet = false;
    this.trophy = false;
    this.crashT = 0;
    this.edgeT = 0;
    this.scrapeT = 0;
    this.wheelPhase = 0;
    this.scenery = 0;           // horizontal mountain scroll (screen widths)
    this.cars = [];
    this.nextId = 1;
    this.events = [];
    this.bend = new Float32Array(C.BEND_SAMPLES + 1);
    this.segments = [];
    this.segEnd = 0;
    this.lastTarget = 0;
    this.diff = difficulty(1);
    this.lastDayStats = null;
    this.addSegment(700, 0);
    this.ensureRoad(C.HORIZON_D + 400);
    this.seedTraffic();
    this.computeBend();
  };

  Game.prototype.addSegment = function (len, target) {
    this.segments.push({ s0: this.segEnd, len: len, from: this.lastTarget, to: target });
    this.segEnd += len;
    this.lastTarget = target;
  };

  Game.prototype.ensureRoad = function (sAhead) {
    var r = this.rng;
    while (this.segEnd < sAhead) {
      var straight = r() < 0.3;
      var mag = straight ? 0 : [0.35, 0.55, 0.8, 1][Math.floor(r() * 4)];
      var dir = r() < 0.5 ? -1 : 1;
      this.addSegment(260 + Math.floor(r() * 640), mag * dir);
    }
    while (this.segments.length > 2 && this.segments[1].s0 + this.segments[1].len < this.s - 50) {
      this.segments.shift();
    }
  };

  Game.prototype.curvAt = function (s) {
    var segs = this.segments;
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (s < g.s0 + g.len) {
        var ease = Math.min(220, g.len * 0.45);
        return g.from + (g.to - g.from) * smooth((s - g.s0) / ease);
      }
    }
    return this.lastTarget;
  };

  Game.prototype.computeBend = function () {
    var step = C.BEND_STEP, slope = 0, off = 0;
    var norm = 0.5 * C.HORIZON_D * C.HORIZON_D;
    this.bend[0] = 0;
    for (var i = 1; i <= C.BEND_SAMPLES; i++) {
      slope += this.curvAt(this.s + i * step) * step;
      off += slope * step;
      this.bend[i] = off / norm;
    }
  };

  // Screen-space bend at distance d ahead: roughly -1..1 at the horizon.
  Game.prototype.bendAt = function (d) {
    if (d <= 0) return 0;
    var f = d / C.BEND_STEP;
    var i = Math.floor(f);
    if (i >= C.BEND_SAMPLES) return this.bend[C.BEND_SAMPLES];
    return this.bend[i] + (this.bend[i + 1] - this.bend[i]) * (f - i);
  };

  Game.prototype.pickLane = function () {
    var spread = this.diff.spread;
    var slots = [-1, -0.5, 0, 0.5, 1];
    return slots[Math.floor(this.rng() * slots.length)] * spread;
  };

  // A traffic "slot" is one car, a side-by-side pair or a staggered pair.
  Game.prototype.spawnSlot = function (d, away) {
    var r = this.rng, lane = this.pickLane();
    var hue = Math.floor(r() * 8);
    this.cars.push({ id: this.nextId++, d: d, x: lane, hue: hue, side: d > 0 ? 1 : -1 });
    if (r() < this.diff.pairChance) {
      var other = lane <= 0 ? lane + 0.62 : lane - 0.62;
      other = clamp(other, -0.8, 0.8);
      var stagger = r() < 0.5 ? 0 : (8 + r() * 6) * away;
      this.cars.push({ id: this.nextId++, d: d + stagger, x: other, hue: (hue + 3) % 8, side: d + stagger > 0 ? 1 : -1 });
    }
  };

  Game.prototype.gapSample = function () {
    var g = this.diff.gap;
    return g * (0.55 + this.rng() * 0.9);
  };

  Game.prototype.seedTraffic = function () {
    var d = 90;
    while (d < C.HORIZON_D + 40) {
      this.spawnSlot(d, 1);
      d += this.gapSample();
    }
    this.farD = d;
    this.nearD = 90;
  };

  Game.prototype.manageTraffic = function (rel) {
    // Every car cruises at one speed, so the whole stream slides relative to us.
    var cars = this.cars, i;
    var far = C.HORIZON_D + 40, behind = -C.CAM_BACK * 0.75, gone = -C.CAM_BACK * 1.4;
    for (i = 0; i < cars.length; i++) cars[i].d += rel;
    this.farD += rel;
    this.nearD += rel;
    while (this.farD < far) {
      this.spawnSlot(this.farD, 1);
      this.farD += this.gapSample();
    }
    if (this.farD > far + 120) this.farD = far + 120;
    // Overtaking traffic joins from behind once the start is underway, always off-screen.
    if (this.raceTime > 3.5) {
      while (this.nearD > behind) {
        if (this.nearD < -12) this.spawnSlot(this.nearD, -1);
        this.nearD -= this.gapSample();
      }
    }
    if (this.nearD < gone) this.nearD = gone;
    for (i = cars.length - 1; i >= 0; i--) {
      if (cars[i].d > far + 140 || cars[i].d < gone) cars.splice(i, 1);
    }
  };

  Game.prototype.emit = function (type, data) {
    this.events.push({ type: type, data: data });
  };

  Game.prototype.start = function () {
    if (this.state === 'over') this.reset();
    if (this.state === 'ready') {
      this.state = 'race';
      this.emit('start');
    }
  };

  Game.prototype.endDay = function () {
    this.lastDayStats = { day: this.day, odo: Math.floor(this.odo) };
    if (this.quotaMet) {
      if (this.day >= C.TROPHY_DAYS && !this.trophy) {
        this.trophy = true;
        this.emit('trophy');
      }
      this.day += 1;
      this.clock = 0;
      this.carsLeft = quotaFor(this.day);
      this.quotaMet = false;
      this.diff = difficulty(this.day);
      this.emit('newday', { day: this.day });
    } else {
      this.state = 'over';
      this.clock = PHASES.reduce(function (a, p) { return a + p.dur; }, 0) - 0.001;
      this.emit('gameover', { day: this.day, odo: Math.floor(this.odo) });
    }
  };

  Game.prototype.update = function (dt, input) {
    this.events.length = 0;
    if (this.state === 'ready') {
      if (input.accel || input.start) this.start();
      else {
        this.computeBend();
        return this.events;
      }
    }
    if (this.state === 'over') {
      if (input.start) { this.reset(); this.start(); }
      return this.events;
    }

    var phase = phaseAt(this.clock);
    var icy = phase.id === 'snow';
    var vmax = C.VMAX;

    // Throttle: the button accelerates, releasing it holds speed, back brakes.
    if (this.crashT > 0) {
      this.crashT -= dt;
    } else if (input.brake) {
      this.v -= C.BRAKE * dt;
    } else if (input.accel) {
      this.v += C.ACCEL * (1 - 0.55 * this.v / vmax) * dt;
    }
    this.v = clamp(this.v, 0, vmax);
    var speedFrac = this.v / vmax;

    // Steering. Ice turns the input into a slow, sliding response.
    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var grip = this.v < 1 ? 0 : Math.min(1, 0.45 + speedFrac);
    var target = dir * C.STEER * grip;
    if (icy) this.vx += (target - this.vx) * (1 - Math.exp(-1.7 * dt));
    else this.vx = target;
    var curv = this.curvAt(this.s);
    this.x += this.vx * dt - curv * speedFrac * speedFrac * C.DRIFT * dt;

    var limit = 1 - C.CAR_HALF_W * 0.55;
    this.edgeT = Math.max(0, this.edgeT - dt);
    if (Math.abs(this.x) > limit) {
      this.x = limit * Math.sign(this.x);
      if (icy) this.vx = 0;
      if (this.v > vmax * 0.25) {
        this.v = Math.max(vmax * 0.25, this.v - 60 * dt);
        this.scrapeT = 0.12;
        if (this.edgeT <= 0) { this.emit('edge'); this.edgeT = 0.35; }
      }
    }
    this.scrapeT = Math.max(0, this.scrapeT - dt);

    // Move along the road.
    var ds = this.v * dt;
    this.s += ds;
    this.odo += ds / C.ODO_DIV;
    this.wheelPhase = (this.wheelPhase + ds * 0.35) % 2;
    this.scenery += curv * speedFrac * dt * 0.12;
    this.ensureRoad(this.s + C.HORIZON_D + 400);
    this.computeBend();

    var rel = (this.diff.vOpp - this.v) * dt;
    var cars = this.cars;
    this.manageTraffic(rel);

    // Passing bookkeeping and collisions.
    for (var j = 0; j < cars.length; j++) {
      var c = cars[j];
      var before = c.side;
      var now = c.d >= 0 ? 1 : -1;
      if (before !== now) {
        c.side = now;
        if (now < 0) {
          this.emit('pass');
          if (!this.quotaMet) {
            this.carsLeft -= 1;
            if (this.carsLeft <= 0) {
              this.carsLeft = 0;
              this.quotaMet = true;
              this.emit('quota', { day: this.day });
            }
          }
        } else {
          this.emit('passed');
          if (!this.quotaMet) this.carsLeft = Math.min(999, this.carsLeft + 1);
        }
      }
      var dx = c.x - this.x, touch = C.CAR_HALF_W * 1.85;
      if (c.d < 0 && c.d > -C.CAR_LEN * 3 && rel > 0 && Math.abs(dx) < touch + 0.04) {
        // Traffic overtaking from below the screen steers around you: you can't see it coming.
        c.x += (dx >= 0 ? 1 : -1) * C.STEER * 0.8 * dt;
        c.x = clamp(c.x, -0.86, 0.86);
      }
      if (this.crashT <= 0 && c.d >= 0 && c.d < C.CAR_LEN && Math.abs(c.x - this.x) < touch) {
        this.crashT = 0.9;
        this.v = Math.min(this.v, this.diff.vOpp * 0.4);
        this.x += (this.x >= c.x ? 1 : -1) * 0.06;
        this.vx = 0;
        this.emit('crash', { x: c.x, d: c.d });
      }
    }

    // Race clock.
    this.raceTime += dt;
    this.clock += dt;
    if (this.clock >= C.DAY_LENGTH) this.endDay();
    return this.events;
  };

  Game.prototype.phase = function () { return phaseAt(Math.min(this.clock, C.DAY_LENGTH - 0.001)); };

  Game.prototype.snapshot = function () {
    return {
      state: this.state, day: this.day, clock: this.clock, v: this.v, x: this.x,
      odo: this.odo, carsLeft: this.carsLeft, quotaMet: this.quotaMet,
      trophy: this.trophy, crashT: this.crashT, phase: this.phase().id, cars: this.cars.length
    };
  };

  var DAY_TOTAL = PHASES.reduce(function (a, p) { return a + p.dur; }, 0);
  if (DAY_TOTAL !== C.DAY_LENGTH) C.DAY_LENGTH = DAY_TOTAL;

  global.EnduroCore = {
    C: C,
    PHASES: PHASES,
    Game: Game,
    phaseAt: phaseAt,
    depthScale: depthScale,
    depthAt: depthAt,
    quotaFor: quotaFor,
    difficulty: difficulty,
    clamp: clamp,
    smooth: smooth
  };
})(typeof window !== 'undefined' ? window : globalThis);
