// Market File · demo «چرا شکلات یهو این‌قدر گرون شد؟» — the narration (one line = one sentence), its word timing, the
// scene times and the footage plan. Everything in the film is timed from these words.
// With a real voice: align it (tools/eleven-align.mjs → words.json) and swap ESTIMATE for the import below.
//   import REAL from "./words.json"; const WORDS = normalizeWords(REAL as RawWord[]);
// Numbers in this demo are SAMPLE data (labelled on screen); check every number of your own film at its source.
import { estimateWords, makeTimeline } from "../lib/words";
import type { Shot } from "../lib/media";
import type { BrowItem } from "../lib/chrome";
import { GRADE } from "../lib/media";

export const LINES = [
  "چرا شکلات یهو این‌قدر گرون شد؟",
  "قیمت کاکائو، که ماده‌ی اصلی شکلاته، توی یک سال نزدیک سه برابر شد.",
  "حدود شصت درصد کاکائوی دنیا فقط از دو کشور میاد: ساحل عاج و غنا.",
  "یعنی از هر صد دونه کاکائو، شصت تاش از همین دو کشوره.",
  "و همون‌جا، پشت سر هم سه تا اتفاق افتاد.",
  "هوای خیلی گرم و خشک، یه بیماری که درخت‌ها رو خشک کرد، و درخت‌هایی که دیگه پیر شدن.",
  "حالا سؤال اصلی اینه: این گرونی کِی تموم می‌شه؟",
  "یه درخت تازه‌ی کاکائو سه تا پنج سال طول می‌کشه تا میوه بده.",
  "پس قیمت‌ها آروم‌آروم پایین میان، نه یک‌شبه.",
  "خلاصه اینکه شکلات گرون‌تر شده، ولی نه برای همیشه.",
  "تو هم گرونیش رو حس کردی؟ برامون کامنت بذار.",
];

export const WORDS = estimateWords(LINES);
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;

export const FPS = 30;
/** the end card holds this long after the last word */
export const END_HOLD = 2.9;
export const FRAMES = Math.round((TL.VOICE_END + END_HOLD) * FPS);
export const DUR = FRAMES / FPS;

// scene boundaries and beats — all from the words
export const SC = {
  hook: 0,
  price: S(1),
  priceDraw: at(1, "توی"),
  triple: at(1, "سه"),
  source: S(2),
  sixty: at(2, "شصت"),
  pct: at(2, "درصد"),
  map: at(2, "دو"),
  ci: at(2, "ساحل"),
  gh: at(2, "غنا"),
  dots: at(3, "هر"), // the map holds through «یعنی از…»
  dotsLit: at(3, "شصت"),
  three: S(4),
  threeHit: at(4, "سه"),
  causes: S(5),
  c1: at(5, "هوای"),
  c2: at(5, "بیماری"),
  c3: at(5, "درخت‌هایی"),
  question: S(6),
  flood: at(6, "این"),
  years: S(7),
  yearsHit: at(7, "سه"),
  fruit: at(7, "میوه"),
  curve: S(8),
  slow: at(8, "آروم‌آروم"),
  overnight: at(8, "یک‌شبه"),
  verdict: S(9),
  v1: at(9, "شکلات"),
  v1m: at(9, "شده"),
  v2: at(9, "ولی"),
  v2m: at(9, "همیشه"),
  end: S(10),
  comment: at(10, "کامنت"),
  voiceEnd: E(10),
};

/** the hits: a short camera shake + (where marked in the film) a glitch */
export const HITS = [at(0, "گرون"), SC.triple, SC.pct, SC.threeHit, SC.flood, SC.overnight, SC.end + 0.14];

/** the chapters for the eyebrow under the brand tile */
export const BROWS: BrowItem[] = [
  [0, "سؤال", "SCENE 01 · QUESTION"],
  [SC.price, "قیمت", "SCENE 02 · THE PRICE"],
  [SC.source, "ریشه", "SCENE 03 · THE SOURCE"],
  [SC.three, "سه اتفاق", "SCENE 04 · THE CAUSES"],
  [SC.question, "سؤالِ اصلی", "SCENE 05 · WHAT NEXT"],
  [SC.verdict, "جمع‌بندی", "SCENE 06 · VERDICT"],
];

/** the footage bed: one clip per phrase, cut on the words; `hint` = what to film / find for that slot */
export const SHOTS: Shot[] = [
  { a: 0, b: SC.price, slots: ["cocoa-macro"], hint: "ماکروی شکلات یا پودرِ کاکائو", dim: 0.12, push: 0.045 },
  { a: SC.price, b: SC.priceDraw - 0.1, slots: ["cocoa-pods"], hint: "غلاف‌های کاکائو روی درخت", dim: 0.3 },
  { a: SC.priceDraw - 0.1, b: SC.source, slots: ["market-screen", "cocoa-pods-2"], hint: "صفحه‌ی قیمت‌ها / تابلوی بازار", dim: 0.55, grade: GRADE.mapbg },
  { a: SC.source, b: SC.map - 0.1, slots: ["cocoa-beans"], hint: "دانه‌های کاکائو در دست", dim: 0.45, grade: GRADE.desat },
  { a: SC.map - 0.1, b: SC.dots, slots: [], none: true }, // the map on clean ink
  { a: SC.dots, b: SC.three, slots: ["sorting-beans"], hint: "جدا کردنِ دانه‌ها در مزرعه", dim: 0.55, grade: GRADE.desat },
  { a: SC.three, b: SC.c1, slots: ["farm-wide"], hint: "مزرعه‌ی کاکائو از بالا (۷۲۰p هم خوبه: پنلِ ۱۶:۹)", dim: 0.1, panel: true },
  { a: SC.c1, b: SC.c2, slots: ["dry-soil"], hint: "زمینِ خشکِ ترک‌خورده", dim: 0.35, grade: GRADE.mute },
  { a: SC.c2, b: SC.c3, slots: ["sick-leaves"], hint: "برگ و غلافِ بیمار", dim: 0.35, grade: GRADE.mute },
  { a: SC.c3, b: SC.question, slots: ["old-trees"], hint: "درخت‌های قدیمیِ مزرعه", dim: 0.35, grade: GRADE.mute },
  { a: SC.question, b: SC.years, slots: ["shopper"], hint: "خریدار جلوی قفسه‌ی شکلات", dim: 0.4 }, // under the flood: only its first second shows
  { a: SC.years, b: SC.curve, slots: ["seedling"], hint: "نهالِ کاکائو در دستِ کشاورز", dim: 0.45 },
  { a: SC.curve, b: SC.verdict, slots: ["store-shelf"], hint: "قفسه‌ی شکلات در فروشگاه", dim: 0.55, grade: GRADE.mapbg },
  { a: SC.verdict, b: SC.end + 0.4, slots: ["factory-line"], hint: "خطِ تولیدِ شکلات", dim: 0.5, grade: GRADE.cool },
];

/** frames for the Look composition (one per entry): cover, each beat, the end card */
export const LOOK = [
  0,
  SC.price + 0.6,
  SC.triple + 0.45,
  SC.pct + 0.35,
  SC.gh + 0.3,
  SC.dotsLit + 1.0,
  SC.threeHit + 0.4,
  SC.c3 + 0.5,
  at(6, "کِی") + 0.45,
  SC.fruit + 0.3,
  SC.overnight + 0.4,
  SC.v2m + 0.5,
  SC.comment + 0.3,
  DUR - 0.05,
].map((x) => Math.min(DUR - 1 / FPS, Math.max(0, +x.toFixed(3))));
