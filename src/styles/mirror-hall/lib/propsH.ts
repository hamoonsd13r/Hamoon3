// Mirror Hall · the things in the hall: silver candlesticks with glass tulip shades (شمعدان و لاله), wax
// candles and their flames. Flames are camera-facing quads drawn in the hall pass (they write depth where the flame
// is, so the hall's depth of field blurs an out-of-focus flame into a soft disc and the floor reflects them).
import * as THREE from "three";
import { HALL_COMMON, type HallUniforms } from "./hallMat";

// ───────────────────────── candlestick (lathe) ─────────────────────────
// profile (radius, height) in world units: base, knops, stem, drip pan; the candle sits on top
const STICK: [number, number][] = [
  [0.01, 0], [3.0, 0], [3.15, 0.22], [2.95, 0.5], [2.2, 0.75], [1.4, 1.05], [0.9, 1.45], [0.72, 2.2], [1.25, 2.75], [1.3, 2.95], [0.62, 3.45],
  [0.48, 5.4], [0.95, 5.85], [1.0, 6.05], [0.5, 6.45], [0.42, 8.0], [0.75, 8.25], [1.75, 8.55], [1.85, 8.72], [1.7, 8.82], [0.55, 8.9], [0.01, 8.92],
];
export const STICK_TOP = 8.9;
export const CANDLE_H = 3.4;
export const FLAME_Y = STICK_TOP + CANDLE_H + 0.55; // flame centre above the stick's foot
const TULIP: [number, number][] = [
  [0.75, 8.95], [0.95, 9.3], [1.55, 10.1], [1.95, 11.2], [2.05, 12.2], [1.92, 13.1], [1.62, 13.9], [1.55, 14.2],
];

const METAL_FRAG = /* glsl */ `
${HALL_COMMON}
uniform vec3 tint; uniform float rough;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  if (dot(N, V) < 0.0) N = -N;
  // chased silver (قلم‌زنی): rows of small flowers and leaves; the grooves hold dark tarnish
  float a = vUv.x * 6.2831853, y = vUv.y;
  float rowY = fract(y * 14.0);
  float flower = 0.5 + 0.5 * cos(a * 18.0 + floor(y * 14.0) * 1.7) * sin(rowY * 3.14159);
  float leaf = 0.5 + 0.5 * sin(a * 36.0 + y * 90.0);
  float eng = smoothstep(0.55, 0.85, flower) * 0.8 + smoothstep(0.75, 0.95, leaf) * 0.35;
  float groove = smoothstep(0.08, 0.0, abs(rowY - 0.04));
  float cav = clamp(eng * 0.6 + groove, 0.0, 1.0);
  N = normalize(N + vec3(cos(a), 0.0, sin(a)) * (eng - 0.4) * 0.22 + vec3(0.0, groove * 0.3, 0.0));
  vec3 R = reflect(-V, N);
  float fr = 0.62 + 0.38 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 col = (roomR(vW, R) * 0.9 + glintsAt(vW, R, rough + cav * 0.04)) * tint * fr * (1.0 - 0.7 * cav) + diffuseAt(vW, N) * tint * 0.06 * (1.0 - cav);
  gl_FragColor = vec4(col, 1.0);
}`;
const WAX_FRAG = /* glsl */ `
${HALL_COMMON}
uniform vec3 flameP; uniform float flameAmt;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 alb = vec3(0.86, 0.8, 0.68);
  // drips of wax down the side (thicker, more translucent, glossy), an uneven top rim
  float ax = vUv.x, y = vUv.y;
  float drip = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float ca = fract(fi * 0.618 + 0.13);
    float len = 0.15 + 0.55 * fract(fi * 0.371 + 0.4);
    float w = 0.018 + 0.012 * fract(fi * 0.53);
    float dx = abs(fract(ax - ca + 0.5) - 0.5);
    float yEnd = 1.0 - len;
    float d = y > yEnd ? dx : length(vec2(dx, (yEnd - y) * 0.6));
    drip = max(drip, smoothstep(w, w * 0.4, d));
  }
  float dy = flameP.y - vW.y;
  float sss = exp(-max(dy, 0.0) * (0.75 - 0.25 * drip)) * flameAmt;
  vec3 V2 = normalize(cameraPosition - vW);
  vec3 R = reflect(-V2, N);
  vec3 col = alb * diffuseAt(vW, N) * (1.0 + 0.15 * drip) + vec3(1.0, 0.55, 0.2) * sss * (1.6 + 0.8 * drip) + glintsAt(vW, R, 0.05) * 0.05 * drip;
  gl_FragColor = vec4(col, 1.0);
}`;
const GLASS_FRAG = /* glsl */ `
${HALL_COMMON}
uniform vec3 flameP; uniform float flameAmt;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  if (dot(N, V) < 0.0) N = -N;
  vec3 R = reflect(-V, N);
  // cut glass: vertical flutes and an etched band of small leaves
  float fl = 0.5 + 0.5 * cos(vUv.x * 6.2831853 * 20.0);
  float band = smoothstep(0.62, 0.66, vUv.y) * (1.0 - smoothstep(0.78, 0.82, vUv.y));
  float etch = band * (0.5 + 0.5 * sin(vUv.x * 6.2831853 * 40.0 + vUv.y * 60.0));
  N = normalize(N + vec3(cos(vUv.x * 6.2831853), 0.0, sin(vUv.x * 6.2831853)) * (fl - 0.5) * 0.35);
  R = reflect(-V, N);
  float fr = 0.04 + 0.96 * pow(1.0 - abs(dot(N, V)), 4.0);
  // the shade catches the flame: a warm inner glow brightest near the flame's height; the etching glows frosted
  float g = exp(-abs(vW.y - flameP.y) * 0.45) * flameAmt;
  vec3 col = (roomR(vW, R) + glintsAt(vW, R, 0.0)) * fr * 1.4 + vec3(1.0, 0.62, 0.28) * g * (0.06 + 0.35 * fr + 0.5 * etch) + vec3(1.0, 0.8, 0.6) * etch * 0.04 * flameAmt;
  gl_FragColor = vec4(col, 1.0);
}`;
export const STD_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const lathe = (prof: [number, number][], seg = 40) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export type Candlestick = { group: THREE.Group; flameLocal: THREE.Vector3; wax: THREE.ShaderMaterial; glass: THREE.ShaderMaterial };
/** chased silver (the candlesticks, the mirror's frame) */
export function makeSilver(U: HallUniforms, tint = new THREE.Vector3(0.82, 0.84, 0.88), rough = 0.07) {
  return new THREE.ShaderMaterial({ uniforms: { ...U, tint: { value: tint }, rough: { value: rough } }, vertexShader: STD_VERT, fragmentShader: METAL_FRAG, side: THREE.DoubleSide });
}
export function makeCandlestick(U: HallUniforms, tulip = true): Candlestick {
  const group = new THREE.Group();
  const metal = makeSilver(U);
  group.add(new THREE.Mesh(lathe(STICK, 48), metal));
  const fl = new THREE.Vector3(0, FLAME_Y, 0);
  const wax = new THREE.ShaderMaterial({ uniforms: { ...U, flameP: { value: new THREE.Vector3() }, flameAmt: { value: 1 } }, vertexShader: STD_VERT, fragmentShader: WAX_FRAG });
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, CANDLE_H, 24, 1), wax);
  candle.position.y = STICK_TOP + CANDLE_H / 2;
  group.add(candle);
  // the wick
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6), new THREE.MeshBasicMaterial({ color: 0x110a06 }));
  wick.position.y = STICK_TOP + CANDLE_H + 0.18;
  group.add(wick);
  const glass = new THREE.ShaderMaterial({
    uniforms: { ...U, flameP: { value: new THREE.Vector3() }, flameAmt: { value: 1 } },
    vertexShader: STD_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  if (tulip) {
    const tg = new THREE.Mesh(lathe(TULIP, 48), glass);
    tg.renderOrder = 5;
    group.add(tg);
  }
  return { group, flameLocal: fl, wax, glass };
}

// ───────────────────────── flames ─────────────────────────
// a flame: a camera-facing (around the vertical) quad; teardrop core (white-yellow), orange mantle, a blue root; it
// sways and stretches with a per-flame flicker; it writes depth only inside the flame (discard outside)
export const MAXFL = 64;
export function makeFlames() {
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.setAttribute("position", base.attributes.position);
  geo.setAttribute("uv", base.attributes.uv);
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(MAXFL * 3), 3);
  const iPar = new THREE.InstancedBufferAttribute(new Float32Array(MAXFL * 4), 4); // size, seed, amount, —
  iPos.setUsage(THREE.DynamicDrawUsage);
  iPar.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("iPos", iPos);
  geo.setAttribute("iPar", iPar);
  geo.instanceCount = 0;
  const U = { uTime: { value: 0 }, gainF: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
attribute vec3 iPos; attribute vec4 iPar;
uniform float uTime;
varying vec2 vUv; varying float vAmt; varying float vSeed;
float n1(float x){ return sin(x) * 0.5 + sin(x * 2.31 + 1.3) * 0.3 + sin(x * 5.17 + 0.7) * 0.2; }
void main(){
  float s = iPar.x; vSeed = iPar.y; vAmt = iPar.z;
  float fl = n1(uTime * 9.0 + vSeed * 31.0);
  float h = s * (2.6 + 0.35 * fl) * (0.25 + 0.75 * clamp(vAmt, 0.0, 1.0));
  float w = s * (0.9 - 0.08 * fl);
  // cylindrical billboard: x along the camera's right projected to the ground plane, y up
  vec3 toC = cameraPosition - iPos; toC.y = 0.0;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toC + vec3(1e-4, 0.0, 0.0))));
  float sway = n1(uTime * 5.0 + vSeed * 17.0) * 0.12 * s * position.y * 2.0;
  vec3 p = iPos + right * (position.x * w + sway) + vec3(0.0, (position.y + 0.5) * h - 0.3 * s, 0.0);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: /* glsl */ `
uniform float gainF;
varying vec2 vUv; varying float vAmt; varying float vSeed;
void main(){
  vec2 q = vec2(vUv.x * 2.0 - 1.0, vUv.y);
  // teardrop: wide near the bottom third, pointed at the top
  float y = q.y;
  float wid = (y < 0.28) ? sqrt(max(0.0, y / 0.28)) * 0.95 : pow(max(0.0, 1.0 - (y - 0.28) / 0.72), 1.15) * 0.95;
  float d = abs(q.x) / max(wid, 1e-3);
  float m = smoothstep(1.0, 0.55, d) * smoothstep(0.0, 0.06, y);
  if (m < 0.04 || vAmt <= 0.0) discard;
  float core = smoothstep(0.7, 0.0, d) * smoothstep(0.05, 0.3, y) * (1.0 - smoothstep(0.55, 0.85, y));
  vec3 c = vec3(1.0, 0.42, 0.1) * m * 2.2 + vec3(1.0, 0.86, 0.6) * core * 7.0;
  c += vec3(0.25, 0.4, 1.0) * smoothstep(0.22, 0.0, y) * m * 1.2;
  gl_FragColor = vec4(c * vAmt * gainF, 1.0);
}`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  return {
    mesh,
    U,
    set(list: { p: THREE.Vector3; size: number; seed: number; amt: number }[]) {
      const n = Math.min(MAXFL, list.length);
      for (let i = 0; i < n; i++) {
        iPos.setXYZ(i, list[i].p.x, list[i].p.y, list[i].p.z);
        iPar.setXYZW(i, list[i].size, list[i].seed, list[i].amt, 0);
      }
      iPos.needsUpdate = true;
      iPar.needsUpdate = true;
      geo.instanceCount = n;
    },
  };
}
