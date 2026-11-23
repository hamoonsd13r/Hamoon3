// Hollow Moon 3D · does the lens keep clear of the things it flies past? For every frame of the film: the distance from
// the camera to the hoops of the armillary (as they stand at that moment), the polar rod, the cage, the great ring, the
// crust and the water. Prints the closest approach to each, every frame closer than the margin, and for shot D2 the
// distance to the nearest hoop and to the sun over time (to set its focus keys).
//   npx tsx src/styles/hollow-moon-3d/pipeline/clear.mts [margin metres, default 2.5]
import * as THREE from "three";
import { camAt } from "../lib/cam";
import { RING } from "../lib/ring";
import { FPS, MOON, MOON_YAW, R, RING_AXIS } from "../lib/util";
import path from "node:path";
import { pathToFileURL } from "node:url";
// the demo film, or yours: FILM=src/v01/film.ts npx tsx …
const FILM_MOD = (await import(process.env.FILM ? pathToFileURL(path.resolve(process.env.FILM)).href : "../demo/film")) as typeof import("../demo/film");
const { CUT, DUR, SHOTS } = FILM_MOD;

const margin = Number(process.argv[2] ?? 2.5);
const M = new THREE.Vector3(...MOON);
const yawInv = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), MOON_YAW).invert();
// the armillary as core.ts builds it (keep in step with its `defs`)
const HOOPS = [
  { R: 44, half: 1.55, tilt: 0.3, axis: "x", w: 0.11, ph: 0.4, text: true },
  { R: 36, half: 1.3, tilt: 1.15, axis: "z", w: -0.05, ph: 1.9, text: false },
  { R: 28.5, half: 1.15, tilt: -0.3, axis: "x", w: 0.14, ph: 3.1, text: true },
  { R: 21.5, half: 1.0, tilt: 0.95, axis: "z", w: -0.09, ph: 0.9, text: false },
];
const CAGE_R = 11.5;
/** distance from p (in the frame of a hoop: its circle in the xz plane) to the band of the hoop */
const toBand = (p: THREE.Vector3, rad: number, half: number) => Math.hypot(Math.hypot(p.x, p.z) - rad, Math.max(Math.abs(p.y) - half, 0));
/** distances from a point of the moon's own frame to the four hoops at film time t (nested gimbals) */
const hoopDist = (pl: THREE.Vector3, t: number) => {
  const q = new THREE.Quaternion();
  return HOOPS.map((h) => {
    const a = h.text ? h.tilt + 0.32 * Math.sin(h.w * t + h.ph) : h.tilt + h.w * t;
    q.multiply(new THREE.Quaternion().setFromAxisAngle(h.axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), a));
    return toBand(pl.clone().applyQuaternion(q.clone().invert()), h.R, h.half);
  });
};
const local = (p: [number, number, number]) => new THREE.Vector3(...p).sub(M).applyQuaternion(yawInv);
const worst: Record<string, { d: number; t: number }> = {};
const note = (k: string, d: number, t: number) => { if (!worst[k] || d < worst[k].d) worst[k] = { d, t }; };
const close: string[] = [];
for (let f = 0; f < Math.round(CUT.F * FPS); f++) {
  const t = f / FPS;
  for (const s of SHOTS) {
    if (t < s.t0 || t > s.t1) continue;
    const c = camAt(s, t);
    const pw = new THREE.Vector3(...c.p), pl = local(c.p);
    hoopDist(pl, t).forEach((d, i) => { note(`hoop${i + 1}`, d, t); if (d < margin) close.push(`${s.id} t=${t.toFixed(2)} hoop${i + 1} ${d.toFixed(2)} m`); });
    // polar rod: a line through the centre, tilted -0.41 about z, 112 m long
    const rodDir = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.41);
    const along = pl.dot(rodDir), dRod = Math.abs(along) > 56 ? 99 : pl.clone().addScaledVector(rodDir, -along).length();
    note("rod", dRod, t);
    if (dRod < margin && pl.length() > CAGE_R + 0.5) close.push(`${s.id} t=${t.toFixed(2)} rod ${dRod.toFixed(2)} m`);
    const dc = pl.length();
    note("cage (distance from the centre)", dc, t);
    // the great ring
    const ra = new THREE.Vector3(...RING_AXIS), rel = pw.clone().sub(M), ax = rel.dot(ra), rad = rel.clone().addScaledVector(ra, -ax).length();
    const dRing = Math.hypot(Math.max(Math.abs(rad - RING.R) - 2, 0), Math.max(Math.abs(ax) - RING.half, 0));
    note("great ring", dRing, t);
    if (dRing < margin) close.push(`${s.id} t=${t.toFixed(2)} great ring ${dRing.toFixed(2)} m`);
    if (s.sea) { note("water (height)", pw.y, t); if (pw.y < 2) close.push(`${s.id} t=${t.toFixed(2)} water ${pw.y.toFixed(2)} m`); }
    if (s.id === "C") { const alt = dc - R; note("crust (altitude, shot C)", alt, t); if (alt < 6) close.push(`${s.id} t=${t.toFixed(2)} crust ${alt.toFixed(2)} m`); }
  }
}
console.log(`film ${DUR} s · cuts ${Object.entries(CUT).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · ")}`);
for (const [k, v] of Object.entries(worst)) console.log(`${k.padEnd(34)} closest ${v.d.toFixed(2)} m at t=${v.t.toFixed(2)}`);
console.log(close.length ? `\n${close.length} frames closer than ${margin} m:\n` + close.slice(0, 60).join("\n") : `\nno frame closer than ${margin} m`);
const d2 = SHOTS.find((s) => s.id === "D2");
if (d2) {
  console.log("\nD2 · t, nearest hoop (m), each hoop, sun (m)");
  for (let k = 0; k <= 8; k++) {
    const t = d2.t0 + (k / 8) * (d2.t1 - d2.t0), pl = local(camAt(d2, t).p), hd = hoopDist(pl, t);
    console.log(`  ${t.toFixed(2)}  ${Math.min(...hd).toFixed(1)}  [${hd.map((v) => v.toFixed(1)).join(", ")}]  ${pl.length().toFixed(1)}`);
  }
}
