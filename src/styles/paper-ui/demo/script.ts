// Paper UI · demo script: a 9:16 product reel for a (made-up) salon booking app — problem (calls, no-shows) → the
// app (online booking, an SMS reminder, the month's numbers) → the call to action. Light paper look, one accent.
// Silent demo: word times are estimated (estimateWords); with a voice use eleven-align → WORDS = normalizeWords(REAL).
import { estimateWords, makeTimeline } from "../lib/words";
import { makeChunks } from "../lib/kit";

export const FPS = 30;
export const LINES = [
  "هنوز نوبت‌های سالنت رو با تلفن می‌گیری؟",
  "هر روز چندتا تماس بی‌جواب، و هر هفته چندتا مشتری که یادشون می‌ره بیان.",
  "با اپ نوبت، مشتری خودش آنلاین وقت می‌گیره.",
  "یه روز قبلش هم، خودش براش پیامک یادآوری می‌فرسته.",
  "آخر ماه می‌بینی چقدر از وقت‌های خالی پر شده.",
  "همین امروز شروعش کن؛ لینک توی بیو.",
];
export const WORDS = estimateWords(LINES, { lead: 0.3, sentGap: 0.36 });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.7).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const SC = { hook: [0, S(1)], problem: [S(1), S(2)], book: [S(2), S(3)], remind: [S(3), S(4)], month: [S(4), S(5)], cta: [S(5), 99] } as const;
export const K = {
  phone: at(0, "تلفن"),
  ask: at(0, "می‌گیری"),
  calls: at(1, "تماس"),
  missed: at(1, "بی‌جواب"),
  week: at(1, "هفته"),
  forget: at(1, "یادشون"),
  app: at(2, "اپ"),
  online: at(2, "آنلاین"),
  time: at(2, "وقت"),
  day: at(3, "روز"),
  self: at(3, "خودش"),
  sms: at(3, "پیامک"),
  month: at(4, "ماه"),
  full: at(4, "پر"),
  today: at(5, "امروز"),
  bio: at(5, "بیو"),
};
export const GHOSTS: [number, string][] = [[-9, "CALLS"], [S(1), "MISSED"], [S(2), "BOOK"], [S(3), "REMIND"], [S(4), "MONTH"], [S(5), "TODAY"]];
export const CHUNKS = makeChunks(WORDS, /تلفن|بی‌جواب|یادشون|آنلاین|پیامک|یادآوری|پر|امروز|بیو/);

/** Look frames (props { times }) */
export const LOOK = [0.3, K.phone + 0.4, K.missed + 0.4, K.forget + 0.6, K.online + 0.3, K.time + 0.6, K.sms + 0.5, E(3) + 0.2, K.full + 0.6, K.today + 0.4, K.bio + 0.4, DUR - 0.3].map((x) => +x.toFixed(3));
