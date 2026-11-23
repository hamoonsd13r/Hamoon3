// Hollow Moon 3D · search for a camera over the crust near the rim where the key light rakes the surface from the upper
// left of the picture (craters read as bowls, boulders throw long shadows). Prints the best candidates as sf() helpers.
//   npx tsx src/styles/hollow-moon-3d/pipeline/findc.mts
import { H } from "../lib/cam";
import { MOON } from "../lib/util";

const K = [-0.55, 0.62, 0.56];
const n = (v: number[]) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const out: string[] = [];
for (let ph = -180; ph < 180; ph += 15) for (const thT of [50, 58, 66]) {
  const T = H.sf(thT, ph, 100), N = n(sub(T, MOON));
  const sun = dot(N, K);
  if (sun < 0.12 || sun > 0.6) continue;
  for (const dth of [14, 22, 30]) for (const dph of [-40, -20, 0, 20, 40]) for (const alt of [118, 130, 145]) {
    const P = H.sf(thT + dth, ph + dph, alt);
    if (P[1] < 12) continue;
    const v = n(sub(T, P)), r = n(cross(v, [0, 1, 0])), u = cross(r, v);
    const lr = dot(K, r), lu = dot(K, u), lv = -dot(K, v);
    // how much of the view is grazing: angle between the view and the surface at the target
    const graze = -dot(v, N);
    if (lu > 0.45 && Math.abs(lv) < 0.45 && graze > 0.25 && graze < 0.75) out.push(`T sf(${thT},${ph},100) sun ${sun.toFixed(2)} · P sf(${thT + dth},${ph + dph},${alt}) y=${P[1].toFixed(0)} · light right ${lr.toFixed(2)} up ${lu.toFixed(2)} lens ${lv.toFixed(2)} · graze ${graze.toFixed(2)} · score ${(lu - Math.abs(lv) - Math.abs(sun - 0.33)).toFixed(2)}`);
  }
}
out.sort((a, b) => Number(b.split("score ")[1]) - Number(a.split("score ")[1]));
console.log(out.slice(0, 24).join("\n"));
console.log("opening axis", n(sub(H.ax(100, 0, 0), MOON)).map((v) => v.toFixed(2)).join(","), "· key·axis", dot(n(sub(H.ax(100, 0, 0), MOON)), K).toFixed(2));
