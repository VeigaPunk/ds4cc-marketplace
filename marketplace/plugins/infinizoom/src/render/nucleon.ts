// A nucleon (proton) — 1.7 fm. Three valence quarks in a churning gluon field,
// color charge sloshing between them; a sea of transient quark pairs sparkles.
import { sph, cyl, kid, type Ctx, type Mod } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as quark } from "./quark";

const K = {
  quark: { at: { pos: [0.15, -0.1, 0.08] as const, scale: 0.06 }, mod: () => quark },
};

export const spec = {
  id: "nucleon", name: "proton", size: 1.7e-15,
  kids: K, dive: "quark" as const,
  approach: { dir: [0.55, 0.55, 0.6] as const, up: [0, 1, 0] as const },
};

const QCOL = [0xff5a5a, 0x5aff6a, 0x5a7aff];                             // color charge r/g/b

export const render = (c: Ctx) => {
  // valence quarks: two up, one down — the dived one sits at its layout spot
  const qp = (i: number): [number, number, number] => {
    if (i === 2) return [0.15, -0.1, 0.08];                              // == K.quark.at.pos (the dive)
    const a = c.time * 1.2 + i * 2.1;
    return [Math.cos(a) * 0.22, Math.sin(a * 1.3) * 0.2, Math.sin(a) * 0.18];
  };
  for (let i = 0; i < 3; i++) {
    if (i === 2) continue;                                               // quark module renders the dived one
    const [x, y, z] = qp(i);
    const col = QCOL[Math.floor((c.time * 1.5 + i * 1.1) % 3)];          // color charge swaps
    sph(c, x, y, z, 0.07, col);
    sph(c, x, y, z, 0.13, col, { glow: true, fade: 0.25 });
  }
  // gluon flux tubes between the three quarks, waving
  for (let i = 0; i < 3; i++) {
    const [ax, ay, az] = qp(i), [bx, by, bz] = qp((i + 1) % 3);
    for (let s = 0; s < 8; s++) {
      const t2 = (s + 0.5) / 8, w = Math.sin(t2 * Math.PI) * 0.03 * Math.sin(c.time * 6 + i * 2 + s);
      sph(c, ax + (bx - ax) * t2 + w, ay + (by - ay) * t2 - w, az + (bz - az) * t2, 0.028, 0xffdf80, { glow: true, fade: 0.3 });
    }
  }
  // sea quarks popping in and out
  for (let i = 0; i < 24; i++) {
    const ph = (c.time * 1.8 + hashf(i * 7.7) * 5) % 1;
    if (ph > 0.35) continue;
    const x = (hashf(i * 3.1) - 0.5) * 0.7, y = (hashf(i * 5.9) - 0.5) * 0.7, z = (hashf(i * 9.3) - 0.5) * 0.7;
    sph(c, x, y, z, 0.02, QCOL[i % 3], { glow: true, fade: Math.sin(ph / 0.35 * Math.PI) * 0.7 });
  }
  sph(c, 0, 0, 0, 0.85, 0xffb060, { glow: true, fade: 0.07 });           // confinement aura

  const q = kid(c, K.quark.at, quark);
  if (q) quark.render(q);
};
export const mod: Mod = { spec, render };
