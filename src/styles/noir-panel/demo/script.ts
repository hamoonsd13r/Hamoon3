// Noir Panel · demo script: a 9:16 reel «آینده‌ی کار» — five years → the machines 200 years ago → the monthly-pay life
// → thinking jobs now → old jobs went, new ones came → two kinds of people → start a skill today → follow.
// Silent demo: word times are estimated (estimateWords); with a voice use eleven-align → WORDS = normalizeWords(REAL).
import { estimateWords, makeTimeline } from "../lib/words";
import { makeChunks, type Shot } from "../lib/panel";

export const FPS = 30;
export const LINES = [
  "تا پنج سال دیگه، کار خیلی‌ها عوض می‌شه.",
  "دویست سال پیش، ماشین‌ها کار دست رو گرفتن.",
  "ما با یه قانون بزرگ شدیم: هر روز کار، آخر ماه حقوق.",
  "حالا نوبت کارهای فکریه: نوشتن، طراحی، حسابداری.",
  "ولی هر بار که شغلی رفت، شغل‌های تازه‌ای هم اومد.",
  "آدم‌ها دو دسته می‌شن: کسایی که منتظر می‌مونن، و کسایی که یاد می‌گیرن.",
  "از همین امروز یه مهارت تازه شروع کن.",
  "اگه به دردت خورد، دنبالمون کن.",
];
export const WORDS = estimateWords(LINES, { lead: 0.35, sentGap: 0.34, before: { 1: 0.15, 7: 0.25 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.6).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const K = {
  five: at(0, "پنج"),
  change: at(0, "عوض"),
  machines: at(1, "ماشین‌ها"),
  took: at(1, "گرفتن"),
  every: at(2, "هر"),
  month: at(2, "آخر"),
  pay: at(2, "حقوق"),
  write: at(3, "نوشتن"),
  design: at(3, "طراحی"),
  acc: at(3, "حسابداری"),
  went: at(4, "رفت"),
  fresh: at(4, "تازه‌ای"),
  waiters: at(5, "کسایی"),
  learners: at(5, "کسایی", 1),
  learn: at(5, "یاد"),
  skill: at(6, "مهارت"),
  freshSkill: at(6, "تازه"),
  follow: at(7, "دنبالمون"),
};

/** chapter tags (top right): [from, text] */
export const TAGS: [number, string][] = [
  [0, "آینده‌ی کار"],
  [S(1), "۲۰۰ سال پیش"],
  [S(2), "زندگی حقوقی"],
  [S(3), "کارهای فکری"],
  [S(4), "شغل‌های تازه"],
  [S(5), "دو دسته آدم"],
  [S(6), "از امروز"],
  [S(7) - 0.1, ""],
];
export const BRAND = "NOW & NEXT";

/** the footage track: one slot per phrase (your MEDIA map gives each slot a file) */
export const SHOTS: Shot[] = [
  { t0: 0, t1: S(1), slot: "city-rush", hint: "شهر شلوغ صبح، آدم‌ها با عجله سر کار می‌رن", fx: 0.5, fy: 0.4, z0: 1.0, z1: 1.09, punch: K.five },
  { t0: S(1), t1: K.machines, slot: "factory-exit", hint: "آرشیو: کارگرها از کارخونه بیرون میان (دهه‌ی ۱۸۹۰)", bw: true, fx: 0.7, fy: 0.55, z0: 1.02, z1: 1.1, label: "ARCHIVE · 1895" },
  { t0: K.machines, t1: S(2), slot: "assembly-line", hint: "آرشیو: خط تولید قدیمی (دهه‌ی ۱۹۱۰)", bw: true, fx: 0.55, fy: 0.45, z0: 1.1, z1: 1.02, label: "ARCHIVE · 1913" },
  { t0: S(2), t1: K.every, slot: "commute", hint: "صبح زود، مترو یا خیابون پر از آدمی که سر کار می‌ره", z0: 1.04, z1: 1.1 },
  { t0: K.every, t1: K.month, slot: "office-day", hint: "دفتر کار، آدم‌ها پشت میز", z0: 1.08, z1: 1.02 },
  { t0: K.month, t1: S(3), slot: "payday", hint: "شمردن اسکناس یا فیش حقوقی", z0: 1.0, z1: 1.08 },
  { t0: S(3), t1: K.write, slot: "ai-screen", hint: "صفحه‌ای که متنش خودبه‌خود نوشته می‌شه", z0: 1.0, z1: 1.08 },
  { t0: K.write, t1: K.design, slot: "typing", hint: "دست‌ها روی کیبورد", fx: 0.5, fy: 0.55, z0: 1.12, z1: 1.2 },
  { t0: K.design, t1: K.acc, slot: "designer", hint: "طراح پشت مانیتور با قلم نوری", z0: 1.1, z1: 1.18 },
  { t0: K.acc, t1: S(4), slot: "spreadsheet", hint: "جدول اعداد و ماشین‌حساب", z0: 1.12, z1: 1.22 },
  { t0: S(4), t1: S(5), slot: "old-jobs", hint: "آرشیو: تلفنچی‌ها یا تایپیست‌ها سر کار", bw: true, dim: 0.62, blur: 6, z0: 1.1, z1: 1.16 },
  { t0: S(6), t1: S(7) - 0.1, slot: "night-study", hint: "کسی که شب با لپ‌تاپ تمرین می‌کنه", dim: 0.66, blur: 8, z0: 1.08, z1: 1.14 },
];

export const CHUNKS = makeChunks(WORDS, { key: /پنج|دویست|ماشین|دست|حقوق|فکری|نوشتن|طراحی|حسابداری|تازه|منتظر|یاد|امروز|مهارت|دنبال/, glueBefore: ["سال"] });

/** Look frames (props { times }) */
export const LOOK = [0, K.five + 0.3, S(1) + 0.6, K.took + 0.5, K.every + 0.6, K.pay + 0.3, K.write + 0.3, K.acc + 0.3, K.went + 0.5, K.fresh + 0.6, K.waiters + 0.4, K.learn + 0.3, K.freshSkill + 0.4, E(6) + 0.1, K.follow + 0.5, DUR - 0.2].map((x) => +x.toFixed(3));
