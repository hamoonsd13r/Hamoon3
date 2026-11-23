// Mirror Hall · the director: for any film second, the whole state of the hall (camera, the
// swarm's morph, lights and candles, the mirror and its shards, stones, the mirror-work reveal, glow and grade).
// Everything is a pure function of time, timed on the song's words and beats (film 0 = song 30.66 s).
import * as THREE from "three";
import { cameraSpline, type CamKey, type Transition } from "../../light-swarm/timeline";
import BEATS from "./base/beats89.json";
import { bar, beat, beatPos, clamp, kick, sstep } from "./base/lib89";
import { G, IO0, IW0, IW1 } from "./base/shapes89";
import { N } from "../../light-swarm/shapes";
import { A as APO, DOME_R, DOME_Y, N_D, wallFrame, wallPoint } from "./archH";
import type { CamState, LightDef } from "./engineH";
import {
  copiesOf, crowdArc, crowdHands, herLightPts, intoFlames, motherAt, none, puddlesAt, ringPlaces, rowPlaces, shapeOf, shardCloud, starPlaces, wallPoints,
  type HerAt,
} from "./figH";
import { FLAME_Y } from "./propsH";

type V3 = [number, number, number];
const PI = Math.PI;
export const DUR_H = 210.5;

// ───────────────────────── who stands where ─────────────────────────
const M_: HerAt = { x: 0, z: 0, rot: PI }; // facing her mother's mirror (−z)
const F_: HerAt = { x: 0, z: 0, rot: 0 }; // facing the camera side (+z)
export const MIRROR_AT = new THREE.Vector3(0, G, -20);
export const STICK_L = new THREE.Vector3(-12, G, -18), STICK_R = new THREE.Vector3(12, G, -18);
const flameOf = (p: THREE.Vector3, s = 1): V3 => [p.x, p.y + FLAME_Y * s, p.z];
const FL_L = flameOf(STICK_L), FL_R = flameOf(STICK_R);

// the copies' formations
const RING8 = ringPlaces(8, 30, PI / 8);
const RING16 = ringPlaces(16, 50, 0);
const ROWS = rowPlaces([[-34, 7], [-64, 9], [-94, 11]], 17);
const STAR = starPlaces([32, 54, 76]);
const RINGS2 = [...ringPlaces(10, 36, 0.2), ...ringPlaces(14, 68, 0.05)];

// ───────────────────────── the shapes ─────────────────────────
type Others = (o: Float32Array) => void;
const wp: Others = (o) => wallPoints(o, IO0, N);
const crowdB = (pose: string, mode: "stand" | "away" | "gone" = "stand", glow = false) => crowdArc(pose, [0, 0], 0, 45, mode, 14, glow, 0.5);
const crowdBridge = (pose: string) => crowdArc(pose, [0, 0], PI, 62, "stand", 14);
const DEF: [string, string | null, HerAt | null, Others][] = [
  ["sit_m", "sit", M_, none],
  ["sit_m_crowd", "sit", M_, crowdB("stand")],
  ["sit_m_gone", "sit", M_, crowdB("stand", "gone")],
  ["fly_clapA", "fly", M_, crowdB("clapA")],
  ["fly_clapB", "fly", M_, crowdB("clapB", "stand", true)],
  ["cry_away", "kneelCry", M_, crowdB("stand", "away")],
  ["cry_none", "kneelCry", M_, none],
  ["stand_m", "stand", M_, none],
  ["touch_m", "touch", M_, none],
  ["touch_m_glass", "touch", M_, shardCloud([0, -26], -19.5, 4, 26)],
  ["rise_m_glass", "rise", M_, shardCloud([0, -26], -19.5, 4, 26)],
  ["rise_f_glass", "rise", F_, shardCloud([0, -26], -19.5, 4, 26)],
  ["rise_f_cloud", "rise", F_, shardCloud([0, 0], 22, 14, 42)],
  ["Y_cloud", "Y", F_, shardCloud([0, 0], 22, 14, 42)],
  ["Y_walls", "Y", F_, wp],
  ["d1w", "d1", F_, wp], ["d2w", "d2", F_, wp], ["d3w", "d3", F_, wp], ["d4w", "d4", F_, wp], ["d8w", "d8", F_, wp],
  ["r8_d1", "d1", F_, copiesOf(RING8, "d1")], ["r8_d2", "d2", F_, copiesOf(RING8, "d2")], ["r8_d3", "d3", F_, copiesOf(RING8, "d3")], ["r8_d4", "d4", F_, copiesOf(RING8, "d4")],
  ["r16_d5", "d5", F_, copiesOf(RING16, "d5")], ["r16_d6", "d6", F_, copiesOf(RING16, "d6")], ["r16_d7", "d7", F_, copiesOf(RING16, "d7")], ["r16_d8", "d8", F_, copiesOf(RING16, "d8")],
  ["d8", "d8", F_, none], ["d7", "d7", F_, none], ["d4", "d4", F_, none],
  ["sitF", "sitF", F_, none],
  ["sitF_flameL", "sitF", F_, intoFlames([FL_L])],
  ["sitF_mother", "sitF", F_, motherAt({ x: 0, z: -12, rot: 0 }, "motherKneel")],
  ["sitF_hug", "sitF", F_, motherAt({ x: 0, z: -12, rot: 0 }, "motherHug")],
  ["sitF_flames", "sitF", F_, intoFlames([FL_L, FL_R])],
  ["standF", "stand", F_, none], ["walk1", "walk1", F_, none], ["walk2", "walk2", F_, none],
  ["touchF_pud", "touch", F_, puddlesAt(ROWS)],
  ["rise_rows", "rise", F_, copiesOf(ROWS, "rise", false, true)],
  ["rows_d1", "d1", F_, copiesOf(ROWS, "d1")], ["rows_d2", "d2", F_, copiesOf(ROWS, "d2")], ["rows_d3", "d3", F_, copiesOf(ROWS, "d3")], ["rows_d4", "d4", F_, copiesOf(ROWS, "d4")],
  ["star_d5", "d5", F_, copiesOf(STAR, "d5")], ["star_d6", "d6", F_, copiesOf(STAR, "d6")], ["star_d3", "d3", F_, copiesOf(STAR, "d3")],
  ["rings_d7", "d7", F_, copiesOf(RINGS2, "d7")], ["rings_d8", "d8", F_, copiesOf(RINGS2, "d8")], ["rings_d4", "d4", F_, copiesOf(RINGS2, "d4")],
  ["offer", "offer", F_, none],
  ["offer_crowd", "offer", F_, crowdBridge("hold")],
  ["drop_throw", "drop", F_, crowdBridge("throw")],
  ["Y_wp2", "Y", F_, wp],
  ["sit_end", "sitEnd", M_, none],
];
export const SHAPES_H = ["cloud", "seed_h", ...DEF.map((d) => d[0])];
export const GEN_H: Record<string, () => Float32Array> = Object.fromEntries(DEF.map(([n, pose, at, oth]) => [n, shapeOf(pose && at ? { pose, at } : null, oth)]));
/** the first point of light: her share of the light gathered in a small soft ball at the core glow (everything else
 *  already where it rests while she sits), so the light pours out of the point into her body */
GEN_H.seed_h = () => {
  const o = GEN_H.sit_m().slice();
  let a = 0x9e3779b9;
  const rnd = () => ((a = (Math.imul(a ^ (a >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 4294967296);
  for (let i = IW0; i < IW1; i++) {
    const u = rnd() * 2 - 1, ph = rnd() * PI * 2, r = 0.25 + 2.2 * Math.pow(rnd(), 1.8), sq = Math.sqrt(1 - u * u);
    o.set([Math.cos(ph) * sq * r, u * r, Math.sin(ph) * sq * r, 1 + 0.999 * rnd()], i * 4);
  }
  return o;
};
export const DENS_H: Record<string, number> = Object.fromEntries(SHAPES_H.map((n) => [n, n === "cloud" ? 1.1 : n === "seed_h" ? 0.45 : 1.15]));
const HER_OF: Record<string, [string, HerAt]> = Object.fromEntries(DEF.filter((d) => d[1] && d[2]).map((d) => [d[0], [d[1]!, d[2]!]]));

// ───────────────────────── the morph timeline ─────────────────────────
type Tr = Transition & { oth?: [number, number] };
const tr = (t0: number, a: string, b: string, D: number, F: number, o: Partial<Tr> = {}): Tr => ({ t0, a, b, D, F, q: 0, swirl: 0, turb: 0, dim: 0.7, ...o });
const TABLE: Tr[] = [];
{
  const T = TABLE;
  T.push(tr(-1, "seed_h", "seed_h", 0.1, 0.1));
  T.push(tr(bar(1), "seed_h", "sit_m", 3.6, 2.0, { swirl: 0.25, turb: 0.35, dim: 0.4 }));
  // V1: the faces gather (in the mirror), vanish one by one; they clap when she rises; they leave when she cries
  T.push(tr(12.15, "sit_m", "sit_m_crowd", 1.0, 0.9, { turb: 0.3, dim: 0.6 }));
  T.push(tr(15.55, "sit_m_crowd", "sit_m_gone", 1.7, 0.8, { dim: 0.5 }));
  T.push(tr(16.95, "sit_m_gone", "fly_clapA", 0.4, 1.0, { dim: 0.8 }));
  for (let i = 0; i < 7; i++) T.push(tr(beat(32 + i), i % 2 ? "fly_clapB" : "fly_clapA", i % 2 ? "fly_clapA" : "fly_clapB", 0.03, 0.24, { dim: 1 }));
  T.push(tr(21.62, "fly_clapB", "cry_away", 1.2, 1.4, { turb: 0.2, dim: 0.85 }));
  T.push(tr(24.3, "cry_away", "cry_none", 0.6, 1.0, { dim: 0.4 }));
  // PC1: she stands; the mirror falls; she hits the floor; glitter bursts over the floor; she rises; it all rises
  T.push(tr(26.04, "cry_none", "stand_m", 0.6, 2.2, { dim: 0.9 }));
  T.push(tr(30.3, "stand_m", "touch_m", 0.1, 0.35, { dim: 0.95 }));
  T.push(tr(30.62, "touch_m", "touch_m_glass", 0, 0.01));
  T.push(tr(31.4, "touch_m_glass", "rise_m_glass", 0.4, 1.6, { dim: 0.95 }));
  T.push(tr(34.79, "rise_m_glass", "rise_f_glass", 0, 0.01));
  T.push(tr(35.0, "rise_f_glass", "rise_f_cloud", 1.6, 2.4, { turb: 0.4, dim: 0.8 }));
  T.push(tr(38.6, "rise_f_cloud", "Y_cloud", 0.3, 0.5, { dim: 0.9 }));
  // C1: "I multiply" — the glass flies to the walls on the beats; then she dances
  T.push(tr(43.1, "Y_cloud", "Y_walls", 1.2, 1.0, { q: 1, swirl: 0.5, turb: 0.6, dim: 0.7 }));
  const DW = ["d1w", "d2w", "d3w", "d4w"];
  let prev = "Y_walls";
  for (let k = 81; k < 89; k += 2) {
    const n = DW[((k - 81) / 2) % 4];
    T.push(tr(beat(k), prev, n, 0.03, 0.3, { dim: 1 }));
    prev = n;
  }
  T.push(tr(48.27, prev, "Y_walls", 0.03, 0.3, { dim: 1 }));
  T.push(tr(beat(91), "Y_walls", "d3w", 0.03, 0.3, { dim: 1 }));
  T.push(tr(beat(93), "d3w", "d4w", 0.03, 0.3, { dim: 1 }));
  T.push(tr(51.82, "d4w", "Y_walls", 0.03, 0.3, { dim: 1 }));
  T.push(tr(beat(97), "Y_walls", "d1w", 0.03, 0.3, { dim: 1 }));
  T.push(tr(beat(99), "d1w", "d2w", 0.03, 0.3, { dim: 1 }));
  T.push(tr(55.32, "d2w", "d8w", 0.03, 0.35, { dim: 1 }));
  T.push(tr(56.12, "d8w", "Y_walls", 0.03, 0.3, { dim: 1 }));
  // Drop 1: copies of her come out of the mirrors in a ring of 8, dance; on "I multiply" 16; back into the walls
  T.push(tr(bar(26), "Y_walls", "r8_d1", 1.6, 1.1, { q: 1, turb: 0.3, dim: 0.6 }));
  prev = "r8_d1";
  for (let k = 106; k < 120; k += 2) {
    const n = `r8_d${1 + (((k - 104) / 2) % 4)}`;
    T.push(tr(beat(k), prev, n, 0.04, 0.3, { dim: 1 }));
    prev = n;
  }
  T.push(tr(64.9, prev, "r16_d5", 0.8, 0.9, { turb: 0.2, dim: 0.75 }));
  prev = "r16_d5";
  for (let k = 122; k < 132; k += 2) {
    const n = `r16_d${5 + (((k - 120) / 2) % 4)}`;
    T.push(tr(beat(k), prev, n, 0.04, 0.3, { dim: 1 }));
    prev = n;
  }
  T.push(tr(beat(132), prev, "d8", 1.5, 1.4, { turb: 0.2, dim: 0.5 }));
  // V2: the memory — her mother behind her, her arms around her, her light flows into the two candles
  T.push(tr(74.43, "d8", "sitF_flameL", 0, 0.01));
  T.push(tr(74.76, "sitF_flameL", "sitF_mother", 1.6, 1.3, { turb: 0.25, dim: 0.75 }));
  T.push(tr(79.04, "sitF_mother", "sitF_hug", 0.4, 1.3, { dim: 1 }));
  T.push(tr(82.2, "sitF_hug", "sitF_flames", 0.8, 1.0, { dim: 0.8 }));
  T.push(tr(83.14, "sitF_flames", "standF", 0, 0.01));
  // "every room I walk in glows": eight steps towards the +z wall
  prev = "standF";
  for (let s = 0; s < 8; s++) {
    const n = s % 2 ? "walk2" : "walk1";
    T.push(tr(beat(154 + s), prev, n, 0.02, 0.5, { dim: 1, oa: [0, 0, 3.3 * s], ob: [0, 0, 3.3 * (s + 1)] }));
    prev = n;
  }
  T.push(tr(beat(162), prev, "standF", 0.02, 0.6, { dim: 1, oa: [0, 0, 26.4], ob: [0, 0, 28] }));
  // PC2: back at the centre; she hits the floor; puddles of light; her copies rise in rows
  T.push(tr(91.29, "standF", "standF", 0, 0.01));
  T.push(tr(95.6, "standF", "touchF_pud", 0, 0.01));
  T.push(tr(96.72, "touchF_pud", "rise_rows", 1.8, 1.1, { q: 1, dim: 0.45 }));
  // C2: the rows dance
  prev = "rise_rows";
  for (let k = 192; k < 217; k += 2) {
    const n = `rows_d${1 + (((k - 192) / 2) % 4)}`;
    T.push(tr(beat(k), prev, n, 0.04, 0.3, { dim: 1 }));
    prev = n;
  }
  // Drop 2: formations — a star, rings, the star again — every two bars, a move on every second beat
  const FORM: [number, string[]][] = [[217, ["star_d5", "star_d6"]], [225, ["rings_d7", "rings_d8"]], [233, ["star_d3", "star_d6"]], [241, ["rings_d4", "rings_d7"]], [249, ["star_d5", "star_d3"]]];
  for (const [k0, pair] of FORM) {
    T.push(tr(beat(k0), prev, pair[0], 0.5, 0.8, { turb: 0.15, dim: 0.75 }));
    prev = pair[0];
    for (let k = k0 + 2; k < k0 + 8; k += 2) {
      const n = pair[((k - k0) / 2) % 2];
      T.push(tr(beat(k), prev, n, 0.04, 0.3, { dim: 1 }));
      prev = n;
    }
  }
  // Bridge: alone in the dark, she holds out a piece; the faces stand in the dark holding pieces; they raise them
  T.push(tr(138.97, prev, "offer", 1.0, 1.2, { dim: 0.5 }));
  T.push(tr(143.33, "offer", "offer_crowd", 0, 0.01));
  T.push(tr(147.16, "offer_crowd", "drop_throw", 0.3, 1.2, { dim: 1 }));
  // the final chorus: their light flies into the walls; her copies come out of the mirrors; everyone dances
  T.push(tr(156.45, "drop_throw", "Y_wp2", 1.0, 0.9, { q: 1, turb: 0.4, dim: 0.65 }));
  T.push(tr(158.6, "Y_wp2", "rows_d1", 1.2, 1.0, { q: 1, dim: 0.6 }));
  prev = "rows_d1";
  for (let k = 296; k < 320; k += 2) {
    const n = `rows_d${1 + (((k - 292) / 2) % 4)}`;
    T.push(tr(beat(k), prev, n, 0.04, 0.3, { dim: 1 }));
    prev = n;
  }
  // Outro: the copies walk back into the mirrors; she dances slowly; then sits before the mended mirror
  T.push(tr(173.83, prev, "d7", 3.0, 1.6, { dim: 0.5 }));
  const SLOW = ["d8", "d7", "d4", "d8"];
  for (let i = 0; i < 4; i++) T.push(tr(182.96 + i * 2.17, i === 0 ? "d7" : SLOW[i - 1], SLOW[i], 0.2, 1.2, { dim: 1 }));
  T.push(tr(191.2, "d8", "sit_end", 0, 0.01));
  T.sort((x, y) => x.t0 - y.t0);
}
export const transitionAt = (t: number) => {
  let k = 0;
  for (let i = 0; i < TABLE.length; i++) if (t >= TABLE[i].t0) k = i;
  return TABLE[k];
};

// ───────────────────────── shots ─────────────────────────
type Shot = { a: number; b: number; cam: ReturnType<typeof cameraSpline>; aper: number; bmax?: number; focusHer?: boolean };
const K = (keys: CamKey[]) => keys;
const shot = (a: number, b: number, keys: CamKey[], aper = 8, shakes: [number, number][] = [], o: Partial<Shot> = {}): Shot => ({ a, b, cam: cameraSpline(K(keys), shakes), aper, focusHer: true, ...o });
const SHOTS: Shot[] = [
  shot(0, 4.35, [[0, 0.5, 0.06, 64, 0, -6, 0, 36], [4.4, 0.3, 0.1, 54, 0, -7, 0, 36]], 10, [], { focusHer: false }),
  shot(4.35, 8.67, [[4.35, 0.25, 0.16, 48, 0, -9, -10, 38], [8.7, 0.1, 0.12, 40, 0, -9, -10, 38]], 9),
  shot(8.67, 10.3, [[8.67, 0.95, -0.24, 42, 0, -9, 0, 36], [10.3, 0.85, -0.23, 38, 0, -9, 0, 36]], 8),
  shot(10.3, 12.4, [[10.3, 0.38, 0.05, 23, -12, -7.5, -18, 34], [12.4, 0.3, 0.06, 21, -12, -7.5, -18, 34]], 12, [], { focusHer: false }),
  shot(12.4, 17.0, [[12.4, 0.16, 0.12, 36, 0, -8, -20, 34], [17.0, 0.1, 0.12, 33, 0, -8, -20, 34]], 5, [], { focusHer: false }),
  shot(17.0, 21.2, [[17.0, 0.22, 0.12, 54, 0, -4, -14, 38], [21.2, 0.16, 0.13, 50, 0, -2, -14, 38]], 5),
  shot(21.2, 25.58, [[21.2, PI - 0.62, 0.06, 34, -1, -3, 0, 36], [25.58, PI - 0.55, 0.05, 28, -1, -6, 0, 36]], 8),
  shot(25.58, 29.95, [[25.58, 0.6, 0.08, 72, 0, -4, -10, 32], [29.95, 0.5, 0.07, 62, 0, -4, -10, 32]], 5),
  shot(29.95, 31.03, [[29.95, 0.78, 0.18, 64, 0, -14, -22, 36], [31.03, 0.72, 0.17, 60, 0, -14, -22, 36]], 4, [[30.64, 1.6]]),
  shot(31.03, 34.79, [[31.03, 0.3, 1.0, 60, 0, -18, -18, 40], [34.79, 0.42, 1.15, 66, 0, -18, -18, 40]], 3, [], { focusHer: false }),
  shot(34.79, 39.09, [[34.79, 0.0, 0.06, 58, 0, -2, 0, 36], [39.09, 1.0, 0.16, 46, 0, 0, 0, 36]], 7),
  shot(39.09, 41.78, [[39.09, -0.15, 0.06, 62, 0, 8, 0, 38], [41.78, 0.05, 0.06, 54, 0, 8, 0, 38]], 6, [[40.42, 0.9], [41.52, 0.9]]),
  shot(41.78, 44.0, [[41.78, PI, 0.02, 92, 0, 26, 60, 50], [44.0, PI + 0.08, 0.04, 86, 0, 28, 60, 52]], 3, [[43.26, 1.2]]),
  shot(44.0, 48.27, [[44.0, 0.6, 0.12, 70, 0, 4, 0, 40], [48.27, -0.2, 0.12, 70, 0, 6, 0, 40]], 6),
  shot(48.27, 52.63, [[48.27, 0.2, 0.05, 60, 0, 60, 0, 58], [52.63, 0.25, 0.08, 50, 0, 70, 0, 60]], 3, [[49.14, 0.8], [50.26, 0.8], [51.92, 1.2]], { focusHer: false }),
  shot(52.63, 56.44, [[52.63, 0.0, 0.22, 125, 0, 40, 0, 62], [56.44, 0.2, 0.2, 118, 0, 40, 0, 62]], 2, [[55.7, 0.6]]),
  shot(56.44, 60.8, [[56.44, -0.6, 0.62, 95, 0, -6, 0, 50], [60.8, 0.5, 0.55, 88, 0, -6, 0, 50]], 2),
  shot(60.8, 65.15, [[60.8, 1.0, 0.05, 42, 0, 6, 0, 44], [65.15, 2.2, 0.06, 42, 0, 6, 0, 44]], 9),
  shot(65.15, 69.5, [[65.15, 0.6, 1.46, 200, 0, -20, 0, 46], [69.5, -0.2, 1.46, 185, 0, -20, 0, 46]], 2, [], { focusHer: false }),
  shot(69.5, 74.43, [[69.5, -0.3, 0.1, 64, 0, 6, 0, 36], [74.43, 0.0, 0.1, 50, 0, 6, 0, 36]], 7),
  shot(74.43, 78.79, [[74.43, -0.42, 0.16, 52, -2, -2, -6, 34], [78.79, -0.36, 0.15, 46, -2, -2, -6, 34]], 6),
  shot(78.79, 83.14, [[78.79, -0.38, 0.06, 32, -1, 3, -6, 30], [83.14, -0.32, 0.06, 28, -1, 3, -6, 30]], 7),
  shot(83.14, 87.26, [[83.14, PI, 0.1, 34, 0, 2, 0, 40], [87.26, PI, 0.1, 34, 0, 2, 27, 40]], 6),
  shot(87.26, 91.29, [[87.26, PI + 0.05, 0.06, 50, 0, 38, 168, 40], [91.29, PI + 0.1, 0.08, 64, 0, 40, 168, 44]], 3, [], { focusHer: false }),
  shot(91.29, 95.0, [[91.29, 0.0, 0.12, 110, 0, 0, 0, 36], [95.0, 0.05, 0.12, 80, 0, 0, 0, 36]], 5),
  shot(95.0, 96.4, [[95.0, 0.42, 0.16, 54, 0, -6, -6, 38], [96.4, 0.47, 0.15, 48, 0, -6, -6, 38]], 4, [[95.88, 1.4]]),
  shot(96.4, 99.82, [[96.4, 0.0, 0.5, 125, 0, -10, -40, 44], [99.82, 0.05, 0.35, 118, 0, -10, -40, 44]], 3, [], { focusHer: false }),
  shot(99.82, 104.28, [[99.82, PI, 0.05, 128, 0, 4, 0, 40], [104.28, PI + 0.05, 0.07, 52, 0, 4, 0, 40]], 4),
  shot(104.28, 108.62, [[104.28, 0.1, 0.1, 118, 0, 6, -30, 40], [108.62, -0.05, 0.1, 110, 0, 6, -30, 40]], 3, [[105.58, 0.8], [106.66, 0.8]]),
  shot(108.62, 112.97, [[108.62, 0.58, 0.11, 104, 0, 6, -36, 42], [112.97, 0.36, 0.11, 98, 0, 6, -36, 42]], 2, [], { focusHer: false }),
  shot(112.97, 117.82, [[112.97, -0.2, 0.06, 44, 0, 12, 0, 38], [117.82, 0.15, 0.06, 38, 0, 12, 0, 38]], 3, [[114.22, 0.7], [115.34, 0.7]]),
  shot(117.82, 122.16, [[117.82, 0.0, 1.48, 190, 0, -20, 0, 50], [122.16, 0.4, 1.48, 190, 0, -20, 0, 50]], 2, [], { focusHer: false }),
  shot(122.16, 126.5, [[122.16, 1.2, 0.08, 95, 0, 2, 0, 44], [126.5, 2.1, 0.08, 95, 0, 2, 0, 44]], 4),
  shot(126.5, 130.83, [[126.5, 0.3, 0.1, 38, 0, 14, 0, 36], [130.83, 0.4, 0.1, 35, 0, 14, 0, 36]], 3),
  shot(130.83, 134.9, [[130.83, -0.3, 1.5, 160, 0, -20, 0, 50], [134.9, 0.3, 1.5, 200, 0, -20, 0, 50]], 2, [], { focusHer: false }),
  shot(134.9, 138.97, [[134.9, -0.2, 0.04, 120, 0, 50, 0, 60], [138.97, 0.2, 0.04, 120, 0, 50, 0, 60]], 2, [], { focusHer: false }),
  shot(138.97, 143.33, [[138.97, 0.0, 0.04, 38, 3, 11, 6, 34], [143.33, 0.05, 0.04, 33, 3, 11, 6, 34]], 7),
  shot(143.33, 147.16, [[143.33, PI, 0.1, 100, 0, 2, 0, 38], [147.16, PI + 0.08, 0.1, 84, 0, 2, 0, 38]], 2),
  shot(147.16, 150.99, [[147.16, 0.5, 0.1, 100, 0, 4, -20, 38], [150.99, 0.6, 0.1, 96, 0, 4, -20, 38]], 3),
  shot(150.99, 153.7, [[150.99, 0.15, 0.06, 40, 0, 8, 0, 40], [153.7, 0.1, 0.06, 36, 0, 8, 0, 40]], 7),
  shot(153.7, 156.45, [[153.7, -0.4, 0.12, 34, 0, 8, 0, 38], [156.45, 0.4, 0.12, 34, 0, 8, 0, 38]], 7),
  shot(156.45, 160.8, [[156.45, 0.0, 0.06, 125, 0, 40, 0, 60], [160.8, -0.2, 0.06, 122, 0, 40, 0, 60]], 2, [[157.44, 0.8], [158.54, 0.8]]),
  shot(160.8, 165.2, [[160.8, 0.5, 0.55, 150, 0, -10, -40, 50], [165.2, 0.1, 0.5, 140, 0, -10, -40, 50]], 1.5, [], { focusHer: false }),
  shot(165.2, 169.5, [[165.2, 0.1, 0.05, 40, 0, 14, 0, 40], [169.5, 0.1, 0.4, 118, 0, 110, 0, 60]], 1.5, [[166.08, 0.7], [167.22, 0.7]]),
  shot(169.5, 171.68, [[169.5, -0.3, 0.06, 90, 0, 20, 0, 50], [171.68, -0.2, 0.06, 84, 0, 20, 0, 50]], 3),
  shot(171.68, 173.83, [[171.68, -0.8, 0.3, 62, 0, 10, 0, 44], [173.83, 0.4, 0.25, 56, 0, 10, 0, 44]], 3),
  shot(173.83, 182.5, [[173.83, 0.0, 0.12, 118, 0, 10, -20, 42], [182.5, 0.6, 0.12, 100, 0, 10, -20, 42]], 3),
  shot(182.5, 191.2, [[182.5, 0.6, 0.1, 56, 0, 6, 0, 36], [191.2, 1.2, 0.1, 50, 0, 6, 0, 36]], 6),
  shot(191.2, 199.9, [[191.2, 0.2, 0.14, 60, 0, -8, -20, 32], [199.9, 0.15, 0.14, 50, 0, -8, -20, 32]], 4, [], { focusHer: false }),
  shot(199.9, 210.6, [[199.9, 0.2, 0.14, 46, 0, -8, -14, 34], [210.6, 0.22, 0.2, 70, 0, -8, -14, 34]], 5),
];
export const SHOT_STARTS_H = SHOTS.map((s) => s.a);
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];

// ───────────────────────── where the pieces set (32 targets) and when ─────────────────────────
export function wallTargets(): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const k of [4, 0, 1, 7, 2, 6, 3, 5]) {
    out.push(wallPoint(k, 0, 60, N_D - 1));
    out.push(wallPoint(k, (k % 2 ? -1 : 1) * 40, 118, 0).add(wallFrame(k).N.clone().multiplyScalar(0.5)));
  }
  for (let j = 0; j < 8; j++) {
    const a = ((j + 0.5) / 8) * PI * 2;
    out.push(new THREE.Vector3(Math.sin(a) * 144, G + 175, -Math.cos(a) * 144));
  }
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * PI * 2, th = 0.35 + (j % 2) * 0.35;
    out.push(new THREE.Vector3(Math.sin(th) * Math.sin(a) * DOME_R * 0.99, DOME_Y + Math.cos(th) * DOME_R * 0.99, -Math.sin(th) * Math.cos(a) * DOME_R * 0.99));
  }
  return out;
}
/** arrival beats of the pieces: the walls on the beats of "I multiply … Every piece of me", the dome on the
 *  second "I multiply" */
export const FLY_BEATS: number[] = [...Array.from({ length: 12 }, (_, i) => beat(79 + i * 0.75)), ...Array.from({ length: 4 }, (_, i) => beat(95.5 + i))];
export const SHARD_T = { tip: 29.95, impact: 30.64, lev: 35.0, fly: FLY_BEATS, flyDur: 0.75, ret: 191.4, retEnd: 199.0 };

// ───────────────────────── stones ─────────────────────────
export const STONE_HITS: { t: number; from: V3; at: V3 }[] = [
  { t: 40.42, from: [-110, 40, 80], at: [-4, 10, 6] },
  { t: 41.52, from: [120, 30, 60], at: [5, 6, 4] },
  { t: 49.14, from: [-100, 60, -60], at: [-6, 14, -2] },
  { t: 50.26, from: [110, 50, -40], at: [6, 12, -3] },
  { t: 105.58, from: [-120, 40, 90], at: [-4, 10, 6] },
  { t: 106.66, from: [120, 35, 80], at: [5, 8, 5] },
  { t: 114.22, from: [-110, 50, 60], at: [-5, 12, 4] },
  { t: 115.34, from: [115, 45, 70], at: [5, 10, 4] },
  { t: 157.44, from: [-120, 40, 90], at: [-4, 10, 6] },
  { t: 158.54, from: [120, 35, 80], at: [5, 8, 5] },
  { t: 166.08, from: [-110, 50, 60], at: [-5, 12, 4] },
  { t: 167.22, from: [115, 45, 70], at: [5, 10, 4] },
];

// ───────────────────────── the frame ─────────────────────────
export type HallFrame = {
  cam: CamState;
  bokehMax: number;
  tr: Tr;
  beatsWin: number[];
  sw: { pAmt: number; othK: number; herK: number; glassK: number; warmK: number; sizeK: number; arrGain: number; kick: number; beat: number; tPrevDt: number; scanY: number; scanAmt: number };
  lights: LightDef[];
  flames: { p: THREE.Vector3; size: number; seed: number; amt: number }[];
  dustLights: [number, number, number, number][];
  hall: { revealAll: number; glitK: number; glitD: number; roomK: number; mirK: number; amb: V3; envWarm: V3; hideT: number; hideSpeed: number; popK: number; miniK: number; swA: number; swK: number; swW: number; glintK: number; reflK: number };
  her: { c: THREE.Vector3; fwd: THREE.Vector3; half: [number, number]; amt: number } | null;
  mirror: { show: boolean; tilt: number | null; held: Map<number, { p: THREE.Vector3; q?: THREE.Quaternion; s?: number }> | null; crackK: number };
  stones: { p: THREE.Vector3; vis: boolean; spin: number }[];
  bursts: [number, V3, number, number, number, number, number][];
  core: { amt: number; size: number; p: V3; col: V3 };
  grade: { exposure: number; black: number; vig: number; ca: number; lift: number };
  bloom: number;
  glowK: number;
  dustAmt: number;
  stickAmt: number[];
};

export type DirCtx = { niches: THREE.Vector3[]; nicheN: THREE.Vector3[]; targets: THREE.Vector3[] };

const flick = (t: number, i: number) => 0.86 + 0.08 * Math.sin(t * 11.3 + i * 1.7) * Math.sin(t * 5.1 + i) + 0.06 * Math.sin(t * 23.1 + i * 3.3);
const pulse = (t: number, at: number, k: number, tau = 0.25) => (t >= at ? k * Math.exp(-(t - at) / tau) : 0);

/** the shot's camera at t, kept inside the hall */
function camAt(t: number) {
  const S = shotAt(t);
  const cf = S.cam(t);
  {
    const lim = 136;
    const hx = Math.hypot(cf.pos.x, cf.pos.z);
    if (hx > lim) {
      const dir = cf.pos.clone().sub(cf.look);
      const hl = Math.hypot(cf.look.x, cf.look.z);
      // shrink the distance to the look point until the camera is back inside
      let k0 = 0, k1 = 1;
      for (let i = 0; i < 20; i++) {
        const km = (k0 + k1) / 2;
        const p = cf.look.clone().addScaledVector(dir, km);
        if (Math.hypot(p.x, p.z) > lim) k1 = km;
        else k0 = km;
      }
      void hl;
      cf.pos.copy(cf.look).addScaledVector(dir, k0);
    }
  }
  return { S, cf };
}

/** her figure (and her mother's, in the memory) as a box on the 1920×1080 screen: [x0, y0, x1, y1], or null */
export function herBoxAt(t: number): [number, number, number, number] | null {
  const { cf } = camAt(t);
  const trn = transitionAt(t);
  const herOf = HER_OF[trn.b] ?? HER_OF[trn.a];
  if (!herOf) return null;
  const ob = new THREE.Vector3(...((trn.ob as V3) ?? [0, 0, 0]));
  const pts = herLightPts(herOf[0], herOf[1]).map((p) => new THREE.Vector3(...p).add(ob));
  const c = pts[1];
  const extra: THREE.Vector3[] = [];
  for (const dx of [-11, 11]) for (const dz of [-11, 11]) extra.push(new THREE.Vector3(c.x + dx, G, c.z + dz));
  extra.push(pts[0].clone().add(new THREE.Vector3(0, 6, 0)));
  if (t >= 74.43 && t < 83.14) for (const dx of [-14, 14]) for (const y of [G, G + 46]) extra.push(new THREE.Vector3(dx, y, -12));
  const cam = new THREE.PerspectiveCamera(cf.fov, 16 / 9, 0.5, 4000);
  cam.position.copy(cf.pos);
  cam.lookAt(cf.look);
  cam.updateMatrixWorld();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
  for (const p of [...pts, ...extra]) {
    const v = p.clone().project(cam);
    if (v.z > 1 || v.z < -1) continue;
    any = true;
    const x = ((v.x + 1) / 2) * 1920, y = ((1 - v.y) / 2) * 1080;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (!any) return null;
  const mx = (x1 - x0) * 0.08 + 24, my = (y1 - y0) * 0.05 + 16;
  return [x0 - mx, y0 - my, x1 + mx, y1 + my];
}

/** the whole state of the hall at film second t */
export function directH(t: number, ctx: DirCtx): HallFrame {
  const { S, cf } = camAt(t);
  const trn = transitionAt(t);
  const bp = beatPos(t);
  const k = kick(t, 0.1);
  // ── her (the target shape of the current morph; positions blend over the morph)
  const herOf = HER_OF[trn.b] ?? HER_OF[trn.a];
  const herA = HER_OF[trn.a] ?? herOf;
  const u = clamp((t - trn.t0) / Math.max(0.01, trn.D + trn.F));
  const ob = new THREE.Vector3(...((trn.ob as V3) ?? [0, 0, 0])), oa = new THREE.Vector3(...((trn.oa as V3) ?? [0, 0, 0]));
  let herPts: THREE.Vector3[] = [];
  if (herOf) {
    const pb = herLightPts(herOf[0], herOf[1]).map((p) => new THREE.Vector3(...p).add(ob));
    const pa = herA ? herLightPts(herA[0], herA[1]).map((p) => new THREE.Vector3(...p).add(oa)) : pb;
    herPts = pb.map((p, i) => pa[i].clone().lerp(p, u));
  }
  const herC = herPts[1] ?? new THREE.Vector3(0, 0, 0);
  // depth of field: focus on her chest (or on the shot's look point)
  const focus = S.focusHer && herPts.length ? cf.pos.distanceTo(herC) : cf.pos.distanceTo(cf.look);
  const cam: CamState = { pos: cf.pos, look: cf.look, fov: cf.fov, focus, aper: S.aper };

  // ── lights: candles
  const lights: LightDef[] = [];
  const flames: HallFrame["flames"] = [];
  const candle = (p: V3, amt: number, i: number, size = 1) => {
    if (amt <= 0.001) return;
    const f = flick(t, i) * amt;
    const pw = 260 * size * f;
    lights.push({ p: new THREE.Vector3(...p), dif: [pw, pw * 0.6, pw * 0.28], rad: [14 * f, 8.6 * f, 4.2 * f], r: 0.9 * size });
    flames.push({ p: new THREE.Vector3(...p), size, seed: i * 0.37, amt });
  };
  // the left candle: "one light on" (and through the whole film); the right one: "two candles"; out at the end
  const onL = sstep(t, 11.82, 12.1);
  const onR = sstep(t, 77.4, 77.75) * (1 - sstep(t, 201.5, 202.6));
  candle(FL_L, onL, 0);
  candle(FL_R, onR, 1);
  const stickAmt: number[] = [onL, onR];
  // the niche candles: lit as the mirror-work reaches them (chorus 1), low in the memory, lit as she walks, all out
  // in the bridge, all lit in the final chorus, out one by one in the outro
  ctx.niches.forEach((n, i) => {
    const fp: V3 = [n.x, n.y + FLAME_Y * 0.9, n.z];
    const tOn = 43.6 + ((i * 3) % 8) * 0.55;
    let a = sstep(t, tOn, tOn + 0.25);
    if (t > 74.0 && t < 83.4) a *= 0.35;
    if (t >= 83.4 && t < 91.3) a = Math.max(0.35, sstep(t, 84 + i * 0.4, 84.4 + i * 0.4));
    if (t >= 138.97 && t < 156.45) a *= 1 - sstep(t, 138.97 + i * 0.12, 139.6 + i * 0.12);
    if (t >= 156.45) a = sstep(t, 156.45 + i * 0.05, 156.7 + i * 0.05);
    if (t >= 178) a *= 1 - sstep(t, 180 + i * 2.2, 181 + i * 2.2);
    candle(fp, a, 2 + i, 0.9);
    stickAmt.push(a);
  });
  // her light: soft points along her body (brightness by section)
  let herL = 0.6;
  if (t < 8.7) herL = 0.2 + 0.4 * sstep(t, 2.5, 8);
  else if (t < 26) herL = 0.7;
  else if (t < 39) herL = 0.9;
  else if (t < 74.4) herL = 1.4 + 0.3 * k;
  else if (t < 91.3) herL = 0.8;
  else if (t < 139) herL = 1.3 + 0.3 * k;
  else if (t < 156.45) herL = 0.85;
  else if (t < 174) herL = 1.8 + 0.4 * k;
  else herL = 1.1 * (1 - sstep(t, 200, 210));
  // (while the shards return into the frame, her lights glint small in them: as wide discs they piled into a white blob)
  const herR = t >= 191.2 && t < 199.2 ? 0.05 : 4;
  for (const p of herPts) lights.push({ p, dif: [80 * herL, 98 * herL, 125 * herL], rad: [1.3 * herL, 1.55 * herL, 1.9 * herL], r: herR });
  // her mother's warm light (the memory)
  const momK = sstep(t, 75.0, 76.5) * (1 - sstep(t, 82.4, 83.4));
  if (momK > 0) for (const y of [-2, 8]) lights.push({ p: new THREE.Vector3(0, y, -12), dif: [120 * momK, 80 * momK, 40 * momK], rad: [2 * momK, 1.3 * momK, 0.6 * momK], r: 4 });
  // the copies: their light as a few soft points over the formation
  const copyK = (t > 56.44 && t < 74) || (t > 96.7 && t < 139) || (t > 158.6 && t < 180) ? 1 : 0;
  if (copyK) for (const a of [0, 1.57, 3.14, 4.71]) lights.push({ p: new THREE.Vector3(Math.sin(a) * 45, 0, Math.cos(a) * 45 - (t > 96 && t < 118 ? 40 : t > 158 ? 40 : 0)), dif: [140, 160, 200], rad: [0.6, 0.7, 0.9], r: 10 });
  // flashes where stones hit
  for (const s of STONE_HITS) {
    const f = pulse(t, s.t, 1, 0.3);
    if (f > 0.02) lights.push({ p: new THREE.Vector3(...s.at), dif: [500 * f, 520 * f, 600 * f], rad: [6 * f, 6 * f, 7 * f], r: 3 });
  }
  if (lights.length > 32) lights.length = 32;

  // ── the hall
  const revealAll = t < 56.44 ? 9999 : -1;
  let glitK = 0.15, mirK = 1, miniK = 0, swK = 0, swA = 0;
  let amb: V3 = [0.004, 0.005, 0.01];
  if (t >= 43.1 && t < 74.4) {
    glitK = 1.0;
    amb = [0.008, 0.009, 0.016];
  } else if (t >= 74.4 && t < 91.3) {
    glitK = 0.4 + 0.8 * sstep(t, 84, 88);
    amb = [0.009, 0.007, 0.005];
    mirK = 0.55 + 0.45 * sstep(t, 83.5, 87);
    miniK = sstep(t, 87.26, 88.0) * (1 - sstep(t, 90.9, 91.29));
  } else if (t >= 91.3 && t < 139) {
    glitK = 1.1;
    amb = [0.008, 0.009, 0.016];
  } else if (t >= 139 && t < 156.45) {
    glitK = 0.15;
    mirK = 0.12;
    amb = [0.002, 0.003, 0.006];
  } else if (t >= 156.45 && t < 174) {
    glitK = 1.6;
    amb = [0.012, 0.013, 0.02];
  } else if (t >= 174) {
    glitK = 1.0 * (1 - sstep(t, 185, 200)) + 0.1;
    amb = [0.006, 0.007, 0.012];
  }
  // "catch the light": a sweep around the hall; in drop 2 it chases on the eighths (the santur)
  for (const tc of [47.52, 112.66, 164.52]) if (t >= tc && t < tc + 1.2) {
    swK = 2.2 * Math.sin((PI * (t - tc)) / 1.2);
    swA = -PI + ((t - tc) / 1.2) * 2 * PI;
  }
  if (t >= 117.82 && t < 138.97) {
    const e8 = bp * 2;
    swK = 1.2 * Math.exp(-(e8 - Math.floor(e8)) * 2.5);
    swA = ((Math.floor(e8) * 2.399) % (2 * PI)) - PI;
  }
  const hall = { revealAll, glitK, glitD: 0.35, roomK: 0.55, mirK, amb, envWarm: [1.0, 0.78, 0.5] as V3, hideT: 184, hideSpeed: 17, popK: 1, miniK, swA, swK, swW: 0.32, glintK: 1, reflK: 0.75 };

  // ── the billboard of her for the mirror pieces
  const her = herPts.length ? { c: herC, fwd: cf.pos.clone().sub(herC).setY(0).normalize(), half: [36, 28] as [number, number], amt: t >= 191.2 && t < 199.2 ? 0 : 1 } : null;

  // ── the mirror: standing, falling, broken (its frame out of the way during the middle), standing again at the end
  const showMirror = t < 56.44 || t >= 191.2;
  let tilt: number | null = null;
  if (t >= 191.2) tilt = -0.07;
  let held: Map<number, { p: THREE.Vector3; q?: THREE.Quaternion; s?: number }> | null = null;
  if (t >= 143.33 && t < 157.0) {
    held = new Map();
    const hands = crowdHands(t < 147.16 ? "hold" : "throw", [0, 0], PI, 62);
    const thrown = (i: number) => 151.5 + (i % 2) * 2.2 + (i % 7) * 0.05;
    hands.forEach((h, i) => {
      const p = new THREE.Vector3(...h).add(new THREE.Vector3(0, Math.sin(t * 1.3 + i) * 0.3, 0));
      const tt = thrown(i);
      if (t >= tt) {
        // slow motion towards her; they stop around her and burst into light on the downbeat
        const v = sstep(t, tt, tt + 2.6);
        const a = (i / 14) * PI * 2;
        const dst = new THREE.Vector3(Math.sin(a) * 11, 10 + (i % 3) * 5, Math.cos(a) * 11);
        p.lerp(dst, v);
      }
      held!.set(i, { p, s: t < 156.45 ? 1 : 0 });
    });
  }
  const crackK = sstep(t, 26.0, 29.95);

  // ── stones
  const stones = STONE_HITS.map((s) => {
    const t0 = s.t - 0.55;
    const vis = t >= t0 && t < s.t;
    const v = clamp((t - t0) / 0.55);
    const p = new THREE.Vector3(...s.from).lerp(new THREE.Vector3(...s.at), v).add(new THREE.Vector3(0, 10 * Math.sin(PI * v), 0));
    return { p, vis, spin: t * 7 };
  });

  // ── bursts: [time, centre, speed, drag, curl, life, density]
  const latest = (list: [number, V3][]): [number, V3] => {
    let b: [number, V3] = [-99, [0, 0, 0]];
    for (const e of list) if (e[0] <= t + 1e-4) b = e;
    return b;
  };
  const sh = STONE_HITS.map((s): [number, V3] => [s.t, s.at]);
  const [tA, pA] = latest(sh.filter((_, i) => i % 2 === 0));
  const [tB, pB] = latest(sh.filter((_, i) => i % 2 === 1));
  const tg = ctx.targets;
  const landings = FLY_BEATS.map((tb, i): [number, V3] => [tb, [tg[i % tg.length].x, tg[i % tg.length].y, tg[i % tg.length].z]]);
  const [tL, pL] = latest(landings);
  const bursts: HallFrame["bursts"] = [
    [bar(1), [0, 0, 0], 14, 2.5, 0.6, 1.0, 0.3],
    [30.66, [0, G + 1, -30], 55, 2.4, 0.7, 1.1, 0.45],
    [tA, pA, 30, 3.6, 0.4, 0.5, 0.3],
    [tB, pB, 30, 3.6, 0.4, 0.5, 0.3],
    [tL, pL, 30, 3.2, 0.3, 0.7, 0.25],
    [t >= 156.45 ? 156.45 : 43.2, [0, 10, 0], 70, 2.2, 0.8, 1.1, 0.55],
  ];
  // ── core glow (the first point of light; stone hits; the final burst)
  let core = { amt: 0, size: 24, p: [0, 0, 0] as V3, col: [1, 0.98, 0.94] as V3 };
  if (t < 3) core = { amt: sstep(t, 0.1, 1.2) * 0.8 * (1 - sstep(t, bar(1) + 0.2, 2.9)) + pulse(t, bar(1), 0.4, 0.15), size: 18 + 8 * k, p: [0, 0, 0], col: [1, 0.98, 0.94] };
  for (const s of STONE_HITS) if (t >= s.t && t < s.t + 0.5) core = { amt: 0.45 * Math.exp(-(t - s.t) * 10), size: 11, p: s.at, col: [1, 0.97, 0.92] };
  if (t >= 156.45 && t < 157.5) core = { amt: 1.0 * Math.exp(-(t - 156.45) * 4.0), size: 26, p: [0, 10, 0], col: [1, 0.97, 0.9] };

  // ── swarm uniforms
  let othK = 1;
  if (t >= 30.62 && t < 31.0) othK = sstep(t, 30.62, 30.95);
  if (t >= 95.6 && t < 98.6) othK = 0.4 * sstep(t, 95.6, 95.95) + 0.6 * sstep(t, 97.0, 98.6);
  if (t >= 143.33 && t < 144.2) othK = sstep(t, 143.33, 144.1);
  if (t >= 82.9 && t < 83.14) othK = 1 - sstep(t, 82.9, 83.12);
  let glassK = 0.9;
  if (t >= 44 && t < 56.44) glassK = 0.45 + 0.3 * k;
  if (t >= 156.45 && t < 158.6) glassK = 0.6;
  const fade = sstep(t, 209.2, 210.4);
  const pAmt = (1 - fade) * (t < 0.1 ? t / 0.1 : 1);
  const scanAge = t - beat(Math.floor(bp / 4) * 4);
  const loud = (t >= 39.09 && t < 74.43) || (t >= 104.28 && t < 138.97) || (t >= 156.45 && t < 173.83);
  const scanAmt = loud && scanAge >= 0 && scanAge < 0.62 ? 1 - sstep(scanAge, 0.42, 0.62) : 0;
  const sw = {
    pAmt, othK, herK: 1, glassK, warmK: 1, sizeK: 1.25, arrGain: trn.b.startsWith("r") || trn.b.startsWith("rows") || trn.b.startsWith("star") ? 0.45 : 1.0,
    kick: k, beat: kick(t, 0.16), tPrevDt: trn.a === "touchF_pud" ? 0.012 : 0.035,
    scanY: G - 2 + 54 * sstep(scanAge, 0, 0.55), scanAmt: scanAmt * 0.8,
  };
  // the beats window around this morph (the builds land on beats)
  const kb = Math.max(0, Math.floor(beatPos(trn.t0)) - 2);
  const beatsWin = Array.from({ length: 24 }, (_, i) => beat(kb + i));

  // ── grade, bloom, glow
  const hitPulse = (x: number, a: number) => pulse(t, x, a, 0.4);
  let exposure = 1.0;
  if (t >= 74.4 && t < 91.3) exposure = 1.05;
  exposure += hitPulse(30.64, 0.25) + hitPulse(43.2, 0.2) + hitPulse(56.44, 0.15) + hitPulse(156.45, 0.35) + hitPulse(95.88, 0.15);
  const black = Math.max(1 - sstep(t, 0, 0.35), fade);
  const grade = { exposure, black, vig: 0.5, ca: 0.0012 + 0.0016 * k * (loud ? 1 : 0), lift: t >= 74.4 && t < 91.3 ? 0.03 : 0.02 };
  const bloom = 1.0 + (loud ? 0.25 * k : 0) + hitPulse(156.45, 0.5) + hitPulse(43.2, 0.3);
  // how big she is on screen (1 = her 40 units fill the frame's height)
  const herScr = herPts.length ? 40 / (cf.pos.distanceTo(herC) * 2 * Math.tan((cf.fov * PI) / 360)) : 0;
  const near = sstep(herScr, 0.6, 1.7);
  const glowK = (t < 8.7 ? 0.38 : 0.26) + 0.24 * near;
  const far = 1 - sstep(herScr, 0.22, 0.75);
  sw.herK = (1 - 0.16 * near) * (1 - 0.42 * far);
  sw.sizeK = 1.25 * (1 - 0.2 * far);
  const copiesOn = (t >= 56.44 && t < 74.43) || (t >= 96.72 && t < 139) || (t >= 158.6 && t < 182);
  if (copiesOn) sw.othK *= 1 - 0.4 * near;
  const dustLights: [number, number, number, number][] = lights.slice(0, 8).map((l) => [l.p.x, l.p.y, l.p.z, (l.dif[0] + l.dif[1] + l.dif[2]) * 0.01]);
  return {
    cam, bokehMax: 30, tr: trn, beatsWin, sw, lights, flames, dustLights, hall, her,
    mirror: { show: showMirror, tilt, held, crackK },
    stones, bursts, core, grade, bloom, glowK, dustAmt: 0.9 * (1 - fade), stickAmt,
  };
}
void APO;
void BEATS;
