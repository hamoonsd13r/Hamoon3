// Screen Showcase · demo script: a 9:16 reel «با یه پرامپت، یه سایت کامل ساختم» — the finished site first, then the
// prompt typing, the agent's steps, the code writing itself, a camera tour of the page with labelled frames, a live
// edit (the buttons change colour), one click to publish. Silent demo: word times are estimated (estimateWords).
import { estimateWords, makeTimeline } from "../lib/words";
import { makeChunks } from "../lib/subtitle";
import type { Key, Mark } from "../lib/cam";
import { SITE, SITE_H, SITE_W } from "./site";

export const FPS = 30;
export const LINES = [
  "با یه پرامپت، یه سایت کامل ساختم؛ ببین چطوری.",
  "اول فقط نوشتم چی می‌خوام: یه سایت برای یه استودیوی عکاسی، ساده و گرم.",
  "هوش مصنوعی قدم‌به‌قدم ساختش؛ اول ساختار، بعد استایل.",
  "و کد رو جلوی چشمم نوشت.",
  "نتیجه این شد: یه صفحه‌ی کامل با منو، نمونه‌کارها و نظر مشتری‌ها.",
  "گفتم دکمه‌ها رو نارنجی کن؛ همون لحظه عوض شد.",
  "یه کلیک، و سایت روی اینترنته.",
];
// the pause before line 5 lets the page tour breathe (each part held about a second)
export const WORDS = estimateWords(LINES, { lead: 0.3, sentGap: 0.34, before: { 5: 2.0 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.5).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const PROMPT = "یه سایت برای یه استودیوی عکاسی می‌خوام؛ ساده و گرم، با نمونه‌کارها و نظر مشتری‌ها.";
export const EDIT = "دکمه‌ها رو نارنجی کن";

/** scenes (hard cuts on the first word of a line) and their tags */
export const SC = {
  hook: { t0: 0, t1: S(1), tag: "نتیجه", status: "ready · 02:40" },
  prompt: { t0: S(1), t1: S(2), tag: "درخواست", status: "typing…" },
  run: { t0: S(2), t1: S(3), tag: "ساختن", status: "running · 3 steps" },
  code: { t0: S(3), t1: S(4), tag: "کد", status: "writing index.html" },
  tour: { t0: S(4), t1: S(5), tag: "پیش‌نمایش", status: "preview" },
  edit: { t0: S(5), t1: S(6), tag: "اصلاح", status: "editing styles.css" },
  publish: { t0: S(6), t1: DUR + 1, tag: "انتشار", status: "deployed" },
};
export type SceneId = keyof typeof SC;
export const sceneAt = (t: number): SceneId => (Object.keys(SC) as SceneId[]).find((k) => t >= SC[k].t0 && t < SC[k].t1) ?? "publish";

/** the beats */
export const K = {
  how: at(0, "ببین"),
  typeA: at(1, "یه") - 0.1,
  typeB: E(1) + 0.2,
  step1: S(2) + 0.35,
  structure: at(2, "ساختار"),
  style: at(2, "استایل"),
  codeEnd: E(3) + 0.15,
  whole: at(4, "کامل"),
  menu: at(4, "منو"),
  gallery: at(4, "نمونه‌کارها"),
  reviews: at(4, "نظر"),
  editType: at(5, "دکمه‌ها") - 0.1,
  swap: at(5, "همون"),
  click: at(6, "کلیک"),
  live: at(6, "اینترنته"),
};

/** the camera over the site (source px): [time, x, y, width]; the box is 1000 × 750 (aspect 0.75) */
const fitW = (b: { x: number; y: number; w: number; h: number }, pad = 60): [number, number, number] => {
  const w = Math.max(b.w + 2 * pad, (b.h + 2 * pad) / 0.75);
  const cl = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  // keep the view inside the page (no black above the nav or beside the page)
  return [cl(b.x + b.w / 2 - w / 2, 0, SITE_W - w), cl(b.y + b.h / 2 - (w * 0.75) / 2, 0, SITE_H - w * 0.75), w];
};
export const HOOK_KEYS: Key[] = [[0, 0, 0, 1368], [S(1), 0, 70, 1368]];
const menu = fitW(SITE.menu, 40), gal = fitW(SITE.gallery, 30), rev = fitW(SITE.reviews, 40), hero: [number, number, number] = [0, 40, 1368];
// «صفحه‌ی کامل» → the whole page at once; then menu, gallery, reviews, each held ~1 s (later than said if needed)
const whole: [number, number, number] = [684 - 1800, -10, 3600];
// the times run on a cursor so each view gets its hold even when the words come fast
const tW = K.whole - 0.15, tWhole = tW + 0.55;
const tM = Math.max(K.menu, tWhole + 0.6), tG = Math.max(K.gallery, tM + 1.0), tR = Math.max(K.reviews, tG + 1.05);
export const TOUR_KEYS: Key[] = [
  [S(4), ...hero],
  [tW, ...hero],
  [tWhole, ...whole],
  [tM - 0.3, ...whole],
  [tM + 0.15, ...menu],
  [tG - 0.3, ...menu],
  [tG + 0.15, ...gal],
  [tR - 0.3, ...gal],
  [tR + 0.15, ...rev],
];
export const TOUR_MARKS: Mark[] = [
  { t0: tM + 0.15, t1: tG - 0.2, ...SITE.menu, label: "منو", below: true },
  { t0: tG + 0.2, t1: tR - 0.2, ...SITE.gallery, label: "نمونه‌کارها" },
  { t0: tR + 0.2, t1: S(5) - 0.05, ...SITE.reviews, label: "نظر مشتری‌ها" },
];
const heroBtns = fitW({ x: 760, y: 560, w: 560, h: 240 }, 60);
export const EDIT_KEYS: Key[] = [[S(5), ...rev], [S(5) + 0.6, ...heroBtns]];
export const PUB_KEYS: Key[] = [[S(6), 0, 40, 1368], [DUR, 80, 100, 1220]];

/** captions */
export const CHUNKS = makeChunks(WORDS, /سایت|پرامپت|کد|نتیجه|نارنجی|کلیک|اینترنته|قدم‌به‌قدم/);

/** Look frames (props { times }) */
export const LOOK = [0.3, K.how, (K.typeA + K.typeB) / 2, K.structure + 0.3, (S(3) + K.codeEnd) / 2, K.whole + 0.75, K.menu + 1.0, S(5) - 0.4, K.swap - 0.25, K.swap + 0.6, K.click + 0.2, DUR - 0.3].map((x) => +x.toFixed(3));
