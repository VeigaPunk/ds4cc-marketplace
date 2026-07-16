// Live digital signals — pure functions of (seed, wall-clock time). Gates compute
// REAL boolean functions of these; the whole die twinkles from the same clock.
export const CLK = 2.4; // switching frequency, tuned to be perceptible

const h = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// a net's logic level at time — pseudo-random bitstream, stable per seed
export const bit = (seed: number, time: number, freq = CLK): 0 | 1 =>
  h(Math.floor(time * freq) * 7.13 + seed * 13.7) > 0.5 ? 1 : 0;

// brightness of a net: 1-levels bright, 0-levels dark, with a short pulse on edges
export const netGlow = (seed: number, time: number, freq = CLK): number => {
  const b = bit(seed, time, freq), prev = bit(seed, time - 1 / freq, freq);
  const ph = (time * freq) % 1;
  const edge = b !== prev ? Math.max(0, 1 - ph * 3) : 0;
  return 0.14 + 0.86 * b + edge * 0.6;
};

// a pulse racing along a wire: position 0..1 after each switching edge (else -1)
export const pulsePos = (seed: number, time: number, freq = CLK): number => {
  const b = bit(seed, time, freq), prev = bit(seed, time - 1 / freq, freq);
  if (b === prev) return -1;
  const ph = (time * freq) % 1;
  return ph < 0.45 ? ph / 0.45 : -1;
};

export const NAND = (a: 0 | 1, b: 0 | 1): 0 | 1 => (a && b ? 0 : 1);
export const AND = (a: 0 | 1, b: 0 | 1): 0 | 1 => (a && b ? 1 : 0);
export const OR = (a: 0 | 1, b: 0 | 1): 0 | 1 => (a || b ? 1 : 0);
export const NOR = (a: 0 | 1, b: 0 | 1): 0 | 1 => (a || b ? 0 : 1);
export const XOR = (a: 0 | 1, b: 0 | 1): 0 | 1 => ((a ^ b) as 0 | 1);
export const NOT = (a: 0 | 1): 0 | 1 => (a ? 0 : 1);
export const hashf = h;
