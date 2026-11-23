// The queen's serpent body: ONE long tube from a tail tip lying in the water, winding up an irregular, eccentric
// spiral (radius, height and centre all wander; one loop swings out over the coil below), then rising straight up
// into her waist. Rebuilt every frame from t so it breathes and creeps.
import * as THREE from "three";
import { clamp } from "../lib";
import { Board, type Tex } from "../kit";
import { Sil } from "./hall-sil";
import { QA, QB, QH, Q_EYE, type Layer } from "./hall-art";

const V3 = THREE.Vector3;
const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
const sstep = (a: number, b: number, x: number) => {
  const k = clamp((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

export type CoilOut = { c: Float32Array; rx: Float32Array; ry: Float32Array; s: Float32Array; len: number };

/** dense centreline (tail → waist) with radius, relative to the dais centre */
const dense = (t: number, waistY: number) => {
  const P: THREE.Vector3[] = [];
  const Rr: number[] = [];
  const TURNS = 3.5, TH = Math.PI * 2 * TURNS;
  const br = 1 + 0.012 * Math.sin(t * 0.9);
  const spiral = (th: number) => {
    const f = th / TH;
    const oval = 1 + 0.12 * Math.cos(2 * th + f * 2.5) * (1 - f * 0.6);
    const R = (3.7 - 2.5 * f ** 0.85 + 0.28 * Math.sin(2.1 * th + 0.7) * (1 - f) + 1.25 * bump(f, 0.385, 0.06) + 0.7 * bump(f, 0.7, 0.05)) * br * oval;
    const cx = 0.32 * Math.sin(0.8 * th + 0.3), cz = 0.26 * Math.cos(0.6 * th);
    const r = (0.66 + 0.16 * Math.sin(Math.min(1, f * 1.5) * Math.PI) - 0.18 * f) * (1 + 0.04 * Math.sin(th * 2.7) + 0.012 * Math.sin(t * 1.3 + th));
    const y = r * 0.8 + 2.6 * f ** 1.2 + 0.34 * Math.sin(th + 0.6) * (1 - 0.6 * f) + 0.12 * Math.sin(2.3 * th + 1.1) * (1 - f) + 0.95 * bump(f, 0.385, 0.06) + 0.5 * bump(f, 0.7, 0.05) + 0.03 * Math.sin(t * 0.8 + th * 0.7);
    const a = th + 0.35; // start at the front-right
    return { p: new V3(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R), r };
  };
  // tail: an S lying on the wet floor, out toward the camera side, tip curling
  const s0 = spiral(0);
  const t0 = spiral(0.02).p.sub(s0.p).normalize();
  const tip = new V3(3.6 + 0.25 * Math.sin(t * 1.1), 0.05, 9.4 + 0.2 * Math.sin(t * 0.7));
  const NT = 160;
  for (let i = 0; i < NT; i++) {
    const u = i / NT;
    // cubic Hermite from the tip to the spiral start, with a lateral S wave that travels toward the tip
    const m0 = new V3(-4.5, 0, -3.5), m1 = t0.clone().multiplyScalar(9);
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const p = tip.clone().multiplyScalar(h00).addScaledVector(m0, h10).addScaledVector(s0.p, h01).addScaledVector(m1, h11);
    const side = Math.sin(u * 9 - t * 1.6) * 0.45 * (1 - u) * u * 4;
    p.x += side * 0.7;
    p.z += side * 0.4;
    const r = 0.02 + (s0.r - 0.02) * Math.pow(u, 0.75);
    p.y = r * 0.7 + (s0.p.y - s0.r * 0.7) * sstep(0.85, 1, u);
    P.push(p);
    Rr.push(r);
  }
  const NS = 1400;
  for (let i = 0; i <= NS; i++) {
    const { p, r } = spiral((i / NS) * TH);
    P.push(p);
    Rr.push(r);
  }
  // rise: from the spiral's end into the waist, ending vertical
  const e = spiral(TH);
  const te = spiral(TH).p.sub(spiral(TH - 0.02).p).normalize();
  const top = new V3(0.05 * Math.sin(t * 0.5), waistY, 0.0);
  const NR = 90;
  for (let i = 1; i <= NR; i++) {
    const u = i / NR;
    const m0 = te.clone().multiplyScalar(2.4), m1 = new V3(0, 2.6, 0);
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    P.push(e.p.clone().multiplyScalar(h00).addScaledVector(m0, h10).addScaledVector(top, h01).addScaledVector(m1, h11));
    Rr.push(e.r + (0.47 - e.r) * u);
  }
  return { P, Rr };
};

/** resample the dense centreline into n rings of equal spacing */
export const coil = (t: number, n: number, waistY: number, out?: CoilOut): CoilOut => {
  const { P, Rr } = dense(t, waistY);
  const cum = new Float32Array(P.length);
  for (let i = 1; i < P.length; i++) cum[i] = cum[i - 1] + P[i].distanceTo(P[i - 1]);
  const len = cum[P.length - 1];
  const o = out ?? { c: new Float32Array(n * 3), rx: new Float32Array(n), ry: new Float32Array(n), s: new Float32Array(n), len };
  o.len = len;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const sv = (i / (n - 1)) * len;
    while (j < P.length - 2 && cum[j + 1] < sv) j++;
    const k = clamp((sv - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]));
    const a = P[j], b = P[j + 1];
    o.c[i * 3] = a.x + (b.x - a.x) * k;
    o.c[i * 3 + 1] = a.y + (b.y - a.y) * k;
    o.c[i * 3 + 2] = a.z + (b.z - a.z) * k;
    const r = Rr[j] + (Rr[j + 1] - Rr[j]) * k;
    o.rx[i] = r * 1.1;
    o.ry[i] = r * 0.88;
    // texture runs head → tail: measure from the top
    o.s[i] = len - sv;
  }
  return o;
};

// ---------------------------------------------------------------- the queen as a small rig of rim-lit layers
/** pose: breathe (-1..1), head tilt (rad, + = chin toward camera), head squash (1 = profile),
 *  upper-arm angles (rad, outward) and forearm bends (rad, upward) */
export type QPose = { breathe: number; tilt: number; squash: number; armL: number; armR: number; foreL: number; foreR: number; lean: number; trailL: number; trailR: number };
const WAIST = 5.2, NECK = 6.4, SHOULDER = 6.1, HK = 1.24;

export class QueenRig extends THREE.Group {
  body: Sil;
  head: Sil;
  upL: Sil;
  upR: Sil;
  foL: Sil;
  foR: Sil;
  drL: Sil;
  drR: Sil;
  drLPivot = new THREE.Group();
  drRPivot = new THREE.Group();
  headPivot = new THREE.Group();
  armLPivot = new THREE.Group();
  armRPivot = new THREE.Group();
  elbowL = new THREE.Group();
  elbowR = new THREE.Group();
  eye: Board;
  handL = new THREE.Object3D();
  handR = new THREE.Object3D();
  front: Layer;
  back: Layer;
  parts: Sil[];
  constructor(T: Tex, body: Layer, headFront: Layer, headBack: Layer, upper: Layer, fore: Layer, drape: Layer) {
    super();
    this.rotation.order = "YXZ"; // face the camera (Y), then lean toward it (X)
    this.front = headFront;
    this.back = headBack;
    this.body = new Sil(body, QB.h);
    this.body.position.set(0, QB.top - QB.h, 0.6);
    this.head = new Sil(headFront, QH.h * HK);
    this.head.position.set(0, -((768 - QH.py) / 768) * QH.h * HK, 0);
    this.headPivot.position.set(0, NECK, 0.68);
    this.headPivot.add(this.head);
    this.upL = new Sil(upper, QA.upH);
    this.upR = new Sil(upper, QA.upH);
    this.foL = new Sil(fore, QA.foH);
    this.foR = new Sil(fore, QA.foH);
    this.drL = new Sil(drape, QA.drH);
    this.drR = new Sil(drape, QA.drH);
    const elbowY = -((QA.elbow - QA.py) / 400);
    const sets: [Sil, Sil, THREE.Group, THREE.Group, number, THREE.Object3D, Sil, THREE.Group][] = [
      [this.upL, this.foL, this.armLPivot, this.elbowL, -1, this.handL, this.drL, this.drLPivot],
      [this.upR, this.foR, this.armRPivot, this.elbowR, 1, this.handR, this.drR, this.drRPivot],
    ];
    for (const [u, f, p, e, sx, hand, d, dp] of sets) {
      d.position.set(0, -((600 - 20) / 600) * QA.drH, 0);
      d.scale.x = sx;
      dp.position.set(0, -0.06, -0.06); // behind the body layer: a sleeve in front of her dark body cannot glow
      dp.add(d);
      e.add(dp);
      d.u.uNoRimHi.value = 0.9;
      u.position.set(0, -((360 - QA.py) / 360) * QA.upH, 0);
      u.scale.x = sx;
      f.position.set(0, -((520 - QA.py) / 520) * QA.foH, 0.005);
      f.scale.x = sx;
      p.position.set(sx * 0.38, SHOULDER, 0.63);
      e.position.set(0, elbowY, 0);
      e.add(f, hand);
      hand.position.set(0, -0.86, 0);
      p.add(u, e);
      u.u.uNoRimHi.value = 0.86;
      u.u.uNoRimLo.value = 0.12;
      f.u.uNoRimHi.value = 0.93;
    }
    this.head.u.uNoRimLo.value = 0.1;
    this.body.u.uNoRimHi.value = 0.94;
    this.eye = new Board(T.glow, 0xffd27a, 0.06, 0.06, true, 0);
    this.eye.renderOrder = 2;
    this.eye.position.set((Q_EYE.x / 512 - 0.5) * QH.w * HK, ((QH.py - Q_EYE.y) / 768) * QH.h * HK, 0.03);
    this.headPivot.add(this.eye);
    this.add(this.body, this.headPivot, this.armLPivot, this.armRPivot);
    this.parts = [this.body, this.head, this.upL, this.upR, this.foL, this.foR, this.drL, this.drR];
  }
  pose(p: QPose) {
    const sy = 1 + 0.015 * p.breathe, sx = 1 + 0.01 * p.breathe;
    this.body.scale.set(sx, sy, 1);
    this.body.position.y = WAIST - (WAIST - (QB.top - QB.h)) * sy;
    const lift = (y: number) => WAIST + (y - WAIST) * sy;
    this.headPivot.position.y = lift(NECK);
    this.headPivot.rotation.z = -p.tilt;
    this.head.scale.x = p.squash;
    this.armLPivot.position.set(-0.38 * sx, lift(SHOULDER), 0.63);
    this.armRPivot.position.set(0.38 * sx, lift(SHOULDER), 0.63);
    this.armLPivot.rotation.z = -p.armL;
    this.armRPivot.rotation.z = p.armR;
    this.elbowL.rotation.z = -p.foreL;
    this.elbowR.rotation.z = p.foreR;
    // the bell sleeves always hang straight down (plus a slight sway)
    this.drLPivot.rotation.z = p.armL + p.foreL - 0.05 + p.trailL;
    this.drRPivot.rotation.z = -(p.armR + p.foreR) + 0.05 - p.trailR;
    this.rotation.x = p.lean;
  }
  all(fn: (s: Sil) => void) {
    this.parts.forEach(fn);
  }
  face(cam: THREE.Camera) {
    const v = new THREE.Vector3();
    this.getWorldPosition(v);
    this.rotation.y = Math.atan2(cam.position.x - v.x, cam.position.z - v.z);
  }
}
