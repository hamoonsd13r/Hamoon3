// Archive Machine · the data world's camera: one pure function of film time, shared by the three.js scene and any DOM layer
// that has to sit in the same perspective.
import * as THREE from "three";
import { clamp, mix } from "./theme";

const sine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u));

export const CORE = new THREE.Vector3(0, 70, 0);

type Key = { t: number; p: [number, number, number]; q: [number, number, number]; fov: number; up?: [number, number, number] };
type Shot = { a: number; b: number; keys: Key[]; e?: (u: number) => number };

// shots of the data world (cuts between them are hard)
const SHOTS: Shot[] = [
  {
    // the core in the dark, the city ignites, push in and past it
    a: -1,
    b: 10.72,
    keys: [
      { t: 0, p: [15, 80, 215], q: [0, 70, 0], fov: 26 },
      { t: 1.4, p: [12, 78, 168], q: [0, 70, 0], fov: 27 },
      { t: 2.83, p: [8, 81, 104], q: [0, 66.5, 0], fov: 30 },
      { t: 4.5, p: [3.5, 75, 40], q: [0, 69, 0], fov: 33 },
      { t: 5.62, p: [17, 67, -12], q: [5, 52, -95], fov: 42 },
      { t: 7.2, p: [13, 58, -62], q: [0, 40, -165], fov: 44 },
      { t: 10.72, p: [6, 50, -104], q: [0, 36, -205], fov: 46 },
    ],
  },
  {
    // «give me a second»: the dive down the avenue
    a: 10.72,
    b: 11.95,
    e: (u) => u,
    keys: [
      { t: 10.72, p: [0, 44, 270], q: [0, 34, 200], fov: 50 },
      { t: 10.94, p: [0, 42, 262], q: [0, 30, 190], fov: 52 },
      { t: 11.35, p: [0, 26, 120], q: [0, 18, 20], fov: 70 },
      { t: 11.95, p: [0, 14, -150], q: [0, 10, -260], fov: 78 },
    ],
  },
  {
    // the match: straight down onto the lit district, settling
    a: 11.95,
    b: 99,
    e: sine,
    keys: [
      { t: 11.95, p: [0, 210, -430], q: [0, 0, -430.01], fov: 46, up: [0, 0, -1] },
      { t: 12.26, p: [0, 186, -430], q: [0, 0, -430.01], fov: 44, up: [0, 0, -1] },
    ],
  },
];

const v3 = (a: [number, number, number]) => new THREE.Vector3(...a);

export const camAt = (t: number) => {
  const s = SHOTS.find((x) => t >= x.a && t < x.b) ?? SHOTS[SHOTS.length - 1];
  const ks = s.keys;
  let i = 0;
  while (i < ks.length - 2 && t >= ks[i + 1].t) i++;
  const k1 = ks[i], k2 = ks[Math.min(i + 1, ks.length - 1)];
  const k0 = ks[Math.max(0, i - 1)], k3 = ks[Math.min(i + 2, ks.length - 1)];
  const span = Math.max(1e-6, k2.t - k1.t);
  const u0 = clamp((t - k1.t) / span);
  const u = (s.e ?? ((x: number) => x))(u0);
  // Catmull-Rom through the keys: no stop at every key
  const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  const P = (j: "p" | "q") => new THREE.Vector3(cr(k0[j][0], k1[j][0], k2[j][0], k3[j][0]), cr(k0[j][1], k1[j][1], k2[j][1], k3[j][1]), cr(k0[j][2], k1[j][2], k2[j][2], k3[j][2]));
  return { pos: P("p"), target: P("q"), fov: mix(k1.fov, k2.fov, u), up: k1.up ? v3(k1.up) : new THREE.Vector3(0, 1, 0), shot: SHOTS.indexOf(s) };
};

/** a camera object posed for time t (for projecting DOM layers) */
export const camObj = (t: number, aspect = 16 / 9) => {
  const k = camAt(t);
  const c = new THREE.PerspectiveCamera(k.fov, aspect, 0.5, 4000);
  c.position.copy(k.pos);
  c.up.copy(k.up);
  c.lookAt(k.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
};
