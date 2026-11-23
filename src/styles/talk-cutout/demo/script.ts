// Talk Cutout · demo content: a neutral sample reel («سه قدم برای بازدید بیشتر» — a creator explains how she makes a
// video a week: find the most-viewed channels of her topic, see what got viewed and why, have an AI write the script of
// HER OWN idea, publish weekly, check the stats; the CTA asks for a comment word and promises a checklist in the DM).
// Every channel, number and handle here is an invented SAMPLE and says so on screen («نمونه»).
// Timing: demo/words.json (stub timings from pipeline/stub-words.mjs; replace with your voice's alignment).
// Sentences (si): 0 hook · 1 step 1 · 2 step 2 · 3 step 3 · 4 publish + stats · 5 CTA.
import WORDS from "./words.json";
import { makeClock, type Word } from "../lib/words";
import { makeBeat } from "../lib/time";
import type { YtData } from "../lib/apps/youtube";
import type { StudioStats, StudioUpload } from "../lib/apps/studio";
import type { IgCm } from "../lib/apps/instagram";

export const K = makeClock(WORDS as Word[]);
const { at, atE } = K;

export const FPS = 30;

// ── the film's clock: section bounds and the words the picture cuts on ─────────────────────────────────────────
const steps = at(1, "قدم") - 0.06; // the cut into the motion lands on a music downbeat (BEAT grid below)
export const B = makeBeat(120, steps);
const end = atE(5, "کن", 1);
export const T = {
  // ── hook (TALK): take A (she sits right of frame, points up-left) → jump cut → take B (centred) on «اونم» ──
  har1: at(0, "هر", 0), har2: at(0, "هر", 1), har3: at(0, "هر", 2), bishtar0: at(0, "بیشتر"),
  onam: at(0, "اونم"), se: at(0, "سه"), ghadam0: at(0, "قدم"),
  // ── MOTION ──
  steps, // «قدم 1»
  ytb: at(1, "یوتیوب"), kanalha: at(1, "کانال‌های"), porbazdid: at(1, "پربازدید"), mozoo: at(1, "موضوع"), peyda: at(1, "پیدا"), kon1: at(1, "کن"),
  step2: at(2, "قدم"), bebin: at(2, "ببین"), kodoom: at(2, "کدوم"), bishtar2: at(2, "بیشتر"), dide: at(2, "دیده"), chera: at(2, "چرا"), cheraE: atE(2, "چرا"),
  step3: at(3, "قدم"), ide: at(3, "ایده‌ی"), rooi: at(3, "رو", 0), hoosh3: at(3, "هوش"), matn: at(3, "متن"), beneviseE: atE(3, "بنویسه"),
  har4: at(4, "هر"), hafte4: at(4, "هفته"), video4: at(4, "ویدیو"), montasher: at(4, "منتشر"), bad: at(4, "بعد"), mah4: at(4, "ماه"), amar: at(4, "آمارت"),
  // ── CTA (TALK): take C ──
  talk2: at(5, "اگه") - 0.25,
  esm: at(5, "اسم"), in5: at(5, "این"), hoosh5: at(5, "هوش"), checklist0: at(5, "چک‌لیست"), kalame: at(5, "کلمه‌ی"), ghadam5: at(5, "قدم"), comment: at(5, "کامنت"),
  directet: at(5, "دایرکتت"), chek: at(5, "چک"), end,
  // ── music landmarks: the end card lands on the first downbeat after her last word ──
  endHit: B.nextBar(end + 0.4),
};
export const DUR = T.endHit + 1.8;
export const FRAMES = Math.ceil(DUR * FPS);
export const SEND = T.beneviseE + 0.02; // the prompt is sent right after its last word
export const DM_AT = T.chek - 0.12; // the DM thread grows out of the notice on «چک» (her face stays visible until then)

/** her takes on the film clock (a jump cut = an instant pose change; with your footage: pipeline/probe-cuts.py) */
export const TAKES = { A: 0, B: T.onam - 0.06, C: T.talk2 };

// ── sample data (invented; never a real channel's page, thumbnails or numbers) ─────────────────────────────────
export const YT: YtData = {
  ch: { name: "Sample Bakery", handle: "@sample-bakery", subs: "84K", videos: "126", desc: "Easy bread & cakes at home · a sample channel", hue: 26, letter: "S" },
  home: [
    { title: "One Batter, Three Cakes", views: "412K", ago: "8 months ago", len: "10:31", thumb: { hue: 340, title: "1 BATTER|3 CAKES", motif: "cake" } },
    { title: "Morning Cinnamon Rolls", views: "21K", ago: "1 week ago", len: "11:40", thumb: { hue: 32, title: "CINNAMON|ROLLS", motif: "bowl" } },
    { title: "Why Your Bread Is Flat", views: "268K", ago: "1 year ago", len: "6:48", thumb: { hue: 205, title: "FLAT|BREAD?", motif: "loaf" } },
  ],
  latest: [
    { title: "Apple Pie, No Mixer", views: "9.4K", ago: "3 days ago", len: "9:02", thumb: { hue: 12, title: "APPLE|PIE", motif: "pie" } },
    { title: "Morning Cinnamon Rolls", views: "21K", ago: "1 week ago", len: "11:40", thumb: { hue: 32, title: "CINNAMON|ROLLS", motif: "bowl" } },
    { title: "Hot Cocoa, Café Style", views: "33K", ago: "2 weeks ago", len: "5:15", thumb: { hue: 22, title: "CAFÉ|COCOA", motif: "cup" } },
  ],
  popular: [
    { title: "No-Knead Bread in 5 Minutes", views: "1.2M", ago: "1 year ago", len: "8:12", thumb: { hue: 28, title: "NO-KNEAD|BREAD", motif: "loaf" } },
    { title: "Sourdough for Total Beginners", views: "846K", ago: "2 years ago", len: "14:05", thumb: { hue: 18, title: "SOURDOUGH|DAY 1", motif: "jar" } },
    { title: "One Batter, Three Cakes", views: "412K", ago: "8 months ago", len: "10:31", thumb: { hue: 340, title: "1 BATTER|3 CAKES", motif: "cake" } },
  ],
  suggest: ["home baking", "home baking bread", "home baking for beginners", "home baking cake"],
  homeChips: ["All", "Baking", "Recipes", "Music", "Live"],
};
export const QUERY = "home baking";
export const TOP_VIEWS = "1.2M";

// the hook's sample numbers (views a day / a week / a month) — they agree with the stats page below (36.4K)
export const HOOK_ROWS = [
  { label: "هر روز", from: 1.12, to: 1.2, dec: 1, prefix: "+", suffix: "K", unit: "بازدید", share: 1 / 28, at: -0.5 }, // complete on frame 0
  { label: "هر هفته", from: 7.8, to: 8.4, dec: 1, prefix: "+", suffix: "K", unit: "بازدید", share: 7 / 28, at: T.har2 - 0.04 },
  { label: "هر ماه", from: 33.5, to: 36, dec: 0, prefix: "+", suffix: "K", unit: "بازدید", share: 1, at: T.har3 - 0.04 },
];

export const STATS: StudioStats = { subs: "2,140", views: "36.4K", viewsUp: "212%", watch: "1.9K", newSubs: "+312", impressions: "410K" };
export const UPLOADS: StudioUpload[] = [
  { when: "Week 1", views: "6.1K", title: "نون بدون ورز در 60 ثانیه", thumb: { hue: 28, title: "NO KNEAD|60 SEC", motif: "loaf" }, at: T.har4 + 0.02 },
  { when: "Week 2", views: "8.8K", title: "کیک یک‌کاسه", thumb: { hue: 340, title: "ONE BOWL|CAKE", motif: "cake" }, at: T.hafte4 + 0.12 },
  { when: "Week 3", views: "9.7K", title: "شیرینی بدون همزن", thumb: { hue: 12, title: "NO MIXER|PIE", motif: "pie" }, at: T.video4 },
  { when: "Week 4", views: "11.8K", title: "کاکائوی کافه‌ای", thumb: { hue: 22, title: "CAFÉ|COCOA", motif: "cup" }, at: T.montasher },
];

// the AI step: her spoken words type themselves (shown ← spoken)
export const PROMPT_KEYS = [
  { shown: "متن", sp: "متن" },
  { shown: "ویدیوم", sp: "ویدیوت" },
  { shown: "رو", sp: "رو" },
  { shown: "بنویس.", sp: "بنویسه" },
].map((k, i) => {
  const ws = K.words.filter((w) => w.si === 3 && w.s >= T.matn - 0.01);
  return { shown: k.shown, s: ws[i].s, e: ws[i].e, sp: k.sp };
});
export const IDEA = "نون خونگی بدون ورز";
export const AI_REPLY = {
  text: "باشه! متن یه ویدیوی 60 ثانیه‌ای برای ایده‌ات:",
  chips: [
    { label: "قلاب 3 ثانیه", at: SEND + 0.15, done: SEND + 0.4 },
    { label: "متن 60 ثانیه", at: SEND + 0.22, done: SEND + 0.55 },
    { label: "5 صحنه", at: SEND + 0.3, done: SEND + 0.7 },
  ],
};

// the CTA
export const COMMENT_WORD = "قدم";
export const COMMENTS: IgCm[] = [
  { user: "sara.bakes", text: "قدم", ago: "2m", likes: "12", hue: 340 },
  { user: "mehdi.vlog", text: "قدم", ago: "4m", likes: "8", hue: 200 },
  { user: "neda_art", text: "قدم 🙏", ago: "6m", likes: "5", hue: 30 },
  { user: "ali.cooks", text: "قدم", ago: "9m", likes: "3", hue: 120 },
];
export const GUIDE = { title: "چک‌لیست 3 قدم", items: ["کانال‌های پربازدید موضوعت رو پیدا کن", "ببین چی بیشتر دیده شده و چرا", "متنِ ایده‌ی خودت رو با هوش مصنوعی بنویس"] };

/** key moments for the contact sheet (Style-TalkCutout-Look default) */
export const LOOK_TIMES = [0.4, 2.3, 4.7, T.steps + 0.25, T.kanalha + 0.45, T.mozoo + 0.15, T.dide + 0.4, T.step3 + 0.3, T.matn + 0.9, T.montasher + 0.3, T.amar + 0.35, T.hoosh5 + 0.3, T.comment + 0.25, T.directet + 0.2, T.chek + 0.8, T.endHit + 0.7];
