// The silicon crystal lattice — 2.2 nm across (four 0.543 nm unit cells per side),
// diamond-cubic, thermally jiggling. One unit cell is the dive.
import { sph, cyl, kid, aa, type Ctx, type Mod } from "../core/ctx";
import { mod as unitcell } from "./unitcell";

const K = {
  unitcell: { at: { pos: [0.1235, 0.1235, 0.1235] as const, scale: 0.247 }, mod: () => unitcell },
};

export const spec = {
  id: "lattice", name: "silicon lattice · 0.543 nm pitch", size: 2.2e-9,
  kids: K, dive: "unitcell" as const,
  approach: { dir: [0.6, 0.55, 0.58] as const, up: [0, 1, 0] as const },
};

// diamond-cubic basis within one cell (fractional coordinates)
const BASIS = [
  [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
  [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75],
] as const;

export const render = (c: Ctx) => {
  const A = 0.247;                                                        // one cell edge in frame units
  const jig = (i: number, j: number, k: number, b: number) => {
    const s = i * 61 + j * 17 + k * 5 + b * 131;
    return Math.sin(c.time * 7 + s) * 0.006;                              // thermal vibration
  };
  for (let i = -2; i < 2; i++) for (let j = -2; j < 2; j++) for (let k = -2; k < 2; k++) {
    // skip the dived cell's interior atoms — the unitcell module renders itself
    const isDive = i === 0 && j === 0 && k === 0;
    for (let b = 0; b < 8; b++) {
      if (isDive) continue;
      const [fx, fy, fz] = BASIS[b];
      sph(c, (i + fx) * A + jig(i, j, k, b), (j + fy) * A + jig(j, k, i, b + 3), (k + fz) * A + jig(k, i, j, b + 5),
        0.055, b < 4 ? 0x9a8a6a : 0xb59a70);
    }
    // tetrahedral bonds within the cell (first-shell only, coarse at this range)
    for (let b = 4; b < 8; b++) {
      if (isDive) continue;
      const [fx, fy, fz] = BASIS[b];
      const [gx, gy, gz] = BASIS[0];
      cyl(c, (i + (fx + gx + fx) / 3) * A, (j + (fy + gy + fy) / 3) * A, (k + (fz + gz + fz) / 3) * A, 0.012, 0.09, 0x6a5f4c,
        { q: aa(fx - gx, fz - gz === 0 ? 0.01 : -(fx - gx), 0, Math.PI / 3) });
    }
  }
  const u = kid(c, K.unitcell.at, unitcell);
  if (u) unitcell.render(u);
};
export const mod: Mod = { spec, render };
