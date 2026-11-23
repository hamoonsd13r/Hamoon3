// Arcade Reel · demo script: a 9:16 reel about games made with one prompt — a racer (car, road, speedometer, its own
// sound), a space shooter (an enemy formation that explodes), the code wall, the comment CTA with a lock.
// Silent demo: word times are estimated (estimateWords); with a voice use eleven-align → WORDS = normalizeWords(REAL).
import { estimateWords, makeTimeline } from "../lib/words";

export const FPS = 30;
export const LINES = [
  "این بازی رو فقط با یه پرامپت ساختم.",
  "ماشین، جاده و حتی سرعت‌سنج، همه رو خودش کد زد.",
  "صداگذاری هم داره: موتور، ترمز، و تصادف.",
  "بازی دوم، یه شوتر فضاییه با دشمن‌هایی که حمله می‌کنن.",
  "کدش رو ببین: چند هزار خط، توی چند دقیقه.",
  "تو هم بازی خودت رو بساز؛ کامنت کن «بازی».",
];
export const WORDS = estimateWords(LINES, { lead: 0.3, sentGap: 0.34 });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.6).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const K = {
  prompt: at(0, "پرامپت"),
  car: at(1, "ماشین"),
  road: at(1, "جاده"),
  speedo: at(1, "سرعت‌سنج"),
  code1: at(1, "کد"),
  sound: at(2, "صداگذاری"),
  engine: at(2, "موتور"),
  brake: at(2, "ترمز"),
  crash: at(2, "تصادف"),
  second: at(3, "دوم"),
  shooter: at(3, "شوتر"),
  enemies: at(3, "دشمن‌هایی"),
  attack: at(3, "حمله"),
  code: at(4, "کدش"),
  lines: at(4, "خط"),
  minutes: at(4, "دقیقه"),
  build: at(5, "بساز"),
  comment: at(5, "کامنت"),
  word: at(5, "بازی", 1),
};
export const SC = { racer: [0, S(3)], shooter: [S(3), 999], code: [S(4) - 0.1, S(5)], cta: [S(5) - 0.1, 999] } as const;

/** captions in short phrases: [sentence, first word, last word] */
export const CHUNKS: [number, number, number][] = [
  [0, 0, 3], [0, 4, 7],
  [1, 0, 1], [1, 2, 4], [1, 5, 9],
  [2, 0, 2], [2, 3, 6],
  [3, 0, 1], [3, 2, 4], [3, 5, 9],
  [4, 0, 2], [4, 3, 5], [4, 6, 8],
  [5, 0, 5], [5, 6, 8],
];
/** the hook title says line 0 */
export const CAP_HIDE: [number, number][] = [[0, E(0) + 0.3]];

/** Look frames (props { times }) */
export const LOOK = [0, K.prompt + 0.3, K.car + 0.4, K.road + 0.4, K.speedo + 0.5, K.engine + 0.2, K.crash + 0.15, K.second + 0.4, K.enemies + 0.5, K.attack + 0.6, K.code + 0.5, K.minutes + 0.3, K.build + 0.3, K.comment + 0.4, K.word + 0.6, DUR - 0.2].map((x) => +x.toFixed(3));
