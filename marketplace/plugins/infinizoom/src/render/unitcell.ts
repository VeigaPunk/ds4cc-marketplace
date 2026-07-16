// One diamond-cubic unit cell — 0.543 nm. Eight corner atoms, six face atoms,
// four tetrahedral atoms, real bond topology. The dive enters a tetrahedral atom.
import { sph, cyl, kid, aa, type Ctx, type Mod, type V3 } from "../core/ctx";
import { mod as atom } from "./atom";

const K = {
  atom: { at: { pos: [0.25 - 0.5, 0.25 - 0.5, 0.25 - 0.5] as const, scale: 0.2 }, mod: () => atom },
};

export const spec = {
  id: "unitcell", name: "unit cell · 0.543 nm", size: 5.43e-10,
  kids: K, dive: "atom" as const,
  approach: { dir: [0.62, 0.5, 0.55] as const, up: [0, 1, 0] as const },
};

const F = (v: number) => v - 0.5; // fractional → centered
const SITES: { p: V3; tetra: boolean }[] = [];
for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) SITES.push({ p: [F(x), F(y), F(z)], tetra: false });
for (const [x, y, z] of [[0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], [0.5, 0.5, 1], [0.5, 1, 0.5], [1, 0.5, 0.5]]) SITES.push({ p: [F(x), F(y), F(z)], tetra: false });
for (const [x, y, z] of [[0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]]) SITES.push({ p: [F(x), F(y), F(z)], tetra: true });
const BONDS: [V3, V3][] = [];
for (const t of SITES.filter((s) => s.tetra))
  for (const s of SITES.filter((s) => !s.tetra)) {
    const d = Math.hypot(t.p[0] - s.p[0], t.p[1] - s.p[1], t.p[2] - s.p[2]);
    if (d < 0.45) BONDS.push([t.p, s.p]);
  }

export const render = (c: Ctx) => {
  // cell edges
  for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) {
    cyl(c, a, b, 0, 0.004, 1.0, 0x6a80a0, { q: aa(1, 0, 0, Math.PI / 2), glow: true, fade: 0.12 });
    cyl(c, a, 0, b, 0.004, 1.0, 0x6a80a0, { glow: true, fade: 0.12 });
    cyl(c, 0, a, b, 0.004, 1.0, 0x6a80a0, { q: aa(0, 0, 1, Math.PI / 2), glow: true, fade: 0.12 });
  }
  const jig = (i: number) => Math.sin(c.time * 7 + i * 3.1) * 0.008;
  SITES.forEach((s, i) => {
    const isDive = s.tetra && s.p[0] < 0 && s.p[1] < 0 && s.p[2] < 0;
    if (isDive) return;                                                   // the atom module renders the dived one
    sph(c, s.p[0] + jig(i), s.p[1] + jig(i + 9), s.p[2] + jig(i + 17), s.tetra ? 0.15 : 0.13, s.tetra ? 0xd0a868 : 0xb59a70);
    sph(c, s.p[0], s.p[1], s.p[2], s.tetra ? 0.2 : 0.17, 0xffd890, { glow: true, fade: 0.05 });
  });
  BONDS.forEach(([a, b], i) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    // quat rotating +y onto the bond axis
    const ax = dz, az = -dx, aw = len + dy;
    const n = Math.hypot(ax, az, aw) || 1;
    cyl(c, mx + jig(i), my, mz, 0.03, len - 0.24, 0x8a7a5c, { q: [ax / n, 0, az / n, aw / n] });
  });
  const a2 = kid(c, K.atom.at, atom);
  if (a2) atom.render(a2);
};
export const mod: Mod = { spec, render };
