// The nucleus — 10 fm. A jiggling cluster of protons and neutrons bound by a
// flashing gluon field. One proton at the surface is the dive.
import { sph, cyl, kid, type Ctx, type Mod, type V3 } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as nucleon } from "./nucleon";

const K = {
  nucleon: { at: { pos: [0.12, 0.08, 0.05] as const, scale: 0.17 }, mod: () => nucleon },
};

export const spec = {
  id: "nucleus", name: "nucleus", size: 1e-14,
  kids: K, dive: "nucleon" as const,
  approach: { dir: [0.5, 0.62, 0.55] as const, up: [0, 1, 0] as const },
};

// 28 nucleons (silicon-28), packed deterministically on shells
const N: { p: V3; proton: boolean }[] = [];
for (let i = 0; i < 28; i++) {
  const g = i / 28, a = i * 2.399963, r = 0.34 * Math.sqrt(g);           // golden spiral ball
  const z = (g * 2 - 1) * 0.3;
  N.push({ p: [Math.cos(a) * r, Math.sin(a) * r, z], proton: i % 2 === 0 });
}

export const render = (c: Ctx) => {
  N.forEach((n, i) => {
    const isDive = i === 6;                                              // the dived proton spot
    const jx = Math.sin(c.time * 4 + i * 2.1) * 0.02, jy = Math.cos(c.time * 3.4 + i * 1.3) * 0.02, jz = Math.sin(c.time * 5.1 + i) * 0.02;
    if (isDive) return;                                                  // nucleon module renders that one
    sph(c, n.p[0] + jx, n.p[1] + jy, n.p[2] + jz, 0.17, n.proton ? 0xd06a5a : 0x7a8494);
    sph(c, n.p[0] + jx, n.p[1] + jy, n.p[2] + jz, 0.2, n.proton ? 0xff9070 : 0xa0b0c8, { glow: true, fade: 0.05 });
  });
  // the gluon field: flickering exchange flashes between near neighbours
  for (let i = 0; i < 20; i++) {
    const a = N[Math.floor(hashf(i * 3.7) * 28)], b = N[Math.floor(hashf(i * 9.1) * 28)];
    const ph = (c.time * 2.5 + hashf(i * 5.3) * 3) % 1;
    if (ph > 0.4) continue;
    const t2 = ph / 0.4;
    sph(c, a.p[0] + (b.p[0] - a.p[0]) * t2, a.p[1] + (b.p[1] - a.p[1]) * t2, a.p[2] + (b.p[2] - a.p[2]) * t2,
      0.05, 0xffe070, { glow: true, fade: 0.8 * Math.sin(t2 * Math.PI) });
  }
  sph(c, 0, 0, 0, 0.9, 0xff8a50, { glow: true, fade: 0.06 });            // binding aura

  const n2 = kid(c, K.nucleon.at, nucleon);
  if (n2) nucleon.render(n2);
};
export const mod: Mod = { spec, render };
