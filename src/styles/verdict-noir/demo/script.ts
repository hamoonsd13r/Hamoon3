// Verdict Noir · demo script: a 9:16 reel «وکیل و دستیار هوش مصنوعی» — a mountain of case files → the day's list →
// hours on one contract → an assistant reads it in seconds → flags the bad clauses and drafts the brief → but the
// decision and the signature stay with the lawyer → comment «وکیل».
// Silent demo: word times are estimated (estimateWords); with a voice use eleven-align → WORDS = normalizeWords(REAL).
import { estimateWords, makeTimeline } from "../lib/words";
import { makeCaps } from "../lib/kit";
import type { Bg } from "../lib/backdrop";
import { C } from "../lib/theme";

export const FPS = 30;
export const LINES = [
  "هر روز صبح، یه وکیل با یه کوه پرونده شروع می‌کنه.",
  "بررسی پرونده‌ها، تحقیق قوانین، تنظیم قرارداد، نوشتن لایحه.",
  "فقط خوندن یه قرارداد، ساعت‌ها وقتش رو می‌گیره.",
  "حالا یه دستیار هوش مصنوعی، همون قرارداد رو چند ثانیه‌ای می‌خونه.",
  "بندهای مشکل‌دار رو علامت می‌زنه و پیش‌نویس لایحه رو می‌نویسه.",
  "ولی تصمیم آخر و امضا، هنوز با خود وکیله.",
  "اگه وکیلی، کامنت کن «وکیل» تا ابزارها رو برات بفرستیم.",
];
export const WORDS = estimateWords(LINES, { lead: 0.35, sentGap: 0.36, before: { 5: 0.2 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.7).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const K = {
  morning: at(0, "صبح"),
  lawyer: at(0, "وکیل"),
  pile: at(0, "کوه"),
  start: at(0, "شروع"),
  t1: at(1, "بررسی"),
  t2: at(1, "تحقیق"),
  t3: at(1, "تنظیم"),
  t4: at(1, "نوشتن"),
  read: at(2, "خوندن"),
  hours: at(2, "ساعت‌ها"),
  ai: at(3, "دستیار"),
  same: at(3, "همون"),
  secs: at(3, "ثانیه‌ای"),
  reads: at(3, "می‌خونه"),
  flags: at(4, "مشکل‌دار"),
  mark: at(4, "علامت"),
  draft: at(4, "پیش‌نویس"),
  writes: at(4, "می‌نویسه"),
  final: at(5, "تصمیم"),
  sign: at(5, "امضا"),
  lawyer5: at(5, "وکیله"),
  ifLawyer: at(6, "وکیلی"),
  word: at(6, "وکیل"),
  send: at(6, "بفرستیم"),
};

/** scene windows (they overlap by the whip) */
export const SC = { hook: [0, S(1) + 0.15], todo: [S(1) - 0.1, S(2) + 0.15], hours: [S(2) - 0.1, S(3) + 0.15], secs: [S(3) - 0.1, S(4) + 0.15], flags: [S(4) - 0.1, S(5) + 0.15], sign: [S(5) - 0.1, S(6) + 0.15], cta: [S(6) - 0.1, 999] } as const;

/** the backdrop: one light and one giant word per section */
export const BGS: Bg[] = [
  { at: 0, word: "OBJECTION", k: 0.55 },
  { at: S(1), word: "EVIDENCE" },
  { at: S(2), word: "CONTRACT", k: 0.42 },
  { at: S(3), word: "SECONDS", k: 0.42 },
  { at: S(4), word: "EXHIBIT A", k: 0.45 },
  { at: S(5), word: "VERDICT", glow: C.redDeep, k: 0.6 },
  { at: S(6), word: "CASE CLOSED", k: 0.5 },
];

export const CAPS = makeCaps(WORDS, ["کوه", "پرونده", "ساعت‌ها", "ثانیه‌ای", "مشکل‌دار", "لایحه", "امضا", "وکیله", "«وکیل»"]);
/** captions step aside while a big word on screen already says the line */
export const CAP_HIDE: [number, number][] = [[K.hours - 0.05, E(2) + 0.2]];

/** Look frames (props { times }) */
export const LOOK = [0, K.pile + 0.3, K.start + 0.5, K.t2 + 0.4, K.t4 + 0.6, K.hours + 0.4, K.ai + 0.4, K.secs + 0.6, K.reads + 0.7, K.mark + 0.4, K.writes + 0.3, K.sign + 0.5, K.lawyer5 + 0.3, K.ifLawyer + 0.5, K.word + 0.4, DUR - 0.3].map((x) => +x.toFixed(3));
