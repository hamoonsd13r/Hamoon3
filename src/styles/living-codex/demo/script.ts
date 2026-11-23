// Living Codex · demo script (Persian narration, horizontal documentary): written history → older stone «writing» →
// the Holocene calendar odometer → chapter card. Silent demo: word times are estimated (estimateWords); with a voice,
// align it (eleven-align) and use `normalizeWords(REAL)` — every cue below follows the words.
import { estimateWords, makeTimeline } from "../lib/words";

export const FPS = 24;
export const LINES = [
  "تاریخ نوشته‌شده‌ی ما فقط حدود پنج هزار سال عمر داره.",
  "یکی نشسته و اسم شاه‌ها، جنگ‌ها، آدم‌ها و تاریخ‌ها رو نوشته.",
  "ولی آدم‌ها خیلی قبل‌تر از نوشتن، روی سنگ حرف می‌زدن.",
  "روباه، گراز، مار و کرکس؛ حدود یازده هزار سال پیش.",
  "تقویم دوران هولوسن از همون حدود شروع می‌شه؛ با این حساب، امسال سال دوازده هزار و بیست‌وششه.",
  "و ما تازه داریم صفحه‌ی اولش رو می‌خونیم.",
];
export const WORDS = estimateWords(LINES, { lead: 0.4, sentGap: 0.5, before: { 2: 0.4, 4: 0.4, 5: 0.5 } });
export const TL = makeTimeline(WORDS);
const { at, E } = TL;
export const DUR = +(TL.VOICE_END + 2.6).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

/** scene boundaries (film seconds) */
export const SC = {
  codex: 0,
  stone: TL.S(2) - 0.1,
  year: TL.S(4) - 0.15,
  plate: TL.S(5) - 0.1,
};
export const K = {
  written: at(0, "نوشته‌شده‌ی"),
  kings: at(1, "شاه‌ها"),
  wars: at(1, "جنگ‌ها"),
  people: at(1, "آدم‌ها"),
  dates: at(1, "تاریخ‌ها"),
  stone: at(2, "سنگ"),
  fox: at(3, "روباه"),
  boar: at(3, "گراز"),
  snake: at(3, "مار"),
  vulture: at(3, "کرکس"),
  twelve: at(4, "دوازده"),
};

/** Look frames (props { times }) */
export const LOOK = [
  0, K.written + 0.6, K.kings + 0.4, K.dates + 0.4, E(1) + 0.4, K.stone + 0.3, K.fox + 0.3, K.snake + 0.3, K.vulture + 0.9,
  K.twelve - 0.4, K.twelve + 0.15, K.twelve + 1.2, SC.plate + 0.3, SC.plate + 1.4, DUR - 0.6, DUR - 0.05,
].map((x) => +x.toFixed(3));
