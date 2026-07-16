// Inside the chassis — teardown layout per the macbook_interior reference:
// two fans by the hinge corners, logic board between them, S heat pipe, antenna
// bar along the hinge, 4+2 battery cells, flanking speakers, center flex cable.
import { box, sph, cyl, kid, aa, type Ctx, type Mod } from "../core/ctx";
import { mod as logicboard } from "./logicboard";

const QF = aa(1, 0, 0, -Math.PI / 2); // child board XY-plane → chassis XZ, +y toward hinge
const K = {
  logicboard: { at: { pos: [0, 0.012, -0.19] as const, scale: 0.55, quat: QF }, mod: () => logicboard },
};

export const spec = {
  id: "chassis", name: "inside the chassis", size: 0.3,
  kids: K, dive: "logicboard" as const,
  approach: { dir: [0.35, 0.9, 0.4] as const, up: [0, 0, -1] as const },
};

const fan = (c: Ctx, fx: number, fz: number, dir: number) => {
  cyl(c, fx, 0.004, fz, 0.21, 0.022, 0x2b2d31);                           // housing
  cyl(c, fx, 0.006, fz, 0.185, 0.02, 0x1a1b1e);
  sph(c, fx, 0.014, fz, 0.04, 0x3a3d42);                                  // hub
  const a0 = c.time * 5.5 * dir;                                          // visibly spinning, chunky
  for (let i = 0; i < 5; i++) {
    const a = a0 + (i / 5) * Math.PI * 2;
    box(c, fx + Math.sin(a) * 0.055, 0.011, fz + Math.cos(a) * 0.055, 0.026, 0.012, 0.085, 0x8f959d,
      { q: aa(0, 1, 0, a + 0.5) });
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(c, fx + Math.sin(a) * 0.1, 0.002, fz + Math.cos(a) * 0.1, 0.006, 0.004, 0.02, 0x3f4247, { q: aa(0, 1, 0, a) }); }
};

export const render = (c: Ctx) => {
  // aluminum tub
  box(c, 0, -0.028, 0, 1.0, 0.014, 0.72, 0xb4b8bf);
  for (const [x, z, w, d] of [[-0.5, 0, 0.014, 0.72], [0.5, 0, 0.014, 0.72], [0, -0.353, 1, 0.014], [0, 0.353, 1, 0.014]] as const)
    box(c, x, 0.006, z, w, 0.055, d, 0xaeb2b9);
  // fans, hinge corners
  fan(c, -0.33, -0.21, 1);
  fan(c, 0.33, -0.21, -1);
  // antenna bar along the hinge
  box(c, 0, 0.012, -0.345, 0.72, 0.02, 0.028, 0x60646b);
  for (let i = 0; i < 5; i++) box(c, -0.28 + i * 0.14, 0.024, -0.345, 0.05, 0.004, 0.02, 0x4a4d52);
  // battery: 4 corner cells + 2 tall center, with printed labels
  for (const [bx, bz, w, d] of [[-0.31, 0.16, 0.24, 0.17], [0.31, 0.16, 0.24, 0.17], [-0.31, 0.295, 0.24, 0.09], [0.31, 0.295, 0.24, 0.09], [-0.085, 0.21, 0.16, 0.26], [0.085, 0.21, 0.16, 0.26]] as const) {
    box(c, bx, 0.0, bz, w, 0.022, d, 0x9a9da3);
    box(c, bx, 0.0115, bz, w * 0.94, 0.001, d * 0.9, 0x84878d);
    box(c, bx, 0.0125, bz, w * 0.6, 0.0006, d * 0.28, 0x63666b);          // printed label block
    box(c, bx, 0.0131, bz - d * 0.1, w * 0.5, 0.0004, 0.006, 0x3d3f43);   // label lines
    box(c, bx, 0.0131, bz + d * 0.02, w * 0.44, 0.0004, 0.006, 0x3d3f43);
  }
  // trackpad flex cable down the middle to its gold connector
  box(c, 0, 0.013, 0.21, 0.05, 0.0016, 0.3, 0x2e2f33);
  box(c, 0, 0.0145, 0.09, 0.056, 0.0022, 0.03, 0xc9a437);                 // gold connector
  // speakers flanking the battery
  for (const sx of [-0.465, 0.465]) {
    box(c, sx, 0.006, 0.18, 0.055, 0.03, 0.3, 0x232529);
    for (let i = 0; i < 10; i++) sph(c, sx, 0.023, 0.05 + i * 0.028, 0.008, 0x111215);
  }
  // side port boards
  box(c, -0.46, 0.004, -0.15, 0.06, 0.014, 0.16, 0x14401f);
  box(c, 0.46, 0.004, -0.1, 0.06, 0.014, 0.2, 0x14401f);
  // aluminum struts, screws, tape strips
  for (const z of [0.055, 0.34] as const) box(c, 0, 0.002, z, 0.92, 0.008, 0.018, 0xa6aab1);
  for (let i = 0; i < 12; i++)
    cyl(c, -0.44 + (i % 6) * 0.176, 0.011, i < 6 ? 0.052 : 0.338, 0.009, 0.004, 0x7c8087);
  for (const [tx, tz] of [[-0.2, 0.06], [0.2, 0.06], [0, -0.05]] as const)
    box(c, tx, 0.0135, tz, 0.1, 0.0006, 0.03, 0x2f3f47);                  // kapton-ish tape
  // thermal pads near board edge
  for (let i = 0; i < 4; i++) box(c, -0.15 + i * 0.1, 0.012, -0.045, 0.05, 0.003, 0.03, 0x8fa3b8);

  const lb = kid(c, K.logicboard.at, logicboard);
  if (lb) logicboard.render(lb);
};
export const mod: Mod = { spec, render };
