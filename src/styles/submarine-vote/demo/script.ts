// Submarine Vote · demo script: five characters stuck in a sinking submarine; the pod has four seats; each one names
// who should stay (voice screens), then the last one volunteers. Lines 0, 1 and 7 = narrator; 2–6 = the cast.
// Silent demo: word times are estimated (estimateWords); with voices use eleven-align per line → normalizeWords.
import { estimateWords, makeTimeline } from "../lib/words";
import type { Model } from "../lib/cast";

export const FPS = 30;
export const NAMES: Record<Model, string> = { box: "جعبه", bloom: "گلی", ball: "توپی", bot: "ربو", star: "ستاره" };
export const CAST: Model[] = ["bloom", "star", "box", "bot", "ball"];

export const LINES = [
  "این پنج تا توی یه زیردریایی که داره غرق می‌شه گیر افتادن.",
  "کپسول نجات فقط چهار تا صندلی داره. کی جا می‌مونه؟",
  "توپی بمونه؛ اون حتی با آب هم دعوا داره.",
  "ربو! هر سؤالی بپرسی، می‌گه سؤال خیلی خوبیه.",
  "ستاره الان می‌گه بیاین سوراخ رو با چسب ببندیم!",
  "راستش، گلی نباشه کسی نمی‌فهمه.",
  "من می‌مونم. شما برید.",
  "و ربو، قهرمان این زیردریایی شد.",
];
/** who says each line (null = narrator) and whom they name */
export const SPEAK: { who: Model | null; accuse?: Model; name?: string }[] = [
  { who: null },
  { who: null },
  { who: "box", accuse: "ball", name: "توپی" },
  { who: "bloom", accuse: "bot", name: "ربو" },
  { who: "ball", accuse: "star", name: "ستاره" },
  { who: "star", accuse: "bloom", name: "گلی" },
  { who: "bot" },
  { who: null },
];
export const WORDS = estimateWords(LINES, { lead: 0.3, sentGap: 0.42 });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 1.6).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const K = {
  sinking: at(0, "غرق"),
  pod: at(1, "کپسول"),
  four: at(1, "چهار"),
  who: at(1, "کی"),
  stay: at(6, "می‌مونم"),
  go: at(6, "برید"),
  hero: at(7, "قهرمان"),
};
/** the time the accused's name is said in line i */
export const nameAt = (i: number) => (SPEAK[i].name ? at(i, SPEAK[i].name as string) : 0);
/** water level (screen y of the surface): rises through the film */
export const waterY = (t: number) => 1440 - 110 * Math.min(1, t / DUR) - (t > E(6) ? 60 * Math.min(1, (t - E(6)) / 1.2) : 0);

/** Look frames (props { times }) */
export const LOOK = [0, K.sinking + 0.3, K.four + 0.3, K.who + 0.3, S(2) + 0.5, nameAt(2) + 0.3, S(3) + 0.6, nameAt(3) + 0.3, nameAt(4) + 0.3, nameAt(5) + 0.4, K.stay + 0.3, K.go + 0.5, K.hero + 0.2, DUR - 0.2].map((x) => +x.toFixed(3));
void S;
