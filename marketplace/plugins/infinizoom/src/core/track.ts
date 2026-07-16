// The track is authored from the SAME layout constants that place the geometry:
// each level's curve runs from its own entry pose to the entry pose of its dive
// child, mapped through the child's Place. One source of truth — no drift.
import type { Mod, Quat, V3 } from "./ctx";
import { rotV, mulQuat } from "./ctx";
import { mod as room } from "../render/room";

export const ENTRY_D = 1.6; // camera arrival distance, in each level's own units

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const slerpV = (a: V3, b: V3, u: number): V3 => {
  const d = Math.min(1, Math.max(-1, dot(a, b)));
  const w = Math.acos(d);
  if (w < 1e-4) return norm(add(mul(a, 1 - u), mul(b, u)));
  const s = Math.sin(w);
  return norm(add(mul(a, Math.sin((1 - u) * w) / s), mul(b, Math.sin(u * w) / s)));
};
const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

export const route = (branches: number[]): Mod[] => {
  const mods: Mod[] = [room];
  let fork = 0;
  for (;;) {
    const s = mods[mods.length - 1].spec;
    if (!s.dive) return mods;
    const id = typeof s.dive === "string" ? s.dive : s.dive[branches[fork++] ?? 0];
    mods.push(s.kids[id].mod());
  }
};

const entryDir = (m: Mod): V3 => norm(m.spec.approach?.dir ?? [0.55, 0.8, 0.5]);
const entryLen = (m: Mod): number => m.spec.approach?.entryD ?? ENTRY_D;
const entryUp = (m: Mod): V3 => norm(m.spec.approach?.up ?? [0, 1, 0]);
// which kid level j dives into — the Nth fork consumes the Nth branch bit, same as route()
const diveIdAt = (mods: Mod[], j: number, branches: number[]): string | undefined => {
  const d = mods[j].spec.dive;
  if (d === undefined) return undefined;
  if (typeof d === "string") return d;
  let fi = 0;
  for (let i = 0; i < j; i++) if (Array.isArray(mods[i].spec.dive)) fi++;
  return d[branches[fi] ?? 0];
};

// camera pose inside level k's own frame — pure function of (u, route)
export const poseInLevel = (mods: Mod[], k: number, u: number, branches: number[]): { pos: V3; look: V3; up: V3 } => {
  const m = mods[k];
  const did = diveIdAt(mods, k, branches);
  const A = mul(entryDir(m), entryLen(m));
  let c: V3 = [0, 0, 0], B: V3, upEnd: V3;
  if (did) {
    const at = m.spec.kids[did].at;
    const q = at.quat ?? ([0, 0, 0, 1] as Quat);
    c = at.pos;
    B = add(c, mul(rotV(q, mul(entryDir(mods[k + 1]), entryLen(mods[k + 1]))), at.scale));
    upEnd = rotV(q, entryUp(mods[k + 1]));
  } else { // deepest level: settle into a slow close orbit
    B = mul(rotV([0, Math.sin(0.6), 0, Math.cos(0.6)], entryDir(m)), 0.5);
    upEnd = entryUp(m);
  }
  const a = sub(A, c), b = sub(B, c);
  const ra = Math.max(1e-9, Math.hypot(...a)), rb = Math.max(1e-9, Math.hypot(...b));
  const r = ra * Math.pow(rb / ra, u);                    // exponential shrink → constant zoom feel
  const dir = slerpV(norm(a), norm(b), u);                // gentle arc, never a dead-straight ray
  const pos = add(c, mul(dir, r));
  // gaze: structure center on arrival, easing onto the grandchild dive point at handoff
  let look: V3 = c;
  if (did) {
    const at = m.spec.kids[did].at;
    const q = at.quat ?? ([0, 0, 0, 1] as Quat);
    const nextId = diveIdAt(mods, k + 1, branches);
    const nd: V3 = nextId ? mods[k + 1].spec.kids[nextId].at.pos : [0, 0, 0];
    const s = u * u * (3 - 2 * u);
    look = add(c, mul(rotV(q, nd), at.scale * s));
  }
  const up = slerpV(entryUp(m), norm(upEnd), u);
  return { pos, look, up };
};

const lookQuat = (pos: V3, look: V3, up: V3): Quat => {
  const z = norm(sub(pos, look));
  let x = cross(up, z);
  if (Math.hypot(...x) < 1e-5) x = cross([up[1], up[2], up[0]], z);
  x = norm(x);
  const y = cross(z, x);
  // rotation matrix (x y z columns) → quaternion
  const m00 = x[0], m01 = y[0], m02 = z[0], m10 = x[1], m11 = y[1], m12 = z[1], m20 = x[2], m21 = y[2], m22 = z[2];
  const tr = m00 + m11 + m22;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]; }
  if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11); return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
};

export type ChainEntry = { id: string; cx: number; cy: number; cz: number; qx: number; qy: number; qz: number; qw: number; f: number };

export type Chain = { entries: ChainEntry[]; camQuat: Quat; k: number; u: number; mods: Mod[] };

export const buildChain = (t: number, branches: number[]): Chain => {
  const mods = route(branches);
  const N = mods.length;
  const k = Math.min(N - 1, Math.max(0, Math.floor(t)));
  const u = t - k;
  const { pos, look, up } = poseInLevel(mods, k, u, branches);
  const camQuat = lookQuat(pos, look, up);
  const entries: ChainEntry[] = new Array(Math.min(N, k + 5));
  entries[k] = { id: mods[k].spec.id, cx: pos[0], cy: pos[1], cz: pos[2], qx: 0, qy: 0, qz: 0, qw: 1, f: 1 };
  for (let j = k - 1; j >= 0; j--) { // upward: coarse scales, precision loss invisible there
    const did = diveIdAt(mods, j, branches)!;
    const at = mods[j].spec.kids[did].at;
    const q = at.quat ?? ([0, 0, 0, 1] as Quat);
    const e = entries[j + 1];
    const p = rotV(q, [e.cx, e.cy, e.cz]);
    const rq = mulQuat([e.qx, e.qy, e.qz, e.qw], conj(q));
    entries[j] = {
      id: mods[j].spec.id,
      cx: at.pos[0] + p[0] * at.scale, cy: at.pos[1] + p[1] * at.scale, cz: at.pos[2] + p[2] * at.scale,
      qx: rq[0], qy: rq[1], qz: rq[2], qw: rq[3], f: e.f / at.scale,
    };
  }
  for (let j = k + 1; j < Math.min(N, k + 5); j++) { // downward: exact division, no loss
    const did = diveIdAt(mods, j - 1, branches)!;
    const at = mods[j - 1].spec.kids[did].at;
    const q = at.quat ?? ([0, 0, 0, 1] as Quat);
    const e = entries[j - 1];
    const p = rotV(conj(q), [e.cx - at.pos[0], e.cy - at.pos[1], e.cz - at.pos[2]]);
    const rq = mulQuat([e.qx, e.qy, e.qz, e.qw], q);
    entries[j] = {
      id: mods[j].spec.id,
      cx: p[0] / at.scale, cy: p[1] / at.scale, cz: p[2] / at.scale,
      qx: rq[0], qy: rq[1], qz: rq[2], qw: rq[3], f: e.f * at.scale,
    };
  }
  return { entries, camQuat, k, u, mods };
};

// a track point at t', expressed in render space (current-frame units, camera-relative)
export const trackPoint = (ch: Chain, t2: number, branches: number[]): V3 | null => {
  const N = ch.mods.length;
  const k2 = Math.min(N - 1, Math.max(0, Math.floor(t2)));
  const e = ch.entries[k2];
  if (!e) return null;
  const { pos } = poseInLevel(ch.mods, k2, t2 - k2, branches);
  const v = rotV([e.qx, e.qy, e.qz, e.qw], [pos[0] - e.cx, pos[1] - e.cy, pos[2] - e.cz]);
  return [v[0] * e.f, v[1] * e.f, v[2] * e.f];
};
