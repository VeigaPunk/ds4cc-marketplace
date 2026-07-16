// The green sub-pixel LED — 100 µm frame. The full OLED stack, alive: the TFT
// drives it with the pixel's real channel value; electrons drift down, holes
// drift up, they recombine in the emission layer with a flash, photons fly out.
import { box, sph, cyl, kid, local, smooth, pierce, type Ctx, type Mod } from "../core/ctx";
import { samplePixel, DIVE_PX } from "../core/screenimg";
import { hashf } from "../core/logic";
import { mod as emissive } from "./emissive";

const K = {
  emissive: { at: { pos: [0, 0, 0.02] as const, scale: 0.02 }, mod: () => emissive },
};

export const spec = {
  id: "subpixel", name: "sub-pixel LED · OLED stack", size: 1e-4,
  kids: K, dive: "emissive" as const,
  approach: { dir: [0.4, 0.45, 0.85] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const u = local(c);
  const v = samplePixel(DIVE_PX.x, DIVE_PX.y)[1];                        // live green drive level
  // stack (top +z → bottom), pierced from above on the dive
  const topF = pierce(c, -0.2, 0.35);                                    // encapsulation/cathode fade early
  box(c, 0, 0, 0.44, 1.3, 1.5, 0.1, 0x2c3644, { glow: true, fade: 0.3 * topF }); // thin-film encapsulation (glassy)
  box(c, 0, 0, 0.3, 1.05, 1.35, 0.035, 0x707a88, { fade: topF });        // semi-transparent cathode
  box(c, 0, 0, 0.34, 1.05, 1.35, 0.01, 0x9aa8b8, { glow: true, fade: 0.2 * topF }); // its sheen
  const etlF = pierce(c, 0.1, 0.5);
  box(c, 0, 0, 0.2, 1.0, 1.3, 0.05, 0x3c4654, { fade: etlF });           // electron transport layer
  for (let i = 0; i < 60; i++)                                           // amorphous molecular grain on the layers
    sph(c, (hashf(i * 3.7) - 0.5) * 0.95, (hashf(i * 7.3) - 0.5) * 1.25, [0.228, -0.112, -0.168][i % 3],
      0.035 + hashf(i) * 0.03, [0x46505e, 0x54465a, 0x584a60][i % 3], { fade: i % 3 === 0 ? etlF : 1 });
  const emlF = pierce(c, 0.68, 0.92);                                    // the EML opens for the dive
  box(c, 0, 0, 0.02, 1.0, 1.3, 0.05, 0x1f4d2c, { fade: emlF });          // EMISSION layer (the dive)
  box(c, 0, 0, 0.02, 1.02, 1.32, 0.056, 0x33ff55, { glow: true, fade: 0.5 * v * Math.max(emlF, 0.25) }); // its glow
  box(c, 0, 0, -0.14, 1.0, 1.3, 0.05, 0x4a3c50);                         // hole transport layer
  box(c, 0, 0, -0.26, 1.05, 1.35, 0.04, 0xb9c2cc);                       // reflective anode
  // pixel-define spacers at the sides
  for (const sx of [-0.62, 0.62]) box(c, sx, 0, 0.1, 0.14, 1.5, 0.55, 0x14181e);
  // TFT drive circuit below: gate/data lines, storage capacitor, channel
  box(c, 0, -0.85, -0.42, 1.5, 0.09, 0.05, 0x39404a);                    // scan line
  box(c, -0.7, 0, -0.44, 0.09, 1.9, 0.05, 0x333a44);                     // data line
  box(c, 0.25, -0.55, -0.42, 0.45, 0.3, 0.04, 0x505866);                 // storage capacitor plates
  box(c, 0.25, -0.55, -0.36, 0.4, 0.26, 0.02, 0x69727e);
  box(c, -0.25, -0.6, -0.4, 0.3, 0.2, 0.05, 0x46403a);                   // TFT island
  cyl(c, -0.25, -0.3, -0.33, 0.07, 0.14, 0x8a8f98);                      // via up to the anode
  // live carriers — density follows the real drive level
  const n = Math.round(2 + v * 9);
  for (let i = 0; i < n; i++) {
    const ph = (c.time * 0.9 + hashf(i * 3.3)) % 1;
    const x = (hashf(i * 7.1) - 0.5) * 0.8, y = (hashf(i * 5.7) - 0.5) * 1.1;
    sph(c, x, y, 0.3 - ph * 0.26, 0.035, 0x7fb8ff, { glow: true, fade: 0.8 });          // electrons ↓
    sph(c, -x, y, -0.24 + ph * 0.24, 0.035, 0xffb37f, { glow: true, fade: 0.8 });       // holes ↑
    if (ph > 0.92) sph(c, x * 0.3, y, 0.02, 0.12, 0xccffcc, { glow: true, fade: 0.9 }); // recombination flash
    const ph2 = (c.time * 1.4 + hashf(i * 9.9)) % 1;
    sph(c, x * 0.5, y * 0.7, 0.06 + ph2 * 0.7, 0.02, 0xaaffbb, { glow: true, fade: 0.7 * (1 - ph2) }); // photons ↗
  }
  const e = kid(c, K.emissive.at, emissive);
  if (e) emissive.render(e);
};
export const mod: Mod = { spec, render };
