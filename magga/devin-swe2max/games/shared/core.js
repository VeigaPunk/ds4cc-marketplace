/* games/shared/core.js — MAGA shared runtime helpers. Zero-dep classic script.
 * Namespaced localStorage, canvas letterbox fit, fixed-timestep loop,
 * canvas-space pointer mapping, hit-rect UI registry. */
(function (root) {
'use strict';

/* ---------- storage ---------- */
const PREFIX = 'maga:';
function save(game, key, val) {
  try { localStorage.setItem(PREFIX + game + ':' + key, JSON.stringify(val)); } catch (e) {}
}
function load(game, key, dflt) {
  try {
    const v = localStorage.getItem(PREFIX + game + ':' + key);
    return v === null ? dflt : JSON.parse(v);
  } catch (e) { return dflt; }
}

/* ---------- canvas fit / letterbox ----------
 * fitScale: largest scale that fits; integer ≥1, fractional <1 allowed
 * (uniform — never non-uniform stretch). Returns {scale, ox, oy, cssW, cssH}. */
function fitScale(stageW, stageH, vpW, vpH) {
  const s = vpW / stageW < vpH / stageH ? vpW / stageW : vpH / stageH;
  const scale = s >= 1 ? Math.floor(s) : s;
  const w = stageW * scale, h = stageH * scale;
  return { scale, ox: (vpW - w) / 2, oy: (vpH - h) / 2, cssW: w, cssH: h };
}
/* Size + place a canvas in the window. Call on resize. */
function fitCanvas(cv, stageW, stageH) {
  const vpW = window.innerWidth, vpH = window.innerHeight;
  const f = fitScale(stageW, stageH, vpW, vpH);
  cv.style.position = 'fixed';
  cv.style.width = f.cssW + 'px'; cv.style.height = f.cssH + 'px';
  cv.style.left = f.ox + 'px'; cv.style.top = f.oy + 'px';
  cv.style.imageRendering = 'pixelated';
  return f;
}
/* Map a client-space pointer event to canvas stage coordinates. */
function toStage(cv, stageW, stageH, e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * stageW / r.width, y: (e.clientY - r.top) * stageH / r.height };
}

/* ---------- fixed timestep loop ----------
 * step(dt) called at fixed Hz; render(alpha) once per rAF.
 * dt clamped against tab-switch jumps. */
function fixedLoop(hz, step, render) {
  const DT = 1 / hz;
  let acc = 0, last = performance.now(), raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    while (acc >= DT) { step(DT); acc -= DT; }
    render(Math.min(1, acc / DT));
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/* ---------- hit-rect UI registry (canvas buttons) ---------- */
function hitRects() {
  const list = [];
  return {
    add(id, x, y, w, h, fn) { list.push({ id, x, y, w, h, fn }); },
    clear() { list.length = 0; },
    tap(p) {
      for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { r.fn(p); return r.id; }
      }
      return null;
    },
    all() { return list; },
  };
}

/* ---------- keyboard ---------- */
function keyboard() {
  const down = new Set(), pressed = new Set();
  const onKey = e => {
    if (e.repeat) return;
    down.add(e.code); pressed.add(e.code);
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', e => down.delete(e.code));
  addEventListener('blur', () => down.clear());       // D-65 lesson
  return {
    isDown: c => down.has(c),
    wasPressed: c => pressed.has(c),
    endFrame: () => pressed.clear(),
    any: (...cs) => cs.some(c => down.has(c)),
    anyPressed: (...cs) => cs.some(c => pressed.has(c)),
    down,
  };
}

root.MAGA = { save, load, fitScale, fitCanvas, toStage, fixedLoop, hitRects, keyboard };
})(typeof globalThis !== 'undefined' ? globalThis : this);
