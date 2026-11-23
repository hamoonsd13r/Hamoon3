// Snow Castle 3D · geometry kit: a Builder that bakes transformed primitives into a few big world-space buffers
// (one per material bucket), with texture coordinates in metres so masonry keeps one scale everywhere.
import * as THREE from "three";
import { clamp } from "./util";

type Part = { pos: Float32Array; nor: Float32Array; uv: Float32Array; col: Float32Array; idx: Uint32Array | null };

export type AddOpts = {
  /** "planar" (default): metres from the face plane · "keep": the geometry's own uv (already metres) */
  uv?: "planar" | "keep";
  /** snow multiplier for this piece (1 = normal, 0 = never snowy, >1 = loaded) */
  snow?: number;
  /** 0..1 brightness variation of this element */
  tint?: number;
  /** world y of the ground under this piece: darkens the first metres above it */
  baseY?: number;
  /** recompute face normals (hard edges) */
  flat?: boolean;
};

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _nm = new THREE.Matrix3();

export class Builder {
  parts = new Map<string, Part[]>();
  m = new THREE.Matrix4();
  private stack: THREE.Matrix4[] = [];
  tris = 0;

  push() {
    this.stack.push(this.m.clone());
    return this;
  }
  pop() {
    this.m = this.stack.pop()!;
    return this;
  }
  reset() {
    this.m.identity();
    return this;
  }
  translate(x: number, y: number, z: number) {
    this.m.multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    return this;
  }
  rotY(a: number) {
    this.m.multiply(new THREE.Matrix4().makeRotationY(a));
    return this;
  }
  rotX(a: number) {
    this.m.multiply(new THREE.Matrix4().makeRotationX(a));
    return this;
  }
  rotZ(a: number) {
    this.m.multiply(new THREE.Matrix4().makeRotationZ(a));
    return this;
  }
  scale(x: number, y: number, z: number) {
    this.m.multiply(new THREE.Matrix4().makeScale(x, y, z));
    return this;
  }
  /** world position of a local point under the current transform */
  at(x: number, y: number, z: number) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.m);
  }
  /** world direction (no translation) */
  dir(x: number, y: number, z: number) {
    return new THREE.Vector3(x, y, z).transformDirection(this.m);
  }

  add(bucket: string, g: THREE.BufferGeometry, o: AddOpts = {}) {
    let geo = g;
    if (o.flat) {
      geo = g.index ? g.toNonIndexed() : g;
      geo.computeVertexNormals();
    }
    const P = geo.attributes.position as THREE.BufferAttribute;
    const N = geo.attributes.normal as THREE.BufferAttribute;
    const UV = geo.attributes.uv as THREE.BufferAttribute | undefined;
    const n = P.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const m = this.m;
    _nm.getNormalMatrix(m);
    const keep = o.uv === "keep" && !!UV;
    const snow = o.snow ?? 1, tint = o.tint ?? 0.5;
    for (let i = 0; i < n; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m);
      _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize();
      pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
      nor[i * 3] = _n.x; nor[i * 3 + 1] = _n.y; nor[i * 3 + 2] = _n.z;
      if (keep) {
        uv[i * 2] = UV!.getX(i);
        uv[i * 2 + 1] = UV!.getY(i);
      } else if (Math.abs(_n.y) > 0.999) {
        uv[i * 2] = _v.x;
        uv[i * 2 + 1] = _v.z;
      } else {
        const l = Math.hypot(_n.x, _n.z);
        const tx = _n.z / l, tz = -_n.x / l;
        uv[i * 2] = _v.x * tx + _v.z * tz;
        uv[i * 2 + 1] = _v.x * (_n.y * tz) + _v.y * (_n.z * tx - _n.x * tz) + _v.z * (-_n.y * tx);
      }
      col[i * 3] = snow;
      col[i * 3 + 1] = tint;
      col[i * 3 + 2] = o.baseY === undefined ? 0 : clamp(1 - (_v.y - o.baseY) / 7);
    }
    let idx: Uint32Array | null = null;
    if (geo.index) {
      idx = new Uint32Array(geo.index.array as ArrayLike<number>);
      if (m.determinant() < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      this.tris += idx.length / 3;
    } else {
      if (m.determinant() < 0) {
        idx = new Uint32Array(n);
        for (let i = 0; i < n; i += 3) { idx[i] = i; idx[i + 1] = i + 2; idx[i + 2] = i + 1; }
      }
      this.tris += n / 3;
    }
    let list = this.parts.get(bucket);
    if (!list) this.parts.set(bucket, (list = []));
    list.push({ pos, nor, uv, col, idx });
    return this;
  }

  build(): Record<string, THREE.BufferGeometry> {
    const out: Record<string, THREE.BufferGeometry> = {};
    for (const [name, list] of this.parts) {
      let nv = 0, ni = 0;
      for (const p of list) { nv += p.pos.length / 3; ni += p.idx ? p.idx.length : p.pos.length / 3; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
      let vo = 0, io = 0;
      for (const p of list) {
        const n = p.pos.length / 3;
        pos.set(p.pos, vo * 3); nor.set(p.nor, vo * 3); uv.set(p.uv, vo * 2); col.set(p.col, vo * 3);
        if (p.idx) for (let i = 0; i < p.idx.length; i++) idx[io + i] = p.idx[i] + vo;
        else for (let i = 0; i < n; i++) idx[io + i] = vo + i;
        io += p.idx ? p.idx.length : n;
        vo += n;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeBoundingBox();
      g.computeBoundingSphere();
      out[name] = g;
    }
    this.parts.clear();
    return out;
  }
}

// ───────────────────────── primitives (origin = centre of the base, y up) ─────────────────────────

export function gBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
}

/** open cylinder / frustum; uv in metres, repeats rounded so the seam tiles with a T-metre texture */
export function gCyl(rTop: number, rBot: number, h: number, seg = 40, T = 2.5, hSeg = 1, t0 = 0, tLen = Math.PI * 2) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, hSeg, true, t0, tLen);
  g.translate(0, h / 2, 0);
  const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute;
  const circ = tLen * (rTop + rBot) * 0.5;
  const full = Math.abs(tLen - Math.PI * 2) < 1e-4;
  const len = full ? Math.max(1, Math.round(circ / T)) * T : circ;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, p.getY(i));
  return g;
}

/** horizontal disc facing up */
export function gDisk(r: number, seg = 40) {
  const g = new THREE.CircleGeometry(r, seg);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** horizontal ring facing up */
export function gRing(r0: number, r1: number, seg = 40) {
  const g = new THREE.RingGeometry(r0, r1, seg, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** surface of revolution from [radius, y] points; uv in metres (v = length along the profile) */
export function gLathe(profile: [number, number][], seg = 40, T = 3, rRef?: number) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y));
  const g = new THREE.LatheGeometry(pts, seg);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const rr = rRef ?? Math.max(...profile.map((p) => p[0]));
  const len = Math.max(1, Math.round((Math.PI * 2 * rr) / T)) * T;
  const n = pts.length;
  for (let i = 0; i < uv.count; i++) {
    const j = Math.round(uv.getY(i) * (n - 1));
    uv.setXY(i, uv.getX(i) * len, cum[clamp(j, 0, n - 1)]);
  }
  return g;
}

/** n-sided prism with flat faces (one face looks at +z) */
export function gPrism(n: number, rTop: number, rBot: number, h: number) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, n, 1, true);
  g.translate(0, h / 2, 0);
  g.rotateY(Math.PI / n);
  const f = g.index ? g.toNonIndexed() : g;
  f.computeVertexNormals();
  return f;
}

/** n-sided pyramid / spire with flat faces */
export function gPyramid(n: number, r: number, h: number) {
  const g = new THREE.ConeGeometry(r, h, n, 1, true);
  g.translate(0, h / 2, 0);
  g.rotateY(Math.PI / n);
  const f = g.index ? g.toNonIndexed() : g;
  f.computeVertexNormals();
  return f;
}

/** extrude a 2D shape (x, y) along +z by `depth`, hard edges */
export function gExtrude(shape: THREE.Shape, depth: number, curveSegments = 10) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
  const f = g.index ? g.toNonIndexed() : g;
  f.computeVertexNormals();
  return f;
}

/** adds a pointed arch outline (clockwise from the left foot) to a path. k = radius / width (0.5 round … 1 equilateral) */
export function archOutline(path: THREE.Path | THREE.Shape, x0: number, w: number, y0: number, ySpring: number, k = 0.85, close = true) {
  const R = Math.max(0.5001, k) * w;
  const off = R - w / 2;
  const hA = Math.sqrt(Math.max(R * R - off * off, 1e-6));
  path.moveTo(x0 - w / 2, y0);
  path.lineTo(x0 - w / 2, ySpring);
  path.absarc(x0 + off, ySpring, R, Math.PI, Math.atan2(hA, -off), true);
  path.absarc(x0 - off, ySpring, R, Math.atan2(hA, off), 0, true);
  path.lineTo(x0 + w / 2, y0);
  if (close) path.lineTo(x0 - w / 2, y0);
  return ySpring + hA;
}
export const archRise = (w: number, k = 0.85) => {
  const R = Math.max(0.5001, k) * w, off = R - w / 2;
  return Math.sqrt(Math.max(R * R - off * off, 1e-6));
};

/** soft rounded lump of snow sitting on a w × d rectangle */
export function gLump(w: number, d: number, t: number, seg = 4) {
  const g = new THREE.PlaneGeometry(w, d, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = (p.getX(i) / w) * 2, z = (p.getZ(i) / d) * 2;
    const k = (1 - Math.pow(Math.abs(x), 3)) * (1 - Math.pow(Math.abs(z), 3));
    p.setY(i, t * Math.pow(Math.max(k, 0), 0.45));
    p.setX(i, p.getX(i) * 1.04);
    p.setZ(i, p.getZ(i) * 1.04);
  }
  g.computeVertexNormals();
  return g;
}

/** snow lying on a strip (x along, z across): the height comes from f(x, z) */
export function gSnowStrip(len: number, wid: number, f: (x: number, z: number) => number, per = 2.5, across = 14) {
  const g = new THREE.PlaneGeometry(len, wid, Math.max(2, Math.round(len * per)), across);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, f(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

/** snow on top of a wall or coping: thickness wanders along the length, thin in places */
export function gSnowRidge(len: number, wid: number, t: number, seed = 0) {
  const nx = Math.max(4, Math.round(len * 2.2));
  const g = new THREE.PlaneGeometry(len, wid, nx, 4);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = (p.getZ(i) / wid) * 2;
    const a = Math.sin(x * 0.9 + seed * 7.1) * 0.5 + Math.sin(x * 2.3 + seed * 3.3) * 0.3 + Math.sin(x * 0.31 + seed) * 0.6;
    const th = t * Math.max(0.12, 0.75 + a * 0.45);
    const prof = Math.pow(Math.max(1 - Math.pow(Math.abs(z), 2.6), 0), 0.5);
    p.setY(i, th * prof);
    p.setZ(i, p.getZ(i) * 1.06);
  }
  g.computeVertexNormals();
  return g;
}

/** small sphere (finials, lamp globes) */
export function gBall(r: number, seg = 12) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4));
  return g;
}
