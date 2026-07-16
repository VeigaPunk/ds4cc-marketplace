// The scale-space core. Every renderer works in its own ~unit-sized local frame;
// Ctx re-expresses the camera into that frame. All math in JS numbers (doubles);
// Float32 appears only inside the instance buffers at push time.
import { pools, pushInstance } from "./pools";

export type Quat = readonly [number, number, number, number]; // x y z w
export type V3 = readonly [number, number, number];
export const QID: Quat = [0, 0, 0, 1];

export type Place = { pos: V3; scale: number; quat?: Quat };
export type Spec = {
  id: string;
  name: string;            // HUD title
  size: number;            // physical meters across (HUD scale; one source of truth)
  kids: Record<string, { at: Place; mod: () => Mod }>;
  dive?: string | [string, string]; // kid id — pair = the fork (index by branch bit)
  approach?: { dir?: V3; up?: V3; entryD?: number }; // camera entry direction/up/distance in THIS frame
};
export type Mod = { spec: Spec; render: (c: Ctx) => void };

export type Ctx = {
  cx: number; cy: number; cz: number;          // camera position in this frame (doubles)
  qx: number; qy: number; qz: number; qw: number; // frame → render-space rotation
  f: number;                                    // frame → render-space scale
  depth: number;                                // == level index when on the active path
  onPath: boolean;
  t: number; time: number;
  fade: number;
};

// Per-frame globals (derived registers, reset each frame — not world state).
export type ChainEntry = { id: string; cx: number; cy: number; cz: number; qx: number; qy: number; qz: number; qw: number; f: number };
let chain: ChainEntry[] = [];
let fwd: V3 = [0, 0, -1];
let branchBits: number[] = [];
export const beginFrame = (c: ChainEntry[], camForward: V3, branches: number[]) => { chain = c; fwd = camForward; branchBits = branches; };
export const branchBit = (i: number) => branchBits[i] ?? 0;

// quat · v (inline, alloc-free)
const rot = (qx: number, qy: number, qz: number, qw: number, x: number, y: number, z: number, out: number[]) => {
  const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
};
const mulQ = (ax: number, ay: number, az: number, aw: number, bx: number, by: number, bz: number, bw: number, out: number[]) => {
  out[0] = aw * bx + ax * bw + ay * bz - az * by;
  out[1] = aw * by + ay * bw + az * bx - ax * bz;
  out[2] = aw * bz + az * bw + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
};
const T0: number[] = [0, 0, 0], T1: number[] = [0, 0, 0, 0];

// <0 approaching · 0..1 riding this level · >1 deeper. Only the active path has a
// meaningful relationship to t — off-path structures read as "not yet approached".
export const local = (c: Ctx) => (c.onPath ? c.t - c.depth : -1);
// Shell fade for surfaces the camera pierces: 1 far away, 0 once passed. Symmetric in both directions.
export const pierce = (c: Ctx, from = 0.55, to = 0.88) => {
  const u = local(c);
  return u <= from ? 1 : u >= to ? 0 : 1 - (u - from) / (to - from);
};
export const smooth = (a: number, b: number, x: number) => {
  const s = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return s * s * (3 - 2 * s);
};

const FOG0 = 160, FOG1 = 2600;

// Enter a child frame. Returns null when the kid is sub-pixel or fully behind the glance.
export const kid = (c: Ctx, at: Place, mod: Mod, fade = 1): Ctx | null => {
  const q = at.quat ?? QID;
  const rx = at.pos[0] - c.cx, ry = at.pos[1] - c.cy, rz = at.pos[2] - c.cz;
  const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
  const rad = at.scale * 0.9;
  if (dist > rad * 2.5) {
    if ((rad / dist) * 1 < 0.0015) return null;                       // sub-pixel
    rot(c.qx, c.qy, c.qz, c.qw, rx, ry, rz, T0);
    if ((dist - rad) * c.f > FOG1) return null;                       // beyond fog
    const dot = (T0[0] * fwd[0] + T0[1] * fwd[1] + T0[2] * fwd[2]) / dist;
    if (dot < -0.45) return null;                                     // fully behind the glance
  }
  const sub = chain[c.depth + 1];
  const f2 = fade * c.fade;
  if (f2 < 0.015) return null;
  if (c.onPath && sub && sub.id === mod.spec.id) {
    return { cx: sub.cx, cy: sub.cy, cz: sub.cz, qx: sub.qx, qy: sub.qy, qz: sub.qz, qw: sub.qw, f: sub.f, depth: c.depth + 1, onPath: true, t: c.t, time: c.time, fade: f2 };
  }
  // camera into child frame: R⁻¹(cam − p)/s   ·   rotation composes frame→render
  const cx0 = c.cx - at.pos[0], cy0 = c.cy - at.pos[1], cz0 = c.cz - at.pos[2];
  rot(-q[0], -q[1], -q[2], q[3], cx0, cy0, cz0, T0);
  mulQ(c.qx, c.qy, c.qz, c.qw, q[0], q[1], q[2], q[3], T1);
  return {
    cx: T0[0] / at.scale, cy: T0[1] / at.scale, cz: T0[2] / at.scale,
    qx: T1[0], qy: T1[1], qz: T1[2], qw: T1[3],
    f: c.f * at.scale, depth: c.depth + 1, onPath: false, t: c.t, time: c.time, fade: f2,
  };
};

export type EmitOpts = { q?: Quat; fade?: number; glow?: boolean };

const emit = (
  pool: "box" | "sph" | "cyl", c: Ctx,
  x: number, y: number, z: number, sx: number, sy: number, sz: number,
  color: number, o?: EmitOpts,
) => {
  const rx = x - c.cx, ry = y - c.cy, rz = z - c.cz;
  const px = rx * c.f, py = ry * c.f, pz = rz * c.f; // still doubles
  rot(c.qx, c.qy, c.qz, c.qw, px, py, pz, T0);
  const dist = Math.sqrt(T0[0] * T0[0] + T0[1] * T0[1] + T0[2] * T0[2]);
  const size = Math.max(sx, Math.max(sy, sz)) * c.f;
  if (dist - size > FOG1) return;
  const app = size / (dist + 1e-9);
  if (app < 0.0011 && dist > size * 3) return;                        // sub-pixel: never emitted
  const dot = dist > 1e-9 ? (T0[0] * fwd[0] + T0[1] * fwd[1] + T0[2] * fwd[2]) / dist : 1;
  if (dot < -0.5 && dist > size * 2.5) return;                        // off-screen behind
  const glow = o?.glow ?? false;
  let f = c.fade * (o?.fade ?? 1);
  if (glow) f *= 1 - smooth(FOG0 * 0.6, FOG1 * 0.8, dist);            // manual fade: additive ignores fog
  const thin = Math.min(sx, Math.min(sy, sz)) * c.f;                  // distance to surface ≈ dist − half thinnest extent
  f *= smooth(0.045, 0.19, dist - thin * 0.55);                       // things being passed fade out, never pop
  if (dist > size * 3) f *= smooth(0.0011, 0.0026, app);              // …and tiny far things fade in, never pop
  if (f < 0.02) return;
  const q = o?.q;
  let qx = c.qx, qy = c.qy, qz = c.qz, qw = c.qw;
  if (q) { mulQ(c.qx, c.qy, c.qz, c.qw, q[0], q[1], q[2], q[3], T1); qx = T1[0]; qy = T1[1]; qz = T1[2]; qw = T1[3]; }
  const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
  const P = glow ? (pool === "sph" ? pools.gsph : pools.gbox) : pools[pool];
  pushInstance(P, T0[0], T0[1], T0[2], qx, qy, qz, qw, sx * c.f, sy * c.f, sz * c.f, r, g, b, f);
};

export const box = (c: Ctx, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, o?: EmitOpts) =>
  emit("box", c, x, y, z, sx, sy, sz, color, o);
export const sph = (c: Ctx, x: number, y: number, z: number, d: number, color: number, o?: EmitOpts) =>
  emit("sph", c, x, y, z, d, d, d, color, o);
export const cyl = (c: Ctx, x: number, y: number, z: number, d: number, h: number, color: number, o?: EmitOpts) =>
  emit("cyl", c, x, y, z, d, h, d, color, o);

// axis-angle → quat helper for layout constants
export const aa = (ax: number, ay: number, az: number, angle: number): Quat => {
  const s = Math.sin(angle / 2), l = Math.hypot(ax, ay, az) || 1;
  return [ax / l * s, ay / l * s, az / l * s, Math.cos(angle / 2)];
};
export const mulQuat = (a: Quat, b: Quat): Quat => { const o: number[] = [0, 0, 0, 0]; mulQ(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3], o); return o as unknown as Quat; };
export const rotV = (q: Quat, v: V3): V3 => { const o: number[] = [0, 0, 0]; rot(q[0], q[1], q[2], q[3], v[0], v[1], v[2], o); return [o[0], o[1], o[2]]; };
