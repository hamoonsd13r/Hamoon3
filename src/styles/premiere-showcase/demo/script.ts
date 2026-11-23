// Premiere Showcase · demo script: a 9:16 story «۱۹ فیلم» with music only (no voice). A trailer opening (a barrage
// of cuts, the giant «19» with the films inside it, the genres as windows, a 3D rush under «فقط ببینید»), the montage
// of all 19 films on the beat, the hexagon wall with their total running time and the message, and the end card
// with the films playing inside the words. Every time sits on the beat grid (theme.GRID: 120 BPM from 0.5 s).
import type { Film } from "../lib/film";
import { makeShots, type Tr } from "../lib/montage";
import { beat } from "../lib/theme";

export const FPS = 30;
export const DUR = 34.7;
export const FRAMES = Math.round(DUR * FPS);

// the films (the demo's are code scenes; yours: `src: "vNN/clips/f01.mp4"`, `from`, the real w/h/dur)
const P = (id: string, dur: number, label: string, kind: number, hue: number, w = 1080, h = 1920): Film => ({ id, w, h, dur, label, kind, hue });
export const FILMS: Record<string, Film> = Object.fromEntries(
  [
    P("01", 49.8, "اکسپلینر انیمیشنی", 0, 18),
    P("02", 45.8, "تبلیغ محصول", 5, 280),
    P("03", 66.5, "داستان کوتاه", 4, 210),
    P("04", 61.8, "تبلیغ انیمیشنی", 2, 12),
    P("05", 69.6, "کمدی انیمیشنی", 7, 30, 1920, 1080),
    P("06", 25, "ویدیوی انگیزشی", 0, 340),
    P("07", 107.2, "آموزش هوش مصنوعی", 3, 230, 1012, 1080),
    P("08", 35.6, "موشن‌گرافیک", 5, 190),
    P("09", 56.1, "مستند هنری", 6, 40),
    P("10", 497.3, "مستند تاریخی", 7, 20, 1280, 720),
    P("11", 120, "مستند کوتاه", 1, 220),
    P("12", 66.6, "مستند معمایی", 3, 260),
    P("13", 120, "موزیک‌ویدیوی سه‌بعدی", 5, 320, 1280, 720),
    P("14", 31, "انیمیشن مینیمال", 2, 175),
    P("15", 30, "موزیک‌ویدیو", 1, 300, 1280, 720),
    P("16", 31.5, "کلیپ روز مادر", 6, 120),
    P("17", 66.5, "تبلیغ ورزشی", 2, 200),
    P("18", 25, "انیمیشن انگیزشی", 0, 30),
    P("19", 92.4, "اکسپلینر علمی", 3, 200),
  ].map((f) => [f.id, f]),
);

// ── the opening ────────────────────────────────────────────────────────────────────────────────────────────────
export const BARRAGE = ["13", "05", "11", "17", "09"]; // five 0.2 s cuts before the first hit
export const FILL19 = ["09", "13", "02", "11", "17", "04", "19"].map((id, i) => ({ film: FILMS[id], t0: beat(1) + i * 0.5, t1: beat(1) + (i + 1) * 0.5 }));
export const DIVE = beat(5) - 0.24; // the camera dives into the «1»
export const WINDOWS = [
  { word: "مستند", film: "09", t0: beat(5) },
  { word: "انیمیشن", film: "01", t0: beat(6) },
  { word: "تبلیغ", film: "04", t0: beat(7) },
  { word: "موزیک‌ویدیو", film: "13", t0: beat(8) },
];
export const RUSH = [beat(9), beat(11)]; // two waves of film cards flying past the lens
export const JUST = beat(10), WATCH = beat(11), OP_END = beat(13);

// ── the montage: slow and elegant to the drop (beat 33), then one film per beat; the last one becomes the wall's
//    centre tile (portrait) ──────────────────────────────────────────────────────────────────────────────────────
const CUTS: [string, number, Tr][] = [
  ["09", 13, "land"], ["12", 17, "slam"], ["16", 20, "strip"], ["02", 23, "whip"], ["13", 25, "zoom"], ["15", 28, "pushL"],
  ["10", 30, "dip"], ["04", 33, "drop"], ["17", 34, "cut"], ["01", 35, "pushL"], ["11", 36, "glitch"], ["19", 37, "cut"],
  ["14", 38, "pushR"], ["07", 39, "punch"], ["06", 40, "cut"], ["05", 41, "glitch"], ["18", 42, "pushL"], ["08", 43, "cut"], ["03", 44, "punch"],
];
export const WALL_T = beat(45);
export const SHOTS = makeShots(CUTS.map(([f, b, tr]) => [f, beat(b), tr] as [string, number, Tr]), WALL_T);

// ── the wall (hexagon 3-4-5-4-3; bright and dark films alternate; the last montage film in the heart) ───────────
export const ROWS = [
  ["15", "04", "12"],
  ["19", "10", "09", "02"],
  ["08", "16", "03", "13", "07"],
  ["17", "14", "18", "05"],
  ["01", "11", "06"],
];
export const T_END = beat(60); // the final hit → the end card
export const WALL_TIMES = { wallT: WALL_T, pullEnd: beat(47), sum0: beat(48) + 0.08, sum1: beat(50), msg: beat(52), end: T_END };
export const HITS = [{ t: beat(1), a: 12 }, { t: beat(17), a: 10 }, { t: beat(33), a: 14 }, { t: beat(54), a: 9 }, { t: beat(56) + 0.02, a: 11 }, { t: beat(58), a: 6 }, { t: T_END + 0.02, a: 14 }, { t: beat(62), a: 6 }];

/** Look frames (props { times }) */
export const LOOK = [0.3, beat(1) + 0.3, beat(3), beat(5) + 0.25, beat(7) + 0.25, beat(10) + 0.3, beat(11) + 0.35, beat(15), beat(26), beat(36) + 0.2, beat(46) + 0.2, beat(50) + 0.3, beat(54) + 0.4, beat(58) + 0.4, T_END + 0.6, DUR - 0.3].map((x) => +x.toFixed(3));
