// Immediate-mode instanced pools. Reset every frame; renderers push primitives;
// three.js is only the rasterizer. One draw call per pool.
import * as THREE from "three";
import { screenCanvas } from "./screenimg";

export const BG = 0x0a0c10;

type Pool = { mesh: THREE.InstancedMesh; fade: THREE.InstancedBufferAttribute; cap: number };

const injectFade = (mat: THREE.Material) => {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aFade; varying float vFade;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFade = aFade;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFade;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.a *= vFade;");
  };
};

const makePool = (geo: THREE.BufferGeometry, cap: number, glow: boolean): Pool => {
  const mat = glow
    ? new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false })
    : new THREE.MeshLambertMaterial({ alphaHash: true });
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
  if (glow) mesh.renderOrder = 5;
  return { mesh, fade, cap };
};

const box = makePool(new THREE.BoxGeometry(1, 1, 1), 45000, false);
const sph = makePool(new THREE.SphereGeometry(0.5, 14, 10), 12000, false);
const cyl = makePool(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), 9000, false);
const gbox = makePool(new THREE.BoxGeometry(1, 1, 1), 30000, true);
const gsph = makePool(new THREE.SphereGeometry(0.5, 18, 12), 16000, true);
export const pools = { box, sph, cyl, gbox, gsph };

// The green line — a true GL line primitive, ~1 device px, translucent, never widens.
const LINE_N = 400;
const linePos = new THREE.BufferAttribute(new Float32Array(LINE_N * 3), 3);
linePos.setUsage(THREE.DynamicDrawUsage);
const lineAlpha = new THREE.BufferAttribute(new Float32Array(LINE_N), 1);
lineAlpha.setUsage(THREE.DynamicDrawUsage);
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", linePos);
lineGeo.setAttribute("aA", lineAlpha);
const lineMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: false, // the path shows through everything, softly
  vertexShader: `attribute float aA; varying float vA;
    void main(){ vA=aA; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.30,1.0,0.55,0.55*vA); }`,
});
export const greenLine = new THREE.Line(lineGeo, lineMat);
greenLine.frustumCulled = false;
greenLine.renderOrder = 8;
export const setLinePoint = (i: number, x: number, y: number, z: number, a: number) => {
  linePos.setXYZ(i, x, y, z); lineAlpha.setX(i, a);
};

// The MacBook screen — one dedicated textured quad fed by the live OS canvas.
export const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, transparent: true, depthWrite: true, toneMapped: false });
export const screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), screenMat);
screenQuad.frustumCulled = false;
export const setScreenQuad = (m: THREE.Matrix4 | null, opacity: number) => {
  if (!m || opacity < 0.01) { screenQuad.visible = false; return; }
  screenQuad.visible = true;
  screenQuad.matrixAutoUpdate = false;
  screenQuad.matrix.copy(m);
  screenMat.opacity = opacity;
};

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 160, 2600); // render units = current level frame → constant feel at every depth
scene.add(box.mesh, sph.mesh, cyl.mesh, gbox.mesh, gsph.mesh, greenLine, screenQuad);
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x3a3228, 0.85));
const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
sun.position.set(0.6, 0.9, 0.35);
scene.add(sun, new THREE.AmbientLight(0xffffff, 0.35));

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
export const pushInstance = (
  p: Pool, px: number, py: number, pz: number,
  qx: number, qy: number, qz: number, qw: number,
  sx: number, sy: number, sz: number, r: number, g: number, b: number, f: number,
) => {
  const i = p.mesh.count;
  if (i >= p.cap) { if (i === p.cap) console.warn("pool overflow", p.cap); return; }
  Q.set(qx, qy, qz, qw); P.set(px, py, pz); S.set(sx, sy, sz);
  M.compose(P, Q, S);
  M.toArray(p.mesh.instanceMatrix.array as unknown as number[], i * 16);
  const c = p.mesh.instanceColor!.array as Float32Array;
  c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
  (p.fade.array as Float32Array)[i] = f;
  p.mesh.count = i + 1;
};

export const beginPools = () => { for (const p of Object.values(pools)) p.mesh.count = 0; };
export const commitPools = () => {
  for (const p of Object.values(pools)) {
    p.mesh.instanceMatrix.needsUpdate = true;
    p.mesh.instanceColor!.needsUpdate = true;
    p.fade.needsUpdate = true;
  }
  linePos.needsUpdate = true; lineAlpha.needsUpdate = true;
};
export const LINE_POINTS = LINE_N;
