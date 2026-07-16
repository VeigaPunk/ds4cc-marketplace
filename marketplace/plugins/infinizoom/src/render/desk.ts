// The desk — 1.8 m across. Tabletop top surface at y=0.18; the MacBook lives center-front.
import { box, sph, cyl, kid, aa, mulQuat, type Ctx, type Mod } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as macbook } from "./macbook";

const SURF = 0.1815; // true desktop top surface (top of the plank inlay) — everything resting on the desk is flush to this

const K = {
  macbook: { at: { pos: [-0.02, 0.1878, -0.03] as const, scale: 0.178, quat: aa(0, 1, 0, 0.06) }, mod: () => macbook },
};

export const spec = {
  id: "desk", name: "desk", size: 1.8,
  kids: K, dive: "macbook" as const,
  approach: { dir: [0.5, 0.72, 0.55] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  // top (two-tone wood), apron, legs
  box(c, 0, 0.168, 0, 1, 0.024, 0.52, 0x9a7048);
  box(c, 0, 0.1805, 0, 1, 0.001, 0.52, 0xa87d52);
  for (let i = 0; i < 7; i++) box(c, 0, 0.1812, -0.22 + i * 0.074, 0.98, 0.0006, 0.06, i % 2 ? 0xa27750 : 0xb08356);
  box(c, 0, 0.14, 0, 0.94, 0.03, 0.46, 0x86603e);
  for (const [x, z] of [[-0.46, -0.22], [0.46, -0.22], [-0.46, 0.22], [0.46, 0.22]] as const)
    box(c, x, -0.03, z, 0.035, 0.42, 0.035, 0x7a5738);
  // potted plant (left back) — leaves sway
  cyl(c, -0.38, 0.225, -0.16, 0.09, 0.09, 0xb35a3d);
  cyl(c, -0.38, 0.272, -0.16, 0.084, 0.008, 0x4a3624);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, sw = Math.sin(c.time * 1.1 + i) * 0.02;
    box(c, -0.38 + Math.sin(a) * 0.035 + sw, 0.315 + (i % 3) * 0.02, -0.16 + Math.cos(a) * 0.035,
      0.016, 0.1 + (i % 4) * 0.02, 0.004, i % 2 ? 0x3e7a34 : 0x4e9440, { q: aa(Math.cos(a), 0, -Math.sin(a), 0.5 + sw) });
  }
  // coaster + mug (mug sits proud of the coaster, not embedded) with steam
  cyl(c, 0.27, SURF + 0.0015, 0.09, 0.075, 0.003, 0xcac2b0);
  cyl(c, 0.27, 0.215, 0.09, 0.052, 0.06, 0xc4483a);
  cyl(c, 0.27, 0.241, 0.09, 0.044, 0.004, 0x3a2a20);
  cyl(c, 0.302, 0.215, 0.09, 0.012, 0.032, 0xc4483a, { q: aa(0, 0, 1, Math.PI / 2) });
  for (let i = 0; i < 3; i++)
    sph(c, 0.27 + Math.sin(c.time * 1.8 + i * 2) * 0.01, 0.263 + ((c.time * 0.05 + i * 0.017) % 0.05), 0.09, 0.015 - i * 0.003, 0xdddddd, { glow: true, fade: 0.25 });
  // paper + pens (lying flat on the desktop, slight yaws — not propped up)
  box(c, 0.16, 0.1825, 0.14, 0.13, 0.001, 0.18, 0xf2efe6, { q: aa(0, 1, 0, -0.15) });
  for (let i = 0; i < 11; i++) box(c, 0.155 - Math.sin(0.15) * (i * 0.013 - 0.06), 0.1832, 0.075 + i * 0.013, 0.1, 0.0004, 0.003, 0x8b93a5, { q: aa(0, 1, 0, -0.15) });
  cyl(c, 0.232, SURF + 0.003, 0.205, 0.006, 0.12, 0x2255aa, { q: mulQuat(aa(0, 1, 0, 0.35), aa(1, 0, 0, Math.PI / 2)) });
  cyl(c, 0.248, SURF + 0.0025, 0.228, 0.005, 0.1, 0x333333, { q: mulQuat(aa(0, 1, 0, -0.6), aa(1, 0, 0, Math.PI / 2)) });
  // notebook (closed, front-center)
  const nbYaw = (hashf(41) - 0.5) * 0.5;
  box(c, -0.02, SURF + 0.008, 0.24, 0.15, 0.016, 0.2, 0x2b3a4a, { q: aa(0, 1, 0, nbYaw) });
  box(c, -0.02, SURF + 0.017, 0.24, 0.14, 0.001, 0.19, 0x37485c, { q: aa(0, 1, 0, nbYaw) });
  // sticky notes, scattered with independent yaws
  for (let i = 0; i < 3; i++) {
    const stYaw = (hashf(50 + i) - 0.5) * 0.6;
    box(c, -0.06 + i * 0.025, SURF + 0.0006, 0.32 + i * 0.035, 0.03, 0.0012, 0.03,
      [0xf2d94e, 0xf27a5e, 0x7ecb6a][i], { q: aa(0, 1, 0, stYaw) });
  }
  // headphones, cups resting flat with a draped headband
  const hpX = 0.13, hpZ = -0.07, hpYaw = (hashf(60) - 0.5) * 0.8;
  for (const side of [-1, 1] as const) {
    const cx2 = hpX + Math.cos(hpYaw + Math.PI / 2) * side * 0.055;
    const cz2 = hpZ + Math.sin(hpYaw + Math.PI / 2) * side * 0.055;
    cyl(c, cx2, SURF + 0.012, cz2, 0.068, 0.024, 0x24262b);
    cyl(c, cx2, SURF + 0.0275, cz2, 0.05, 0.006, 0x35373d);
  }
  box(c, hpX, SURF + 0.05, hpZ, 0.075, 0.012, 0.03, 0x1c1d20, { q: aa(0, 1, 0, hpYaw) });
  // charging cable, snaking from the MacBook toward the desk's back edge
  for (let i = 0; i < 5; i++) {
    const t2 = i / 4;
    cyl(c, -0.05 + Math.sin(t2 * 3.1) * 0.015, SURF + 0.0025, -0.09 - t2 * 0.17, 0.005, 0.045, 0x1c1d20, { q: aa(1, 0, 0, Math.PI / 2) });
  }
  // book stack (right back)
  for (let i = 0; i < 4; i++)
    box(c, 0.38, 0.194 + i * 0.022, -0.17, 0.15 - i * 0.012, 0.02, 0.2, [0x35506b, 0x6b4a35, 0x4a6b3a, 0x777777][i], { q: aa(0, 1, 0, i * 0.09) });
  // phone, face up, flush on the desk, screen pulsing faintly
  box(c, -0.24, SURF + 0.003, 0.16, 0.062, 0.006, 0.13, 0x1a1c20, { q: aa(0, 1, 0, 0.4) });
  box(c, -0.24, SURF + 0.0084, 0.16, 0.055, 0.0004, 0.12, 0x10131c, { q: aa(0, 1, 0, 0.4) });
  sph(c, -0.24, SURF + 0.0088, 0.115, 0.006, 0x33ff77, { glow: true, fade: 0.4 + 0.3 * Math.sin(c.time * 2) });
  // desk lamp — foot, post, elbow arm, and shade all joined at true contact points
  const lampX = -0.42, lampZ = 0.10, footY = SURF + 0.003;
  cyl(c, lampX, footY, lampZ, 0.06, 0.006, 0x1f2126);
  const postH = 0.1, postY = footY + 0.003 + postH / 2, postTopY = postY + postH / 2;
  cyl(c, lampX, postY, lampZ, 0.016, postH, 0x30333a);
  cyl(c, lampX, postTopY, lampZ, 0.02, 0.012, 0x22242a); // elbow collar hides the joint seam
  const armAng = 0.6, armLen = 0.15, armDY = Math.cos(armAng), armDZ = Math.sin(armAng);
  cyl(c, lampX, postTopY + (armLen / 2) * armDY, lampZ + (armLen / 2) * armDZ, 0.013, armLen, 0x30333a, { q: aa(1, 0, 0, armAng) });
  const headY = postTopY + armLen * armDY, headZ = lampZ + armLen * armDZ;
  sph(c, lampX, headY, headZ, 0.075, 0x3a3d44);
  sph(c, lampX, headY - armDY * 0.02, headZ - armDZ * 0.02 + 0.01, 0.03, 0xffedbb, { glow: true, fade: 0.85 });

  const m = kid(c, K.macbook.at, macbook);
  if (m) macbook.render(m);
};
export const mod: Mod = { spec, render };
