// The screen — 0.31 m lid. XY plane, +z toward the viewer. Carries the live OS
// canvas on a dedicated textured quad; the dive enters a pixel of the playing video.
import * as THREE from "three";
import { box, sph, kid, local, smooth, pierce, type Ctx, type Mod } from "../core/ctx";
import { setScreenQuad } from "../core/pools";
import { SW, SH, DIVE_PX } from "../core/screenimg";
import { mod as panel } from "./panel";

// px → lid-frame mapping (display is 0.94 × 0.61 frame units, canvas SW×SH)
export const pxX = (px: number) => (px / SW - 0.5) * 0.94;
export const pxY = (py: number) => (0.5 - py / SH) * 0.61 - 0.012;

const K = {
  panel: { at: { pos: [pxX(DIVE_PX.x), pxY(DIVE_PX.y), 0.006] as const, scale: 0.0645 }, mod: () => panel },
};

export const spec = {
  id: "screen", name: "the screen", size: 0.31,
  kids: K, dive: "panel" as const,
  approach: { dir: [0.35, 0.42, 0.85] as const, up: [0, 1, 0] as const },
};

const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();

export const render = (c: Ctx) => {
  // aluminum lid back + black bezel front
  box(c, 0, 0, -0.014, 1.0, 0.68, 0.012, 0xb8bcc2);
  box(c, 0, 0, -0.003, 0.985, 0.665, 0.011, 0x0d0e10);
  // notch + camera
  box(c, 0, 0.293, 0.0035, 0.11, 0.014, 0.002, 0x060708);
  sph(c, 0, 0.293, 0.005, 0.006, 0x1a2a3e);
  sph(c, 0, 0.293, 0.006, 0.003, 0x3355aa, { glow: true, fade: 0.4 });
  // the live display — quad carries the OS canvas; fades as the LED grid takes over
  const x = local(c) - 1;                                                // progress through the panel level
  const op = (1 - 0.62 * smooth(-0.5, 0.1, x)) * (1 - smooth(0.5, 0.92, x));
  const dx = 0 - c.cx, dy = -0.012 - c.cy, dz = 0.0035 - c.cz;
  P.set(dx * c.f, dy * c.f, dz * c.f).applyQuaternion(Q.set(c.qx, c.qy, c.qz, c.qw));
  S.set(0.94 * c.f, 0.61 * c.f, 1);
  M.compose(P, Q, S);
  if (P.length() < 2.2e4) setScreenQuad(M, op * c.fade);
  // glow wash so the panel lights its surroundings a little
  box(c, 0, -0.012, 0.002, 0.94, 0.61, 0.001, 0x223344, { glow: true, fade: 0.12 * op });
  // cover glass — a glassy additive sheen, pierced on the way in
  const gl = pierce(c, 0.72, 0.96);
  if (gl > 0.02) box(c, 0, -0.012, 0.011, 0.97, 0.645, 0.004, 0x2c3848, { glow: true, fade: gl * 0.18 });

  const p = kid(c, K.panel.at, panel);
  if (p) panel.render(p);
};
export const mod: Mod = { spec, render };
