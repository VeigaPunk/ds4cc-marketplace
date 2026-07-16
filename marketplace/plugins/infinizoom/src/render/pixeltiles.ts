// Pixel tiles — a 2 mm patch, ~6.6 pixels across: pixels resolve into R/G/B
// sub-stripes whose brightnesses are the live channel values of the image.
import { box, kid, local, smooth, type Ctx, type Mod } from "../core/ctx";
import { samplePixel, DIVE_PX } from "../core/screenimg";
import { mod as pixelblock } from "./pixelblock";

const W = 6.6;
const K = {
  pixelblock: { at: { pos: [0, 0, 0.003] as const, scale: 0.303 }, mod: () => pixelblock },
};

export const spec = {
  id: "pixeltiles", name: "pixel tiles", size: 2e-3,
  kids: K, dive: "pixelblock" as const,
  approach: { dir: [0.45, 0.42, 0.8] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const u = local(c);
  const on = smooth(-0.55, -0.05, u);
  const off = 1 - smooth(0.55, 0.9, u);
  const f = on * off;
  if (f >= 0.02) {
    box(c, 0, 0, -0.003, 3.4, 3.4, 0.002, 0x06080b, { fade: on });
    const px = 1 / W;
    for (let gy = -11; gy <= 11; gy++) for (let gx = -11; gx <= 11; gx++) {
      const x = gx * px, y = gy * px;
      const [r, g, b] = samplePixel(DIVE_PX.x + gx, DIVE_PX.y - gy);
      // three vertical emitter stripes per pixel + black matrix between
      for (const [ox, col, v] of [[-0.3, 0xff2211, r], [0, 0x22ff33, g], [0.3, 0x2233ff, b]] as const) {
        box(c, x + ox * px, y, 0.0, px * 0.2, px * 0.78, 0.0008, col, { glow: true, fade: f * v });
        box(c, x + ox * px, y, -0.0012, px * 0.24, px * 0.84, 0.0006, 0x14161c, { fade: f * 0.9 });
      }
    }
  }
  const p = kid(c, K.pixelblock.at, pixelblock);
  if (p) pixelblock.render(p);
};
export const mod: Mod = { spec, render };
