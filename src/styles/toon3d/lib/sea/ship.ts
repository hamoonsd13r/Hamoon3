// Procedural toon ship, built once into a Group in SHIP space: x = toward the bow, y = up (waterline 0), z = starboard.
// Ours: teal-green hull, cream stripe, brass portholes, ochre/cream striped sails. The pirates': black hull, crimson
// stripe with gold gun ports, crimson sails with the dog-skull emblem, black flag. Both: a raised stern castle
// (quarterdeck) with the wheel and life rings, two masts (course + topsail), a jib on the bowsprit, shrouds with
// ratlines, stays, sheets, barrels, crates, a hatch. ride() floats the ship on the sea (sea.ts tiltAt).
import * as THREE from "three";
import { Batch, V, lam, Strand } from "../base/build";
import { planksHD } from "../base/paint";
import {
  hullTex, innerTex, sailTex, jibTex, ringTex, flagTex, barrelTex, bulkheadTex, grateTex, soupTex, SHIP_COL, HULL_Y0, HULL_Y1, RAIL_REF, ShipKind,
} from "./paint3";
import { tiltAt } from "./sea";

export const HULL = { x0: -11, x1: 11, qd: -5.0, qdY: 3.4, beam: 3.5 };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sst = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const tOf = (x: number) => (x - HULL.x0) / (HULL.x1 - HULL.x0);
/** main deck floor (rises toward the bow) */
export const mainDeckY = (x: number) => 2.0 + 0.6 * Math.pow(sst(5, 11.5, x), 1.4);
/** top of the bulwark: 1 m above the main deck, stepping up in a curve to the stern castle */
export const railY = (x: number) => mainDeckY(x) + 1.0 + 1.35 * (1 - sst(-5.2, -3.8, x));
/** deck floor under (x): the castle aft of HULL.qd */
export const deckY = (x: number) => (x < HULL.qd ? HULL.qdY : mainDeckY(x));
export const halfBeam = (x: number) => {
  const t = tOf(x), bow = t < 0.5 ? 1 : Math.pow(Math.max(0, Math.cos(((t - 0.5) / 0.5) * Math.PI * 0.5)), 0.75);
  return HULL.beam * bow * (0.72 + 0.28 * sst(0, 0.35, t));
};
export const keelD = (x: number) => { const t = tOf(x); return 2.2 * (1 - 0.6 * sst(0.7, 1, t)) * (1 - 0.3 * (1 - sst(0, 0.15, t))); };
/** half-width of the outer hull at (x, y): slight tumblehome above the water, a round bilge below */
export const wAt = (x: number, y: number) => {
  const b = halfBeam(x);
  if (y >= 0) return b * (1 - 0.07 * (y / railY(x)) ** 2);
  const d = keelD(x), s = clamp01((y + d) / d);
  return b * Math.pow(1 - Math.pow(1 - s, 2.4), 1 / 2.4);
};
/** raked stem and transom: the bow leans forward with height, the stern leans aft */
export const rake = (x: number, y: number) => {
  const t = tOf(x);
  return 0.15 * (y + keelD(x)) * sst(0.78, 1, t) - 0.12 * Math.max(0, y) * (1 - sst(0, 0.1, t));
};
const BULK = 0.17; // bulwark thickness
/** inner face of the bulwark at (x, y) */
export const wIn = (x: number, y: number) => Math.max(0, wAt(x, y) - BULK);
/** point on the hull side (side +1 = starboard) */
export const hullPt = (x: number, y: number, side: number, out = 0) => V(x + rake(x, y), y, side * (wAt(x, y) + out));

export type MastDef = { x: number; h: number; course: number; top: number };
export const MASTS: Record<"fore" | "main", MastDef> = {
  fore: { x: 4.6, h: 14.5, course: 3.8, top: 2.7 },
  main: { x: -1.2, h: 16.5, course: 4.3, top: 3.1 },
};
/** heights (ship space) of a mast's parts */
export const mastY = (m: MastDef) => {
  const d = deckY(m.x);
  return { deck: d, top: d + 0.58 * m.h, course: d + 0.5 * m.h, topsail: d + 0.8 * m.h, head: d + 0.93 * m.h, truck: d + m.h, foot: d + 3.15 };
};
export const BOWSPRIT: [THREE.Vector3, THREE.Vector3] = [V(10.3, 3.15, 0), V(15.4, 5.5, 0)];

const UP = V(0, 1, 0);
const tmpQ = new THREE.Quaternion();
/** a rope (thin cylinder) from a to b */
const rope = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r = 0.028) => {
  const d = c.clone().sub(a), len = d.length();
  if (len < 1e-4) return;
  const g = new THREE.CylinderGeometry(r, r, len, 5, 1, true);
  tmpQ.setFromUnitVectors(UP, d.normalize());
  b.add(g, mat, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), tmpQ, V(1, 1, 1)));
};
/** a spar / cylinder from a to b with radii ra (at a) and rb (at b) */
const spar = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, ra: number, rb: number, seg = 10) => {
  const d = c.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  tmpQ.setFromUnitVectors(UP, d.normalize());
  b.add(g, mat, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), tmpQ, V(1, 1, 1)));
};
const boxAt = (b: Batch, mat: THREE.Material, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, rotY = 0) => {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  b.add(g, mat, new THREE.Matrix4().compose(V(cx, cy, cz), new THREE.Quaternion().setFromAxisAngle(UP, rotY), V(1, 1, 1)));
};
const geo = (pos: number[], uv: number[], idx: number[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

/** box-section tube (w across, h up) along a polyline: outward winding, flat normal per face, open ends */
const boxTube = (pts: THREE.Vector3[], w: number, h: number) => {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const T = new THREE.Vector3(), S = new THREE.Vector3(), N = new THREE.Vector3(), n = new THREE.Vector3();
  const frame = (i: number) => {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    T.subVectors(c, a).normalize(); S.crossVectors(T, UP); if (S.lengthSq() < 1e-8) S.set(1, 0, 0); S.normalize(); N.crossVectors(S, T).normalize();
    const p = pts[i];
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => p.clone().addScaledVector(S, (sx * w) / 2).addScaledVector(N, (sy * h) / 2));
  };
  let prev = frame(0), len = 0;
  for (let i = 1; i < pts.length; i++) {
    const cur = frame(i), l0 = len; len += pts[i].distanceTo(pts[i - 1]);
    for (let k = 0; k < 4; k++) {
      const A = prev[k], B = prev[(k + 1) % 4], C = cur[(k + 1) % 4], D = cur[k];
      n.subVectors(D, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
      for (const v of [A, D, C, A, C, B]) { pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); }
      uv.push(k / 4, l0, k / 4, len, (k + 1) / 4, len, k / 4, l0, (k + 1) / 4, len, (k + 1) / 4, l0);
    }
    prev = cur;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
};

/** square sail hanging from a yard at height yTop (half width wTop) to its foot at yFoot (half width wFoot), billowing +x */
const sailGeo = (mx: number, yTop: number, wTop: number, yFoot: number, wFoot: number, billow: number) => {
  const NU = 18, NV = 14, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const u = i / NU, v = j / NV, s = Math.sin(Math.PI * u);
    const hw = wTop + (wFoot - wTop) * v;
    const yy = yTop + (yFoot - yTop) * v + 0.38 * s * v * v; // the foot curves up (roach) in the middle
    const dx = billow * Math.pow(s, 0.9) * (1 - (1 - v) * (1 - v)) * (1 - 0.35 * v) + 0.12 * billow * v;
    pos.push(mx + 0.18 + dx, yy, hw * (2 * u - 1) * (1 - 0.05 * Math.sin(Math.PI * v)));
    uv.push(u, 1 - v);
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 2, d = a + NU + 1;
    idx.push(a, b, c, a, c, d);
  }
  return geo(pos, uv, idx);
};
/** triangular jib: head H, tack T (on the stay), clew C; billows +z */
const jibGeo = (H: THREE.Vector3, T: THREE.Vector3, C: THREE.Vector3, billow: number) => {
  const NS = 14, NW = 10, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NW; j++) {
    const s = i / NS, w = j / NW;
    const a = H.clone().lerp(T, s), c = H.clone().lerp(C, s), p = a.lerp(c, w);
    p.z += billow * Math.sin(Math.PI * w) * Math.pow(s, 0.8) * (1 - 0.3 * s);
    pos.push(p.x, p.y, p.z); uv.push(w, s);
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NW; j++) {
    const a = i * (NW + 1) + j, b = a + 1, c = a + NW + 2, d = a + NW + 1;
    idx.push(a, b, c, a, c, d);
  }
  return geo(pos, uv, idx);
};
/** a cloth flag on a pole top: hoist at p, flying along +x for len, h tall (pennant: tapering to a point) */
const flagGeo = (p: THREE.Vector3, len: number, h: number, pennant: boolean) => {
  const NU = 16, NV = 4, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const u = i / NU, v = j / NV, hh = pennant ? h * (1 - 0.92 * u) : h;
    pos.push(p.x + len * u, p.y - hh * v - (h - hh) * 0.5, p.z + 0.28 * Math.sin(u * 5.2) * u);
    uv.push(u, 1 - v);
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 2, d = a + NU + 1;
    idx.push(a, b, c, a, c, d);
  }
  return geo(pos, uv, idx);
};

export class Ship {
  root = new THREE.Group();
  /** the ship's wheel (turned by story.ts: rotation.x) */
  wheel = new THREE.Group();
  /** latest pose (world) of the ship, for cameras and cards in ship space */
  m = new THREE.Matrix4();
  constructor(public kind: ShipKind, public scale = 1) {
    const C = SHIP_COL[kind], K = kind;
    const inner = new THREE.Group();
    inner.scale.setScalar(scale);
    this.root.add(inner);
    const hull = hullTex(K); hull.anisotropy = 16;
    const Mhull = lam(`hull_${K}`, () => ({ map: hull }));
    const Minner = lam(`inner_${K}`, () => ({ map: innerTex(K) }));
    const deckMap = planksHD().clone(); deckMap.needsUpdate = true; deckMap.anisotropy = 16;
    const Mdeck = lam(`deck_${K}`, () => ({ map: deckMap, color: K === "pirate" ? "#a08870" : "#ffffff" }));
    const Mcap = lam(`cap_${K}`, () => ({ color: C.cap }));
    const Mmast = lam(`mast_${K}`, () => ({ color: C.mast }));
    const Mrope = lam(`rope_${K}`, () => ({ color: C.rope }));
    const Mbrass = lam(`brass_${K}`, () => ({ color: C.brass }));
    const Mglass = lam("portGlass", () => ({ color: "#1d3a44" }));
    const Miron = lam("shipIron", () => ({ color: "#3d414c" }));
    const Mbarrel = lam("barrel", () => ({ map: barrelTex() }));
    const Mcrate = lam("crate", () => ({ color: "#a87a4e" }));
    const Mgrate = lam("grate", () => ({ map: grateTex() }));
    const Mbulk = lam(`bulk_${K}`, () => ({ map: bulkheadTex(K) }));
    const Mring = lam("lifering", () => ({ map: ringTex() }));
    const sail = (emblem: boolean) => {
      const m = lam(`sail_${K}_${emblem}`, () => ({ map: sailTex(K, emblem), side: THREE.DoubleSide }));
      m.side = THREE.DoubleSide;
      return m;
    };
    const Msail = sail(false), Memblem = sail(K === "pirate");
    const Mjib = lam(`jib_${K}`, () => ({ map: jibTex(K), side: THREE.DoubleSide })); Mjib.side = THREE.DoubleSide;
    const Mflag = lam(`flag_${K}`, () => ({ map: flagTex(K), side: THREE.DoubleSide })); Mflag.side = THREE.DoubleSide;
    const Mlamp = new THREE.MeshLambertMaterial({ color: "#ffcf7a", emissive: new THREE.Color("#ffb347"), emissiveIntensity: 1.4 });

    const b = new Batch();
    // ---- stations along the hull (one exactly either side of the castle front) ----
    const NS = 76, xs: number[] = [];
    for (let i = 0; i <= NS; i++) xs.push(HULL.x0 + ((HULL.x1 - HULL.x0) * i) / NS);
    xs.push(HULL.qd - 0.002, HULL.qd + 0.002);
    xs.sort((a, c) => a - c);
    // ---- outer hull, both sides: v by height remapped so the stripe follows the sheer and the waterline stays level ----
    const NV = 30;
    for (const side of [1, -1]) {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (const x of xs) {
        const d = keelD(x), top = railY(x);
        for (let j = 0; j <= NV; j++) {
          const y = -d + (top + d) * (j / NV), p = hullPt(x, y, side);
          pos.push(p.x, p.y, p.z);
          const yy = y < 1.0 ? y : 1.0 + ((y - 1.0) * (RAIL_REF - 1.0)) / (top - 1.0);
          uv.push(tOf(x), (yy - HULL_Y0) / (HULL_Y1 - HULL_Y0));
        }
      }
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j, bb = (i + 1) * (NV + 1) + j, c = bb + 1, d = a + 1;
        if (side > 0) idx.push(a, bb, c, a, c, d); else idx.push(a, c, bb, a, d, c);
      }
      b.add(geo(pos, uv, idx), Mhull);
    }
    // ---- transom (flat stern face) ----
    {
      const x = HULL.x0, d = keelD(x), top = railY(x), pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let j = 0; j <= NV; j++) {
        const y = -d + (top + d) * (j / NV);
        for (const side of [-1, 1]) {
          const p = hullPt(x, y, side);
          pos.push(p.x, p.y, p.z);
          const yy = y < 1.0 ? y : 1.0 + ((y - 1.0) * (RAIL_REF - 1.0)) / (top - 1.0);
          uv.push(0.5 + (0.2 * p.z) / HULL.beam, (yy - HULL_Y0) / (HULL_Y1 - HULL_Y0));
        }
      }
      for (let j = 0; j < NV; j++) { const a = j * 2, bb = a + 1, c = a + 3, dd = a + 2; idx.push(a, bb, c, a, c, dd); }
      b.add(geo(pos, uv, idx), Mhull);
    }
    // ---- inner bulwark faces (deck to rail) ----
    for (const side of [1, -1]) {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [], R = 3;
      for (const x of xs) {
        const yb = deckY(x), yt = railY(x);
        for (let j = 0; j <= R; j++) {
          const y = yb + ((yt - yb) * j) / R;
          pos.push(x + rake(x, y), y, side * wIn(x, y));
          uv.push(x / 2, (y - yb) / 1.0);
        }
      }
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < R; j++) {
        const a = i * (R + 1) + j, bb = (i + 1) * (R + 1) + j, c = bb + 1, d = a + 1;
        if (side > 0) idx.push(a, c, bb, a, d, c); else idx.push(a, bb, c, a, c, d);
      }
      b.add(geo(pos, uv, idx), Minner);
    }
    // ---- decks: main (forward of the castle) and the castle ----
    const deckStrip = (sel: (x: number) => boolean, yOf: (x: number) => number) => {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [], list = xs.filter(sel);
      for (const x of list) {
        const y = yOf(x), w = wIn(x, y), xx = x + rake(x, y);
        pos.push(xx, y, -w, xx, y, w); uv.push(xx / 2.4, -w / 2.4, xx / 2.4, w / 2.4);
      }
      for (let i = 0; i < list.length - 1; i++) { const a = i * 2, bb = a + 1, c = a + 3, d = a + 2; idx.push(a, bb, c, a, c, d); }
      b.add(geo(pos, uv, idx), Mdeck);
    };
    deckStrip((x) => x >= HULL.qd, mainDeckY);
    deckStrip((x) => x <= HULL.qd, () => HULL.qdY);
    // castle front bulkhead (door + two windows) and its balustrade, two short stairs up from the main deck
    {
      const x = HULL.qd, y0 = mainDeckY(x), y1 = HULL.qdY, w0 = wIn(x, y0), w1 = wIn(x, y1);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([x, y0, w0, x, y0, -w0, x, y1, -w1, x, y0, w0, x, y1, -w1, x, y1, w1], 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
      g.computeVertexNormals();
      b.add(g, Mbulk);
      const wr = w1 - 0.06, ytop = y1 + 0.92;
      for (const s of [-1, 1]) spar(b, Mcap, V(x + 0.05, ytop, s * 0.05), V(x + 0.05, ytop, s * (wr - 0.95)), 0.05, 0.05, 6);
      for (let z = -(wr - 0.95); z <= wr - 0.95 + 1e-6; z += 0.3) boxAt(b, Mcap, x + 0.05, y1 + 0.46, z, 0.06, 0.92, 0.06);
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
        const top = y0 + ((y1 - y0) * (k + 1)) / 5;
        boxAt(b, Mcap, x + 1.5 - k * 0.3 - 0.15, (y0 + top) / 2, s * (wr - 0.5), 0.3, top - y0, 0.72);
      }
    }
    // ---- cap rails (wooden strip on top of the bulwark), both sides + across the transom ----
    const strands: Strand[] = [];
    // (base Strand winds its box inward, so its outer faces always light from the wrong side: static rails here are
    // built by boxTube with outward winding and flat face normals)
    const capRail = (pts: THREE.Vector3[]) => b.add(boxTube(pts, 0.3, 0.12), Mcap);
    for (const side of [1, -1]) capRail(xs.map((x) => { const y = railY(x); return V(x + rake(x, y), y + 0.06, side * Math.max(0, wAt(x, y) - 0.08)); }));
    { const x = HULL.x0, y = railY(x), w = wAt(x, y) - 0.08; capRail([-1, -0.5, 0, 0.5, 1].map((k) => V(x + rake(x, y) + 0.05, y + 0.06, k * w))); }
    // a rubbing strake (wale) along the stripe's bottom edge
    for (const side of [1, -1]) {
      const pts = xs.filter((x) => tOf(x) > 0.004 && tOf(x) < 0.985).map((x) => {
        const top = railY(x), y = 1.0 + ((1.38 - 1.0) * (top - 1.0)) / (RAIL_REF - 1.0);
        return hullPt(x, y, side, 0.04);
      });
      b.add(boxTube(pts, 0.1, 0.1), Mcap);
    }
    // ---- portholes: brass rings + dark glass, along both sides and on the castle ----
    const port = (x: number, y: number, side: number, r = 0.22) => {
      const e = 0.05, dw = (wAt(x + e, y) - wAt(x - e, y)) / (2 * e), n = V(-dw, 0, side).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n), p = hullPt(x, y, side, 0.015);
      b.add(new THREE.TorusGeometry(r, 0.05, 6, 20), Mbrass, new THREE.Matrix4().compose(p, q, V(1, 1, 1)));
      b.add(new THREE.CircleGeometry(r, 20), Mglass, new THREE.Matrix4().compose(p.clone().addScaledVector(n, -0.01), q, V(1, 1, 1)));
    };
    for (const side of [1, -1]) {
      for (const x of [-3.4, -1.0, 1.4, 3.8, 6.2]) port(x, 0.98, side);
      for (const x of [-9.4, -7.4]) port(x, 2.95, side, 0.2);
    }
    // ---- masts, tops, yards, sails ----
    const mastTop: Record<string, THREE.Vector3> = {};
    for (const key of ["fore", "main"] as const) {
      const m = MASTS[key], Y = mastY(m);
      spar(b, Mmast, V(m.x, Y.deck - 0.1, 0), V(m.x, Y.truck, 0), 0.23, 0.11, 12);
      // the top (platform) and the crow's nest on the main
      b.add(new THREE.CylinderGeometry(0.95, 0.85, 0.14, 16), Mcap, new THREE.Matrix4().makeTranslation(m.x, Y.top, 0));
      if (key === "main") {
        const nest = new THREE.CylinderGeometry(0.55, 0.5, 0.62, 14, 1, true);
        b.add(nest, Mcap, new THREE.Matrix4().makeTranslation(m.x, Y.head - 0.05, 0));
        b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 14), Mcap, new THREE.Matrix4().makeTranslation(m.x, Y.head - 0.34, 0));
      }
      // yards
      for (const [y, hw] of [[Y.course, m.course], [Y.topsail, m.top]] as const)
        spar(b, Mmast, V(m.x + 0.15, y, -hw - 0.25), V(m.x + 0.15, y, hw + 0.25), 0.08, 0.08, 8);
      // course and topsail
      const emb = Memblem; // the pirates show their emblem on both courses (the fore one is what you see from ahead)
      b.add(sailGeo(m.x, Y.course - 0.1, m.course * 0.96, Y.foot, m.course * 1.0, key === "main" ? 1.05 : 0.95), emb);
      b.add(sailGeo(m.x, Y.topsail - 0.1, m.top * 0.95, Y.course + 0.28, m.course * 0.84, 0.75), Msail);
      mastTop[key] = V(m.x, Y.head, 0);
      // shrouds with ratlines, both sides
      for (const side of [1, -1]) {
        const lows: [THREE.Vector3, THREE.Vector3][] = [];
        for (let k = 0; k < 4; k++) {
          const x = m.x - 0.85 + 0.55 * k, y = railY(x);
          const a = V(x + rake(x, y), y + 0.02, side * (wAt(x, y) + 0.08)), c = V(m.x - 0.05 + 0.08 * (k - 1.5), Y.top - 0.12, side * 0.32);
          rope(b, Mrope, a, c, 0.03);
          lows.push([a, c]);
        }
        const yr0 = railY(m.x) + 0.55;
        for (let y = yr0; y < Y.top - 0.45; y += 0.42) {
          const at = (s: [THREE.Vector3, THREE.Vector3]) => s[0].clone().lerp(s[1], (y - s[0].y) / (s[1].y - s[0].y));
          for (let k = 0; k < 3; k++) rope(b, Mrope, at(lows[k]), at(lows[k + 1]), 0.018);
        }
        for (const dx of [-0.35, 0.35]) rope(b, Mrope, V(m.x + dx, Y.top + 0.07, side * 0.9), V(m.x, Y.head + 0.3, side * 0.12), 0.024);
        // sheets: course clews down to the rail aft of the mast
        const xr = m.x - 2.2, yr = railY(xr);
        rope(b, Mrope, V(m.x + 0.3, Y.foot, side * m.course), V(xr + rake(xr, yr), yr + 0.05, side * (wAt(xr, yr) - 0.05)), 0.022);
      }
    }
    // ---- bowsprit, jib, stays ----
    const [b0, b1] = BOWSPRIT;
    spar(b, Mmast, b0, b1, 0.15, 0.08, 10);
    const foreY = mastY(MASTS.fore), foreHead = V(MASTS.fore.x, foreY.head, 0);
    rope(b, Mrope, foreHead, b1, 0.032);
    rope(b, Mrope, mastTop.main, V(MASTS.fore.x, foreY.top + 0.1, 0), 0.032);
    for (const side of [1, -1]) {
      const x = -8.6, y = railY(x);
      rope(b, Mrope, mastTop.main, V(x + rake(x, y), y + 0.03, side * (wAt(x, y) + 0.06)), 0.028);
    }
    rope(b, Mrope, b1, V(11.2, 0.6, 0), 0.03); // bobstay
    b.add(jibGeo(foreHead.clone().lerp(b1, 0.14), foreHead.clone().lerp(b1, 0.9), V(6.9, mainDeckY(6.9) + 2.6, 0), 0.7), Mjib);
    // flag / pennant at the main truck
    const truck = V(MASTS.main.x, mastY(MASTS.main).truck + 0.05, 0);
    b.add(flagGeo(truck, K === "pirate" ? 1.7 : 2.6, K === "pirate" ? 1.05 : 0.55, K !== "pirate"), Mflag);
    // ---- the wheel on the castle, life rings, lantern ----
    {
      // the wheel turns (its own group, pivot on the hub, axle along the ship's x); the pedestal is static
      const x = -8.3, y = HULL.qdY, hy = y + 0.9;
      boxAt(b, Mcap, x - 0.05, y + 0.45, 0, 0.26, 0.9, 0.42);
      const wb = new Batch(), q = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2);
      wb.add(new THREE.TorusGeometry(0.48, 0.045, 8, 36), Mmast, new THREE.Matrix4().compose(V(0, 0, 0), q, V(1, 1, 1)));
      spar(wb, Mbrass, V(-0.11, 0, 0), V(0.11, 0, 0), 0.11, 0.11, 12);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4, dir = V(0, Math.cos(a), Math.sin(a));
        spar(wb, Mmast, dir.clone().multiplyScalar(0.1), dir.clone().multiplyScalar(0.66), 0.028, 0.04, 6);
      }
      this.wheel.position.set(x + 0.2, hy, 0);
      wb.build(this.wheel, true);
      inner.add(this.wheel);
    }
    // the pirates' brass cannon on its carriage (port side, by the main mast) with a pyramid of cannonballs
    if (K === "pirate") {
      const cx = -3.0, cz = -1.6, dy = deckY(cx), Mgold = lam("cannonGold", () => ({ color: "#d9a441" })), Mblack = lam("cannonBall", () => ({ color: "#26232a" }));
      boxAt(b, Mcap, cx, dy + 0.3, cz, 1.2, 0.28, 0.62);
      for (const sx of [-0.42, 0.42]) for (const sz of [-0.34, 0.34]) {
        const g = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14).rotateX(Math.PI / 2);
        b.add(g, Mcap, new THREE.Matrix4().makeTranslation(cx + sx, dy + 0.2, cz + sz));
      }
      const prof = [[0.0, -0.95], [0.2, -0.95], [0.26, -0.85], [0.2, -0.75], [0.22, -0.6], [0.17, 0.2], [0.15, 0.75], [0.19, 0.8], [0.19, 0.95], [0.12, 0.95]]
        .map(([r, y]) => new THREE.Vector2(r, y));
      const barrel = new THREE.LatheGeometry(prof, 18);
      b.add(barrel, Mgold, new THREE.Matrix4().compose(V(cx + 0.1, dy + 0.58, cz - 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.08, 0, 0)), V(1, 1, 1)));
      for (const [ox, oz, oy] of [[0, 0, 0], [0.22, 0, 0], [0.11, 0.19, 0], [0.11, 0.07, 0.19]] as const)
        b.add(new THREE.SphereGeometry(0.12, 12, 10), Mblack, new THREE.Matrix4().makeTranslation(cx - 1.0 + ox, dy + 0.12 + oy, cz + 0.45 + oz));
    }
    // our cook's soup: a copper cauldron (tomato soup) on a small iron stove by the port rail, aft of his pouring place
    if (K === "ours") {
      const sx = 0.6, sz = -2.05, dy = deckY(sx), Mcop = lam("cauldron", () => ({ color: "#c8743a" }));
      boxAt(b, Miron, sx, dy + 0.3, sz, 0.62, 0.6, 0.62);
      const prof = [[0.0, 0.0], [0.3, 0.02], [0.4, 0.14], [0.42, 0.34], [0.4, 0.46], [0.43, 0.48], [0.43, 0.52], [0.36, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
      b.add(new THREE.LatheGeometry(prof, 22), Mcop, new THREE.Matrix4().makeTranslation(sx, dy + 0.6, sz));
      const Msoup = lam("soupTop", () => ({ map: soupTex() }));
      b.add(new THREE.CircleGeometry(0.37, 22).rotateX(-Math.PI / 2), Msoup, new THREE.Matrix4().makeTranslation(sx, dy + 0.6 + 0.44, sz));
      for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.09, 0.022, 6, 12), Miron, new THREE.Matrix4().compose(V(sx, dy + 0.6 + 0.4, sz + s * 0.45), new THREE.Quaternion(), V(1, 1, 1)));
    }
    for (const side of [1, -1]) {
      const x = -7.0, y = HULL.qdY + 0.5, e = 0.05, dw = (wAt(x + e, y) - wAt(x - e, y)) / (2 * e), n = V(-dw, 0, side).normalize();
      b.add(new THREE.TorusGeometry(0.4, 0.11, 10, 28), Mring, new THREE.Matrix4().compose(hullPt(x, y, side, 0.12), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n), V(1, 1, 1)));
    }
    {
      const x = HULL.x0 + 0.1, y = railY(HULL.x0) + 0.1;
      spar(b, Miron, V(x, y, 0), V(x - 0.25, y + 0.7, 0), 0.03, 0.03, 6);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.28), Mlamp);
      lamp.position.set(x - 0.4, y + 0.55, 0); lamp.castShadow = false;
      inner.add(lamp);
    }
    // ---- deck dressing: barrels, crates, hatch, coils ----
    const dk = (x: number) => deckY(x);
    for (const [x, z, r] of [[5.7, 1.35, 0.0], [6.15, 0.55, 0.7], [5.55, -1.65, 1.3], [-3.3, 2.15, 0.4]] as const) {
      const g = new THREE.CylinderGeometry(0.34, 0.34, 0.82, 16);
      b.add(g, Mbarrel, new THREE.Matrix4().compose(V(x, dk(x) + 0.41, z), new THREE.Quaternion().setFromAxisAngle(UP, r), V(1, 1, 1)));
    }
    boxAt(b, Mcrate, -2.6, dk(-2.6) + 0.4, 1.75, 0.8, 0.8, 0.8, 0.2);
    boxAt(b, Mcrate, -2.55, dk(-2.6) + 1.07, 1.7, 0.55, 0.55, 0.55, -0.3);
    boxAt(b, Mcap, 1.5, dk(1.5) + 0.17, 0, 1.9, 0.34, 1.5);
    b.add(new THREE.PlaneGeometry(1.7, 1.3).rotateX(-Math.PI / 2), Mgrate, new THREE.Matrix4().makeTranslation(1.5, dk(1.5) + 0.345, 0));
    for (const key of ["fore", "main"] as const) {
      const m = MASTS[key];
      b.add(new THREE.TorusGeometry(0.42, 0.09, 6, 18).rotateX(Math.PI / 2), Mrope, new THREE.Matrix4().makeTranslation(m.x - 0.75, dk(m.x) + 0.09, 0.65));
    }
    b.build(inner, true);
    for (const s of strands) inner.add(s.mesh);
  }

  /** float on the sea at world (x, z), heading yaw (bow toward (cos yaw, 0, -sin yaw)). k = how much of the wave tilt the
   *  hull follows; heel = extra lean (rad, + = starboard side down); dip = extra sink (m) */
  ride(x: number, z: number, yaw: number, t: number, state: number, o: { k?: number; heel?: number; pitch?: number; dip?: number; slick?: number; big?: number } = {}) {
    const s = this.scale, w = tiltAt(x, z, t, state, 22 * s, 7 * s, yaw, o.slick ?? 0, o.big ?? 1), k = o.k ?? 0.8;
    this.root.position.set(x, w.heave * 0.92 - (o.dip ?? 0), z);
    this.root.rotation.order = "YZX";
    this.root.rotation.set(-(w.roll * k) + (o.heel ?? 0), yaw, w.pitch * k + (o.pitch ?? 0));
    this.root.updateMatrixWorld(true);
    this.m.copy(this.root.matrixWorld);
  }
  /** ship space -> world (after ride) */
  toWorld(p: THREE.Vector3 | [number, number, number], out = new THREE.Vector3()) {
    if (Array.isArray(p)) out.set(p[0], p[1], p[2]); else out.copy(p);
    return out.multiplyScalar(this.scale).applyMatrix4(this.m);
  }
  /** a direction in ship space -> world */
  dirToWorld(d: [number, number, number], out = new THREE.Vector3()) {
    return out.set(d[0], d[1], d[2]).transformDirection(this.m);
  }
}
