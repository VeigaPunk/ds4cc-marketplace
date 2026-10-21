/*
 * Frostbite Classic — draws the shared simulation the way the 1983 cartridge
 * did: a 160x192 frame in the NTSC 2600 palette, a blue sky with the score,
 * temperature and reserve count, the grey shore with the stepped igloo and
 * the polar grizzly, four rows of slanted ice in the Arctic sea, line-coloured
 * single-colour sprites and the black HMOVE comb down the left edge. Sound is
 * TIA-style: stepped square tones and polynomial noise.
 */
(function () {
  'use strict';

  var Core = window.FrostbiteCore;
  var C = Core.C;
  var W = 160, H = 192;

  // Stella's NTSC palette, indexed by the 2600 colour byte (even values).
  var NTSC = [
    0x000000, 0x404040, 0x6c6c6c, 0x909090, 0xb0b0b0, 0xc8c8c8, 0xdcdcdc, 0xececec,
    0x444400, 0x646410, 0x848424, 0xa0a034, 0xb8b840, 0xd0d050, 0xe8e85c, 0xfcfc68,
    0x702800, 0x844414, 0x985c28, 0xac783c, 0xbc8c4c, 0xcca05c, 0xdcb468, 0xecc878,
    0x841800, 0x983418, 0xac5030, 0xc06848, 0xd0805c, 0xe09470, 0xeca880, 0xfcbc94,
    0x880000, 0x9c2020, 0xb03c3c, 0xc05858, 0xd07070, 0xe08888, 0xeca0a0, 0xfcb4b4,
    0x78005c, 0x8c2074, 0xa03c88, 0xb0589c, 0xc070b0, 0xd084c0, 0xdc9cd0, 0xecb0e0,
    0x480078, 0x602090, 0x783ca4, 0x8c58b8, 0xa070cc, 0xb484dc, 0xc49cec, 0xd4b0fc,
    0x140084, 0x302098, 0x4c3cac, 0x6858c0, 0x7c70d0, 0x9488e0, 0xa8a0ec, 0xbcb4fc,
    0x000088, 0x1c209c, 0x3840b0, 0x505cc0, 0x6874d0, 0x7c8ce0, 0x90a4ec, 0xa4b8fc,
    0x00187c, 0x1c3890, 0x3854a8, 0x5070bc, 0x6888cc, 0x7c9cdc, 0x90b4ec, 0xa4c8fc,
    0x002c5c, 0x1c4c78, 0x386890, 0x5084ac, 0x689cc0, 0x7cb4d4, 0x90cce8, 0xa4e0fc,
    0x003c2c, 0x1c5c48, 0x387c64, 0x509c80, 0x68b494, 0x7cd0ac, 0x90e4c0, 0xa4fcd4,
    0x003c00, 0x205c20, 0x407c40, 0x5c9c5c, 0x74b474, 0x8cd08c, 0xa4e4a4, 0xb8fcb8,
    0x143800, 0x345c1c, 0x507c38, 0x6c9850, 0x84b468, 0x9ccc7c, 0xb4e490, 0xc8fca4,
    0x2c3000, 0x4c501c, 0x687034, 0x848c4c, 0x9ca864, 0xb4c078, 0xccd488, 0xe0ec9c,
    0x442800, 0x644818, 0x846830, 0xa08444, 0xb89c58, 0xd0b46c, 0xe8cc7c, 0xfce08c
  ];
  var PAL = new Uint32Array(256);
  for (var i = 0; i < 128; i++) {
    var rgb = NTSC[i];
    var r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
    PAL[i * 2] = PAL[i * 2 + 1] = (255 << 24) | (b << 16) | (g << 8) | r;
  }

  var DAY = {
    sky: 0x9a, shore: 0x08, shoreEdge: 0x0c, shoreLip: 0x04, water: 0x92,
    ice: 0x0e, iceShade: 0x0a, blue: 0x9c, blueShade: 0x96,
    block: 0x0e, grout: 0x06, door: 0x00, bear: 0x00, goose: 0x0e, hud: 0x0e
  };
  var NIGHT = {
    sky: 0x00, shore: 0x04, shoreEdge: 0x06, shoreLip: 0x02, water: 0x80,
    ice: 0x0c, iceShade: 0x08, blue: 0x98, blueShade: 0x94,
    block: 0x0a, grout: 0x02, door: 0x00, bear: 0x00, goose: 0x0c, hud: 0x0e
  };
  var HUD_P2 = 0x1e;
  var CRAB = 0x44, CLAM = 0x1c, FISH = 0xc8, ICE_MAN = 0x9e;

  // --- sprites ---------------------------------------------------------------
  function parse(rows) {
    return rows.map(function (r) {
      var out = [];
      for (var k = 0; k < r.length; k++) out.push(r[k] === 'X' ? 1 : 0);
      return out;
    });
  }
  function mirror(bm) { return bm.map(function (row) { return row.slice().reverse(); }); }
  function doubleWide(rows) {
    return rows.map(function (r) {
      var out = [];
      for (var k = 0; k < r.length; k++) out.push(r[k], r[k]);
      return out;
    });
  }

  // The builder: 8 wide, 18 lines, one colour per line (hat, face, parka, pants, boots).
  var HAT = 0x44, FACE = 0x3c, PARKA = 0x36, PANTS = 0x02, BOOTS = 0x22;
  var BAILEY_COLORS = [HAT, HAT, HAT, FACE, FACE, FACE, PARKA, PARKA, PARKA, PARKA, PARKA, PARKA, PANTS, PANTS, PANTS, PANTS, BOOTS, BOOTS];
  var TOP = [
    '..XXXX..',
    '.XXXXXX.',
    '.XXXXXXX',
    '..XXX.X.',
    '..XXXXX.',
    '...XXX..'
  ];
  var BODY_STAND = [
    '..XXXX..',
    '.XXXXXX.',
    'X.XXXX.X',
    'X.XXXX.X',
    'X.XXXX.X',
    '..XXXX..'
  ];
  var BODY_JUMP = [
    'X.XXXX.X',
    'XXXXXXXX',
    '..XXXX..',
    '..XXXX..',
    '..XXXX..',
    '..XXXX..'
  ];
  var LEGS_STAND = ['..XXXX..', '..XX.XX.', '..XX.XX.', '..XX.XX.', '.XXX.XXX', '.XXX.XXX'];
  var LEGS_WALK_A = ['..XXXX..', '..XX.XX.', '.XX...XX', '.XX...XX', 'XXX...XX', 'XX.....X'];
  var LEGS_WALK_B = ['..XXXX..', '...XXX..', '...XX...', '...XX...', '...XXX..', '..XXXX..'];
  var LEGS_JUMP = ['..XXXX..', '.XX..XX.', 'XX....XX', 'X......X', '........', '........'];
  function man(body, legs) { return parse(TOP.concat(body, legs)); }
  var MAN = {
    stand: man(BODY_STAND, LEGS_STAND),
    walkA: man(BODY_STAND, LEGS_WALK_A),
    walkB: man(BODY_STAND, LEGS_WALK_B),
    jump: man(BODY_JUMP, LEGS_JUMP)
  };
  var MAN_L = {};
  for (var key in MAN) MAN_L[key] = mirror(MAN[key]);

  // The polar grizzly, 16 wide, facing right.
  var BEAR_TOP = [
    '...........XX.X.',
    '..........XXXXXX',
    '..XXXXXXXXXXXXXX',
    '.XXXXXXXXXXXXXX.',
    'XXXXXXXXXXXXXX..',
    'XXXXXXXXXXXXXX..',
    'XXXXXXXXXXXXX...',
    '.XXXXXXXXXXXX...'
  ];
  var BEAR_A = parse(BEAR_TOP.concat(['.XX.XX...XX.XX..', '.XX..XX..XX..XX.', 'XX...XX.XX...XX.', 'XX....XXXX....XX']));
  var BEAR_B = parse(BEAR_TOP.concat(['..XXX.....XXX...', '..XXX.....XXX...', '.XXX.....XXX....', '.XXX.....XXX....']));
  var BEAR = { a: BEAR_A, b: BEAR_B, aL: mirror(BEAR_A), bL: mirror(BEAR_B) };

  var CRITTERS = {
    goose: [parse(['X.......', 'XX......', '.XX...XX', 'XXXXXXX.', '.XXXXX..', '........', '........']),
            parse(['........', '........', '......XX', 'XXXXXXX.', '.XXXXX..', '.XX.....', 'X.......'])],
    crab: [parse(['X......X', 'XX....XX', '.XXXXXX.', 'XXXXXXXX', '.X.XX.X.', 'X..XX..X']),
           parse(['XX....XX', 'X......X', '.XXXXXX.', 'XXXXXXXX', 'X.X..X.X', '.X....X.'])],
    clam: [parse(['........', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.']),
           parse(['.XXXXXX.', 'XX....XX', 'X.X.X.X.', 'XXXXXXXX', '.XXXXXX.'])],
    fish: [parse(['....XXX.', 'X..XXXXX', 'XXXXXX.X', 'X..XXXXX', '....XXX.']),
           parse(['....XXX.', 'XX.XXXXX', '.XXXXX.X', 'XX.XXXXX', '....XXX.'])]
  };
  var CRITTERS_L = {};
  for (var kind in CRITTERS) CRITTERS_L[kind] = CRITTERS[kind].map(mirror);

  // 3x7 digits drawn double wide, the way score kernels did it.
  var DIGITS = [
    ['XXX', 'X.X', 'X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
    ['.X.', 'XX.', '.X.', '.X.', '.X.', '.X.', 'XXX'],
    ['XXX', '..X', '..X', 'XXX', 'X..', 'X..', 'XXX'],
    ['XXX', '..X', '..X', '.XX', '..X', '..X', 'XXX'],
    ['X.X', 'X.X', 'X.X', 'XXX', '..X', '..X', '..X'],
    ['XXX', 'X..', 'X..', 'XXX', '..X', '..X', 'XXX'],
    ['XXX', 'X..', 'X..', 'XXX', 'X.X', 'X.X', 'XXX'],
    ['XXX', '..X', '..X', '.X.', '.X.', '.X.', '.X.'],
    ['XXX', 'X.X', 'X.X', 'XXX', 'X.X', 'X.X', 'XXX'],
    ['XXX', 'X.X', 'X.X', 'XXX', '..X', '..X', 'XXX']
  ].map(function (d) { return doubleWide(parse(d)); });
  var DEGREE = parse(['XXX', 'X.X', 'XXX']);

  // Igloo: five courses of six-pixel blocks, then the door.
  var IGLOO = (function () {
    var courses = [[113, 5], [116, 4], [119, 3], [122, 2], [125, 1]];
    var out = [];
    for (var c = 0; c < courses.length; c++) {
      for (var k = 0; k < courses[c][1]; k++) {
        out.push({ x: courses[c][0] + k * 6, y: C.IGLOO_BASE - 4 * (c + 1) });
      }
    }
    return out;
  })();

  // --- frame buffer ------------------------------------------------------------
  var screen = document.getElementById('screen');
  var sctx = screen.getContext('2d');
  var frame = document.createElement('canvas');
  frame.width = W;
  frame.height = H;
  var fctx = frame.getContext('2d');
  var img = fctx.createImageData(W, H);
  var px = new Uint32Array(img.data.buffer);

  function fillRow(y, x0, x1, c) {
    if (y < 0 || y >= H) return;
    x0 = Math.max(0, Math.round(x0));
    x1 = Math.min(W - 1, Math.round(x1));
    var col = PAL[c], base = y * W;
    for (var x = x0; x <= x1; x++) px[base + x] = col;
  }
  function plot(x, y, c) {
    x = Math.round(x); y |= 0;
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    px[y * W + x] = PAL[c];
  }
  // Blit a bitmap with its bottom row on yBottom; colour is a number or a per-line array.
  function blit(bm, x0, yBottom, c, yMax) {
    var h = bm.length;
    x0 = Math.round(x0);
    for (var r = 0; r < h; r++) {
      var y = Math.round(yBottom) - (h - 1 - r);
      if (yMax !== undefined && y > yMax) continue;
      var row = bm[r], col = typeof c === 'number' ? c : c[r];
      for (var k = 0; k < row.length; k++) if (row[k]) plot(x0 + k, y, col);
    }
  }

  var tick = 0;

  function drawBackdrop(sc) {
    var y;
    for (y = 0; y < C.SKY_END; y++) fillRow(y, 0, W - 1, sc.sky);
    for (y = C.SKY_END; y < C.SHORE_END; y++) fillRow(y, 0, W - 1, sc.shore);
    fillRow(C.SKY_END, 0, W - 1, sc.shoreEdge);
    fillRow(C.SHORE_END - 2, 0, W - 1, sc.shoreEdge);
    fillRow(C.SHORE_END - 1, 0, W - 1, sc.shoreLip);
    for (y = C.SHORE_END; y < 184; y++) fillRow(y, 0, W - 1, sc.water);
    for (y = 184; y < H; y++) fillRow(y, 0, W - 1, 0x00);
  }

  function drawIgloo(game, sc) {
    var n = game.player().blocks;
    for (var k = 0; k < Math.min(n, IGLOO.length); k++) {
      var bl = IGLOO[k];
      for (var y = bl.y; y < bl.y + 3; y++) fillRow(y, bl.x, bl.x + 4, sc.block);
      fillRow(bl.y + 3, bl.x, bl.x + 5, sc.grout);
      for (y = bl.y; y < bl.y + 3; y++) plot(bl.x + 5, y, sc.grout);
    }
    if (n >= C.IGLOO_BLOCKS) {
      for (var yy = C.IGLOO_BASE - 7; yy < C.IGLOO_BASE; yy++) fillRow(yy, 126, 129, sc.door);
      fillRow(C.IGLOO_BASE - 8, 127, 128, sc.door);
    }
  }

  function drawFloes(game, sc) {
    for (var r = 0; r < 4; r++) {
      var row = game.rows[r], top = C.ROW_TOP[r];
      var main = row.blue ? sc.blue : sc.ice, shade = row.blue ? sc.blueShade : sc.iceShade;
      var pieces = game.rowPieces(r, 0);
      for (var k = 0; k < pieces.length; k++) {
        var p = pieces[k];
        for (var s = -1; s <= 0; s++) {
          var x = p.x + s * C.TRACK;
          if (x + p.w < 0 || x > W) continue;
          for (var line = 0; line < C.FLOE_H; line++) {
            var slant = ((C.FLOE_H - 1 - line) >> 1) - 1;
            fillRow(top + line, x + slant, x + slant + p.w - 1, line === C.FLOE_H - 1 ? shade : main);
          }
        }
      }
    }
  }

  function drawCritters(game, sc) {
    for (var i = 0; i < game.critters.length; i++) {
      var f = game.critters[i];
      var frames = f.vx > 0 ? CRITTERS[f.kind] : CRITTERS_L[f.kind];
      var bm = frames[(f.t >> (f.kind === 'goose' ? 3 : 4)) & 1];
      var col = f.kind === 'goose' ? sc.goose : f.kind === 'crab' ? CRAB : f.kind === 'clam' ? CLAM : FISH;
      var yb = Core.feetY(f.row);
      for (var m = 0; m < f.n; m++) {
        if (!f.alive[m]) continue;
        blit(bm, f.x + m * C.FLOCK_GAP, yb, col);
      }
    }
  }

  function drawBear(game, sc) {
    var bear = game.bear;
    if (!bear.active && !(game.state === 'dying' && game.death.cause === 'bear')) return;
    var step = bear.moving ? (Math.floor(bear.walk / 4) & 1) : 0;
    var bm = bear.dir > 0 ? (step ? BEAR.b : BEAR.a) : (step ? BEAR.bL : BEAR.aL);
    blit(bm, bear.x, C.BEAR_FEET, sc.bear);
  }

  function drawBailey(game) {
    var b = game.bailey;
    if (!b.visible) return;
    var set = b.face < 0 ? MAN_L : MAN;
    var bm;
    if (b.air) bm = set.jump;
    else if (b.moving || (game.state === 'dying' && game.death.cause === 'bear' && game.death.t > 10)) {
      bm = (Math.floor(b.walk / 4) & 1) ? set.walkA : set.walkB;
    } else bm = set.stand;
    var colors = BAILEY_COLORS;
    if (b.frozen > 0) {
      var iced = Math.round(b.frozen * C.BAILEY_H);
      colors = BAILEY_COLORS.map(function (c, idx) { return idx >= C.BAILEY_H - iced ? ICE_MAN : c; });
    }
    if (b.state === 'enter' && b.y < C.SHORE_FEET - 8 && (tick & 2)) return;
    if (b.state === 'drown') {
      blit(bm, b.x, b.y + b.sink, colors, b.y);
      var t = game.death.t;
      if (t < 30) {
        var spread = 2 + (t >> 2);
        for (var k = 0; k < 6; k++) {
          var sx = b.x + 4 + ((k - 2.5) * spread) / 2;
          var sy = b.y - ((k * 7 + t) % 5) - (t < 15 ? t >> 2 : (30 - t) >> 2);
          plot(sx, sy, 0x0e);
        }
      }
      return;
    }
    blit(bm, b.x, b.y, colors);
  }

  function drawNumber(n, xRight, yTop, c, minDigits) {
    var s = String(Math.max(0, Math.floor(n)));
    while (s.length < (minDigits || 1)) s = '0' + s;
    for (var k = 0; k < s.length; k++) {
      var d = s.charCodeAt(s.length - 1 - k) - 48;
      blit(DIGITS[d], xRight - 6 - k * 8, yTop + 6, c);
    }
  }

  function drawHud(game, sc) {
    var p = game.player();
    var col = game.cur === 1 ? HUD_P2 : sc.hud;
    drawNumber(p.score, 104, 4, col);
    // Temperature, upper left, then the reserve count.
    drawNumber(game.temp, 62, 15, col);
    blit(DEGREE, 63, 17, col);
    if (game.state !== 'over') drawNumber(p.reserves, 92, 15, col);
  }

  function render(game) {
    tick++;
    var sc = game.night ? NIGHT : DAY;
    drawBackdrop(sc);
    drawIgloo(game, sc);
    drawBear(game, sc);
    drawFloes(game, sc);
    drawCritters(game, sc);
    drawBailey(game);
    drawHud(game, sc);
    for (var y = 0; y < H; y++) fillRow(y, 0, 7, 0x00);
    fctx.putImageData(img, 0, 0);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(frame, 0, 0, screen.width, screen.height);
  }

  // Near-4:3 picture (2600 pixels are wide). Big screens get crisp integer
  // scaling; phones get the largest fractional fit, drawn at device resolution.
  function fit() {
    var tv = document.getElementById('tv'), bezel = tv.firstElementChild;
    var avail = tv.getBoundingClientRect(), ts = getComputedStyle(tv), bs = getComputedStyle(bezel);
    var padX = parseFloat(ts.paddingLeft) + parseFloat(ts.paddingRight) + parseFloat(bs.paddingLeft) + parseFloat(bs.paddingRight);
    var padY = parseFloat(ts.paddingTop) + parseFloat(ts.paddingBottom) + parseFloat(bs.paddingTop) + parseFloat(bs.paddingBottom);
    var maxW = Math.max(120, avail.width - padX), maxH = Math.max(90, avail.height - padY);
    var s = Math.min(maxW / (W * 1.6), maxH / H);
    var cssW = Math.floor(W * 1.6 * s), cssH = Math.floor(H * s);
    for (var sy = 8; sy >= 2; sy--) {
      var sx = Math.round(sy * 1.6);
      if (W * sx <= maxW && H * sy <= maxH) {
        if (sy >= s * 0.88) { cssW = W * sx; cssH = H * sy; }
        break;
      }
    }
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    screen.width = Math.round(cssW * dpr);
    screen.height = Math.round(cssH * dpr);
    screen.style.width = cssW + 'px';
    screen.style.height = cssH + 'px';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 120); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
  fit();

  // --- TIA-style audio ----------------------------------------------------------
  // Pure tones come off a divider of the 31.4 kHz audio clock; noise is a
  // 9-bit polynomial counter.
  function tia(n, div) { return 31400 / (n + 1) / (div || 2); }

  function ClassicAudio() {
    this.ctx = null;
    this.muted = false;
    this.paused = false;
  }
  ClassicAudio.prototype.unlock = function () {
    if (!this.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.42;
      this.master.connect(ctx.destination);
      var real = new Float32Array(24), imag = new Float32Array(24);
      for (var n = 1; n < 24; n++) imag[n] = Math.sin(Math.PI * n * 0.5) * 2 / (Math.PI * n);
      this.wave = ctx.createPeriodicWave(real, imag);
      var len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = this.noise.getChannelData(0), lfsr = 0x1ff, hold = Math.round(ctx.sampleRate / 3900), v = 0;
      for (var i2 = 0; i2 < len; i2++) {
        if (i2 % hold === 0) {
          var bit = ((lfsr >> 0) ^ (lfsr >> 4)) & 1;
          lfsr = (lfsr >> 1) | (bit << 8);
          v = (lfsr & 1) ? 1 : -1;
        }
        data[i2] = v;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  };
  ClassicAudio.prototype.setMuted = function (m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.42, this.ctx.currentTime, 0.02);
  };
  ClassicAudio.prototype.setPaused = function (p) { this.paused = p; };
  // Stepped notes, one register write per 1/60 s frame: [[freq, frames], ...].
  ClassicAudio.prototype.seq = function (steps, vol) {
    if (!this.ctx || this.paused) return;
    var ctx = this.ctx, osc = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + 0.005;
    osc.setPeriodicWave(this.wave);
    var at = t;
    g.gain.setValueAtTime(0, t);
    for (var k = 0; k < steps.length; k++) {
      var f = steps[k][0], d = steps[k][1] / 60;
      osc.frequency.setValueAtTime(f || 100, at);
      g.gain.setValueAtTime(f ? vol : 0, at);
      at += d;
    }
    g.gain.setValueAtTime(0, at);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(at + 0.02);
  };
  ClassicAudio.prototype.noiseBurst = function (dur, vol, rate, fall) {
    if (!this.ctx || this.paused) return;
    var ctx = this.ctx, src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
    src.buffer = this.noise;
    src.playbackRate.setValueAtTime(rate, t);
    if (fall) src.playbackRate.linearRampToValueAtTime(rate * fall, t + dur);
    src.loop = true;
    g.gain.setValueAtTime(vol, t);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  };
  ClassicAudio.prototype.onEvents = function (events) {
    for (var k = 0; k < events.length; k++) {
      var e = events[k], d = e.data;
      switch (e.type) {
        case 'jump': this.seq([[tia(24), 2], [tia(20), 2], [tia(17), 2], [tia(14), 2], [tia(12), 2]], 0.12); break;
        case 'land':
          if (d.white) this.seq([[tia(9), 3], [0, 1], [tia(6), 5]], 0.13);
          else this.seq([[tia(28, 6), 3]], 0.12);
          break;
        case 'whiten': this.seq([[tia(12), 2], [tia(10), 2], [tia(8), 2], [tia(6), 2], [tia(4), 4]], 0.1); break;
        case 'igloo': this.seq([[tia(15), 6], [tia(11), 6], [tia(9), 6], [tia(7), 14]], 0.13); break;
        case 'reverse': this.seq([[tia(6), 2], [tia(9), 2], [tia(13), 2], [tia(18), 2], [tia(24), 3]], 0.11); break;
        case 'deny': this.seq([[tia(30, 6), 6]], 0.1); break;
        case 'push': this.noiseBurst(0.1, 0.18, 1.6); break;
        case 'fish': this.seq([[tia(8), 3], [tia(6), 3], [tia(4), 6]], 0.12); break;
        case 'drown':
          this.noiseBurst(0.55, 0.35, 1.2, 0.4);
          this.seq([[tia(12), 6], [tia(16), 6], [tia(20), 6], [tia(25), 6], [tia(31), 12]], 0.08);
          break;
        case 'freeze':
          var steps = [];
          for (var n = 4; n <= 31; n += 3) steps.push([tia(n), 6]);
          this.seq(steps, 0.11);
          break;
        case 'bear': this.noiseBurst(0.7, 0.4, 0.35, 0.7); break;
        case 'enter': this.seq([[tia(14), 4], [tia(11), 4], [tia(9), 4], [tia(7), 8]], 0.12); break;
        case 'inside': this.seq([[tia(9), 8], [tia(7), 8], [tia(5), 16]], 0.12); break;
        case 'tally': this.seq([[tia(5), 2]], 0.08); break;
        case 'level': case 'start': this.seq([[tia(11), 6], [0, 2], [tia(11), 4], [tia(9), 6], [tia(7), 12]], 0.11); break;
        case 'life': this.seq([[tia(11), 4], [tia(9), 4], [tia(7), 4], [tia(5), 4], [tia(7), 4], [tia(5), 10]], 0.12); break;
        case 'temp': if (d.temp <= 9 && d.temp > 0) this.seq([[tia(20, 6), 2]], 0.09); break;
        case 'gameover': this.seq([[tia(9), 12], [tia(12), 12], [tia(16), 12], [tia(22), 28]], 0.12); break;
        case 'select': this.seq([[tia(10), 3]], 0.08); break;
      }
    }
  };

  // --- page wiring -----------------------------------------------------------
  var msg = document.getElementById('msg');
  var bestEl = document.getElementById('best');
  var muteBtn = document.getElementById('mute');
  var pauseBtn = document.getElementById('pause');
  var selectBtn = document.getElementById('select');
  var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  function onUi(s) {
    var b = s.best, g = s.game, p = g.player();
    bestEl.textContent = b.score ? 'BEST  ' + b.score + '  ·  LEVEL ' + b.level : 'BEST  —';
    muteBtn.textContent = s.muted ? 'SOUND OFF' : 'SOUND ON';
    muteBtn.setAttribute('aria-pressed', s.muted ? 'true' : 'false');
    pauseBtn.textContent = s.paused ? 'RESUME' : 'PAUSE';
    pauseBtn.disabled = s.state === 'title' || s.state === 'over';
    var who = g.players.length > 1 ? 'Player ' + (g.cur + 1) + ' · ' : '';
    if (s.paused) msg.innerHTML = '<b>PAUSED</b> — ' + (touch ? 'tap the screen' : 'press P, Esc or an arrow') + ' to continue';
    else if (s.state === 'title') {
      msg.innerHTML = '<b>' + s.modeLabel + '</b> — ' + (touch ? 'tap a pad to start · GAME to change' : 'press an arrow, SPACE or ENTER to start · G changes game');
    } else if (s.state === 'over') {
      var scores = g.players.map(function (pl, i) { return (g.players.length > 1 ? 'P' + (i + 1) + ' ' : '') + pl.score; }).join(' · ');
      msg.innerHTML = '<b>RETIRED</b> — ' + scores + '. ' + (touch ? 'Tap a pad' : 'Press ENTER or an arrow') + ' to build again';
    } else if (g.iglooComplete()) {
      msg.innerHTML = who + '<b>Igloo built!</b> Get back to shore, stand under it and press ' + (touch ? '▲' : '↑');
    } else {
      msg.innerHTML = who + 'Level ' + p.level + (g.night ? ' · night shift' : ' · day shift') + ' — jump on <b>white</b> ice to build the igloo';
    }
  }

  var audio = new ClassicAudio();
  var shell = window.FrostbiteShell.boot({
    version: 'classic',
    canvas: screen,
    render: render,
    audio: audio,
    touchRoot: document.getElementById('pads'),
    muteButton: muteBtn,
    pauseButton: pauseBtn,
    selectButton: selectBtn,
    onUi: onUi,
    onEvents: function (events) {
      for (var k = 0; k < events.length; k++) {
        var t = events[k].type;
        if (t === 'igloo' || t === 'level' || t === 'switch' || t === 'respawn' || t === 'gameover' || t === 'start') shell.refresh();
      }
    }
  });
})();
