// A day-lit room. Frame: unit box, floor y=-0.5, +z toward the window wall's left… 6 m across.
import { box, sph, cyl, kid, aa, smooth, type Ctx, type Mod } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as desk } from "./desk";

const FLOOR = -0.4975; // true floor surface (plank top) — floor props are flush to this

const K = {
  desk: { at: { pos: [0.1, -0.428, -0.32] as const, scale: 0.3, quat: aa(0, 1, 0, 0.04) }, mod: () => desk },
};

export const spec = {
  id: "room", name: "room", size: 6,
  kids: K, dive: "desk" as const,
  approach: { dir: [0.55, 0.5, 0.48] as const, up: [0, 1, 0] as const, entryD: 0.55 },
};

export const render = (c: Ctx) => {
  // shell: floor, ceiling, walls (window wall +x, door wall -x)
  box(c, 0, -0.505, 0, 1.04, 0.01, 1.04, 0x8a7355);                       // subfloor
  for (let i = 0; i < 13; i++)                                            // planks
    box(c, 0, -0.4995, -0.48 + i * 0.08, 1.02, 0.004, 0.072, i % 2 ? 0x9c8161 : 0x94795a);
  box(c, 0, 0.505, 0, 1.04, 0.01, 1.04, 0xe8e4da);                        // ceiling
  box(c, 0, 0, -0.515, 1.04, 1.02, 0.01, 0xd9d2c4);                       // back wall
  box(c, 0, 0, 0.515, 1.04, 1.02, 0.01, 0xd9d2c4);                        // front wall
  box(c, -0.515, 0, 0, 0.01, 1.02, 1.04, 0xcfc8ba);                       // door wall
  // window wall (+x) with a real opening: four panels around the window hole
  box(c, 0.515, 0, -0.325, 0.01, 1.02, 0.39, 0xd4cdbf);
  box(c, 0.515, 0, 0.325, 0.01, 1.02, 0.39, 0xd4cdbf);
  box(c, 0.515, 0.38, 0, 0.01, 0.26, 0.26, 0xd4cdbf);
  box(c, 0.515, -0.38, 0, 0.01, 0.26, 0.26, 0xd4cdbf);
  // window: frame, cross bars, glowing daylight, curtains
  box(c, 0.512, 0, 0, 0.012, 0.5, 0.26, 0xf4f1ea);
  box(c, 0.518, 0, 0, 0.004, 0.5, 0.02, 0xf4f1ea);
  box(c, 0.518, 0, 0, 0.004, 0.02, 0.26, 0xf4f1ea);
  box(c, 0.52, 0, 0, 0.002, 0.47, 0.24, 0xbfe3ff, { glow: true, fade: 0.9 }); // sky light
  const sway = Math.sin(c.time * 0.7) * 0.008;
  box(c, 0.503, 0.02, -0.16 + sway, 0.02, 0.56, 0.09, 0xc8b89a);         // curtains, hugging the window wall
  box(c, 0.503, 0.02, 0.16 - sway, 0.02, 0.56, 0.09, 0xc8b89a);
  cyl(c, 0.503, 0.31, 0, 0.008, 0.44, 0xa08a68, { q: aa(1, 0, 0, Math.PI / 2) }); // curtain rod
  for (const bz of [-0.16, 0.16] as const)
    box(c, 0.5085, 0.31, bz, 0.0015, 0.016, 0.02, 0xa08a68);             // wall brackets — rod actually attaches
  // door (-x wall) with handle
  box(c, -0.508, -0.12, 0.22, 0.008, 0.76, 0.17, 0xb59b78);
  sph(c, -0.5, -0.15, 0.155, 0.014, 0xd9c184);
  // rug
  box(c, 0.05, -0.494, -0.1, 0.5, 0.004, 0.42, 0x7a4b3a);
  box(c, 0.05, -0.4935, -0.1, 0.42, 0.004, 0.34, 0x9c6a52);
  // wall clock on back wall — hands actually run
  cyl(c, 0.12, 0.27, -0.507, 0.09, 0.008, 0xf5f2ec, { q: aa(1, 0, 0, Math.PI / 2) });
  cyl(c, 0.12, 0.27, -0.508, 0.096, 0.004, 0x333333, { q: aa(1, 0, 0, Math.PI / 2) });
  const mins = (Date.now() / 60000) % 60, hrs = (Date.now() / 3600000) % 12;
  const hand = (ang: number, len: number, w: number, col: number) =>
    box(c, 0.12 + Math.sin(ang) * len / 2, 0.27 + Math.cos(ang) * len / 2, -0.503, w, len, 0.002, col, { q: aa(0, 0, 1, -ang) });
  hand((mins / 60) * Math.PI * 2, 0.066, 0.005, 0x222222);
  hand((hrs / 12) * Math.PI * 2, 0.044, 0.007, 0x222222);
  hand(((Date.now() / 1000) % 60 / 60) * Math.PI * 2, 0.07, 0.002, 0xcc3322);
  // shelf with books (back wall)
  box(c, -0.28, 0.12, -0.49, 0.3, 0.012, 0.05, 0x8a6a48);
  for (let i = 0; i < 9; i++)
    box(c, -0.4 + i * 0.03, 0.155 + (i % 3) * 0.004, -0.49, 0.022, 0.058 + (i % 3) * 0.008, 0.04,
      [0x8a3324, 0x2d5b7a, 0x777d46, 0xa8894e, 0x5b4a68][i % 5], { q: aa(0, 0, 1, (i % 4) * 0.02) });
  // chair by the desk
  const ch = [0.32, -0.36, -0.18] as const;
  box(c, ch[0], ch[1], ch[2], 0.09, 0.014, 0.09, 0x4a4d55);
  box(c, ch[0] + 0.048, ch[1] + 0.08, ch[2], 0.014, 0.16, 0.09, 0x4a4d55);
  cyl(c, ch[0], ch[1] - 0.05, ch[2], 0.012, 0.09, 0x777c85);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cyl(c, ch[0] + Math.sin(a) * 0.04, ch[1] - 0.095, ch[2] + Math.cos(a) * 0.04, 0.01, 0.01, 0x555a63); }
  // floor lamp + warm bulb
  cyl(c, -0.35, -0.28, 0.3, 0.01, 0.42, 0x3c3f45);
  cyl(c, -0.35, -0.05, 0.3, 0.09, 0.07, 0xe8ddc0);
  sph(c, -0.35, -0.06, 0.3, 0.04, 0xffe6b0, { glow: true });
  // power cable, lying flat along the back wall base to an outlet (not diagonal rods)
  for (let i = 0; i < 9; i++) {
    const jz = (hashf(i * 3.1) - 0.5) * 0.012;
    cyl(c, -0.15 + i * 0.07, FLOOR + 0.0025, -0.49 + jz, 0.005, 0.076, 0x1c1d20, { q: aa(0, 0, 1, Math.PI / 2) });
  }
  box(c, -0.16, -0.42, -0.507, 0.03, 0.045, 0.006, 0xe8e4da);            // outlet plate, flush on the wall
  box(c, -0.16, -0.42, -0.5035, 0.01, 0.018, 0.003, 0x2a2c30);           // outlet slots

  // baseboards along every wall, flush to the floor
  box(c, 0, -0.4825, -0.505, 1.0, 0.03, 0.01, 0xcfc6b4);
  box(c, 0, -0.4825, 0.505, 1.0, 0.03, 0.01, 0xcfc6b4);
  box(c, -0.505, -0.4825, 0, 0.01, 0.03, 1.0, 0xcfc6b4);
  box(c, 0.505, -0.4825, 0, 0.01, 0.03, 1.0, 0xcfc6b4);
  // subtle crown trim where wall meets ceiling
  box(c, 0, 0.494, -0.505, 1.0, 0.012, 0.012, 0xdcd6c8);
  box(c, 0.505, 0.494, 0, 0.012, 0.012, 1.0, 0xdcd6c8);

  // second shelf, lower, with more books
  const shelf2Y = -0.05, shelf2Top = shelf2Y + 0.006;
  box(c, -0.28, shelf2Y, -0.49, 0.32, 0.012, 0.05, 0x7a5a3a);
  for (let i = 0; i < 6; i++) {
    const bh = 0.06 + (i % 3) * 0.012;
    box(c, -0.42 + i * 0.05, shelf2Top + bh / 2, -0.49, 0.026, bh, 0.04,
      [0x6b3a2d, 0x3a5f7a, 0x5a7a3a, 0x8a6a3a, 0x4a3a5a, 0x7a5a2a][i], { q: aa(0, 0, 1, (i % 3) * 0.02) });
  }

  // picture frames on the back wall
  const frame = (fx: number, fy: number, w: number, h: number, art: number) => {
    box(c, fx, fy, -0.507, w, h, 0.006, 0x2a2620);
    box(c, fx, fy, -0.5035, w - 0.014, h - 0.014, 0.003, art);
  };
  frame(0.36, 0.14, 0.13, 0.17, 0x3a5a7a);
  frame(-0.44, 0.34, 0.1, 0.13, 0x7a5a3a);

  // ceiling pendant light, gently breathing
  const pendFlicker = 0.85 + 0.15 * Math.sin(c.time * 0.9);
  cyl(c, 0.05, 0.45, 0.05, 0.006, 0.1, 0x2a2c30);
  cyl(c, 0.05, 0.395, 0.05, 0.09, 0.05, 0x33363c);
  sph(c, 0.05, 0.39, 0.05, 0.045, 0xffe9c2, { glow: true, fade: pendFlicker });

  // window sill
  box(c, 0.495, -0.26, 0, 0.03, 0.012, 0.28, 0xdad3c2);

  // wastebasket by the desk
  cyl(c, 0.34, FLOOR + 0.08, -0.02, 0.14, 0.16, 0x3a3d42);
  cyl(c, 0.34, FLOOR + 0.166, -0.02, 0.155, 0.012, 0x2e3136);

  const d = kid(c, K.desk.at, desk);
  if (d) desk.render(d);
};
export const mod: Mod = { spec, render };
