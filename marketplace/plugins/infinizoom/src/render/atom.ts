// The atom — 1.1 Å. Shared by both routes (silicon's lattice and the emitter
// molecule both converge here). Orbiting electrons, layered probability-cloud
// shells that keep the long dive to the femtometer nucleus filled with structure.
import { sph, kid, aa, rotV, type Ctx, type Mod } from "../core/ctx";
import { mod as nucleus } from "./nucleus";

const K = {
  nucleus: { at: { pos: [0, 0, 0] as const, scale: 9.1e-5 }, mod: () => nucleus },
};

export const spec = {
  id: "atom", name: "atom", size: 1.1e-10,
  kids: K, dive: "nucleus" as const,
  approach: { dir: [0.55, 0.6, 0.58] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  // electron shells: 3 orbit rings at tilted planes, electrons racing along them
  for (let s = 0; s < 3; s++) {
    const R = [0.48, 0.3, 0.14][s];
    const q = aa(1, 0.4 * s, 0.3, 0.5 + s * 0.9);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const p = rotV(q, [Math.cos(a) * R, Math.sin(a) * R, 0]);
      // ring drawn as beads (keeps it a strictly-finer refinement at any range)
      sph(c, p[0], p[1], p[2], 0.006, 0x557a99, { glow: true, fade: 0.3 });
    }
    const ne = [2, 4, 4][s];
    for (let e = 0; e < ne; e++) {
      const a = c.time * (2.2 - s * 0.5) + (e / ne) * Math.PI * 2;
      const p = rotV(q, [Math.cos(a) * R, Math.sin(a) * R, 0]);
      sph(c, p[0], p[1], p[2], 0.03, 0x7fd0ff, { glow: true });
      sph(c, p[0], p[1], p[2], 0.014, 0xeaffff);
    }
  }
  // nested probability-cloud shells — they fill the 4-decade fall to the nucleus
  for (let s = 0; s < 10; s++) {
    const R = 0.5 * Math.pow(0.38, s);
    if (R * c.f < 0.002) break;
    sph(c, 0, 0, 0, R, s % 2 ? 0x2a4a66 : 0x33395e, { glow: true, fade: 0.16 + 0.025 * s });
    // speckle of virtual flashes on each shell
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4 + c.time * (0.4 + s * 0.2), b = i * 1.7 + s;
      sph(c, Math.cos(a) * Math.sin(b) * R * 0.9, Math.sin(a) * Math.sin(b) * R * 0.9, Math.cos(b) * R * 0.9,
        R * 0.05, 0x88bbee, { glow: true, fade: 0.25 * (0.5 + 0.5 * Math.sin(c.time * 3 + i + s)) });
    }
  }
  // the nucleus glow, growing as we fall in
  sph(c, 0, 0, 0, 0.002, 0xffd070, { glow: true, fade: 0.6 + 0.3 * Math.sin(c.time * 5) });

  const n = kid(c, K.nucleus.at, nucleus);
  if (n) nucleus.render(n);
};
export const mod: Mod = { spec, render };
