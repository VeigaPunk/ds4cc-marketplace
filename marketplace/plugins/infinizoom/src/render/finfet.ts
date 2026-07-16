// A FinFET — 100 nm field of view: three fins, the gate wrapping over them,
// source/drain epitaxy. The gate runs a live drive waveform; while it is open,
// charge carriers visibly flow source → drain.
import { box, sph, kid, pierce, type Ctx, type Mod } from "../core/ctx";
import { bit, hashf } from "../core/logic";
import { mod as fincross } from "./fincross";

const K = {
  fincross: { at: { pos: [0, 0, 0.02] as const, scale: 0.1 }, mod: () => fincross },
};

export const spec = {
  id: "finfet", name: "FinFET transistor", size: 1e-7,
  kids: K, dive: "fincross" as const,
  approach: { dir: [0.55, 0.5, 0.72] as const, up: [0, 1, 0] as const },
};

const FIN_X = [-0.345, -0.115, 0.115, 0.345];                             // faceted fin segment centers

export const render = (c: Ctx) => {
  const G = bit(42, c.time, 0.9);                                         // the drive waveform
  const sh = pierce(c, 0.68, 0.92);                                       // gate + dived fin dissolve at the dive
  box(c, 0, 0, -0.1, 1.0, 1.0, 0.18, 0x3a3f46);                           // substrate slab
  box(c, 0, 0, 0.0, 1.0, 1.0, 0.02, 0x2e333a);                            // STI oxide floor
  for (const fy of [-0.22, 0, 0.22]) {
    const isCtr = fy === 0;
    // the fins — segmented into subtle facets instead of one flat slab (center one is pierced)
    FIN_X.forEach((fx, i) => {
      const jz = (hashf(i * 3.1 + fy * 9.7) - 0.5) * 0.006;
      box(c, fx, fy, 0.09 + jz, 0.235, 0.09, 0.16, 0x8a6f52, { fade: isCtr ? sh : 1 });
    });
    // gate-oxide skin: thin bright film at the fin/gate interface
    box(c, 0, fy, 0.172, 0.9, 0.085, 0.006, 0xdff3ff, { fade: isCtr ? sh : 1 });
    // source/drain epitaxy — stepped diamond-ish facet stack at both ends
    for (const ex of [-0.36, 0.36]) {
      box(c, ex, fy, 0.13, 0.2, 0.16, 0.14, 0x4a8a5a);
      box(c, ex, fy, 0.2, 0.13, 0.11, 0.06, 0x5aa06a);
      box(c, ex, fy, 0.245, 0.07, 0.065, 0.03, 0x6ab87a);
    }
  }
  // the gate: wraps over all three fins — glows when driven high, dissolves when pierced
  box(c, 0, 0, 0.15, 0.14, 0.96, 0.26, G ? 0xd8ecff : 0x707d8c, { fade: sh });
  box(c, 0, 0, 0.285, 0.15, 0.97, 0.015, G ? 0xeaf6ff : 0x8894a2, { fade: sh });
  if (G) box(c, 0, 0, 0.19, 0.18, 0.98, 0.3, 0x66bbff, { glow: true, fade: 0.35 * sh });
  // spacers flanking the gate — outer spacer + inner nitride liner
  box(c, -0.1, 0, 0.14, 0.045, 0.94, 0.22, 0x4a5560);
  box(c, 0.1, 0, 0.14, 0.045, 0.94, 0.22, 0x4a5560);
  box(c, -0.128, 0, 0.14, 0.018, 0.93, 0.2, 0x3a4550);
  box(c, 0.128, 0, 0.14, 0.018, 0.93, 0.2, 0x3a4550);
  // gate contact + S/D contacts — stacked metal-fill segments for grain texture
  box(c, 0, 0.44, 0.3, 0.1, 0.08, 0.14, 0xc9b26a);
  for (const ex of [-0.36, 0.36]) for (let s = 0; s < 4; s++) {
    box(c, ex, 0, 0.195 + s * 0.02, 0.095, 0.78, 0.018, s % 2 ? 0xb8a35c : 0xc7b56a);
  }
  // interlayer-dielectric posts around the active area
  for (const px of [-0.46, 0.46]) for (const py of [-0.42, 0.42]) {
    box(c, px, py, 0.22, 0.05, 0.05, 0.24, 0x333a44);
  }
  // metal-0 straps above the source/drain contacts
  box(c, -0.36, 0, 0.345, 0.14, 0.82, 0.02, 0xd9a55c);
  box(c, 0.36, 0, 0.345, 0.14, 0.82, 0.02, 0xd9a55c);
  // carriers: dense arcing stream through the channel while open, thermal shimmer while closed
  if (G) {
    for (const fy of [-0.22, 0, 0.22]) for (let i = 0; i < 12; i++) {
      const p = (c.time * 1.3 + i / 12 + fy) % 1;
      const arc = Math.sin(p * Math.PI) * 0.02;
      sph(c, -0.36 + p * 0.72, fy, 0.11 + arc, 0.032, 0x8fe0ff, { glow: true, fade: 0.75 * Math.sin(p * Math.PI) });
      for (const tr of [0.035, 0.07]) {
        const pt = ((p - tr) % 1 + 1) % 1, at = Math.sin(pt * Math.PI) * 0.02, k = 1 - tr * 6;
        sph(c, -0.36 + pt * 0.72, fy, 0.11 + at, 0.032 * k, 0x8fe0ff, { glow: true, fade: 0.3 * Math.sin(pt * Math.PI) * k });
      }
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const fy = (hashf(i * 5.3) - 0.5) * 0.5, fx = (hashf(i * 8.9) - 0.5) * 0.9;
      const tw = Math.sin(c.time * 2 + i * 3.7) * 0.5 + 0.5;
      sph(c, fx, fy, 0.1, 0.02, 0x6a7a88, { glow: true, fade: 0.12 * tw });
    }
  }
  // waveform trace floating beside the device (the live gate signal) — with axis baseline
  box(c, 0, 0.42, 0.36, 0.94, 0.006, 0.01, 0x1f2a24);
  for (let i = 0; i < 24; i++) {
    const tt = c.time - (23 - i) * 0.07;
    const v = bit(42, tt, 0.9);
    box(c, -0.46 + i * 0.04, 0.42 + v * 0.06, 0.365, 0.036, 0.014, 0.012, v ? 0x8fffc0 : 0x3d5548, { glow: true, fade: 0.65 + 0.3 * v });
  }

  const f = kid(c, K.fincross.at, fincross);
  if (f) fincross.render(f);
};
export const mod: Mod = { spec, render };
