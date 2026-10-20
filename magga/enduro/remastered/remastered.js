/*
 * Enduro Remastered — modern renderer and synthesized audio for the shared
 * EnduroCore race. Same simulation and projection as Classic; everything you
 * see and hear is drawn procedurally (no image or font downloads).
 */
(function () {
  'use strict';

  var Core = window.EnduroCore;
  var C = Core.C;
  var clamp = Core.clamp;
  var smooth = Core.smooth;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var horizonY = 0, playerY = 0, cx = 0, halfRoad = 0, BEND_PX = 0, hudH = 0, hudTop = 0;
  var maskCanvas = document.createElement('canvas');
  var mctx = maskCanvas.getContext('2d');
  var vignette = document.createElement('canvas');

  var UI_FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  var MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "DejaVu Sans Mono", monospace';

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgb(c, a) {
    if (a == null || a >= 1) return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')';
  }
  function shade(c, k) {
    return k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k);
  }
  function fract(x) { return x - Math.floor(x); }

  /* ------------------------------------------------------------------ */
  /* Time-of-day palette: keyframes on the race clock, blended smoothly. */
  /* ------------------------------------------------------------------ */

  var DAY_SKY = { skyTop: [34, 102, 212], skyMid: [96, 160, 234], skyBot: [184, 220, 248] };
  var MORNING = {
    skyTop: [58, 118, 206], skyMid: [122, 176, 232], skyBot: [206, 228, 244],
    grassA: [88, 162, 66], grassB: [76, 148, 58], road: [88, 92, 101], line: [240, 238, 226],
    rumA: [214, 46, 50], rumB: [244, 244, 244], mtFar: [146, 170, 204], mtMid: [96, 126, 156],
    mtNear: [54, 104, 76], cap: [246, 249, 252], cloud: [255, 255, 255], cloudA: 0.8,
    sun: [255, 244, 214], sunElev: 0.32, sunA: 1, moonA: 0, stars: 0, dark: 0, fog: 0,
    fogC: [205, 214, 224], snow: 0, sheen: 0, haze: 0.35
  };
  function variant(base, over) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    for (k in over) o[k] = over[k];
    return o;
  }
  var NOON = variant(MORNING, {
    skyTop: DAY_SKY.skyTop, skyMid: DAY_SKY.skyMid, skyBot: DAY_SKY.skyBot,
    sunElev: 0.74, sun: [255, 250, 232], haze: 0.28
  });
  var SNOW = variant(NOON, {
    skyTop: [118, 136, 158], skyMid: [168, 182, 198], skyBot: [220, 228, 236],
    grassA: [236, 241, 246], grassB: [224, 231, 239], road: [138, 149, 162], line: [252, 252, 255],
    rumA: [196, 92, 96], rumB: [244, 246, 250], mtFar: [198, 208, 222], mtMid: [172, 184, 200],
    mtNear: [126, 144, 150], cap: [255, 255, 255], cloud: [232, 236, 242], cloudA: 0.96,
    sunA: 0.18, snow: 1, fog: 0.16, fogC: [226, 231, 238], sheen: 0.4, haze: 0.45
  });
  var AFTERNOON = variant(NOON, {
    skyTop: [44, 108, 206], skyMid: [110, 170, 232], skyBot: [198, 224, 242],
    grassA: [92, 160, 62], grassB: [80, 146, 54], sunElev: 0.6
  });
  var GOLDEN = variant(AFTERNOON, {
    skyTop: [52, 98, 186], skyMid: [134, 160, 208], skyBot: [246, 212, 160],
    grassA: [104, 150, 58], grassB: [92, 136, 50], mtFar: [176, 162, 176], mtMid: [118, 112, 140],
    mtNear: [62, 92, 66], cap: [255, 236, 214], cloud: [255, 226, 196], sun: [255, 222, 160],
    sunElev: 0.32, haze: 0.4
  });
  var SUNSET = variant(GOLDEN, {
    skyTop: [42, 48, 120], skyMid: [198, 82, 122], skyBot: [255, 146, 72],
    grassA: [58, 92, 48], grassB: [50, 82, 42], road: [72, 68, 78], line: [236, 214, 200],
    mtFar: [126, 78, 134], mtMid: [86, 54, 104], mtNear: [40, 38, 58], cap: [255, 186, 170],
    cloud: [255, 150, 122], cloudA: 0.85, sun: [255, 170, 90], sunElev: 0.05, dark: 0.18,
    fogC: [240, 150, 120], haze: 0.5
  });
  var TWILIGHT = variant(SUNSET, {
    skyTop: [18, 22, 60], skyMid: [72, 42, 96], skyBot: [164, 78, 94],
    grassA: [22, 36, 30], grassB: [18, 30, 26], road: [34, 34, 42], line: [150, 140, 150],
    rumA: [120, 40, 46], rumB: [140, 140, 150], mtFar: [56, 42, 80], mtMid: [36, 28, 58],
    mtNear: [16, 18, 30], cap: [120, 108, 150], cloud: [110, 74, 108], cloudA: 0.5,
    sunElev: -0.2, sunA: 0, dark: 0.62, stars: 0.45, moonA: 0.6, fogC: [80, 60, 90], haze: 0.35
  });
  var NIGHT = variant(TWILIGHT, {
    skyTop: [3, 5, 14], skyMid: [8, 14, 34], skyBot: [20, 30, 60],
    grassA: [8, 12, 12], grassB: [6, 10, 10], road: [18, 20, 26], line: [110, 110, 116],
    rumA: [90, 26, 30], rumB: [104, 104, 112], mtFar: [16, 22, 42], mtMid: [10, 15, 30],
    mtNear: [6, 9, 16], cap: [44, 52, 76], cloudA: 0, stars: 1, moonA: 1, dark: 0.93,
    fogC: [30, 36, 50], haze: 0.25
  });
  var FOG = variant(NIGHT, {
    skyTop: [66, 72, 82], skyMid: [102, 108, 118], skyBot: [140, 146, 154],
    grassA: [60, 66, 68], grassB: [55, 61, 63], road: [70, 74, 80], line: [190, 192, 196],
    rumA: [150, 80, 84], rumB: [190, 192, 196], mtFar: [128, 134, 142], mtMid: [118, 124, 132],
    mtNear: [104, 110, 118], cap: [150, 156, 162], cloud: [150, 156, 164], cloudA: 0.3,
    stars: 0, moonA: 0, dark: 0.5, fog: 1, fogC: [150, 156, 164], haze: 0.5
  });
  var PREDAWN = variant(NIGHT, {
    skyTop: [16, 28, 68], skyMid: [64, 66, 118], skyBot: [146, 100, 132],
    grassA: [18, 30, 28], grassB: [15, 26, 24], road: [32, 34, 42], mtFar: [52, 54, 90],
    mtMid: [34, 36, 66], mtNear: [16, 22, 30], cap: [130, 130, 170], dark: 0.58, stars: 0.35,
    moonA: 0.4, cloud: [130, 110, 150], cloudA: 0.35, fogC: [110, 100, 130]
  });
  var DAWN = variant(MORNING, {
    skyTop: [44, 84, 150], skyMid: [108, 168, 182], skyBot: [252, 172, 150],
    grassA: [62, 118, 64], grassB: [54, 106, 56], mtFar: [150, 136, 170], mtMid: [96, 96, 136],
    mtNear: [44, 74, 66], cap: [255, 214, 214], cloud: [255, 190, 186], sun: [255, 196, 150],
    sunElev: 0.04, dark: 0.16, fogC: [230, 180, 170], haze: 0.45
  });

  function K(t, o) { var c = variant(o, {}); c.t = t; return c; }
  var KEYS = [
    K(0, MORNING), K(15, NOON), K(31, NOON), K(38, SNOW), K(64, SNOW), K(71, AFTERNOON),
    K(88, AFTERNOON), K(96, GOLDEN), K(108, SUNSET), K(117, TWILIGHT), K(125, NIGHT),
    K(146, NIGHT), K(153, FOG), K(169, FOG), K(176, NIGHT), K(191, NIGHT), K(201, PREDAWN),
    K(210, DAWN), K(216, MORNING)
  ];

  function paletteAt(t) {
    var a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (var i = 0; i < KEYS.length - 1; i++) {
      if (t >= KEYS[i].t && t <= KEYS[i + 1].t) { a = KEYS[i]; b = KEYS[i + 1]; break; }
    }
    var u = b.t > a.t ? smooth((t - a.t) / (b.t - a.t)) : 0;
    var out = {};
    for (var k in a) {
      if (k === 't') continue;
      var va = a[k], vb = b[k];
      out[k] = Array.isArray(va) ? mix(va, vb, u) : lerp(va, vb, u);
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Procedural scenery assets.                                           */
  /* ------------------------------------------------------------------ */

  function makeRidge(seed, freqs, ridged, power) {
    var r = mulberry(seed), N = 512, h = new Float32Array(N), comps = [], i, k;
    for (k = 0; k < freqs.length; k++) {
      comps.push({ f: freqs[k], a: 1 / Math.pow(freqs[k], 0.85), ph: r() * Math.PI * 2 });
    }
    var lo = Infinity, hi = -Infinity;
    for (i = 0; i < N; i++) {
      var u = i / N, v = 0;
      for (k = 0; k < comps.length; k++) {
        var s = Math.sin(Math.PI * 2 * comps[k].f * u + comps[k].ph);
        v += comps[k].a * (ridged ? 1 - Math.abs(s) : s);
      }
      h[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    for (i = 0; i < N; i++) h[i] = Math.pow((h[i] - lo) / (hi - lo), power);
    return h;
  }
  function sampleRidge(h, u) {
    u = fract(u) * h.length;
    var i = Math.floor(u), f = u - i;
    return h[i] + (h[(i + 1) % h.length] - h[i]) * f;
  }

  var RIDGE_FAR = makeRidge(11, [2, 3, 5, 7, 11, 17], true, 1.6);
  var RIDGE_MID = makeRidge(23, [3, 4, 6, 9, 13], true, 1.3);
  var RIDGE_NEAR = makeRidge(37, [2, 5, 8, 12, 19, 27], false, 1.1);
  var CAP_NOISE = makeRidge(51, [17, 29, 41], false, 1);

  var STARS = (function () {
    var r = mulberry(77), a = [];
    for (var i = 0; i < 170; i++) {
      a.push({ x: r(), y: Math.pow(r(), 1.3) * 0.92, b: 0.35 + r() * 0.65, f: 0.6 + r() * 2.4, p: r() * 6.28, s: r() < 0.08 ? 2 : 1 });
    }
    return a;
  })();

  var CLOUDS = (function () {
    var r = mulberry(91), a = [];
    for (var i = 0; i < 8; i++) {
      var puffs = [];
      var n = 5 + Math.floor(r() * 4);
      for (var j = 0; j < n; j++) puffs.push({ dx: (j / (n - 1) - 0.5) * 2.2 + (r() - 0.5) * 0.3, dy: -r() * 0.45, r: 0.35 + r() * 0.45 });
      a.push({ x: r() * 1.4, y: 0.16 + r() * 0.42, s: 0.6 + r() * 0.9, a: 0.55 + r() * 0.45, puffs: puffs, drift: 0.002 + r() * 0.004 });
    }
    return a;
  })();

  var FLAKES = (function () {
    var r = mulberry(5), a = [];
    for (var i = 0; i < 280; i++) a.push({ x: (r() - 0.5) * 2.4, y: (r() - 0.5) * 1.6 - 0.25, z: r(), w: r() * 6.28 });
    return a;
  })();

  var HUES = [
    [222, 38, 56], [246, 138, 34], [240, 198, 44], [36, 178, 108],
    [28, 178, 206], [46, 104, 226], [138, 78, 216], [230, 78, 146]
  ];
  var PEARL = [236, 240, 245];
  var STRIPE = [30, 112, 232];

  var GLOW_RED = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,90,80,1)');
    gr.addColorStop(0.25, 'rgba(255,40,40,0.55)');
    gr.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  })();
  var GLOW_WHITE = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,250,235,1)');
    gr.addColorStop(0.3, 'rgba(255,240,210,0.4)');
    gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  })();
  var GLOW_AMBER = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 32;
    var g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,220,150,1)');
    gr.addColorStop(0.4, 'rgba(255,170,60,0.45)');
    gr.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return c;
  })();
  var MOON = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 160;
    var g = c.getContext('2d');
    var glow = g.createRadialGradient(80, 80, 10, 80, 80, 80);
    glow.addColorStop(0, 'rgba(200,215,255,0.3)');
    glow.addColorStop(1, 'rgba(200,215,255,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 160, 160);
    var b = document.createElement('canvas'); b.width = b.height = 160;
    var bg = b.getContext('2d');
    var body = bg.createRadialGradient(72, 72, 4, 80, 80, 26);
    body.addColorStop(0, '#fbfbf2'); body.addColorStop(1, '#d8dccf');
    bg.fillStyle = body; bg.beginPath(); bg.arc(80, 80, 24, 0, Math.PI * 2); bg.fill();
    bg.globalCompositeOperation = 'destination-out';
    bg.beginPath(); bg.arc(92, 72, 21, 0, Math.PI * 2); bg.fill();
    g.drawImage(b, 0, 0);
    return c;
  })();

  /* ------------------------------------------------------------------ */
  /* Layout.                                                              */
  /* ------------------------------------------------------------------ */

  var padInset = 0;

  function viewportSize() {
    var vv = window.visualViewport;
    var vw = vv ? vv.width : window.innerWidth;
    var vh = vv ? vv.height : window.innerHeight;
    return { w: Math.floor(Math.min(vw, window.innerWidth) || vw), h: Math.floor(Math.min(vh, window.innerHeight) || vh) };
  }

  function resize() {
    var vp = viewportSize(), vw = vp.w, vh = vp.h;
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var portrait = coarse && vw < vh;
    var landscape = coarse && !portrait;
    var top0 = 0, availH = vh;
    if (portrait) {
      // canvas sits between the top chips and the pad bar
      var bar = document.getElementById('touch').getBoundingClientRect().height || 136;
      var tb = document.getElementById('topbar').getBoundingClientRect();
      top0 = Math.ceil(tb.bottom + 6);
      availH = Math.max(200, vh - bar - top0);
    }
    var aspect = clamp(vw / availH, portrait ? 0.6 : 0.78, landscape ? 2.3 : 1.6);
    var w = vw, h = w / aspect;
    if (h > availH) { h = availH; w = h * aspect; }
    w = Math.floor(w); h = Math.floor(h);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.left = Math.floor((vw - w) / 2) + 'px';
    canvas.style.top = Math.floor(top0 + (availH - h) / 2) + 'px';
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    W = w; H = h;
    // landscape touch: the pads sit over the bottom corners, keep the HUD between them
    padInset = 0;
    if (landscape) {
      var steer = document.querySelector('#touch .steer'), ped = document.querySelector('#touch .pedals');
      var sr = steer ? steer.getBoundingClientRect() : null, pr = ped ? ped.getBoundingClientRect() : null;
      var left = sr ? sr.right - parseFloat(canvas.style.left) : 0;
      var right = pr ? parseFloat(canvas.style.left) + w - pr.left : 0;
      padInset = Math.max(0, Math.max(left, right) + 8);
    }
    hudH = clamp(H * 0.15, landscape ? 58 : 66, 124);
    var m = Math.max(8, Math.min(W, H) * 0.016);
    hudTop = H - hudH - m;
    playerY = hudTop - H * 0.015;
    horizonY = Math.round(H * 0.4);
    cx = W / 2;
    halfRoad = Math.min(W * 0.35, H * 0.62);
    BEND_PX = halfRoad * (0.45 / 0.35);
    buildVignette();
  }

  function buildVignette() {
    vignette.width = Math.max(1, Math.round(W / 2));
    vignette.height = Math.max(1, Math.round(H / 2));
    var g = vignette.getContext('2d'), vw = vignette.width, vh = vignette.height;
    var r = Math.hypot(vw, vh) / 2;
    var gr = g.createRadialGradient(vw / 2, vh * 0.55, r * 0.45, vw / 2, vh * 0.55, r * 1.05);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.clearRect(0, 0, vw, vh);
    g.fillStyle = gr;
    g.fillRect(0, 0, vw, vh);
  }

  function rowOf(p) { return horizonY + p * (playerY - horizonY); }

  // Headlight cone: straight ahead of the car in screen space, so bends carry the road out of it.
  function beamPath(c, x, pEnd, widen) {
    var steps = 14, q, pq, wq;
    c.beginPath();
    for (q = 0; q <= steps; q++) {
      pq = 1 - (1 - pEnd) * (q / steps);
      wq = (0.13 + 0.5 * (1 - pq)) * widen;
      c.lineTo(cx + (x - wq) * pq * halfRoad, rowOf(pq));
    }
    for (q = steps; q >= 0; q--) {
      pq = 1 - (1 - pEnd) * (q / steps);
      wq = (0.13 + 0.5 * (1 - pq)) * widen;
      c.lineTo(cx + (x + wq) * pq * halfRoad, rowOf(pq));
    }
    c.closePath();
  }
  function roadX(d) { return cx + rGame.bendAt(d) * BEND_PX; }

  /* ------------------------------------------------------------------ */
  /* World drawing.                                                       */
  /* ------------------------------------------------------------------ */

  var rGame = null;

  function drawSky(pal, game, now) {
    var g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, rgb(pal.skyTop));
    g.addColorStop(0.62, rgb(pal.skyMid));
    g.addColorStop(1, rgb(pal.skyBot));
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, horizonY + 22);

    var scen = game.scenery;
    if (pal.stars > 0.01) {
      for (var i = 0; i < STARS.length; i++) {
        var st = STARS[i];
        var a = pal.stars * st.b * (0.65 + 0.35 * Math.sin(now * 0.001 * st.f + st.p));
        ctx.fillStyle = 'rgba(235,240,255,' + a.toFixed(3) + ')';
        var sx = fract(st.x - scen * 0.08) * W, sy = st.y * horizonY * 0.95;
        ctx.fillRect(sx, sy, st.s, st.s);
      }
    }
    if (pal.moonA > 0.01) {
      var ms = Math.min(W, H) * 0.24;
      ctx.globalAlpha = pal.moonA;
      ctx.drawImage(MOON, fract(0.24 - scen * 0.1) * W * 1.2 - ms / 2 - W * 0.1, horizonY * 0.3 - ms / 2, ms, ms);
      ctx.globalAlpha = 1;
    }
    var clock = game.clock;
    if (pal.sunA > 0.01 && pal.sunElev > -0.25) {
      var sunU = clock < 150 ? 0.8 - 0.5 * (clock / 120) : 0.86 - 0.06 * ((clock - 194) / 22);
      var sx2 = fract(sunU - scen * 0.12) * W * 1.3 - W * 0.15;
      var sy2 = horizonY - pal.sunElev * horizonY * 0.95;
      var sr = Math.min(W, H) * 0.032;
      var glow = ctx.createRadialGradient(sx2, sy2, sr * 0.5, sx2, sy2, sr * 9);
      glow.addColorStop(0, rgb(pal.sun, 0.75 * pal.sunA));
      glow.addColorStop(0.18, rgb(pal.sun, 0.3 * pal.sunA));
      glow.addColorStop(0.45, rgb(pal.sun, 0.08 * pal.sunA));
      glow.addColorStop(1, rgb(pal.sun, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(sx2 - sr * 9, sy2 - sr * 9, sr * 18, sr * 18);
      var core = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, sr);
      core.addColorStop(0, rgb([255, 255, 250], pal.sunA));
      core.addColorStop(0.7, rgb(shade(pal.sun, 0.5), pal.sunA));
      core.addColorStop(1, rgb(pal.sun, pal.sunA * 0.9));
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(sx2, sy2, sr, 0, Math.PI * 2); ctx.fill();
    }
    if (pal.cloudA > 0.01) {
      for (var c = 0; c < CLOUDS.length; c++) {
        var cl = CLOUDS[c];
        var u = fract((cl.x - scen * 0.22 + now * 0.000001 * cl.drift * 6) / 1.4) * 1.4 - 0.2;
        var bx = u * W, by = cl.y * horizonY, sz = W * 0.05 * cl.s;
        var alpha = pal.cloudA * cl.a;
        var lit = rgb(shade(pal.cloud, 0.25), alpha * 0.85), body = rgb(pal.cloud, alpha * 0.6), edge = rgb(pal.cloud, 0);
        for (var k = 0; k < cl.puffs.length; k++) {
          var pf = cl.puffs[k];
          var pr = pf.r * sz * 1.25;
          ctx.save();
          ctx.translate(bx + pf.dx * sz, by + pf.dy * sz);
          ctx.scale(1.35, 0.72);
          var cg = ctx.createRadialGradient(0, -pr * 0.25, 0, 0, 0, pr);
          cg.addColorStop(0, lit);
          cg.addColorStop(0.55, body);
          cg.addColorStop(1, edge);
          ctx.fillStyle = cg;
          ctx.fillRect(-pr, -pr, pr * 2, pr * 2);
          ctx.restore();
        }
      }
    }
  }

  function mountainLayer(h, offset, amp, color, cap, capLevel, topLight) {
    var step = Math.max(3, W / 200);
    var top = horizonY - amp;
    var g = ctx.createLinearGradient(0, top, 0, horizonY);
    g.addColorStop(0, rgb(shade(color, topLight)));
    g.addColorStop(1, rgb(shade(color, -0.12)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, horizonY + 2);
    var x, y;
    for (x = -10; x <= W + step + 10; x += step) {
      y = horizonY - sampleRidge(h, x / W + offset) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 20, horizonY + 2);
    ctx.closePath();
    ctx.fill();
    if (cap) {
      ctx.fillStyle = rgb(cap);
      ctx.beginPath();
      var first = true, pts = [];
      for (x = -10; x <= W + step + 10; x += step) {
        y = horizonY - sampleRidge(h, x / W + offset) * amp;
        var cl = horizonY - amp * (capLevel + 0.06 * sampleRidge(CAP_NOISE, x / W + offset));
        pts.push(cl);
        var yy = Math.min(y, cl);
        if (first) { ctx.moveTo(x, yy); first = false; } else ctx.lineTo(x, yy);
      }
      for (var i = pts.length - 1; i >= 0; i--) ctx.lineTo(-10 + i * step, pts[i]);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawMountains(pal, game) {
    var s = game.scenery;
    mountainLayer(RIDGE_FAR, s * 0.45, H * 0.17, pal.mtFar, pal.cap, 0.62, 0.12);
    mountainLayer(RIDGE_MID, s * 0.7 + 0.3, H * 0.11, pal.mtMid, shade(pal.cap, -0.06), 0.72, 0.06);
    mountainLayer(RIDGE_NEAR, s * 1.0 + 0.6, H * 0.05, pal.mtNear, null, 0, 0.05);
    // atmospheric haze where land meets sky
    var g = ctx.createLinearGradient(0, horizonY - H * 0.12, 0, horizonY + 2);
    g.addColorStop(0, rgb(pal.skyBot, 0));
    g.addColorStop(1, rgb(pal.skyBot, 0.35 * pal.haze + 0.1));
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY - H * 0.12, W, H * 0.12 + 2);
  }

  function drawGround(pal, game) {
    var S = H > 900 ? 3 : 2;
    var span = playerY - horizonY;
    var grassMid = mix(pal.grassA, pal.grassB, 0.5);
    var rumMid = mix(pal.rumA, pal.rumB, 0.5);
    var gA = rgb(pal.grassA), gB = rgb(pal.grassB), rA = rgb(pal.rumA), rB = rgb(pal.rumB);
    var road = rgb(pal.road), roadDark = rgb(shade(pal.road, -0.08));
    var line = pal.line;
    var sheen = pal.sheen;
    var sheenC = 'rgba(235,245,255,' + (0.18 * sheen).toFixed(3) + ')';
    var bank = pal.snow > 0.05 ? rgb(mix(pal.grassA, [255, 255, 255], 0.5)) : null;
    for (var y = horizonY; y < H; y += S) {
      var p = (y + S * 0.5 - horizonY) / span;
      if (p <= 0.0008) continue;
      var d = Core.depthAt(p);
      var wz = game.s + d;
      var rx = cx + game.bendAt(d) * BEND_PX;
      var half = p * halfRoad;
      var con = clamp((p - 0.012) / 0.13, 0, 1);
      var odd = (Math.floor(wz / 14) & 1) === 1;
      ctx.fillStyle = con >= 1 ? (odd ? gA : gB) : rgb(mix(grassMid, odd ? pal.grassA : pal.grassB, con));
      ctx.fillRect(0, y, W, S + 0.6);
      var rw = Math.max(1, half * 0.085);
      // road surface, slightly darker toward the shoulders
      ctx.fillStyle = (Math.floor(wz / 7) & 1) ? road : roadDark;
      ctx.fillRect(rx - half, y, half * 2, S + 0.6);
      if (sheen > 0.01) {
        ctx.fillStyle = sheenC;
        ctx.fillRect(rx - half * 0.55, y, half * 1.1, S + 0.6);
      }
      // rumble strips straddling the edge
      var rodd = (Math.floor(wz / 5) & 1) === 1;
      ctx.fillStyle = con >= 1 ? (rodd ? rA : rB) : rgb(mix(rumMid, rodd ? pal.rumA : pal.rumB, con));
      ctx.fillRect(rx - half - rw * 0.55, y, rw, S + 0.6);
      ctx.fillRect(rx + half - rw * 0.45, y, rw, S + 0.6);
      if (bank) {
        ctx.fillStyle = bank;
        ctx.fillRect(rx - half - rw * 1.4, y, rw * 0.85, S + 0.6);
        ctx.fillRect(rx + half + rw * 0.55, y, rw * 0.85, S + 0.6);
      }
      // lane dashes
      if ((Math.floor(wz / 9) & 1) === 0 && con > 0.05) {
        var lw = Math.max(1, half * 0.018);
        ctx.fillStyle = rgb(line, con * 0.92);
        ctx.fillRect(rx - half * 0.34 - lw / 2, y, lw, S + 0.6);
        ctx.fillRect(rx + half * 0.34 - lw / 2, y, lw, S + 0.6);
      }
      // solid edge lines
      var ew = Math.max(1, half * 0.014);
      ctx.fillStyle = rgb(line, 0.55 + 0.4 * con);
      ctx.fillRect(rx - half * 0.9 - ew / 2, y, ew, S + 0.6);
      ctx.fillRect(rx + half * 0.9 - ew / 2, y, ew, S + 0.6);
    }
  }

  // Roadside marker posts every 22 units, both sides.
  function collectPosts(game, list) {
    var gap = 22, first = gap - (game.s % gap);
    for (var d = first - gap; d < C.HORIZON_D; d += gap) {
      if (d < -12) continue;
      list.push({ kind: 'post', d: d, side: -1 });
      list.push({ kind: 'post', d: d, side: 1 });
    }
  }

  function drawPost(o, pal, vis) {
    var p = Core.depthScale(o.d);
    if (p <= 0.01) return;
    var y = rowOf(p);
    var x = roadX(o.d) + o.side * 1.14 * p * halfRoad;
    var h = p * H * 0.075, w = Math.max(1, p * W * 0.008);
    ctx.globalAlpha = vis;
    ctx.fillStyle = rgb(shade(pal.rumB, -0.1));
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = rgb(shade(pal.road, -0.3));
    ctx.fillRect(x - w / 2, y - h * 0.32, w, h * 0.12);
    ctx.fillStyle = o.side < 0 ? '#e23a3a' : '#f2f2f2';
    ctx.fillRect(x - w / 2, y - h * 0.86, w, h * 0.12);
    ctx.globalAlpha = 1;
    o.sx = x; o.sy = y - h * 0.8; o.sw = w;
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // Rear-view sports car, bottom-centre at (x, y), body width w.
  function drawCar(x, y, w, base, o) {
    if (w < 1.2) return;
    var h = w * 0.56;
    if (w < 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - w * 0.55, y - h * 0.08, w * 1.1, h * 0.12);
      ctx.fillStyle = '#121214';
      ctx.fillRect(x - w * 0.47, y - h * 0.32, w * 0.94, h * 0.32);
      ctx.fillStyle = rgb(base);
      ctx.fillRect(x - w * 0.5, y - h * 0.62, w, h * 0.42);
      ctx.fillStyle = rgb(shade(base, -0.45));
      ctx.fillRect(x - w * 0.32, y - h * 0.95, w * 0.64, h * 0.34);
      ctx.fillStyle = o.brake ? '#ff6a6a' : '#e01e1e';
      ctx.fillRect(x - w * 0.46, y - h * 0.5, w * 0.24, Math.max(1, h * 0.1));
      ctx.fillRect(x + w * 0.22, y - h * 0.5, w * 0.24, Math.max(1, h * 0.1));
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(w, w);

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,' + (0.38 * (o.shadow == null ? 1 : o.shadow)).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(0, -0.012, 0.58, 0.05, 0, 0, Math.PI * 2); ctx.fill();

    // tyres with moving tread
    ctx.fillStyle = '#0d0d0f';
    roundRect(ctx, -0.48, -0.18, 0.17, 0.18, 0.03); ctx.fill();
    roundRect(ctx, 0.31, -0.18, 0.17, 0.18, 0.03); ctx.fill();
    ctx.fillStyle = '#2a2a2e';
    for (var k = 0; k < 3; k++) {
      var ty = -0.17 + fract((k * 0.33) + (o.wheel || 0) * 0.5) * 0.15;
      ctx.fillRect(-0.47, ty, 0.15, 0.014);
      ctx.fillRect(0.32, ty, 0.15, 0.014);
    }

    // lower diffuser
    ctx.fillStyle = '#16181c';
    roundRect(ctx, -0.46, -0.17, 0.92, 0.1, 0.03); ctx.fill();
    ctx.fillStyle = '#25282e';
    for (k = -3; k <= 3; k++) ctx.fillRect(k * 0.06 - 0.008, -0.16, 0.016, 0.07);
    // exhausts
    ctx.fillStyle = '#3a3c42';
    ctx.beginPath(); ctx.arc(-0.2, -0.105, 0.03, 0, Math.PI * 2); ctx.arc(0.2, -0.105, 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#08080a';
    ctx.beginPath(); ctx.arc(-0.2, -0.105, 0.018, 0, Math.PI * 2); ctx.arc(0.2, -0.105, 0.018, 0, Math.PI * 2); ctx.fill();

    // main body shell
    var bg = ctx.createLinearGradient(0, -0.36, 0, -0.07);
    bg.addColorStop(0, rgb(shade(base, 0.42)));
    bg.addColorStop(0.35, rgb(base));
    bg.addColorStop(1, rgb(shade(base, -0.5)));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-0.5, -0.13);
    ctx.lineTo(-0.505, -0.27);
    ctx.quadraticCurveTo(-0.5, -0.34, -0.43, -0.36);
    ctx.lineTo(0.43, -0.36);
    ctx.quadraticCurveTo(0.5, -0.34, 0.505, -0.27);
    ctx.lineTo(0.5, -0.13);
    ctx.quadraticCurveTo(0.49, -0.085, 0.44, -0.085);
    ctx.lineTo(-0.44, -0.085);
    ctx.quadraticCurveTo(-0.49, -0.085, -0.5, -0.13);
    ctx.closePath();
    ctx.fill();

    // cabin
    var cg = ctx.createLinearGradient(0, -0.53, 0, -0.35);
    cg.addColorStop(0, rgb(shade(base, 0.1)));
    cg.addColorStop(1, rgb(shade(base, -0.35)));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-0.37, -0.355);
    ctx.lineTo(-0.28, -0.51);
    ctx.quadraticCurveTo(-0.255, -0.535, -0.2, -0.535);
    ctx.lineTo(0.2, -0.535);
    ctx.quadraticCurveTo(0.255, -0.535, 0.28, -0.51);
    ctx.lineTo(0.37, -0.355);
    ctx.closePath();
    ctx.fill();
    // rear glass
    var gg = ctx.createLinearGradient(0, -0.5, 0, -0.36);
    gg.addColorStop(0, '#3b4d63');
    gg.addColorStop(1, '#0c1219');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(-0.315, -0.365);
    ctx.lineTo(-0.248, -0.49);
    ctx.lineTo(0.248, -0.49);
    ctx.lineTo(0.315, -0.365);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(-0.17, -0.488); ctx.lineTo(-0.08, -0.488); ctx.lineTo(-0.2, -0.368); ctx.lineTo(-0.29, -0.368);
    ctx.closePath(); ctx.fill();

    if (o.stripe) {
      ctx.fillStyle = rgb(o.stripe);
      ctx.fillRect(-0.075, -0.535, 0.045, 0.045);
      ctx.fillRect(0.03, -0.535, 0.045, 0.045);
      ctx.fillRect(-0.075, -0.36, 0.045, 0.2);
      ctx.fillRect(0.03, -0.36, 0.045, 0.2);
    }

    // spoiler
    ctx.fillStyle = rgb(shade(base, -0.55));
    ctx.fillRect(-0.3, -0.38, 0.035, 0.03);
    ctx.fillRect(0.265, -0.38, 0.035, 0.03);
    ctx.fillStyle = rgb(shade(base, -0.25));
    roundRect(ctx, -0.49, -0.415, 0.98, 0.04, 0.015); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-0.47, -0.413, 0.94, 0.008);

    // tail-light cluster
    ctx.fillStyle = '#0b0b0d';
    roundRect(ctx, -0.47, -0.285, 0.94, 0.075, 0.02); ctx.fill();
    var tl = o.brake ? ['#ffe6e0', '#ff4040'] : ['#ff5a52', '#a40d12'];
    var lg = ctx.createLinearGradient(0, -0.28, 0, -0.215);
    lg.addColorStop(0, tl[0]); lg.addColorStop(1, tl[1]);
    ctx.fillStyle = lg;
    roundRect(ctx, -0.455, -0.276, 0.2, 0.055, 0.015); ctx.fill();
    roundRect(ctx, 0.255, -0.276, 0.2, 0.055, 0.015); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,160,0.55)';
    ctx.fillRect(-0.44, -0.27, 0.17, 0.01);
    ctx.fillRect(0.27, -0.27, 0.17, 0.01);
    // plate
    ctx.fillStyle = '#e9e5d4';
    ctx.fillRect(-0.085, -0.205, 0.17, 0.055);
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(-0.06, -0.185, 0.12, 0.014);
    // shoulder highlight
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-0.42, -0.357, 0.84, 0.01);
    ctx.restore();
  }

  function carHeightFor(w) { return w * 0.56; }

  /* ------------------------------------------------------------------ */
  /* Particles and transient effects.                                     */
  /* ------------------------------------------------------------------ */

  var parts = [];
  function spawn(n, x, y, kind, spread) {
    for (var i = 0; i < n && parts.length < 420; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.3 + Math.random()) * spread;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - spread * 0.4,
        life: 0, max: kind === 'smoke' ? 0.9 + Math.random() * 0.6 : 0.35 + Math.random() * 0.35,
        kind: kind, r: kind === 'smoke' ? 6 + Math.random() * 10 : 1 + Math.random() * 1.5
      });
    }
  }
  function stepParticles(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i];
      q.life += dt;
      if (q.life >= q.max) { parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.kind === 'spark') q.vy += 900 * dt;
      else if (q.kind === 'smoke') { q.vy -= 30 * dt; q.vx *= 0.97; q.r += 18 * dt; }
      else { q.vy += 400 * dt; }
    }
  }
  function drawParticles(pal, emissive) {
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i], k = 1 - q.life / q.max;
      if (q.kind === 'spark') {
        if (!emissive) continue;
        ctx.strokeStyle = 'rgba(255,' + (180 + 60 * k | 0) + ',90,' + k.toFixed(3) + ')';
        ctx.lineWidth = q.r;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.025, q.y - q.vy * 0.025); ctx.stroke();
      } else if (!emissive) {
        var col = q.kind === 'smoke' ? mix([90, 90, 96], pal.fogC, 0.3) : (pal.snow > 0.3 ? [245, 248, 252] : mix(pal.grassA, [150, 120, 80], 0.5));
        ctx.fillStyle = rgb(col, (q.kind === 'smoke' ? 0.35 : 0.7) * k);
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  var snowFlakesOn = 0;
  function drawSnow(pal, game, dt) {
    var amt = pal.snow;
    if (amt < 0.02) return;
    var sf = game.v / C.VMAX;
    var curv = game.curvAt(game.s);
    var n = Math.floor(FLAKES.length * amt);
    var vpx = cx, vpy = horizonY;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var i = 0; i < n; i++) {
      var f = FLAKES[i];
      if (dt > 0) {
        f.z -= dt * (0.12 + sf * 0.95);
        f.y += dt * 0.05;
        f.x += dt * (Math.sin(f.w + f.z * 6) * 0.05 + curv * sf * 0.25);
        if (f.z < 0.06) { f.z = 1; f.x = (Math.random() - 0.5) * 2.4; f.y = (Math.random() - 0.5) * 1.6 - 0.25; }
      }
      var sx = vpx + (f.x / f.z) * W * 0.28;
      var sy = vpy + (f.y / f.z) * H * 0.28;
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) { if (dt > 0) f.z = 0; continue; }
      var r = (1 - f.z) * 5 + 1;
      ctx.globalAlpha = Math.min(1, (1 - f.z) * 1.6) * amt;
      ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
    }
    ctx.globalAlpha = 1;
    snowFlakesOn = n;
  }

  function drawSpeedLines(game, now) {
    var sf = game.v / C.VMAX;
    if (sf < 0.72) return;
    var a0 = (sf - 0.72) / 0.28;
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 22; i++) {
      var ang = -0.12 * Math.PI + (i / 21) * 1.24 * Math.PI;
      if (ang > 0.3 * Math.PI && ang < 0.7 * Math.PI) continue;
      var ph = fract(now * 0.0016 * (0.8 + sf) + i * 0.618);
      var r0 = (0.3 + ph * 0.9) * W * 0.55, r1 = r0 + W * 0.1;
      var ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.strokeStyle = 'rgba(255,255,255,' + (a0 * 0.22 * (1 - ph)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(cx + ca * r0, horizonY + sa * r0 * 0.7);
      ctx.lineTo(cx + ca * r1, horizonY + sa * r1 * 0.7);
      ctx.stroke();
    }
  }

  /* ------------------------------------------------------------------ */
  /* HUD.                                                                 */
  /* ------------------------------------------------------------------ */

  var PHASE_NAMES = ['MORNING', 'SNOW', 'AFTERNOON', 'DUSK', 'NIGHT', 'FOG', 'NIGHT', 'DAWN'];
  var PHASE_COLORS = ['#7cc4ff', '#eef4fb', '#69b2f5', '#ff8a4c', '#2a3a78', '#9aa3ad', '#2a3a78', '#ff9fb4'];

  function drawFlag(x, y, s, t, phase) {
    ctx.fillStyle = '#d9dee6';
    ctx.fillRect(x, y, s * 0.08, s);
    ctx.fillStyle = '#2bd17a';
    ctx.beginPath();
    var fw = s * 0.75, fh = s * 0.5;
    ctx.moveTo(x + s * 0.08, y);
    for (var i = 0; i <= 8; i++) {
      var u = i / 8;
      ctx.lineTo(x + s * 0.08 + u * fw, y + Math.sin(t * 8 + u * 5 + phase) * s * 0.06 * u);
    }
    for (i = 8; i >= 0; i--) {
      u = i / 8;
      ctx.lineTo(x + s * 0.08 + u * fw, y + fh + Math.sin(t * 8 + u * 5 + phase) * s * 0.06 * u);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + s * 0.1, y + fh * 0.15, fw * 0.6, fh * 0.12);
  }

  function drawTrophy(x, y, s) {
    var g = ctx.createLinearGradient(x, y, x + s, y + s);
    g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, '#ffc93c'); g.addColorStop(1, '#c98a12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.15, y);
    ctx.lineTo(x + s * 0.85, y);
    ctx.quadraticCurveTo(x + s * 0.85, y + s * 0.55, x + s * 0.5, y + s * 0.62);
    ctx.quadraticCurveTo(x + s * 0.15, y + s * 0.55, x + s * 0.15, y);
    ctx.fill();
    ctx.lineWidth = s * 0.07;
    ctx.strokeStyle = '#ffc93c';
    ctx.beginPath(); ctx.arc(x + s * 0.15, y + s * 0.18, s * 0.13, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * 0.85, y + s * 0.18, s * 0.13, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillRect(x + s * 0.44, y + s * 0.6, s * 0.12, s * 0.2);
    ctx.fillRect(x + s * 0.28, y + s * 0.8, s * 0.44, s * 0.12);
  }

  function drawHud(game, now) {
    var m = Math.max(8, Math.min(W, H) * 0.016);
    var pw = Math.min(W - m * 2 - padInset * 2, 980);
    if (pw < 300) pw = Math.min(W - m * 2, 300);
    var x0 = (W - pw) / 2, y0 = hudTop, ph = hudH;
    var r = Math.min(18, ph * 0.2);

    // glass panel
    var bg = ctx.createLinearGradient(0, y0, 0, y0 + ph);
    bg.addColorStop(0, 'rgba(22,28,42,0.72)');
    bg.addColorStop(1, 'rgba(8,10,18,0.82)');
    ctx.fillStyle = bg;
    roundRect(ctx, x0, y0, pw, ph, r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    roundRect(ctx, x0 + 0.5, y0 + 0.5, pw - 1, ph - 1, r); ctx.stroke();

    // time-of-day timeline along the top edge
    var tlx = x0 + r, tlw = pw - r * 2, tly = y0 + ph * 0.1, tlh = Math.max(3, ph * 0.045);
    var acc = 0, total = C.DAY_LENGTH;
    for (var i = 0; i < Core.PHASES.length; i++) {
      var seg = Core.PHASES[i];
      ctx.fillStyle = PHASE_COLORS[i];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(tlx + (acc / total) * tlw + 1, tly, (seg.dur / total) * tlw - 2, tlh);
      acc += seg.dur;
    }
    ctx.globalAlpha = 1;
    var mk = tlx + clamp(game.clock / total, 0, 1) * tlw;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(mk, tly + tlh / 2, tlh * 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();

    var inner = ph * 0.82, iy = y0 + ph * 0.18;
    var colW = pw / 3;
    var label = Math.max(8, Math.min(11, ph * 0.1)) | 0;

    // --- speedometer (left column)
    var gr = Math.min(inner * 0.42, colW * 0.3);
    var gx = x0 + Math.max(gr + r * 0.9, colW * 0.28), gy = Math.min(iy + inner * 0.5, y0 + ph - gr * 0.98 - 3);
    var a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    var sf = game.v / C.VMAX;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, gr * 0.16);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(gx, gy, gr, a0, a1); ctx.stroke();
    if (sf > 0.002) {
      var sg = ctx.createLinearGradient(gx - gr, 0, gx + gr, 0);
      sg.addColorStop(0, '#5ee3d0'); sg.addColorStop(0.6, '#ffd166'); sg.addColorStop(1, '#ff3d77');
      ctx.strokeStyle = sg;
      ctx.beginPath(); ctx.arc(gx, gy, gr, a0, a0 + (a1 - a0) * sf); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (i = 0; i <= 10; i++) {
      var ta = a0 + (a1 - a0) * (i / 10);
      var r1 = gr * 0.72, r2 = gr * (i % 5 === 0 ? 0.56 : 0.64);
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(ta) * r1, gy + Math.sin(ta) * r1);
      ctx.lineTo(gx + Math.cos(ta) * r2, gy + Math.sin(ta) * r2);
      ctx.stroke();
    }
    var na = a0 + (a1 - a0) * sf;
    ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = Math.max(1.5, gr * 0.05);
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * gr * 0.8, gy + Math.sin(na) * gr * 0.8); ctx.stroke();
    ctx.fillStyle = '#e8edf3';
    ctx.beginPath(); ctx.arc(gx, gy, Math.max(2, gr * 0.07), 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 ' + Math.round(gr * 0.46) + 'px ' + MONO;
    ctx.fillText(String(Math.round(game.v)), gx, gy + gr * 0.56);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 ' + Math.max(7, Math.round(Math.min(label, gr * 0.24))) + 'px ' + UI_FONT;
    ctx.fillText('MPH', gx, gy + gr * 0.9);

    // --- odometer + day (centre column)
    var ccx = x0 + pw / 2;
    var digits = 5;
    var dh = Math.min(inner * 0.42, colW * 0.17);
    var dw = dh * 0.68, dgap = Math.max(2, dw * 0.12);
    var ow = digits * dw + (digits - 1) * dgap;
    var ox = ccx - ow / 2, oy = iy + inner * 0.2;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 ' + label + 'px ' + UI_FONT;
    ctx.fillText('ODOMETER', ccx, oy - label * 0.5);
    var odo = Math.floor(game.odo);
    var frac = game.odo - odo;
    var str = String(odo % 100000);
    while (str.length < digits) str = '0' + str;
    ctx.font = '800 ' + Math.round(dh * 0.74) + 'px ' + MONO;
    ctx.textBaseline = 'middle';
    for (i = 0; i < digits; i++) {
      var bx = ox + i * (dw + dgap);
      var last = i === digits - 1;
      ctx.fillStyle = last ? '#f2f4f7' : '#0b0f17';
      roundRect(ctx, bx, oy, dw, dh, Math.min(6, dw * 0.2)); ctx.fill();
      ctx.save();
      roundRect(ctx, bx, oy, dw, dh, Math.min(6, dw * 0.2)); ctx.clip();
      var dch = +str[i];
      if (last) {
        ctx.fillStyle = '#0b0f17';
        ctx.fillText(String(dch), bx + dw / 2, oy + dh / 2 - frac * dh);
        ctx.fillText(String((dch + 1) % 10), bx + dw / 2, oy + dh / 2 - frac * dh + dh);
      } else {
        ctx.fillStyle = '#f2f4f7';
        ctx.fillText(str[i], bx + dw / 2, oy + dh / 2);
      }
      var sh = ctx.createLinearGradient(0, oy, 0, oy + dh);
      sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)');
      sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = sh;
      ctx.fillRect(bx, oy, dw, dh);
      ctx.restore();
    }
    // day row
    var dyy = oy + dh + Math.max(6, inner * 0.14);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '800 ' + Math.round(dh * 0.48) + 'px ' + UI_FONT;
    ctx.fillStyle = '#ffffff';
    var dayText = 'DAY ' + game.day;
    ctx.fillText(dayText, ccx, dyy + dh * 0.22);
    if (game.trophy) {
      var tw = ctx.measureText(dayText).width;
      drawTrophy(ccx + tw / 2 + dh * 0.2, dyy - dh * 0.08, dh * 0.55);
    }

    // --- cars remaining (right column)
    var rcx = x0 + pw - Math.max(colW * 0.32, r + 60);
    ctx.textBaseline = 'alphabetic';
    var quota = Core.quotaFor(game.day);
    if (game.quotaMet) {
      var fs = Math.min(inner * 0.5, colW * 0.24);
      drawFlag(rcx - fs * 1.05, iy + inner * 0.12, fs, now / 1000, 0);
      drawFlag(rcx + fs * 0.1, iy + inner * 0.12, fs, now / 1000, 1.7);
      ctx.fillStyle = '#2bd17a';
      ctx.font = '800 ' + label + 'px ' + UI_FONT;
      ctx.fillText('QUOTA MET', rcx, iy + inner * 0.92);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '700 ' + label + 'px ' + UI_FONT;
      ctx.fillText('CARS TO PASS', rcx, iy + inner * 0.14);
      var big = Math.min(inner * 0.5, colW * 0.26);
      ctx.font = '800 ' + Math.round(big) + 'px ' + MONO;
      ctx.fillStyle = game.carsLeft > quota ? '#ff8a6a' : '#ffffff';
      ctx.fillText(String(game.carsLeft), rcx, iy + inner * 0.14 + big * 1.02);
      var bw = Math.min(colW * 0.55, big * 3.2), bh = Math.max(3, inner * 0.05);
      var prog = clamp(1 - game.carsLeft / quota, 0, 1);
      var by = iy + inner * 0.86;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, rcx - bw / 2, by, bw, bh, bh / 2); ctx.fill();
      if (prog > 0) {
        var pg = ctx.createLinearGradient(rcx - bw / 2, 0, rcx + bw / 2, 0);
        pg.addColorStop(0, '#5ee3d0'); pg.addColorStop(1, '#2bd17a');
        ctx.fillStyle = pg;
        roundRect(ctx, rcx - bw / 2, by, Math.max(bh, bw * prog), bh, bh / 2); ctx.fill();
      }
    }

    // phase label + time left, top right of the panel
    var left = Math.max(0, C.DAY_LENGTH - game.clock);
    var mm = Math.floor(left / 60), ss = Math.floor(left % 60);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 ' + label + 'px ' + UI_FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    var phaseIdx = game.phase().index;
    if (pw > 420) {
      ctx.fillText(PHASE_NAMES[phaseIdx], tlx, tly - label * 0.5);
      ctx.textAlign = 'right';
      ctx.fillText('DAYBREAK IN ' + mm + ':' + (ss < 10 ? '0' : '') + ss, tlx + tlw, tly - label * 0.5);
    }
    ctx.textAlign = 'left';
  }

  /* ------------------------------------------------------------------ */
  /* Frame.                                                               */
  /* ------------------------------------------------------------------ */

  var prevV = 0, brakeHold = 0, lastNow = 0, scrapeAcc = 0, flash = 0;
  var lastPhaseIdx = -1;

  function render(game, info) {
    rGame = game;
    if (!W) resize();
    var now = info.now;
    var dt = info.paused || game.state !== 'race' ? 0 : Math.min(0.05, info.dt);

    // braking shows on the brake lights
    if (dt > 0) {
      var dv = (game.v - prevV) / dt;
      if (dv < -80 && game.crashT <= 0 && game.scrapeT <= 0) brakeHold = 0.12;
      brakeHold = Math.max(0, brakeHold - dt);
    }
    prevV = game.v;

    var pal = paletteAt(clamp(game.clock, 0, C.DAY_LENGTH));
    var phase = game.phase();
    if (game.state === 'race' && phase.index !== lastPhaseIdx && lastPhaseIdx !== -1) phaseBanner(phase.index);
    lastPhaseIdx = game.state === 'race' ? phase.index : -1;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    var shakeX = 0, shakeY = 0;
    if (game.crashT > 0.35 && !info.paused) {
      var k = (game.crashT - 0.35) / 0.55;
      shakeX = (Math.random() - 0.5) * 14 * k;
      shakeY = (Math.random() - 0.5) * 9 * k;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawSky(pal, game, now);
    drawMountains(pal, game);
    drawGround(pal, game);

    // depth-sorted objects: posts, rivals and the player
    var objs = [];
    collectPosts(game, objs);
    var cars = game.cars;
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (c.d > C.HORIZON_D || c.d < -C.CAM_BACK * 0.5) continue;
      objs.push({ kind: 'car', d: c.d, car: c });
    }
    objs.push({ kind: 'player', d: -0.001 });
    objs.sort(function (a, b) { return b.d - a.d; });

    var carW1 = 2 * C.CAR_HALF_W * halfRoad;
    var px = cx + game.x * halfRoad;
    var fogHide = pal.fog;
    var lights = [];
    for (i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (o.kind === 'post') {
        var pp = Core.depthScale(o.d);
        drawPost(o, pal, 1 - fogHide * (1 - smooth((pp - 0.22) / 0.2)));
        continue;
      }
      if (o.kind === 'player') {
        var rot = game.vx * 0.035 + (game.crashT > 0 ? Math.sin(game.crashT * 38) * 0.07 * game.crashT : 0);
        drawCar(px, playerY, carW1, PEARL, { wheel: game.wheelPhase, brake: brakeHold > 0, stripe: STRIPE, rot: rot });
        lights.push({ x: px, y: playerY, w: carW1, vis: 1, player: true });
        continue;
      }
      var p = Core.depthScale(o.d);
      if (p <= 0.004) continue;
      var vis = 1 - fogHide * (1 - smooth((p - 0.28) / 0.17));
      if (vis <= 0.01) continue;
      var w = carW1 * p;
      var x = roadX(o.d) + o.car.x * p * halfRoad;
      var y = rowOf(p);
      ctx.globalAlpha = vis;
      drawCar(x, y, w, HUES[o.car.hue % HUES.length], { wheel: game.wheelPhase * 0.6 + o.car.id * 0.37, shadow: 1 });
      ctx.globalAlpha = 1;
      lights.push({ x: x, y: y, w: w, vis: vis });
    }
    drawParticles(pal, false);

    // fog banks: a veil over the sky and a thick wall down the road
    var fcol = pal.fogC, fa = pal.fog;
    if (fa > 0.01) {
      var fs = ctx.createLinearGradient(0, 0, 0, horizonY);
      fs.addColorStop(0, rgb(fcol, fa * 0.55));
      fs.addColorStop(1, rgb(fcol, fa * 0.96));
      ctx.fillStyle = fs;
      ctx.fillRect(-20, -20, W + 40, horizonY + 20);
    }
    if (fa > 0.01 || pal.haze > 0.01) {
      var span2 = H - horizonY;
      var fg = ctx.createLinearGradient(0, horizonY, 0, H);
      fg.addColorStop(0, rgb(fcol, Math.min(0.97, fa * 0.97 + pal.haze * 0.25)));
      fg.addColorStop(clamp((rowOf(0.3) - horizonY) / span2, 0, 1), rgb(fcol, fa * 0.82));
      fg.addColorStop(clamp((rowOf(0.6) - horizonY) / span2, 0, 1), rgb(fcol, fa * 0.3));
      fg.addColorStop(1, rgb(fcol, fa * 0.12));
      ctx.fillStyle = fg;
      ctx.fillRect(-20, horizonY, W + 40, span2 + 20);
    }

    // darkness with the player's headlight cone cut out
    var dark = pal.dark;
    if (dark > 0.02) {
      mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      mctx.globalCompositeOperation = 'source-over';
      mctx.clearRect(0, 0, W, H);
      mctx.fillStyle = 'rgba(2,4,12,' + (dark * 0.9).toFixed(3) + ')';
      mctx.fillRect(-20, horizonY, W + 40, H);
      var sky = mctx.createLinearGradient(0, horizonY - H * 0.06, 0, horizonY);
      sky.addColorStop(0, 'rgba(2,4,12,0)');
      sky.addColorStop(1, 'rgba(2,4,12,' + (dark * 0.9).toFixed(3) + ')');
      mctx.fillStyle = sky;
      mctx.fillRect(-20, horizonY - H * 0.06, W + 40, H * 0.06);
      mctx.globalCompositeOperation = 'destination-out';
      mctx.globalAlpha = smooth((dark - 0.25) / 0.45);
      var pEnd = 0.2;
      var beam = mctx.createLinearGradient(0, playerY, 0, rowOf(pEnd));
      beam.addColorStop(0, 'rgba(0,0,0,0.95)');
      beam.addColorStop(0.55, 'rgba(0,0,0,0.75)');
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = beam;
      var feather = [[1, 0.5], [1.25, 0.3], [1.55, 0.2]];
      for (var fq = 0; fq < feather.length; fq++) {
        var save = mctx.globalAlpha;
        mctx.globalAlpha = save * feather[fq][1] * 2;
        beamPath(mctx, game.x, pEnd, feather[fq][0]);
        mctx.fill();
        mctx.globalAlpha = save;
      }
      var aura = mctx.createRadialGradient(px, playerY - carW1 * 0.3, carW1 * 0.1, px, playerY - carW1 * 0.3, carW1 * 1.1);
      aura.addColorStop(0, 'rgba(0,0,0,0.8)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = aura;
      mctx.fillRect(px - carW1 * 1.2, playerY - carW1 * 1.4, carW1 * 2.4, carW1 * 2.4);
      mctx.globalAlpha = 1;
      ctx.drawImage(maskCanvas, 0, 0, maskCanvas.width, maskCanvas.height, 0, 0, W, H);
    }

    // emissive pass: tail lights, reflectors, headlight haze, sparks
    ctx.globalCompositeOperation = 'lighter';
    var glowAmt = clamp((dark - 0.12) / 0.45, 0, 1);
    for (i = 0; i < lights.length; i++) {
      var L = lights[i];
      var hgt = carHeightFor(L.w);
      var ly = L.y - hgt * 0.43;
      var braking = L.player && brakeHold > 0;
      var g = (L.player ? (braking ? 1 : glowAmt * 0.8) : glowAmt) * L.vis;
      if (g <= 0.01) continue;
      var gs = L.w * (L.player ? 0.55 : 0.75) + 4;
      ctx.globalAlpha = Math.min(1, g);
      ctx.drawImage(GLOW_RED, L.x - L.w * 0.35 - gs / 2, ly - gs / 2, gs, gs);
      ctx.drawImage(GLOW_RED, L.x + L.w * 0.35 - gs / 2, ly - gs / 2, gs, gs);
      if (!L.player && L.w < 16) {
        ctx.fillStyle = '#ff4a3a';
        var dot = Math.max(1.2, L.w * 0.18);
        ctx.fillRect(L.x - L.w * 0.38 - dot / 2, ly - dot / 2, dot, dot);
        ctx.fillRect(L.x + L.w * 0.38 - dot / 2, ly - dot / 2, dot, dot);
      }
    }
    ctx.globalAlpha = 1;
    if (glowAmt > 0.02) {
      for (i = 0; i < objs.length; i++) {
        var po = objs[i];
        if (po.kind !== 'post' || po.sx == null) continue;
        var pp2 = Core.depthScale(po.d);
        var inBeam = clamp(1 - Math.abs((po.side * 1.14) - game.x) / (0.4 + 0.9 * (1 - pp2)), 0, 1);
        var ga = glowAmt * (0.25 + 0.75 * inBeam) * (1 - pal.fog * (1 - smooth((pp2 - 0.22) / 0.2)));
        if (ga < 0.02) continue;
        var rs = Math.max(4, po.sw * 6);
        ctx.globalAlpha = Math.min(1, ga);
        ctx.drawImage(GLOW_AMBER, po.sx - rs / 2, po.sy - rs / 2, rs, rs);
      }
      ctx.globalAlpha = 1;
      // headlight haze (stronger in fog)
      var hz = glowAmt * (0.1 + pal.fog * 0.25);
      var hg = ctx.createLinearGradient(0, playerY - carW1 * 0.3, 0, rowOf(0.25));
      hg.addColorStop(0, 'rgba(255,244,214,' + hz.toFixed(3) + ')');
      hg.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = hg;
      beamPath(ctx, game.x, 0.25, 1.1);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      beamPath(ctx, game.x, 0.25, 1.45);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawParticles(pal, true);
    ctx.globalCompositeOperation = 'source-over';

    // continuous scrape debris
    if (dt > 0 && game.scrapeT > 0) {
      scrapeAcc += dt;
      while (scrapeAcc > 0.02) {
        scrapeAcc -= 0.02;
        var side = game.x > 0 ? 1 : -1;
        spawn(1, px + side * carW1 * 0.5, playerY - 4, 'spark', 260);
        spawn(1, px + side * carW1 * 0.45, playerY - 2, 'dust', 120);
      }
    }
    if (dt > 0) stepParticles(dt);

    drawSnow(pal, game, dt);
    if (pal.dark < 0.6 && pal.fog < 0.5) drawSpeedLines(game, now);
    ctx.restore();

    ctx.drawImage(vignette, 0, 0, W, H);
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,90,60,' + (flash * 0.35).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      flash = Math.max(0, flash - (info.dt || 0.016) * 3);
    }
    drawHud(game, now);
    lastNow = now;
  }

  /* ------------------------------------------------------------------ */
  /* Audio.                                                               */
  /* ------------------------------------------------------------------ */

  var Audio = (function () {
    var ac = null, master = null, noise = null, eng = null;
    var muted = false, paused = false, lastWhoosh = 0;

    function unlock() {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { ac = new AC(); } catch (e) { return; }
        build();
      }
      if (ac.state === 'suspended') ac.resume();
    }

    function build() {
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.85;
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);
      var len = ac.sampleRate * 2;
      noise = ac.createBuffer(1, len, ac.sampleRate);
      var data = noise.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      var eg = ac.createGain(); eg.gain.value = 0;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 3;
      var o1 = ac.createOscillator(); o1.type = 'sawtooth';
      var o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 11;
      var o3 = ac.createOscillator(); o3.type = 'square';
      var g3 = ac.createGain(); g3.gain.value = 0.45;
      o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp);
      lp.connect(eg); eg.connect(master);
      var rs = ac.createBufferSource(); rs.buffer = noise; rs.loop = true;
      var rf = ac.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 180;
      var rg = ac.createGain(); rg.gain.value = 0;
      rs.connect(rf); rf.connect(rg); rg.connect(master);
      var ss = ac.createBufferSource(); ss.buffer = noise; ss.loop = true;
      var sf = ac.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2600; sf.Q.value = 0.8;
      var sg = ac.createGain(); sg.gain.value = 0;
      ss.connect(sf); sf.connect(sg); sg.connect(master);
      o1.start(); o2.start(); o3.start(); rs.start(); ss.start();
      eng = { o1: o1, o2: o2, o3: o3, lp: lp, eg: eg, rg: rg, sg: sg };
    }

    function setMuted(m) {
      muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ac.currentTime, 0.03);
    }
    function setPaused(p) { paused = p; }

    var GEARS = [0, 32, 64, 98, 151];
    function update(game, isPaused) {
      if (!eng) return;
      var t = ac.currentTime, v = game.v;
      var g = 0;
      while (g < GEARS.length - 2 && v > GEARS[g + 1]) g++;
      var frac = clamp((v - GEARS[g]) / (GEARS[g + 1] - GEARS[g]), 0, 1);
      var f = game.state === 'race' ? 44 + frac * 66 + g * 10 : 40;
      var running = game.state === 'race' && !isPaused && !paused;
      var idle = game.state === 'ready' && !isPaused;
      eng.o1.frequency.setTargetAtTime(f, t, 0.04);
      eng.o2.frequency.setTargetAtTime(f, t, 0.04);
      eng.o3.frequency.setTargetAtTime(f / 2, t, 0.04);
      var sf = v / C.VMAX;
      eng.lp.frequency.setTargetAtTime(240 + sf * 1700 + frac * 500, t, 0.06);
      eng.eg.gain.setTargetAtTime(running ? 0.06 + sf * 0.05 : idle ? 0.035 : 0, t, 0.08);
      eng.rg.gain.setTargetAtTime(running ? sf * 0.12 : 0, t, 0.1);
      eng.sg.gain.setTargetAtTime(running && game.scrapeT > 0 ? 0.1 : 0, t, 0.03);
    }

    function burst(o) {
      var t = ac.currentTime + (o.delay || 0);
      var src = ac.createBufferSource(); src.buffer = noise;
      src.loop = true;
      var f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f0, t);
      f.frequency.exponentialRampToValueAtTime(o.f1 || o.f0, t + o.dur);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      var out = g;
      if (ac.createStereoPanner && o.pan) {
        var pn = ac.createStereoPanner(); pn.pan.value = o.pan; g.connect(pn); out = pn;
      }
      src.connect(f); f.connect(g); out.connect(master);
      src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05);
    }

    function tone(o) {
      var t = ac.currentTime + (o.delay || 0);
      var osc = ac.createOscillator(); osc.type = o.type || 'triangle';
      osc.frequency.setValueAtTime(o.f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + o.dur + 0.05);
    }

    function notes(seq, type, gain, step) {
      for (var i = 0; i < seq.length; i++) {
        if (seq[i]) tone({ f: seq[i], dur: step * 1.6, gain: gain, type: type, delay: i * step });
      }
    }

    function onEvents(events, game) {
      if (!ac || !master) return;
      var now = ac.currentTime;
      for (var i = 0; i < events.length; i++) {
        var e = events[i];
        switch (e.type) {
          case 'pass':
          case 'passed':
            if (now - lastWhoosh < 0.07) break;
            lastWhoosh = now;
            burst(e.type === 'pass'
              ? { f0: 2400, f1: 500, dur: 0.28, gain: 0.16, q: 1.2, pan: (Math.random() - 0.5) * 0.8 }
              : { f0: 400, f1: 1600, dur: 0.32, gain: 0.1, q: 1.2 });
            break;
          case 'crash':
            burst({ type: 'lowpass', f0: 3000, f1: 200, dur: 0.6, gain: 0.5, q: 0.7 });
            tone({ type: 'sine', f: 110, to: 38, dur: 0.45, gain: 0.5 });
            burst({ type: 'highpass', f0: 4000, f1: 6000, dur: 0.18, gain: 0.12, delay: 0.02 });
            break;
          case 'edge':
            burst({ type: 'bandpass', f0: 1800, f1: 900, dur: 0.18, gain: 0.12, q: 2 });
            break;
          case 'quota':
            notes([523.25, 659.25, 783.99, 1046.5], 'triangle', 0.18, 0.09);
            notes([1046.5, 0, 1318.5], 'square', 0.04, 0.09);
            break;
          case 'newday':
            notes([392, 523.25, 659.25, 783.99, 0, 659.25, 1046.5], 'square', 0.06, 0.11);
            notes([196, 261.63, 329.63, 392], 'triangle', 0.14, 0.18);
            break;
          case 'trophy':
            notes([523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98], 'triangle', 0.18, 0.1);
            break;
          case 'gameover':
            notes([392, 349.23, 311.13, 261.63], 'triangle', 0.18, 0.22);
            notes([196, 174.61, 155.56, 130.81], 'square', 0.04, 0.22);
            break;
          case 'start':
            notes([440, 0, 880], 'square', 0.05, 0.08);
            break;
        }
      }
    }

    return { unlock: unlock, setMuted: setMuted, setPaused: setPaused, update: update, onEvents: onEvents };
  })();

  /* ------------------------------------------------------------------ */
  /* DOM overlays and banners.                                            */
  /* ------------------------------------------------------------------ */

  var $ = function (id) { return document.getElementById(id); };
  var bannerEl = $('banner'), bannerTimer = 0;
  function banner(text, tone, ms) {
    bannerEl.textContent = text;
    bannerEl.className = 'show' + (tone ? ' ' + tone : '');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { bannerEl.className = tone || ''; }, ms || 2200);
  }
  function phaseBanner(idx) {
    var t = {
      1: ['SNOW — ICY ROAD', 'cool'], 2: ['CLEAR SKIES', 'cool'], 3: ['DUSK', ''],
      4: ['NIGHTFALL', 'cool'], 5: ['FOG AHEAD', 'cool'], 6: ['NIGHT', 'cool'], 7: ['DAWN — DAYBREAK SOON', '']
    }[idx];
    if (t) banner(t[0], t[1]);
  }

  function fmtBest(b) {
    if (!b || !b.day) return '';
    return 'BEST · DAY ' + b.day + ' · ' + b.odo + ' MI';
  }

  var muteBtn = $('mute'), pauseBtn = $('pause');
  function onUi(s) {
    $('title').classList.toggle('show', s.state === 'ready');
    $('paused').classList.toggle('show', !!s.paused && s.state === 'race');
    $('over').classList.toggle('show', s.state === 'over');
    muteBtn.textContent = s.muted ? 'UNMUTE' : 'MUTE';
    muteBtn.setAttribute('aria-label', s.muted ? 'Unmute sound' : 'Mute sound');
    pauseBtn.textContent = s.paused ? 'RESUME' : 'PAUSE';
    pauseBtn.style.visibility = s.state === 'race' ? 'visible' : 'hidden';
    $('bestTitle').textContent = fmtBest(s.best);
    if (s.state === 'over') {
      var g = s.game;
      var stats = g.lastDayStats || { day: g.day, odo: Math.floor(g.odo) };
      $('overDay').textContent = String(stats.day);
      $('overOdo').textContent = String(stats.odo);
      $('overBest').textContent = s.best && s.best.day ? 'D' + s.best.day : '—';
      $('overRecord').textContent = s.best && s.best.day === stats.day && s.best.odo === stats.odo ? 'NEW PERSONAL BEST' : '';
      $('overWhy').textContent = 'Daybreak on day ' + stats.day + ' came with ' + g.carsLeft + ' car' + (g.carsLeft === 1 ? '' : 's') + ' still to pass.';
    }
  }

  function onEvents(events, game) {
    var carW1 = 2 * C.CAR_HALF_W * halfRoad;
    var px = cx + game.x * halfRoad;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.type === 'start') banner('DAY ' + game.day + ' — PASS ' + Core.quotaFor(game.day) + ' CARS', '');
      else if (e.type === 'newday') banner('DAY ' + game.day + ' — PASS ' + Core.quotaFor(game.day) + ' CARS', '');
      else if (e.type === 'quota') banner('QUOTA MET!', 'cool', 2600);
      else if (e.type === 'gameover') { clearTimeout(bannerTimer); bannerEl.className = ''; }
      else if (e.type === 'trophy') setTimeout(function () { banner('TROPHY EARNED', 'gold', 3200); }, 2300);
      else if (e.type === 'crash') {
        flash = 1;
        spawn(34, px, playerY - carW1 * 0.5, 'spark', 420);
        spawn(10, px, playerY - carW1 * 0.45, 'smoke', 60);
      } else if (e.type === 'edge') {
        spawn(12, px + (game.x > 0 ? 1 : -1) * carW1 * 0.5, playerY - 6, 'spark', 300);
      }
    }
  }

  [muteBtn, pauseBtn].forEach(function (b) {
    b.addEventListener('click', function () { b.blur(); });
  });

  var resizeTimer = 0;
  function refit() {
    resize();
    clearTimeout(resizeTimer);
    // iOS reports the settled size a beat after rotating
    resizeTimer = setTimeout(resize, 300);
  }
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);
  if (window.matchMedia) {
    var mq = window.matchMedia('(orientation: portrait)');
    if (mq.addEventListener) mq.addEventListener('change', refit);
  }
  resize();

  EnduroShell.boot({
    version: 'remastered',
    canvas: canvas,
    render: render,
    audio: Audio,
    touchRoot: document.getElementById('touch'),
    muteButton: muteBtn,
    pauseButton: pauseBtn,
    onUi: onUi,
    onEvents: onEvents
  });
})();
