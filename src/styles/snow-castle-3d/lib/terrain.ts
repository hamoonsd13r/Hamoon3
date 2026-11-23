// Snow Castle 3D · the land: one analytic height function (castle rock above a highland loch, a ravine under the viaduct,
// forested hills and far mountains) sampled into three nested grids, plus the forest scatter.
import * as THREE from "three";
import { clamp, fbm2, hash2, lerp, noise2, noise3, ridged2, rng, sstep } from "./util";

export const WATER_Y = 0;
/** main level of the castle rock */
export const Y0 = 62;

const smin = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k);
  return lerp(b, a, h) - k * h * (1 - h);
};
const sdCapsule = (px: number, pz: number, ax: number, az: number, bx: number, bz: number, r: number) => {
  const pax = px - ax, paz = pz - az, bax = bx - ax, baz = bz - az;
  const h = clamp((pax * bax + paz * baz) / (bax * bax + baz * baz));
  return Math.hypot(pax - bax * h, paz - baz * h) - r;
};
const sdEllipse = (px: number, pz: number, cx: number, cz: number, rx: number, rz: number) => (Math.hypot((px - cx) / rx, (pz - cz) / rz) - 1) * Math.min(rx, rz);

/** the stack tower stands on its own stack of rock in the lake, west of the castle */
export const STACK = { x: -226, z: -78, y: 46 };
/** lantern posts on the island's shore (foreground of the opening shot) */
export const JETTY = [{ x: -404.5, z: 398.5, rot: 0.6, tOn: -5 }];
/** island the film opens on (south-west of the castle, across the water) */
export const ISLAND = { x: -452, z: 432, r: 86 };
const islandDist = (x: number, z: number) => Math.hypot(x - ISLAND.x, (z - ISLAND.z) * 1.25) - ISLAND.r + fbm2(x * 0.021 + 5, z * 0.021, 3) * 16;

/** skerries in the loch south of the rock (x, z, radius, height): the opening shot climbs past their spruces */
export const SKERRIES: [number, number, number, number][] = [[55.0, 136.6, 9.5, 5], [21.5, 146.6, 9, 4.5], [30, 128, 8.5, 4]];

/** signed distance to the lake edge: negative in water, positive on land (metres, approximate) */
export function lakeDist(x: number, z: number) {
  let d = sdEllipse(x, z, 70, 540, 800, 452);
  d = smin(d, sdCapsule(x, z, -332, 270, -300, -250, 172), 70);
  d = smin(d, sdCapsule(x, z, -430, 430, -3200, 1750, 600), 140);
  d += fbm2(x * 0.0034, z * 0.0034, 4) * 46 + fbm2(x * 0.019, z * 0.019, 3) * 7;
  return Math.max(d, -islandDist(x, z));
}

// the castle rock: a smooth union of discs (x, z, radius)
const BLOBS: [number, number, number][] = [
  [-86, 48, 33], [-54, 48, 33], [-14, 44, 36], [28, 44, 32],
  [-88, 2, 44], [-50, -4, 46], [-10, 0, 44], [30, -6, 40],
  [-92, -40, 36], [-52, -44, 38], [-8, -42, 38], [34, -36, 34],
  [56, -6, 27],
];
/** signed distance to the edge of the castle rock (negative on top) */
export function plateauDist(x: number, z: number) {
  let d = 1e9;
  for (const [bx, bz, r] of BLOBS) d = smin(d, Math.hypot(x - bx, z - bz) - r, 22);
  // spurs and gullies cut the rim
  return d + fbm2(x * 0.021 + 3, z * 0.021, 3) * 5.5 + (ridged2(x * 0.017 + 1.3, z * 0.017, 3) - 0.45) * 13;
}

/** signed distance to the rim of the east hill (negative on top) */
export function eastDist(x: number, z: number) {
  return sdEllipse(x, z, 266, -6, 98, 132) + fbm2(x * 0.019 + 6, z * 0.019, 3) * 7;
}

/** ravine under the viaduct and the wooden bridge: distance to its centre line and the floor height there */
const RAV: [number, number, number][] = [[112, 170, 1], [118, 96, 3], [116, 30, 9], [106, -40, 22], [128, -120, 36], [176, -220, 52]];
function ravine(x: number, z: number): [number, number] {
  let best = 1e9, fy = 0;
  for (let i = 0; i < RAV.length - 1; i++) {
    const [ax, az, ay] = RAV[i], [bx, bz, by] = RAV[i + 1];
    const pax = x - ax, paz = z - az, bax = bx - ax, baz = bz - az;
    const h = clamp((pax * bax + paz * baz) / (bax * bax + baz * baz));
    const d = Math.hypot(pax - bax * h, paz - baz * h);
    if (d < best) { best = d; fy = lerp(ay, by, h); }
  }
  return [best, fy];
}

/** rock wall between a top level and the ground around it: steep risers, narrow broken ledges, rubble at the foot.
 *  d = distance outside the rim (≤ 0 on top), w = width of the wall in plan. */
function cliff(d: number, w: number, top: number, base: number, x: number, z: number, n: number) {
  if (top <= base) return base;
  if (d <= 0) return top;
  const wob = fbm2(x * 0.047 + 9, z * 0.047, 3) * 0.26 + noise2(x * 0.19, z * 0.19) * 0.06;
  const u = clamp(d / w + wob * sstep(0, 0.25, d / w) * sstep(1.15, 0.8, d / w));
  const f = u * n, fi = Math.floor(f), ff = f - fi;
  const stepped = (fi + sstep(0.2, 0.74, ff)) / n;
  let p = lerp(u, Math.min(stepped, 1), 0.42 + 0.3 * noise2(x * 0.02 + 7, z * 0.02));
  p = p * p * (3 - 2 * p) * 0.35 + p * 0.65;
  let h = lerp(top, base, clamp(p));
  // rubble and fallen blocks where the wall meets the ground
  h += Math.max(0, noise2(x * 0.16 + 5, z * 0.16) + 0.15) * 3.2 * sstep(0.55, 0.9, u) * sstep(1.0, 0.92, u);
  return Math.max(h, base);
}

/** ground height in metres (water level = 0) */
export function heightAt(x: number, z: number) {
  const dl = lakeDist(x, z);
  let h: number;
  if (dl < 0) {
    h = Math.max(-26, dl * 0.2) - 0.5;
  } else {
    const dc = Math.hypot(x + 20, z);
    const hills = fbm2(x * 0.0021 + 3.1, z * 0.0021 - 1.7, 5) * 0.5 + 0.5;
    const mtn = Math.pow(ridged2(x * 0.00043 + 0.37, z * 0.00043 + 0.11, 6), 1.2);
    const far = Math.min(sstep(140, 1700, dl), sstep(520, 2000, dc));
    h = 0.3 + Math.min(dl, 40) * 0.075 + hills * 105 * sstep(6, 460, dl) + mtn * 820 * far + mtn * hills * 240 * sstep(900, 6000, dc);
    h += fbm2(x * 0.011, z * 0.011, 4) * 7 * sstep(4, 90, dl) + fbm2(x * 0.06, z * 0.06, 3) * 0.9 * sstep(2, 30, dl);
    // the neck of land behind the castle and the hill the viaduct lands on
    h = Math.max(h, 58 * sstep(300, 70, Math.hypot(x + 30, z + 190)) + fbm2(x * 0.01, z * 0.01, 3) * 5 * sstep(300, 150, Math.hypot(x + 30, z + 190)));
    // the island stays low
    const di = islandDist(x, z);
    if (di < 30) h = lerp(0.4 + clamp(-di, 0, 60) * 0.11 + fbm2(x * 0.05, z * 0.05, 3) * 0.9 * sstep(0, -20, di), h, sstep(0, 30, di));
  }
  // ravine
  const [dr, fy] = ravine(x, z);
  const wr = 46 + fbm2(x * 0.02, z * 0.02 + 9, 3) * 10;
  if (dr < wr) {
    const floor = fy + fbm2(x * 0.03 + 7, z * 0.03, 3) * 2.5;
    const k = sstep(wr, wr * 0.22, dr);
    if (h > floor) h = lerp(h, floor, k);
  }
  // the east bank: the hill the viaduct lands on, falling to the ravine in broken, wooded steps
  {
    const de = eastDist(x, z);
    const we = 52 + fbm2(x * 0.013 + 2, z * 0.013, 3) * 12;
    if (de < we) {
      const topE = Y0 + 0.2 + 26 * sstep(0, -140, de) + fbm2(x * 0.02, z * 0.02 + 4, 3) * 3 * sstep(-4, -40, de);
      h = cliff(de, we, topE, h, x, z, 2.2);
    }
  }
  // where the wooden bridge lands, and the stack tower's rock
  h = lerp(h, 61.6, sstep(54, 16, Math.hypot(x - 190, z + 104)));
  {
    // sea stack: a leaning, stepped crag
    const dStack = Math.hypot(x - STACK.x - 3, (z - STACK.z) * 0.86) - 10.5 + fbm2(x * 0.07, z * 0.07, 3) * 5;
    const wo = 15 + fbm2(x * 0.05 + 2, z * 0.05, 2) * 4;
    if (dStack < wo) h = cliff(dStack, wo, STACK.y - 3 * sstep(-6, 0, dStack), h, x, z, 2.3);
  }
  for (const [cx, cz, r, top] of SKERRIES) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > r * 1.35) continue;
    const dd = d + fbm2(x * 0.13 + cx, z * 0.13, 3) * 2.4;
    const k = sstep(r, r * 0.28, dd);
    h = Math.max(h, -0.8 + (top + 0.8) * k * (0.82 + 0.36 * fbm2(x * 0.22, z * 0.22 + cx, 2)));
  }
  // castle rock
  const dp = plateauDist(x, z);
  // sheer faces in places, broken slopes in others
  const wc = 21 + fbm2(x * 0.011 + 4, z * 0.011, 3) * 12 + fbm2(x * 0.05, z * 0.05, 2) * 3.5;
  if (dp < wc) {
    h = cliff(dp, wc, Y0 - 4.0 * sstep(-8, 0.5, dp) + fbm2(x * 0.05, z * 0.05, 2) * 0.25, h, x, z, 3.3);
    // broken teeth and ribs of rock under the walls, so the snow cap does not end in one smooth lip
    // (not where the viaduct and the wooden bridge meet the rock)
    if (dp > -3 && dp < 18 && !(x > 30 && Math.abs(z - 46) < 9) && Math.hypot(x - 67, z + 31) > 13) {
      const tooth = Math.max(0, ridged2(x * 0.11 + 3, z * 0.11, 3) - 0.36) * (4.2 + 4 * sstep(1, 8, dp));
      // here and there the crag stands well above the rim
      const big = sstep(0.02, 0.5, fbm2(x * 0.022 + 7, z * 0.022 + 1, 3));
      const crag = Math.max(0, ridged2(x * 0.05 + 11, z * 0.05 + 5, 4) - 0.3) * 16 * big;
      // the head of the viaduct stays clear of standing rock
      const clear = x > 20 ? sstep(9, 26, Math.abs(z - 46)) : 1;
      h += (tooth + crag * clear) * sstep(-3, 2, dp) * sstep(18, 6, dp);
    }
  }
  return h;
}

/** 0..1 how much forest grows here */
export function forestAt(x: number, z: number, h: number, ny: number) {
  if (h < 1.6 || ny < 0.6) return 0;
  const dp = plateauDist(x, z);
  if (dp < 24) return 0;
  const di = islandDist(x, z);
  let f = sstep(-0.18, 0.2, fbm2(x * 0.0042 + 11, z * 0.0042 + 5, 4)) * 0.9 + 0.1;
  // the forbidden forest east of the ravine and north of the castle is solid
  f = Math.max(f, sstep(150, 230, x) * 0.95, sstep(-150, -260, z) * 0.9);
  if (di < 0) f = Math.max(f, 0.8 * sstep(0, -18, di));
  f *= sstep(330, 230, h); // tree line
  f *= sstep(1.6, 4, h);
  // clearings: the lawn north of the castle, the viaduct landing, the bridge end
  f *= sstep(9, 24, Math.hypot(x - 181, z - 46));
  return clamp(f);
}

export type Tree = { x: number; y: number; z: number; s: number; rot: number; lod: 0 | 1 | 2; v: number };

/** deterministic forest scatter. `near` are points the cameras pass (hero trees within `heroR`). */
export function scatterTrees(near: [number, number, number][], heroR = 150, midR = 620) {
  const out: Tree[] = [];
  const r = rng(4242);
  const place = (x0: number, x1: number, z0: number, z1: number, cell: number, skip?: (x: number, z: number) => boolean) => {
    for (let gz = z0; gz < z1; gz += cell) {
      for (let gx = x0; gx < x1; gx += cell) {
        const x = gx + r() * cell, z = gz + r() * cell, u = r(), v = r(), w = r();
        if (skip && skip(x, z)) continue;
        if (lakeDist(x, z) < 4) continue;
        const h = heightAt(x, z);
        const e = 2.5;
        const nx = heightAt(x - e, z) - heightAt(x + e, z), nz = heightAt(x, z - e) - heightAt(x, z + e);
        const ny = (2 * e) / Math.hypot(nx, 2 * e, nz);
        const f = forestAt(x, z, h, ny);
        if (u > f) continue;
        let dmin = 1e9;
        for (const [cx, cy, cz] of near) dmin = Math.min(dmin, Math.hypot(x - cx, h - cy, z - cz));
        const dc = Math.hypot(x, z);
        const lod = dmin < heroR ? 0 : dmin < midR || dc < midR ? 1 : 2;
        out.push({ x, y: h - 0.3, z, s: 10 + v * v * 20 + (lod === 0 ? 2 : 0), rot: w * Math.PI * 2, lod: lod as 0 | 1 | 2, v: w });
      }
    }
  };
  const inL0 = (x: number, z: number) => x > L0.x0 && x < L0.x0 + L0.size && z > L0.z0 && z < L0.z0 + L0.size;
  place(L0.x0, L0.x0 + L0.size, L0.z0, L0.z0 + L0.size, 6);
  place(-3000, 2400, -2600, 3200, 13, inL0);
  return out;
}

// ───────────────────────── meshes ─────────────────────────
export const L0 = { x0: -780, z0: -516, size: 1344, step: 1.5 };
export const L1 = { x0: -3468, z0: -2724, sx: 6048, sz: 6336, step: 12 };
export const L2 = { x0: -17868, z0: -15204, sx: 32928, sz: 33216, step: 96 };

function grid(x0: number, z0: number, sx: number, sz: number, step: number, holes: [number, number, number, number][], displace: boolean, skirt: number) {
  const nx = Math.round(sx / step) + 1, nz = Math.round(sz / step) + 1;
  const pos = new Float32Array(nx * nz * 3);
  const hgt = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const z = z0 + j * step;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * step;
      const k = j * nx + i;
      const h = heightAt(x, z);
      hgt[k] = h;
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    }
  }
  const nor = new Float32Array(nx * nz * 3);
  const normals = () => {
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const a = j * nx + Math.max(i - 1, 0), b = j * nx + Math.min(i + 1, nx - 1), c = Math.max(j - 1, 0) * nx + i, d = Math.min(j + 1, nz - 1) * nx + i;
        const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2];
        const bx = pos[d * 3] - pos[c * 3], by = pos[d * 3 + 1] - pos[c * 3 + 1], bz = pos[d * 3 + 2] - pos[c * 3 + 2];
        // (d - c) × (b - a): +z × +x = +y
        let x = by * az - bz * ay, y = bz * ax - bx * az, z = bx * ay - by * ax;
        const l = Math.hypot(x, y, z) || 1;
        x /= l; y /= l; z /= l;
        nor[k * 3] = x; nor[k * 3 + 1] = y; nor[k * 3 + 2] = z;
      }
    }
  };
  normals();
  if (displace) {
    // crags: ridged 3D noise pushes the faces in and out so the heightfield stops looking like a sheet
    const rid = (x: number, y: number, z: number, f: number) => { const n = 1 - Math.abs(noise3(x * f, y * f * 1.4, z * f)); return n * n; };
    for (let k = 0; k < nx * nz; k++) {
      const ny = nor[k * 3 + 1];
      if (ny > 0.95) continue;
      const w = sstep(0.95, 0.62, ny);
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
      let d = (rid(x, y, z, 0.045) - 0.38) * 4.2 + (rid(x + 40, y, z - 17, 0.12) - 0.38) * 1.7;
      if (step < 1) d += (rid(x - 9, y + 3, z + 21, 0.34) - 0.38) * 0.62 + (rid(x + 5, y - 8, z + 2, 0.9) - 0.38) * 0.2;
      const hl = Math.hypot(nor[k * 3], nor[k * 3 + 2]) || 1;
      pos[k * 3] += (nor[k * 3] / hl) * d * w * (1 - ny * 0.5);
      pos[k * 3 + 2] += (nor[k * 3 + 2] / hl) * d * w * (1 - ny * 0.5);
      pos[k * 3 + 1] += d * w * ny * 0.6;
    }
    normals();
  }
  const col = new Float32Array(nx * nz * 3);
  for (let k = 0; k < nx * nz; k++) {
    const x = pos[k * 3], z = pos[k * 3 + 2];
    col[k * 3] = 1;
    col[k * 3 + 1] = forestAt(x, z, hgt[k], nor[k * 3 + 1]);
    col[k * 3 + 2] = hash2(x * 0.37, z * 0.37);
  }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      if (holes.length) {
        const x = x0 + i * step, z = z0 + j * step;
        let cut = false;
        for (const hole of holes) if (x >= hole[0] - 1e-3 && x + step <= hole[2] + 1e-3 && z >= hole[1] - 1e-3 && z + step <= hole[3] + 1e-3) { cut = true; break; }
        if (cut) continue;
      }
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  let P = pos, N = nor, C = col;
  if (skirt > 0) {
    // a wall hanging from the outer rim hides the cracks against the coarser ring
    const rim: number[] = [];
    for (let i = 0; i < nx; i++) rim.push(i);
    for (let j = 1; j < nz; j++) rim.push(j * nx + nx - 1);
    for (let i = nx - 2; i >= 0; i--) rim.push((nz - 1) * nx + i);
    for (let j = nz - 2; j > 0; j--) rim.push(j * nx);
    const base = nx * nz;
    P = new Float32Array((base + rim.length) * 3); N = new Float32Array((base + rim.length) * 3); C = new Float32Array((base + rim.length) * 3);
    P.set(pos); N.set(nor); C.set(col);
    rim.forEach((k, q) => {
      const o = (base + q) * 3;
      P[o] = pos[k * 3]; P[o + 1] = pos[k * 3 + 1] - skirt; P[o + 2] = pos[k * 3 + 2];
      N[o] = nor[k * 3]; N[o + 1] = nor[k * 3 + 1]; N[o + 2] = nor[k * 3 + 2];
      C[o] = col[k * 3]; C[o + 1] = col[k * 3 + 1]; C[o + 2] = col[k * 3 + 2];
    });
    for (let q = 0; q < rim.length; q++) {
      const a = rim[q], b = rim[(q + 1) % rim.length], c = base + q, d = base + ((q + 1) % rim.length);
      idx.push(a, b, c, b, d, c, a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("aCol", new THREE.BufferAttribute(C, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** where the film lives: the whole south and east of the castle rock, the ravine under the viaduct, the skerries
 *  in front of the opening shot. 0.5 m mesh (one patch, so there is no seam inside any frame). */
export const LH = { x0: -141, z0: -40.5, sx: 405, sz: 241.5, step: 0.5 };

export function buildTerrain() {
  const gh = grid(LH.x0, LH.z0, LH.sx, LH.sz, LH.step, [], true, 3);
  const g0 = grid(L0.x0, L0.z0, L0.size, L0.size, L0.step, [[LH.x0, LH.z0, LH.x0 + LH.sx, LH.z0 + LH.sz]], true, 8);
  const g1 = grid(L1.x0, L1.z0, L1.sx, L1.sz, L1.step, [[L0.x0, L0.z0, L0.x0 + L0.size, L0.z0 + L0.size]], false, 40);
  const g2 = grid(L2.x0, L2.z0, L2.sx, L2.sz, L2.step, [[L1.x0, L1.z0, L1.x0 + L1.sx, L1.z0 + L1.sz]], false, 0);
  return [gh, g0, g1, g2];
}
