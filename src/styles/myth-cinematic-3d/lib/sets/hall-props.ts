// Hall props (round 2): real candle clusters (wax + flame + pool of light), moulded column bases and capitals,
// and Jamasp as a small 3D figure (long tunic, sash, small head wrap) so the beam gives him volume.
import * as THREE from "three";
import { rnd } from "../lib";
import { Board, Flame, type Tex } from "../kit";
import { Tube } from "./hall-serpent";

/** a cluster of 2–5 wax candles of different heights, each with a flame, plus a soft pool of light on the floor */
export class CandleCluster extends THREE.Group {
  flames: Flame[] = [];
  wax: THREE.MeshStandardMaterial;
  pool: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  power = 1;
  poolK: number;
  constructor(T: Tex, waxMat: THREE.MeshStandardMaterial, poolMap: THREE.Texture, seed: number, n: number, spread = 0.22, scale = 1, poolR = 1.6, poolK = 0.3) {
    super();
    this.wax = waxMat.clone();
    this.poolK = poolK;
    const geo: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const a = rnd(seed * 7 + i) * Math.PI * 2, r = i === 0 ? 0 : spread * (0.5 + rnd(seed + i * 3) * 0.6);
      const h = (0.12 + rnd(seed * 3 + i) * 0.34) * scale, rad = (0.028 + rnd(seed + i * 11) * 0.02) * scale;
      const g = new THREE.CylinderGeometry(rad, rad * 1.04, h, 14, 1);
      // melted top: slightly uneven rim
      g.translate(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      geo.push(g);
      const f = new Flame(T, 0.075 * scale * (0.85 + rnd(seed + i) * 0.3), seed * 13 + i, 0, 0xffc070);
      f.position.set(Math.cos(a) * r, h + 0.005, Math.sin(a) * r);
      this.add(f);
      this.flames.push(f);
    }
    const merged = mergeGeos(geo);
    const m = new THREE.Mesh(merged, this.wax);
    this.add(m);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(poolR * 2, poolR * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolMap, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
    this.pool.position.y = 0.025;
    this.add(this.pool);
  }
  setPower(p: number, flick: number) {
    this.power = p;
    for (const f of this.flames) f.power = p;
    this.wax.emissiveIntensity = Math.min(1.6, p) * 0.9;
    this.pool.material.opacity = this.poolK * Math.min(2, p) * flick;
  }
}
/** merge plain (non-indexed after conversion) geometries with position/normal/uv */
const mergeGeos = (gs: THREE.BufferGeometry[]) => {
  const parts = gs.map((g) => g.toNonIndexed());
  let n = 0;
  for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array as Float32Array, o * 3);
    nor.set(p.attributes.normal.array as Float32Array, o * 3);
    uv.set(p.attributes.uv.array as Float32Array, o * 2);
    o += p.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};

/** Attic column base: square plinth, lower torus, scotia, upper torus (lathe), stone textured */
export const columnBase = (shaftR: number) => {
  const p: THREE.Vector2[] = [];
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      p.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  };
  p.push(new THREE.Vector2(0.001, 0.32));
  p.push(new THREE.Vector2(shaftR * 1.3, 0.32));
  arc(shaftR * 1.26, 0.46, 0.15, -Math.PI / 2, Math.PI / 2, 10); // lower torus
  arc(shaftR * 1.14, 0.7, 0.1, -Math.PI / 2, -Math.PI * 1.25, 6); // scotia (concave)
  arc(shaftR * 1.12, 0.83, 0.08, -Math.PI / 2, Math.PI / 2, 8); // upper torus
  p.push(new THREE.Vector2(shaftR * 1.02, 0.93));
  p.push(new THREE.Vector2(shaftR, 1.0));
  const lathe = new THREE.LatheGeometry(p, 40);
  return lathe;
};
/** capital: an echinus flaring out under a square abacus (lathe part) */
export const columnCapital = (shaftR: number) => {
  const p: THREE.Vector2[] = [];
  p.push(new THREE.Vector2(shaftR, 0));
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    p.push(new THREE.Vector2(shaftR + (0.42 * k * k), 0.08 + k * 0.42));
  }
  p.push(new THREE.Vector2(0.001, 0.5));
  return new THREE.LatheGeometry(p, 40);
};

// ---------------------------------------------------------------- Jamasp, seated cross-legged (facing −z)
/** fabric normal map: fine weave + soft folds */
const fabricNormal = () => {
  const N = 256;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d")!;
  const img = x.createImageData(N, N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      // fine weave only (no long folds: they read as stripes)
      const dx = Math.cos(i * 1.6) * 0.1 + (Math.sin(i * 0.37 + j * 0.11) * 0.05), dy = Math.cos(j * 1.6) * 0.1;
      const l = Math.hypot(dx, dy, 1), o = (j * N + i) * 4;
      img.data[o] = (-dx / l * 0.5 + 0.5) * 255;
      img.data[o + 1] = (dy / l * 0.5 + 0.5) * 255;
      img.data[o + 2] = (1 / l) * 255;
      img.data[o + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
};

export type Jamasp = { group: THREE.Group; book: THREE.MeshStandardMaterial; rim: { value: THREE.Color }; mats: THREE.MeshStandardMaterial[] };
export const buildJamasp = (withRim: (m: THREE.MeshStandardMaterial, u: { value: THREE.Color }, pow?: number) => THREE.MeshStandardMaterial): Jamasp => {
  const g = new THREE.Group();
  const rim = { value: new THREE.Color(0, 0, 0) };
  const fn = fabricNormal();
  const cloth = withRim(new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.92, normalMap: fn, normalScale: new THREE.Vector2(0.6, 0.6) }), rim, 2.2);
  const sashM = withRim(new THREE.MeshStandardMaterial({ color: 0x4e2c22, roughness: 0.85, normalMap: fn, normalScale: new THREE.Vector2(0.5, 0.5) }), rim, 2.2);
  const wrapM = withRim(new THREE.MeshStandardMaterial({ color: 0x86785f, roughness: 0.9, normalMap: fn, normalScale: new THREE.Vector2(0.7, 0.7) }), rim, 2.2);
  const skin = withRim(new THREE.MeshStandardMaterial({ color: 0x8a5e40, roughness: 0.7 }), rim, 2.5);
  const book = new THREE.MeshStandardMaterial({ color: 0xe8d6a8, roughness: 0.8, emissive: 0xffd28a, emissiveIntensity: 0.4 });
  // body: one vertical tube with an elliptical section from the floor skirt up to the neck
  const prof: [number, number, number][] = [
    // y, half-width (x), half-depth (z)
    [0.0, 0.56, 0.5],
    [0.05, 0.54, 0.47],
    [0.12, 0.46, 0.38],
    [0.2, 0.3, 0.26],
    [0.3, 0.2, 0.15],
    [0.42, 0.175, 0.12],
    [0.55, 0.2, 0.13],
    [0.64, 0.235, 0.13],
    [0.7, 0.232, 0.12],
    [0.745, 0.17, 0.095],
    [0.77, 0.065, 0.06],
    [0.8, 0.055, 0.055],
  ];
  const n = prof.length * 3;
  const tube = new Tube(n, 28, cloth);
  const c = new Float32Array(n * 3), rx = new Float32Array(n), ry = new Float32Array(n), s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * (prof.length - 1);
    const a = Math.floor(f), b = Math.min(prof.length - 1, a + 1), k = f - a;
    const y = prof[a][0] + (prof[b][0] - prof[a][0]) * k;
    c[i * 3] = 0;
    c[i * 3 + 1] = y;
    c[i * 3 + 2] = (y > 0.3 ? 0.02 : 0) + (y < 0.2 ? -0.08 * (1 - y / 0.2) : 0);
    ry[i] = prof[a][1] + (prof[b][1] - prof[a][1]) * k; // along N = world x for a vertical tube
    rx[i] = prof[a][2] + (prof[b][2] - prof[a][2]) * k;
    s[i] = y;
  }
  tube.set(c, rx, ry, s, 0.5, 0, 0, new THREE.Vector3(1, 0, 0));
  g.add(tube.mesh);
  // knees under the tunic, the cloth draped over them
  for (const sx of [-1, 1]) {
    const knee = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), cloth);
    knee.scale.set(0.2, 0.11, 0.22);
    knee.position.set(sx * 0.27, 0.12, -0.2);
    knee.rotation.y = sx * 0.4;
    g.add(knee);
  }
  // sash round the waist, its end hanging at the side
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 32), sashM);
  sash.rotation.x = Math.PI / 2;
  sash.scale.set(1.05, 0.72, 1);
  sash.position.set(0, 0.43, 0.02);
  g.add(sash);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.2, 4, 10), sashM);
  tail.position.set(0.17, 0.32, 0.06);
  tail.rotation.z = 0.25;
  g.add(tail);
  // head and a small head wrap (no bun)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.098, 24, 18), skin);
  head.scale.set(0.92, 1.08, 1.0);
  head.position.set(0, 0.9, -0.015);
  head.rotation.x = -0.25;
  g.add(head);
  // small head wrap: a soft dome of cloth, one wound band round the brow, and a diagonal fold crossing it
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.108, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), wrapM);
  cap.scale.set(0.92, 0.78, 1.0);
  cap.position.set(0, 0.93, -0.01);
  cap.rotation.x = -0.25;
  g.add(cap);
  const wind = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 30), wrapM);
  wind.rotation.x = Math.PI / 2 - 0.3;
  wind.scale.set(0.92, 1.0, 0.75);
  wind.position.set(0, 0.945, -0.012);
  g.add(wind);
  const fold = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 8, 28, Math.PI * 1.1), wrapM);
  fold.rotation.set(Math.PI / 2 - 0.9, 0.5, 0.3);
  fold.position.set(0.01, 0.975, -0.005);
  g.add(fold);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 12), skin);
  neck.position.set(0, 0.81, -0.01);
  g.add(neck);
  // arms: shoulders → elbows → hands holding the book in the lap
  const arm = (sx: number) => {
    const t2 = new Tube(18, 12, cloth);
    const pts = [new THREE.Vector3(sx * 0.225, 0.69, 0.0), new THREE.Vector3(sx * 0.25, 0.52, -0.06), new THREE.Vector3(sx * 0.24, 0.4, -0.15), new THREE.Vector3(sx * 0.12, 0.3, -0.26)];
    const curve = new THREE.CatmullRomCurve3(pts);
    const cc = new Float32Array(18 * 3), r1 = new Float32Array(18), r2 = new Float32Array(18), ss = new Float32Array(18);
    for (let i = 0; i < 18; i++) {
      const p = curve.getPoint(i / 17);
      cc.set([p.x, p.y, p.z], i * 3);
      const w = 0.062 - (i / 17) * 0.018 + (i > 12 ? 0.012 : 0); // a little sleeve flare at the wrist
      r1[i] = w;
      r2[i] = w;
      ss[i] = i / 17;
    }
    t2.set(cc, r1, r2, ss, 0.3, 0, 0);
    g.add(t2.mesh);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), skin);
    hand.scale.set(1, 0.7, 1.3);
    hand.position.set(sx * 0.1, 0.29, -0.3);
    g.add(hand);
  };
  arm(-1);
  arm(1);
  // the open book on his knees
  for (const sx of [-1, 1]) {
    const pg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.19), book);
    pg.position.set(sx * 0.07, 0.28, -0.33);
    pg.rotation.z = sx * 0.18;
    pg.rotation.x = -0.35;
    g.add(pg);
  }
  return { group: g, book, rim, mats: [cloth, sashM, wrapM, skin] };
};

/** a gold glint: tiny additive board */
export const glint = (T: Tex, size: number, color = 0xffd27a) => new Board(T.glow, color, size, size, true, 0);
