// Mirror Hall · the mirror hall (تالار آینه‌کاری): an original octagonal Persian pavilion, built in the light
// world's units (the floor is y = G = −20, a person is 40 tall, so 1 m ≈ 22 units).
//   eight walls, each with a tall pointed-arch niche (طاقچه) over a marble dado, a frieze band, then a faceted cove
//   (two tiers of concave muqarnas-like cells) carrying a hemispherical dome.
// The geometry is coarse on purpose: every surface carries a surface frame (u, v in world units + a tangent) and a
// pattern id, and the mirror-work itself (stars, hexagons, diamonds, the dome's rings) is drawn per pixel in
// hallMat.ts, so it stays sharp at any distance.
import * as THREE from "three";
import { G } from "./base/shapes89";

export const A = 150; // apothem of the octagon (centre → wall)
export const WD = 2 * A * Math.tan(Math.PI / 8); // wall width 124.26
export const HW = 165; // wall height (floor → cove)
export const DADO = 18; // marble dado height = niche sill
export const N_SP = 76, N_AP = 126, N_HW = 38, N_D = 26; // niche: springline, apex, half-width, depth
export const FRIEZE: [number, number] = [132, 150];
export const COVE_TOP = 40; // cove height above the walls
export const DOME_R = 142;
export const DOME_Y = G + HW + COVE_TOP; // dome centre / base height (185)

// pattern ids (hallMat.ts)
export const PAT = { plaster: 0, star: 1, hex: 2, diamond: 3, frieze: 4, cove: 5, dome: 6, column: 7, marble: 8, stone: 9 } as const;

type V3 = [number, number, number];
type Vtx = { p: V3; n: V3; uv: [number, number]; t: V3; pat: number; ao: number; wall: number };

/** wall k: centre on the floor line, inward normal, tangent (u grows to the right as seen from inside) */
export function wallFrame(k: number) {
  const phi = (k * Math.PI) / 4;
  const N = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi));
  const C = new THREE.Vector3(Math.sin(phi) * A, G, -Math.cos(phi) * A);
  const T = new THREE.Vector3().crossVectors(N.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
  return { C, N, T, phi };
}
/** a point on wall k: u along the wall, v above the floor, d into the wall (outwards, for the niche) */
export function wallPoint(k: number, u: number, v: number, d = 0) {
  const { C, N, T } = wallFrame(k);
  return C.clone().addScaledVector(T, u).addScaledVector(N, -d).add(new THREE.Vector3(0, v, 0));
}

// ───────────────────────── the niche outline (pointed arch, two arcs) ─────────────────────────
export const E_ = (Math.pow(N_AP - N_SP, 2) - N_HW * N_HW) / (2 * N_HW); // arc centre offset
export const R_ = N_HW + E_;
/** the arch outline from the left sill, up the left jamb, over the apex, down to the right sill (u, v) */
export function nicheOutline(nArc = 24): [number, number][] {
  const pts: [number, number][] = [];
  pts.push([-N_HW, DADO]);
  const nJ = 6;
  for (let i = 1; i <= nJ; i++) pts.push([-N_HW, DADO + ((N_SP - DADO) * i) / nJ]);
  const aAp = Math.acos(E_ / R_);
  // left arc: centre (+E, SP), from angle π (at −HW) to π − aAp (apex)
  for (let i = 1; i <= nArc; i++) {
    const a = Math.PI - (aAp * i) / nArc;
    pts.push([E_ + R_ * Math.cos(a), N_SP + R_ * Math.sin(a)]);
  }
  // right arc: centre (−E, SP), from aAp (apex) down to 0 (at +HW)
  for (let i = 1; i <= nArc; i++) {
    const a = aAp - (aAp * i) / nArc;
    pts.push([-E_ + R_ * Math.cos(a), N_SP + R_ * Math.sin(a)]);
  }
  for (let i = 1; i <= nJ; i++) pts.push([N_HW, N_SP - ((N_SP - DADO) * i) / nJ]);
  return pts;
}

// ───────────────────────── builder ─────────────────────────
class B {
  P: number[] = []; Nn: number[] = []; UV: number[] = []; T: number[] = []; PAT: number[] = []; AO: number[] = []; WL: number[] = [];
  add(v: Vtx) {
    this.P.push(...v.p); this.Nn.push(...v.n); this.UV.push(...v.uv); this.T.push(...v.t); this.PAT.push(v.pat); this.AO.push(v.ao); this.WL.push(v.wall);
  }
  tri(a: Vtx, b: Vtx, c: Vtx) {
    this.add(a); this.add(b); this.add(c);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.Nn, 3));
    g.setAttribute("aUV", new THREE.Float32BufferAttribute(this.UV, 2));
    g.setAttribute("aTan", new THREE.Float32BufferAttribute(this.T, 3));
    g.setAttribute("aPat", new THREE.Float32BufferAttribute(this.PAT, 1));
    g.setAttribute("aAO", new THREE.Float32BufferAttribute(this.AO, 1));
    g.setAttribute("aWall", new THREE.Float32BufferAttribute(this.WL, 1));
    g.computeBoundingSphere();
    return g;
  }
}
const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

/** a flat polygon on wall k (2D outline in (u, v), triangulated with earcut), optionally pushed back by depth d */
function wallPoly(b: B, k: number, outline: [number, number][], pat: number, ao: number, d = 0, aoFn?: (u: number, v: number) => number) {
  const { N, T } = wallFrame(k);
  const tri = THREE.ShapeUtils.triangulateShape(outline.map(([x, y]) => new THREE.Vector2(x, y)), []);
  const mk = (i: number): Vtx => {
    const [u, v] = outline[i];
    return { p: v3(wallPoint(k, u, v, d)), n: v3(N), uv: [u, v], t: v3(T), pat, ao: aoFn ? aoFn(u, v) : ao, wall: k };
  };
  for (const [i, j, l] of tri) {
    // earcut returns CW or CCW depending on the outline; make the face point inwards (N)
    const a = mk(i), bb = mk(j), c = mk(l);
    const e1 = new THREE.Vector3(...bb.p).sub(new THREE.Vector3(...a.p));
    const e2 = new THREE.Vector3(...c.p).sub(new THREE.Vector3(...a.p));
    if (new THREE.Vector3().crossVectors(e1, e2).dot(N) < 0) b.tri(a, c, bb);
    else b.tri(a, bb, c);
  }
}
const rect = (u0: number, v0: number, u1: number, v1: number): [number, number][] => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

/** a quad strip between two point lists (each point with its own normal), flat-shaded per triangle if `flat` */
function strip(b: B, A0: Vtx[], A1: Vtx[]) {
  for (let i = 0; i + 1 < A0.length; i++) {
    b.tri(A0[i], A1[i], A0[i + 1]);
    b.tri(A0[i + 1], A1[i], A1[i + 1]);
  }
}

export type HallInfo = {
  niches: { k: number; sill: THREE.Vector3; back: THREE.Vector3; N: THREE.Vector3; T: THREE.Vector3 }[];
  corners: THREE.Vector3[];
};

export function buildHall() {
  const b = new B();
  const info: HallInfo = { niches: [], corners: [] };
  const outline = nicheOutline();
  for (let k = 0; k < 8; k++) {
    const { N, T } = wallFrame(k);
    const h = WD / 2;
    // marble dado
    wallPoly(b, k, rect(-h, 0, h, DADO), PAT.marble, 1);
    // the field around the niche: a U-shaped polygon (the arch is cut out of it)
    const field: [number, number][] = [[-h, DADO], ...outline, [h, DADO], [h, FRIEZE[0]], [-h, FRIEZE[0]]];
    wallPoly(b, k, field, PAT.star, 1, 0, (u, v) => 1 - 0.12 * Math.exp(-Math.pow((Math.abs(u) - h) / 6, 2)));
    wallPoly(b, k, rect(-h, FRIEZE[0], h, FRIEZE[1]), PAT.frieze, 0.95);
    wallPoly(b, k, rect(-h, FRIEZE[1], h, HW), PAT.star, 0.9);
    // the niche: back wall (hexagon mirror-work), sill, and the intrados (jambs + pointed vault)
    wallPoly(b, k, outline, PAT.hex, 0.78, N_D, (u, v) => 0.62 + 0.38 * Math.min(1, (N_HW - Math.abs(u)) / 12) * Math.min(1, (v - DADO) / 14));
    // sill (stone ledge)
    {
      const p0 = (u: number, d: number): Vtx => ({ p: v3(wallPoint(k, u, DADO, d)), n: [0, 1, 0], uv: [u, d], t: v3(T), pat: PAT.marble, ao: 0.7 + 0.3 * (1 - d / N_D), wall: k });
      const L = [p0(-N_HW, 0), p0(N_HW, 0)], R = [p0(-N_HW, N_D), p0(N_HW, N_D)];
      b.tri(L[0], R[0], L[1]);
      b.tri(L[1], R[0], R[1]);
    }
    // intrados: extrude the outline (without the sill segment) into the wall; u = arc length, v = depth
    {
      const pts = outline;
      let s = 0;
      const ring = (d: number) => {
        const row: Vtx[] = [];
        s = 0;
        for (let i = 0; i < pts.length; i++) {
          if (i > 0) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          // inward normal of the outline (towards the niche's inside), in 3D
          const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
          const tx = c[0] - a[0], ty = c[1] - a[1];
          const L = Math.hypot(tx, ty) || 1;
          // walking CW over the top (left jamb up, right jamb down): inside is to the right of the direction
          const nu = ty / L, nv = -tx / L;
          const n3 = T.clone().multiplyScalar(nu).add(new THREE.Vector3(0, nv, 0)).normalize();
          const tan3 = N.clone().negate(); // u' along the depth would be the bitangent; keep T along the outline
          void tan3;
          const tAlong = T.clone().multiplyScalar(tx / L).add(new THREE.Vector3(0, ty / L, 0)).normalize();
          row.push({ p: v3(wallPoint(k, pts[i][0], pts[i][1], d)), n: v3(n3), uv: [s, d], t: v3(tAlong), pat: PAT.diamond, ao: 0.62 + 0.38 * (1 - d / N_D) * 0.9, wall: k });
        }
        return row;
      };
      const r0 = ring(0), r1 = ring(N_D);
      // orientation: faces must point into the niche space; strip(r0, r1) builds (r0[i], r1[i], r0[i+1])
      const e1 = new THREE.Vector3(...r1[3].p).sub(new THREE.Vector3(...r0[3].p));
      const e2 = new THREE.Vector3(...r0[4].p).sub(new THREE.Vector3(...r0[3].p));
      const n = new THREE.Vector3().crossVectors(e1, e2);
      if (n.dot(new THREE.Vector3(...r0[3].n)) > 0) strip(b, r0, r1);
      else strip(b, r1, r0);
    }
    info.niches.push({ k, sill: wallPoint(k, 0, DADO, N_D * 0.55), back: wallPoint(k, 0, DADO, N_D), N, T });
    // the corner colonnette between wall k and k+1 (a half round, mirror-clad)
    {
      const corner = wallPoint(k, WD / 2, 0);
      info.corners.push(corner);
      const cTo = new THREE.Vector3(-corner.x, 0, -corner.z).normalize(); // towards the centre
      const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), cTo).normalize();
      const rc = 3.2, ns = 10, nv = 12;
      const rows: Vtx[][] = [];
      for (let j = 0; j <= nv; j++) {
        const v = (HW * j) / nv;
        const row: Vtx[] = [];
        for (let i = 0; i <= ns; i++) {
          const a = -Math.PI / 2 + (Math.PI * i) / ns;
          const n3 = cTo.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
          const p = corner.clone().addScaledVector(n3, rc).add(new THREE.Vector3(0, v, 0));
          row.push({ p: v3(p), n: v3(n3), uv: [a * rc, v], t: v3(side.clone().multiplyScalar(Math.cos(a)).addScaledVector(cTo, -Math.sin(a))), pat: PAT.column, ao: 0.9, wall: k });
        }
        rows.push(row);
      }
      for (let j = 0; j < nv; j++) strip(b, rows[j + 1], rows[j]);
    }
  }

  // ── the cove: octagon (wall tops) → 16-gon → 32-gon, every cell folded (a concave muqarnas cell of 4 facets)
  const yB = G + HW + COVE_TOP * 0.5, yC = DOME_Y;
  const ring16a: { p: THREE.Vector3; az: number }[] = [];
  for (let j = 0; j < 16; j++) {
    const k = Math.floor(j / 2);
    const u = j % 2 === 0 ? 0 : WD / 2; // wall midpoint, corner
    ring16a.push({ p: wallPoint(k, u, HW), az: 0 });
  }
  const polyRing = (n: number, r: number, y: number, off: number) =>
    Array.from({ length: n }, (_, j) => {
      const a = ((j + off) * 2 * Math.PI) / n;
      return new THREE.Vector3(Math.sin(a) * r, y, -Math.cos(a) * r);
    });
  // the 16 points above sit at azimuths j·22.5° (midpoints at k·45°, corners at k·45° + 22.5°)
  const ring16b = polyRing(16, 147, yB, 0);
  const ring32 = polyRing(32, DOME_R, yC, 0);
  const ring32a: THREE.Vector3[] = [];
  for (let j = 0; j < 16; j++) {
    ring32a.push(ring16b[j]);
    ring32a.push(ring16b[j].clone().lerp(ring16b[(j + 1) % 16], 0.5).multiplyScalar(1.0));
  }
  const cell = (p00: THREE.Vector3, p10: THREE.Vector3, p01: THREE.Vector3, p11: THREE.Vector3, depth: number, idx: number) => {
    // concave cell: the centre is pushed outwards (away from the room centre) → four triangular mirror facets
    const c = p00.clone().add(p10).add(p01).add(p11).multiplyScalar(0.25);
    const out = new THREE.Vector3(c.x, 0, c.z).normalize();
    const cc = c.clone().addScaledVector(out, depth).add(new THREE.Vector3(0, depth * 0.35, 0));
    const corners = [p00, p10, p11, p01];
    for (let q = 0; q < 4; q++) {
      const a = corners[q], bb = corners[(q + 1) % 4];
      const n = new THREE.Vector3().crossVectors(bb.clone().sub(a), cc.clone().sub(a)).normalize();
      // the facet must face the room centre-ish
      const toC = new THREE.Vector3(0, DOME_Y - 40, 0).sub(cc).normalize();
      let A0 = a, B0 = bb;
      if (n.dot(toC) < 0) {
        n.negate();
        A0 = bb;
        B0 = a;
      }
      const tan = B0.clone().sub(A0).normalize();
      const mk = (p: THREE.Vector3): Vtx => {
        // facet-local uv: project on (tan, n × tan)
        const bt = new THREE.Vector3().crossVectors(n, tan);
        const r = p.clone().sub(cc);
        return { p: v3(p), n: v3(n), uv: [r.dot(tan) + idx * 37.0, r.dot(bt) + q * 23.0], t: v3(tan), pat: PAT.cove, ao: 0.82, wall: -1 };
      };
      b.tri(mk(A0), mk(B0), mk(cc));
    }
  };
  for (let j = 0; j < 16; j++) cell(ring16a[j].p, ring16a[(j + 1) % 16].p, ring16b[j], ring16b[(j + 1) % 16], 7, j);
  for (let j = 0; j < 32; j++) cell(ring32a[j], ring32a[(j + 1) % 32], ring32[j], ring32[(j + 1) % 32], 5, 100 + j);

  // ── the dome: a hemisphere (normals inwards); the pattern is computed from the angles in the shader
  {
    const nA = 128, nP = 64;
    const rows: Vtx[][] = [];
    for (let i = 0; i <= nP; i++) {
      const th = (Math.PI / 2) * (i / nP); // polar angle from the apex
      const row: Vtx[] = [];
      for (let j = 0; j <= nA; j++) {
        const az = (2 * Math.PI * j) / nA;
        const dir = new THREE.Vector3(Math.sin(th) * Math.sin(az), Math.cos(th), -Math.sin(th) * Math.cos(az));
        const p = new THREE.Vector3(0, DOME_Y, 0).addScaledVector(dir, DOME_R);
        const tan = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
        row.push({ p: v3(p), n: v3(dir.clone().negate()), uv: [az * DOME_R, th * DOME_R], t: v3(tan), pat: PAT.dome, ao: 0.9 + 0.1 * (i / nP), wall: -1 });
      }
      rows.push(row);
    }
    for (let i = 0; i < nP; i++) strip(b, rows[i], rows[i + 1]);
  }

  // ── the floor (its own material: polished stone + planar reflection)
  const fl = new THREE.BufferGeometry();
  {
    const P: number[] = [];
    const corners = Array.from({ length: 8 }, (_, k) => wallPoint(k, WD / 2, 0));
    for (let k = 0; k < 8; k++) {
      const a = corners[(k + 7) % 8], c = corners[k];
      P.push(0, G, 0, c.x, G, c.z, a.x, G, a.z);
    }
    // the niche floors (sills are higher: nothing to add) — the floor stops at the walls
    fl.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    fl.computeVertexNormals();
  }
  return { geo: b.geometry(), floor: fl, info };
}

/** fix the triangle winding of the whole hall so every face points towards its stored normal (for back-face culling) */
export function checkWinding(geo: THREE.BufferGeometry) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  let bad = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    nn.fromBufferAttribute(n, i);
    const f = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (f.dot(nn) < 0) bad++;
  }
  return bad;
}
