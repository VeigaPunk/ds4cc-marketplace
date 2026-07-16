// The integer ALU block — 100 µm. Rows of standard cells, metal routing above,
// and live computation: nets carry 0/1, gates twinkle as results ripple through.
import { box, kid, type Ctx, type Mod } from "../core/ctx";
import { hashf, netGlow, bit, pulsePos } from "../core/logic";
import { mod as logiccell } from "./logiccell";

const ROWS = 40, SITES = 80, RW = 0.024, SW = 0.012;
const cellX = (s: number) => -0.48 + s * SW + SW / 2;
const cellY = (r: number) => -0.48 + r * RW + RW / 2;
// the dive cell: row 20, site 40 → dead-center of a real cell
const K = {
  logiccell: { at: { pos: [cellX(40), cellY(20), 0.0145] as const, scale: 0.01 }, mod: () => logiccell },
};

export const spec = {
  id: "alu", name: "integer ALU", size: 1e-4,
  kids: K, dive: "logiccell" as const,
  approach: { dir: [0.45, 0.5, 0.8] as const, up: [0, 1, 0] as const },
};

const PAL = [0x7a5a96, 0x4a7a96, 0x96707a, 0x6a8a5a, 0x8a7a4a, 0x5a7a8a];
const HFRAC = [0.55, 0.72, 0.88]; // 2-3 cell-height variants

export const render = (c: Ctx) => {
  box(c, 0, 0, 0, 1.0, 1.0, 0.012, 0x232c36);
  // power rails between rows
  for (let r = 0; r <= ROWS; r += 2) box(c, 0, -0.48 + r * RW, 0.008, 0.98, 0.004, 0.001, 0x55606e);
  // standard cells — every site filled; emit auto-culls to sub-pixel
  for (let r = 0; r < ROWS; r++) {
    const lane = Math.floor(r / 5) % 2 === 0 ? 1 : 0.82;                  // 8 bit-lanes: every 5th row tinted
    for (let s = 0; s < SITES; s++) {
      const h = hashf(r * 131 + s * 7.7);
      const wide = h > 0.8 ? 2 : 1;                                       // some double-width cells
      if (wide === 2 && s % 2) continue;
      const base = PAL[Math.floor(h * 6)];
      const rr = Math.min(255, ((base >> 16) & 255) * lane), gg = Math.min(255, ((base >> 8) & 255) * lane), bb = Math.min(255, (base & 255) * lane);
      const col = (rr << 16) | (gg << 8) | bb;
      const hfrac = HFRAC[Math.floor(hashf(r * 5 + s * 3.3) * HFRAC.length) % HFRAC.length];
      box(c, cellX(s) + (wide - 1) * SW / 2, cellY(r), 0.0085, SW * wide * 0.88, RW * hfrac, 0.0035, col);
      // per-cell pin dot (single-width cells only, to hold the primitive budget)
      if (wide === 1) box(c, cellX(s) + SW * 0.26, cellY(r) + RW * hfrac * 0.38, 0.0098, SW * 0.14, RW * 0.09, 0.0015, 0xd8d0a8);
      // live output state near the dive region — bright = 1, dark = 0
      const dx = s - 40, dy = r - 20;
      if (dx * dx + dy * dy < 230) {
        const seed = r * 97 + s * 13;
        const out = bit(seed, c.time, 1.6 + hashf(seed) * 2.2);
        if (out) box(c, cellX(s), cellY(r), 0.0115, SW * 0.5, RW * 0.35, 0.001, 0x7fd4ff, { glow: true, fade: 0.4 });
      }
    }
  }
  // metal routing layers above the cells (M2/M3 hints) + racing pulses
  for (let i = 0; i < 24; i++) {
    const y = -0.46 + i * 0.04;
    box(c, 0, y, 0.0135, 0.96, 0.0035, 0.0008, 0x707a86);
    const pp = pulsePos(i * 7, c.time, 1.4 + hashf(i) * 1.8);
    if (pp >= 0) box(c, -0.48 + pp * 0.96, y, 0.0145, 0.03, 0.004, 0.001, 0xaee6ff, { glow: true, fade: 0.9 });
  }
  for (let i = 0; i < 16; i++) {
    const x = -0.45 + i * 0.06;
    box(c, x, 0, 0.0155, 0.0035, 0.94, 0.0008, 0x5f6974);
    const pp = pulsePos(300 + i * 3, c.time, 2.1);
    if (pp >= 0) box(c, x, -0.47 + pp * 0.94, 0.0165, 0.004, 0.03, 0.001, 0xaee6ff, { glow: true, fade: 0.9 });
    const pp2 = pulsePos(500 + i * 5, c.time, 1.5);
    if (pp2 >= 0) box(c, x, -0.47 + pp2 * 0.94, 0.017, 0.004, 0.024, 0.001, 0x88ffcc, { glow: true, fade: 0.85 });
  }

  const l = kid(c, K.logiccell.at, logiccell);
  if (l) logiccell.render(l);
};
export const mod: Mod = { spec, render };
