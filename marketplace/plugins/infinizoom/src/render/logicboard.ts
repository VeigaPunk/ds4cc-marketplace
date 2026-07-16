// The logic board — 0.17 m. Local frame: XY = board plane, +z up, +y toward hinge.
// Black PCB carpeted in passives, EMI shields, the S heat pipe over the M4.
import { box, cyl, kid, aa, pierce, smooth, local, type Ctx, type Mod } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as m4package } from "./m4package";

const K = {
  m4package: { at: { pos: [0, 0.05, 0.014] as const, scale: 0.26 }, mod: () => m4package },
};

export const spec = {
  id: "logicboard", name: "logic board", size: 0.17,
  kids: K, dive: "m4package" as const,
  approach: { dir: [0.45, 0.4, 0.8] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  box(c, 0, 0, 0, 1.0, 0.62, 0.02, 0x101418);                             // the PCB
  box(c, 0, 0, 0.0105, 0.98, 0.6, 0.001, 0x151a20);
  // carpet of passives — deterministic pseudo-random field, skipping the M4 zone
  for (let i = 0; i < 260; i++) {
    const x = (hashf(i * 3.1) - 0.5) * 0.94, y = (hashf(i * 7.7) - 0.5) * 0.56;
    if (Math.abs(x) < 0.17 && Math.abs(y - 0.05) < 0.17) continue;
    const s = 0.006 + hashf(i * 1.3) * 0.01;
    box(c, x, y, 0.013, s, s * 0.55, 0.004, [0x6b5a2a, 0x8a8d92, 0x3a3d42, 0xb8974a][i % 4], { q: aa(0, 0, 1, (i % 2) * Math.PI / 2) });
  }
  // EMI shields + secondary chips
  for (const [sx, sy, w, h] of [[-0.36, -0.14, 0.18, 0.14], [0.35, -0.1, 0.16, 0.18], [-0.33, 0.18, 0.14, 0.12], [0.33, 0.22, 0.12, 0.1]] as const) {
    box(c, sx, sy, 0.015, w, h, 0.008, 0x9ea3aa);
    box(c, sx, sy, 0.0195, w * 0.96, h * 0.96, 0.001, 0xb0b5bc);
  }
  for (const [sx, sy] of [[-0.15, -0.2], [0.12, -0.22], [0.22, 0.05]] as const) {
    box(c, sx, sy, 0.017, 0.07, 0.07, 0.006, 0x1c1e22);
    box(c, sx, sy, 0.021, 0.05, 0.05, 0.002, 0x2a2d33);
  }
  // board-to-board connectors along edges
  for (let i = 0; i < 6; i++) box(c, -0.45 + i * 0.18, -0.29, 0.016, 0.09, 0.02, 0.008, 0x30333a);
  // the S-curved heat pipe + spreader — fades away as the ride pierces it
  const hp = pierce(c, 0.3, 0.62);
  if (hp > 0.02) {
    for (let i = 0; i <= 30; i++) {
      const s = i / 30;
      const x = -0.45 + s * 0.9, y = 0.05 + Math.sin(s * Math.PI * 1.6 + 0.4) * 0.13;
      box(c, x, y, 0.026, 0.045, 0.06, 0.008, 0xc98a4b, { fade: hp, q: aa(0, 0, 1, Math.cos(s * Math.PI * 1.6 + 0.4) * 0.35) });
    }
    box(c, 0, 0.05, 0.02, 0.36, 0.3, 0.004, 0xd0d4da, { fade: hp * 0.95 }); // heat spreader plate
  }

  const p = kid(c, K.m4package.at, m4package);
  if (p) m4package.render(p);
};
export const mod: Mod = { spec, render };
