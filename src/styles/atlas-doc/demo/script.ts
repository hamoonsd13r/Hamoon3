// Atlas Doc · demo «نیل؛ رودی که یک کشور را ساخت» — an excerpt of a long-form map documentary: the narration (one
// line = one sentence; numbers written as words, the way the voice reads them), its word timing, the chapter cards.
// With a real voice: align it (tools/eleven-align.mjs → words.json) and swap ESTIMATE for the import below.
//   import REAL from "./words.json"; export const WORDS = normalizeWords(REAL as RawWord[]);
import { estimateWords, makeTimeline } from "../lib/words";

export const LINES = [
  "از فضا که نگاه کنی، وسط صحرای بزرگ آفریقا یک خط سبز باریک می‌بینی.",
  "این خط، رود نیله؛ و تقریباً همه‌ی مردم مصر کنار همین خط زندگی می‌کنن.",
  "نیل از قلب آفریقا راه می‌افته و بیش از شش هزار کیلومتر جلو می‌ره تا به دریای مدیترانه برسه.",
  "هزاران سال، هر تابستون سیلاب نیل گل‌ولای حاصلخیز رو روی زمین‌های دو طرف رود پهن می‌کرد.",
  "کشاورزی مصر باستان به همین سیلاب بستگی داشت.",
  "تا اینکه در سال هزار و نهصد و هفتاد سد بلند اسوان تموم شد.",
  "پشت سد، یکی از بزرگ‌ترین دریاچه‌های مصنوعی دنیا درست شد: دریاچه‌ی ناصر.",
  "سیلاب‌ها مهار شدن، ولی گل‌ولایی که زمین‌ها رو حاصلخیز می‌کرد هم پشت سد موند.",
  "و امروز، بیش از صد میلیون نفر هنوز به آب همین رود وابسته‌ان.",
];

/** chapter cards sit in pauses of the narration: 2.6 s before line 3 and line 5 */
export const WORDS = estimateWords(LINES, { lead: 0.6, sentGap: 0.45, before: { 3: 2.6, 5: 2.6 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;

export const FPS = 30;
export const CARDS = [
  { a: E(2) + 0.15, b: S(3) - 0.05, n: 1, title: "سیلابی که زندگی می‌داد", en: "THE FLOOD" },
  { a: E(4) + 0.15, b: S(5) - 0.05, n: 2, title: "سد", en: "THE DAM" },
];
export const END = { a: E(8) + 0.9, b: E(8) + 5.2 };
export const FRAMES = Math.round((END.b + 0.6) * FPS);
export const DUR = FRAMES / FPS;

export const SC = {
  sahara: at(0, "صحرای"),
  line: at(0, "خط"),
  nile: at(1, "نیله"),
  egypt: at(1, "مصر"),
  whole: S(2),
  heart: at(2, "قلب"),
  km: at(2, "کیلومتر"),
  sea: at(2, "مدیترانه"),
  flood: S(3),
  floodW: at(3, "سیلاب"),
  farm: S(4),
  ancient: at(4, "مصر"),
  dam: S(5),
  year: at(5, "سال"),
  aswan: at(5, "اسوان"),
  lake: S(6),
  nasser: at(6, "ناصر"),
  tamed: S(7),
  but: at(7, "ولی"),
  silt: at(7, "گل‌ولایی"),
  today: S(8),
  hundred: at(8, "صد"),
};

/** frames for the Look composition */
export const LOOK = [0.3, SC.line + 0.6, SC.egypt + 0.8, SC.km + 0.6, CARDS[0].a + 1.2, SC.floodW + 0.6, SC.ancient + 0.5, SC.aswan + 0.7, SC.nasser + 0.6, SC.silt + 0.6, SC.hundred + 1.0, END.a + 2.5].map((x) => +x.toFixed(3));
