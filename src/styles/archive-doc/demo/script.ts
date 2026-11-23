// Archive Doc · demo «اولین پرواز» (17 Dec 1903) — an excerpt of a long-form archival documentary: the narration
// (one line = one sentence; numbers in words, as the voice reads them), its word timing, the picture track (archival
// clips / photos / scenes cut on the words), the type on top (title, chapters, captions, names), the end card.
// Facts: Library of Congress / Smithsonian records of the Wright Flyer (12 s, 120 ft; 4 flights; 852 ft in 59 s;
// 12 hp engine with an aluminium block; 12.3 m span; ~274 kg empty; overturned by a gust that day).
// With a real voice: align it (tools/eleven-align.mjs → words.json) and use normalizeWords(REAL) instead.
import { estimateWords, makeTimeline } from "../lib/words";
import type { Shot } from "../lib/picture";

export const LINES = [
  "هفدهم دسامبر هزار و نهصد و سه، روی تپه‌های شنی کیتی هاک، باد سرد زمستونی می‌وزید.",
  "دو برادر دوچرخه‌ساز، اورویل و ویلبر رایت، یک ماشین چوبی و پارچه‌ای رو روی یک ریل گذاشتن.",
  "ساعت ده و سی و پنج دقیقه‌ی صبح، اورویل روی بال پایینی دراز کشید.",
  "پرواز فقط دوازده ثانیه طول کشید و سی و هفت متر جلو رفت.",
  "موتورش رو خودشون ساخته بودن: دوازده اسب بخار، با بدنه‌ی آلومینیومی.",
  "بال‌هاش دوازده متر پهنا داشت و کل هواپیما حدود دویست و هفتاد کیلو بود.",
  "اون روز چهار بار پرواز کردن و هر بار بیشتر از قبل.",
  "پرواز آخر، با ویلبر، پنجاه و نه ثانیه طول کشید و دویست و شصت متر رفت.",
  "چند دقیقه بعد، یک تندباد هواپیما رو برگردوند و دیگه هیچ‌وقت پرواز نکرد.",
];

/** the title card sits after line 1, chapter cards before lines 4 and 6 (pauses in the narration) */
export const WORDS = estimateWords(LINES, { lead: 0.6, sentGap: 0.45, before: { 2: 3.4, 4: 2.8, 6: 2.8 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;

export const FPS = 30;
export const END_A = E(8) + 1.0;
export const DUR = END_A + 6;
export const FRAMES = Math.round(DUR * FPS);

/** the picture: one shot per phrase; `scene` = a full-frame drawing (report sketch, spec sheet) */
export const SHOTS: Shot[] = [
  { at: 0, clip: "dunes", hint: "تپه‌های شنی و باد (فیلم آرشیوی یا امروزی سیاه‌وسفید)", z0: 1.0, z1: 1.08 },
  { at: S(1), img: "brothers", hint: "عکس دو برادر (کتابخانه‌ی کنگره، حوزه‌ی عمومی)", fit: "contain", z0: 1.0, z1: 1.06, mix: 0.6 },
  { at: at(1, "ماشین"), img: "flyer-rail", hint: "هواپیما روی ریل چوبی", z0: 1.04, z1: 1.12, fx: 0.55 },
  { at: S(2) - 3.1, clip: "sky-sea", hint: "آسمان و ساحل، آرام (زیر عنوان فیلم)", z0: 1.0, z1: 1.05, mix: 1.0 },
  { at: S(2), img: "first-flight", hint: "عکس معروف اولین پرواز، ۱۰:۳۵ صبح", z0: 1.02, z1: 1.1, fx: 0.42, fy: 0.45, mix: 0.6 },
  { at: S(3) + 0.3, scene: "report1" },
  { at: E(3) + 0.15, scene: "dark", mix: 0.35 },
  { at: S(4) - 0.1, scene: "spec", mix: 0.45 },
  { at: E(5) + 0.15, scene: "dark", mix: 0.35 },
  { at: S(6) - 0.1, scene: "report2", mix: 0.45 },
  { at: S(8), img: "wreck", hint: "هواپیمای آسیب‌دیده روی شن", z0: 1.03, z1: 1.1, mix: 0.4 },
];

export type TypeItem = { kind: "cap" | "name" | "chapter" | "title"; a: number; b: number; s: string; s2?: string };
export const TYPE: TypeItem[] = [
  { kind: "cap", a: at(0, "تپه‌های") - 0.2, b: E(0) + 0.3, s: "کیل دویل هیلز · کارولینای شمالی", s2: "۱۷ دسامبر ۱۹۰۳" },
  { kind: "name", a: at(1, "اورویل") - 0.1, b: E(1) - 0.2, s: "اورویل و ویلبر رایت", s2: "دوچرخه‌ساز · دیتون، اوهایو" },
  { kind: "title", a: E(1) + 0.3, b: S(2) - 0.2, s: "اولین پرواز", s2: "روزی که ماشینِ سنگین‌تر از هوا بلند شد" },
  { kind: "cap", a: S(2) + 0.2, b: E(2) + 0.2, s: "ساعت ۱۰:۳۵ صبح", s2: "پرواز اول · اورویل" },
  { kind: "chapter", a: E(3) + 0.35, b: S(4) - 0.1, s: "ماشین", s2: "۱" },
  { kind: "chapter", a: E(5) + 0.35, b: S(6) - 0.1, s: "چهار پرواز", s2: "۲" },
  { kind: "cap", a: S(8) + 0.2, b: E(8) + 0.4, s: "همان روز · حدود ظهر", s2: "پایانِ هواپیمای ۱۹۰۳" },
];

export const SC = {
  sec12: at(3, "دوازده"),
  m37: at(3, "سی"),
  engine: S(4),
  wing: S(5),
  weight: at(5, "دویست"),
  four: at(6, "چهار"),
  last: S(7),
  m260: at(7, "دویست"),
};

/** frames for the Look composition */
export const LOOK = [0.5, at(1, "اورویل") + 0.8, E(1) + 1.6, S(2) + 1.0, SC.m37 + 0.6, SC.engine + 1.0, SC.weight + 0.6, S(6) + 0.6, SC.four + 1.2, SC.m260 + 0.8, S(8) + 1.0, END_A + 2.5].map((x) => +x.toFixed(3));
