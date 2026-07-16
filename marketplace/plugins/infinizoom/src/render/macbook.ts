// MacBook Pro 14" — 0.32 m across. Base in the XZ plane, lid leaning back 20°.
// THE fork: bit 0 (A) dives through the deck into the chassis, bit 1 (D) into the screen.
import { box, sph, cyl, kid, aa, pierce, branchBit, local, smooth, type Ctx, type Mod } from "../core/ctx";
import { hashf } from "../core/logic";
import { mod as chassis } from "./chassis";
import { mod as screen } from "./screen";

const LID = aa(1, 0, 0, -20 * Math.PI / 180);
const K = {
  chassis: { at: { pos: [0, -0.045, 0.02] as const, scale: 0.94 }, mod: () => chassis },
  screen: { at: { pos: [0, 0.345, -0.467] as const, scale: 0.97, quat: LID }, mod: () => screen },
};

export const spec = {
  id: "macbook", name: "MacBook Pro", size: 0.32,
  kids: K, dive: ["chassis", "screen"] as [string, string],
  approach: { dir: [0.3, 0.85, 0.75] as const, up: [0, 1, 0] as const },
};

const ROWS = [
  "`1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./", "fnczov cmd  ", // last row approximated
];

export const render = (c: Ctx) => {
  const u = local(c);
  // deck fades only when the ride dives into the chassis (bit 0)
  const deckFade = branchBit(0) === 0 && u > -2 ? pierce(c, 0.55, 0.88) : 1;
  // ---- base ----
  box(c, 0, -0.026, 0.02, 0.97, 0.028, 0.68, 0xb8bcc2, { fade: Math.max(deckFade, 0.0) }); // bottom case… fades with deck? no: only top deck opens
  box(c, 0, -0.0405, 0.02, 0.9, 0.002, 0.6, 0xa9adb4);                    // bottom plate detail
  for (const [x, z] of [[-0.4, -0.24], [0.4, -0.24], [-0.4, 0.28], [0.4, 0.28]] as const)
    cyl(c, x, -0.0435, z + 0.02, 0.024, 0.004, 0x3f4247);                 // rubber feet
  // top deck
  box(c, 0, -0.006, 0.02, 0.97, 0.012, 0.68, 0xc3c7cd, { fade: deckFade });
  // keyboard well + keys
  box(c, 0, 0.0005, -0.115, 0.62, 0.002, 0.245, 0x17181b, { fade: deckFade });
  for (let r = 0; r < 6; r++) {
    const n = r === 0 ? 13 : r === 5 ? 9 : ROWS[Math.min(r - 1, 3)].length + 1;
    const rowOff = (r % 2) * 0.008, gap = 0.006;                          // consistent gap → regular columns per row
    let cursor = -0.29 + rowOff;
    for (let i = 0; i < n; i++) {
      const w = r === 5 && (i === 3) ? 0.16 : 0.038;                      // space bar
      const kx = cursor + w / 2;
      cursor += w + gap;
      if (kx > 0.31) continue;
      const kz = -0.215 + r * 0.041;
      const seed = r * 100 + i;
      const legW = w * (0.22 + hashf(seed) * 0.18), legOffX = (hashf(seed + 50) - 0.5) * w * 0.3; // per-key legend variety
      box(c, kx, 0.004, kz, w, r === 0 ? 0.004 : 0.006, r === 0 ? 0.022 : 0.036, 0x2a2c30, { fade: deckFade });
      box(c, kx, 0.0075, kz, w * 0.86, 0.001, (r === 0 ? 0.022 : 0.036) * 0.8, 0x35373c, { fade: deckFade }); // cap top
      box(c, kx + legOffX, 0.0085, kz - 0.004, legW, 0.0004, 0.008, 0xb9bdc4, { fade: deckFade });            // legend blob
    }
  }
  // trackpad + its click line
  box(c, 0, 0.0008, 0.185, 0.36, 0.0018, 0.24, 0xb2b6bd, { fade: deckFade });
  box(c, 0, 0.0012, 0.185, 0.355, 0.0004, 0.235, 0xbfc3ca, { fade: deckFade });
  // speaker grilles flanking the keyboard
  for (const sx of [-0.42, 0.42]) for (let i = 0; i < 40; i++)
    sph(c, sx + ((i % 4) - 1.5) * 0.014, 0.0015, -0.22 + Math.floor(i / 4) * 0.024, 0.005, 0x55585e, { fade: deckFade });
  // ports: 3 thunderbolt left, hdmi+sd right, magsafe
  for (let i = 0; i < 3; i++) box(c, -0.487, -0.02, -0.13 + i * 0.09, 0.006, 0.008, 0.028, 0x1c1d20);
  box(c, -0.487, -0.02, -0.24, 0.006, 0.01, 0.04, 0x1c1d20);              // magsafe
  sph(c, -0.492, -0.02, -0.24, 0.006, 0xffaa33, { glow: true, fade: 0.6 }); // magsafe charge-status LED
  box(c, 0.487, -0.02, -0.1, 0.006, 0.012, 0.045, 0x1c1d20);              // hdmi
  box(c, 0.487, -0.02, 0.0, 0.006, 0.006, 0.055, 0x1c1d20);               // sd
  // hinge barrel
  cyl(c, 0, 0.002, -0.335, 0.03, 0.84, 0x9a9ea5, { q: aa(0, 0, 1, Math.PI / 2) });
  // regulatory/spec label strip on the bottom case
  box(c, 0, -0.0425, 0.22, 0.16, 0.0006, 0.05, 0xc7cbd1);
  for (let i = 0; i < 6; i++)
    box(c, -0.06 + i * 0.021, -0.044, 0.2 + (i % 2) * 0.03, 0.016, 0.0003, 0.006, 0x8a8e95);

  const ch = kid(c, K.chassis.at, chassis);
  if (ch) chassis.render(ch);
  const sc = kid(c, K.screen.at, screen);
  if (sc) screen.render(sc);
};
export const mod: Mod = { spec, render };
