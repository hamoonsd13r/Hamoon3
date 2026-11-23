// Snow Castle 3D · the ground under the cameras, and height maps of the place, to set camera keys without renders.
//   npx tsx src/styles/snow-castle-3d/pipeline/probe.mts            → each shot: lens position, ground, clearance, water, forest
//   npx tsx src/styles/snow-castle-3d/pipeline/probe.mts map        → coarse map (x 40…260, z -40…200, every 10 m): ground in metres, "~~" water
//   npx tsx src/styles/snow-castle-3d/pipeline/probe.mts fine x0 x1 z0 z1 step   → heights in metres, "*" = forest
// Your own film: FILM=src/v01/film.ts npx tsx src/styles/snow-castle-3d/pipeline/probe.mts
import { sampleShot } from "../lib/cam";
import { forestAt, heightAt, lakeDist } from "../lib/terrain";
import path from "node:path";
import { pathToFileURL } from "node:url";
// the demo film, or yours: FILM=src/v01/film.ts npx tsx …
const FILM_MOD = (await import(process.env.FILM ? pathToFileURL(path.resolve(process.env.FILM)).href : "../demo/film")) as typeof import("../demo/film");
const { SHOTS } = FILM_MOD;

if (process.argv[2] === "map") {
  let head = "  z\\x ";
  for (let x = 40; x <= 260; x += 10) head += String(x).padStart(4);
  console.log(head);
  for (let z = -40; z <= 200; z += 10) {
    let row = String(z).padStart(5) + " ";
    for (let x = 40; x <= 260; x += 10) {
      const h = heightAt(x, z);
      row += h < 0 ? "  ~~" : String(Math.round(h)).padStart(4);
    }
    console.log(row);
  }
} else if (process.argv[2] === "fine") {
  const [x0, x1, z0, z1, st] = process.argv.slice(3).map(Number);
  let head = "  z\\x ";
  for (let x = x0; x <= x1; x += st) head += String(x).padStart(5);
  console.log(head);
  for (let z = z0; z <= z1; z += st) {
    let row = String(z).padStart(5) + " ";
    for (let x = x0; x <= x1; x += st) {
      const h = heightAt(x, z);
      row += h < 0 ? "   ~~" : (String(Math.round(h)) + (forestAt(x, z, h, 1) > 0.5 ? "*" : " ")).padStart(5);
    }
    console.log(row);
  }
} else {
  for (const s of SHOTS) {
    console.log(`shot ${s.id}`);
    for (let t = s.t0; t <= s.t1 + 1e-6; t += (s.t1 - s.t0) / 6) {
      const c = sampleShot(s, t);
      const h = heightAt(c.p[0], c.p[2]);
      console.log(`  t=${t.toFixed(1)} cam=(${c.p.map((v) => v.toFixed(1)).join(", ")}) ground=${h.toFixed(1)} clear=${(c.p[1] - Math.max(h, 0)).toFixed(1)} lake=${lakeDist(c.p[0], c.p[2]).toFixed(0)} forest=${forestAt(c.p[0], c.p[2], h, 1).toFixed(2)}`);
    }
  }
}
