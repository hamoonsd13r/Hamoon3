// Light Swarm Epic · the demo score: one clock for everything — the song grid, every light morph, the words, the
// lower thirds, the prompt, the chapters, the finale. Times are video seconds. DB(k) = bar k of the grid, DBt(i) = beat i.
// Your film: replace grid.json with your song's grid (node tools/beat-map.mjs song.mp3 grid.json) and rewrite the lists.
import type { LogoPts } from "../../light-logo/lib/shapes";
import { setTotal } from "../lib/theme";
import GRID from "./grid.json";
import YOUR_LOGO from "./logo-pts.json";

/** beat-map onsets land ~30 ms before the audible attack, so the whole grid shifts by OFF */
const OFF = 0.03;
const beats = GRID.beats.map((b) => b + OFF);
const bars = GRID.bars.map((b) => b + OFF);
export const DB = (k: number) => bars[k];
export const DBt = (i: number) => beats[i];

/** the finale: the countdown leaves the top, takes the centre and slams the last ten seconds; END = zero */
export const FINALE = DB(22);
export const END = DB(29);
export const TAIL = 2.4; // «WE'RE LIVE» after zero
export const DUR = END + TAIL;
setTotal(END); // the countdown on top runs from END down to 00:00

export const BEATS = beats.filter((b) => b > 0.3);
export const KICKS = GRID.kicks.map((b) => b + OFF);
export const SNARES = GRID.snares.map((b) => b + OFF);
export const EIGHTHS = BEATS.flatMap((b, i) => (i + 1 < BEATS.length && BEATS[i + 1] - b < 1.2 ? [b, (b + BEATS[i + 1]) / 2] : [b]));
/** the 64 eighths the shader needs for a build starting at t0 */
export const beatWindow = (t0: number) => {
  let i = 0;
  while (i < EIGHTHS.length && EIGHTHS[i] < t0 - 0.4) i++;
  return EIGHTHS.slice(i, i + 64);
};

/** the logo the swarm builds (logo-pts.json from tools/logo-trace.mjs: your PNG → points) */
export const LOGO = YOUR_LOGO as unknown as LogoPts;

// ─────────────── morphs: the swarm's journey. kind: build (beat-quantised), snap (all at once, quick), burst (explosion), drift
export type Kind = "build" | "snap" | "burst" | "drift";
export type Morph = { t: number; to: string; kind: Kind; D?: number; F?: number; ly?: number; d?: number; az?: number; el?: number };
const M = (t: number, to: string, kind: Kind = "build", o: Partial<Morph> = {}): Morph => ({ t, to, kind, ...o });
export const MORPHS: Morph[] = [
  // CH.01 · training (the opening: its camera is hand-keyed in Video.tsx up to DB(5))
  M(0.5, "seed", "build", { D: 2.0, F: 0.42 }),
  M(DB(1) - 0.01, "galaxy", "burst"),
  M(DBt(7) - 0.01, "network", "build", { D: 0.83, F: 0.4 }),
  M(6.1, "chip", "snap", { F: 0.6 }),
  M(DB(4) - 0.01, "brain", "burst", { F: 0.75, ly: -14 }),
  // CH.02 · creative power: it writes · paints · codes · composes · films · imagines
  M(DB(5) - 0.01, "page", "burst", { F: 0.7, ly: -8 }),
  M(DB(6), "paint", "build", { D: 1.5, ly: -8 }),
  M(DB(8), "code", "snap", { ly: -8 }),
  M(DB(9), "notes", "build", { D: 1.0, ly: -8 }),
  M(DB(10), "aperture", "snap", { ly: -8 }),
  M(DB(11), "sparkle", "snap", { ly: -14 }),
  // CH.03 · creation: a prompt is typed, then the light builds it
  M(DB(12) - 0.01, "galaxy", "burst"),
  M(DB(14), "lighthouse", "build", { D: 1.2 }),
  // CH.04 · your turn: a word, then the logo (its accent streaks in, the second line spreads, light sweeps across)
  M(DB(16), "wLIVE", "build", { D: 1.0, ly: 4 }),
  M(DB(18), "logo", "build", { D: 1.0 }),
  // CH.05 · liftoff: the rocket builds under the countdown, the last burst on zero
  M(FINALE, "rocket", "build", { D: 2.4, ly: 12, d: 125 }),
  M(END, "galaxy", "burst", { F: 0.8 }),
];

/** camera framing for each shape: distance, look height, elevation, flat (faces the camera) */
export const FRAME: Record<string, { d: number; y?: number; el?: number; flat?: boolean }> = {
  cloud: { d: 300 }, seed: { d: 46 }, galaxy: { d: 175, el: 0.75 }, network: { d: 100 }, brain: { d: 92 }, embers: { d: 120 }, core: { d: 88 },
  chip: { d: 76, flat: true }, aperture: { d: 96, flat: true }, play: { d: 96, flat: true }, sparkle: { d: 150, flat: true }, vortex: { d: 110 },
  logo: { d: 100, flat: true }, tree: { d: 100, y: 10 }, diamond: { d: 72 }, phoenix: { d: 112 }, crown: { d: 72 }, globe: { d: 96 },
  web: { d: 108 }, wave: { d: 128, flat: true }, page: { d: 98, flat: true }, code: { d: 98, flat: true }, paint: { d: 112, flat: true },
  notes: { d: 108, flat: true }, eye: { d: 98, flat: true }, chess: { d: 82, el: 0.42 }, goboard: { d: 92, el: 0.6 }, rocket: { d: 112 },
  planet: { d: 100 }, phone: { d: 104, flat: true }, heart: { d: 98, flat: true }, lighthouse: { d: 108, y: 4 }, skyline: { d: 122, y: 6 },
  crowd: { d: 112, el: 0.32 }, tv: { d: 98, flat: true }, wAI: { d: 84, flat: true }, wYOU: { d: 84, flat: true }, wVIRAL: { d: 84, flat: true }, wLIVE: { d: 84, flat: true },
};

// ─────────────── hits: glitch + a kick of the frame; big ones also flash the core and shake harder
export const HITS = MORPHS.filter((m) => m.kind === "burst").map((m) => m.t + 0.01);
export const BIG = [DB(1), DB(4), DB(5), DB(12), END];
/** the chorus: more energy in the swarm and the nebula */
export const CLIMAX: [number, number][] = [[DB(5), DB(12)]];
/** quiet stretches: the nebula dims, no lens punch */
export const QUIET: [number, number][] = [];

// ─────────────── words (one at a time, never over a lower third)
export type Slam = { s: string; t0: number; t1: number; size?: number; y?: number; exit?: "whip" | "cut" | "fade"; calm?: boolean };
const W = (s: string, t0: number, t1: number, o: Partial<Slam> = {}): Slam => ({ s, t0, t1, ...o });
export const WORDS: Slam[] = [
  W("CAN", DBt(2), DBt(3), { size: 150, y: 820 }),
  W("A MACHINE", DBt(3), DBt(4), { size: 150, y: 820 }),
  W("LEARN?", DBt(4), DB(1), { size: 170, y: 820, exit: "cut" }),
  W("70 YEARS", DB(4), DB(5) - 0.05, { size: 200, y: 830 }),
  W("IT WRITES.", DB(5), DB(6) - 0.05, { size: 170, y: 880 }),
  W("IT PAINTS.", DB(6), DB(8) - 0.05, { size: 170, y: 880 }),
  W("IT CODES.", DB(8), DB(9) - 0.05, { size: 170, y: 880 }),
  W("IT COMPOSES.", DB(9), DB(10) - 0.05, { size: 170, y: 880 }),
  W("IT FILMS.", DB(10), DB(11) - 0.05, { size: 170, y: 880 }),
  W("IT IMAGINES.", DB(11), DB(12) - 0.05, { size: 170, y: 880 }),
  W("YOUR TURN.", DB(16), DB(18) - 0.05, { size: 170, y: 880 }),
];
/** the small line under «70 YEARS» */
export const UNDER = { t0: DBt(19), t1: DB(5) - 0.05 };

/** documentary lower thirds: a year (or a number) and one line */
export type Card = { t0: number; t1: number; big: string; small: string };
export const CARDS: Card[] = [{ t0: DB(1) + 0.05, t1: DB(2) - 0.32, big: "1956", small: "DARTMOUTH · THE BIRTH OF AI" }];

// ─────────────── footage (optional). kind: full (full frame) or window (a word cut out of the film).
// The files live in public/styles/light-swarm-epic/clips/<n>.mp4, e.g. { n: "a1", t0: DB(2), t1: DB(3), from: 1.2, kind: "window", word: "1960s", cap: "ARCHIVE FILM · 1960s" }
export type Shot = { n: string; t0: number; t1: number; from: number; kind?: "full" | "window"; word?: string; cap: string; fade?: number };
export const SHOTS: Shot[] = [];

/** a prompt typed into a bar, sent on `enter`; the light builds the answer on the next morph */
export type Prompt = { t0: number; t1: number; text: string; enter: number };
export const PROMPTS: Prompt[] = [{ t0: DB(12) + 0.3, t1: DB(14) + 0.4, text: "a lighthouse in a storm", enter: DB(14) - 0.15 }];

/** a views counter climbing between keys [time, views], shown inside the VIEWS_ON windows */
export const VIEWS: [number, number][] = [[0, 0]];
export const VIEWS_ON: [number, number][] = [];

/** a retro terminal: lines typed one after another between t0 and t1 (off in the demo) */
export const TERM = { t0: -10, t1: -9, lines: [] as string[] };

export const CHAPTERS: [number, string, string][] = [
  [0, "CH.01", "TRAINING"],
  [DB(5), "CH.02", "CREATIVE POWER"],
  [DB(12), "CH.03", "CREATION"],
  [DB(16), "CH.04", "YOUR TURN"],
  [FINALE, "CH.05", "LIFTOFF"],
];
