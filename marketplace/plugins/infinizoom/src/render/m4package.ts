// The Apple M4 package — 45 mm. Substrate with the die center-left and two
// LPDDR5X stacks sharing the substrate, ringed by passives.
import { box, kid, type Ctx, type Mod } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as die } from "./die";

const K = {
  die: { at: { pos: [-0.16, 0, 0.028] as const, scale: 0.29 }, mod: () => die },
};

export const spec = {
  id: "m4package", name: "Apple M4 package", size: 0.045,
  kids: K, dive: "die" as const,
  approach: { dir: [0.5, 0.45, 0.78] as const, up: [0, 1, 0] as const },
};

export const render = (c: Ctx) => {
  box(c, 0, 0, 0, 1.0, 0.84, 0.05, 0x0d2418);                             // substrate
  box(c, 0, 0, 0.0255, 0.98, 0.82, 0.001, 0x123021);
  // LPDDR stacks, right side, with printed marks
  for (const my of [0.2, -0.2] as const) {
    box(c, 0.3, my, 0.045, 0.32, 0.3, 0.04, 0x15171b);
    box(c, 0.3, my + 0.06, 0.066, 0.24, 0.02, 0.001, 0x3c4046);
    box(c, 0.3, my, 0.066, 0.2, 0.015, 0.001, 0x33363c);
    box(c, 0.3, my - 0.06, 0.066, 0.26, 0.015, 0.001, 0x33363c);
  }
  // ring of package passives
  for (let i = 0; i < 60; i++) {
    const a = hashf(i * 11.3);
    const onX = i % 2 === 0;
    const x = onX ? (hashf(i * 5.1) - 0.5) * 0.9 : (i % 4 < 2 ? -0.47 : 0.47);
    const y = onX ? (i % 4 < 2 ? -0.38 : 0.38) : (hashf(i * 5.1) - 0.5) * 0.7;
    box(c, x, y, 0.028, 0.014 + a * 0.01, 0.008, 0.006, i % 3 ? 0x8a6a30 : 0x777c84);
  }
  // solder ball hints along edge
  for (let i = 0; i < 24; i++) box(c, -0.46 + i * 0.04, -0.405, 0.012, 0.012, 0.012, 0.01, 0x9aa0a8);

  const d = kid(c, K.die.at, die);
  if (d) die.render(d);
};
export const mod: Mod = { spec, render };
