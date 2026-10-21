/*
 * Frostbite — the shared simulation both cabinets draw. One fixed 60 Hz step,
 * deterministic for a given seed. Coordinates are 2600 playfield pixels:
 * x 0..159 (the first 8 columns are the HMOVE bar, so play runs 8..159),
 * y 0..191 top to bottom.
 *
 * Rules follow the 1983 handbook: jump onto white floes to add igloo blocks
 * (they turn blue; all four blue turns them white again), sixteen jumps raise
 * the igloo and its door, then jump into it before the temperature falls from
 * 45 degrees to zero. Geese, crabs and clams push you into the sea, the polar
 * grizzly prowls the shore from level 4, fish are 200 points, the red button
 * reverses your floe for the price of a block, and a bonus builder arrives
 * every 5,000 points (nine in reserve at most). Four igloos make a shift:
 * day, then night.
 */
(function (global) {
  'use strict';

  var C = {
    SIM_HZ: 60,
    W: 160,
    H: 192,
    LEFT: 8,                 // HMOVE bar
    RIGHT: 160,
    SKY_END: 40,             // first shore row
    SHORE_END: 78,           // first water row
    SHORE_FEET: 75,
    ROW_TOP: [98, 122, 146, 170],
    FLOE_H: 7,
    TRACK: 160,              // floes wrap around this
    GROUPS: 2,
    SPACING: 80,
    BAILEY_W: 8,
    BAILEY_H: 18,
    JUMP_FRAMES: 18,
    JUMP_ARC: 7,
    LAND_PAUSE: 4,
    WALK: 1,
    TEMP_START: 45,
    TEMP_FRAMES: 62,
    IGLOO_BLOCKS: 16,        // fifteen blocks and the door
    IGLOO_X: 112,
    IGLOO_W: 32,
    IGLOO_BASE: 57,
    DOOR_X: 124,
    BEAR_LEVEL: 4,
    BEAR_MIN_X: 24,          // the far-left corner of the shore is out of his reach
    BEAR_MAX_X: 144,
    BEAR_W: 16,
    BEAR_FEET: 68,
    BEAR_TURN: 22,
    LIFE_EVERY: 5000,
    MAX_RESERVES: 9,
    START_RESERVES: 3,
    FISH_POINTS: 200,
    READY_FRAMES: 48,
    FLOCK_GAP: 14,
    CRITTER_W: 8
  };

  var KINDS = ['goose', 'crab', 'clam'];
  var CRITTER_H = { goose: 7, crab: 6, clam: 5, fish: 5 };

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mod(a, n) { return ((a % n) + n) % n; }
  function scoreLevel(level) { return Math.min(level, 9); }
  function floeSpeed(level) { return Math.min(1.7, 0.5 + 0.12 * (Math.min(level, 12) - 1)); }
  function airSpeed(level) { return Math.min(1.8, 1 + 0.1 * (Math.min(level, 9) - 1)); }
  function critterSpeed(level) { return Math.min(1.5, 0.45 + 0.09 * (Math.min(level, 12) - 1)); }
  function bearSpeed(level) { return Math.min(1.05, 0.6 + 0.05 * (level - C.BEAR_LEVEL)); }
  function isNight(level) { return Math.floor((level - 1) / 4) % 2 === 1; }
  function feetY(row) { return row < 0 ? C.SHORE_FEET : C.ROW_TOP[row] + 2; }

  // The ice for each igloo of a shift: chunks, slabs, then both of them breathing.
  function iceFor(level) {
    var k = (level - 1) % 4;
    return { kind: k % 2 === 0 ? 'small' : 'slab', breathe: k >= 2 };
  }

  // One floe group, relative to its centre.
  function layout(kind, breathe, phase) {
    var g, w;
    if (kind === 'small') {
      w = 12;
      g = breathe ? 2 + 5 * (1 - Math.cos(phase)) : 2;
      return [{ dx: -w * 1.5 - g, w: w }, { dx: -w / 2, w: w }, { dx: w / 2 + g, w: w }];
    }
    if (!breathe) return [{ dx: -20, w: 40 }];
    w = 40 / 3;
    g = 6 * (1 - Math.cos(phase));
    return [{ dx: -w * 1.5 - g, w: w }, { dx: -w / 2, w: w }, { dx: w / 2 + g, w: w }];
  }

  function Player(startLevel) {
    this.score = 0;
    this.reserves = C.START_RESERVES;
    this.level = startLevel;
    this.blocks = 0;
    this.nextLife = C.LIFE_EVERY;
    this.out = false;
  }

  function Game(seed) {
    this.rng = mulberry32((seed >>> 0) || 0x5eed);
    this.mode = 1;
    this.frame = 0;
    this.events = [];
    this.prevFire = false;
    this.reset();
  }

  Game.prototype.reset = function () {
    this.state = 'title';
    this.players = [new Player(this.startLevel())];
    this.cur = 0;
    this.buildLevel();
    this.bailey.visible = true;
  };

  Game.prototype.startLevel = function () { return this.mode >= 3 ? 5 : 1; };
  Game.prototype.playerCount = function () { return this.mode % 2 === 0 ? 2 : 1; };
  Game.prototype.player = function () { return this.players[this.cur]; };
  Game.prototype.iglooComplete = function () { return this.player().blocks >= C.IGLOO_BLOCKS; };

  Object.defineProperty(Game.prototype, 'level', { get: function () { return this.player().level; } });
  Object.defineProperty(Game.prototype, 'night', { get: function () { return isNight(this.player().level); } });
  Object.defineProperty(Game.prototype, 'score', { get: function () { return this.player().score; } });

  Game.prototype.emit = function (type, data) { this.events.push({ type: type, data: data || {} }); };

  // Lay out the board for the current player's level. The igloo is kept: a lost
  // builder hands his half-built igloo to the next one.
  Game.prototype.buildLevel = function () {
    var level = this.level, ice = iceFor(level), sp = floeSpeed(level), rng = this.rng;
    this.ice = ice;
    this.rows = [];
    for (var r = 0; r < 4; r++) {
      var dir = r % 2 === 0 ? 1 : -1;
      this.rows.push({
        dir: dir,
        speed: sp,
        offset: r * 27 + Math.floor(rng() * 12),
        phase: r * 1.4,
        phaseV: ice.breathe ? (Math.PI * 2) / Math.max(120, 210 - level * 6) : 0,
        blue: false,
        spawn: 40 + Math.floor(rng() * 160) + r * 30
      });
    }
    this.critters = [];
    this.temp = C.TEMP_START;
    this.tempT = 0;
    this.bailey = {
      x: 60, y: C.SHORE_FEET, row: -1, air: false, jt: 0, jFrom: 0, jTo: 0, jRow: -1,
      face: 1, walk: 0, moving: false, cool: 0, state: 'ok', sink: 0, frozen: 0, visible: true, enterT: 0
    };
    this.bear = {
      active: level >= C.BEAR_LEVEL, x: 124, dir: -1, turn: 0, moving: false, walk: 0
    };
    this.death = null;
    this.tallyT = 0;
    this.nextT = 0;
    this.readyT = 0;
    this.pushT = 0;
  };

  Game.prototype.rowVx = function (row) { return row.dir * row.speed; };

  // Floe pieces of a row, `ahead` frames into the future. x is in [0, TRACK).
  Game.prototype.rowPieces = function (r, ahead) {
    var row = this.rows[r];
    ahead = ahead || 0;
    var off = row.offset + this.rowVx(row) * ahead;
    var lay = layout(this.ice.kind, this.ice.breathe, row.phase + row.phaseV * ahead);
    var out = [];
    for (var j = 0; j < C.GROUPS; j++) {
      var cx = off + j * C.SPACING + C.SPACING / 2;
      for (var k = 0; k < lay.length; k++) out.push({ x: mod(cx + lay[k].dx, C.TRACK), w: lay[k].w });
    }
    return out;
  };

  // Is a builder standing at x (left edge) held up by row r?
  Game.prototype.supportedAt = function (r, x, ahead) {
    var a = x + 2, b = x + 6, pieces = this.rowPieces(r, ahead);
    for (var k = 0; k < pieces.length; k++) {
      var p = pieces[k];
      for (var s = -1; s <= 0; s++) {
        var px = p.x + s * C.TRACK;
        if (Math.min(b, px + p.w) - Math.max(a, px) >= 1) return true;
      }
    }
    return false;
  };

  Game.prototype.addScore = function (n) {
    var p = this.player();
    p.score += n;
    while (p.score >= p.nextLife) {
      p.nextLife += C.LIFE_EVERY;
      if (p.reserves < C.MAX_RESERVES) {
        p.reserves++;
        this.emit('life', { reserves: p.reserves });
      }
    }
  };

  Game.prototype.newGame = function () {
    var n = this.playerCount();
    this.players = [];
    for (var i = 0; i < n; i++) this.players.push(new Player(this.startLevel()));
    this.cur = 0;
    this.buildLevel();
    this.state = 'ready';
    this.readyT = C.READY_FRAMES;
    this.emit('start', { mode: this.mode });
  };

  Game.prototype.selectMode = function (m) {
    if (this.state !== 'title' && this.state !== 'over') return;
    this.mode = m ? m : (this.mode % 4) + 1;
    this.reset();
    this.emit('select', { mode: this.mode });
  };

  // --- per-frame pieces -------------------------------------------------------
  Game.prototype.stepRows = function () {
    for (var r = 0; r < 4; r++) {
      var row = this.rows[r];
      row.offset = mod(row.offset + this.rowVx(row), C.TRACK);
      row.phase += row.phaseV;
    }
  };

  Game.prototype.spawnFlock = function (r) {
    var rng = this.rng, level = this.level;
    var fish = level >= 2 ? rng() < 0.24 : rng() < 0.12;
    var kind;
    if (fish) kind = 'fish';
    else if (level <= 4) kind = KINDS[(level - 1) % 3];
    else kind = KINDS[Math.floor(rng() * 3)];
    var maxN = fish ? 2 : Math.min(3, 1 + Math.floor((level + 1) / 2));
    var n = 1 + Math.floor(rng() * maxN);
    var dir = rng() < 0.5 ? 1 : -1;
    var sp = critterSpeed(level) * (kind === 'goose' ? 1.2 : kind === 'clam' ? 0.85 : kind === 'fish' ? 0.9 : 1);
    var span = (n - 1) * C.FLOCK_GAP + C.CRITTER_W;
    var alive = [];
    for (var i = 0; i < n; i++) alive.push(true);
    this.critters.push({
      row: r, kind: kind, n: n, alive: alive, vx: dir * sp, t: 0,
      x: dir > 0 ? -span : C.RIGHT, h: CRITTER_H[kind]
    });
  };

  Game.prototype.stepCritters = function (spawning) {
    var list = this.critters, level = this.level, rng = this.rng;
    for (var i = list.length - 1; i >= 0; i--) {
      var f = list[i];
      f.x += f.vx;
      f.t++;
      var span = (f.n - 1) * C.FLOCK_GAP + C.CRITTER_W;
      var gone = f.vx > 0 ? f.x > C.RIGHT + 2 : f.x + span < 0;
      var empty = f.alive.indexOf(true) < 0;
      if (gone || empty) {
        list.splice(i, 1);
        this.rows[f.row].spawn = 60 + Math.floor(rng() * Math.max(80, 260 - level * 12));
      }
    }
    if (!spawning) return;
    for (var r = 0; r < 4; r++) {
      var row = this.rows[r];
      var busy = false;
      for (var k = 0; k < list.length; k++) if (list[k].row === r) busy = true;
      if (busy) continue;
      if (--row.spawn <= 0) this.spawnFlock(r);
    }
  };

  Game.prototype.stepBear = function () {
    var bear = this.bear, b = this.bailey;
    if (!bear.active) return;
    var target = b.x + C.BAILEY_W / 2 - C.BEAR_W / 2;
    var d = target - bear.x;
    var want = Math.abs(d) < 2 ? 0 : d > 0 ? 1 : -1;
    var sp = bearSpeed(this.level);
    if (want === 0) {
      bear.moving = false;
      bear.turn = 0;
    } else if (want !== bear.dir) {
      // He lumbers on a moment before he turns round: that is how you fake him out.
      bear.turn++;
      bear.moving = true;
      if (bear.turn >= C.BEAR_TURN) { bear.dir = want; bear.turn = 0; }
    } else {
      bear.turn = 0;
      bear.moving = true;
    }
    if (bear.moving) {
      bear.x += bear.dir * sp;
      bear.walk += sp;
    }
    var lo = C.BEAR_MIN_X, hi = C.BEAR_MAX_X - C.BEAR_W;
    if (bear.x < lo) { bear.x = lo; bear.moving = false; }
    if (bear.x > hi) { bear.x = hi; bear.moving = false; }
  };

  function overlap(a0, a1, b0, b1) { return Math.min(a1, b1) - Math.max(a0, b0); }

  Game.prototype.flockMembers = function (f) {
    var out = [];
    for (var i = 0; i < f.n; i++) if (f.alive[i]) out.push({ i: i, x: f.x + i * C.FLOCK_GAP });
    return out;
  };

  Game.prototype.die = function (cause) {
    var b = this.bailey;
    this.state = 'dying';
    this.death = { cause: cause, t: 0, dir: 1 };
    b.state = cause;
    b.air = false;
    if (cause === 'bear') this.death.dir = this.bear.x + C.BEAR_W / 2 < b.x + C.BAILEY_W / 2 ? 1 : -1;
    this.emit(cause, { x: b.x, y: b.y, row: b.row });
  };

  Game.prototype.land = function () {
    var b = this.bailey;
    b.air = false;
    b.y = b.jTo;
    b.row = b.jRow;
    b.cool = C.LAND_PAUSE;
    if (b.row < 0) { this.emit('shore', { x: b.x }); return; }
    var row = this.rows[b.row];
    if (!this.supportedAt(b.row, b.x, 0)) { this.die('drown'); return; }
    if (row.blue) { this.emit('land', { row: b.row, white: false }); return; }
    row.blue = true;
    var p = this.player();
    this.addScore(10 * scoreLevel(this.level));
    this.emit('land', { row: b.row, white: true });
    if (p.blocks < C.IGLOO_BLOCKS) {
      p.blocks++;
      this.emit('block', { blocks: p.blocks });
      if (p.blocks === C.IGLOO_BLOCKS) this.emit('igloo', {});
    }
    var allBlue = true;
    for (var r = 0; r < 4; r++) if (!this.rows[r].blue) allBlue = false;
    if (allBlue) {
      for (r = 0; r < 4; r++) this.rows[r].blue = false;
      this.emit('whiten', {});
    }
  };

  Game.prototype.jump = function (target) {
    var b = this.bailey;
    b.air = true;
    b.jt = 0;
    b.jFrom = b.y;
    b.jTo = feetY(target);
    b.jRow = target;
    this.emit('jump', { from: b.row, to: target });
  };

  Game.prototype.underIgloo = function () {
    var cx = this.bailey.x + C.BAILEY_W / 2;
    return cx >= C.IGLOO_X - 3 && cx <= C.IGLOO_X + C.IGLOO_W + 3;
  };

  Game.prototype.stepBailey = function (inp, firePressed) {
    var b = this.bailey, level = this.level;
    var h = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (h) b.face = h;
    b.moving = false;
    var lo = C.LEFT, hi = C.RIGHT - C.BAILEY_W;

    if (b.air) {
      b.jt++;
      b.x += h * airSpeed(level);
      if (h) b.moving = true;
      if (b.x < lo) b.x = lo;
      if (b.x > hi) b.x = hi;
      var k = b.jt / C.JUMP_FRAMES;
      b.y = b.jFrom + (b.jTo - b.jFrom) * k - Math.sin(Math.PI * k) * C.JUMP_ARC;
      if (b.jt >= C.JUMP_FRAMES) this.land();
      return;
    }

    if (b.row >= 0) b.x += this.rowVx(this.rows[b.row]);
    if (h) {
      b.x += h * C.WALK;
      b.moving = true;
      b.walk += C.WALK;
    }

    // Hazards only bite when both feet are planted: they shove you along.
    if (b.row >= 0) {
      for (var i = 0; i < this.critters.length; i++) {
        var f = this.critters[i];
        if (f.row !== b.row || f.kind === 'fish') continue;
        var mem = this.flockMembers(f);
        for (var m = 0; m < mem.length; m++) {
          if (overlap(b.x + 1, b.x + 7, mem[m].x + 1, mem[m].x + 7) >= 1) {
            b.x += f.vx;
            if (this.pushT <= 0) { this.emit('push', { kind: f.kind }); this.pushT = 24; }
            break;
          }
        }
      }
    }
    if (this.pushT > 0) this.pushT--;

    if (b.x < lo) b.x = lo;
    if (b.x > hi) b.x = hi;

    if (b.row >= 0 && !this.supportedAt(b.row, b.x, 0)) { this.die('drown'); return; }
    if (b.row < 0 && this.bear.active &&
        overlap(b.x + 1, b.x + 7, this.bear.x + 2, this.bear.x + C.BEAR_W - 2) >= 1) {
      this.die('bear');
      return;
    }

    if (b.cool > 0) { b.cool--; return; }
    if (firePressed && b.row >= 0) {
      var p = this.player(), done = this.iglooComplete();
      if (done || p.blocks > 0) {
        if (!done) p.blocks--;
        var row = this.rows[b.row];
        row.dir = -row.dir;
        this.emit('reverse', { row: b.row, blocks: p.blocks });
      } else {
        this.emit('deny', {});
      }
    }
    if (inp.down && b.row < 3) this.jump(b.row + 1);
    else if (inp.up && b.row >= 0) this.jump(b.row - 1);
    else if (inp.up && b.row < 0 && this.iglooComplete() && this.underIgloo()) {
      this.state = 'enter';
      b.state = 'enter';
      b.enterT = 0;
      this.emit('enter', {});
    }
  };

  Game.prototype.stepFish = function () {
    var b = this.bailey;
    for (var i = 0; i < this.critters.length; i++) {
      var f = this.critters[i];
      if (f.kind !== 'fish') continue;
      var fy = feetY(f.row);
      if (overlap(b.y - C.BAILEY_H, b.y, fy - f.h, fy) < 1) continue;
      var mem = this.flockMembers(f);
      for (var m = 0; m < mem.length; m++) {
        if (overlap(b.x, b.x + 8, mem[m].x, mem[m].x + 8) >= 2) {
          f.alive[mem[m].i] = false;
          this.addScore(C.FISH_POINTS);
          this.emit('fish', { x: mem[m].x, y: fy });
        }
      }
    }
  };

  Game.prototype.stepTemperature = function () {
    if (++this.tempT < C.TEMP_FRAMES) return;
    this.tempT = 0;
    this.temp--;
    this.emit('temp', { temp: this.temp });
    if (this.temp <= 0) {
      this.temp = 0;
      this.die('freeze');
    }
  };

  Game.prototype.stepDeath = function () {
    var d = this.death, b = this.bailey, done = false;
    d.t++;
    if (d.cause === 'drown') {
      b.sink = Math.min(C.BAILEY_H + 2, d.t * 0.3);
      done = d.t >= 96;
    } else if (d.cause === 'freeze') {
      b.frozen = Math.min(1, d.t / 60);
      done = d.t >= 140;
    } else {
      // Chased right off the screen.
      if (d.t > 10) {
        b.x += d.dir * 1.7;
        b.walk += 1.7;
        b.face = d.dir;
        if (d.t > 22) { this.bear.x += d.dir * 1.6; this.bear.walk += 1.6; this.bear.dir = d.dir; this.bear.moving = true; }
      }
      done = (b.x > C.RIGHT + 40 || b.x < -40) || d.t > 240;
    }
    if (done) this.loseLife();
  };

  Game.prototype.loseLife = function () {
    var p = this.player();
    p.reserves--;
    if (p.reserves < 0) { p.reserves = 0; p.out = true; }
    if (this.players.length > 1) {
      var other = 1 - this.cur;
      if (!this.players[other].out) {
        this.cur = other;
        this.emit('switch', { player: this.cur + 1 });
      }
    }
    if (this.player().out) {
      this.state = 'over';
      this.bailey.visible = false;
      this.bear.active = false;
      var best = 0;
      for (var i = 0; i < this.players.length; i++) best = Math.max(best, this.players[i].score);
      this.emit('gameover', { score: best, level: this.level });
      return;
    }
    this.buildLevel();
    this.state = 'ready';
    this.readyT = C.READY_FRAMES;
    this.emit('respawn', { player: this.cur + 1 });
  };

  Game.prototype.stepEnter = function () {
    var b = this.bailey;
    b.enterT++;
    var dx = C.DOOR_X - b.x;
    if (Math.abs(dx) > 0.75) {
      b.x += dx > 0 ? 1 : -1;
      b.face = dx > 0 ? 1 : -1;
      b.walk += 1;
      b.moving = true;
      return;
    }
    b.x = C.DOOR_X;
    b.moving = true;
    b.walk += 0.5;
    b.y -= 0.6;
    if (b.y <= C.IGLOO_BASE + 2) {
      b.visible = false;
      this.state = 'tally';
      this.tallyT = 30;
      this.addScore(160 * scoreLevel(this.level));
      this.emit('inside', { bonus: 160 * scoreLevel(this.level) });
    }
  };

  Game.prototype.stepTally = function () {
    if (--this.tallyT > 0) return;
    if (this.temp > 0) {
      this.temp--;
      this.addScore(10 * scoreLevel(this.level));
      this.emit('tally', { temp: this.temp });
      this.tallyT = 4;
      return;
    }
    this.state = 'next';
    this.nextT = 70;
  };

  Game.prototype.update = function (dt, inp) {
    this.events = [];
    this.frame++;
    inp = inp || {};
    var firePressed = !!inp.fire && !this.prevFire;
    this.prevFire = !!inp.fire;

    if (inp.select) this.selectMode(inp.select === true ? 0 : inp.select);
    if (inp.start && (this.state === 'title' || this.state === 'over')) this.newGame();

    switch (this.state) {
      case 'title':
      case 'over':
        this.stepRows();
        this.stepCritters(false);
        break;
      case 'ready':
        this.stepRows();
        this.stepCritters(false);
        if (--this.readyT <= 0) { this.state = 'play'; this.emit('go', {}); }
        break;
      case 'play':
        this.stepRows();
        this.stepCritters(true);
        this.stepBear();
        this.stepBailey(inp, firePressed);
        if (this.state === 'play') this.stepFish();
        if (this.state === 'play') this.stepTemperature();
        break;
      case 'dying':
        this.stepRows();
        this.stepCritters(false);
        this.stepDeath();
        break;
      case 'enter':
        this.stepRows();
        this.stepCritters(false);
        this.stepEnter();
        break;
      case 'tally':
        this.stepRows();
        this.stepCritters(false);
        this.stepTally();
        break;
      case 'next':
        this.stepRows();
        this.stepCritters(false);
        if (--this.nextT <= 0) {
          var p = this.player();
          p.level++;
          p.blocks = 0;
          this.buildLevel();
          this.state = 'ready';
          this.readyT = C.READY_FRAMES;
          this.emit('level', { level: p.level, night: isNight(p.level) });
        }
        break;
    }
    return this.events;
  };

  global.FrostbiteCore = {
    C: C,
    Game: Game,
    feetY: feetY,
    isNight: isNight,
    iceFor: iceFor,
    scoreLevel: scoreLevel,
    floeSpeed: floeSpeed
  };
})(typeof window !== 'undefined' ? window : globalThis);
