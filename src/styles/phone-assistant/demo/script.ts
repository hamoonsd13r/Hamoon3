// Phone Assistant · demo script: a 9:16 reel about a (made-up) clinic's AI receptionist — a call at 2 a.m. answered
// by the assistant (voice orb, live transcript), the SMS confirmation, the morning's task list and calendar, «never
// tired», and the comment call. Silent demo: word times are estimated; the voice orb follows those words.
import { estimateWords, makeTimeline } from "../lib/words";
import { makeChunks } from "../lib/caption";
import { VOICE } from "../lib/theme";

export const FPS = 30;
export const LINES = [
  "ساعت دو نصف شب، یه نفر به کلینیک زنگ می‌زنه.",
  "دستیار هوشمند جواب می‌ده، سؤالش رو می‌فهمه و براش وقت می‌گیره.",
  "بعد یه پیامک تأیید، با ساعت و آدرس براش می‌فرسته.",
  "صبح که می‌رسی، همه‌ی تماس‌ها و نوبت‌ها مرتب توی فهرستته.",
  "یه منشی که هیچ‌وقت خسته نمی‌شه.",
  "برای امتحانش، کلمه‌ی «منشی» رو کامنت کن.",
];
export const WORDS = estimateWords(LINES, { lead: 0.3, sentGap: 0.4, before: { 2: 0.4, 3: 0.3 } });
export const TL = makeTimeline(WORDS);
VOICE.words = WORDS; // the orb and the call waveform follow the narration (set VOICE.env for a real voice)
const { at, S, E } = TL;
export const DUR = +(TL.VOICE_END + 2.0).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

export const SC = {
  ring: 0.2,
  answer: at(1, "جواب"),
  understand: at(1, "می‌فهمه"),
  book: at(1, "وقت"),
  sms: S(2),
  smsW: at(2, "پیامک"),
  address: at(2, "آدرس"),
  morning: S(3),
  list: at(3, "فهرستته"),
  calls: at(3, "تماس‌ها"),
  never: S(4),
  tired: at(4, "خسته"),
  cta: S(5),
  word: at(5, "منشی"),
  comment: at(5, "کامنت"),
};
export const CHUNKS = makeChunks(WORDS, /نصف|زنگ|دستیار|وقت|پیامک|فهرستته|خسته|منشی/);

/** Look frames (props { times }) */
export const LOOK = [0.3, at(0, "کلینیک"), SC.answer + 0.5, SC.understand + 0.6, SC.book + 0.6, SC.smsW + 0.5, SC.address + 0.8, SC.calls + 0.3, SC.list + 0.6, SC.tired + 0.5, SC.word + 0.4, DUR - 0.3].map((x) => +x.toFixed(3));
void E;
