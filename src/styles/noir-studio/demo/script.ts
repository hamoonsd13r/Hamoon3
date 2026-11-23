// Noir Studio · demo script: a 9:16 explainer reel «یه کانال کوچیک، صد هزار بازدید» — app screens built in code
// (a YouTube channel, an Instagram profile, an AI chat, a comment sheet), numbers that lift off the screen on the
// word that says them, word-by-word captions, two small robot buddies on the light lines only.
// Silent demo: the word times are estimated (estimateWords). With a real voice: eleven-align → WORDS = REAL.
import { estimateWords, makeTimeline } from "../lib/words";
import type { Cap } from "../lib/kit";
import type { Plate } from "../lib/backdrop";
import type { Cue } from "../lib/buddy";

export const FPS = 30;
export const LINES = [
  "یه کانال کوچیک فقط با دوازده تا ویدیو، صد هزار بار دیده شد.",
  "نه دوربین داشت، نه استودیو؛ فقط یه ایده‌ی ساده و یه برنامه‌ی منظم.",
  "توی اینستاگرام هم همین کار رو کرد و به دوازده هزار دنبال‌کننده رسید.",
  "ایده‌ها رو هم از یه دستیار هوش مصنوعی می‌گیره؛ فقط کافیه درست ازش بپرسی.",
  "مثلاً بنویسی: پنج تا ایده بده برای ویدیوی کوتاه آشپزی.",
  "چند ثانیه بعد، پنج تا ایده‌ی آماده جلوته.",
  "تو هم امتحانش کن و کلمه‌ی «ایده» رو کامنت کن.",
];
export const WORDS = estimateWords(LINES, { lead: 0.25, sentGap: 0.34, before: { 4: 0.15 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.6).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

/** section boundaries (cut on the first word of a line) */
export const SEC = {
  hook: 0,
  plan: S(1) - 0.05,
  ig: S(2) - 0.05,
  ai: S(3) - 0.05,
  cta: S(6) - 0.05,
};
/** the beats the picture hits */
export const SC = {
  twelve: at(0, "دوازده"),
  views: at(0, "صد"),
  noCam: at(1, "نه"),
  noStudio: at(1, "نه", 1),
  idea: at(1, "ایده‌ی"),
  plan: at(1, "برنامه‌ی"),
  followers: at(2, "دوازده"),
  ask: at(3, "بپرسی"),
  promptWords: [at(4, "پنج"), at(4, "تا"), at(4, "ایده"), at(4, "بده"), at(4, "برای"), at(4, "ویدیوی"), at(4, "کوتاه"), at(4, "آشپزی")],
  send: E(4) + 0.12,
  ready: at(5, "آماده"),
  reply: S(5) + 0.1,
  comment: at(6, "کامنت"),
  word: at(6, "ایده"),
};

/** backdrop: one clean colour of light per section + the giant word sliding behind */
export const PLATES: Plate[] = [
  { at: SEC.hook, c1: "#8A1C14", c2: "#2A0906", word: "VIEWS" },
  { at: SEC.plan, c1: "#8A3A10", c2: "#2B1104", word: "SIMPLE" },
  { at: SEC.ig, c1: "#7A1F58", c2: "#26061B", word: "FOLLOW" },
  { at: SEC.ai, c1: "#1B4277", c2: "#06142A", word: "PROMPT" },
  { at: SEC.cta, c1: "#8A3A10", c2: "#2B1104", word: "COMMENT" },
];

/** captions (the AI-chat prompt line is hidden: its words type on the screen instead) */
// a long line is split into two cards (after word n); each card switches on its first word
const SPLIT: Record<number, number> = { 1: 5, 3: 9 };
const KEYS = [["صد", "هزار"], ["ایده‌ی", "منظم."], ["دوازده", "هزار"], ["درست"], [], ["آماده"], ["ایده"]];
const lineEnd = (i: number) => (i + 1 < LINES.length ? S(i + 1) : TL.VOICE_END + 0.6) - 0.06;
export const CAPS: Cap[] = LINES.flatMap((line, i) => {
  const ws = line.replace(/[«»]/g, "").split(" ");
  const cut = SPLIT[i];
  const base = { hide: i === 4, key: KEYS[i] };
  if (!cut) return [{ ...base, a: S(i), b: lineEnd(i), text: ws.join(" ") }];
  const mid = WORDS.filter((w) => w.si === i)[cut].s;
  return [
    { ...base, a: S(i), b: mid - 0.02, text: ws.slice(0, cut).join(" ") },
    { ...base, a: mid - 0.02, b: lineEnd(i), text: ws.slice(cut).join(" ") },
  ];
});

/** the buddies: only on light lines (never on the big numbers) */
export const CAST: Record<string, Cue[]> = {
  A: [
    { a: SEC.plan + 0.1, b: SEC.ig - 0.1, x: 205, y: 1390, s: 14, pop: true, yaw: 20, acts: [["think", SC.noCam - 0.1, SC.idea - 0.15], ["happy", SC.idea, SEC.ig], ["nod", SC.plan, SEC.ig - 0.4]], say: [[SC.idea + 0.05, SC.idea + 1.1, "!"]] },
    { a: SC.comment - 0.4, b: DUR, x: 175, y: 1390, s: 14, pop: true, yaw: 25, acts: [["point", SC.comment, SC.word + 0.9], ["cheer", SC.word + 1.0, DUR]] },
  ],
  B: [
    { a: SEC.ai + 0.3, b: SEC.cta - 0.1, x: 92, y: 1390, s: 12, yaw: 30, acts: [["think", SC.ask - 0.5, SC.ask + 0.6], ["type", SC.promptWords[0], SC.send], ["surprise", SC.ready - 0.05], ["happy", SC.ready + 0.6, SEC.cta]] },
  ],
};

/** Look frames (props { times }) */
export const LOOK = [0.3, SC.twelve + 0.3, SC.views + 0.9, SC.noStudio + 0.4, SC.plan + 0.6, SC.followers + 0.9, SC.ask, SC.promptWords[5], SC.send + 0.3, SC.ready + 0.6, SC.word + 0.5, DUR - 0.3].map((x) => +x.toFixed(3));
