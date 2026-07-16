// The emitter molecule — 2 nm: an Ir(ppy)₃-like phosphor. A heavy iridium heart
// with three ligand rings; it pulses green as it relaxes. The Ir atom is the dive —
// converging onto the same atomic tail as the silicon route.
import { sph, cyl, kid, aa, rotV, pierce, type Ctx, type Mod, type V3 } from "../core/ctx";
import { mod as atom } from "./atom";

const K = {
  atom: { at: { pos: [0, 0, 0] as const, scale: 0.055 }, mod: () => atom },
};

export const spec = {
  id: "molecule", name: "emitter molecule", size: 2e-9,
  kids: K, dive: "atom" as const,
  approach: { dir: [0.5, 0.55, 0.65] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const pulse = 0.5 + 0.5 * Math.sin(c.time * 2.6);
  // three phenylpyridine ligands around the (dived) iridium center
  for (let L = 0; L < 3; L++) {
    const qL = aa(0.3, 1, 0.2, (L / 3) * Math.PI * 2);
    // ring of 6 carbons + 1 nitrogen linking to Ir
    const ringC: V3 = rotV(qL, [0.32, 0.1, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = rotV(qL, [0.32 + Math.cos(a) * 0.13, 0.1 + Math.sin(a) * 0.13, Math.sin(a + L) * 0.02]);
      sph(c, p[0], p[1], p[2], 0.07, 0x3c4046);                          // carbon
      sph(c, p[0], p[1], p[2], 0.1, 0x66ff88, { glow: true, fade: 0.1 * pulse });
      // C–H hydrogens pointing outward
      const hgh = rotV(qL, [0.32 + Math.cos(a) * 0.21, 0.1 + Math.sin(a) * 0.21, Math.sin(a + L) * 0.03]);
      sph(c, hgh[0], hgh[1], hgh[2], 0.035, 0xd8dde4);
    }
    const nP = rotV(qL, [0.17, 0.02, 0]);
    sph(c, nP[0], nP[1], nP[2], 0.075, 0x4a5acc);                        // nitrogen
    // bond N–Ir
    const mid: V3 = [nP[0] / 2, nP[1] / 2, nP[2] / 2];
    const len = Math.hypot(...nP);
    const axn = Math.hypot(nP[2], -nP[0], len + nP[1]) || 1;
    cyl(c, mid[0], mid[1], mid[2], 0.025, len * 0.7, 0x7a828c, { q: [nP[2] / axn, 0, -nP[0] / axn, (len + nP[1]) / axn] });
    sph(c, ringC[0], ringC[1], ringC[2], 0.16, 0x88ffb0, { glow: true, fade: 0.12 * pulse });
  }
  // the iridium heart — dissolves as the shared atom module resolves inside it
  sph(c, 0, 0, 0, 0.13, 0xb8c4d4, { fade: pierce(c, 0.45, 0.8) });
  // the phosphorescent photon leaving, upward
  const ph = (c.time * 1.1) % 1;
  sph(c, 0.1, 0.1, 0.2 + ph * 1.6, 0.04, 0xbbffcc, { glow: true, fade: (1 - ph) * 0.8 });
  sph(c, 0, 0, 0, 0.5, 0x44aa66, { glow: true, fade: 0.1 + 0.12 * pulse });

  const a2 = kid(c, K.atom.at, atom);
  if (a2) atom.render(a2);
};
export const mod: Mod = { spec, render };
