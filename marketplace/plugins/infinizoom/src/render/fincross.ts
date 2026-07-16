// Material cross-section inside the fin — 10 nm: high-k metal gate, the ~1 nm
// gate-oxide skin, doped silicon body speckled with dopant atoms, and below it
// the perfect crystal begins.
import { box, sph, kid, pierce, type Ctx, type Mod } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as lattice } from "./lattice";

const K = {
  lattice: { at: { pos: [0, -0.15, 0] as const, scale: 0.22 }, mod: () => lattice },
};

export const spec = {
  id: "fincross", name: "inside the fin", size: 1e-8,
  kids: K, dive: "lattice" as const,
  approach: { dir: [0.5, 0.55, 0.7] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  // layered stack, top → down: gate metal, work-function metal, high-k, oxide, silicon
  box(c, 0, 0.44, 0, 1.0, 0.14, 0.5, 0x8a93a0);                           // gate metal (W fill)
  box(c, 0, 0.345, 0, 1.0, 0.05, 0.5, 0x6a7686);                          // TiN work-function
  box(c, 0, 0.305, 0, 1.0, 0.03, 0.5, 0x7a5a8a);                          // HfO₂ high-k
  box(c, 0, 0.283, 0, 1.0, 0.014, 0.5, 0xb0a880);                         // SiO₂ interfacial oxide
  box(c, 0, -0.11, 0, 1.0, 0.77, 0.5, 0x54463c, { fade: pierce(c, 0.72, 0.92) }); // silicon body — pierced to the crystal
  // dopant atoms scattered in the channel region — two species, occasional ionization flash
  const siSh = pierce(c, 0.72, 0.92);
  for (let i = 0; i < 56; i++) {
    const x = (hashf(i * 3.3) - 0.5) * 0.94, y = 0.24 - hashf(i * 7.1) * 0.5, z = (hashf(i * 11.7) - 0.5) * 0.44;
    const col = i % 2 ? 0xdd7a3a : 0x8a44cc;                              // donor (orange) vs acceptor (violet)
    sph(c, x, y, z, 0.028, col);
    sph(c, x, y, z, 0.05, col, { glow: true, fade: 0.18 });
    const flash = hashf(i * 5.5 + Math.floor(c.time * 0.6));
    if (flash > 0.985) {
      const ph = (c.time * 0.6) % 1;
      sph(c, x, y, z, 0.09, 0xffffff, { glow: true, fade: 0.35 * Math.sin(ph * Math.PI) ** 2 });
    }
  }
  // atomic roughness at each layer interface — rows of tiny spheres along the boundary
  for (const iy of [0.37, 0.32, 0.29, 0.276]) {
    for (let s = 0; s < 16; s++) {
      const x = -0.47 + s * (0.94 / 15);
      const jy = (hashf(s * 4.4 + iy * 17.3) - 0.5) * 0.012;
      const jz = (hashf(s * 6.6 + iy * 9.1) - 0.5) * 0.4;
      sph(c, x, iy + jy, jz, 0.016, 0xe8e2c8);
    }
  }
  // strained-lattice hint: rows shear progressively toward the SiGe stressors
  for (const side of [-1, 1]) for (let r = 0; r < 4; r++) {
    const rowShear = side * r * 0.014;
    for (let s = 0; s < 8; s++) {
      const bx = side * (0.36 + s * 0.014) + rowShear, by = 0.18 - r * 0.09, bz = -0.18 + s * 0.05;
      sph(c, bx, by, bz, 0.018, 0x6a9a6a);
    }
  }
  // faint lattice hint rows deeper down (refined by the lattice level itself)
  for (let r = 0; r < 6; r++) for (let s = 0; s < 12; s++)
    sph(c, -0.45 + s * 0.082, -0.28 - r * 0.04, 0.05 + Math.sin(s * 2 + r) * 0.03, 0.022, 0x6a5a48);
  // strain arrows shimmering in the channel (SiGe stressors beside)
  box(c, -0.52, 0.1, 0, 0.08, 0.3, 0.46, 0x4a6a4a);
  box(c, 0.52, 0.1, 0, 0.08, 0.3, 0.46, 0x4a6a4a);
  // phonon ripple: a subtle animated brightness wave crossing the silicon body
  for (let i = 0; i < 5; i++) {
    const zc = -0.2 + i * 0.1, wave = Math.sin(c.time * 3 - i * 1.1) * 0.5 + 0.5;
    box(c, 0, -0.11, zc, 0.94, 0.7, 0.03, 0xffe9c8, { glow: true, fade: (0.08 + 0.22 * wave) * siSh });
  }

  const l = kid(c, K.lattice.at, lattice);
  if (l) lattice.render(l);
};
export const mod: Mod = { spec, render };
