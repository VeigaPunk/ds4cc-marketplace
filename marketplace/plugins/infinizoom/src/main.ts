// infinizoom — mutable state is EXACTLY: t, branches, raw input. Every frame is a
// pure function of (t, branches, input, wall-clock time).
import * as THREE from "three";
import { scene, beginPools, commitPools, setLinePoint, LINE_POINTS, screenTex, setScreenQuad, BG } from "./core/pools";
import { beginFrame, smooth, type Ctx, type V3 } from "./core/ctx";
import { buildChain, trackPoint, route } from "./core/track";
import { drawScreen } from "./core/screenimg";
import { setHud, setFork } from "./hud";
import { render as renderRoom } from "./render/room";

// ---- mutable state ----
let t = 0.05;
const branches: number[] = [];
const keys = new Set<string>();
const mouse = { x: 0.5, y: 0.42 };
// -----------------------

addEventListener("keydown", (e: KeyboardEvent) => {
  keys.add(e.code);
  if (e.code === "KeyA" && Math.floor(t) === FORK) branches[0] = 0;
  if (e.code === "KeyD" && Math.floor(t) === FORK) branches[0] = 1;
});
addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.code));
addEventListener("mousemove", (e: MouseEvent) => { mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight; });

const FORK = route([]).findIndex((m) => Array.isArray(m.spec.dive));

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(BG);
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.002, 40000);
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const qTrack = new THREE.Quaternion(), qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion();
const vFwd = new THREE.Vector3();
let last = performance.now();

const frame = (now: number) => {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;

  // ride: W deeper, S back — eased near the fork and the track ends
  const N0 = route(branches).length;
  let v = 1.0;
  v *= 0.42 + 0.58 * smooth(0.1, 0.8, Math.abs(t - (FORK + 0.55)));            // gentle at the fork
  v *= 0.25 + 0.75 * smooth(-0.05, 0.7, Math.min(t - 0.03, N0 - 0.32 - t));    // gentle at the ends
  if (keys.has("KeyW")) t += dt * v;
  if (keys.has("KeyS")) t -= dt * v;

  // the branch bitstring: pushed passing the fork, live while inside it, popped backing out
  if (Math.floor(t) >= FORK && branches.length === 0) branches.push(0);
  if (t < FORK && branches.length > 0) branches.pop();
  const N = route(branches).length;
  t = Math.min(N - 0.32, Math.max(0.03, t));

  const ch = buildChain(t, branches);

  // glance: full 360° — mouse x wraps all the way around
  qTrack.set(ch.camQuat[0], ch.camQuat[1], ch.camQuat[2], ch.camQuat[3]);
  qYaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -(mouse.x - 0.5) * Math.PI * 2);
  qPitch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -(mouse.y - 0.42) * Math.PI * 0.9);
  camera.quaternion.copy(qTrack).multiply(qYaw).multiply(qPitch);
  camera.position.set(0, 0, 0);
  vFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);

  drawScreen(time);
  screenTex.needsUpdate = true;
  setScreenQuad(null, 0);
  beginPools();
  beginFrame(ch.entries, [vFwd.x, vFwd.y, vFwd.z], branches);

  const e0 = ch.entries[0];
  const root: Ctx = { cx: e0.cx, cy: e0.cy, cz: e0.cz, qx: e0.qx, qy: e0.qy, qz: e0.qz, qw: e0.qw, f: e0.f, depth: 0, onPath: true, t, time, fade: 1 };
  renderRoom(root);

  // the green line — the path itself, sampled through nearby frames
  for (let i = 0; i < LINE_POINTS; i++) {
    const s = i / (LINE_POINTS - 1);
    const t2 = t - 3.2 + s * 6.6;
    const p = trackPoint(ch, Math.min(N - 0.06, Math.max(0.02, t2)), branches) as V3 | null;
    const taper = smooth(0, 0.06, s) * (1 - smooth(0.94, 1, s));
    if (p) setLinePoint(i, p[0], p[1], p[2], taper);
    else setLinePoint(i, 0, 0, -1, 0);
  }

  commitPools();
  const k = ch.k, m0 = ch.mods[k].spec, m1 = ch.mods[Math.min(N - 1, k + 1)].spec;
  setHud(m0.name, m0.size * Math.pow(m1.size / m0.size, ch.u));
  setFork(t > FORK - 0.75 && t < FORK + 0.9, branches[0] ?? 0);
  renderer.render(scene, camera);
};
requestAnimationFrame(frame);

// dev hook: teleport along the track (state stays exactly {t, branches, input})
Object.defineProperty(window, "__izT", { get: () => t, set: (x: number) => { t = x; } });
(window as unknown as { __izB: number[] }).__izB = branches;
