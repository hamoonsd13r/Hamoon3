// Sea world cast as lit flat cards (base/cards.ts rules): the cook (chef's toque, apron, red neckerchief), our captain (navy
// bicorne, blue coat, gold buttons), the crew, the pirates (captain in a plumed tricorne and a striped red coat, the
// bandana pirate, the parrot pirate with glasses, the black-cap pirate) and their dog. Cards stand in a ship's (or the
// galley's) space, so they ride the deck. Reactions land 2 frames before their word; blinks every 0.5-2.3 s.
import * as THREE from "three";
import { Pen, bodyFront, headOnCard, INK, SKINS, fxContact, potLip, Outfit, FrontOpts } from "../base/toon";
import type { CamInfo } from "../base/cards";
import type { SStage, StageCtx, Space, V3 } from "./world";
import { deckY, wIn, wAt, railY } from "./ship";
import { dogFront, DogOpts } from "./creatures";
import { fxOilSplash, fxSpray, fxBurst, fxPlank } from "./props";

const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : d < 40 ? [240, 400, 0.4] : [150, 250, 0.25];
let SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
export const setSun = (c: CamInfo) => { if (c.sun) SUN = c.sun.clone().normalize(); };
/** canvas angle the sun comes FROM on an upright card, in 45-degree steps */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const LID = [0.5, 1, 1, 0.5];
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** eyelid at time t for character i: random blinks every 0.5-2.3 s, plus one across each expression swap in `swaps` */
export const lidAt = (t: number, i: number, swaps: number[] = [], fps = 30) => {
  const f = Math.round(t * fps);
  for (const ts of swaps) { const k = f - Math.round(ts * fps) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- outfits (our own crews) ----------------
export const COOK: Outfit = { jacket: "#f3f1ec", pants: "#3b3f52", boots: "#3a2a20", hat: "chef", apron: "#fffaf0", scarf: "#c8463a", skin: SKINS[0], buttons: "#c9ccd2" };
export const CAPTAIN: Outfit = { jacket: "#2a4079", pants: "#efe9dc", boots: INK, hat: "bicorne", hatCol: "#22305a", cockade: "#c8463a",
  buttons: "#e8c45a", moustache: "#4a3020", build: "stout", skin: SKINS[1], belt: null };
export const SAILORS: Outfit[] = [
  { jacket: "#e8e2d2", pants: "#2f4a6a", boots: "#3a2a20", hat: "bandana", cap: "#c8463a", skin: SKINS[2] },
  { jacket: "#3f6f8a", pants: "#3b3f52", boots: "#3a2a20", hat: "cap", cap: "#2f3c52", skin: SKINS[3], build: "stout" },
  { jacket: "#e3b23c", pants: "#3b3f52", boots: "#3a2a20", hat: "cap", cap: "#d9a42f", skin: SKINS[1] }, // yellow oilskin
];
export const PIRATE_CAPTAIN: Outfit = { jacket: "#a3242f", pants: "#2a2430", boots: INK, hat: "tricorne", hatCol: "#2a1f2a", plume: "#f4efe6",
  buttons: "#e0b23a", stripes: "#e0b23a", moustache: "#2a201a", build: "stout", skin: SKINS[2] };
export const PIRATES: Outfit[] = [
  { jacket: "#e07a2e", pants: "#2a2430", boots: INK, hat: "bandana", cap: "#2f5f9a", skin: SKINS[1] },                       // bandana pirate
  { jacket: "#6a4a32", pants: "#2a2430", boots: INK, hat: "tricorne", hatCol: "#3a2a20", skin: SKINS[0], glasses: true, parrot: "#4fae5a" }, // parrot pirate
  { jacket: "#2e2a30", pants: "#5a3a2a", boots: INK, hat: "cap", cap: "#151313", skin: SKINS[3], moustache: "#2a201a" },       // black-cap pirate
];

export type Who = { i: number; o: Outfit; okey: string };
export const WHO = {
  cook: { i: 2, o: COOK, okey: "cook" }, captain: { i: 3, o: CAPTAIN, okey: "captain" },
  s0: { i: 4, o: SAILORS[0], okey: "s0" }, s1: { i: 5, o: SAILORS[1], okey: "s1" }, s2: { i: 6, o: SAILORS[2], okey: "s2" },
  pcap: { i: 8, o: PIRATE_CAPTAIN, okey: "pcap" }, p0: { i: 9, o: PIRATES[0], okey: "p0" }, p1: { i: 10, o: PIRATES[1], okey: "p1" }, p2: { i: 11, o: PIRATES[2], okey: "p2" },
} satisfies Record<string, Who>;

/** a front card for `who` standing at (x, y, z) in `space`; returns its index in out.places and the final options */
export const put = (c: StageCtx, out: SStage, who: Who, space: Space, x: number, y: number, z: number, fo: FrontOpts, o: { scale?: number; mirror?: boolean; roll?: number } = {}) => {
  const scale = o.scale ?? 1, at = c.toW(space, [x, y + 1.2 * scale, z]);
  const [w, h, k] = tier(c.pos.distanceTo(at) / scale);
  const light = light2D(c, !!o.mirror), seed = seedOf(who.i), f2: FrontOpts = { ...fo, light, seed };
  out.places.push({ key: `F|${who.okey}|${fkey(f2)}`, x, y, z, scale, mirror: o.mirror, roll: o.roll, space, draw: (p: Pen) => bodyFront(p, who.o, f2), size: [w, h, k],
    face: headOnCard(who.o, seed, fo.mode), label: who.okey });
  return { i: out.places.length - 1, f2 };
};
/** the dog, sitting at (x, y, z) */
export const putDog = (c: StageCtx, out: SStage, space: Space, x: number, y: number, z: number, d: DogOpts, scale = 1) => {
  const at = c.toW(space, [x, y + 0.5 * scale, z]);
  const [w, h, k] = tier(c.pos.distanceTo(at) / scale), light = light2D(c, false), d2 = { ...d, light };
  out.places.push({ key: `D|${fkey(d2)}`, x, y, z, scale, space, draw: (p: Pen) => dogFront(p, d2), size: [w, h, k] });
};
/** soft contact shadow under a card */
export const contact = (out: SStage, space: Space, x: number, y: number, z: number, sc = 1) => {
  const cc = "#3a4a5a";
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.02, z, w: 0.55 * sc, h: 0.42 * sc, flat: true, space });
};

/** the cook pouring at a rail of our ship (port side). x along the ship; the crate lifts him so the pot clears the rail */
export const cookPour = (c: StageCtx, out: SStage, o: { x?: number; tilt?: number; expr?: FrontOpts["expr"]; look?: number; amt?: number; crate?: number; lashed?: -1 | 0 | 1; splash?: boolean }) => {
  const x = o.x ?? 0.35, dy = deckY(x), y = dy + (o.crate ?? 0.36), z = -(wIn(x, dy + 0.9) - 0.12);
  const fo: FrontOpts = { mode: "stand", expr: o.expr ?? "neutral", prop: ["pot", o.tilt ?? 0.78], look: o.look ?? -0.35, blink: lidAt(c.t, 2), facing: -1, lashed: o.lashed };
  const { i, f2 } = put(c, out, WHO.cook, "ours", x, y, z, fo);
  // the cap rail (ship.ts boxTube, 0.3 wide, 0.12 tall) spans z = -(wAt - 0.23) .. -(wAt + 0.07) on the port side
  const wr = wAt(x, railY(x)), capTop = railY(x) + 0.12;
  out.pour = { place: i, lip: potLip(COOK, f2), out: [0, 0, -1], amt: o.amt ?? 1, plane: -(wr + 0.12), edge: [-(wr - 0.23), capTop], splash: o.splash };
};

/** a 2D effect card in `space` */
export const fxAt = (out: SStage, space: Space, key: string, draw: (p: Pen) => void, cw: number, ch: number, x: number, y: number, z: number, w: number, h: number, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, soft, space });
/** the oil's splash where the stream meets the sea (animated, ~0.5 s loop) */
export const splashFx = (t: number) => {
  const k = q((t * 2.1) % 1, 12);
  return { key: `oilsplash|${k}`, draw: (p: Pen) => fxOilSplash(p, k) };
};
/** a puff of white spray (crash) */
export const sprayFx = (seed: number, k = 1) => ({ key: `spray|${seed}|${q(k, 20)}`, draw: (p: Pen) => fxSpray(p, seed, k) });
/** the crash's water burst (k quantised to 16 steps) and a flung plank (angle in 24 steps) */
export const burstFx = (seed: number, k = 1) => { const kq = Math.round(k * 16) / 16; return { key: `burst|${seed}|${kq}`, draw: (p: Pen) => fxBurst(p, seed, kq) }; };
export const plankFx = (ang: number) => { const a = Math.round(((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 12)) * (Math.PI / 12); return { key: `plank|${a.toFixed(3)}`, draw: (p: Pen) => fxPlank(p, a) }; };
export type { V3 };
