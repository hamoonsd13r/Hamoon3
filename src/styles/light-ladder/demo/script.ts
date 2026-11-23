// Light Ladder · demo script: a 9:16 explainer «سه سطح هوش مصنوعی» — the hook question → three tiles A?I →
// level 1 (narrow) with the point on the first step and «we are here» → level 2 (general) in a head of light dots →
// level 3 (super) on an intelligence ruler → the two upper steps are still ghosts → a poll.
// Silent demo: word times are estimated (estimateWords); with a voice use eleven-align → WORDS = normalizeWords(REAL).
// TTS: keep ANI / AGI / ASI in Latin — the voice spells them letter by letter.
import { estimateWords, makeTimeline } from "../lib/words";
import { makeChunks } from "../lib/ui";

export const FPS = 30;
export const LINES = [
  "فکر می‌کنی دنیای هوش مصنوعی رو خوب می‌شناسی؟",
  "هوش مصنوعی سه تا سطح داره: ANI، AGI و ASI.",
  "سطح اول، هوش مصنوعی محدوده؛ فقط یه کار رو عالی انجام می‌ده.",
  "تقریباً همه‌ی ابزارهای امروز، توی همین سطح‌ان.",
  "سطح دوم، هوش عمومیه؛ مثل یه آدم فکر می‌کنه و یاد می‌گیره.",
  "سطح سوم، ابرهوشه؛ باهوش‌تر از همه‌ی آدم‌ها.",
  "و هنوز هیچ‌کدوم از این دو تا ساخته نشده.",
  "به نظرت کِی می‌رسیم؟ توی کامنت بنویس.",
];
export const WORDS = estimateWords(LINES, { lead: 0.35, sentGap: 0.36 });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.6).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const K = {
  know: at(0, "می‌شناسی"),
  levels: at(1, "سطح"),
  ani: at(1, "ANI"),
  agi: at(1, "AGI"),
  asi: at(1, "ASI"),
  first: at(2, "اول"),
  narrow: at(2, "محدوده"),
  one: at(2, "کار"),
  great: at(2, "عالی"),
  tools: at(3, "ابزارهای"),
  here: at(3, "همین"),
  second: at(4, "دوم"),
  general: at(4, "عمومیه"),
  think: at(4, "فکر"),
  learn: at(4, "یاد"),
  third: at(5, "سوم"),
  sup: at(5, "ابرهوشه"),
  smarter: at(5, "باهوش‌تر"),
  people: at(5, "آدم‌ها"),
  yet: at(6, "هنوز"),
  built: at(6, "ساخته"),
  when: at(7, "کِی"),
  write: at(7, "بنویس"),
};

/** scene windows (a little overlap; each scene fades itself) */
export const SC = {
  hook: [0, S(1) + 0.1],
  tiles: [S(1) - 0.1, S(2) + 0.1],
  ani: [S(2) - 0.1, S(4) + 0.1],
  agi: [S(4) - 0.1, S(5) + 0.1],
  asi: [S(5) - 0.1, S(6) + 0.1],
  ghost: [S(6) - 0.1, S(7) + 0.1],
  cta: [S(7) - 0.1, 999],
} as const;

/** the faint giant word behind each scene */
export const WORDS_BG: [number, string][] = [[0, "LEVELS"], [S(1), "A ? I"], [S(2), "NARROW"], [S(4), "GENERAL"], [S(5), "SUPER"], [S(6), "NOT YET"], [S(7), "WHEN?"]];

export const CHUNKS = makeChunks(WORDS);
/** captions step aside while the hook title says the line */
export const CAP_HIDE: [number, number][] = [[0, E(0) + 0.3]];

/** Look frames (props { times }) */
export const LOOK = [0, K.know, K.ani + 0.2, K.asi + 0.5, K.narrow + 0.5, K.great + 0.3, K.here + 0.5, K.general + 0.4, K.learn + 0.5, K.sup + 0.4, K.people + 0.4, K.yet + 0.4, K.built + 0.5, K.when + 0.3, K.write + 0.6, DUR - 0.2].map((x) => +x.toFixed(3));
void E;
