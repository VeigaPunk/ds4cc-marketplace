// The emissive layer — 2 µm patch of the organic film. An amorphous molecular
// sea that resolves, three decades down, into single emitter molecules.
import { sph, kid, local, smooth, type Ctx, type Mod } from "../core/ctx";
import { samplePixel, DIVE_PX } from "../core/screenimg";
import { hashf } from "../core/logic";
import { mod as molecule } from "./molecule";

const K = {
  molecule: { at: { pos: [0, 0, 0] as const, scale: 1e-3 }, mod: () => molecule },
};

export const spec = {
  id: "emissive", name: "emissive layer", size: 2e-6,
  kids: K, dive: "molecule" as const,
  approach: { dir: [0.45, 0.5, 0.75] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const v = samplePixel(DIVE_PX.x, DIVE_PX.y)[1];
  // hierarchical molecular sea: each ring of detail only exists near its own scale
  for (let lvl = 0; lvl < 6; lvl++) {
    const s = Math.pow(0.28, lvl);                                       // cluster size of this tier
    if (s * c.f < 0.003) break;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const seed = lvl * 100 + i;
      const x = (hashf(seed * 3.1) - 0.5) * 2.4 * s * 4;
      const y = (hashf(seed * 5.3) - 0.5) * 2.4 * s * 4;
      const z = (hashf(seed * 7.7) - 0.5) * 0.8 * s * 4;
      sph(c, x, y, z, s * 0.5, lvl % 2 ? 0x3d5a44 : 0x46523e);
      // phosphorescent excitation flashes, rate tied to the live drive level
      const ph = (c.time * (0.5 + v * 1.5) + hashf(seed * 11.3) * 7) % 1;
      if (ph < 0.12) sph(c, x, y, z, s * 0.8, 0x66ff88, { glow: true, fade: Math.sin(ph / 0.12 * Math.PI) * 0.8 });
    }
  }
  // ambient film glow
  sph(c, 0, 0, 0, 2.6, 0x224433, { glow: true, fade: 0.08 + v * 0.06 });
  const m = kid(c, K.molecule.at, molecule);
  if (m) molecule.render(m);
};
export const mod: Mod = { spec, render };
