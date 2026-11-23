// Explore Wall · demo script: a 9:16 results reel «۵۰ ریلز، ۴۲ میلیون بازدید» — the camera flies an endless wall of
// reel covers with their view counts, dives into one reel (its insights screen as proof, the number ringed and
// lifted), shows a page's follower jump (username blurred), pulls back to the whole wall with the total, and ends on
// an empty slot «the next reel is yours» + the comment call. Silent demo: word times are estimated (estimateWords).
import { estimateWords, makeTimeline } from "../lib/words";
import type { Cap } from "../lib/kit";
import type { Tile } from "../lib/wall";

export const FPS = 30;
export const LINES = [
  "این دیوار، پنجاه تا ریلزه که یه تیم کوچیک توی یک سال ساخت.",
  "بیشترشون فقط با یه گوشی و یه ایده‌ی ساده ساخته شدن.",
  "این یکی، یک میلیون و دویست هزار بار دیده شد.",
  "و این پیج، از هزار به هجده هزار دنبال‌کننده رسید.",
  "جمع همه‌شون؟ چهل و دو میلیون بازدید.",
  "ریلز بعدی مال توئه؛ کلمه‌ی «دیوار» رو کامنت کن.",
];
export const WORDS = estimateWords(LINES, { lead: 0.25, sentGap: 0.36, before: { 2: 0.2, 4: 0.25 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.6).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const SC = {
  fifty: at(0, "پنجاه"),
  phone: at(1, "گوشی"),
  idea: at(1, "ایده‌ی"),
  dive: S(2),
  million: at(2, "میلیون"),
  twoHundred: at(2, "دویست"),
  seen: at(2, "دیده"),
  page: S(3),
  from: at(3, "هزار"),
  to: at(3, "هجده"),
  total: S(4),
  fortyTwo: at(4, "چهل"),
  cta: S(5),
  word: at(5, "دیوار"),
  comment: at(5, "کامنت"),
};

/** the 50 reels: views on a power curve that sums to 42 M, titles cycled, colours and shapes varied */
const TITLES = ["پشت صحنه‌ی یه روز کاری", "سه ترفند ساده", "قبل و بعد", "چرا این‌طوری شد؟", "آشپزی ۶۰ ثانیه‌ای", "سفر با بودجه‌ی کم", "تست یه ایده‌ی عجیب", "یه روز در شهر", "اشتباهی که همه می‌کنن", "ساختن از صفر"];
const raw = Array.from({ length: 50 }, (_, i) => Math.pow(i + 1, -1.05));
const sum = raw.reduce((a, b) => a + b, 0);
export const TOTAL = 42_000_000;
export const TILES: Tile[] = raw.map((r, i) => ({ views: Math.round((r / sum) * TOTAL / 1000) * 1000, title: TITLES[i % TITLES.length], hue: (i * 47 + 12) % 360, kind: (i * 3) % 5 }));
/** the wall: 10 × 5, biggest at the right (RTL reading), one reel per cell */
export const COLS = 10, ROWS = 5;
export const posOf = (i: number) => ({ c: COLS - 1 - Math.floor(i / ROWS), r: i % ROWS });
export const tileAt = (c: number, r: number): Tile => TILES[(COLS - 1 - c) * ROWS + r];
/** the reel the camera dives into (its views are said: exactly 1.2 M) and the cell that becomes the empty slot */
export const HERO = { c: 8, r: 2 };
export const SLOT = { c: 4, r: 2 };
const hi = (COLS - 1 - HERO.c) * ROWS + HERO.r;
TILES[hi] = { views: 1_200_000, title: "پشت صحنه‌ی یه روز کاری", hue: 14, kind: 0 };
// the wall's total is said too (42 M): the biggest reel absorbs the rounding
TILES[0].views += TOTAL - TILES.reduce((a, b) => a + b.views, 0);

export const CAPS: Cap[] = LINES.map((text, i) => ({ a: S(i), b: (i + 1 < LINES.length ? S(i + 1) : TL.VOICE_END + 0.7) - 0.06, text: text.replace(/[«»]/g, ""), key: [["پنجاه"], ["گوشی", "ایده‌ی"], ["میلیون", "دویست"], ["هجده"], ["چهل", "دو", "میلیون"], ["دیوار"]][i] }));

/** Look frames (props { times }) */
export const LOOK = [0.3, SC.fifty + 0.4, SC.idea + 0.4, SC.dive + 0.8, SC.seen + 0.5, SC.from + 0.4, SC.to + 0.8, SC.total + 0.5, SC.fortyTwo + 0.9, SC.word, SC.comment + 0.5, DUR - 0.3].map((x) => +x.toFixed(3));
void E;
