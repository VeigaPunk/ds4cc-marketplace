// One standard logic cell — 1 µm: a NAND2 gate, computing for real. Inputs A and B
// arrive as live bitstreams; the output wire literally carries NAND(A,B).
import { box, kid, aa, type Ctx, type Mod } from "../core/ctx";
import { bit, NAND, AND, pulsePos } from "../core/logic";
import { mod as finfet } from "./finfet";

const K = {
  finfet: { at: { pos: [-0.1, -0.15, 0.12] as const, scale: 0.1 }, mod: () => finfet },
};

export const spec = {
  id: "logiccell", name: "NAND standard cell", size: 1e-6,
  kids: K, dive: "finfet" as const,
  approach: { dir: [0.5, 0.45, 0.76] as const, up: [0, 1, 0] as const },
};

const wire = (c: Ctx, x: number, y: number, w: number, h: number, on: number, z = 0.09) => {
  box(c, x, y, z, w, h, 0.012, on ? 0x9adfff : 0x3a4754);
  if (on) box(c, x, y, z + 0.008, w, h, 0.004, 0x66ccff, { glow: true, fade: 0.75 });
};

// truth-table corner dot: bright glow when the net is 1, dim otherwise — stable position
const dot = (c: Ctx, x: number, y: number, on: number, z = 0.1) => {
  box(c, x, y, z, 0.07, 0.07, 0.02, on ? 0xbfe8ff : 0x2c3742);
  if (on) box(c, x, y, z + 0.012, 0.07, 0.07, 0.006, 0x77d0ff, { glow: true, fade: 0.8 });
};

export const render = (c: Ctx) => {
  const A = bit(1943, c.time, 1.1), B = bit(777, c.time, 0.8), Y = NAND(A, B), Z = AND(A, B);
  box(c, 0, 0, 0, 1.0, 1.0, 0.02, 0x1f2830);                              // cell area
  box(c, 0, 0.42, 0.03, 0.96, 0.1, 0.03, 0x5a6470);                       // VDD rail
  box(c, 0, -0.42, 0.03, 0.96, 0.1, 0.03, 0x39424c);                      // VSS rail
  // diffusion regions (P top for the PFETs, N bottom for the NFETs)
  box(c, 0, 0.18, 0.028, 0.72, 0.2, 0.022, 0x50423a);
  box(c, 0, -0.18, 0.028, 0.72, 0.2, 0.022, 0x3a4a42);
  // n-well boundary outline framing the PFET diffusion (thin frame, own z)
  box(c, 0, 0.28, 0.032, 0.8, 0.008, 0.006, 0x6a5c4e);
  box(c, 0, 0.08, 0.032, 0.8, 0.008, 0.006, 0x6a5c4e);
  box(c, -0.4, 0.18, 0.032, 0.008, 0.2, 0.006, 0x6a5c4e);
  box(c, 0.4, 0.18, 0.032, 0.008, 0.2, 0.006, 0x6a5c4e);
  // fins running horizontally through both
  for (const fy of [0.13, 0.18, 0.23, -0.13, -0.18, -0.23])
    box(c, 0, fy, 0.045, 0.74, 0.02, 0.02, 0x6a5a48);
  // two poly gates (inputs A and B) crossing the fins vertically — live color
  for (const [gx, on] of [[-0.1, A], [0.14, B]] as const) {
    box(c, gx, 0, 0.06, 0.05, 0.86, 0.028, on ? 0xd8f0ff : 0x66727e);
    if (on) box(c, gx, 0, 0.08, 0.05, 0.86, 0.008, 0x77ccff, { glow: true, fade: 0.6 });
  }
  // contacts + metal-1 straps down to the rails
  for (const [cx2, cy] of [[-0.28, 0.18], [0.02, 0.18], [0.3, 0.18], [-0.28, -0.18], [0.3, -0.18]] as const) {
    box(c, cx2, cy, 0.075, 0.035, 0.035, 0.05, 0xc9b26a);
    const railY = cy > 0 ? 0.42 : -0.42;
    box(c, cx2, (cy + railY) / 2, 0.052, 0.02, Math.abs(railY - cy), 0.018, 0x8a9aa8);
  }
  // input wires with live levels, output wire = the actual NAND result
  wire(c, -0.1, 0.32, 0.04, 0.5, A);   // A drops in from the top
  wire(c, 0.14, 0.32, 0.04, 0.5, B);
  wire(c, 0.42, 0, 0.04, 0.6, Y);      // Y out on the right
  wire(c, 0.32, 0.18, 0.18, 0.04, Y);
  // charge flow shimmer through open transistors
  if (A && B) for (let i = 0; i < 4; i++) {
    const p = (c.time * 1.6 + i * 0.25) % 1;
    box(c, -0.28 + p * 0.58, -0.18, 0.06, 0.03, 0.03, 0.02, 0x9fe8ff, { glow: true, fade: 0.5 * (1 - Math.abs(p - 0.5)) });
  }
  // pulses racing from inputs toward the output on each switching edge (same seeds as A, B)
  const ppA = pulsePos(1943, c.time, 1.1);
  if (ppA >= 0) box(c, -0.1 + ppA * 0.5, 0.32 - ppA * 0.14, 0.11, 0.05, 0.05, 0.015, 0xaef0ff, { glow: true, fade: 0.9 });
  const ppB = pulsePos(777, c.time, 0.8);
  if (ppB >= 0) box(c, 0.14 + ppB * 0.28, 0.32 - ppB * 0.14, 0.11, 0.05, 0.05, 0.015, 0xaef0ff, { glow: true, fade: 0.9 });

  // truth-table corner indicators — stable labeled positions: A, B, Y, A·B
  dot(c, -0.44, 0.44, A);
  dot(c, 0.44, 0.44, B);
  dot(c, 0.44, -0.44, Y);
  dot(c, -0.44, -0.44, Z);

  const f = kid(c, K.finfet.at, finfet);
  if (f) finfet.render(f);
};
export const mod: Mod = { spec, render };
