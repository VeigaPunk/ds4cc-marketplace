/*
 * Frostbite Remastered — the shared simulation drawn for today's screens: a
 * living arctic sky (low sun and drifting cloud by day, stars and aurora by
 * night), glaciers on the horizon, a snowfield shore with an ice cliff, a
 * glinting sea, two-faced ice floes that bob and leave wakes, an animated
 * builder, a prowling grizzly, geese, crabs, clams and glittering fish, an
 * igloo that rises block by block, particles, falling snow, frost that creeps
 * in as the temperature drops, and a synthesized soundscape.
 *
 * World units: 320 x 240 (2600 x doubled, y x 1.25, i.e. the same 4:3
 * picture). The backdrop extends past the play area to fill any screen.
 */
(function () {
  'use strict';

  var Core = window.FrostbiteCore;
  var C = Core.C;
  var WW = 320, WH = 240, SX = 2, SY = 1.25;
  function X(gx) { return gx * SX; }
  function Y(gy) { return gy * SY; }
  var SKY_Y = Y(C.SKY_END), SHORE_Y = Y(C.SHORE_END);
  var IG = { cx: X(C.DOOR_X + C.BAILEY_W / 2), base: Y(C.IGLOO_BASE), rx: 34, ry: 27 };
  var TAU = Math.PI * 2;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var view = { w: 1, h: 1, dpr: 1, s: 1, ox: 0, oy: 0, x0: 0, x1: WW, y0: 0, y1: WH };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgb(c, a) {
    return a === undefined ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
      : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')';
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeBack(t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  // --- palettes ----------------------------------------------------------------
  var DAY = {
    skyTop: '#123f86', skyMid: '#4f95d8', skyLow: '#cfe8f6',
    mtnCap: '#ffffff', mtnFar: '#8fb6db', mtnNear: '#cfe2f2', mtnShade: '#7aa3c9',
    snowTop: '#fbfdff', snowLow: '#dceaf5', snowShadow: '#b9d2e6', lipTop: '#d4ecfb', lipLow: '#6fa7d3',
    waterTop: '#1f74b4', waterMid: '#0d4680', waterLow: '#062246', glint: '#d9f2ff',
    iceTop: '#ffffff', iceTop2: '#dcecf8', iceSide: '#a3cbe8', iceSide2: '#6fa3cf',
    blueTop: '#8fd8ff', blueTop2: '#3e9ee8', blueSide: '#2f78c4', blueSide2: '#1c4f92',
    block: '#ffffff', block2: '#d3e5f3', grout: '#93b6d2', ink: '#0b2342'
  };
  var NIGHT = {
    skyTop: '#01030b', skyMid: '#081736', skyLow: '#1c3a63',
    mtnCap: '#9fb6d8', mtnFar: '#1a2d4f', mtnNear: '#2c4670', mtnShade: '#142542',
    snowTop: '#a9bcd8', snowLow: '#7088ad', snowShadow: '#4f668c', lipTop: '#7f9fc9', lipLow: '#2a4b7a',
    waterTop: '#0d3361', waterMid: '#061c3c', waterLow: '#020a1a', glint: '#9fc8ff',
    iceTop: '#e3eefc', iceTop2: '#b7cbe6', iceSide: '#7493bd', iceSide2: '#4b6893',
    blueTop: '#6fbfff', blueTop2: '#2f7fd0', blueSide: '#225fa6', blueSide2: '#143d73',
    block: '#e8f0fb', block2: '#b3c6e0', grout: '#6f88ad', ink: '#020a1a'
  };
  var PKEYS = Object.keys(DAY);
  var DAYc = {}, NIGHTc = {};
  PKEYS.forEach(function (k) { DAYc[k] = hex(DAY[k]); NIGHTc[k] = hex(NIGHT[k]); });
  var P = {}, Pc = {}, paletteAt = -1;
  function palette(m) {
    var q = Math.round(m * 60) / 60;
    if (q === paletteAt) return;
    paletteAt = q;
    PKEYS.forEach(function (k) { Pc[k] = mixc(DAYc[k], NIGHTc[k], q); P[k] = rgb(Pc[k]); });
  }

  // --- decoration (seeded, world-space) ----------------------------------------
  var rnd = mulberry(1983);
  var STARS = [], GLINTS = [], SPECKS = [], ICICLES = [], CLOUDS = [], FLAKES = [], FAR = [], NEAR = [];
  (function () {
    var i;
    for (i = 0; i < 260; i++) STARS.push({ x: -700 + rnd() * 1720, y: -260 + rnd() * 300, r: 0.3 + rnd() * 0.8, tw: 0.8 + rnd() * 2.6, ph: rnd() * TAU });
    for (i = 0; i < 120; i++) {
      var gy = SHORE_Y + 4 + Math.pow(rnd(), 1.4) * 200;
      GLINTS.push({ x: rnd() * 1800 - 700, y: gy, len: 3 + rnd() * 9, v: (rnd() - 0.5) * 6, f: 0.8 + rnd() * 2.2, p: rnd() * TAU, a: 0.15 + rnd() * 0.35 });
    }
    for (i = 0; i < 170; i++) SPECKS.push({ x: rnd() * 1800 - 700, y: SKY_Y + 2 + rnd() * (SHORE_Y - SKY_Y - 9), w: 2 + rnd() * 9, dark: rnd() < 0.45 });
    for (i = 0; i < 90; i++) ICICLES.push({ x: rnd() * 1800 - 700, h: 1.5 + rnd() * 5, w: 1 + rnd() * 1.8 });
    for (i = 0; i < 7; i++) CLOUDS.push({ x: rnd() * 1400 - 500, y: -30 + rnd() * 52, s: 0.7 + rnd() * 1.1, v: 1.2 + rnd() * 2.4 });
    for (i = 0; i < 90; i++) FLAKES.push({ x: rnd(), y: rnd(), r: 0.5 + rnd() * 1.3, v: 6 + rnd() * 14, sw: rnd() * TAU, sp: 0.5 + rnd() * 1.5 });
    // Two glacier ranges: tall far peaks, low near ice shelves.
    var h = 0;
    for (var x = -720; x <= 1040; x += 8) {
      h = clamp(h + (rnd() - 0.5) * 7, 0, 1);
      FAR.push({ x: x, y: SKY_Y - 4 - (6 + 12 * Math.abs(Math.sin(x * 0.021 + 1.3)) * (0.5 + h * 0.6) + rnd() * 3) });
      NEAR.push({ x: x, y: SKY_Y - 1 - (2 + 5 * Math.abs(Math.sin(x * 0.047 + 0.4)) + rnd() * 1.5) });
    }
  })();

  // --- layout ------------------------------------------------------------------
  var frostCanvas = null;
  function resize() {
    var vw = Math.max(240, window.innerWidth), vh = Math.max(200, window.innerHeight);
    var dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    var portrait = vh >= vw;
    var top = coarse ? (portrait ? 58 : 40) : 60;
    var bottom = coarse ? (portrait ? 184 : 6) : 18;
    var side = coarse && !portrait ? 150 : 10;
    var aw = Math.max(120, vw - side * 2), ah = Math.max(90, vh - top - bottom);
    var s = Math.min(aw / WW, ah / WH);
    if (coarse && !portrait) s = Math.max(s, Math.min((vw - 2 * 104) / WW, ah / WH));
    view.w = vw; view.h = vh; view.dpr = dpr; view.s = s;
    view.ox = (vw - WW * s) / 2;
    view.oy = top + (ah - WH * s) / 2;
    view.x0 = -view.ox / s; view.x1 = (vw - view.ox) / s;
    view.y0 = -view.oy / s; view.y1 = (vh - view.oy) / s;
    buildFrost(vw, vh, dpr);
  }

  // Ice crystals around the screen edge, revealed as the temperature drops.
  function buildFrost(vw, vh, dpr) {
    frostCanvas = document.createElement('canvas');
    var fw = Math.round(vw * Math.min(dpr, 1.5)), fh = Math.round(vh * Math.min(dpr, 1.5));
    frostCanvas.width = fw; frostCanvas.height = fh;
    var f = frostCanvas.getContext('2d'), r = mulberry(45);
    var g = f.createRadialGradient(fw / 2, fh / 2, Math.min(fw, fh) * 0.32, fw / 2, fh / 2, Math.hypot(fw, fh) * 0.56);
    g.addColorStop(0, 'rgba(210,235,255,0)');
    g.addColorStop(0.7, 'rgba(200,230,255,0.35)');
    g.addColorStop(1, 'rgba(235,248,255,0.85)');
    f.fillStyle = g;
    f.fillRect(0, 0, fw, fh);
    f.strokeStyle = 'rgba(255,255,255,0.42)';
    f.lineCap = 'round';
    function branch(x, y, a, len, depth) {
      if (depth <= 0 || len < 2) return;
      var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      f.lineWidth = Math.max(0.6, depth * 0.55);
      f.beginPath(); f.moveTo(x, y); f.lineTo(x2, y2); f.stroke();
      branch(x2, y2, a + (r() - 0.5) * 0.5, len * 0.78, depth - 1);
      if (r() < 0.8) branch(x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, a + 0.9 + r() * 0.3, len * 0.45, depth - 1);
      if (r() < 0.8) branch(x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, a - 0.9 - r() * 0.3, len * 0.45, depth - 1);
    }
    var unit = Math.min(fw, fh) / 9;
    for (var i = 0; i < 46; i++) {
      var side = i % 4, t = r(), x, y, a;
      if (side === 0) { x = t * fw; y = 0; a = Math.PI / 2; }
      else if (side === 1) { x = t * fw; y = fh; a = -Math.PI / 2; }
      else if (side === 2) { x = 0; y = t * fh; a = 0; }
      else { x = fw; y = t * fh; a = Math.PI; }
      branch(x, y, a + (r() - 0.5) * 0.9, unit * (0.5 + r() * 0.7), 5);
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  resize();

  function worldTransform(shx, shy) {
    var k = view.dpr * view.s;
    ctx.setTransform(k, 0, 0, k, view.dpr * (view.ox + (shx || 0)), view.dpr * (view.oy + (shy || 0)));
  }

  // --- state the renderer keeps ---------------------------------------------------
  var nightMix = 0;
  var rowBlue = [0, 0, 0, 0], rowFlash = [0, 0, 0, 0];
  var particles = [], flyers = [], popups = [];
  var landed = [];               // per igloo block: time it landed
  var igShown = 0, igTarget = 0, igReset = true, doorAt = -1;
  var shake = 0, freezeFlash = 0;
  var lastNow = 0, clock = 0;

  function spawn(o) { if (particles.length < 360) particles.push(o); }
  function popup(text, x, y, color, size) { popups.push({ text: text, x: x, y: y, t: 0, color: color || '#fff', size: size || 9 }); }

  // --- backdrop --------------------------------------------------------------------
  function drawSky(t) {
    var w = view.x1 - view.x0;
    var g = ctx.createLinearGradient(0, view.y0, 0, SKY_Y);
    g.addColorStop(0, P.skyTop);
    g.addColorStop(clamp((0 - view.y0) / (SKY_Y - view.y0) + 0.25, 0.3, 0.8), P.skyMid);
    g.addColorStop(1, P.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(view.x0, view.y0, w, SKY_Y - view.y0 + 1);

    // Low sun by day.
    var day = 1 - nightMix;
    if (day > 0.02) {
      var sx = 150, sy = 38;
      var sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 90);
      sg.addColorStop(0, 'rgba(255,244,214,' + (0.75 * day).toFixed(3) + ')');
      sg.addColorStop(0.18, 'rgba(255,214,160,' + (0.32 * day).toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 90, view.y0, 180, SKY_Y - view.y0);
      ctx.fillStyle = 'rgba(255,250,236,' + day.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, TAU); ctx.fill();
      // Clouds drift.
      for (var i = 0; i < CLOUDS.length; i++) {
        var cl = CLOUDS[i];
        var span = 1700, cx = ((cl.x + t * cl.v) % span + span) % span - 600;
        if (cx < view.x0 - 80 || cx > view.x1 + 80) continue;
        drawCloud(cx, cl.y, cl.s, day * 0.75);
      }
    }
    if (nightMix > 0.02) {
      var n = nightMix;
      for (var k = 0; k < STARS.length; k++) {
        var st = STARS[k];
        if (st.x < view.x0 || st.x > view.x1 || st.y < view.y0 || st.y > SKY_Y - 8) continue;
        var a = n * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.tw + st.ph)));
        ctx.fillStyle = 'rgba(235,242,255,' + a.toFixed(3) + ')';
        ctx.fillRect(st.x, st.y, st.r, st.r);
      }
      drawAurora(t, n);
      // Moon.
      var mx = 106, my = 22;
      var mg = ctx.createRadialGradient(mx, my, 3, mx, my, 40);
      mg.addColorStop(0, 'rgba(220,235,255,' + (0.35 * n).toFixed(3) + ')');
      mg.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(mx - 40, my - 40, 80, 80);
      ctx.fillStyle = 'rgba(242,246,255,' + n.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(mx, my, 6.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(190,205,230,' + (0.6 * n).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(mx + 1.8, my - 1.2, 1.4, 0, TAU); ctx.arc(mx - 2, my + 2, 1, 0, TAU); ctx.arc(mx + 0.5, my + 3, 0.7, 0, TAU); ctx.fill();
    }
  }

  function drawCloud(x, y, s, a) {
    ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, 18 * s, 4.5 * s, 0, 0, TAU);
    ctx.ellipse(x - 9 * s, y - 2 * s, 9 * s, 4 * s, 0, 0, TAU);
    ctx.ellipse(x + 7 * s, y - 3.5 * s, 10 * s, 5 * s, 0, 0, TAU);
    ctx.fill();
  }

  var AURORA = [
    { y: -6, h: 26, k: 0.018, w: 0.35, a: 7, k2: 0.041, w2: 0.22, a2: 3, c: [80, 255, 170], al: 0.30 },
    { y: 4, h: 20, k: 0.024, w: 0.27, a: 6, k2: 0.033, w2: 0.31, a2: 2.5, c: [70, 210, 255], al: 0.22 },
    { y: -16, h: 24, k: 0.013, w: 0.2, a: 8, k2: 0.052, w2: 0.4, a2: 2, c: [190, 110, 255], al: 0.16 }
  ];
  function drawAurora(t, n) {
    if (reduceMotion) t *= 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var x0 = view.x0 - 10, x1 = view.x1 + 10;
    for (var b = 0; b < AURORA.length; b++) {
      var A = AURORA[b];
      var top = [], x;
      for (x = x0; x <= x1 + 8; x += 8) {
        top.push(A.y + Math.sin(x * A.k + t * A.w) * A.a + Math.sin(x * A.k2 - t * A.w2) * A.a2);
      }
      var g = ctx.createLinearGradient(0, A.y - A.a - A.a2, 0, A.y + A.h + A.a);
      g.addColorStop(0, rgb(A.c, 0));
      g.addColorStop(0.65, rgb(A.c, A.al * n));
      g.addColorStop(1, rgb(A.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      var i = 0;
      for (x = x0; x <= x1 + 8; x += 8, i++) {
        if (i === 0) ctx.moveTo(x, top[i]); else ctx.lineTo(x, top[i]);
      }
      i--;
      for (x = x0 + i * 8; x >= x0; x -= 8, i--) {
        var shimmer = 0.75 + 0.25 * Math.sin(x * 0.09 + t * 1.3 + b);
        ctx.lineTo(x, top[i] + A.h * shimmer);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRange(pts, base, fill, cap) {
    var g = ctx.createLinearGradient(0, base - 22, 0, base);
    g.addColorStop(0, cap);
    g.addColorStop(0.45, fill);
    g.addColorStop(1, fill);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, base);
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].x < view.x0 - 16 || pts[i].x > view.x1 + 16) continue;
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[pts.length - 1].x, base);
    ctx.closePath();
    ctx.fill();
  }

  function drawShore(t) {
    var w = view.x1 - view.x0;
    drawRange(FAR, SKY_Y + 1, P.mtnFar, P.mtnCap);
    drawRange(NEAR, SKY_Y + 1, P.mtnNear, P.mtnCap);
    var g = ctx.createLinearGradient(0, SKY_Y, 0, SHORE_Y);
    g.addColorStop(0, P.snowTop);
    g.addColorStop(0.75, P.snowLow);
    g.addColorStop(1, P.snowShadow);
    ctx.fillStyle = g;
    ctx.fillRect(view.x0, SKY_Y, w, SHORE_Y - SKY_Y);
    ctx.fillStyle = rgb(Pc.mtnShade, 0.25);
    ctx.fillRect(view.x0, SKY_Y, w, 1.2);
    // Wind-carved snow.
    for (var i = 0; i < SPECKS.length; i++) {
      var s = SPECKS[i];
      if (s.x < view.x0 - 10 || s.x > view.x1) continue;
      ctx.fillStyle = s.dark ? rgb(Pc.snowShadow, 0.35) : 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.w, 0.55, 0, 0, TAU);
      ctx.fill();
    }
    // The ice cliff where the shore meets the sea.
    var lip = ctx.createLinearGradient(0, SHORE_Y - 6, 0, SHORE_Y);
    lip.addColorStop(0, P.lipTop);
    lip.addColorStop(1, P.lipLow);
    ctx.fillStyle = lip;
    ctx.fillRect(view.x0, SHORE_Y - 6, w, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(view.x0, SHORE_Y - 6, w, 0.7);
    ctx.fillStyle = rgb(Pc.lipLow, 0.9);
    for (var k = 0; k < ICICLES.length; k++) {
      var ic = ICICLES[k];
      if (ic.x < view.x0 - 4 || ic.x > view.x1) continue;
      ctx.beginPath();
      ctx.moveTo(ic.x, SHORE_Y - 0.5);
      ctx.lineTo(ic.x + ic.w, SHORE_Y - 0.5);
      ctx.lineTo(ic.x + ic.w * 0.5, SHORE_Y + ic.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawWater(t) {
    var w = view.x1 - view.x0, bottom = Math.max(WH, view.y1);
    var g = ctx.createLinearGradient(0, SHORE_Y, 0, bottom);
    g.addColorStop(0, P.waterTop);
    g.addColorStop(clamp(80 / (bottom - SHORE_Y), 0.2, 0.6), P.waterMid);
    g.addColorStop(1, P.waterLow);
    ctx.fillStyle = g;
    ctx.fillRect(view.x0, SHORE_Y, w, bottom - SHORE_Y);
    var rg = ctx.createLinearGradient(0, SHORE_Y, 0, SHORE_Y + 12);
    rg.addColorStop(0, rgb(Pc.lipTop, 0.35));
    rg.addColorStop(1, rgb(Pc.lipTop, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(view.x0, SHORE_Y, w, 12);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.7;
    var span = 1800;
    for (var i = 0; i < GLINTS.length; i++) {
      var gl = GLINTS[i];
      if (gl.y > bottom) continue;
      var x = ((gl.x + t * gl.v) % span + span) % span - 700;
      if (x < view.x0 - 12 || x > view.x1) continue;
      var a = gl.a * (0.5 + 0.5 * Math.sin(t * gl.f + gl.p)) * (1 - nightMix * 0.45);
      if (a < 0.03) continue;
      ctx.strokeStyle = rgb(Pc.glint, a);
      ctx.beginPath();
      ctx.moveTo(x, gl.y);
      ctx.lineTo(x + gl.len, gl.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- ice ---------------------------------------------------------------------------
  function rowBob(r, t) { return reduceMotion ? 0 : Math.sin(t * 1.9 + r * 1.7) * 0.55; }

  // Pieces of a row in game pixels, with touching pieces merged into one slab.
  function rowSlabs(game, r) {
    var pieces = game.rowPieces(r, 0).slice().sort(function (a, b) { return a.x - b.x; });
    var out = [];
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i], last = out[out.length - 1];
      if (last && p.x - (last.x + last.w) < 0.7) {
        last.cracks.push(last.w + (p.x - (last.x + last.w)) / 2);
        last.w = p.x + p.w - last.x;
      } else out.push({ x: p.x, w: p.w, cracks: [] });
    }
    return out;
  }

  function drawFloes(game, t) {
    var TH = 6.6, SH = 3.8, SK = 3.2;
    for (var r = 0; r < 4; r++) {
      var row = game.rows[r];
      var top = Y(C.ROW_TOP[r]) + rowBob(r, t);
      var bm = rowBlue[r], fl = rowFlash[r];
      var topA = mixc(Pc.iceTop, Pc.blueTop, bm), topB = mixc(Pc.iceTop2, Pc.blueTop2, bm);
      var sideA = mixc(Pc.iceSide, Pc.blueSide, bm), sideB = mixc(Pc.iceSide2, Pc.blueSide2, bm);
      var gTop = ctx.createLinearGradient(0, top, 0, top + TH);
      gTop.addColorStop(0, rgb(topA)); gTop.addColorStop(1, rgb(topB));
      var gSide = ctx.createLinearGradient(0, top + TH, 0, top + TH + SH);
      gSide.addColorStop(0, rgb(sideA)); gSide.addColorStop(1, rgb(sideB));
      var dir = row.dir;
      var slabs = rowSlabs(game, r);
      for (var k = 0; k < slabs.length; k++) {
        var sl = slabs[k];
        for (var s = -1; s <= 0; s++) {
          var gx = sl.x + s * C.TRACK;
          if (gx + sl.w < -4 || gx > C.TRACK + 4) continue;
          var x = X(gx), w = X(sl.w);
          // shadow + reflection in the sea
          ctx.fillStyle = 'rgba(0,12,32,0.32)';
          ctx.fillRect(x + 1.5, top + TH + SH, w - 0.5, 3.2);
          ctx.fillStyle = rgb(sideA, 0.16 + bm * 0.08);
          for (var q = 0; q < 3; q++) {
            var wob = Math.sin(t * 3 + q * 1.7 + x * 0.05) * 1.2;
            ctx.fillRect(x + 2 + wob, top + TH + SH + 3.5 + q * 2.2, w - 4 - q * 2, 1);
          }
          // wake behind, foam at the waterline
          ctx.fillStyle = 'rgba(235,248,255,0.35)';
          var tail = dir > 0 ? x - 1 : x + w + 1;
          for (var z = 0; z < 3; z++) {
            var len = 3 + z * 2.5 + Math.sin(t * 6 + z + k) * 0.8;
            ctx.fillRect(dir > 0 ? tail - len - z * 2 : tail + z * 2, top + TH + SH - 0.8 + z * 0.7, len, 0.6);
          }
          ctx.fillStyle = 'rgba(240,250,255,0.45)';
          ctx.fillRect(x, top + TH + SH - 0.6, w, 0.9);
          // front face
          ctx.fillStyle = gSide;
          ctx.beginPath();
          ctx.moveTo(x, top + TH);
          ctx.lineTo(x + w, top + TH);
          ctx.lineTo(x + w - 0.6, top + TH + SH);
          ctx.lineTo(x + 0.6, top + TH + SH);
          ctx.closePath();
          ctx.fill();
          // top face
          ctx.fillStyle = gTop;
          ctx.beginPath();
          ctx.moveTo(x + SK, top);
          ctx.lineTo(x + w + SK, top);
          ctx.lineTo(x + w, top + TH);
          ctx.lineTo(x, top + TH);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = rgb(mixc(topA, [255, 255, 255], 0.6), 0.9);
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(x + SK + 0.5, top + 0.3);
          ctx.lineTo(x + w + SK - 0.5, top + 0.3);
          ctx.stroke();
          // cracks between merged pieces, and a few etched lines
          ctx.strokeStyle = rgb(sideA, 0.55);
          ctx.lineWidth = 0.45;
          ctx.beginPath();
          for (var c = 0; c < sl.cracks.length; c++) {
            var cx = x + X(sl.cracks[c]);
            ctx.moveTo(cx + SK, top);
            ctx.lineTo(cx + SK * 0.5 + 0.8, top + TH * 0.5);
            ctx.lineTo(cx, top + TH + SH);
          }
          var seed = (r * 7 + k * 3) % 5;
          ctx.moveTo(x + w * (0.2 + seed * 0.1) + SK * 0.7, top + 1.5);
          ctx.lineTo(x + w * (0.28 + seed * 0.1) + SK * 0.4, top + 3.5);
          ctx.stroke();
          if (fl > 0) {
            ctx.fillStyle = 'rgba(255,255,255,' + (fl * 0.75).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(x + SK, top); ctx.lineTo(x + w + SK, top); ctx.lineTo(x + w, top + TH + SH); ctx.lineTo(x, top + TH + SH);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  }

  // --- igloo -----------------------------------------------------------------------------
  var IGLOO_BLOCKS = (function () {
    var out = [], courses = [5, 4, 3, 2, 1], ch = IG.ry / 5;
    for (var c = 0; c < 5; c++) {
      var yb = IG.base - c * ch, yt = yb - ch;
      var hw = IG.rx * Math.sqrt(1 - Math.pow(c / 5, 2)) + 1;
      var n = courses[c], bw = (hw * 2) / n;
      for (var k = 0; k < n; k++) out.push({ x: IG.cx - hw + k * bw, y: yt, w: bw, h: ch });
    }
    return out;
  })();
  function blockCenter(k) {
    if (k >= IGLOO_BLOCKS.length) return { x: IG.cx, y: IG.base - 7 };
    var b = IGLOO_BLOCKS[k];
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawIgloo(game, t) {
    var done = igShown >= C.IGLOO_BLOCKS;
    // shadow and a ghost of the finished dome
    ctx.fillStyle = 'rgba(40,70,110,0.16)';
    ctx.beginPath(); ctx.ellipse(IG.cx + 3, IG.base + 1.5, IG.rx + 6, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgb(Pc.grout, 0.35);
    ctx.setLineDash([2, 2.5]);
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.ellipse(IG.cx, IG.base, IG.rx + 1, IG.ry, 0, Math.PI, TAU); ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(IG.cx, IG.base + 0.01, IG.rx + 1, IG.ry, 0, Math.PI, TAU);
    ctx.closePath();
    ctx.clip();
    var bg = ctx.createLinearGradient(0, IG.base - IG.ry, 0, IG.base);
    bg.addColorStop(0, P.block);
    bg.addColorStop(1, P.block2);
    for (var k = 0; k < Math.min(igShown, IGLOO_BLOCKS.length); k++) {
      var b = IGLOO_BLOCKS[k];
      var age = landed[k] !== undefined ? clamp((t - landed[k]) / 0.28, 0, 1) : 1;
      var sq = age < 1 ? 1 + Math.sin(age * Math.PI) * 0.12 : 1;
      var bh = b.h / sq, by = b.y + (b.h - bh);
      ctx.fillStyle = bg;
      roundRect(b.x + 0.45, by + 0.45, b.w - 0.9, bh - 0.9, 1.2);
      ctx.fill();
      ctx.strokeStyle = P.grout;
      ctx.lineWidth = 0.55;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(b.x + 1.4, by + 0.9, b.w - 2.8, 0.6);
      if (age < 1) {
        ctx.fillStyle = 'rgba(255,255,255,' + (1 - age).toFixed(3) + ')';
        roundRect(b.x + 0.45, by + 0.45, b.w - 0.9, bh - 0.9, 1.2);
        ctx.fill();
      }
    }
    ctx.restore();

    if (done) {
      var age2 = doorAt >= 0 ? clamp((t - doorAt) / 0.5, 0, 1) : 1;
      var dw = 6 * easeOut(age2), dh = 13 * easeOut(age2);
      var glow = 0.75 + 0.25 * Math.sin(t * 3.1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var lg = ctx.createRadialGradient(IG.cx, IG.base, 1, IG.cx, IG.base + 2, 34);
      lg.addColorStop(0, 'rgba(255,170,80,' + (0.32 * glow * (0.5 + nightMix * 0.8)).toFixed(3) + ')');
      lg.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(IG.cx - 40, IG.base - 30, 80, 46);
      ctx.restore();
      var dg = ctx.createLinearGradient(0, IG.base - dh, 0, IG.base);
      dg.addColorStop(0, '#2a1408');
      dg.addColorStop(1, 'rgba(255,' + (150 + 40 * glow | 0) + ',70,1)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.moveTo(IG.cx - dw, IG.base);
      ctx.lineTo(IG.cx - dw, IG.base - dh + dw);
      ctx.arc(IG.cx, IG.base - dh + dw, dw, Math.PI, TAU);
      ctx.lineTo(IG.cx + dw, IG.base);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = P.grout;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // --- characters ---------------------------------------------------------------------
  var SKIN = hex('#f3c39d'), PARKA = hex('#e4572e'), PARKA_D = hex('#a93518'), FUR = hex('#f6ecda'),
    PANTS = hex('#28365e'), BOOT = hex('#3b2618'), MITT = hex('#24315a'), ICE = hex('#bfe8ff');

  function drawBuilder(b, game, t, alpha) {
    var fx = X(b.x + C.BAILEY_W / 2), fy = Y(b.y);
    if (b.row >= 0 && !b.air && b.state === 'ok') fy += rowBob(b.row, t);
    var frozen = b.frozen || 0;
    var col = function (c) { return frozen > 0 ? rgb(mixc(c, ICE, frozen * 0.75)) : rgb(c); };
    var moving = b.moving || (game.state === 'dying' && game.death && game.death.cause === 'bear' && game.death.t > 10);
    var ph = b.walk * 0.42;
    var swing = moving && !b.air ? Math.sin(ph) * 0.6 : 0;
    var bob = moving && !b.air ? Math.abs(Math.cos(ph)) * 0.8 : 0;
    var air = b.air;
    var sinkY = b.state === 'drown' ? Y(b.sink) : 0;

    ctx.save();
    if (b.state === 'drown') {
      ctx.beginPath();
      ctx.rect(fx - 20, fy - 50, 40, 50);
      ctx.clip();
    }
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    // shadow
    if (!air && b.state !== 'drown') {
      ctx.fillStyle = 'rgba(10,30,60,0.25)';
      ctx.beginPath(); ctx.ellipse(fx, fy + 0.4, 7, 1.6, 0, 0, TAU); ctx.fill();
    }
    ctx.translate(fx, fy + sinkY - bob);
    var k = 0.92;
    ctx.scale(b.face < 0 ? -k : k, k);

    // legs
    var legL = air ? -0.9 : swing, legR = air ? 0.7 : -swing;
    function leg(a, back) {
      ctx.save();
      ctx.translate(back ? -1.6 : 1.6, -9);
      ctx.rotate(a);
      ctx.fillStyle = col(back ? mixc(PANTS, [0, 0, 0], 0.25) : PANTS);
      roundRect(-1.9, 0, 3.8, 6.4, 1.4); ctx.fill();
      ctx.fillStyle = col(BOOT);
      roundRect(-2.2, 5.4, 5.4, 3, 1.3); ctx.fill();
      ctx.restore();
    }
    leg(legR, true);
    // back arm
    function arm(a, back) {
      ctx.save();
      ctx.translate(back ? -4.6 : 4.4, -16.5);
      ctx.rotate(a);
      ctx.fillStyle = col(back ? PARKA_D : PARKA);
      roundRect(-1.7, 0, 3.4, 7, 1.5); ctx.fill();
      ctx.fillStyle = col(MITT);
      ctx.beginPath(); ctx.arc(0, 7.4, 1.9, 0, TAU); ctx.fill();
      ctx.restore();
    }
    var armA = air ? -2.5 : -swing * 0.9, armB = air ? 2.6 : swing * 0.9;
    arm(armB, true);
    // body
    var bodyG = ctx.createLinearGradient(-6, 0, 6, 0);
    bodyG.addColorStop(0, col(PARKA));
    bodyG.addColorStop(1, col(PARKA_D));
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(-5, -18.5);
    ctx.quadraticCurveTo(0, -20, 5, -18.5);
    ctx.lineTo(6.6, -8.5);
    ctx.lineTo(-6.6, -8.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col(FUR);
    for (var i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 1.9, -8.6, 1.35, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = col(PARKA_D);
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(1, -18); ctx.lineTo(1.3, -10); ctx.stroke();
    leg(legL, false);
    arm(armA, false);
    // head: hood, fur ring, face
    ctx.fillStyle = col(PARKA);
    ctx.beginPath(); ctx.arc(0, -22.5, 6.2, 0, TAU); ctx.fill();
    ctx.fillStyle = col(FUR);
    ctx.beginPath(); ctx.arc(1.2, -22.2, 4.7, 0, TAU); ctx.fill();
    ctx.fillStyle = col(SKIN);
    ctx.beginPath(); ctx.arc(1.6, -22, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb([30, 24, 30]);
    var blink = (Math.floor(t * 0.7 + 0.3) % 5 === 0 && (t * 0.7 % 1) < 0.12) || frozen > 0.9;
    if (blink) { ctx.fillRect(1.6, -22.6, 1.2, 0.35); ctx.fillRect(3.5, -22.6, 1.1, 0.35); }
    else { ctx.fillRect(1.8, -23.2, 0.8, 1.1); ctx.fillRect(3.7, -23.2, 0.8, 1.1); }
    ctx.fillStyle = 'rgba(240,110,110,0.75)';
    ctx.beginPath(); ctx.arc(4.4, -21, 0.75, 0, TAU); ctx.fill();
    ctx.restore();

    if (frozen > 0) {
      // Encased in a block of ice, from the boots up.
      var h = 28 * frozen;
      ctx.save();
      ctx.fillStyle = 'rgba(170,225,255,' + (0.45 * frozen).toFixed(3) + ')';
      roundRect(fx - 8, fy - h, 16, h + 1, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(235,250,255,' + (0.8 * frozen).toFixed(3) + ')';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 5, fy - h + 3); ctx.lineTo(fx - 2, fy - h + 9);
      ctx.moveTo(fx + 4, fy - h + 2); ctx.lineTo(fx + 5.5, fy - h + 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  var BEAR = hex('#4a3a30'), BEAR_D = hex('#2a201b'), BEAR_L = hex('#7c6553');
  function drawBear(game, t) {
    var bear = game.bear;
    var chasing = game.state === 'dying' && game.death && game.death.cause === 'bear';
    if (!bear.active && !chasing) return;
    var fx = X(bear.x + C.BEAR_W / 2), fy = Y(C.BEAR_FEET);
    var ph = bear.walk * 0.32, mv = bear.moving ? 1 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(10,30,60,0.22)';
    ctx.beginPath(); ctx.ellipse(fx, fy + 0.5, 15, 2.2, 0, 0, TAU); ctx.fill();
    ctx.translate(fx, fy - Math.abs(Math.sin(ph)) * 0.8 * mv);
    ctx.scale(bear.dir < 0 ? -1 : 1, 1);
    function leg(x, a, dark) {
      ctx.save();
      ctx.translate(x, -7);
      ctx.rotate(a);
      ctx.fillStyle = rgb(dark ? BEAR_D : BEAR);
      roundRect(-2.2, 0, 4.4, 7.4, 1.8); ctx.fill();
      ctx.fillStyle = rgb(BEAR_D);
      roundRect(-2.6, 5.6, 5.4, 2, 1); ctx.fill();
      ctx.restore();
    }
    var s = Math.sin(ph) * 0.5 * mv;
    leg(-8, -s, true); leg(6, s, true);
    // body
    var bg = ctx.createLinearGradient(0, -16, 0, -4);
    bg.addColorStop(0, rgb(BEAR_L));
    bg.addColorStop(1, rgb(BEAR));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(-1, -10, 13, 6.6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-4, -13.5, 7, 4.2, -0.15, 0, TAU);
    ctx.fill();
    // frosted back
    ctx.fillStyle = 'rgba(240,248,255,0.45)';
    for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-10 + i * 3.4, -15.2 + Math.sin(i * 1.7) * 0.8, 0.9, 0, TAU); ctx.fill(); }
    leg(-5, s, false); leg(9, -s, false);
    // head
    ctx.fillStyle = rgb(BEAR);
    ctx.beginPath(); ctx.arc(11, -13, 4.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(9.4, -17, 1.7, 0, TAU); ctx.arc(13, -17.3, 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(BEAR_L);
    ctx.beginPath(); ctx.ellipse(15, -11.8, 3.2, 2.2, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(17.6, -12.3, 0.95, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(12.6, -14.2, 0.75, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(12.7, -14.6, 0.35, 0.35);
    if (chasing) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(14.5, -10.2); ctx.lineTo(18, -10.4); ctx.lineTo(16.5, -9.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawCritter(kind, x, by, dir, t, seed) {
    ctx.save();
    ctx.translate(x, by);
    ctx.scale(dir < 0 ? -1 : 1, 1);
    var ph = t * 9 + seed;
    if (kind !== 'goose') {
      ctx.strokeStyle = 'rgba(220,245,255,0.35)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(0, 0.6, 9 + Math.sin(ph * 0.5) * 0.8, 1.4, 0, 0, TAU); ctx.stroke();
    }
    if (kind === 'goose') {
      var fly = Math.sin(ph * 0.9);
      ctx.translate(0, -3.5 + Math.sin(ph * 0.45) * 0.6);
      ctx.fillStyle = 'rgba(0,20,40,0.2)';
      ctx.beginPath(); ctx.ellipse(0, 4.4, 6, 1, 0, 0, TAU); ctx.fill();
      // far wing
      ctx.fillStyle = '#c9d6e3';
      ctx.beginPath(); ctx.moveTo(-1, -1.5); ctx.lineTo(-5, -1.5 - fly * 5); ctx.lineTo(2, -1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(-0.5, 0, 6.2, 2.9, -0.08, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -0.3); ctx.lineTo(-9, -1.6); ctx.lineTo(-8.4, 1); ctx.closePath(); ctx.fill();
      // neck and head
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4.2, -0.8); ctx.quadraticCurveTo(6.5, -3, 6.8, -5.2); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(7.3, -5.6, 1.7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff9a6b';
      ctx.beginPath(); ctx.moveTo(8.6, -6); ctx.lineTo(11.2, -5.3); ctx.lineTo(8.6, -4.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillRect(7.6, -6.3, 0.7, 0.7);
      // near wing with black tips
      ctx.fillStyle = '#f2f6fa';
      ctx.beginPath(); ctx.moveTo(-2, -1); ctx.quadraticCurveTo(-3, -3 - fly * 6, -7.5, -2 - fly * 6.5); ctx.lineTo(2.5, -0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#20242c';
      ctx.beginPath(); ctx.moveTo(-7.5, -2 - fly * 6.5); ctx.lineTo(-5, -1.6 - fly * 5); ctx.lineTo(-5.8, -0.8 - fly * 4.6); ctx.closePath(); ctx.fill();
    } else if (kind === 'crab') {
      var sn = (Math.sin(ph * 0.6) + 1) * 0.5;
      ctx.translate(0, -2.6);
      ctx.strokeStyle = '#b8381b'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
      for (var l = 0; l < 3; l++) {
        var lk = Math.sin(ph + l * 1.4) * 0.8;
        ctx.beginPath(); ctx.moveTo(-3 + l * 1.4, 1.5); ctx.lineTo(-6 + l * 1.2, 3.2 + lk); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(1 + l * 1.4, 1.5); ctx.lineTo(4 + l * 1.6, 3.2 - lk); ctx.stroke();
      }
      var cg = ctx.createLinearGradient(0, -3, 0, 3);
      cg.addColorStop(0, '#ff8a5c'); cg.addColorStop(1, '#d23f1d');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(0, 0, 6.4, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,200,0.6)';
      ctx.beginPath(); ctx.arc(-2, -1.4, 0.6, 0, TAU); ctx.arc(0.6, -1.9, 0.5, 0, TAU); ctx.arc(2.6, -1.2, 0.5, 0, TAU); ctx.fill();
      // claws
      [[-7.6, -2.2], [7.6, -2.2]].forEach(function (c) {
        ctx.fillStyle = '#e8532a';
        ctx.beginPath(); ctx.arc(c[0], c[1], 2.1, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f7a07a';
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + (c[0] > 0 ? 2.8 : -2.8), c[1] - 1.8 - sn * 1.5); ctx.lineTo(c[0] + (c[0] > 0 ? 2.2 : -2.2), c[1] - 0.3); ctx.closePath(); ctx.fill();
      });
      ctx.strokeStyle = '#d23f1d';
      ctx.beginPath(); ctx.moveTo(-1.5, -3); ctx.lineTo(-1.8, -5); ctx.moveTo(1.5, -3); ctx.lineTo(1.8, -5); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-1.8, -5.3, 0.95, 0, TAU); ctx.arc(1.8, -5.3, 0.95, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(-1.6, -5.6, 0.6, 0.6); ctx.fillRect(2, -5.6, 0.6, 0.6);
    } else if (kind === 'clam') {
      var open = (Math.sin(ph * 0.35) + 1) * 0.5;
      ctx.translate(0, -2);
      ctx.fillStyle = '#ff7f9c';
      ctx.beginPath(); ctx.ellipse(0, -0.4, 6, 1.6 + open * 2, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      for (var tt = -4; tt <= 4; tt += 2) {
        ctx.beginPath(); ctx.moveTo(tt - 0.8, -0.3); ctx.lineTo(tt, -1.4 - open); ctx.lineTo(tt + 0.8, -0.3); ctx.closePath(); ctx.fill();
      }
      var sg = ctx.createLinearGradient(0, -1, 0, 3);
      sg.addColorStop(0, '#ffd866'); sg.addColorStop(1, '#c48b16');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI); ctx.fill();
      ctx.save();
      ctx.translate(-6.6, 0);
      ctx.rotate(-open * 0.55);
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.ellipse(6.6, 0, 7, 3.2, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(130,85,10,0.6)'; ctx.lineWidth = 0.45;
      for (var rr = -2; rr <= 2; rr++) { ctx.beginPath(); ctx.moveTo(6.6, -0.2); ctx.lineTo(6.6 + rr * 2.4, -2.9 + Math.abs(rr) * 0.5); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(130,85,10,0.6)'; ctx.lineWidth = 0.45;
      for (var r2 = -2; r2 <= 2; r2++) { ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.lineTo(r2 * 2.4, 2.8 - Math.abs(r2) * 0.4); ctx.stroke(); }
    } else {
      var wig = Math.sin(ph * 1.2);
      ctx.translate(0, -2.6 + Math.sin(ph * 0.4) * 0.9);
      var fg = ctx.createLinearGradient(0, -3, 0, 3);
      fg.addColorStop(0, '#7af2b8'); fg.addColorStop(1, '#16936a');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-9, -3 + wig); ctx.lineTo(-8.4, 0); ctx.lineTo(-9, 3 + wig); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 6.4, 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -2.6); ctx.lineTo(1.5, -4.6); ctx.lineTo(2.5, -2.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3.6, -0.6, 1.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(3.9, -0.6, 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(-0.5, -1.2, 3, 0.6, 0, 0, TAU); ctx.fill();
      // bonus glitter
      ctx.globalCompositeOperation = 'lighter';
      var gl = (Math.sin(ph * 0.7) + 1) * 0.5;
      ctx.fillStyle = 'rgba(255,255,200,' + (0.35 + gl * 0.5).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(1, -7 - gl); ctx.lineTo(1.5, -5.5); ctx.lineTo(3, -5); ctx.lineTo(1.5, -4.5); ctx.lineTo(1, -3); ctx.lineTo(0.5, -4.5); ctx.lineTo(-1, -5); ctx.lineTo(0.5, -5.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawCritters(game, t) {
    for (var i = 0; i < game.critters.length; i++) {
      var f = game.critters[i];
      var by = Y(Core.feetY(f.row));
      for (var m = 0; m < f.n; m++) {
        if (!f.alive[m]) continue;
        var gx = f.x + m * C.FLOCK_GAP + C.CRITTER_W / 2;
        drawCritter(f.kind, X(gx), by, f.vx, t, m * 1.3 + i);
      }
    }
  }

  // --- particles ------------------------------------------------------------------------
  function stepParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    }
    for (var k = popups.length - 1; k >= 0; k--) {
      popups[k].t += dt;
      if (popups[k].t > 1.1) popups.splice(k, 1);
    }
  }
  function drawParticles() {
    ctx.save();
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i], a = clamp(p.life / p.max, 0, 1);
      if (p.add) ctx.globalCompositeOperation = 'lighter';
      else ctx.globalCompositeOperation = 'source-over';
      if (p.ring) {
        var rr = p.r + (1 - a) * p.grow;
        ctx.strokeStyle = 'rgba(' + p.c + ',' + (a * p.a).toFixed(3) + ')';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.3, 0, 0, TAU); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(' + p.c + ',' + (a * p.a).toFixed(3) + ')';
        var sz = p.size * (p.shrink ? a : 1);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.2, sz), 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (var k = 0; k < popups.length; k++) {
      var q = popups[k], al = clamp(1.2 - q.t, 0, 1);
      ctx.font = '800 ' + q.size + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,15,35,' + (al * 0.5).toFixed(3) + ')';
      ctx.fillText(q.text, q.x + 0.5, q.y - q.t * 14 + 0.6);
      ctx.fillStyle = q.color;
      ctx.globalAlpha = al;
      ctx.fillText(q.text, q.x, q.y - q.t * 14);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function splash(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 20 + Math.random() * 45;
      spawn({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 140, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 0.6 + Math.random() * 0.9, c: color || '220,240,255', a: 0.9, shrink: true });
    }
    for (var k = 0; k < 3; k++) spawn({ x: x, y: y, vx: 0, vy: 0, life: 0.9 + k * 0.25, max: 0.9 + k * 0.25, r: 2, grow: 12 + k * 6, ring: true, c: '220,240,255', a: 0.7 });
  }
  function puff(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.PI + Math.random() * Math.PI, v = 8 + Math.random() * 18;
      spawn({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.35, g: 4, drag: 2, life: 0.45 + Math.random() * 0.35, max: 0.8, size: 0.8 + Math.random() * 1.2, c: color || '255,255,255', a: 0.85, shrink: true });
    }
  }
  function sparkle(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, v = 10 + Math.random() * 34;
      spawn({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 20, drag: 1.5, life: 0.5 + Math.random() * 0.5, max: 1, size: 0.5 + Math.random() * 0.8, c: color || '255,250,220', a: 1, add: true, shrink: true });
    }
  }

  // --- snow, frost, edge fade, HUD ---------------------------------------------------------
  function drawSnow(dt, t) {
    var w = view.x1 - view.x0, h = view.y1 - view.y0;
    ctx.fillStyle = nightMix > 0.5 ? 'rgba(200,220,255,0.75)' : 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    for (var i = 0; i < FLAKES.length; i++) {
      var f = FLAKES[i];
      if (!reduceMotion) {
        f.y += (f.v * dt) / h;
        f.x += (Math.sin(t * f.sp + f.sw) * 4 + 3) * dt / w;
        if (f.y > 1) { f.y -= 1; f.x = Math.random(); }
        if (f.x > 1) f.x -= 1;
      }
      var x = view.x0 + f.x * w, y = view.y0 + f.y * h;
      ctx.moveTo(x + f.r, y);
      ctx.arc(x, y, f.r * 0.6, 0, TAU);
    }
    ctx.fill();
  }

  var FONT = '"Avenir Next", "Nunito", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
  function glassPanel(x, y, w, h) {
    ctx.fillStyle = 'rgba(6,18,38,0.42)';
    roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  function drawHud(game, t) {
    var p = game.player();
    var temp = game.temp, cold = 1 - temp / C.TEMP_START;
    // thermometer
    glassPanel(6, 5, 70, 21);
    var warm = mixc(hex('#ff6b3d'), hex('#ffd36b'), clamp(cold * 2, 0, 1));
    var tc = cold > 0.5 ? mixc(hex('#ffd36b'), hex('#5ad1ff'), clamp((cold - 0.5) * 2, 0, 1)) : warm;
    var danger = temp <= 10 && game.state === 'play';
    var pulse = danger ? 0.5 + 0.5 * Math.sin(t * 10) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(13, 9, 3.6, 11, 1.8); ctx.fill();
    ctx.beginPath(); ctx.arc(14.8, 20.5, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(tc);
    var fillH = 10 * clamp(temp / C.TEMP_START, 0, 1);
    ctx.fillRect(13.8, 20 - fillH, 2, fillH + 0.5);
    ctx.beginPath(); ctx.arc(14.8, 20.5, 2.4, 0, TAU); ctx.fill();
    ctx.font = '800 13px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = danger ? rgb(mixc([255, 255, 255], [255, 90, 90], pulse)) : '#ffffff';
    ctx.fillText(Math.max(0, temp) + '°', 22, 16);
    ctx.font = '700 5px ' + FONT;
    ctx.fillStyle = 'rgba(220,235,255,0.75)';
    ctx.fillText('TEMP', 50, 12.2);
    ctx.fillText(game.night ? 'NIGHT' : 'DAY', 50, 19.5);

    // score
    ctx.textAlign = 'center';
    ctx.font = '900 16px ' + FONT;
    ctx.fillStyle = 'rgba(0,20,45,0.45)';
    ctx.fillText(String(p.score), 160.6, 15.8);
    ctx.fillStyle = game.cur === 1 ? '#ffe28a' : '#ffffff';
    ctx.fillText(String(p.score), 160, 15);
    if (game.players.length > 1) {
      ctx.font = '800 5.5px ' + FONT;
      ctx.fillStyle = 'rgba(220,235,255,0.85)';
      ctx.fillText('PLAYER ' + (game.cur + 1), 160, 4.5);
    }

    // reserves and level
    glassPanel(244, 5, 70, 21);
    ctx.textAlign = 'left';
    var n = Math.min(p.reserves, 9);
    for (var i = 0; i < Math.min(n, 5); i++) {
      var hx = 251 + i * 7.2, hy = 13;
      ctx.fillStyle = rgb(PARKA);
      ctx.beginPath(); ctx.arc(hx, hy, 2.9, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(FUR);
      ctx.beginPath(); ctx.arc(hx + 0.4, hy + 0.1, 2.1, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(SKIN);
      ctx.beginPath(); ctx.arc(hx + 0.6, hy + 0.2, 1.5, 0, TAU); ctx.fill();
    }
    ctx.font = '800 6px ' + FONT;
    ctx.fillStyle = '#ffffff';
    if (n > 5) ctx.fillText('+' + (n - 5), 251 + 5 * 7.2 - 2, 13.4);
    if (n === 0) { ctx.fillStyle = 'rgba(220,235,255,0.6)'; ctx.fillText('LAST BUILDER', 250, 13.4); }
    ctx.font = '700 5px ' + FONT;
    ctx.fillStyle = 'rgba(220,235,255,0.8)';
    ctx.fillText('LEVEL ' + p.level, 250, 21.4);
    var bl = Math.min(p.blocks, C.IGLOO_BLOCKS);
    ctx.textAlign = 'right';
    ctx.fillText(bl + '/' + C.IGLOO_BLOCKS, 309, 21.4);
    ctx.textBaseline = 'alphabetic';
  }

  function drawHints(game, t) {
    if (game.state !== 'play' || !game.iglooComplete()) return;
    var b = game.bailey;
    var bounce = Math.sin(t * 6) * 1.5;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 7px ' + FONT;
    var a = 0.75 + 0.25 * Math.sin(t * 6);
    ctx.fillStyle = 'rgba(255,214,120,' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(IG.cx, IG.base - IG.ry - 3 + bounce);
    ctx.lineTo(IG.cx - 4, IG.base - IG.ry - 8 + bounce);
    ctx.lineTo(IG.cx + 4, IG.base - IG.ry - 8 + bounce);
    ctx.closePath();
    ctx.fill();
    if (b.row < 0 && !b.air) {
      var under = game.underIgloo();
      var label = under ? '▲ GO IN' : 'WALK UNDER THE IGLOO', lx = X(b.x + 4), ly = Y(b.y) - 31 + bounce * 0.5;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(6,24,50,0.85)';
      ctx.strokeText(label, lx, ly);
      ctx.fillStyle = 'rgba(255,226,150,' + a.toFixed(3) + ')';
      ctx.fillText(label, lx, ly);
    }
    ctx.restore();
  }

  function drawEdges() {
    // Soften the sides of the play area on wide screens.
    var fade = 22;
    if (view.x0 < 0) {
      var gl = ctx.createLinearGradient(-fade, 0, 0, 0);
      gl.addColorStop(0, 'rgba(2,10,26,0.42)');
      gl.addColorStop(1, 'rgba(2,10,26,0)');
      ctx.fillStyle = 'rgba(2,10,26,0.42)';
      ctx.fillRect(view.x0, view.y0, -fade - view.x0, view.y1 - view.y0);
      ctx.fillStyle = gl;
      ctx.fillRect(-fade, view.y0, fade, view.y1 - view.y0);
    }
    if (view.x1 > WW) {
      var gr = ctx.createLinearGradient(WW, 0, WW + fade, 0);
      gr.addColorStop(0, 'rgba(2,10,26,0)');
      gr.addColorStop(1, 'rgba(2,10,26,0.42)');
      ctx.fillStyle = gr;
      ctx.fillRect(WW, view.y0, fade, view.y1 - view.y0);
      ctx.fillStyle = 'rgba(2,10,26,0.42)';
      ctx.fillRect(WW + fade, view.y0, view.x1 - WW - fade, view.y1 - view.y0);
    }
  }

  // --- reacting to the simulation ------------------------------------------------------------
  function onEvents(events, game) {
    var b = game.bailey, now = clock;
    for (var i = 0; i < events.length; i++) {
      var e = events[i], d = e.data;
      switch (e.type) {
        case 'land':
          if (d.white) {
            rowFlash[d.row] = 1;
            popup('+' + 10 * Core.scoreLevel(game.level), X(b.x + 4), Y(b.y) - 26, '#ffffff', 8);
            sparkle(X(b.x + 4), Y(b.y), 10, '200,235,255');
          }
          puff(X(b.x + 4), Y(b.y) + 1, 6, '230,245,255');
          break;
        case 'shore': puff(X(b.x + 4), Y(b.y) + 0.5, 8); break;
        case 'block': {
          var k = d.blocks - 1;
          var to = blockCenter(k);
          flyers.push({ k: k, x0: X(b.x + 4), y0: Y(b.y) - 6, x1: to.x, y1: to.y, t0: now, dur: 0.55 });
          igTarget = d.blocks;
          break;
        }
        case 'reverse':
          for (var r2 = 0; r2 < 8; r2++) spawn({ x: X(b.x + 4) + (Math.random() - 0.5) * 16, y: Y(b.y) + 3, vx: -game.rows[d.row].dir * (20 + Math.random() * 30), vy: -Math.random() * 10, g: 40, life: 0.5, max: 0.5, size: 0.8, c: '230,245,255', a: 0.9, shrink: true });
          if (!game.iglooComplete()) shatterBlock(d.blocks);
          igTarget = d.blocks;
          break;
        case 'whiten':
          for (var r = 0; r < 4; r++) rowFlash[r] = 0.8;
          break;
        case 'igloo': banner('IGLOO BUILT — HEAD FOR SHORE', 'gold', 2600); break;
        case 'fish':
          popup('+' + C.FISH_POINTS, X(d.x + 4), Y(d.y) - 12, '#9dffcf', 9);
          sparkle(X(d.x + 4), Y(d.y) - 3, 16, '170,255,210');
          break;
        case 'push': puff(X(b.x + 4), Y(b.y) - 6, 4); break;
        case 'drown':
          splash(X(d.x + 4), Y(d.y), 26);
          shake = 3;
          banner('SPLASH!', 'cool', 1400);
          break;
        case 'freeze':
          freezeFlash = 1;
          banner('FROZEN SOLID', 'cool', 1800);
          break;
        case 'bear':
          shake = 5;
          banner('CHASED OFF BY THE GRIZZLY', 'hot', 1800);
          break;
        case 'inside':
          popup('+' + d.bonus, IG.cx, IG.base - IG.ry - 6, '#ffd36b', 11);
          sparkle(IG.cx, IG.base - 6, 34, '255,220,150');
          banner('IGLOO BONUS +' + d.bonus, 'gold', 2200);
          break;
        case 'tally':
          popup('+' + 10 * Core.scoreLevel(game.level), 40, 34, '#ffd36b', 6);
          break;
        case 'life': banner('BONUS BUILDER!', 'gold', 2000); sparkle(285, 14, 18, '255,220,150'); break;
        case 'level':
          igReset = true;
          banner('LEVEL ' + d.level + ' · ' + (d.night ? 'NIGHT SHIFT' : 'DAY SHIFT'), d.night ? 'cool' : 'gold', 2400);
          break;
        case 'start':
          igReset = true;
          banner('LEVEL ' + game.level + ' · ' + (game.night ? 'NIGHT SHIFT' : 'DAY SHIFT'), 'gold', 2000);
          break;
        case 'switch':
          igReset = true;
          banner('PLAYER ' + d.player + ' — YOUR TURN', 'gold', 2200);
          break;
        case 'respawn': igReset = true; break;
        case 'select': igReset = true; break;
      }
    }
  }

  function shatterBlock(k) {
    var c = blockCenter(k);
    for (var i = flyers.length - 1; i >= 0; i--) if (flyers[i].k >= k) flyers.splice(i, 1);
    if (k < igShown) {
      igShown = k;
      for (var n = 0; n < 12; n++) {
        var a = Math.random() * TAU, v = 15 + Math.random() * 30;
        spawn({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, g: 120, life: 0.6, max: 0.6, size: 0.7 + Math.random() * 0.8, c: '240,250,255', a: 1, shrink: true });
      }
    }
  }

  function stepIgloo(game, t, dt) {
    var n = Math.min(game.player().blocks, C.IGLOO_BLOCKS);
    if (igReset) {
      igReset = false;
      flyers.length = 0;
      igShown = igTarget = n;
      landed = [];
      doorAt = -1;
      return;
    }
    if (n < igShown) { igShown = n; }
    for (var i = flyers.length - 1; i >= 0; i--) {
      var f = flyers[i];
      if (t - f.t0 >= f.dur) {
        flyers.splice(i, 1);
        if (f.k + 1 > igShown) igShown = f.k + 1;
        landed[f.k] = t;
        if (f.k >= C.IGLOO_BLOCKS - 1) { doorAt = t; sparkle(IG.cx, IG.base - 6, 30, '255,220,150'); }
        else sparkle(f.x1, f.y1, 6, '255,255,255');
        if (audio.place) audio.place(f.k);
      }
    }
    if (!flyers.length && igShown < n) igShown = n;
  }

  function drawFlyers(t) {
    for (var i = 0; i < flyers.length; i++) {
      var f = flyers[i], k = clamp((t - f.t0) / f.dur, 0, 1), e = easeOut(k);
      var x = lerp(f.x0, f.x1, e), y = lerp(f.y0, f.y1, e) - Math.sin(k * Math.PI) * 26;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, 'rgba(200,240,255,0.65)');
      g.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 9, y - 9, 18, 18);
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      roundRect(x - 4, y - 2.6, 8, 5.2, 1.2);
      ctx.fill();
      ctx.strokeStyle = '#9fc6e4';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      if (Math.random() < 0.6) spawn({ x: x, y: y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 0.35, max: 0.35, size: 0.7, c: '220,245,255', a: 0.9, add: true, shrink: true });
    }
  }

  // --- the frame ---------------------------------------------------------------------------
  function render(game, info) {
    var now = info.now / 1000;
    var first = !lastNow;
    var dt = lastNow ? Math.min(0.05, now - lastNow) : 0.016;
    lastNow = now;
    if (!info.paused) clock += dt;
    var t = clock;
    // Day fades into night on the wall clock, and a page that opens on a night level starts dark.
    var target = game.night ? 1 : 0;
    nightMix = first ? target : nightMix + (target - nightMix) * Math.min(1, dt * 1.4);
    palette(nightMix);
    for (var r = 0; r < 4; r++) {
      rowBlue[r] = first ? (game.rows[r].blue ? 1 : 0) : rowBlue[r] + ((game.rows[r].blue ? 1 : 0) - rowBlue[r]) * Math.min(1, dt * 10);
      rowFlash[r] = Math.max(0, rowFlash[r] - dt * 3.2);
    }
    if (info.paused) dt = 0;
    stepIgloo(game, t, dt);
    stepParticles(dt);
    var b = game.bailey;

    // Drowning bubbles and freeze crystals.
    if (game.state === 'dying' && game.death) {
      if (game.death.cause === 'drown' && Math.random() < 0.35 && !info.paused) {
        spawn({ x: X(b.x + 4) + (Math.random() - 0.5) * 8, y: Y(b.y) + 3, vx: 0, vy: -10 - Math.random() * 10, life: 0.4, max: 0.4, size: 0.6 + Math.random() * 0.7, c: '210,240,255', a: 0.8 });
      }
      if (game.death.cause === 'freeze' && Math.random() < 0.4 && !info.paused) sparkle(X(b.x + 4) + (Math.random() - 0.5) * 14, Y(b.y) - Math.random() * 24, 1, '200,240,255');
    }
    // Breath in the cold.
    if (game.state === 'play' && !b.air && !info.paused && Math.random() < dt * 0.9) {
      var bx = X(b.x + 4) + (b.face > 0 ? 6 : -6), by = Y(b.y) - 25;
      for (var q = 0; q < 3; q++) spawn({ x: bx, y: by, vx: b.face * (6 + Math.random() * 6), vy: -2 - Math.random() * 3, drag: 1.2, life: 0.9, max: 0.9, size: 1 + Math.random() * 0.8, c: '255,255,255', a: 0.45, shrink: false });
    }

    shake = Math.max(0, shake - dt * 10);
    freezeFlash = Math.max(0, freezeFlash - dt * 0.9);
    var shx = shake > 0 && !reduceMotion ? (Math.random() - 0.5) * shake : 0;
    var shy = shake > 0 && !reduceMotion ? (Math.random() - 0.5) * shake : 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    worldTransform(shx, shy);
    drawSky(t);
    drawShore(t);
    drawWater(t);
    drawIgloo(game, t);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, view.y0, WW, view.y1 - view.y0);
    ctx.clip();
    drawBear(game, t);
    var onShore = b.visible && b.row < 0 && !b.air;
    if (onShore) drawBuilder(b, game, t, b.state === 'enter' ? clamp((b.y - C.IGLOO_BASE - 2) / 10, 0, 1) : 1);
    drawFloes(game, t);
    drawCritters(game, t);
    if (b.visible && !onShore) drawBuilder(b, game, t);
    ctx.restore();

    drawFlyers(t);
    drawParticles();
    drawSnow(dt, t);
    drawEdges();
    drawHints(game, t);
    drawHud(game, t);

    // Frost creeps in as the temperature drops.
    var cold = game.state === 'play' || game.state === 'dying' ? clamp((14 - game.temp) / 14, 0, 1) : 0;
    var frost = Math.max(cold * 0.75, game.state === 'dying' && game.death && game.death.cause === 'freeze' ? 0.95 : 0, freezeFlash);
    if (frost > 0.01 && frostCanvas) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = frost;
      ctx.drawImage(frostCanvas, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  // --- audio ----------------------------------------------------------------------------------
  var audio = (function () {
    var ac = null, master = null, wet = null, noise = null, wind = null;
    var muted = false, paused = false;
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
      master.gain.value = muted ? 0 : 0.8;
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);
      var len = ac.sampleRate * 2;
      noise = ac.createBuffer(1, len, ac.sampleRate);
      var data = noise.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      // A small hall for the chimes.
      var irLen = Math.round(ac.sampleRate * 1.6);
      var ir = ac.createBuffer(2, irLen, ac.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = ir.getChannelData(ch);
        for (var j = 0; j < irLen; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / irLen, 2.6);
      }
      var conv = ac.createConvolver();
      conv.buffer = ir;
      wet = ac.createGain();
      wet.gain.value = 0.28;
      wet.connect(conv);
      conv.connect(master);
      // Arctic wind.
      var src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
      var wg = ac.createGain(); wg.gain.value = 0;
      src.connect(bp); bp.connect(wg); wg.connect(master);
      src.start();
      wind = { bp: bp, g: wg };
    }
    function setMuted(m) {
      muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.03);
    }
    function setPaused(p) { paused = p; }
    function update(game, isPaused) {
      if (!wind) return;
      var t = ac.currentTime;
      var lvl = isPaused ? 0.012 : (game.state === 'title' || game.state === 'over' ? 0.03 : 0.045) * (1 + nightMix * 0.5);
      lvl *= 0.75 + 0.25 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1);
      wind.g.gain.setTargetAtTime(lvl, t, 0.3);
      wind.bp.frequency.setTargetAtTime(380 + 160 * Math.sin(t * 0.21) + 90 * Math.sin(t * 0.77), t, 0.3);
    }
    function tone(o) {
      var t = ac.currentTime + (o.delay || 0);
      var osc = ac.createOscillator(); osc.type = o.type || 'triangle';
      osc.frequency.setValueAtTime(o.f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g); g.connect(master);
      if (o.wet) g.connect(wet);
      osc.start(t); osc.stop(t + o.dur + 0.05);
    }
    function burst(o) {
      var t = ac.currentTime + (o.delay || 0);
      var src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
      var f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f0, t);
      f.frequency.exponentialRampToValueAtTime(o.f1 || o.f0, t + o.dur);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f); f.connect(g); g.connect(master);
      if (o.wet) g.connect(wet);
      src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05);
    }
    function notes(seq, type, gain, step, wetOn) {
      for (var i = 0; i < seq.length; i++) {
        if (seq[i]) tone({ f: seq[i], dur: step * 2.2, gain: gain, type: type, delay: i * step, wet: wetOn });
      }
    }
    function chime(f, gain, delay) {
      tone({ f: f, dur: 0.9, gain: gain, type: 'sine', delay: delay, wet: true });
      tone({ f: f * 2.76, dur: 0.35, gain: gain * 0.35, type: 'sine', delay: delay, wet: true });
    }
    function place(k) {
      if (!ac || paused) return;
      tone({ f: 170, to: 90, dur: 0.12, gain: 0.22, type: 'sine' });
      chime(784 * Math.pow(2, (k % 8) / 12), 0.07, 0.02);
    }
    function onEvents(events) {
      if (!ac || !master || paused) return;
      for (var i = 0; i < events.length; i++) {
        var e = events[i], d = e.data;
        switch (e.type) {
          case 'jump':
            tone({ f: 330, to: 760, dur: 0.16, gain: 0.12, type: 'sine' });
            burst({ f0: 1800, f1: 3800, dur: 0.12, gain: 0.03, q: 0.8 });
            break;
          case 'land':
            burst({ type: 'lowpass', f0: 900, f1: 200, dur: 0.12, gain: 0.16, q: 0.6 });
            if (d.white) { chime(1318.5, 0.1, 0); chime(1975.5, 0.06, 0.05); }
            else tone({ f: 640, dur: 0.12, gain: 0.05, type: 'triangle' });
            break;
          case 'shore': burst({ type: 'lowpass', f0: 600, f1: 150, dur: 0.14, gain: 0.14 }); break;
          case 'whiten': notes([1046.5, 1318.5, 1568, 2093], 'sine', 0.06, 0.05, true); break;
          case 'igloo':
            notes([523.25, 659.25, 783.99, 1046.5], 'triangle', 0.12, 0.11, true);
            notes([261.63, 329.63, 392], 'sine', 0.1, 0.0, true);
            break;
          case 'reverse':
            burst({ f0: 400, f1: 2600, dur: 0.28, gain: 0.1, q: 1.4 });
            tone({ f: 520, to: 260, dur: 0.22, gain: 0.07, type: 'triangle' });
            break;
          case 'deny': tone({ f: 140, dur: 0.18, gain: 0.12, type: 'square' }); break;
          case 'push':
            burst({ type: 'lowpass', f0: 500, dur: 0.1, gain: 0.14 });
            tone({ f: 900, to: 600, dur: 0.09, gain: 0.04, type: 'square' });
            break;
          case 'fish': notes([880, 1174.7, 1568, 2349.3], 'sine', 0.09, 0.05, true); break;
          case 'drown':
            burst({ type: 'lowpass', f0: 4000, f1: 300, dur: 0.7, gain: 0.35, q: 0.7 });
            for (var b = 0; b < 6; b++) tone({ f: 300 + Math.random() * 400, to: 900 + Math.random() * 600, dur: 0.08, gain: 0.05, type: 'sine', delay: 0.15 + b * 0.09 });
            notes([392, 349.23, 311.13, 261.63], 'triangle', 0.08, 0.16, true);
            break;
          case 'freeze':
            for (var c = 0; c < 10; c++) burst({ type: 'highpass', f0: 3000 + Math.random() * 3000, dur: 0.05, gain: 0.08, delay: c * 0.07 });
            notes([1567.98, 1318.5, 1046.5, 783.99, 659.25, 523.25], 'sine', 0.07, 0.14, true);
            break;
          case 'bear':
            tone({ f: 90, to: 55, dur: 0.8, gain: 0.25, type: 'sawtooth' });
            burst({ type: 'lowpass', f0: 600, f1: 150, dur: 0.8, gain: 0.2, q: 2 });
            break;
          case 'enter': notes([523.25, 659.25, 783.99], 'triangle', 0.08, 0.08, true); break;
          case 'inside':
            notes([523.25, 659.25, 783.99, 1046.5, 1318.5], 'triangle', 0.12, 0.1, true);
            notes([130.81, 196, 261.63], 'sine', 0.12, 0.0, true);
            break;
          case 'tally': tone({ f: 1500 + (d.temp % 8) * 60, dur: 0.05, gain: 0.05, type: 'sine' }); break;
          case 'level':
          case 'start':
            notes([392, 523.25, 659.25, 783.99, 0, 659.25, 783.99], 'triangle', 0.09, 0.1, true);
            break;
          case 'life': notes([783.99, 987.77, 1174.66, 1567.98, 1975.5, 2349.3], 'sine', 0.09, 0.07, true); break;
          case 'temp': if (d.temp <= 9 && d.temp > 0) tone({ f: 2100, dur: 0.04, gain: 0.05, type: 'square' }); break;
          case 'gameover':
            notes([392, 349.23, 311.13, 261.63], 'triangle', 0.14, 0.24, true);
            notes([196, 174.61, 155.56, 130.81], 'sine', 0.1, 0.24, true);
            break;
          case 'select': tone({ f: 880, dur: 0.06, gain: 0.06, type: 'sine' }); break;
        }
      }
    }
    return { unlock: unlock, setMuted: setMuted, setPaused: setPaused, update: update, onEvents: onEvents, place: place, get muted() { return muted; } };
  })();

  // --- page wiring ------------------------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var bannerEl = $('banner'), bannerTimer = 0;
  function banner(text, tone, ms) {
    // Above the picture when there is room (phones held upright), else on the snow.
    var top = view.oy > 120 ? view.oy - 46 : view.oy + (SKY_Y + 20) * view.s;
    bannerEl.style.top = Math.round(top) + 'px';
    bannerEl.textContent = text;
    bannerEl.className = 'show ' + (tone || '');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { bannerEl.className = tone || ''; }, ms || 2200);
  }
  var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var modeBtns = document.querySelectorAll('[data-mode]');

  function onUi(s) {
    var g = s.game;
    $('title').classList.toggle('show', s.state === 'title');
    $('over').classList.toggle('show', s.state === 'over');
    $('paused').classList.toggle('show', s.paused);
    $('pause').textContent = s.paused ? 'RESUME' : 'PAUSE';
    $('pause').disabled = s.state === 'title' || s.state === 'over';
    $('mute').textContent = s.muted ? 'UNMUTE' : 'MUTE';
    $('mute').setAttribute('aria-pressed', s.muted ? 'true' : 'false');
    Array.prototype.forEach.call(modeBtns, function (b) {
      b.classList.toggle('on', Number(b.getAttribute('data-mode')) === g.mode);
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-mode')) === g.mode ? 'true' : 'false');
    });
    $('modeLabel').textContent = s.modeLabel;
    var best = s.best;
    var bestText = best.score ? 'BEST ' + best.score + ' · LEVEL ' + best.level : '';
    $('bestTitle').textContent = bestText;
    if (s.state === 'over') {
      var top = 0;
      g.players.forEach(function (p) { top = Math.max(top, p.score); });
      $('overScore').textContent = g.players.length > 1 ? g.players.map(function (p) { return p.score; }).join(' / ') : String(top);
      $('overLevel').textContent = String(Math.max.apply(null, g.players.map(function (p) { return p.level; })));
      $('overBest').textContent = best.score ? String(best.score) : '—';
      $('overRecord').textContent = best.score && top >= best.score && top > 0 ? 'NEW BEST!' : '';
    }
  }

  var shell = window.FrostbiteShell.boot({
    version: 'remastered',
    canvas: canvas,
    render: render,
    audio: audio,
    touchRoot: $('touch'),
    muteButton: $('mute'),
    pauseButton: $('pause'),
    selectButton: $('select'),
    onUi: onUi,
    onEvents: function (events, game) {
      onEvents(events, game);
      for (var k = 0; k < events.length; k++) {
        var t = events[k].type;
        if (t === 'gameover' || t === 'start' || t === 'select') shell.refresh();
      }
    }
  });
  Array.prototype.forEach.call(modeBtns, function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      shell.select(Number(b.getAttribute('data-mode')));
      b.blur();
    });
  });
  ['pause', 'mute', 'select'].forEach(function (id) {
    $(id).addEventListener('click', function () { $(id).blur(); });
  });
  if (touch) document.body.classList.add('touch');
})();
