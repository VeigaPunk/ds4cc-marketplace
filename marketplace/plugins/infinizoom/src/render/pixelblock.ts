// A pixel block — 0.6 mm, two pixels across: sub-pixels now have body — LED wells,
// TFT contact dots, routing between them. Colors remain the live channel values.
import { box, cyl, kid, local, smooth, type Ctx, type Mod } from "../core/ctx";
import { samplePixel, DIVE_PX } from "../core/screenimg";
import { mod as pixel } from "./pixel";

const W = 2;
const K = {
  pixel: { at: { pos: [0, 0, 0.004] as const, scale: 0.5 }, mod: () => pixel },
};

export const spec = {
  id: "pixelblock", name: "pixel block", size: 6e-4,
  kids: K, dive: "pixel" as const,
  approach: { dir: [0.5, 0.4, 0.78] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const u = local(c);
  const f = smooth(-0.55, -0.05, u) * (1 - smooth(0.55, 0.9, u));
  if (f >= 0.02) {
    box(c, 0, 0, -0.006, 3.2, 3.2, 0.004, 0x05070a, { fade: f });
    const px = 1 / W;
    for (let gy = -3; gy <= 3; gy++) for (let gx = -3; gx <= 3; gx++) {
      if (gx === 0 && gy === 0) continue;                                // the pixel module renders the dived one
      const x = gx * px, y = gy * px;
      const [r, g, b] = samplePixel(DIVE_PX.x + gx, DIVE_PX.y - gy);
      for (const [ox, col, v] of [[-0.3, 0xff2211, r], [0, 0x22ff33, g], [0.3, 0x2233ff, b]] as const) {
        box(c, x + ox * px, y - 0.04 * px, -0.002, px * 0.22, px * 0.66, 0.003, 0x1a1d24, { fade: f });         // LED well
        box(c, x + ox * px, y - 0.04 * px, 0.001, px * 0.17, px * 0.6, 0.0012, col, { glow: true, fade: f * v });
        cyl(c, x + ox * px, y + 0.4 * px, -0.001, px * 0.06, 0.003, 0x555c66, { fade: f });                     // TFT via
      }
      // scan/data routing between pixels
      box(c, x, y - 0.485 * px, -0.003, px * 0.96, px * 0.03, 0.001, 0x39404a, { fade: f });
      box(c, x - 0.485 * px, y, -0.0034, px * 0.03, px * 0.96, 0.001, 0x333a44, { fade: f });
    }
  }
  const p = kid(c, K.pixel.at, pixel);
  if (p) pixel.render(p);
};
export const mod: Mod = { spec, render };
