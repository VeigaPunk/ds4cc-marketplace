// The display panel — a 20 mm patch, 66 pixels across, centered on the dive pixel
// inside the playing video. Every emitter shows the ACTUAL image pixel at its spot.
import { box, kid, local, smooth, type Ctx, type Mod } from "../core/ctx";
import { samplePixel, DIVE_PX } from "../core/screenimg";
import { mod as pixeltiles } from "./pixeltiles";

const W = 66; // pixels per frame unit-width
const K = {
  pixeltiles: { at: { pos: [0, 0, 0.004] as const, scale: 0.1 }, mod: () => pixeltiles },
};

export const spec = {
  id: "panel", name: "display panel", size: 0.02,
  kids: K, dive: "pixeltiles" as const,
  approach: { dir: [0.4, 0.48, 0.82] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const u = local(c);
  const on = smooth(-0.6, 0.0, u);                                       // LEDs take over from the quad
  const off = 1 - smooth(0.55, 0.9, u);                                  // …and hand off to the tiles level
  const f = on * off;
  if (f < 0.02) { const p0 = kid(c, K.pixeltiles.at, pixeltiles); if (p0) pixeltiles.render(p0); return; }
  // black matrix backplane behind the emitters
  box(c, 0, 0, -0.004, 3.6, 3.6, 0.004, 0x07090c, { fade: on });
  const px = 1 / W;
  // coarse 4-px emitters over the wide field, feathered out around the fine core
  for (let gy = -24; gy < 24; gy++) for (let gx = -24; gx < 24; gx++) {
    const x = (gx + 0.5) * 4 * px, y = (gy + 0.5) * 4 * px;
    const m = Math.max(Math.abs(x), Math.abs(y));
    if (m < 0.3) continue;
    const feather = smooth(0.3, 0.44, m);
    const [r, g, b] = samplePixel(DIVE_PX.x + x * W, DIVE_PX.y - y * W);
    box(c, x, y, 0.0, 4 * px * 0.92, 4 * px * 0.92, 0.001,
      ((r * 255) << 16) | ((g * 255) << 8) | (b * 255), { glow: true, fade: f * feather });
  }
  // fine 1-px emitters in the core — 1:1 with real screen pixels
  for (let gy = -23; gy <= 23; gy++) for (let gx = -23; gx <= 23; gx++) {
    const x = gx * px, y = gy * px;
    const [r, g, b] = samplePixel(DIVE_PX.x + gx, DIVE_PX.y - gy);
    box(c, x, y, 0.001, px * 0.86, px * 0.86, 0.0008,
      ((r * 255) << 16) | ((g * 255) << 8) | (b * 255), { glow: true, fade: f });
  }
  const p = kid(c, K.pixeltiles.at, pixeltiles);
  if (p) pixeltiles.render(p);
};
export const mod: Mod = { spec, render };
