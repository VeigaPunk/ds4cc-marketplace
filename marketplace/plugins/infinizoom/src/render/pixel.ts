// One pixel — 0.3 mm. Its three sub-pixel LEDs, 1:1 with the image: each lit by
// the ACTUAL live channel value of this exact screen pixel, changing as the video plays.
import { box, cyl, kid, local, smooth, type Ctx, type Mod } from "../core/ctx";
import { samplePixel, DIVE_PX } from "../core/screenimg";
import { mod as subpixel } from "./subpixel";

const K = {
  subpixel: { at: { pos: [0, -0.02, 0.01] as const, scale: 0.32 }, mod: () => subpixel },
};

export const spec = {
  id: "pixel", name: "one pixel", size: 3e-4,
  kids: K, dive: "subpixel" as const,
  approach: { dir: [0.42, 0.5, 0.78] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const u = local(c);
  const f = smooth(-0.55, -0.05, u) * (1 - smooth(0.6, 0.92, u));
  if (f >= 0.02) {
    const [r, g, b] = samplePixel(DIVE_PX.x, DIVE_PX.y);
    box(c, 0, 0, -0.02, 1.35, 1.35, 0.012, 0x05070a, { fade: f });        // pixel backplane
    for (const [ox, col, v, isDive] of [[-0.31, 0xff2211, r, 0], [0, 0x22ff33, g, 1], [0.31, 0x2233ff, b, 0]] as const) {
      // the G LED center is the dive — its own module renders it once close
      const df = isDive ? 1 - smooth(0.5, 0.85, u) : 1;
      box(c, ox, -0.02, -0.008, 0.24, 0.7, 0.014, 0x191c23, { fade: f * df });          // bank/PDL well
      box(c, ox, -0.02, 0.002, 0.19, 0.62, 0.004, col, { glow: true, fade: f * v * df }); // the emitter
      box(c, ox, -0.02, 0.008, 0.21, 0.65, 0.0015, 0x3c4652, { glow: true, fade: f * 0.25 * df }); // cathode sheen
      cyl(c, ox, 0.38, -0.006, 0.05, 0.008, 0x5c636e, { fade: f });                     // drive contact
      box(c, ox, 0.32, -0.01, 0.1, 0.06, 0.006, 0x3a414c, { fade: f });                 // TFT island
    }
    // black matrix grid + routing
    box(c, 0, -0.475, -0.014, 1.3, 0.05, 0.004, 0x30363f, { fade: f });   // scan line
    box(c, -0.475, 0, -0.015, 0.05, 1.3, 0.004, 0x2a3039, { fade: f });   // data line
    box(c, 0.475, 0, -0.015, 0.05, 1.3, 0.004, 0x2a3039, { fade: f });
  }
  const s = kid(c, K.subpixel.at, subpixel);
  if (s) subpixel.render(s);
};
export const mod: Mod = { spec, render };
