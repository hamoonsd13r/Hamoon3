// Snow Castle 3D · small things on the land: boulders lying in the snow of the ledges and banks, and bare trees
// (their twigs carry the snow by themselves: the masonry shader whitens whatever faces the sky).
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gCyl, type Builder } from "./geo";
import { fbm3, noise3, rng } from "./util";
import { forestAt, heightAt, plateauDist } from "./terrain";

const TAU = Math.PI * 2;
/** y of the ground normal from the height function (1 = level) */
const slopeY = (x: number, z: number, e = 0.75) => {
  const nx = heightAt(x - e, z) - heightAt(x + e, z), nz = heightAt(x, z - e) - heightAt(x, z + e);
  return (2 * e) / Math.hypot(nx, 2 * e, nz);
};
const nearest = (near: [number, number, number][], x: number, y: number, z: number) => {
  let d = 1e9;
  for (const [cx, cy, cz] of near) d = Math.min(d, Math.hypot(x - cx, y - cy, z - cz));
  return d;
};

/** boulders and broken blocks near the cameras, one merged mesh for the terrain material (it works in world space) */
export function buildRocks(near: [number, number, number][]) {
  const r = rng(6161);
  const protos = [1, 2].map((d) => mergeVertices(new THREE.IcosahedronGeometry(1, d).deleteAttribute("uv").deleteAttribute("normal")));
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
  let vo = 0, count = 0;
  const v = new THREE.Vector3();
  for (let i = 0; i < 6000; i++) {
    const x = -150 + r() * 390, z = -50 + r() * 250, u = r(), sv = r(), w = r(), q = r(), a = r() * TAU, e1 = r(), e2 = r();
    const h = heightAt(x, z);
    if (h < 0.8) continue;
    if (plateauDist(x, z) < -5) continue; // the built-up top of the rock
    if (slopeY(x, z) < 0.84) continue; // the faces are displaced in the mesh: only ledges and level ground hold a stone
    const dmin = nearest(near, x, h, z);
    if (dmin > 150 || dmin < 3.5 || u > 1.5 - dmin / 95) continue;
    const s = 0.28 + 2.5 * sv * sv * sv + (q < 0.035 ? 1.6 : 0);
    const proto = protos[s > 1.1 ? 1 : 0];
    const P = proto.attributes.position as THREE.BufferAttribute;
    const g = proto.clone();
    const gp = g.attributes.position as THREE.BufferAttribute;
    const sx = s * (0.8 + 0.5 * e1), sy = s * (0.5 + 0.35 * e2), sz = s * (0.8 + 0.5 * w);
    const ca = Math.cos(a), sa = Math.sin(a);
    const ox = x * 0.37, oz = z * 0.37;
    for (let k = 0; k < P.count; k++) {
      v.fromBufferAttribute(P, k);
      let m = 1 + 0.36 * fbm3(v.x * 1.5 + ox, v.y * 1.5, v.z * 1.5 + oz, 3) + 0.1 * noise3(v.x * 4.1 + oz, v.y * 4.1, v.z * 4.1 + ox);
      // broken faces: clip against two random planes
      m = Math.min(m, 1.12 / Math.max(0.2, Math.abs(v.x * (e1 - 0.5) * 1.6 + v.y * 0.6 + v.z * (e2 - 0.5) * 1.6) + 0.55));
      let px = v.x * m * sx, py = v.y * m * sy, pz = v.z * m * sz;
      if (py < 0) py *= 0.55;
      gp.setXYZ(k, x + px * ca + pz * sa, h + py + sy * 0.18, z - px * sa + pz * ca);
    }
    g.computeVertexNormals();
    const gn = g.attributes.normal as THREE.BufferAttribute, gi = g.index!;
    for (let k = 0; k < gp.count; k++) {
      pos.push(gp.getX(k), gp.getY(k), gp.getZ(k));
      nor.push(gn.getX(k), gn.getY(k), gn.getZ(k));
      col.push(1, 0, q);
    }
    for (let k = 0; k < gi.count; k++) idx.push(gi.getX(k) + vo);
    vo += gp.count;
    count++;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute("aCol", new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  out.computeBoundingSphere();
  return { geometry: out, count, tris: idx.length / 3 };
}

export type Spot = { x: number; y: number; z: number; s: number; seed: number };

/** where bare trees stand: level places near the cameras, outside the spruce forest and off the built-up rock */
export function bareTreeSpots(near: [number, number, number][], max = 46): Spot[] {
  const r = rng(8181);
  const out: Spot[] = [];
  for (let i = 0; i < 2600 && out.length < max; i++) {
    const x = -140 + r() * 340, z = -30 + r() * 200, u = r(), sv = r();
    const h = heightAt(x, z);
    if (h < 2.2) continue;
    const ny = slopeY(x, z, 1.2);
    if (ny < 0.9) continue;
    if (forestAt(x, z, h, ny) > 0.25) continue;
    if (plateauDist(x, z) < -7) continue;
    if (x > 44 && x < 186 && Math.abs(z - 46) < 7.5) continue; // nothing grows up through the viaduct
    const dmin = nearest(near, x, h, z);
    if (dmin > 135 || dmin < 14 || u > 1.35 - dmin / 110) continue;
    let ok = true;
    for (const o of out) if (Math.hypot(o.x - x, o.z - z) < 8) { ok = false; break; }
    if (!ok) continue;
    out.push({ x, y: h, z, s: 4.6 + sv * 4.6, seed: 100 + i });
  }
  return out;
}

/** a bare, wind-bent tree: trunk, limbs and twigs as tapered tubes in the "bark" bucket */
export function addBareTree(B: Builder, t: Spot) {
  const r = rng(t.seed);
  const branch = (len: number, rad: number, depth: number) => {
    B.add("bark", gCyl(Math.max(rad * 0.66, 0.022), rad, len, depth === 0 ? 8 : depth === 1 ? 6 : 4, 1.2), { uv: "keep", snow: depth === 0 ? 0.45 : 1.2, tint: 0.5 });
    if (depth >= 4) return;
    const kids = depth === 0 ? 3 : r() < 0.55 ? 2 : 1;
    for (let i = 0; i < kids; i++) {
      const at = depth === 0 ? 0.62 + 0.19 * i : 0.4 + 0.55 * r();
      B.push().translate(0, len * at, 0).rotY(r() * TAU).rotZ(0.5 + r() * 0.55);
      branch(len * (0.6 + r() * 0.2), Math.max(rad * (0.5 + r() * 0.14), 0.03), depth + 1);
      B.pop();
    }
    B.push().translate(0, len * 0.985, 0).rotY(r() * TAU).rotZ(0.1 + r() * 0.3);
    branch(len * (0.68 + r() * 0.14), Math.max(rad * 0.66, 0.03), depth + 1);
    B.pop();
  };
  B.push().translate(t.x, t.y - 0.4, t.z).rotY(r() * TAU).rotZ((r() - 0.5) * 0.24);
  branch(t.s * 0.36, t.s * 0.036, 0);
  B.pop();
}
