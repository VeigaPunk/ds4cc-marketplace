// The M4 die — 13 mm. Floorplan faithful to the die scheme: P-cluster bottom-left,
// E-cluster top-right, GPU upper-left, NE bottom-right, SLC band, PHYs on the edges.
// No bare substrate: every area is a live, twinkling block, patterned per block type.
import { box, sph, kid, type Ctx, type Mod } from "../core/ctx";
import { hashf, netGlow } from "../core/logic";
import { mod as pcore } from "./pcore";

const K = {
  pcore: { at: { pos: [-0.155, -0.205, 0.024] as const, scale: 0.2 }, mod: () => pcore },
};

export const spec = {
  id: "die", name: "M4 die", size: 0.013,
  kids: K, dive: "pcore" as const,
  approach: { dir: [0.42, 0.5, 0.82] as const, up: [0, 1, 0] as const },
};

// x, y, w, h, base color, sub-tile cols, rows, seed, kind
const BLOCKS: [number, number, number, number, number, number, number, number, string][] = [
  [-0.475, 0, 0.05, 0.96, 0x4a5568, 1, 12, 1, "phy"],       // memory PHY west
  [0.475, 0, 0.05, 0.96, 0x4a5568, 1, 12, 2, "phy"],        // memory PHY east
  [-0.23, 0.29, 0.42, 0.38, 0x2f5d8a, 5, 2, 3, "gpu"],      // GPU — 10 cores
  [0.15, 0.38, 0.3, 0.2, 0x8a5a2f, 3, 2, 4, "ecore"],       // E-cores ×6
  [0.15, 0.24, 0.3, 0.06, 0x9a744a, 4, 1, 5, "cache"],      // E L2
  [0.38, 0.31, 0.13, 0.34, 0x3f7a6a, 2, 4, 6, "misc"],      // ISP
  [0.02, 0.08, 0.36, 0.22, 0x6a4a7a, 4, 3, 7, "misc"],      // media engine
  [-0.28, 0.02, 0.22, 0.14, 0x7a6a3a, 3, 2, 8, "misc"],     // display engine
  [0.33, 0.02, 0.24, 0.18, 0x445c30, 3, 2, 9, "se"],        // Secure Enclave + always-on
  [0.02, -0.12, 0.5, 0.14, 0x37546e, 8, 2, 10, "slc"],      // SLC band
  [-0.31, -0.11, 0.28, 0.1, 0x5a6a7e, 5, 1, 11, "misc"],    // fabric / NoC
  [-0.26, -0.3, 0.44, 0.36, 0x8a3a3a, 2, 2, 12, "pcore"],   // P-core cluster ×4  ← dive
  [0.0, -0.3, 0.1, 0.36, 0xa05050, 1, 4, 13, "cache"],      // shared P L2
  [0.28, -0.33, 0.42, 0.3, 0x3a8a6a, 4, 4, 14, "ne"],       // Neural Engine ×16
  [0.1, -0.44, 0.66, 0.06, 0x556644, 10, 1, 15, "phy"],     // IO / Thunderbolt south
  [-0.3, -0.02, 0.26, 0.06, 0x605a80, 4, 1, 16, "misc"],    // AMX
];

// per-block-type switching rate: how "busy" a block reads via twinkle frequency
const KIND_FREQ: Record<string, number> = { gpu: 2.4, ne: 1.7, se: 0.28, phy: 1.3, pcore: 1.5, cache: 1.1, slc: 1.0, ecore: 1.4, misc: 1.0 };

export const render = (c: Ctx) => {
  box(c, 0, 0, 0, 1.02, 1.0, 0.02, 0x1c2733);                             // die base (fully covered below)
  for (const [x, y, w, h, col, cols, rows, seed, kind] of BLOCKS) {
    box(c, x, y, 0.013, w - 0.008, h - 0.008, 0.006, col);
    const freq = KIND_FREQ[kind] ?? 1.0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const tx = x - w / 2 + (w / cols) * (i + 0.5), ty = y - h / 2 + (h / rows) * (j + 0.5);
      const shade = 0.82 + hashf(seed * 31 + i * 7 + j * 13) * 0.36;
      const r = Math.min(255, ((col >> 16) & 255) * shade), g = Math.min(255, ((col >> 8) & 255) * shade), b = Math.min(255, (col & 255) * shade);
      const cw = (w / cols) * 0.86, ch = (h / rows) * 0.84;
      box(c, tx, ty, 0.0175, cw, ch, 0.003, (r << 16) | (g << 8) | b);

      // interior sub-tile pattern, unique per block kind
      const shadeCol = (k: number) => (Math.min(255, r * k) << 16) | (Math.min(255, g * k) << 8) | Math.min(255, b * k);
      if (kind === "gpu") {
        // shader-array: 4 vertical ALU-lane stripes per core tile
        for (let l = 0; l < 4; l++)
          box(c, tx - cw * 0.375 + l * cw * 0.25, ty, 0.0195, cw * 0.16, ch * 0.9, 0.001, shadeCol(0.75 + (l % 2) * 0.1));
      } else if (kind === "ne") {
        // MAC-array: 3×3 dot grid per NE tile
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++)
          sph(c, tx - cw * 0.32 + dx * cw * 0.32, ty - ch * 0.32 + dy * ch * 0.32, 0.02, cw * 0.11, shadeCol(0.9));
      } else if (kind === "slc") {
        // memory-bank grid: 2×2 sub-banks per tile
        for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++)
          box(c, tx - cw * 0.24 + bx * cw * 0.48, ty - ch * 0.22 + by * ch * 0.44, 0.0195, cw * 0.42, ch * 0.36, 0.001, shadeCol(0.72 + ((bx + by) % 2) * 0.15));
      } else if (kind === "phy") {
        // pad rows: 4 bump-pad squares along the strip
        for (let p = 0; p < 4; p++)
          box(c, tx, ty - ch * 0.36 + p * ch * 0.24, 0.0195, cw * 0.6, ch * 0.14, 0.0012, shadeCol(0.85));
      } else {
        // default: 3 routing lanes
        for (let l = 0; l < 3; l++)
          box(c, tx, ty - ch * 0.3 + l * ch * 0.3, 0.0195, cw * 0.7, ch * 0.06, 0.001, shadeCol(0.7));
      }

      // switching activity — the whole die twinkles, rate depends on block kind
      const gl = netGlow(seed * 100 + i * 17 + j * 29, c.time, freq * (0.6 + hashf(seed + i + j) * 0.8));
      if (gl > 0.5) box(c, tx, ty, 0.021, cw * 0.5, ch * 0.4, 0.001, 0x66aaff, { glow: true, fade: (gl - 0.5) * 0.5 });
    }
  }
  // clock/power routing seams (structured, not bare)
  for (let i = 0; i < 8; i++) box(c, -0.48 + i * 0.135, 0, 0.0105, 0.006, 0.96, 0.002, 0x2e3d4d);
  for (let i = 0; i < 7; i++) box(c, 0, -0.45 + i * 0.15, 0.0105, 0.96, 0.006, 0.002, 0x2e3d4d);

  const p = kid(c, K.pcore.at, pcore);
  if (p) pcore.render(p);
};
export const mod: Mod = { spec, render };
