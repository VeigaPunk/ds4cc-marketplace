// The quark — the end of the line, ~10⁻¹⁶ m and still point-like. A shimmering
// mote of color charge; the track settles into a slow close orbit around it.
import { sph, type Ctx, type Mod } from "../core/ctx";

export const spec = {
  id: "quark", name: "up quark", size: 1e-16,
  kids: {},
  approach: { dir: [0.5, 0.55, 0.65] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  const hueShell = (i: number) => [0xff4a4a, 0x4aff66, 0x4a6aff][(Math.floor(c.time * 1.5) + i) % 3];
  sph(c, 0, 0, 0, 0.02, 0xffffff);                                       // the point itself
  for (let i = 0; i < 5; i++) {
    const R = 0.07 + i * 0.09 + Math.sin(c.time * 3 + i * 1.7) * 0.015;
    sph(c, 0, 0, 0, R, hueShell(i), { glow: true, fade: 0.18 / (1 + i) });
  }
  // virtual gluon sparks spiralling around
  for (let i = 0; i < 16; i++) {
    const a = c.time * (1.5 + (i % 4) * 0.4) + i * 1.9, r = 0.1 + (i % 5) * 0.07;
    sph(c, Math.cos(a) * r, Math.sin(a * 1.4) * r * 0.8, Math.sin(a) * r, 0.014, 0xffe488, { glow: true, fade: 0.6 });
  }
};
export const mod: Mod = { spec, render };
