// src/main.ts
import * as THREE3 from "three";

// src/core/pools.ts
import * as THREE from "three";

// src/core/screenimg.ts
var SW = 1024;
var SH = 666;
var VIDEO = { x: 560, y: 356, w: 408, h: 272 };
var DIVE_PX = { x: VIDEO.x + 204, y: VIDEO.y + 160 };
var screenCanvas = document.createElement("canvas");
screenCanvas.width = SW;
screenCanvas.height = SH;
var g = screenCanvas.getContext("2d", { willReadFrequently: true });
var wall = new Image;
wall.src = "/wallpaper.jpg";
var hash = (n) => {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var win = (x, y, w, h, title, body) => {
  g.save();
  g.shadowColor = "rgba(0,0,0,.45)";
  g.shadowBlur = 18;
  g.shadowOffsetY = 6;
  g.fillStyle = body;
  g.beginPath();
  g.roundRect(x, y, w, h, 9);
  g.fill();
  g.shadowColor = "transparent";
  g.fillStyle = "rgba(58,58,64,.98)";
  g.beginPath();
  g.roundRect(x, y, w, 26, [9, 9, 0, 0]);
  g.fill();
  const dots = ["#ff5f57", "#febc2e", "#28c840"];
  dots.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x + 16 + i * 18, y + 13, 5.5, 0, 7);
    g.fill();
  });
  g.fillStyle = "rgba(235,235,240,.85)";
  g.font = "600 12px system-ui";
  g.textAlign = "center";
  g.fillText(title, x + w / 2, y + 17);
  g.textAlign = "left";
  g.restore();
};
var drawScreen = (time) => {
  if (wall.complete && wall.naturalWidth)
    g.drawImage(wall, 0, 0, SW, SH);
  else {
    const gr = g.createLinearGradient(0, 0, 0, SH);
    gr.addColorStop(0, "#1b2c54");
    gr.addColorStop(1, "#c96a3a");
    g.fillStyle = gr;
    g.fillRect(0, 0, SW, SH);
  }
  win(38, 56, 440, 336, "infinizoom — main.ts", "#1e2129");
  g.font = "12px ui-monospace, monospace";
  for (let i = 0;i < 22; i++) {
    const y = 100 + i * 13.5, r = hash(i * 7 + 1);
    g.fillStyle = "#5a6478";
    g.fillText(String(i + 1).padStart(2), 50, y);
    let x = 78 + i % 5 * 16;
    const n = 2 + Math.floor(r * 4);
    for (let j = 0;j < n; j++) {
      const w = 22 + hash(i * 13 + j * 5) * 58;
      g.fillStyle = ["#c678dd", "#61afef", "#98c379", "#e5c07b", "#abb2bf"][Math.floor(hash(i * 3 + j) * 5)];
      g.fillRect(x, y - 9, w, 9);
      x += w + 9;
    }
  }
  win(96, 268, 356, 240, "Finder — render", "#22252d");
  g.fillStyle = "#1a1d24";
  g.fillRect(96, 294, 92, 214);
  ["Recents", "Desktop", "render", "core", "assets"].forEach((s, i) => {
    g.fillStyle = i === 2 ? "#61afef" : "#8a93a6";
    g.font = "11px system-ui";
    g.fillText(s, 108, 314 + i * 20);
  });
  const names = ["room", "desk", "macbook", "die", "pcore", "alu", "finfet", "atom", "quark"];
  for (let i = 0;i < 9; i++) {
    const fx = 206 + i % 4 * 62, fy = 310 + Math.floor(i / 4) * 62;
    g.fillStyle = "#5b9bd5";
    g.beginPath();
    g.roundRect(fx, fy, 40, 30, 4);
    g.fill();
    g.fillStyle = "#7fb6e8";
    g.fillRect(fx, fy - 4, 16, 6);
    g.fillStyle = "#aeb6c4";
    g.font = "10px system-ui";
    g.textAlign = "center";
    g.fillText(names[i] + ".ts", fx + 20, fy + 44);
    g.textAlign = "left";
  }
  win(496, 84, 420, 244, "bun run server — zsh", "rgba(18,20,24,.96)");
  g.font = "12px ui-monospace, monospace";
  const lines = ["$ bun run server", "infinizoom built (312 kB)", "infinizoom riding at :3000", "[track] 26 levels · 17 decades", "[pools] 45k boxes · 60 fps", "$ "];
  lines.forEach((s, i) => {
    g.fillStyle = s.startsWith("$") ? "#7ee787" : "#9aa5b1";
    g.fillText(s, 512, 132 + i * 17);
  });
  if (time % 1 < 0.55) {
    g.fillStyle = "#7ee787";
    g.fillRect(529, 132 + 5 * 17 - 10, 8, 13);
  }
  win(VIDEO.x - 8, VIDEO.y - 34, VIDEO.w + 16, VIDEO.h + 42, "aurora.mov ▸", "#101014");
  const { x, y, w, h } = VIDEO;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = "#03040a";
  g.fillRect(x, y, w, h);
  for (let i = 0;i < 3; i++) {
    const cx = x + w * (0.5 + 0.34 * Math.sin(time * (0.7 + i * 0.23) + i * 2.1));
    const cy = y + h * (0.5 + 0.3 * Math.cos(time * (0.5 + i * 0.31) + i * 1.7));
    const gr = g.createRadialGradient(cx, cy, 6, cx, cy, 120);
    const hue = (time * 40 + i * 120) % 360;
    gr.addColorStop(0, `hsla(${hue},95%,60%,.95)`);
    gr.addColorStop(1, "hsla(0,0%,0%,0)");
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
  }
  g.strokeStyle = `hsl(${time * 90 % 360},100%,70%)`;
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0;i <= 40; i++) {
    const px = x + w * i / 40, py = y + h * (0.5 + 0.28 * Math.sin(i * 0.5 + time * 3.1));
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke();
  g.restore();
  g.fillStyle = "rgba(255,255,255,.75)";
  g.fillRect(x + 8, y + h - 14, w - 90, 3);
  g.fillStyle = "#fff";
  g.fillRect(x + 8 + time * 13 % (w - 90), y + h - 17, 3, 9);
  g.fillStyle = "rgba(28,30,36,.72)";
  g.fillRect(0, 0, SW, 24);
  g.fillStyle = "#e8e8ec";
  g.font = "600 13px system-ui";
  g.fillText("", 14, 17);
  g.font = "13px system-ui";
  ["Finder", "File", "Edit", "View", "Go", "Window", "Help"].forEach((s, i) => g.fillText(s, 42 + i * 54, 17));
  const d = new Date;
  g.textAlign = "right";
  g.fillText(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`, SW - 14, 17);
  g.fillText("◨ ☰", SW - 64, 17);
  g.textAlign = "left";
  const dw = 470, dx = (SW - dw) / 2, dy = SH - 54;
  g.fillStyle = "rgba(40,42,50,.55)";
  g.beginPath();
  g.roundRect(dx, dy, dw, 46, 14);
  g.fill();
  const icons = ["#3b82f6", "#0ea5e9", "#38bdf8", "#ef4444", "#eab308", "#22c55e", "#a855f7", "#14b8a6", "#1f2937", "#6b7280"];
  icons.forEach((c, i) => {
    const ix = dx + 12 + i * 45;
    g.fillStyle = c;
    g.beginPath();
    g.roundRect(ix, dy + 6, 34, 34, 8);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.85)";
    g.font = "700 15px system-ui";
    g.textAlign = "center";
    g.fillText(["☺", "⎈", "✉", "▶", "♪", "⌗", ">_", "☁", "⌫", "⚙"][i], ix + 17, dy + 29);
    g.textAlign = "left";
  });
  frameData = null;
};
var frameData = null;
var samplePixel = (x, y) => {
  if (!frameData)
    frameData = g.getImageData(0, 0, SW, SH);
  const xi = Math.min(SW - 1, Math.max(0, Math.round(x))), yi = Math.min(SH - 1, Math.max(0, Math.round(y)));
  const i = (yi * SW + xi) * 4, d = frameData.data;
  return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
};

// src/core/pools.ts
var BG = 658448;
var injectFade = (mat) => {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute float aFade; varying float vFade;`).replace("#include <begin_vertex>", `#include <begin_vertex>
vFade = aFade;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying float vFade;`).replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.a *= vFade;`);
  };
};
var makePool = (geo, cap, glow) => {
  const mat = glow ? new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }) : new THREE.MeshLambertMaterial({ alphaHash: true });
  injectFade(mat);
  const g = geo.clone();
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
  fade.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aFade", fade);
  const mesh = new THREE.InstancedMesh(g, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  if (glow)
    mesh.renderOrder = 5;
  return { mesh, fade, cap };
};
var box = makePool(new THREE.BoxGeometry(1, 1, 1), 45000, false);
var sph = makePool(new THREE.SphereGeometry(0.5, 14, 10), 12000, false);
var cyl = makePool(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), 9000, false);
var gbox = makePool(new THREE.BoxGeometry(1, 1, 1), 30000, true);
var gsph = makePool(new THREE.SphereGeometry(0.5, 18, 12), 16000, true);
var pools = { box, sph, cyl, gbox, gsph };
var LINE_N = 400;
var linePos = new THREE.BufferAttribute(new Float32Array(LINE_N * 3), 3);
linePos.setUsage(THREE.DynamicDrawUsage);
var lineAlpha = new THREE.BufferAttribute(new Float32Array(LINE_N), 1);
lineAlpha.setUsage(THREE.DynamicDrawUsage);
var lineGeo = new THREE.BufferGeometry;
lineGeo.setAttribute("position", linePos);
lineGeo.setAttribute("aA", lineAlpha);
var lineMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: false,
  vertexShader: `attribute float aA; varying float vA;
    void main(){ vA=aA; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.30,1.0,0.55,0.55*vA); }`
});
var greenLine = new THREE.Line(lineGeo, lineMat);
greenLine.frustumCulled = false;
greenLine.renderOrder = 8;
var setLinePoint = (i, x, y, z, a) => {
  linePos.setXYZ(i, x, y, z);
  lineAlpha.setX(i, a);
};
var screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
var screenMat = new THREE.MeshBasicMaterial({ map: screenTex, transparent: true, depthWrite: true, toneMapped: false });
var screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), screenMat);
screenQuad.frustumCulled = false;
var setScreenQuad = (m, opacity) => {
  if (!m || opacity < 0.01) {
    screenQuad.visible = false;
    return;
  }
  screenQuad.visible = true;
  screenQuad.matrixAutoUpdate = false;
  screenQuad.matrix.copy(m);
  screenMat.opacity = opacity;
};
var scene = new THREE.Scene;
scene.fog = new THREE.Fog(BG, 160, 2600);
scene.add(box.mesh, sph.mesh, cyl.mesh, gbox.mesh, gsph.mesh, greenLine, screenQuad);
scene.add(new THREE.HemisphereLight(13625599, 3813928, 0.85));
var sun = new THREE.DirectionalLight(16773596, 1.6);
sun.position.set(0.6, 0.9, 0.35);
scene.add(sun, new THREE.AmbientLight(16777215, 0.35));
var M = new THREE.Matrix4;
var Q = new THREE.Quaternion;
var P = new THREE.Vector3;
var S = new THREE.Vector3;
var pushInstance = (p, px, py, pz, qx, qy, qz, qw, sx, sy, sz, r, g, b, f) => {
  const i = p.mesh.count;
  if (i >= p.cap) {
    if (i === p.cap)
      console.warn("pool overflow", p.cap);
    return;
  }
  Q.set(qx, qy, qz, qw);
  P.set(px, py, pz);
  S.set(sx, sy, sz);
  M.compose(P, Q, S);
  M.toArray(p.mesh.instanceMatrix.array, i * 16);
  const c = p.mesh.instanceColor.array;
  c[i * 3] = r;
  c[i * 3 + 1] = g;
  c[i * 3 + 2] = b;
  p.fade.array[i] = f;
  p.mesh.count = i + 1;
};
var beginPools = () => {
  for (const p of Object.values(pools))
    p.mesh.count = 0;
};
var commitPools = () => {
  for (const p of Object.values(pools)) {
    p.mesh.instanceMatrix.needsUpdate = true;
    p.mesh.instanceColor.needsUpdate = true;
    p.fade.needsUpdate = true;
  }
  linePos.needsUpdate = true;
  lineAlpha.needsUpdate = true;
};
var LINE_POINTS = LINE_N;

// src/core/ctx.ts
var QID = [0, 0, 0, 1];
var chain = [];
var fwd = [0, 0, -1];
var branchBits = [];
var beginFrame = (c, camForward, branches) => {
  chain = c;
  fwd = camForward;
  branchBits = branches;
};
var branchBit = (i) => branchBits[i] ?? 0;
var rot = (qx, qy, qz, qw, x, y, z, out) => {
  const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
};
var mulQ = (ax, ay, az, aw, bx, by, bz, bw, out) => {
  out[0] = aw * bx + ax * bw + ay * bz - az * by;
  out[1] = aw * by + ay * bw + az * bx - ax * bz;
  out[2] = aw * bz + az * bw + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
};
var T0 = [0, 0, 0];
var T1 = [0, 0, 0, 0];
var local = (c) => c.onPath ? c.t - c.depth : -1;
var pierce = (c, from = 0.55, to = 0.88) => {
  const u = local(c);
  return u <= from ? 1 : u >= to ? 0 : 1 - (u - from) / (to - from);
};
var smooth = (a, b, x) => {
  const s = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return s * s * (3 - 2 * s);
};
var FOG0 = 160;
var FOG1 = 2600;
var kid = (c, at, mod, fade = 1) => {
  const q = at.quat ?? QID;
  const rx = at.pos[0] - c.cx, ry = at.pos[1] - c.cy, rz = at.pos[2] - c.cz;
  const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
  const rad = at.scale * 0.9;
  if (dist > rad * 2.5) {
    if (rad / dist * 1 < 0.0015)
      return null;
    rot(c.qx, c.qy, c.qz, c.qw, rx, ry, rz, T0);
    if ((dist - rad) * c.f > FOG1)
      return null;
    const dot = (T0[0] * fwd[0] + T0[1] * fwd[1] + T0[2] * fwd[2]) / dist;
    if (dot < -0.45)
      return null;
  }
  const sub = chain[c.depth + 1];
  const f2 = fade * c.fade;
  if (f2 < 0.015)
    return null;
  if (c.onPath && sub && sub.id === mod.spec.id) {
    return { cx: sub.cx, cy: sub.cy, cz: sub.cz, qx: sub.qx, qy: sub.qy, qz: sub.qz, qw: sub.qw, f: sub.f, depth: c.depth + 1, onPath: true, t: c.t, time: c.time, fade: f2 };
  }
  const cx0 = c.cx - at.pos[0], cy0 = c.cy - at.pos[1], cz0 = c.cz - at.pos[2];
  rot(-q[0], -q[1], -q[2], q[3], cx0, cy0, cz0, T0);
  mulQ(c.qx, c.qy, c.qz, c.qw, q[0], q[1], q[2], q[3], T1);
  return {
    cx: T0[0] / at.scale,
    cy: T0[1] / at.scale,
    cz: T0[2] / at.scale,
    qx: T1[0],
    qy: T1[1],
    qz: T1[2],
    qw: T1[3],
    f: c.f * at.scale,
    depth: c.depth + 1,
    onPath: false,
    t: c.t,
    time: c.time,
    fade: f2
  };
};
var emit = (pool, c, x, y, z, sx, sy, sz, color, o) => {
  const rx = x - c.cx, ry = y - c.cy, rz = z - c.cz;
  const px = rx * c.f, py = ry * c.f, pz = rz * c.f;
  rot(c.qx, c.qy, c.qz, c.qw, px, py, pz, T0);
  const dist = Math.sqrt(T0[0] * T0[0] + T0[1] * T0[1] + T0[2] * T0[2]);
  const size = Math.max(sx, Math.max(sy, sz)) * c.f;
  if (dist - size > FOG1)
    return;
  const app = size / (dist + 0.000000001);
  if (app < 0.0011 && dist > size * 3)
    return;
  const dot = dist > 0.000000001 ? (T0[0] * fwd[0] + T0[1] * fwd[1] + T0[2] * fwd[2]) / dist : 1;
  if (dot < -0.5 && dist > size * 2.5)
    return;
  const glow = o?.glow ?? false;
  let f = c.fade * (o?.fade ?? 1);
  if (glow)
    f *= 1 - smooth(FOG0 * 0.6, FOG1 * 0.8, dist);
  const thin = Math.min(sx, Math.min(sy, sz)) * c.f;
  f *= smooth(0.045, 0.19, dist - thin * 0.55);
  if (dist > size * 3)
    f *= smooth(0.0011, 0.0026, app);
  if (f < 0.02)
    return;
  const q = o?.q;
  let { qx, qy, qz, qw } = c;
  if (q) {
    mulQ(c.qx, c.qy, c.qz, c.qw, q[0], q[1], q[2], q[3], T1);
    qx = T1[0];
    qy = T1[1];
    qz = T1[2];
    qw = T1[3];
  }
  const r = (color >> 16 & 255) / 255, g = (color >> 8 & 255) / 255, b = (color & 255) / 255;
  const P = glow ? pool === "sph" ? pools.gsph : pools.gbox : pools[pool];
  pushInstance(P, T0[0], T0[1], T0[2], qx, qy, qz, qw, sx * c.f, sy * c.f, sz * c.f, r, g, b, f);
};
var box2 = (c, x, y, z, sx, sy, sz, color, o) => emit("box", c, x, y, z, sx, sy, sz, color, o);
var sph2 = (c, x, y, z, d, color, o) => emit("sph", c, x, y, z, d, d, d, color, o);
var cyl2 = (c, x, y, z, d, h, color, o) => emit("cyl", c, x, y, z, d, h, d, color, o);
var aa = (ax, ay, az, angle) => {
  const s = Math.sin(angle / 2), l = Math.hypot(ax, ay, az) || 1;
  return [ax / l * s, ay / l * s, az / l * s, Math.cos(angle / 2)];
};
var mulQuat = (a, b) => {
  const o = [0, 0, 0, 0];
  mulQ(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3], o);
  return o;
};
var rotV = (q, v) => {
  const o = [0, 0, 0];
  rot(q[0], q[1], q[2], q[3], v[0], v[1], v[2], o);
  return [o[0], o[1], o[2]];
};

// src/core/logic.ts
var CLK = 2.4;
var h = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var bit = (seed, time, freq = CLK) => h(Math.floor(time * freq) * 7.13 + seed * 13.7) > 0.5 ? 1 : 0;
var netGlow = (seed, time, freq = CLK) => {
  const b = bit(seed, time, freq), prev = bit(seed, time - 1 / freq, freq);
  const ph = time * freq % 1;
  const edge = b !== prev ? Math.max(0, 1 - ph * 3) : 0;
  return 0.14 + 0.86 * b + edge * 0.6;
};
var pulsePos = (seed, time, freq = CLK) => {
  const b = bit(seed, time, freq), prev = bit(seed, time - 1 / freq, freq);
  if (b === prev)
    return -1;
  const ph = time * freq % 1;
  return ph < 0.45 ? ph / 0.45 : -1;
};
var NAND = (a, b) => a && b ? 0 : 1;
var AND = (a, b) => a && b ? 1 : 0;
var hashf = h;

// src/render/quark.ts
var spec = {
  id: "quark",
  name: "up quark",
  size: 0.0000000000000001,
  kids: {},
  approach: { dir: [0.5, 0.55, 0.65], up: [0, 1, 0] }
};
var render = (c) => {
  const hueShell = (i) => [16730698, 4915046, 4877055][(Math.floor(c.time * 1.5) + i) % 3];
  sph2(c, 0, 0, 0, 0.02, 16777215);
  for (let i = 0;i < 5; i++) {
    const R = 0.07 + i * 0.09 + Math.sin(c.time * 3 + i * 1.7) * 0.015;
    sph2(c, 0, 0, 0, R, hueShell(i), { glow: true, fade: 0.18 / (1 + i) });
  }
  for (let i = 0;i < 16; i++) {
    const a = c.time * (1.5 + i % 4 * 0.4) + i * 1.9, r = 0.1 + i % 5 * 0.07;
    sph2(c, Math.cos(a) * r, Math.sin(a * 1.4) * r * 0.8, Math.sin(a) * r, 0.014, 16770184, { glow: true, fade: 0.6 });
  }
};
var mod = { spec, render };

// src/render/nucleon.ts
var K = {
  quark: { at: { pos: [0.15, -0.1, 0.08], scale: 0.06 }, mod: () => mod }
};
var spec2 = {
  id: "nucleon",
  name: "proton",
  size: 0.0000000000000017,
  kids: K,
  dive: "quark",
  approach: { dir: [0.55, 0.55, 0.6], up: [0, 1, 0] }
};
var QCOL = [16734810, 5963626, 5929727];
var render2 = (c) => {
  const qp = (i) => {
    if (i === 2)
      return [0.15, -0.1, 0.08];
    const a = c.time * 1.2 + i * 2.1;
    return [Math.cos(a) * 0.22, Math.sin(a * 1.3) * 0.2, Math.sin(a) * 0.18];
  };
  for (let i = 0;i < 3; i++) {
    if (i === 2)
      continue;
    const [x, y, z] = qp(i);
    const col = QCOL[Math.floor((c.time * 1.5 + i * 1.1) % 3)];
    sph2(c, x, y, z, 0.07, col);
    sph2(c, x, y, z, 0.13, col, { glow: true, fade: 0.25 });
  }
  for (let i = 0;i < 3; i++) {
    const [ax, ay, az] = qp(i), [bx, by, bz] = qp((i + 1) % 3);
    for (let s = 0;s < 8; s++) {
      const t2 = (s + 0.5) / 8, w = Math.sin(t2 * Math.PI) * 0.03 * Math.sin(c.time * 6 + i * 2 + s);
      sph2(c, ax + (bx - ax) * t2 + w, ay + (by - ay) * t2 - w, az + (bz - az) * t2, 0.028, 16768896, { glow: true, fade: 0.3 });
    }
  }
  for (let i = 0;i < 24; i++) {
    const ph = (c.time * 1.8 + hashf(i * 7.7) * 5) % 1;
    if (ph > 0.35)
      continue;
    const x = (hashf(i * 3.1) - 0.5) * 0.7, y = (hashf(i * 5.9) - 0.5) * 0.7, z = (hashf(i * 9.3) - 0.5) * 0.7;
    sph2(c, x, y, z, 0.02, QCOL[i % 3], { glow: true, fade: Math.sin(ph / 0.35 * Math.PI) * 0.7 });
  }
  sph2(c, 0, 0, 0, 0.85, 16756832, { glow: true, fade: 0.07 });
  const q = kid(c, K.quark.at, mod);
  if (q)
    mod.render(q);
};
var mod2 = { spec: spec2, render: render2 };

// src/render/nucleus.ts
var K2 = {
  nucleon: { at: { pos: [0.12, 0.08, 0.05], scale: 0.17 }, mod: () => mod2 }
};
var spec3 = {
  id: "nucleus",
  name: "nucleus",
  size: 0.00000000000001,
  kids: K2,
  dive: "nucleon",
  approach: { dir: [0.5, 0.62, 0.55], up: [0, 1, 0] }
};
var N = [];
for (let i = 0;i < 28; i++) {
  const g = i / 28, a = i * 2.399963, r = 0.34 * Math.sqrt(g);
  const z = (g * 2 - 1) * 0.3;
  N.push({ p: [Math.cos(a) * r, Math.sin(a) * r, z], proton: i % 2 === 0 });
}
var render3 = (c) => {
  N.forEach((n, i) => {
    const isDive = i === 6;
    const jx = Math.sin(c.time * 4 + i * 2.1) * 0.02, jy = Math.cos(c.time * 3.4 + i * 1.3) * 0.02, jz = Math.sin(c.time * 5.1 + i) * 0.02;
    if (isDive)
      return;
    sph2(c, n.p[0] + jx, n.p[1] + jy, n.p[2] + jz, 0.17, n.proton ? 13658714 : 8029332);
    sph2(c, n.p[0] + jx, n.p[1] + jy, n.p[2] + jz, 0.2, n.proton ? 16748656 : 10531016, { glow: true, fade: 0.05 });
  });
  for (let i = 0;i < 20; i++) {
    const a = N[Math.floor(hashf(i * 3.7) * 28)], b = N[Math.floor(hashf(i * 9.1) * 28)];
    const ph = (c.time * 2.5 + hashf(i * 5.3) * 3) % 1;
    if (ph > 0.4)
      continue;
    const t2 = ph / 0.4;
    sph2(c, a.p[0] + (b.p[0] - a.p[0]) * t2, a.p[1] + (b.p[1] - a.p[1]) * t2, a.p[2] + (b.p[2] - a.p[2]) * t2, 0.05, 16769136, { glow: true, fade: 0.8 * Math.sin(t2 * Math.PI) });
  }
  sph2(c, 0, 0, 0, 0.9, 16747088, { glow: true, fade: 0.06 });
  const n2 = kid(c, K2.nucleon.at, mod2);
  if (n2)
    mod2.render(n2);
};
var mod3 = { spec: spec3, render: render3 };

// src/render/atom.ts
var K3 = {
  nucleus: { at: { pos: [0, 0, 0], scale: 0.000091 }, mod: () => mod3 }
};
var spec4 = {
  id: "atom",
  name: "atom",
  size: 0.00000000011,
  kids: K3,
  dive: "nucleus",
  approach: { dir: [0.55, 0.6, 0.58], up: [0, 1, 0] }
};
var render4 = (c) => {
  for (let s = 0;s < 3; s++) {
    const R = [0.48, 0.3, 0.14][s];
    const q = aa(1, 0.4 * s, 0.3, 0.5 + s * 0.9);
    for (let i = 0;i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      const p = rotV(q, [Math.cos(a) * R, Math.sin(a) * R, 0]);
      sph2(c, p[0], p[1], p[2], 0.006, 5601945, { glow: true, fade: 0.3 });
    }
    const ne = [2, 4, 4][s];
    for (let e = 0;e < ne; e++) {
      const a = c.time * (2.2 - s * 0.5) + e / ne * Math.PI * 2;
      const p = rotV(q, [Math.cos(a) * R, Math.sin(a) * R, 0]);
      sph2(c, p[0], p[1], p[2], 0.03, 8376575, { glow: true });
      sph2(c, p[0], p[1], p[2], 0.014, 15400959);
    }
  }
  for (let s = 0;s < 10; s++) {
    const R = 0.5 * Math.pow(0.38, s);
    if (R * c.f < 0.002)
      break;
    sph2(c, 0, 0, 0, R, s % 2 ? 2771558 : 3357022, { glow: true, fade: 0.16 + 0.025 * s });
    for (let i = 0;i < 8; i++) {
      const a = i * 2.4 + c.time * (0.4 + s * 0.2), b = i * 1.7 + s;
      sph2(c, Math.cos(a) * Math.sin(b) * R * 0.9, Math.sin(a) * Math.sin(b) * R * 0.9, Math.cos(b) * R * 0.9, R * 0.05, 8961006, { glow: true, fade: 0.25 * (0.5 + 0.5 * Math.sin(c.time * 3 + i + s)) });
    }
  }
  sph2(c, 0, 0, 0, 0.002, 16765040, { glow: true, fade: 0.6 + 0.3 * Math.sin(c.time * 5) });
  const n = kid(c, K3.nucleus.at, mod3);
  if (n)
    mod3.render(n);
};
var mod4 = { spec: spec4, render: render4 };

// src/render/unitcell.ts
var K4 = {
  atom: { at: { pos: [0.25 - 0.5, 0.25 - 0.5, 0.25 - 0.5], scale: 0.2 }, mod: () => mod4 }
};
var spec5 = {
  id: "unitcell",
  name: "unit cell · 0.543 nm",
  size: 0.000000000543,
  kids: K4,
  dive: "atom",
  approach: { dir: [0.62, 0.5, 0.55], up: [0, 1, 0] }
};
var F = (v) => v - 0.5;
var SITES = [];
for (const x of [0, 1])
  for (const y of [0, 1])
    for (const z of [0, 1])
      SITES.push({ p: [F(x), F(y), F(z)], tetra: false });
for (const [x, y, z] of [[0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], [0.5, 0.5, 1], [0.5, 1, 0.5], [1, 0.5, 0.5]])
  SITES.push({ p: [F(x), F(y), F(z)], tetra: false });
for (const [x, y, z] of [[0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]])
  SITES.push({ p: [F(x), F(y), F(z)], tetra: true });
var BONDS = [];
for (const t of SITES.filter((s) => s.tetra))
  for (const s of SITES.filter((s) => !s.tetra)) {
    const d = Math.hypot(t.p[0] - s.p[0], t.p[1] - s.p[1], t.p[2] - s.p[2]);
    if (d < 0.45)
      BONDS.push([t.p, s.p]);
  }
var render5 = (c) => {
  for (const a of [-0.5, 0.5])
    for (const b of [-0.5, 0.5]) {
      cyl2(c, a, b, 0, 0.004, 1, 6979744, { q: aa(1, 0, 0, Math.PI / 2), glow: true, fade: 0.12 });
      cyl2(c, a, 0, b, 0.004, 1, 6979744, { glow: true, fade: 0.12 });
      cyl2(c, 0, a, b, 0.004, 1, 6979744, { q: aa(0, 0, 1, Math.PI / 2), glow: true, fade: 0.12 });
    }
  const jig = (i) => Math.sin(c.time * 7 + i * 3.1) * 0.008;
  SITES.forEach((s, i) => {
    const isDive = s.tetra && s.p[0] < 0 && s.p[1] < 0 && s.p[2] < 0;
    if (isDive)
      return;
    sph2(c, s.p[0] + jig(i), s.p[1] + jig(i + 9), s.p[2] + jig(i + 17), s.tetra ? 0.15 : 0.13, s.tetra ? 13674600 : 11901552);
    sph2(c, s.p[0], s.p[1], s.p[2], s.tetra ? 0.2 : 0.17, 16767120, { glow: true, fade: 0.05 });
  });
  BONDS.forEach(([a, b], i) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    const ax = dz, az = -dx, aw = len + dy;
    const n = Math.hypot(ax, az, aw) || 1;
    cyl2(c, mx + jig(i), my, mz, 0.03, len - 0.24, 9075292, { q: [ax / n, 0, az / n, aw / n] });
  });
  const a2 = kid(c, K4.atom.at, mod4);
  if (a2)
    mod4.render(a2);
};
var mod5 = { spec: spec5, render: render5 };

// src/render/lattice.ts
var K5 = {
  unitcell: { at: { pos: [0.1235, 0.1235, 0.1235], scale: 0.247 }, mod: () => mod5 }
};
var spec6 = {
  id: "lattice",
  name: "silicon lattice · 0.543 nm pitch",
  size: 0.0000000022,
  kids: K5,
  dive: "unitcell",
  approach: { dir: [0.6, 0.55, 0.58], up: [0, 1, 0] }
};
var BASIS = [
  [0, 0, 0],
  [0.5, 0.5, 0],
  [0.5, 0, 0.5],
  [0, 0.5, 0.5],
  [0.25, 0.25, 0.25],
  [0.75, 0.75, 0.25],
  [0.75, 0.25, 0.75],
  [0.25, 0.75, 0.75]
];
var render6 = (c) => {
  const A = 0.247;
  const jig = (i, j, k, b) => {
    const s = i * 61 + j * 17 + k * 5 + b * 131;
    return Math.sin(c.time * 7 + s) * 0.006;
  };
  for (let i = -2;i < 2; i++)
    for (let j = -2;j < 2; j++)
      for (let k = -2;k < 2; k++) {
        const isDive = i === 0 && j === 0 && k === 0;
        for (let b = 0;b < 8; b++) {
          if (isDive)
            continue;
          const [fx, fy, fz] = BASIS[b];
          sph2(c, (i + fx) * A + jig(i, j, k, b), (j + fy) * A + jig(j, k, i, b + 3), (k + fz) * A + jig(k, i, j, b + 5), 0.055, b < 4 ? 10127978 : 11901552);
        }
        for (let b = 4;b < 8; b++) {
          if (isDive)
            continue;
          const [fx, fy, fz] = BASIS[b];
          const [gx, gy, gz] = BASIS[0];
          cyl2(c, (i + (fx + gx + fx) / 3) * A, (j + (fy + gy + fy) / 3) * A, (k + (fz + gz + fz) / 3) * A, 0.012, 0.09, 6971212, { q: aa(fx - gx, fz - gz === 0 ? 0.01 : -(fx - gx), 0, Math.PI / 3) });
        }
      }
  const u = kid(c, K5.unitcell.at, mod5);
  if (u)
    mod5.render(u);
};
var mod6 = { spec: spec6, render: render6 };

// src/render/fincross.ts
var K6 = {
  lattice: { at: { pos: [0, -0.15, 0], scale: 0.22 }, mod: () => mod6 }
};
var spec7 = {
  id: "fincross",
  name: "inside the fin",
  size: 0.00000001,
  kids: K6,
  dive: "lattice",
  approach: { dir: [0.5, 0.55, 0.7], up: [0, 1, 0] }
};
var render7 = (c) => {
  box2(c, 0, 0.44, 0, 1, 0.14, 0.5, 9081760);
  box2(c, 0, 0.345, 0, 1, 0.05, 0.5, 6977158);
  box2(c, 0, 0.305, 0, 1, 0.03, 0.5, 8018570);
  box2(c, 0, 0.283, 0, 1, 0.014, 0.5, 11577472);
  box2(c, 0, -0.11, 0, 1, 0.77, 0.5, 5523004, { fade: pierce(c, 0.72, 0.92) });
  const siSh = pierce(c, 0.72, 0.92);
  for (let i = 0;i < 56; i++) {
    const x = (hashf(i * 3.3) - 0.5) * 0.94, y = 0.24 - hashf(i * 7.1) * 0.5, z = (hashf(i * 11.7) - 0.5) * 0.44;
    const col = i % 2 ? 14514746 : 9061580;
    sph2(c, x, y, z, 0.028, col);
    sph2(c, x, y, z, 0.05, col, { glow: true, fade: 0.18 });
    const flash = hashf(i * 5.5 + Math.floor(c.time * 0.6));
    if (flash > 0.985) {
      const ph = c.time * 0.6 % 1;
      sph2(c, x, y, z, 0.09, 16777215, { glow: true, fade: 0.35 * Math.sin(ph * Math.PI) ** 2 });
    }
  }
  for (const iy of [0.37, 0.32, 0.29, 0.276]) {
    for (let s = 0;s < 16; s++) {
      const x = -0.47 + s * (0.94 / 15);
      const jy = (hashf(s * 4.4 + iy * 17.3) - 0.5) * 0.012;
      const jz = (hashf(s * 6.6 + iy * 9.1) - 0.5) * 0.4;
      sph2(c, x, iy + jy, jz, 0.016, 15262408);
    }
  }
  for (const side of [-1, 1])
    for (let r = 0;r < 4; r++) {
      const rowShear = side * r * 0.014;
      for (let s = 0;s < 8; s++) {
        const bx = side * (0.36 + s * 0.014) + rowShear, by = 0.18 - r * 0.09, bz = -0.18 + s * 0.05;
        sph2(c, bx, by, bz, 0.018, 6986346);
      }
    }
  for (let r = 0;r < 6; r++)
    for (let s = 0;s < 12; s++)
      sph2(c, -0.45 + s * 0.082, -0.28 - r * 0.04, 0.05 + Math.sin(s * 2 + r) * 0.03, 0.022, 6969928);
  box2(c, -0.52, 0.1, 0, 0.08, 0.3, 0.46, 4876874);
  box2(c, 0.52, 0.1, 0, 0.08, 0.3, 0.46, 4876874);
  for (let i = 0;i < 5; i++) {
    const zc = -0.2 + i * 0.1, wave = Math.sin(c.time * 3 - i * 1.1) * 0.5 + 0.5;
    box2(c, 0, -0.11, zc, 0.94, 0.7, 0.03, 16771528, { glow: true, fade: (0.08 + 0.22 * wave) * siSh });
  }
  const l = kid(c, K6.lattice.at, mod6);
  if (l)
    mod6.render(l);
};
var mod7 = { spec: spec7, render: render7 };

// src/render/finfet.ts
var K7 = {
  fincross: { at: { pos: [0, 0, 0.02], scale: 0.1 }, mod: () => mod7 }
};
var spec8 = {
  id: "finfet",
  name: "FinFET transistor",
  size: 0.0000001,
  kids: K7,
  dive: "fincross",
  approach: { dir: [0.55, 0.5, 0.72], up: [0, 1, 0] }
};
var FIN_X = [-0.345, -0.115, 0.115, 0.345];
var render8 = (c) => {
  const G = bit(42, c.time, 0.9);
  const sh = pierce(c, 0.68, 0.92);
  box2(c, 0, 0, -0.1, 1, 1, 0.18, 3817286);
  box2(c, 0, 0, 0, 1, 1, 0.02, 3027770);
  for (const fy of [-0.22, 0, 0.22]) {
    const isCtr = fy === 0;
    FIN_X.forEach((fx, i) => {
      const jz = (hashf(i * 3.1 + fy * 9.7) - 0.5) * 0.006;
      box2(c, fx, fy, 0.09 + jz, 0.235, 0.09, 0.16, 9072466, { fade: isCtr ? sh : 1 });
    });
    box2(c, 0, fy, 0.172, 0.9, 0.085, 0.006, 14676991, { fade: isCtr ? sh : 1 });
    for (const ex of [-0.36, 0.36]) {
      box2(c, ex, fy, 0.13, 0.2, 0.16, 0.14, 4885082);
      box2(c, ex, fy, 0.2, 0.13, 0.11, 0.06, 5939306);
      box2(c, ex, fy, 0.245, 0.07, 0.065, 0.03, 6994042);
    }
  }
  box2(c, 0, 0, 0.15, 0.14, 0.96, 0.26, G ? 14216447 : 7372172, { fade: sh });
  box2(c, 0, 0, 0.285, 0.15, 0.97, 0.015, G ? 15398655 : 8950946, { fade: sh });
  if (G)
    box2(c, 0, 0, 0.19, 0.18, 0.98, 0.3, 6732799, { glow: true, fade: 0.35 * sh });
  box2(c, -0.1, 0, 0.14, 0.045, 0.94, 0.22, 4871520);
  box2(c, 0.1, 0, 0.14, 0.045, 0.94, 0.22, 4871520);
  box2(c, -0.128, 0, 0.14, 0.018, 0.93, 0.2, 3818832);
  box2(c, 0.128, 0, 0.14, 0.018, 0.93, 0.2, 3818832);
  box2(c, 0, 0.44, 0.3, 0.1, 0.08, 0.14, 13218410);
  for (const ex of [-0.36, 0.36])
    for (let s = 0;s < 4; s++) {
      box2(c, ex, 0, 0.195 + s * 0.02, 0.095, 0.78, 0.018, s % 2 ? 12100444 : 13088106);
    }
  for (const px of [-0.46, 0.46])
    for (const py of [-0.42, 0.42]) {
      box2(c, px, py, 0.22, 0.05, 0.05, 0.24, 3357252);
    }
  box2(c, -0.36, 0, 0.345, 0.14, 0.82, 0.02, 14263644);
  box2(c, 0.36, 0, 0.345, 0.14, 0.82, 0.02, 14263644);
  if (G) {
    for (const fy of [-0.22, 0, 0.22])
      for (let i = 0;i < 12; i++) {
        const p = (c.time * 1.3 + i / 12 + fy) % 1;
        const arc = Math.sin(p * Math.PI) * 0.02;
        sph2(c, -0.36 + p * 0.72, fy, 0.11 + arc, 0.032, 9429247, { glow: true, fade: 0.75 * Math.sin(p * Math.PI) });
        for (const tr of [0.035, 0.07]) {
          const pt = ((p - tr) % 1 + 1) % 1, at = Math.sin(pt * Math.PI) * 0.02, k = 1 - tr * 6;
          sph2(c, -0.36 + pt * 0.72, fy, 0.11 + at, 0.032 * k, 9429247, { glow: true, fade: 0.3 * Math.sin(pt * Math.PI) * k });
        }
      }
  } else {
    for (let i = 0;i < 10; i++) {
      const fy = (hashf(i * 5.3) - 0.5) * 0.5, fx = (hashf(i * 8.9) - 0.5) * 0.9;
      const tw = Math.sin(c.time * 2 + i * 3.7) * 0.5 + 0.5;
      sph2(c, fx, fy, 0.1, 0.02, 6978184, { glow: true, fade: 0.12 * tw });
    }
  }
  box2(c, 0, 0.42, 0.36, 0.94, 0.006, 0.01, 2042404);
  for (let i = 0;i < 24; i++) {
    const tt = c.time - (23 - i) * 0.07;
    const v = bit(42, tt, 0.9);
    box2(c, -0.46 + i * 0.04, 0.42 + v * 0.06, 0.365, 0.036, 0.014, 0.012, v ? 9437120 : 4019528, { glow: true, fade: 0.65 + 0.3 * v });
  }
  const f = kid(c, K7.fincross.at, mod7);
  if (f)
    mod7.render(f);
};
var mod8 = { spec: spec8, render: render8 };

// src/render/logiccell.ts
var K8 = {
  finfet: { at: { pos: [-0.1, -0.15, 0.12], scale: 0.1 }, mod: () => mod8 }
};
var spec9 = {
  id: "logiccell",
  name: "NAND standard cell",
  size: 0.000001,
  kids: K8,
  dive: "finfet",
  approach: { dir: [0.5, 0.45, 0.76], up: [0, 1, 0] }
};
var wire = (c, x, y, w, h, on, z = 0.09) => {
  box2(c, x, y, z, w, h, 0.012, on ? 10149887 : 3819348);
  if (on)
    box2(c, x, y, z + 0.008, w, h, 0.004, 6737151, { glow: true, fade: 0.75 });
};
var dot = (c, x, y, on, z = 0.1) => {
  box2(c, x, y, z, 0.07, 0.07, 0.02, on ? 12577023 : 2897730);
  if (on)
    box2(c, x, y, z + 0.012, 0.07, 0.07, 0.006, 7852287, { glow: true, fade: 0.8 });
};
var render9 = (c) => {
  const A = bit(1943, c.time, 1.1), B = bit(777, c.time, 0.8), Y = NAND(A, B), Z = AND(A, B);
  box2(c, 0, 0, 0, 1, 1, 0.02, 2041904);
  box2(c, 0, 0.42, 0.03, 0.96, 0.1, 0.03, 5923952);
  box2(c, 0, -0.42, 0.03, 0.96, 0.1, 0.03, 3752524);
  box2(c, 0, 0.18, 0.028, 0.72, 0.2, 0.022, 5259834);
  box2(c, 0, -0.18, 0.028, 0.72, 0.2, 0.022, 3820098);
  box2(c, 0, 0.28, 0.032, 0.8, 0.008, 0.006, 6970446);
  box2(c, 0, 0.08, 0.032, 0.8, 0.008, 0.006, 6970446);
  box2(c, -0.4, 0.18, 0.032, 0.008, 0.2, 0.006, 6970446);
  box2(c, 0.4, 0.18, 0.032, 0.008, 0.2, 0.006, 6970446);
  for (const fy of [0.13, 0.18, 0.23, -0.13, -0.18, -0.23])
    box2(c, 0, fy, 0.045, 0.74, 0.02, 0.02, 6969928);
  for (const [gx, on] of [[-0.1, A], [0.14, B]]) {
    box2(c, gx, 0, 0.06, 0.05, 0.86, 0.028, on ? 14217471 : 6713982);
    if (on)
      box2(c, gx, 0, 0.08, 0.05, 0.86, 0.008, 7851263, { glow: true, fade: 0.6 });
  }
  for (const [cx2, cy] of [[-0.28, 0.18], [0.02, 0.18], [0.3, 0.18], [-0.28, -0.18], [0.3, -0.18]]) {
    box2(c, cx2, cy, 0.075, 0.035, 0.035, 0.05, 13218410);
    const railY = cy > 0 ? 0.42 : -0.42;
    box2(c, cx2, (cy + railY) / 2, 0.052, 0.02, Math.abs(railY - cy), 0.018, 9083560);
  }
  wire(c, -0.1, 0.32, 0.04, 0.5, A);
  wire(c, 0.14, 0.32, 0.04, 0.5, B);
  wire(c, 0.42, 0, 0.04, 0.6, Y);
  wire(c, 0.32, 0.18, 0.18, 0.04, Y);
  if (A && B)
    for (let i = 0;i < 4; i++) {
      const p = (c.time * 1.6 + i * 0.25) % 1;
      box2(c, -0.28 + p * 0.58, -0.18, 0.06, 0.03, 0.03, 0.02, 10479871, { glow: true, fade: 0.5 * (1 - Math.abs(p - 0.5)) });
    }
  const ppA = pulsePos(1943, c.time, 1.1);
  if (ppA >= 0)
    box2(c, -0.1 + ppA * 0.5, 0.32 - ppA * 0.14, 0.11, 0.05, 0.05, 0.015, 11464959, { glow: true, fade: 0.9 });
  const ppB = pulsePos(777, c.time, 0.8);
  if (ppB >= 0)
    box2(c, 0.14 + ppB * 0.28, 0.32 - ppB * 0.14, 0.11, 0.05, 0.05, 0.015, 11464959, { glow: true, fade: 0.9 });
  dot(c, -0.44, 0.44, A);
  dot(c, 0.44, 0.44, B);
  dot(c, 0.44, -0.44, Y);
  dot(c, -0.44, -0.44, Z);
  const f = kid(c, K8.finfet.at, mod8);
  if (f)
    mod8.render(f);
};
var mod9 = { spec: spec9, render: render9 };

// src/render/alu.ts
var ROWS = 40;
var SITES2 = 80;
var RW = 0.024;
var SW2 = 0.012;
var cellX = (s) => -0.48 + s * SW2 + SW2 / 2;
var cellY = (r) => -0.48 + r * RW + RW / 2;
var K9 = {
  logiccell: { at: { pos: [cellX(40), cellY(20), 0.0145], scale: 0.01 }, mod: () => mod9 }
};
var spec10 = {
  id: "alu",
  name: "integer ALU",
  size: 0.0001,
  kids: K9,
  dive: "logiccell",
  approach: { dir: [0.45, 0.5, 0.8], up: [0, 1, 0] }
};
var PAL = [8018582, 4881046, 9859194, 6982234, 9075274, 5929610];
var HFRAC = [0.55, 0.72, 0.88];
var render10 = (c) => {
  box2(c, 0, 0, 0, 1, 1, 0.012, 2305078);
  for (let r = 0;r <= ROWS; r += 2)
    box2(c, 0, -0.48 + r * RW, 0.008, 0.98, 0.004, 0.001, 5595246);
  for (let r = 0;r < ROWS; r++) {
    const lane = Math.floor(r / 5) % 2 === 0 ? 1 : 0.82;
    for (let s = 0;s < SITES2; s++) {
      const h = hashf(r * 131 + s * 7.7);
      const wide = h > 0.8 ? 2 : 1;
      if (wide === 2 && s % 2)
        continue;
      const base = PAL[Math.floor(h * 6)];
      const rr = Math.min(255, (base >> 16 & 255) * lane), gg = Math.min(255, (base >> 8 & 255) * lane), bb = Math.min(255, (base & 255) * lane);
      const col = rr << 16 | gg << 8 | bb;
      const hfrac = HFRAC[Math.floor(hashf(r * 5 + s * 3.3) * HFRAC.length) % HFRAC.length];
      box2(c, cellX(s) + (wide - 1) * SW2 / 2, cellY(r), 0.0085, SW2 * wide * 0.88, RW * hfrac, 0.0035, col);
      if (wide === 1)
        box2(c, cellX(s) + SW2 * 0.26, cellY(r) + RW * hfrac * 0.38, 0.0098, SW2 * 0.14, RW * 0.09, 0.0015, 14209192);
      const dx = s - 40, dy = r - 20;
      if (dx * dx + dy * dy < 230) {
        const seed = r * 97 + s * 13;
        const out = bit(seed, c.time, 1.6 + hashf(seed) * 2.2);
        if (out)
          box2(c, cellX(s), cellY(r), 0.0115, SW2 * 0.5, RW * 0.35, 0.001, 8377599, { glow: true, fade: 0.4 });
      }
    }
  }
  for (let i = 0;i < 24; i++) {
    const y = -0.46 + i * 0.04;
    box2(c, 0, y, 0.0135, 0.96, 0.0035, 0.0008, 7371398);
    const pp = pulsePos(i * 7, c.time, 1.4 + hashf(i) * 1.8);
    if (pp >= 0)
      box2(c, -0.48 + pp * 0.96, y, 0.0145, 0.03, 0.004, 0.001, 11462399, { glow: true, fade: 0.9 });
  }
  for (let i = 0;i < 16; i++) {
    const x = -0.45 + i * 0.06;
    box2(c, x, 0, 0.0155, 0.0035, 0.94, 0.0008, 6252916);
    const pp = pulsePos(300 + i * 3, c.time, 2.1);
    if (pp >= 0)
      box2(c, x, -0.47 + pp * 0.94, 0.0165, 0.004, 0.03, 0.001, 11462399, { glow: true, fade: 0.9 });
    const pp2 = pulsePos(500 + i * 5, c.time, 1.5);
    if (pp2 >= 0)
      box2(c, x, -0.47 + pp2 * 0.94, 0.017, 0.004, 0.024, 0.001, 8978380, { glow: true, fade: 0.85 });
  }
  const l = kid(c, K9.logiccell.at, mod9);
  if (l)
    mod9.render(l);
};
var mod10 = { spec: spec10, render: render10 };

// src/render/pcore.ts
var K10 = {
  alu: { at: { pos: [0.18, -0.05, 0.021], scale: 0.038 }, mod: () => mod10 }
};
var spec11 = {
  id: "pcore",
  name: "performance core",
  size: 0.0026,
  kids: K10,
  dive: "alu",
  approach: { dir: [0.5, 0.42, 0.8], up: [0, 1, 0] }
};
var R = [
  [-0, 0.42, 0.94, 0.14, 3828298, "L1I", 10],
  [-0.35, 0.28, 0.26, 0.12, 6969904, "branch pred", 6],
  [0.1, 0.28, 0.6, 0.12, 8014384, "decode ×10", 10],
  [-0, 0.16, 0.92, 0.1, 6961754, "rename/dispatch", 12],
  [-0.32, -0.02, 0.3, 0.24, 3494010, "int sched", 8],
  [-0.32, -0.28, 0.3, 0.22, 3107445, "fp sched", 6],
  [0, -0.02, 0.28, 0.24, 9071146, "register files", 14],
  [0.18, -0.05, 0.076 * 2, 0.076 * 2, 10111546, "int ALU", 0],
  [0.38, -0.02, 0.2, 0.42, 4880954, "FP/SIMD", 8],
  [0, -0.42, 0.94, 0.14, 3824266, "L1D + LSU", 12],
  [-0.02, -0.24, 0.24, 0.14, 7360640, "AGU", 6]
];
var STAGES = ["L1I", "decode ×10", "rename/dispatch", "int sched", "int ALU"];
var WAVE_T = 0.8;
var waveGlow = (kind, time) => {
  const idx = STAGES.indexOf(kind);
  if (idx < 0)
    return 0;
  const phase = time / WAVE_T % STAGES.length;
  const d = Math.abs(phase - idx);
  const wrapped = Math.min(d, STAGES.length - d);
  return Math.max(0, 1 - wrapped * 2.2);
};
var render11 = (c) => {
  box2(c, 0, 0, 0, 1, 1, 0.018, 2437180);
  for (const [x, y, w, h, col, kind, lanes] of R) {
    box2(c, x, y, 0.012, w - 0.01, h - 0.01, 0.005, col);
    if (kind === "L1I" || kind === "L1D + LSU") {
      const bcols = lanes, brows = 2;
      for (let bi = 0;bi < bcols; bi++)
        for (let bj = 0;bj < brows; bj++) {
          const bx = x - w / 2 + w / bcols * (bi + 0.5), by = y - h / 2 + h / brows * (bj + 0.5);
          const shd = 0.78 + hashf(bi * 11 + bj * 23 + col) * 0.4;
          box2(c, bx, by, 0.0155, w / bcols * 0.82, h / brows * 0.8, 0.002, Math.min(255, (col >> 16 & 255) * shd) << 16 | Math.min(255, (col >> 8 & 255) * shd) << 8 | Math.min(255, (col & 255) * shd));
        }
    } else if (kind === "register files") {
      const rrows = 3;
      for (let ri = 0;ri < lanes; ri++)
        for (let rj = 0;rj < rrows; rj++) {
          const rx = x - w / 2 + w / lanes * (ri + 0.5), ry = y - h / 2 + h / rrows * (rj + 0.5);
          const shd = 0.78 + hashf(ri * 5 + rj * 19 + col) * 0.4;
          box2(c, rx, ry, 0.0155, w / lanes * 0.8, h / rrows * 0.72, 0.002, Math.min(255, (col >> 16 & 255) * shd) << 16 | Math.min(255, (col >> 8 & 255) * shd) << 8 | Math.min(255, (col & 255) * shd));
          const gl = netGlow(col + ri * 13 + rj * 41, c.time, 2.6);
          if (gl > 0.6)
            box2(c, rx, ry, 0.0175, w / lanes * 0.5, h / rrows * 0.4, 0.001, 7846911, { glow: true, fade: (gl - 0.6) * 0.7 });
        }
    } else {
      for (let l = 0;l < lanes; l++) {
        const lx = x - w / 2 + w / lanes * (l + 0.5);
        const shade = 0.8 + hashf(l * 3.7 + col) * 0.4;
        box2(c, lx, y, 0.0155, w / lanes * 0.78, h * 0.82, 0.002, Math.min(255, (col >> 16 & 255) * shade) << 16 | Math.min(255, (col >> 8 & 255) * shade) << 8 | Math.min(255, (col & 255) * shade));
        const gl = netGlow(col + l * 7, c.time, 2 + hashf(l + col) * 3);
        if (gl > 0.55)
          box2(c, lx, y + (hashf(l * 9 + col) - 0.5) * h * 0.5, 0.018, w / lanes * 0.5, h * 0.12, 0.001, 7846911, { glow: true, fade: (gl - 0.55) * 0.55 });
      }
    }
    const wg = waveGlow(kind, c.time);
    if (wg > 0.05)
      box2(c, x, y, 0.02, (w - 0.01) * 0.96, (h - 0.01) * 0.9, 0.0015, 11460863, { glow: true, fade: wg * 0.7 });
  }
  for (let i = 0;i < 4; i++) {
    const by = -0.14 + i * 0.09;
    box2(c, -0.02, by, 0.0175, 0.42, 0.006, 0.001, 4478310);
    const gl = netGlow(400 + i, c.time, 3);
    if (gl > 0.6)
      box2(c, -0.02, by, 0.018, 0.4, 0.005, 0.001, 8965375, { glow: true, fade: (gl - 0.6) * 0.8 });
  }
  const a = kid(c, K10.alu.at, mod10);
  if (a)
    mod10.render(a);
};
var mod11 = { spec: spec11, render: render11 };

// src/render/die.ts
var K11 = {
  pcore: { at: { pos: [-0.155, -0.205, 0.024], scale: 0.2 }, mod: () => mod11 }
};
var spec12 = {
  id: "die",
  name: "M4 die",
  size: 0.013,
  kids: K11,
  dive: "pcore",
  approach: { dir: [0.42, 0.5, 0.82], up: [0, 1, 0] }
};
var BLOCKS = [
  [-0.475, 0, 0.05, 0.96, 4871528, 1, 12, 1, "phy"],
  [0.475, 0, 0.05, 0.96, 4871528, 1, 12, 2, "phy"],
  [-0.23, 0.29, 0.42, 0.38, 3104138, 5, 2, 3, "gpu"],
  [0.15, 0.38, 0.3, 0.2, 9067055, 3, 2, 4, "ecore"],
  [0.15, 0.24, 0.3, 0.06, 10122314, 4, 1, 5, "cache"],
  [0.38, 0.31, 0.13, 0.34, 4160106, 2, 4, 6, "misc"],
  [0.02, 0.08, 0.36, 0.22, 6965882, 4, 3, 7, "misc"],
  [-0.28, 0.02, 0.22, 0.14, 8022586, 3, 2, 8, "misc"],
  [0.33, 0.02, 0.24, 0.18, 4480048, 3, 2, 9, "se"],
  [0.02, -0.12, 0.5, 0.14, 3626094, 8, 2, 10, "slc"],
  [-0.31, -0.11, 0.28, 0.1, 5925502, 5, 1, 11, "misc"],
  [-0.26, -0.3, 0.44, 0.36, 9058874, 2, 2, 12, "pcore"],
  [0, -0.3, 0.1, 0.36, 10506320, 1, 4, 13, "cache"],
  [0.28, -0.33, 0.42, 0.3, 3836522, 4, 4, 14, "ne"],
  [0.1, -0.44, 0.66, 0.06, 5596740, 10, 1, 15, "phy"],
  [-0.3, -0.02, 0.26, 0.06, 6314624, 4, 1, 16, "misc"]
];
var KIND_FREQ = { gpu: 2.4, ne: 1.7, se: 0.28, phy: 1.3, pcore: 1.5, cache: 1.1, slc: 1, ecore: 1.4, misc: 1 };
var render12 = (c) => {
  box2(c, 0, 0, 0, 1.02, 1, 0.02, 1845043);
  for (const [x, y, w, h, col, cols, rows, seed, kind] of BLOCKS) {
    box2(c, x, y, 0.013, w - 0.008, h - 0.008, 0.006, col);
    const freq = KIND_FREQ[kind] ?? 1;
    for (let i = 0;i < cols; i++)
      for (let j = 0;j < rows; j++) {
        const tx = x - w / 2 + w / cols * (i + 0.5), ty = y - h / 2 + h / rows * (j + 0.5);
        const shade = 0.82 + hashf(seed * 31 + i * 7 + j * 13) * 0.36;
        const r = Math.min(255, (col >> 16 & 255) * shade), g = Math.min(255, (col >> 8 & 255) * shade), b = Math.min(255, (col & 255) * shade);
        const cw = w / cols * 0.86, ch = h / rows * 0.84;
        box2(c, tx, ty, 0.0175, cw, ch, 0.003, r << 16 | g << 8 | b);
        const shadeCol = (k) => Math.min(255, r * k) << 16 | Math.min(255, g * k) << 8 | Math.min(255, b * k);
        if (kind === "gpu") {
          for (let l = 0;l < 4; l++)
            box2(c, tx - cw * 0.375 + l * cw * 0.25, ty, 0.0195, cw * 0.16, ch * 0.9, 0.001, shadeCol(0.75 + l % 2 * 0.1));
        } else if (kind === "ne") {
          for (let dy = 0;dy < 3; dy++)
            for (let dx = 0;dx < 3; dx++)
              sph2(c, tx - cw * 0.32 + dx * cw * 0.32, ty - ch * 0.32 + dy * ch * 0.32, 0.02, cw * 0.11, shadeCol(0.9));
        } else if (kind === "slc") {
          for (let by = 0;by < 2; by++)
            for (let bx = 0;bx < 2; bx++)
              box2(c, tx - cw * 0.24 + bx * cw * 0.48, ty - ch * 0.22 + by * ch * 0.44, 0.0195, cw * 0.42, ch * 0.36, 0.001, shadeCol(0.72 + (bx + by) % 2 * 0.15));
        } else if (kind === "phy") {
          for (let p = 0;p < 4; p++)
            box2(c, tx, ty - ch * 0.36 + p * ch * 0.24, 0.0195, cw * 0.6, ch * 0.14, 0.0012, shadeCol(0.85));
        } else {
          for (let l = 0;l < 3; l++)
            box2(c, tx, ty - ch * 0.3 + l * ch * 0.3, 0.0195, cw * 0.7, ch * 0.06, 0.001, shadeCol(0.7));
        }
        const gl = netGlow(seed * 100 + i * 17 + j * 29, c.time, freq * (0.6 + hashf(seed + i + j) * 0.8));
        if (gl > 0.5)
          box2(c, tx, ty, 0.021, cw * 0.5, ch * 0.4, 0.001, 6728447, { glow: true, fade: (gl - 0.5) * 0.5 });
      }
  }
  for (let i = 0;i < 8; i++)
    box2(c, -0.48 + i * 0.135, 0, 0.0105, 0.006, 0.96, 0.002, 3030349);
  for (let i = 0;i < 7; i++)
    box2(c, 0, -0.45 + i * 0.15, 0.0105, 0.96, 0.006, 0.002, 3030349);
  const p = kid(c, K11.pcore.at, mod11);
  if (p)
    mod11.render(p);
};
var mod12 = { spec: spec12, render: render12 };

// src/render/m4package.ts
var K12 = {
  die: { at: { pos: [-0.16, 0, 0.028], scale: 0.29 }, mod: () => mod12 }
};
var spec13 = {
  id: "m4package",
  name: "Apple M4 package",
  size: 0.045,
  kids: K12,
  dive: "die",
  approach: { dir: [0.5, 0.45, 0.78], up: [0, 1, 0] }
};
var render13 = (c) => {
  box2(c, 0, 0, 0, 1, 0.84, 0.05, 861208);
  box2(c, 0, 0, 0.0255, 0.98, 0.82, 0.001, 1191969);
  for (const my of [0.2, -0.2]) {
    box2(c, 0.3, my, 0.045, 0.32, 0.3, 0.04, 1382171);
    box2(c, 0.3, my + 0.06, 0.066, 0.24, 0.02, 0.001, 3948614);
    box2(c, 0.3, my, 0.066, 0.2, 0.015, 0.001, 3356220);
    box2(c, 0.3, my - 0.06, 0.066, 0.26, 0.015, 0.001, 3356220);
  }
  for (let i = 0;i < 60; i++) {
    const a = hashf(i * 11.3);
    const onX = i % 2 === 0;
    const x = onX ? (hashf(i * 5.1) - 0.5) * 0.9 : i % 4 < 2 ? -0.47 : 0.47;
    const y = onX ? i % 4 < 2 ? -0.38 : 0.38 : (hashf(i * 5.1) - 0.5) * 0.7;
    box2(c, x, y, 0.028, 0.014 + a * 0.01, 0.008, 0.006, i % 3 ? 9071152 : 7830660);
  }
  for (let i = 0;i < 24; i++)
    box2(c, -0.46 + i * 0.04, -0.405, 0.012, 0.012, 0.012, 0.01, 10133672);
  const d = kid(c, K12.die.at, mod12);
  if (d)
    mod12.render(d);
};
var mod13 = { spec: spec13, render: render13 };

// src/render/logicboard.ts
var K13 = {
  m4package: { at: { pos: [0, 0.05, 0.014], scale: 0.26 }, mod: () => mod13 }
};
var spec14 = {
  id: "logicboard",
  name: "logic board",
  size: 0.17,
  kids: K13,
  dive: "m4package",
  approach: { dir: [0.45, 0.4, 0.8], up: [0, 1, 0] }
};
var render14 = (c) => {
  box2(c, 0, 0, 0, 1, 0.62, 0.02, 1053720);
  box2(c, 0, 0, 0.0105, 0.98, 0.6, 0.001, 1382944);
  for (let i = 0;i < 260; i++) {
    const x = (hashf(i * 3.1) - 0.5) * 0.94, y = (hashf(i * 7.7) - 0.5) * 0.56;
    if (Math.abs(x) < 0.17 && Math.abs(y - 0.05) < 0.17)
      continue;
    const s = 0.006 + hashf(i * 1.3) * 0.01;
    box2(c, x, y, 0.013, s, s * 0.55, 0.004, [7035434, 9080210, 3816770, 12097354][i % 4], { q: aa(0, 0, 1, i % 2 * Math.PI / 2) });
  }
  for (const [sx, sy, w, h] of [[-0.36, -0.14, 0.18, 0.14], [0.35, -0.1, 0.16, 0.18], [-0.33, 0.18, 0.14, 0.12], [0.33, 0.22, 0.12, 0.1]]) {
    box2(c, sx, sy, 0.015, w, h, 0.008, 10396586);
    box2(c, sx, sy, 0.0195, w * 0.96, h * 0.96, 0.001, 11580860);
  }
  for (const [sx, sy] of [[-0.15, -0.2], [0.12, -0.22], [0.22, 0.05]]) {
    box2(c, sx, sy, 0.017, 0.07, 0.07, 0.006, 1842722);
    box2(c, sx, sy, 0.021, 0.05, 0.05, 0.002, 2764083);
  }
  for (let i = 0;i < 6; i++)
    box2(c, -0.45 + i * 0.18, -0.29, 0.016, 0.09, 0.02, 0.008, 3158842);
  const hp = pierce(c, 0.3, 0.62);
  if (hp > 0.02) {
    for (let i = 0;i <= 30; i++) {
      const s = i / 30;
      const x = -0.45 + s * 0.9, y = 0.05 + Math.sin(s * Math.PI * 1.6 + 0.4) * 0.13;
      box2(c, x, y, 0.026, 0.045, 0.06, 0.008, 13208139, { fade: hp, q: aa(0, 0, 1, Math.cos(s * Math.PI * 1.6 + 0.4) * 0.35) });
    }
    box2(c, 0, 0.05, 0.02, 0.36, 0.3, 0.004, 13685978, { fade: hp * 0.95 });
  }
  const p = kid(c, K13.m4package.at, mod13);
  if (p)
    mod13.render(p);
};
var mod14 = { spec: spec14, render: render14 };

// src/render/chassis.ts
var QF = aa(1, 0, 0, -Math.PI / 2);
var K14 = {
  logicboard: { at: { pos: [0, 0.012, -0.19], scale: 0.55, quat: QF }, mod: () => mod14 }
};
var spec15 = {
  id: "chassis",
  name: "inside the chassis",
  size: 0.3,
  kids: K14,
  dive: "logicboard",
  approach: { dir: [0.35, 0.9, 0.4], up: [0, 0, -1] }
};
var fan = (c, fx, fz, dir) => {
  cyl2(c, fx, 0.004, fz, 0.21, 0.022, 2829617);
  cyl2(c, fx, 0.006, fz, 0.185, 0.02, 1710878);
  sph2(c, fx, 0.014, fz, 0.04, 3816770);
  const a0 = c.time * 5.5 * dir;
  for (let i = 0;i < 5; i++) {
    const a = a0 + i / 5 * Math.PI * 2;
    box2(c, fx + Math.sin(a) * 0.055, 0.011, fz + Math.cos(a) * 0.055, 0.026, 0.012, 0.085, 9409949, { q: aa(0, 1, 0, a + 0.5) });
  }
  for (let i = 0;i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    box2(c, fx + Math.sin(a) * 0.1, 0.002, fz + Math.cos(a) * 0.1, 0.006, 0.004, 0.02, 4145735, { q: aa(0, 1, 0, a) });
  }
};
var render15 = (c) => {
  box2(c, 0, -0.028, 0, 1, 0.014, 0.72, 11843775);
  for (const [x, z, w, d] of [[-0.5, 0, 0.014, 0.72], [0.5, 0, 0.014, 0.72], [0, -0.353, 1, 0.014], [0, 0.353, 1, 0.014]])
    box2(c, x, 0.006, z, w, 0.055, d, 11449017);
  fan(c, -0.33, -0.21, 1);
  fan(c, 0.33, -0.21, -1);
  box2(c, 0, 0.012, -0.345, 0.72, 0.02, 0.028, 6317163);
  for (let i = 0;i < 5; i++)
    box2(c, -0.28 + i * 0.14, 0.024, -0.345, 0.05, 0.004, 0.02, 4869458);
  for (const [bx, bz, w, d] of [[-0.31, 0.16, 0.24, 0.17], [0.31, 0.16, 0.24, 0.17], [-0.31, 0.295, 0.24, 0.09], [0.31, 0.295, 0.24, 0.09], [-0.085, 0.21, 0.16, 0.26], [0.085, 0.21, 0.16, 0.26]]) {
    box2(c, bx, 0, bz, w, 0.022, d, 10132899);
    box2(c, bx, 0.0115, bz, w * 0.94, 0.001, d * 0.9, 8685453);
    box2(c, bx, 0.0125, bz, w * 0.6, 0.0006, d * 0.28, 6514283);
    box2(c, bx, 0.0131, bz - d * 0.1, w * 0.5, 0.0004, 0.006, 4013891);
    box2(c, bx, 0.0131, bz + d * 0.02, w * 0.44, 0.0004, 0.006, 4013891);
  }
  box2(c, 0, 0.013, 0.21, 0.05, 0.0016, 0.3, 3026739);
  box2(c, 0, 0.0145, 0.09, 0.056, 0.0022, 0.03, 13214775);
  for (const sx of [-0.465, 0.465]) {
    box2(c, sx, 0.006, 0.18, 0.055, 0.03, 0.3, 2303273);
    for (let i = 0;i < 10; i++)
      sph2(c, sx, 0.023, 0.05 + i * 0.028, 0.008, 1118741);
  }
  box2(c, -0.46, 0.004, -0.15, 0.06, 0.014, 0.16, 1327135);
  box2(c, 0.46, 0.004, -0.1, 0.06, 0.014, 0.2, 1327135);
  for (const z of [0.055, 0.34])
    box2(c, 0, 0.002, z, 0.92, 0.008, 0.018, 10922673);
  for (let i = 0;i < 12; i++)
    cyl2(c, -0.44 + i % 6 * 0.176, 0.011, i < 6 ? 0.052 : 0.338, 0.009, 0.004, 8159367);
  for (const [tx, tz] of [[-0.2, 0.06], [0.2, 0.06], [0, -0.05]])
    box2(c, tx, 0.0135, tz, 0.1, 0.0006, 0.03, 3096391);
  for (let i = 0;i < 4; i++)
    box2(c, -0.15 + i * 0.1, 0.012, -0.045, 0.05, 0.003, 0.03, 9413560);
  const lb = kid(c, K14.logicboard.at, mod14);
  if (lb)
    mod14.render(lb);
};
var mod15 = { spec: spec15, render: render15 };

// src/render/screen.ts
import * as THREE2 from "three";

// src/render/molecule.ts
var K15 = {
  atom: { at: { pos: [0, 0, 0], scale: 0.055 }, mod: () => mod4 }
};
var spec16 = {
  id: "molecule",
  name: "emitter molecule",
  size: 0.000000002,
  kids: K15,
  dive: "atom",
  approach: { dir: [0.5, 0.55, 0.65], up: [0, 1, 0] }
};
var render16 = (c) => {
  const pulse = 0.5 + 0.5 * Math.sin(c.time * 2.6);
  for (let L = 0;L < 3; L++) {
    const qL = aa(0.3, 1, 0.2, L / 3 * Math.PI * 2);
    const ringC = rotV(qL, [0.32, 0.1, 0]);
    for (let i = 0;i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const p = rotV(qL, [0.32 + Math.cos(a) * 0.13, 0.1 + Math.sin(a) * 0.13, Math.sin(a + L) * 0.02]);
      sph2(c, p[0], p[1], p[2], 0.07, 3948614);
      sph2(c, p[0], p[1], p[2], 0.1, 6750088, { glow: true, fade: 0.1 * pulse });
      const hgh = rotV(qL, [0.32 + Math.cos(a) * 0.21, 0.1 + Math.sin(a) * 0.21, Math.sin(a + L) * 0.03]);
      sph2(c, hgh[0], hgh[1], hgh[2], 0.035, 14212580);
    }
    const nP = rotV(qL, [0.17, 0.02, 0]);
    sph2(c, nP[0], nP[1], nP[2], 0.075, 4872908);
    const mid = [nP[0] / 2, nP[1] / 2, nP[2] / 2];
    const len = Math.hypot(...nP);
    const axn = Math.hypot(nP[2], -nP[0], len + nP[1]) || 1;
    cyl2(c, mid[0], mid[1], mid[2], 0.025, len * 0.7, 8028812, { q: [nP[2] / axn, 0, -nP[0] / axn, (len + nP[1]) / axn] });
    sph2(c, ringC[0], ringC[1], ringC[2], 0.16, 8978352, { glow: true, fade: 0.12 * pulse });
  }
  sph2(c, 0, 0, 0, 0.13, 12109012, { fade: pierce(c, 0.45, 0.8) });
  const ph = c.time * 1.1 % 1;
  sph2(c, 0.1, 0.1, 0.2 + ph * 1.6, 0.04, 12320716, { glow: true, fade: (1 - ph) * 0.8 });
  sph2(c, 0, 0, 0, 0.5, 4500070, { glow: true, fade: 0.1 + 0.12 * pulse });
  const a2 = kid(c, K15.atom.at, mod4);
  if (a2)
    mod4.render(a2);
};
var mod16 = { spec: spec16, render: render16 };

// src/render/emissive.ts
var K16 = {
  molecule: { at: { pos: [0, 0, 0], scale: 0.001 }, mod: () => mod16 }
};
var spec17 = {
  id: "emissive",
  name: "emissive layer",
  size: 0.000002,
  kids: K16,
  dive: "molecule",
  approach: { dir: [0.45, 0.5, 0.75], up: [0, 1, 0] }
};
var render17 = (c) => {
  const v = samplePixel(DIVE_PX.x, DIVE_PX.y)[1];
  for (let lvl = 0;lvl < 6; lvl++) {
    const s = Math.pow(0.28, lvl);
    if (s * c.f < 0.003)
      break;
    const n = 26;
    for (let i = 0;i < n; i++) {
      const seed = lvl * 100 + i;
      const x = (hashf(seed * 3.1) - 0.5) * 2.4 * s * 4;
      const y = (hashf(seed * 5.3) - 0.5) * 2.4 * s * 4;
      const z = (hashf(seed * 7.7) - 0.5) * 0.8 * s * 4;
      sph2(c, x, y, z, s * 0.5, lvl % 2 ? 4020804 : 4608574);
      const ph = (c.time * (0.5 + v * 1.5) + hashf(seed * 11.3) * 7) % 1;
      if (ph < 0.12)
        sph2(c, x, y, z, s * 0.8, 6750088, { glow: true, fade: Math.sin(ph / 0.12 * Math.PI) * 0.8 });
    }
  }
  sph2(c, 0, 0, 0, 2.6, 2245683, { glow: true, fade: 0.08 + v * 0.06 });
  const m = kid(c, K16.molecule.at, mod16);
  if (m)
    mod16.render(m);
};
var mod17 = { spec: spec17, render: render17 };

// src/render/subpixel.ts
var K17 = {
  emissive: { at: { pos: [0, 0, 0.02], scale: 0.02 }, mod: () => mod17 }
};
var spec18 = {
  id: "subpixel",
  name: "sub-pixel LED · OLED stack",
  size: 0.0001,
  kids: K17,
  dive: "emissive",
  approach: { dir: [0.4, 0.45, 0.85], up: [0, 1, 0] }
};
var render18 = (c) => {
  const u = local(c);
  const v = samplePixel(DIVE_PX.x, DIVE_PX.y)[1];
  const topF = pierce(c, -0.2, 0.35);
  box2(c, 0, 0, 0.44, 1.3, 1.5, 0.1, 2897476, { glow: true, fade: 0.3 * topF });
  box2(c, 0, 0, 0.3, 1.05, 1.35, 0.035, 7371400, { fade: topF });
  box2(c, 0, 0, 0.34, 1.05, 1.35, 0.01, 10135736, { glow: true, fade: 0.2 * topF });
  const etlF = pierce(c, 0.1, 0.5);
  box2(c, 0, 0, 0.2, 1, 1.3, 0.05, 3950164, { fade: etlF });
  for (let i = 0;i < 60; i++)
    sph2(c, (hashf(i * 3.7) - 0.5) * 0.95, (hashf(i * 7.3) - 0.5) * 1.25, [0.228, -0.112, -0.168][i % 3], 0.035 + hashf(i) * 0.03, [4608094, 5523034, 5786208][i % 3], { fade: i % 3 === 0 ? etlF : 1 });
  const emlF = pierce(c, 0.68, 0.92);
  box2(c, 0, 0, 0.02, 1, 1.3, 0.05, 2051372, { fade: emlF });
  box2(c, 0, 0, 0.02, 1.02, 1.32, 0.056, 3407701, { glow: true, fade: 0.5 * v * Math.max(emlF, 0.25) });
  box2(c, 0, 0, -0.14, 1, 1.3, 0.05, 4865104);
  box2(c, 0, 0, -0.26, 1.05, 1.35, 0.04, 12174028);
  for (const sx of [-0.62, 0.62])
    box2(c, sx, 0, 0.1, 0.14, 1.5, 0.55, 1316894);
  box2(c, 0, -0.85, -0.42, 1.5, 0.09, 0.05, 3752010);
  box2(c, -0.7, 0, -0.44, 0.09, 1.9, 0.05, 3357252);
  box2(c, 0.25, -0.55, -0.42, 0.45, 0.3, 0.04, 5265510);
  box2(c, 0.25, -0.55, -0.36, 0.4, 0.26, 0.02, 6910590);
  box2(c, -0.25, -0.6, -0.4, 0.3, 0.2, 0.05, 4603962);
  cyl2(c, -0.25, -0.3, -0.33, 0.07, 0.14, 9080728);
  const n = Math.round(2 + v * 9);
  for (let i = 0;i < n; i++) {
    const ph = (c.time * 0.9 + hashf(i * 3.3)) % 1;
    const x = (hashf(i * 7.1) - 0.5) * 0.8, y = (hashf(i * 5.7) - 0.5) * 1.1;
    sph2(c, x, y, 0.3 - ph * 0.26, 0.035, 8370431, { glow: true, fade: 0.8 });
    sph2(c, -x, y, -0.24 + ph * 0.24, 0.035, 16757631, { glow: true, fade: 0.8 });
    if (ph > 0.92)
      sph2(c, x * 0.3, y, 0.02, 0.12, 13434828, { glow: true, fade: 0.9 });
    const ph2 = (c.time * 1.4 + hashf(i * 9.9)) % 1;
    sph2(c, x * 0.5, y * 0.7, 0.06 + ph2 * 0.7, 0.02, 11206587, { glow: true, fade: 0.7 * (1 - ph2) });
  }
  const e = kid(c, K17.emissive.at, mod17);
  if (e)
    mod17.render(e);
};
var mod18 = { spec: spec18, render: render18 };

// src/render/pixel.ts
var K18 = {
  subpixel: { at: { pos: [0, -0.02, 0.01], scale: 0.32 }, mod: () => mod18 }
};
var spec19 = {
  id: "pixel",
  name: "one pixel",
  size: 0.0003,
  kids: K18,
  dive: "subpixel",
  approach: { dir: [0.42, 0.5, 0.78], up: [0, 1, 0] }
};
var render19 = (c) => {
  const u = local(c);
  const f = smooth(-0.55, -0.05, u) * (1 - smooth(0.6, 0.92, u));
  if (f >= 0.02) {
    const [r, g, b] = samplePixel(DIVE_PX.x, DIVE_PX.y);
    box2(c, 0, 0, -0.02, 1.35, 1.35, 0.012, 329482, { fade: f });
    for (const [ox, col, v, isDive] of [[-0.31, 16720401, r, 0], [0, 2293555, g, 1], [0.31, 2241535, b, 0]]) {
      const df = isDive ? 1 - smooth(0.5, 0.85, u) : 1;
      box2(c, ox, -0.02, -0.008, 0.24, 0.7, 0.014, 1645603, { fade: f * df });
      box2(c, ox, -0.02, 0.002, 0.19, 0.62, 0.004, col, { glow: true, fade: f * v * df });
      box2(c, ox, -0.02, 0.008, 0.21, 0.65, 0.0015, 3950162, { glow: true, fade: f * 0.25 * df });
      cyl2(c, ox, 0.38, -0.006, 0.05, 0.008, 6054766, { fade: f });
      box2(c, ox, 0.32, -0.01, 0.1, 0.06, 0.006, 3817804, { fade: f });
    }
    box2(c, 0, -0.475, -0.014, 1.3, 0.05, 0.004, 3159615, { fade: f });
    box2(c, -0.475, 0, -0.015, 0.05, 1.3, 0.004, 2764857, { fade: f });
    box2(c, 0.475, 0, -0.015, 0.05, 1.3, 0.004, 2764857, { fade: f });
  }
  const s = kid(c, K18.subpixel.at, mod18);
  if (s)
    mod18.render(s);
};
var mod19 = { spec: spec19, render: render19 };

// src/render/pixelblock.ts
var W = 2;
var K19 = {
  pixel: { at: { pos: [0, 0, 0.004], scale: 0.5 }, mod: () => mod19 }
};
var spec20 = {
  id: "pixelblock",
  name: "pixel block",
  size: 0.0006,
  kids: K19,
  dive: "pixel",
  approach: { dir: [0.5, 0.4, 0.78], up: [0, 1, 0] }
};
var render20 = (c) => {
  const u = local(c);
  const f = smooth(-0.55, -0.05, u) * (1 - smooth(0.55, 0.9, u));
  if (f >= 0.02) {
    box2(c, 0, 0, -0.006, 3.2, 3.2, 0.004, 329482, { fade: f });
    const px = 1 / W;
    for (let gy = -3;gy <= 3; gy++)
      for (let gx = -3;gx <= 3; gx++) {
        if (gx === 0 && gy === 0)
          continue;
        const x = gx * px, y = gy * px;
        const [r, g, b] = samplePixel(DIVE_PX.x + gx, DIVE_PX.y - gy);
        for (const [ox, col, v] of [[-0.3, 16720401, r], [0, 2293555, g], [0.3, 2241535, b]]) {
          box2(c, x + ox * px, y - 0.04 * px, -0.002, px * 0.22, px * 0.66, 0.003, 1711396, { fade: f });
          box2(c, x + ox * px, y - 0.04 * px, 0.001, px * 0.17, px * 0.6, 0.0012, col, { glow: true, fade: f * v });
          cyl2(c, x + ox * px, y + 0.4 * px, -0.001, px * 0.06, 0.003, 5594214, { fade: f });
        }
        box2(c, x, y - 0.485 * px, -0.003, px * 0.96, px * 0.03, 0.001, 3752010, { fade: f });
        box2(c, x - 0.485 * px, y, -0.0034, px * 0.03, px * 0.96, 0.001, 3357252, { fade: f });
      }
  }
  const p = kid(c, K19.pixel.at, mod19);
  if (p)
    mod19.render(p);
};
var mod20 = { spec: spec20, render: render20 };

// src/render/pixeltiles.ts
var W2 = 6.6;
var K20 = {
  pixelblock: { at: { pos: [0, 0, 0.003], scale: 0.303 }, mod: () => mod20 }
};
var spec21 = {
  id: "pixeltiles",
  name: "pixel tiles",
  size: 0.002,
  kids: K20,
  dive: "pixelblock",
  approach: { dir: [0.45, 0.42, 0.8], up: [0, 1, 0] }
};
var render21 = (c) => {
  const u = local(c);
  const on = smooth(-0.55, -0.05, u);
  const off = 1 - smooth(0.55, 0.9, u);
  const f = on * off;
  if (f >= 0.02) {
    box2(c, 0, 0, -0.003, 3.4, 3.4, 0.002, 395275, { fade: on });
    const px = 1 / W2;
    for (let gy = -11;gy <= 11; gy++)
      for (let gx = -11;gx <= 11; gx++) {
        const x = gx * px, y = gy * px;
        const [r, g, b] = samplePixel(DIVE_PX.x + gx, DIVE_PX.y - gy);
        for (const [ox, col, v] of [[-0.3, 16720401, r], [0, 2293555, g], [0.3, 2241535, b]]) {
          box2(c, x + ox * px, y, 0, px * 0.2, px * 0.78, 0.0008, col, { glow: true, fade: f * v });
          box2(c, x + ox * px, y, -0.0012, px * 0.24, px * 0.84, 0.0006, 1316380, { fade: f * 0.9 });
        }
      }
  }
  const p = kid(c, K20.pixelblock.at, mod20);
  if (p)
    mod20.render(p);
};
var mod21 = { spec: spec21, render: render21 };

// src/render/panel.ts
var W3 = 66;
var K21 = {
  pixeltiles: { at: { pos: [0, 0, 0.004], scale: 0.1 }, mod: () => mod21 }
};
var spec22 = {
  id: "panel",
  name: "display panel",
  size: 0.02,
  kids: K21,
  dive: "pixeltiles",
  approach: { dir: [0.4, 0.48, 0.82], up: [0, 1, 0] }
};
var render22 = (c) => {
  const u = local(c);
  const on = smooth(-0.6, 0, u);
  const off = 1 - smooth(0.55, 0.9, u);
  const f = on * off;
  if (f < 0.02) {
    const p0 = kid(c, K21.pixeltiles.at, mod21);
    if (p0)
      mod21.render(p0);
    return;
  }
  box2(c, 0, 0, -0.004, 3.6, 3.6, 0.004, 461068, { fade: on });
  const px = 1 / W3;
  for (let gy = -24;gy < 24; gy++)
    for (let gx = -24;gx < 24; gx++) {
      const x = (gx + 0.5) * 4 * px, y = (gy + 0.5) * 4 * px;
      const m = Math.max(Math.abs(x), Math.abs(y));
      if (m < 0.3)
        continue;
      const feather = smooth(0.3, 0.44, m);
      const [r, g, b] = samplePixel(DIVE_PX.x + x * W3, DIVE_PX.y - y * W3);
      box2(c, x, y, 0, 4 * px * 0.92, 4 * px * 0.92, 0.001, r * 255 << 16 | g * 255 << 8 | b * 255, { glow: true, fade: f * feather });
    }
  for (let gy = -23;gy <= 23; gy++)
    for (let gx = -23;gx <= 23; gx++) {
      const x = gx * px, y = gy * px;
      const [r, g, b] = samplePixel(DIVE_PX.x + gx, DIVE_PX.y - gy);
      box2(c, x, y, 0.001, px * 0.86, px * 0.86, 0.0008, r * 255 << 16 | g * 255 << 8 | b * 255, { glow: true, fade: f });
    }
  const p = kid(c, K21.pixeltiles.at, mod21);
  if (p)
    mod21.render(p);
};
var mod22 = { spec: spec22, render: render22 };

// src/render/screen.ts
var pxX = (px) => (px / SW - 0.5) * 0.94;
var pxY = (py) => (0.5 - py / SH) * 0.61 - 0.012;
var K22 = {
  panel: { at: { pos: [pxX(DIVE_PX.x), pxY(DIVE_PX.y), 0.006], scale: 0.0645 }, mod: () => mod22 }
};
var spec23 = {
  id: "screen",
  name: "the screen",
  size: 0.31,
  kids: K22,
  dive: "panel",
  approach: { dir: [0.35, 0.42, 0.85], up: [0, 1, 0] }
};
var M2 = new THREE2.Matrix4;
var P2 = new THREE2.Vector3;
var Q2 = new THREE2.Quaternion;
var S2 = new THREE2.Vector3;
var render23 = (c) => {
  box2(c, 0, 0, -0.014, 1, 0.68, 0.012, 12106946);
  box2(c, 0, 0, -0.003, 0.985, 0.665, 0.011, 855568);
  box2(c, 0, 0.293, 0.0035, 0.11, 0.014, 0.002, 395016);
  sph2(c, 0, 0.293, 0.005, 0.006, 1714750);
  sph2(c, 0, 0.293, 0.006, 0.003, 3364266, { glow: true, fade: 0.4 });
  const x = local(c) - 1;
  const op = (1 - 0.62 * smooth(-0.5, 0.1, x)) * (1 - smooth(0.5, 0.92, x));
  const dx = 0 - c.cx, dy = -0.012 - c.cy, dz = 0.0035 - c.cz;
  P2.set(dx * c.f, dy * c.f, dz * c.f).applyQuaternion(Q2.set(c.qx, c.qy, c.qz, c.qw));
  S2.set(0.94 * c.f, 0.61 * c.f, 1);
  M2.compose(P2, Q2, S2);
  if (P2.length() < 22000)
    setScreenQuad(M2, op * c.fade);
  box2(c, 0, -0.012, 0.002, 0.94, 0.61, 0.001, 2241348, { glow: true, fade: 0.12 * op });
  const gl = pierce(c, 0.72, 0.96);
  if (gl > 0.02)
    box2(c, 0, -0.012, 0.011, 0.97, 0.645, 0.004, 2897992, { glow: true, fade: gl * 0.18 });
  const p = kid(c, K22.panel.at, mod22);
  if (p)
    mod22.render(p);
};
var mod23 = { spec: spec23, render: render23 };

// src/render/macbook.ts
var LID = aa(1, 0, 0, -20 * Math.PI / 180);
var K23 = {
  chassis: { at: { pos: [0, -0.045, 0.02], scale: 0.94 }, mod: () => mod15 },
  screen: { at: { pos: [0, 0.345, -0.467], scale: 0.97, quat: LID }, mod: () => mod23 }
};
var spec24 = {
  id: "macbook",
  name: "MacBook Pro",
  size: 0.32,
  kids: K23,
  dive: ["chassis", "screen"],
  approach: { dir: [0.3, 0.85, 0.75], up: [0, 1, 0] }
};
var ROWS2 = [
  "`1234567890-=",
  "qwertyuiop[]",
  "asdfghjkl;'",
  "zxcvbnm,./",
  "fnczov cmd  "
];
var render24 = (c) => {
  const u = local(c);
  const deckFade = branchBit(0) === 0 && u > -2 ? pierce(c, 0.55, 0.88) : 1;
  box2(c, 0, -0.026, 0.02, 0.97, 0.028, 0.68, 12106946, { fade: Math.max(deckFade, 0) });
  box2(c, 0, -0.0405, 0.02, 0.9, 0.002, 0.6, 11120052);
  for (const [x, z] of [[-0.4, -0.24], [0.4, -0.24], [-0.4, 0.28], [0.4, 0.28]])
    cyl2(c, x, -0.0435, z + 0.02, 0.024, 0.004, 4145735);
  box2(c, 0, -0.006, 0.02, 0.97, 0.012, 0.68, 12830669, { fade: deckFade });
  box2(c, 0, 0.0005, -0.115, 0.62, 0.002, 0.245, 1513499, { fade: deckFade });
  for (let r = 0;r < 6; r++) {
    const n = r === 0 ? 13 : r === 5 ? 9 : ROWS2[Math.min(r - 1, 3)].length + 1;
    const rowOff = r % 2 * 0.008, gap = 0.006;
    let cursor = -0.29 + rowOff;
    for (let i = 0;i < n; i++) {
      const w = r === 5 && i === 3 ? 0.16 : 0.038;
      const kx = cursor + w / 2;
      cursor += w + gap;
      if (kx > 0.31)
        continue;
      const kz = -0.215 + r * 0.041;
      const seed = r * 100 + i;
      const legW = w * (0.22 + hashf(seed) * 0.18), legOffX = (hashf(seed + 50) - 0.5) * w * 0.3;
      box2(c, kx, 0.004, kz, w, r === 0 ? 0.004 : 0.006, r === 0 ? 0.022 : 0.036, 2763824, { fade: deckFade });
      box2(c, kx, 0.0075, kz, w * 0.86, 0.001, (r === 0 ? 0.022 : 0.036) * 0.8, 3487548, { fade: deckFade });
      box2(c, kx + legOffX, 0.0085, kz - 0.004, legW, 0.0004, 0.008, 12172740, { fade: deckFade });
    }
  }
  box2(c, 0, 0.0008, 0.185, 0.36, 0.0018, 0.24, 11712189, { fade: deckFade });
  box2(c, 0, 0.0012, 0.185, 0.355, 0.0004, 0.235, 12567498, { fade: deckFade });
  for (const sx of [-0.42, 0.42])
    for (let i = 0;i < 40; i++)
      sph2(c, sx + (i % 4 - 1.5) * 0.014, 0.0015, -0.22 + Math.floor(i / 4) * 0.024, 0.005, 5593182, { fade: deckFade });
  for (let i = 0;i < 3; i++)
    box2(c, -0.487, -0.02, -0.13 + i * 0.09, 0.006, 0.008, 0.028, 1842464);
  box2(c, -0.487, -0.02, -0.24, 0.006, 0.01, 0.04, 1842464);
  sph2(c, -0.492, -0.02, -0.24, 0.006, 16755251, { glow: true, fade: 0.6 });
  box2(c, 0.487, -0.02, -0.1, 0.006, 0.012, 0.045, 1842464);
  box2(c, 0.487, -0.02, 0, 0.006, 0.006, 0.055, 1842464);
  cyl2(c, 0, 0.002, -0.335, 0.03, 0.84, 10133157, { q: aa(0, 0, 1, Math.PI / 2) });
  box2(c, 0, -0.0425, 0.22, 0.16, 0.0006, 0.05, 13093841);
  for (let i = 0;i < 6; i++)
    box2(c, -0.06 + i * 0.021, -0.044, 0.2 + i % 2 * 0.03, 0.016, 0.0003, 0.006, 9080469);
  const ch = kid(c, K23.chassis.at, mod15);
  if (ch)
    mod15.render(ch);
  const sc = kid(c, K23.screen.at, mod23);
  if (sc)
    mod23.render(sc);
};
var mod24 = { spec: spec24, render: render24 };

// src/render/desk.ts
var SURF = 0.1815;
var K24 = {
  macbook: { at: { pos: [-0.02, 0.1878, -0.03], scale: 0.178, quat: aa(0, 1, 0, 0.06) }, mod: () => mod24 }
};
var spec25 = {
  id: "desk",
  name: "desk",
  size: 1.8,
  kids: K24,
  dive: "macbook",
  approach: { dir: [0.5, 0.72, 0.55], up: [0, 1, 0] }
};
var render25 = (c) => {
  box2(c, 0, 0.168, 0, 1, 0.024, 0.52, 10121288);
  box2(c, 0, 0.1805, 0, 1, 0.001, 0.52, 11042130);
  for (let i = 0;i < 7; i++)
    box2(c, 0, 0.1812, -0.22 + i * 0.074, 0.98, 0.0006, 0.06, i % 2 ? 10647376 : 11567958);
  box2(c, 0, 0.14, 0, 0.94, 0.03, 0.46, 8806462);
  for (const [x, z] of [[-0.46, -0.22], [0.46, -0.22], [-0.46, 0.22], [0.46, 0.22]])
    box2(c, x, -0.03, z, 0.035, 0.42, 0.035, 8017720);
  cyl2(c, -0.38, 0.225, -0.16, 0.09, 0.09, 11754045);
  cyl2(c, -0.38, 0.272, -0.16, 0.084, 0.008, 4863524);
  for (let i = 0;i < 10; i++) {
    const a = i / 10 * Math.PI * 2, sw = Math.sin(c.time * 1.1 + i) * 0.02;
    box2(c, -0.38 + Math.sin(a) * 0.035 + sw, 0.315 + i % 3 * 0.02, -0.16 + Math.cos(a) * 0.035, 0.016, 0.1 + i % 4 * 0.02, 0.004, i % 2 ? 4094516 : 5149760, { q: aa(Math.cos(a), 0, -Math.sin(a), 0.5 + sw) });
  }
  cyl2(c, 0.27, SURF + 0.0015, 0.09, 0.075, 0.003, 13288112);
  cyl2(c, 0.27, 0.215, 0.09, 0.052, 0.06, 12863546);
  cyl2(c, 0.27, 0.241, 0.09, 0.044, 0.004, 3811872);
  cyl2(c, 0.302, 0.215, 0.09, 0.012, 0.032, 12863546, { q: aa(0, 0, 1, Math.PI / 2) });
  for (let i = 0;i < 3; i++)
    sph2(c, 0.27 + Math.sin(c.time * 1.8 + i * 2) * 0.01, 0.263 + (c.time * 0.05 + i * 0.017) % 0.05, 0.09, 0.015 - i * 0.003, 14540253, { glow: true, fade: 0.25 });
  box2(c, 0.16, 0.1825, 0.14, 0.13, 0.001, 0.18, 15921126, { q: aa(0, 1, 0, -0.15) });
  for (let i = 0;i < 11; i++)
    box2(c, 0.155 - Math.sin(0.15) * (i * 0.013 - 0.06), 0.1832, 0.075 + i * 0.013, 0.1, 0.0004, 0.003, 9147301, { q: aa(0, 1, 0, -0.15) });
  cyl2(c, 0.232, SURF + 0.003, 0.205, 0.006, 0.12, 2250154, { q: mulQuat(aa(0, 1, 0, 0.35), aa(1, 0, 0, Math.PI / 2)) });
  cyl2(c, 0.248, SURF + 0.0025, 0.228, 0.005, 0.1, 3355443, { q: mulQuat(aa(0, 1, 0, -0.6), aa(1, 0, 0, Math.PI / 2)) });
  const nbYaw = (hashf(41) - 0.5) * 0.5;
  box2(c, -0.02, SURF + 0.008, 0.24, 0.15, 0.016, 0.2, 2832970, { q: aa(0, 1, 0, nbYaw) });
  box2(c, -0.02, SURF + 0.017, 0.24, 0.14, 0.001, 0.19, 3623004, { q: aa(0, 1, 0, nbYaw) });
  for (let i = 0;i < 3; i++) {
    const stYaw = (hashf(50 + i) - 0.5) * 0.6;
    box2(c, -0.06 + i * 0.025, SURF + 0.0006, 0.32 + i * 0.035, 0.03, 0.0012, 0.03, [15915342, 15891038, 8309610][i], { q: aa(0, 1, 0, stYaw) });
  }
  const hpX = 0.13, hpZ = -0.07, hpYaw = (hashf(60) - 0.5) * 0.8;
  for (const side of [-1, 1]) {
    const cx2 = hpX + Math.cos(hpYaw + Math.PI / 2) * side * 0.055;
    const cz2 = hpZ + Math.sin(hpYaw + Math.PI / 2) * side * 0.055;
    cyl2(c, cx2, SURF + 0.012, cz2, 0.068, 0.024, 2369067);
    cyl2(c, cx2, SURF + 0.0275, cz2, 0.05, 0.006, 3487549);
  }
  box2(c, hpX, SURF + 0.05, hpZ, 0.075, 0.012, 0.03, 1842464, { q: aa(0, 1, 0, hpYaw) });
  for (let i = 0;i < 5; i++) {
    const t2 = i / 4;
    cyl2(c, -0.05 + Math.sin(t2 * 3.1) * 0.015, SURF + 0.0025, -0.09 - t2 * 0.17, 0.005, 0.045, 1842464, { q: aa(1, 0, 0, Math.PI / 2) });
  }
  for (let i = 0;i < 4; i++)
    box2(c, 0.38, 0.194 + i * 0.022, -0.17, 0.15 - i * 0.012, 0.02, 0.2, [3493995, 7031349, 4877114, 7829367][i], { q: aa(0, 1, 0, i * 0.09) });
  box2(c, -0.24, SURF + 0.003, 0.16, 0.062, 0.006, 0.13, 1711136, { q: aa(0, 1, 0, 0.4) });
  box2(c, -0.24, SURF + 0.0084, 0.16, 0.055, 0.0004, 0.12, 1053468, { q: aa(0, 1, 0, 0.4) });
  sph2(c, -0.24, SURF + 0.0088, 0.115, 0.006, 3407735, { glow: true, fade: 0.4 + 0.3 * Math.sin(c.time * 2) });
  const lampX = -0.42, lampZ = 0.1, footY = SURF + 0.003;
  cyl2(c, lampX, footY, lampZ, 0.06, 0.006, 2040102);
  const postH = 0.1, postY = footY + 0.003 + postH / 2, postTopY = postY + postH / 2;
  cyl2(c, lampX, postY, lampZ, 0.016, postH, 3158842);
  cyl2(c, lampX, postTopY, lampZ, 0.02, 0.012, 2237482);
  const armAng = 0.6, armLen = 0.15, armDY = Math.cos(armAng), armDZ = Math.sin(armAng);
  cyl2(c, lampX, postTopY + armLen / 2 * armDY, lampZ + armLen / 2 * armDZ, 0.013, armLen, 3158842, { q: aa(1, 0, 0, armAng) });
  const headY = postTopY + armLen * armDY, headZ = lampZ + armLen * armDZ;
  sph2(c, lampX, headY, headZ, 0.075, 3816772);
  sph2(c, lampX, headY - armDY * 0.02, headZ - armDZ * 0.02 + 0.01, 0.03, 16772539, { glow: true, fade: 0.85 });
  const m = kid(c, K24.macbook.at, mod24);
  if (m)
    mod24.render(m);
};
var mod25 = { spec: spec25, render: render25 };

// src/render/room.ts
var FLOOR = -0.4975;
var K25 = {
  desk: { at: { pos: [0.1, -0.428, -0.32], scale: 0.3, quat: aa(0, 1, 0, 0.04) }, mod: () => mod25 }
};
var spec26 = {
  id: "room",
  name: "room",
  size: 6,
  kids: K25,
  dive: "desk",
  approach: { dir: [0.55, 0.5, 0.48], up: [0, 1, 0], entryD: 0.55 }
};
var render26 = (c) => {
  box2(c, 0, -0.505, 0, 1.04, 0.01, 1.04, 9073493);
  for (let i = 0;i < 13; i++)
    box2(c, 0, -0.4995, -0.48 + i * 0.08, 1.02, 0.004, 0.072, i % 2 ? 10256737 : 9730394);
  box2(c, 0, 0.505, 0, 1.04, 0.01, 1.04, 15262938);
  box2(c, 0, 0, -0.515, 1.04, 1.02, 0.01, 14275268);
  box2(c, 0, 0, 0.515, 1.04, 1.02, 0.01, 14275268);
  box2(c, -0.515, 0, 0, 0.01, 1.02, 1.04, 13617338);
  box2(c, 0.515, 0, -0.325, 0.01, 1.02, 0.39, 13946303);
  box2(c, 0.515, 0, 0.325, 0.01, 1.02, 0.39, 13946303);
  box2(c, 0.515, 0.38, 0, 0.01, 0.26, 0.26, 13946303);
  box2(c, 0.515, -0.38, 0, 0.01, 0.26, 0.26, 13946303);
  box2(c, 0.512, 0, 0, 0.012, 0.5, 0.26, 16052714);
  box2(c, 0.518, 0, 0, 0.004, 0.5, 0.02, 16052714);
  box2(c, 0.518, 0, 0, 0.004, 0.02, 0.26, 16052714);
  box2(c, 0.52, 0, 0, 0.002, 0.47, 0.24, 12575743, { glow: true, fade: 0.9 });
  const sway = Math.sin(c.time * 0.7) * 0.008;
  box2(c, 0.503, 0.02, -0.16 + sway, 0.02, 0.56, 0.09, 13154458);
  box2(c, 0.503, 0.02, 0.16 - sway, 0.02, 0.56, 0.09, 13154458);
  cyl2(c, 0.503, 0.31, 0, 0.008, 0.44, 10521192, { q: aa(1, 0, 0, Math.PI / 2) });
  for (const bz of [-0.16, 0.16])
    box2(c, 0.5085, 0.31, bz, 0.0015, 0.016, 0.02, 10521192);
  box2(c, -0.508, -0.12, 0.22, 0.008, 0.76, 0.17, 11901816);
  sph2(c, -0.5, -0.15, 0.155, 0.014, 14270852);
  box2(c, 0.05, -0.494, -0.1, 0.5, 0.004, 0.42, 8014650);
  box2(c, 0.05, -0.4935, -0.1, 0.42, 0.004, 0.34, 10250834);
  cyl2(c, 0.12, 0.27, -0.507, 0.09, 0.008, 16118508, { q: aa(1, 0, 0, Math.PI / 2) });
  cyl2(c, 0.12, 0.27, -0.508, 0.096, 0.004, 3355443, { q: aa(1, 0, 0, Math.PI / 2) });
  const mins = Date.now() / 60000 % 60, hrs = Date.now() / 3600000 % 12;
  const hand = (ang, len, w, col) => box2(c, 0.12 + Math.sin(ang) * len / 2, 0.27 + Math.cos(ang) * len / 2, -0.503, w, len, 0.002, col, { q: aa(0, 0, 1, -ang) });
  hand(mins / 60 * Math.PI * 2, 0.066, 0.005, 2236962);
  hand(hrs / 12 * Math.PI * 2, 0.044, 0.007, 2236962);
  hand(Date.now() / 1000 % 60 / 60 * Math.PI * 2, 0.07, 0.002, 13382434);
  box2(c, -0.28, 0.12, -0.49, 0.3, 0.012, 0.05, 9071176);
  for (let i = 0;i < 9; i++)
    box2(c, -0.4 + i * 0.03, 0.155 + i % 3 * 0.004, -0.49, 0.022, 0.058 + i % 3 * 0.008, 0.04, [9057060, 2972538, 7830854, 11045198, 5982824][i % 5], { q: aa(0, 0, 1, i % 4 * 0.02) });
  const ch = [0.32, -0.36, -0.18];
  box2(c, ch[0], ch[1], ch[2], 0.09, 0.014, 0.09, 4869461);
  box2(c, ch[0] + 0.048, ch[1] + 0.08, ch[2], 0.014, 0.16, 0.09, 4869461);
  cyl2(c, ch[0], ch[1] - 0.05, ch[2], 0.012, 0.09, 7830661);
  for (let i = 0;i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    cyl2(c, ch[0] + Math.sin(a) * 0.04, ch[1] - 0.095, ch[2] + Math.cos(a) * 0.04, 0.01, 0.01, 5593699);
  }
  cyl2(c, -0.35, -0.28, 0.3, 0.01, 0.42, 3948357);
  cyl2(c, -0.35, -0.05, 0.3, 0.09, 0.07, 15261120);
  sph2(c, -0.35, -0.06, 0.3, 0.04, 16770736, { glow: true });
  for (let i = 0;i < 9; i++) {
    const jz = (hashf(i * 3.1) - 0.5) * 0.012;
    cyl2(c, -0.15 + i * 0.07, FLOOR + 0.0025, -0.49 + jz, 0.005, 0.076, 1842464, { q: aa(0, 0, 1, Math.PI / 2) });
  }
  box2(c, -0.16, -0.42, -0.507, 0.03, 0.045, 0.006, 15262938);
  box2(c, -0.16, -0.42, -0.5035, 0.01, 0.018, 0.003, 2763824);
  box2(c, 0, -0.4825, -0.505, 1, 0.03, 0.01, 13616820);
  box2(c, 0, -0.4825, 0.505, 1, 0.03, 0.01, 13616820);
  box2(c, -0.505, -0.4825, 0, 0.01, 0.03, 1, 13616820);
  box2(c, 0.505, -0.4825, 0, 0.01, 0.03, 1, 13616820);
  box2(c, 0, 0.494, -0.505, 1, 0.012, 0.012, 14472904);
  box2(c, 0.505, 0.494, 0, 0.012, 0.012, 1, 14472904);
  const shelf2Y = -0.05, shelf2Top = shelf2Y + 0.006;
  box2(c, -0.28, shelf2Y, -0.49, 0.32, 0.012, 0.05, 8018490);
  for (let i = 0;i < 6; i++) {
    const bh = 0.06 + i % 3 * 0.012;
    box2(c, -0.42 + i * 0.05, shelf2Top + bh / 2, -0.49, 0.026, bh, 0.04, [7027245, 3825530, 5929530, 9071162, 4864602, 8018474][i], { q: aa(0, 0, 1, i % 3 * 0.02) });
  }
  const frame = (fx, fy, w, h, art) => {
    box2(c, fx, fy, -0.507, w, h, 0.006, 2762272);
    box2(c, fx, fy, -0.5035, w - 0.014, h - 0.014, 0.003, art);
  };
  frame(0.36, 0.14, 0.13, 0.17, 3824250);
  frame(-0.44, 0.34, 0.1, 0.13, 8018490);
  const pendFlicker = 0.85 + 0.15 * Math.sin(c.time * 0.9);
  cyl2(c, 0.05, 0.45, 0.05, 0.006, 0.1, 2763824);
  cyl2(c, 0.05, 0.395, 0.05, 0.09, 0.05, 3356220);
  sph2(c, 0.05, 0.39, 0.05, 0.045, 16771522, { glow: true, fade: pendFlicker });
  box2(c, 0.495, -0.26, 0, 0.03, 0.012, 0.28, 14341058);
  cyl2(c, 0.34, FLOOR + 0.08, -0.02, 0.14, 0.16, 3816770);
  cyl2(c, 0.34, FLOOR + 0.166, -0.02, 0.155, 0.012, 3027254);
  const d = kid(c, K25.desk.at, mod25);
  if (d)
    mod25.render(d);
};
var mod26 = { spec: spec26, render: render26 };

// src/core/track.ts
var ENTRY_D = 1.6;
var norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var slerpV = (a, b, u) => {
  const d = Math.min(1, Math.max(-1, dot2(a, b)));
  const w = Math.acos(d);
  if (w < 0.0001)
    return norm(add(mul(a, 1 - u), mul(b, u)));
  const s = Math.sin(w);
  return norm(add(mul(a, Math.sin((1 - u) * w) / s), mul(b, Math.sin(u * w) / s)));
};
var conj = (q) => [-q[0], -q[1], -q[2], q[3]];
var route = (branches) => {
  const mods = [mod26];
  let fork = 0;
  for (;; ) {
    const s = mods[mods.length - 1].spec;
    if (!s.dive)
      return mods;
    const id = typeof s.dive === "string" ? s.dive : s.dive[branches[fork++] ?? 0];
    mods.push(s.kids[id].mod());
  }
};
var entryDir = (m) => norm(m.spec.approach?.dir ?? [0.55, 0.8, 0.5]);
var entryLen = (m) => m.spec.approach?.entryD ?? ENTRY_D;
var entryUp = (m) => norm(m.spec.approach?.up ?? [0, 1, 0]);
var diveIdAt = (mods, j, branches) => {
  const d = mods[j].spec.dive;
  if (d === undefined)
    return;
  if (typeof d === "string")
    return d;
  let fi = 0;
  for (let i = 0;i < j; i++)
    if (Array.isArray(mods[i].spec.dive))
      fi++;
  return d[branches[fi] ?? 0];
};
var poseInLevel = (mods, k, u, branches) => {
  const m = mods[k];
  const did = diveIdAt(mods, k, branches);
  const A = mul(entryDir(m), entryLen(m));
  let c = [0, 0, 0], B, upEnd;
  if (did) {
    const at = m.spec.kids[did].at;
    const q = at.quat ?? [0, 0, 0, 1];
    c = at.pos;
    B = add(c, mul(rotV(q, mul(entryDir(mods[k + 1]), entryLen(mods[k + 1]))), at.scale));
    upEnd = rotV(q, entryUp(mods[k + 1]));
  } else {
    B = mul(rotV([0, Math.sin(0.6), 0, Math.cos(0.6)], entryDir(m)), 0.5);
    upEnd = entryUp(m);
  }
  const a = sub(A, c), b = sub(B, c);
  const ra = Math.max(0.000000001, Math.hypot(...a)), rb = Math.max(0.000000001, Math.hypot(...b));
  const r = ra * Math.pow(rb / ra, u);
  const dir = slerpV(norm(a), norm(b), u);
  const pos = add(c, mul(dir, r));
  let look = c;
  if (did) {
    const at = m.spec.kids[did].at;
    const q = at.quat ?? [0, 0, 0, 1];
    const nextId = diveIdAt(mods, k + 1, branches);
    const nd = nextId ? mods[k + 1].spec.kids[nextId].at.pos : [0, 0, 0];
    const s = u * u * (3 - 2 * u);
    look = add(c, mul(rotV(q, nd), at.scale * s));
  }
  const up = slerpV(entryUp(m), norm(upEnd), u);
  return { pos, look, up };
};
var lookQuat = (pos, look, up) => {
  const z = norm(sub(pos, look));
  let x = cross(up, z);
  if (Math.hypot(...x) < 0.00001)
    x = cross([up[1], up[2], up[0]], z);
  x = norm(x);
  const y = cross(z, x);
  const m00 = x[0], m01 = y[0], m02 = z[0], m10 = x[1], m11 = y[1], m12 = z[1], m20 = x[2], m21 = y[2], m22 = z[2];
  const tr = m00 + m11 + m22;
  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1);
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
};
var buildChain = (t, branches) => {
  const mods = route(branches);
  const N = mods.length;
  const k = Math.min(N - 1, Math.max(0, Math.floor(t)));
  const u = t - k;
  const { pos, look, up } = poseInLevel(mods, k, u, branches);
  const camQuat = lookQuat(pos, look, up);
  const entries = new Array(Math.min(N, k + 5));
  entries[k] = { id: mods[k].spec.id, cx: pos[0], cy: pos[1], cz: pos[2], qx: 0, qy: 0, qz: 0, qw: 1, f: 1 };
  for (let j = k - 1;j >= 0; j--) {
    const did = diveIdAt(mods, j, branches);
    const at = mods[j].spec.kids[did].at;
    const q = at.quat ?? [0, 0, 0, 1];
    const e = entries[j + 1];
    const p = rotV(q, [e.cx, e.cy, e.cz]);
    const rq = mulQuat([e.qx, e.qy, e.qz, e.qw], conj(q));
    entries[j] = {
      id: mods[j].spec.id,
      cx: at.pos[0] + p[0] * at.scale,
      cy: at.pos[1] + p[1] * at.scale,
      cz: at.pos[2] + p[2] * at.scale,
      qx: rq[0],
      qy: rq[1],
      qz: rq[2],
      qw: rq[3],
      f: e.f / at.scale
    };
  }
  for (let j = k + 1;j < Math.min(N, k + 5); j++) {
    const did = diveIdAt(mods, j - 1, branches);
    const at = mods[j - 1].spec.kids[did].at;
    const q = at.quat ?? [0, 0, 0, 1];
    const e = entries[j - 1];
    const p = rotV(conj(q), [e.cx - at.pos[0], e.cy - at.pos[1], e.cz - at.pos[2]]);
    const rq = mulQuat([e.qx, e.qy, e.qz, e.qw], q);
    entries[j] = {
      id: mods[j].spec.id,
      cx: p[0] / at.scale,
      cy: p[1] / at.scale,
      cz: p[2] / at.scale,
      qx: rq[0],
      qy: rq[1],
      qz: rq[2],
      qw: rq[3],
      f: e.f * at.scale
    };
  }
  return { entries, camQuat, k, u, mods };
};
var trackPoint = (ch, t2, branches) => {
  const N = ch.mods.length;
  const k2 = Math.min(N - 1, Math.max(0, Math.floor(t2)));
  const e = ch.entries[k2];
  if (!e)
    return null;
  const { pos } = poseInLevel(ch.mods, k2, t2 - k2, branches);
  const v = rotV([e.qx, e.qy, e.qz, e.qw], [pos[0] - e.cx, pos[1] - e.cy, pos[2] - e.cz]);
  return [v[0] * e.f, v[1] * e.f, v[2] * e.f];
};

// src/hud.ts
var nameEl = document.querySelector("#hud .name");
var scaleEl = document.querySelector("#hud .scale");
var chevL = document.getElementById("chevL");
var chevR = document.getElementById("chevR");
var UNITS = [[1, "m"], [0.001, "mm"], [0.000001, "µm"], [0.000000001, "nm"], [0.000000000001, "pm"], [0.000000000000001, "fm"], [0.000000000000000001, "am"]];
var fmtSize = (m) => {
  for (const [u, s] of UNITS)
    if (m >= u * 0.9995 || u === 0.000000000000000001) {
      const v = m / u;
      return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${s} across`;
    }
  return "";
};
var setHud = (name, sizeM) => {
  if (nameEl.textContent !== name)
    nameEl.textContent = name;
  scaleEl.textContent = fmtSize(sizeM);
};
var setFork = (visible, sel) => {
  chevL.classList.toggle("show", visible);
  chevR.classList.toggle("show", visible);
  chevL.classList.toggle("on", visible && sel === 0);
  chevR.classList.toggle("on", visible && sel === 1);
};

// src/main.ts
var t = 0.05;
var branches = [];
var keys = new Set;
var mouse = { x: 0.5, y: 0.42 };
addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyA" && Math.floor(t) === FORK)
    branches[0] = 0;
  if (e.code === "KeyD" && Math.floor(t) === FORK)
    branches[0] = 1;
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("mousemove", (e) => {
  mouse.x = e.clientX / innerWidth;
  mouse.y = e.clientY / innerHeight;
});
var FORK = route([]).findIndex((m) => Array.isArray(m.spec.dive));
var renderer = new THREE3.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(BG);
document.body.appendChild(renderer.domElement);
var camera = new THREE3.PerspectiveCamera(62, innerWidth / innerHeight, 0.002, 40000);
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
var qTrack = new THREE3.Quaternion;
var qYaw = new THREE3.Quaternion;
var qPitch = new THREE3.Quaternion;
var vFwd = new THREE3.Vector3;
var last = performance.now();
var frame = (now) => {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  const N0 = route(branches).length;
  let v = 1;
  v *= 0.42 + 0.58 * smooth(0.1, 0.8, Math.abs(t - (FORK + 0.55)));
  v *= 0.25 + 0.75 * smooth(-0.05, 0.7, Math.min(t - 0.03, N0 - 0.32 - t));
  if (keys.has("KeyW"))
    t += dt * v;
  if (keys.has("KeyS"))
    t -= dt * v;
  if (Math.floor(t) >= FORK && branches.length === 0)
    branches.push(0);
  if (t < FORK && branches.length > 0)
    branches.pop();
  const N = route(branches).length;
  t = Math.min(N - 0.32, Math.max(0.03, t));
  const ch = buildChain(t, branches);
  qTrack.set(ch.camQuat[0], ch.camQuat[1], ch.camQuat[2], ch.camQuat[3]);
  qYaw.setFromAxisAngle(new THREE3.Vector3(0, 1, 0), -(mouse.x - 0.5) * Math.PI * 2);
  qPitch.setFromAxisAngle(new THREE3.Vector3(1, 0, 0), -(mouse.y - 0.42) * Math.PI * 0.9);
  camera.quaternion.copy(qTrack).multiply(qYaw).multiply(qPitch);
  camera.position.set(0, 0, 0);
  vFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  drawScreen(time);
  screenTex.needsUpdate = true;
  setScreenQuad(null, 0);
  beginPools();
  beginFrame(ch.entries, [vFwd.x, vFwd.y, vFwd.z], branches);
  const e0 = ch.entries[0];
  const root = { cx: e0.cx, cy: e0.cy, cz: e0.cz, qx: e0.qx, qy: e0.qy, qz: e0.qz, qw: e0.qw, f: e0.f, depth: 0, onPath: true, t, time, fade: 1 };
  render26(root);
  for (let i = 0;i < LINE_POINTS; i++) {
    const s = i / (LINE_POINTS - 1);
    const t2 = t - 3.2 + s * 6.6;
    const p = trackPoint(ch, Math.min(N - 0.06, Math.max(0.02, t2)), branches);
    const taper = smooth(0, 0.06, s) * (1 - smooth(0.94, 1, s));
    if (p)
      setLinePoint(i, p[0], p[1], p[2], taper);
    else
      setLinePoint(i, 0, 0, -1, 0);
  }
  commitPools();
  const k = ch.k, m0 = ch.mods[k].spec, m1 = ch.mods[Math.min(N - 1, k + 1)].spec;
  setHud(m0.name, m0.size * Math.pow(m1.size / m0.size, ch.u));
  setFork(t > FORK - 0.75 && t < FORK + 0.9, branches[0] ?? 0);
  renderer.render(scene, camera);
};
requestAnimationFrame(frame);
Object.defineProperty(window, "__izT", { get: () => t, set: (x) => {
  t = x;
} });
window.__izB = branches;
