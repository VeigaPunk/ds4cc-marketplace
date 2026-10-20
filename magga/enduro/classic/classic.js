/*
 * Enduro Classic — draws the shared simulation the way the 1983 cartridge
 * did: a 160x192 frame in the NTSC 2600 palette, banded skies, a coarse
 * mountain range, single-pixel road edges, monochrome stepped car sprites,
 * tail lights only at night, a grey fog wall and the red instrument panel
 * with the rolling odometer digit. Sound is TIA-style: a stepped engine tone
 * and polynomial-noise crashes.
 */
(function () {
  'use strict';

  var Core = window.EnduroCore;
  var C = Core.C;

  var W = 160, H = 192;
  var HORIZON = 42;          // first ground row
  var PLAYER_ROW = 147;      // bottom row of the player's car
  var FIELD_END = 153;       // last playfield row
  var HALF_ROAD = 58;        // road half width at the player's row
  var BEND_PX = 56;
  var CX = 84;               // road centre (the HMOVE bar eats the first 8 columns)

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

  var CAR_COLORS = [0x46, 0x86, 0x1c, 0xc8, 0x56, 0x28, 0xa8, 0x68];
  var PLAYER_COLOR = 0x0c;
  var TAIL = 0x44;

  // --- time-of-day schemes --------------------------------------------------
  function band(c) { return [c, c, c, c, c, c]; }
  var DUSK = [
    { sky: [0x84, 0x84, 0x84, 0x84, 0x86, 0x2a], mtn: 0x24, ground: 0xc4, edge: 0x08 },
    { sky: [0x82, 0x82, 0x72, 0x54, 0x46, 0x38], mtn: 0x22, ground: 0xc2, edge: 0x08 },
    { sky: [0x70, 0x70, 0x60, 0x52, 0x42, 0x34], mtn: 0x20, ground: 0xd0, edge: 0x06 },
    { sky: [0x80, 0x60, 0x50, 0x40, 0x40, 0x30], mtn: 0x00, ground: 0xc0, edge: 0x06 }
  ];
  var DAWN = [
    { sky: [0x00, 0x00, 0x80, 0x80, 0x82, 0x62], mtn: 0x80, ground: 0x00, edge: 0x04, tail: true },
    { sky: [0x80, 0x80, 0x82, 0x72, 0x64, 0x54], mtn: 0x60, ground: 0xc0, edge: 0x06 },
    { sky: [0x82, 0x82, 0x84, 0x74, 0x66, 0x58], mtn: 0x22, ground: 0xc2, edge: 0x08 },
    { sky: [0x84, 0x84, 0x84, 0x86, 0x88, 0x2a], mtn: 0x24, ground: 0xc2, edge: 0x08 }
  ];
  var SCHEMES = {
    day: { sky: band(0x84), mtn: 0x24, ground: 0xc4, edge: 0x08 },
    snow: { sky: band(0x86), mtn: 0x0a, ground: 0x0e, edge: 0x04, player: 0x66 },
    night: { sky: band(0x00), mtn: 0x00, ground: 0x00, edge: 0x04, tail: true },
    fog: { sky: band(0x06), mtn: 0x06, ground: 0x02, edge: 0x08, fog: 0x06, fogP: 0.58 }
  };

  function schemeFor(ph) {
    if (ph.id === 'dusk') return DUSK[Math.min(3, Math.floor(ph.t * 4))];
    if (ph.id === 'dawn') return DAWN[Math.min(3, Math.floor(ph.t * 4))];
    return SCHEMES[ph.id];
  }

  // --- sprites ---------------------------------------------------------------
  function parse(rows) {
    return rows.map(function (r) {
      var out = [];
      for (var k = 0; k < r.length; k++) out.push(r[k] === 'X' ? 1 : 0);
      return out;
    });
  }
  function doubleWide(rows) {
    return rows.map(function (r) {
      var out = [];
      for (var k = 0; k < r.length; k++) out.push(r[k], r[k]);
      return out;
    });
  }
  function shrink(bm, w, h) {
    var out = [], bh = bm.length, bw = bm[0].length;
    for (var y = 0; y < h; y++) {
      var row = [], sy = Math.min(bh - 1, Math.floor((y + 0.5) * bh / h));
      for (var x = 0; x < w; x++) row.push(bm[sy][Math.min(bw - 1, Math.floor((x + 0.5) * bw / w))]);
      out.push(row);
    }
    return out;
  }

  var CAR_A = doubleWide(parse([
    '.X....X.',
    '.X.XX.X.',
    '...XX...',
    '..XXXX..',
    '..XXXX..',
    'XXXXXXXX',
    'XX.XX.XX',
    'XX.XX.XX',
    'XX....XX'
  ]));
  var CAR_B = doubleWide(parse([
    '........',
    '.X.XX.X.',
    '.X.XX.X.',
    '..XXXX..',
    '..XXXX..',
    'XXXXXXXX',
    'XX.XX.XX',
    '.X.XX.X.',
    'XX....XX'
  ]));

  // Distance steps, far to near: the cartridge swaps sprite sizes, it never scales.
  var LEVELS = [
    { p: 0.10, a: parse(['XX']) },
    { p: 0.22, a: parse(['XXXX', 'X..X']) },
    { p: 0.36, a: parse(['.X..X.', 'XXXXXX', 'XX..XX']) },
    { p: 0.55, a: shrink(CAR_A, 8, 5), b: shrink(CAR_B, 8, 5) },
    { p: 0.78, a: shrink(CAR_A, 12, 7), b: shrink(CAR_B, 12, 7) },
    { p: 99, a: CAR_A, b: CAR_B }
  ];
  function levelFor(p) {
    for (var k = 0; k < LEVELS.length; k++) if (p < LEVELS[k].p) return LEVELS[k];
    return LEVELS[LEVELS.length - 1];
  }

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
  var ICON_CAR = parse(['.XXXX.', 'XXXXXX', '.XXXX.', 'XXXXXX', 'X....X']);
  var FLAG_A = parse(['XXXXX.', 'XXXXX.', 'XXXXX.', 'X.....', 'X.....', 'X.....', 'X.....']);
  var FLAG_B = parse(['XXXX..', 'XXXXXX', 'X.XXXX', 'X.....', 'X.....', 'X.....', 'X.....']);
  var TROPHY = parse(['XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '..XXX..', '.XXXXX.']);

  // Mountain skyline: playfield-coarse 4px columns, repeating every 160px.
  var MOUNTAINS = (function () {
    var cols = [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 3, 4, 5, 4, 3, 2, 1,
                1, 2, 4, 6, 8, 9, 8, 7, 5, 3, 2, 2, 3, 4, 6, 5, 4, 3, 2, 1];
    var h = new Uint8Array(W);
    for (var x = 0; x < W; x++) h[x] = cols[Math.floor(x / 4) % cols.length];
    return h;
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
    x0 = Math.max(0, x0 | 0);
    x1 = Math.min(W - 1, x1 | 0);
    var col = PAL[c], base = y * W;
    for (var x = x0; x <= x1; x++) px[base + x] = col;
  }
  function plot(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    px[y * W + x] = PAL[c];
  }
  function blit(bm, x0, yBottom, c, yMin, yMax) {
    var h = bm.length;
    for (var r = 0; r < h; r++) {
      var y = yBottom - (h - 1 - r);
      if (y < yMin || y > yMax) continue;
      var row = bm[r];
      for (var k = 0; k < row.length; k++) if (row[k]) plot(x0 + k, y, c);
    }
  }

  function rowP(y) { return (y - HORIZON) / (PLAYER_ROW - HORIZON); }
  function pRow(p) { return HORIZON + p * (PLAYER_ROW - HORIZON); }

  var flicker = 0;

  function drawWorld(game) {
    var ph = game.phase();
    var sc = schemeFor(ph);
    var y, x;

    // Sky in six bands.
    for (y = 0; y < HORIZON; y++) fillRow(y, 0, W - 1, sc.sky[Math.min(5, Math.floor(y / 7))]);

    // Mountains ride the horizon and slide the opposite way to the bends.
    if (sc.mtn !== sc.sky[5]) {
      var shift = Math.floor(((game.scenery % 1) + 1) % 1 * W);
      for (x = 0; x < W; x++) {
        var hgt = MOUNTAINS[(x + shift) % W];
        for (y = HORIZON - hgt; y < HORIZON; y++) px[y * W + x] = PAL[sc.mtn];
      }
    }

    // Ground, the fog wall, and the road edges.
    var fogP = sc.fogP || 0;
    var prevL = null, prevR = null;
    for (y = HORIZON; y <= FIELD_END; y++) {
      var p = rowP(y);
      if (p < fogP) {
        fillRow(y, 0, W - 1, sc.fog);
        continue;
      }
      fillRow(y, 0, W - 1, sc.ground);
      var d = Core.depthAt(Math.min(p, 1.2));
      var cx = CX + game.bendAt(d) * BEND_PX;
      var half = 1.5 + Math.min(p, 1.2) * (HALF_ROAD - 1.5);
      var l = Math.round(cx - half), rr = Math.round(cx + half);
      if (prevL !== null) {
        fillRow(y, Math.min(l, prevL + 1), Math.max(l, prevL - 1), sc.edge);
        fillRow(y, Math.min(rr, prevR + 1), Math.max(rr, prevR - 1), sc.edge);
      } else {
        plot(l, y, sc.edge);
        plot(rr, y, sc.edge);
      }
      prevL = l;
      prevR = rr;
    }

    // Traffic, far to near.
    var cars = game.cars.slice().sort(function (a, b) { return b.d - a.d; });
    var wheel = game.wheelPhase < 1;
    for (var k = 0; k < cars.length; k++) {
      var car = cars[k];
      var cp = Core.depthScale(car.d);
      if (cp <= 0.02 || cp < fogP + 0.04) continue;
      var row = Math.round(pRow(cp));
      if (row < HORIZON || row - 9 > FIELD_END) continue;
      var lvl = levelFor(cp);
      var bm = (lvl.b && wheel) ? lvl.b : lvl.a;
      var w = bm[0].length;
      var sx = Math.round(CX + game.bendAt(car.d) * BEND_PX + car.x * cp * HALF_ROAD - w / 2);
      if (sc.tail) {
        var tw = w >= 12 ? 3 : w >= 8 ? 2 : 1;
        fillRow(row, sx, sx + tw - 1, TAIL);
        fillRow(row, sx + w - tw, sx + w - 1, TAIL);
      } else {
        blit(bm, sx, row, CAR_COLORS[car.hue], HORIZON, FIELD_END);
      }
    }

    // The player's car. A crash makes it judder.
    var jitter = game.crashT > 0 ? ((flicker >> 1) & 1 ? 1 : -1) : 0;
    var pbm = wheel || game.v < 1 ? CAR_A : CAR_B;
    var pxl = Math.round(CX + game.x * HALF_ROAD - 8) + jitter;
    blit(pbm, pxl, PLAYER_ROW, sc.player || PLAYER_COLOR, HORIZON, FIELD_END);
  }

  function drawDigit(n, x, y, c) { blit(DIGITS[n], x, y + 6, c, 0, H - 1); }

  function drawDash(game) {
    var y;
    for (y = FIELD_END + 1; y < H; y++) fillRow(y, 0, W - 1, 0x00);
    var PANEL = 0x42, BOX = 0x1c, INK = 0x00;
    for (y = 157; y <= 185; y++) fillRow(y, 48, 119, PANEL);

    // Odometer: four fixed digits (leading zeros blank) and a rolling last digit.
    for (y = 159; y <= 169; y++) fillRow(y, 63, 104, BOX);
    var odo = Math.floor(game.odo);
    var digits = [Math.floor(odo / 10000) % 10, Math.floor(odo / 1000) % 10, Math.floor(odo / 100) % 10, Math.floor(odo / 10) % 10];
    var started = false;
    for (var k = 0; k < 4; k++) {
      if (digits[k] !== 0) started = true;
      if (started) drawDigit(digits[k], 64 + k * 8, 161, INK);
    }
    for (y = 159; y <= 169; y++) fillRow(y, 95, 104, INK);
    var last = odo % 10, roll = Math.floor((game.odo - odo) * 9);
    blit(DIGITS[last], 97, 167 - roll, BOX, 160, 168);
    blit(DIGITS[(last + 1) % 10], 97, 176 - roll, BOX, 160, 168);
    if (game.trophy) blit(TROPHY, 52, 167, 0x1e, 158, 170);

    // Day indicator.
    for (y = 172; y <= 182; y++) fillRow(y, 54, 65, BOX);
    if (game.day >= 10) {
      drawDigit(Math.floor(game.day / 10) % 10, 54, 174, INK);
      drawDigit(game.day % 10, 60, 174, INK);
    } else {
      drawDigit(game.day, 57, 174, INK);
    }

    // Cars left to pass, or waving green flags once the quota is met.
    for (y = 172; y <= 182; y++) fillRow(y, 72, 113, BOX);
    if (game.quotaMet) {
      var fl = (flicker >> 3) & 1;
      for (var f = 0; f < 5; f++) blit((f + fl) & 1 ? FLAG_A : FLAG_B, 75 + f * 7, 181, 0xc6, 172, 182);
    } else {
      blit(ICON_CAR, 74, 179, INK, 172, 182);
      var n = game.carsLeft;
      if (n >= 100) drawDigit(Math.floor(n / 100) % 10, 84, 174, INK);
      if (n >= 10) drawDigit(Math.floor(n / 10) % 10, 92, 174, INK);
      drawDigit(n % 10, 100, 174, INK);
    }
  }

  function render(game) {
    flicker++;
    drawWorld(game);
    for (var y = 0; y <= FIELD_END; y++) fillRow(y, 0, 7, 0x00);
    drawDash(game);
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
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(ctx.destination);
      // Engine: a hard pulse whose pitch steps through the TIA's divider values.
      var real = new Float32Array(24), imag = new Float32Array(24);
      for (var n = 1; n < 24; n++) imag[n] = Math.sin(Math.PI * n * 0.42) * 2 / (Math.PI * n);
      this.engine = ctx.createOscillator();
      this.engine.setPeriodicWave(ctx.createPeriodicWave(real, imag));
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engine.start();
      // Polynomial noise, sample-and-hold at a low clock like AUDC 8.
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
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  };
  ClassicAudio.prototype.setPaused = function (p) { this.paused = p; };
  ClassicAudio.prototype.update = function (game) {
    if (!this.ctx) return;
    var on = !this.paused && game.state !== 'over';
    var frac = game.v / C.VMAX;
    var div = Math.round(31 - frac * 22);           // AUDF 31 (idle) .. 9 (flat out)
    var freq = 1013 / (div + 1);
    var t = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(freq, t, 0.008);
    this.engineGain.gain.setTargetAtTime(on ? 0.16 : 0, t, 0.03);
  };
  ClassicAudio.prototype.noiseBurst = function (dur, vol, rate) {
    if (!this.ctx) return;
    var ctx = this.ctx, src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
    src.buffer = this.noise;
    src.playbackRate.value = rate;
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
      var e = events[k].type;
      if (e === 'crash') this.noiseBurst(0.7, 0.45, 0.6);
      else if (e === 'edge') this.noiseBurst(0.12, 0.2, 1.4);
    }
  };

  // --- page wiring -----------------------------------------------------------
  var msg = document.getElementById('msg');
  var bestEl = document.getElementById('best');
  var muteBtn = document.getElementById('mute');
  var pauseBtn = document.getElementById('pause');

  function onUi(s) {
    var b = s.best;
    bestEl.textContent = b.day ? 'BEST  DAY ' + b.day + '  ·  ' + b.odo + ' MI' : 'BEST  —';
    muteBtn.textContent = s.muted ? 'SOUND OFF' : 'SOUND ON';
    muteBtn.setAttribute('aria-pressed', s.muted ? 'true' : 'false');
    pauseBtn.textContent = s.paused ? 'RESUME' : 'PAUSE';
    pauseBtn.disabled = s.state !== 'race';
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    var g = s.game;
    if (s.paused) msg.innerHTML = '<b>PAUSED</b> — ' + (touch ? 'tap the screen' : 'press P, Esc or an arrow') + ' to continue';
    else if (s.state === 'ready') msg.innerHTML = touch ? '<b>Tap ▲</b> to start the race' : '<b>Press ↑, SPACE or ENTER</b> to start the race';
    else if (s.state === 'over') {
      msg.innerHTML = '<b>RACE OVER</b> — day ' + g.day + ', ' + Math.floor(g.odo) + ' miles. ' + (touch ? 'Tap ▲' : 'Press ENTER or SPACE') + ' to race again';
    } else if (g.quotaMet) msg.innerHTML = '<b>Quota met!</b> Keep driving to daybreak for day ' + (g.day + 1);
    else msg.innerHTML = 'Day ' + g.day + ': pass <b>' + Core.quotaFor(g.day) + '</b> cars before daybreak';
  }

  var audio = new ClassicAudio();
  window.EnduroShell.boot({
    version: 'classic',
    canvas: screen,
    render: render,
    audio: audio,
    touchRoot: document.getElementById('pads'),
    muteButton: muteBtn,
    pauseButton: pauseBtn,
    onUi: onUi,
    onEvents: function (events, game) {
      for (var k = 0; k < events.length; k++) {
        var t = events[k].type;
        if (t === 'newday' || t === 'start' || t === 'quota' || t === 'trophy') onUi({ state: game.state, paused: false, muted: audio.muted, best: window.__enduro ? window.__enduro.best() : { day: 0 }, game: game });
      }
    }
  });
})();
