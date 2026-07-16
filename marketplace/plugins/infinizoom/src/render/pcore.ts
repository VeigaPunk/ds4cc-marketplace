// One performance core — 2.6 mm. A real core floorplan: caches, decode, schedulers,
// register files, execution units. The integer ALU block is the dive.
import { box, kid, type Ctx, type Mod } from "../core/ctx";
import { hashf, netGlow } from "../core/logic";
import { mod as alu } from "./alu";

const K = {
  alu: { at: { pos: [0.18, -0.05, 0.021] as const, scale: 0.038 }, mod: () => alu },
};

export const spec = {
  id: "pcore", name: "performance core", size: 0.0026,
  kids: K, dive: "alu" as const,
  approach: { dir: [0.5, 0.42, 0.8] as const, up: [0, 1, 0] as const },
};

const R: [number, number, number, number, number, string, number][] = [
  // x, y, w, h, color, kind, lanes
  [-0.0, 0.42, 0.94, 0.14, 0x3a6a4a, "L1I", 10],
  [-0.35, 0.28, 0.26, 0.12, 0x6a5a30, "branch pred", 6],
  [0.1, 0.28, 0.6, 0.12, 0x7a4a30, "decode ×10", 10],
  [-0.0, 0.16, 0.92, 0.1, 0x6a3a5a, "rename/dispatch", 12],
  [-0.32, -0.02, 0.3, 0.24, 0x35507a, "int sched", 8],
  [-0.32, -0.28, 0.3, 0.22, 0x2f6a75, "fp sched", 6],
  [0.0, -0.02, 0.28, 0.24, 0x8a6a2a, "register files", 14],
  [0.18, -0.05, 0.076 * 2, 0.076 * 2, 0x9a4a3a, "int ALU", 0],           // ← dive block (kid renders inside)
  [0.38, -0.02, 0.2, 0.42, 0x4a7a3a, "FP/SIMD", 8],
  [0.0, -0.42, 0.94, 0.14, 0x3a5a8a, "L1D + LSU", 12],
  [-0.02, -0.24, 0.24, 0.14, 0x705080, "AGU", 6],
];

// front-end → dispatch → ALU pipeline wave, ~0.8s per stage, pure fn of c.time
const STAGES = ["L1I", "decode ×10", "rename/dispatch", "int sched", "int ALU"];
const WAVE_T = 0.8;
const waveGlow = (kind: string, time: number): number => {
  const idx = STAGES.indexOf(kind);
  if (idx < 0) return 0;
  const phase = (time / WAVE_T) % STAGES.length;
  const d = Math.abs(phase - idx);
  const wrapped = Math.min(d, STAGES.length - d);
  return Math.max(0, 1 - wrapped * 2.2);
};

export const render = (c: Ctx) => {
  box(c, 0, 0, 0, 1.0, 1.0, 0.018, 0x25303c);
  for (const [x, y, w, h, col, kind, lanes] of R) {
    box(c, x, y, 0.012, w - 0.01, h - 0.01, 0.005, col);

    if (kind === "L1I" || kind === "L1D + LSU") {
      // cache bank pattern: repeated small rectangles, 2 rows of banks
      const bcols = lanes, brows = 2;
      for (let bi = 0; bi < bcols; bi++) for (let bj = 0; bj < brows; bj++) {
        const bx = x - w / 2 + (w / bcols) * (bi + 0.5), by = y - h / 2 + (h / brows) * (bj + 0.5);
        const shd = 0.78 + hashf(bi * 11 + bj * 23 + col) * 0.4;
        box(c, bx, by, 0.0155, (w / bcols) * 0.82, (h / brows) * 0.8, 0.002,
          (Math.min(255, ((col >> 16) & 255) * shd) << 16) | (Math.min(255, ((col >> 8) & 255) * shd) << 8) | Math.min(255, (col & 255) * shd));
      }
    } else if (kind === "register files") {
      // fine register grid: lanes cols × 3 rows
      const rrows = 3;
      for (let ri = 0; ri < lanes; ri++) for (let rj = 0; rj < rrows; rj++) {
        const rx = x - w / 2 + (w / lanes) * (ri + 0.5), ry = y - h / 2 + (h / rrows) * (rj + 0.5);
        const shd = 0.78 + hashf(ri * 5 + rj * 19 + col) * 0.4;
        box(c, rx, ry, 0.0155, (w / lanes) * 0.8, (h / rrows) * 0.72, 0.002,
          (Math.min(255, ((col >> 16) & 255) * shd) << 16) | (Math.min(255, ((col >> 8) & 255) * shd) << 8) | Math.min(255, (col & 255) * shd));
        const gl = netGlow(col + ri * 13 + rj * 41, c.time, 2.6);
        if (gl > 0.6) box(c, rx, ry, 0.0175, (w / lanes) * 0.5, (h / rrows) * 0.4, 0.001, 0x77bbff, { glow: true, fade: (gl - 0.6) * 0.7 });
      }
    } else {
      for (let l = 0; l < lanes; l++) {
        const lx = x - w / 2 + (w / lanes) * (l + 0.5);
        const shade = 0.8 + hashf(l * 3.7 + col) * 0.4;
        box(c, lx, y, 0.0155, (w / lanes) * 0.78, h * 0.82, 0.002,
          ((Math.min(255, ((col >> 16) & 255) * shade)) << 16) | ((Math.min(255, ((col >> 8) & 255) * shade)) << 8) | Math.min(255, (col & 255) * shade));
        const gl = netGlow(col + l * 7, c.time, 2 + hashf(l + col) * 3);
        if (gl > 0.55) box(c, lx, y + (hashf(l * 9 + col) - 0.5) * h * 0.5, 0.018, (w / lanes) * 0.5, h * 0.12, 0.001, 0x77bbff, { glow: true, fade: (gl - 0.55) * 0.55 });
      }
    }

    // pipeline-stage wave: front-end → dispatch → ALU, ~0.8s cadence
    const wg = waveGlow(kind, c.time);
    if (wg > 0.05) box(c, x, y, 0.02, (w - 0.01) * 0.96, (h - 0.01) * 0.9, 0.0015, 0xaee0ff, { glow: true, fade: wg * 0.7 });
  }
  // result buses: sched → ALU, flat and pulsing
  for (let i = 0; i < 4; i++) {
    const by = -0.14 + i * 0.09;
    box(c, -0.02, by, 0.0175, 0.42, 0.006, 0.001, 0x445566);
    const gl = netGlow(400 + i, c.time, 3);
    if (gl > 0.6) box(c, -0.02, by, 0.018, 0.4, 0.005, 0.001, 0x88ccff, { glow: true, fade: (gl - 0.6) * 0.8 });
  }
  const a = kid(c, K.alu.at, alu);
  if (a) alu.render(a);
};
export const mod: Mod = { spec, render };
