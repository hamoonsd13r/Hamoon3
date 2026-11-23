// Serpent bodies for the hall: an in-place-updated tube with an elliptical, flat-bellied cross-section, a real head
// (wide jaw, narrow neck, rounded snout), parallel-transport frames (so the spine pattern stays on top), scale UVs in
// metres, plus path helpers (serpentine floor paths, helices round pillars) and a "rear up" pose.
import * as THREE from "three";
import { ramp } from "../lib";

const V3 = THREE.Vector3;

/** a tube mesh with n rings × m sides, rebuilt in place each frame */
export class Tube {
  n: number;
  m: number;
  geo: THREE.BufferGeometry;
  mesh: THREE.Mesh;
  pos: Float32Array;
  nor: Float32Array;
  uv: Float32Array;
  // scratch
  private T: THREE.Vector3[];
  private N: THREE.Vector3[];
  private Bn: THREE.Vector3[];
  constructor(n: number, m: number, mat: THREE.Material) {
    this.n = n;
    this.m = m;
    const vc = n * (m + 1);
    this.pos = new Float32Array(vc * 3);
    this.nor = new Float32Array(vc * 3);
    this.uv = new Float32Array(vc * 2);
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++)
      for (let j = 0; j < m; j++) {
        const a = i * (m + 1) + j, b = (i + 1) * (m + 1) + j;
        idx.push(a, a + 1, b, b, a + 1, b + 1); // outward-facing (T × B = −N, so the ring order is reversed)
      }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.T = Array.from({ length: n }, () => new V3());
    this.N = Array.from({ length: n }, () => new V3());
    this.Bn = Array.from({ length: n }, () => new V3());
  }
  /**
   * c: ring centres (n×3), rx/ry: half width / half height per ring, s: arc length per ring (m),
   * uLen: metres of body per texture tile along u, uOff: texture slide, belly: 0..1 flattening of the underside
   */
  set(c: Float32Array, rx: Float32Array, ry: Float32Array, s: Float32Array, uLen: number, uOff = 0, belly = 0.35, up = new V3(0, 1, 0)) {
    const { n, m, T, N, Bn, pos, nor, uv } = this;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      T[i].set(c[b * 3] - c[a * 3], c[b * 3 + 1] - c[a * 3 + 1], c[b * 3 + 2] - c[a * 3 + 2]);
      if (T[i].lengthSq() < 1e-12) T[i].copy(i ? T[i - 1] : new V3(0, 0, -1));
      T[i].normalize();
    }
    // first frame: "up" projected off the tangent; then parallel transport
    N[0].copy(up).addScaledVector(T[0], -up.dot(T[0]));
    if (N[0].lengthSq() < 1e-6) N[0].set(1, 0, 0).addScaledVector(T[0], -T[0].x);
    N[0].normalize();
    Bn[0].crossVectors(T[0], N[0]).normalize();
    const ax = new V3();
    const q = new THREE.Quaternion();
    for (let i = 1; i < n; i++) {
      ax.crossVectors(T[i - 1], T[i]);
      const l = ax.length();
      N[i].copy(N[i - 1]);
      if (l > 1e-6) {
        q.setFromAxisAngle(ax.multiplyScalar(1 / l), Math.atan2(l, T[i - 1].dot(T[i])));
        N[i].applyQuaternion(q);
      }
      // keep the spine leaning toward world up when the body lies on the floor (avoids slow twisting)
      const lift = up.dot(T[i]);
      if (Math.abs(lift) < 0.8) {
        const target = new V3().copy(up).addScaledVector(T[i], -lift).normalize();
        N[i].lerp(target, 0.25);
      }
      N[i].addScaledVector(T[i], -N[i].dot(T[i])).normalize();
      Bn[i].crossVectors(T[i], N[i]).normalize();
    }
    const tw = Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const cx = c[i * 3], cy = c[i * 3 + 1], cz = c[i * 3 + 2];
      const w = rx[i], h = ry[i];
      for (let j = 0; j <= m; j++) {
        const ang = (j / m) * tw;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        // flat-ish belly: squash the lower half
        const hy = ca < 0 ? h * (1 - belly) : h;
        const ox = sa * w, oy = ca * hy;
        const k = (i * (m + 1) + j) * 3;
        pos[k] = cx + N[i].x * oy + Bn[i].x * ox;
        pos[k + 1] = cy + N[i].y * oy + Bn[i].y * ox;
        pos[k + 2] = cz + N[i].z * oy + Bn[i].z * ox;
        // ellipse normal
        const nx = sa / Math.max(w, 1e-4), ny = ca / Math.max(hy, 1e-4);
        const il = 1 / Math.hypot(nx, ny);
        nor[k] = (N[i].x * ny + Bn[i].x * nx) * il;
        nor[k + 1] = (N[i].y * ny + Bn[i].y * nx) * il;
        nor[k + 2] = (N[i].z * ny + Bn[i].z * nx) * il;
        const ku = (i * (m + 1) + j) * 2;
        uv[ku] = s[i] / uLen + uOff;
        uv[ku + 1] = j / m;
      }
    }
    // the snout ring collapses to a point: give it the tangent as normal
    for (let j = 0; j <= m; j++) {
      if (rx[0] < 1e-3) {
        const k = j * 3;
        nor[k] = -T[0].x;
        nor[k + 1] = -T[0].y;
        nor[k + 2] = -T[0].z;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
    this.geo.attributes.uv.needsUpdate = true;
  }
}

/** a polyline path sampled every ds metres, with arc-length lookup */
export class Path {
  p: Float32Array;
  ds: number;
  len: number;
  constructor(pts: THREE.Vector3[], ds: number) {
    this.ds = ds;
    this.p = new Float32Array(pts.length * 3);
    pts.forEach((v, i) => this.p.set([v.x, v.y, v.z], i * 3));
    this.len = (pts.length - 1) * ds;
  }
  at(s: number, out: THREE.Vector3) {
    const n = this.p.length / 3;
    const f = Math.min(n - 1.0001, Math.max(0, s / this.ds));
    const i = Math.floor(f), k = f - i;
    const a = i * 3, b = (i + 1) * 3;
    return out.set(this.p[a] + (this.p[b] - this.p[a]) * k, this.p[a + 1] + (this.p[b + 1] - this.p[a + 1]) * k, this.p[a + 2] + (this.p[b + 2] - this.p[a + 2]) * k);
  }
}

/** serpentine path on the floor: heading wanders as a sum of sines (y = height above the floor) */
export const floorPath = (x0: number, z0: number, h0: number, len: number, y: number, wig: { a: number; w: number; ph: number }[], ds = 0.04) => {
  const pts: THREE.Vector3[] = [];
  let x = x0, z = z0;
  for (let s = 0; s <= len; s += ds) {
    pts.push(new V3(x, y, z));
    let h = h0;
    for (const g of wig) h += g.a * Math.sin(s * g.w + g.ph);
    x += Math.sin(h) * ds;
    z -= Math.cos(h) * ds;
  }
  return new Path(pts, ds);
};

/** helix climbing round a pillar (centre cx, cz; radius R), starting at height y0 */
export const helixPath = (cx: number, cz: number, R: number, y0: number, pitch: number, len: number, ph: number, ds = 0.04) => {
  const pts: THREE.Vector3[] = [];
  const circ = Math.hypot(Math.PI * 2 * R, pitch);
  for (let s = 0; s <= len; s += ds) {
    const a = ph + (s / circ) * Math.PI * 2;
    pts.push(new V3(cx + Math.cos(a) * R, y0 + (s / circ) * pitch, cz + Math.sin(a) * R));
  }
  return new Path(pts, ds);
};

/** ring arc positions, dense near the head */
export const ringS = (n: number, L: number) => {
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = L * (i / (n - 1)) ** 1.45;
  return s;
};

/** snake radius profile: s from the snout tip, r body radius → [half width, half height] */
export const snakeProfile = (s: number, L: number, r: number): [number, number] => {
  const hl = r * 4.6; // head length
  if (s < hl) {
    const k = s / hl;
    const snout = Math.sqrt(Math.min(1, s / (r * 0.55)));
    const jaw = 1 + 0.42 * Math.sin(Math.min(1, k / 0.8) * Math.PI) ** 1.4;
    const w = r * 0.62 * snout * jaw + (k > 0.8 ? r * 0.1 * ((k - 0.8) / 0.2) : 0);
    return [Math.max(w, 0), Math.max(w * 0.62, 0)];
  }
  const neck = 1 - 0.18 * Math.exp(-(((s - hl * 1.15) / (r * 1.4)) ** 2));
  const body = s < L * 0.55 ? 1 : Math.max(0.03, Math.max(0, 1 - (s - L * 0.55) / (L * 0.45)) ** 1.15);
  const swell = 1 + 0.08 * Math.sin(Math.min(1, s / (L * 0.55)) * Math.PI);
  const rr = r * neck * body * swell;
  return [rr, rr * 0.9];
};

/** integral of a speed that eases from 1 down to f over [t0, t0 + d] (so a serpent slows as it rears) */
export const slowAfter = (t: number, t0: number, d: number, f: number) => {
  if (t < t0) return t;
  if (t < t0 + d) return t - (1 - f) * (t - t0) ** 2 / (2 * d);
  return t0 + d - (1 - f) * d / 2 + f * (t - t0 - d);
};

/**
 * Lift the front of a body into a rearing S-curve. c holds ring centres (head first) laid along the path;
 * the first rings with s < sR are blended toward the reared pose by k (0..1). sway turns the neck sideways.
 */
export const rear = (c: Float32Array, s: Float32Array, sR: number, k: number, sway: number, nod: number) => {
  if (k <= 0) return;
  const n = s.length;
  let ib = 0;
  while (ib < n - 1 && s[ib] < sR) ib++;
  const B = new V3(c[ib * 3], c[ib * 3 + 1], c[ib * 3 + 2]);
  const ib2 = Math.max(0, ib - 3);
  const F = new V3(c[ib2 * 3] - B.x, 0, c[ib2 * 3 + 2] - B.z);
  if (F.lengthSq() < 1e-8) F.set(0, 0, -1);
  F.normalize().applyAxisAngle(new V3(0, 1, 0), sway);
  const U = new V3(0, 1, 0);
  // integrate the reared neck from the base B toward the head
  const P = B.clone();
  const steps = ib;
  const out: THREE.Vector3[] = [];
  out[ib] = B.clone();
  for (let i = ib - 1; i >= 0; i--) {
    const q = 1 - s[i] / sR; // 0 at base → 1 at the snout
    const al = 1.45 * ramp(q, 0, 0.42) - 1.3 * ramp(q, 0.62, 0.97) + nod;
    const dsi = s[i + 1] - s[i];
    P.addScaledVector(F, Math.cos(al) * dsi).addScaledVector(U, Math.sin(al) * dsi);
    out[i] = P.clone();
  }
  const kk = k * k * (3 - 2 * k);
  for (let i = 0; i < steps; i++) {
    const w = kk * Math.min(1, (1 - s[i] / sR) * 4);
    c[i * 3] += (out[i].x - c[i * 3]) * w;
    c[i * 3 + 1] += (out[i].y - c[i * 3 + 1]) * w;
    c[i * 3 + 2] += (out[i].z - c[i * 3 + 2]) * w;
  }
};
