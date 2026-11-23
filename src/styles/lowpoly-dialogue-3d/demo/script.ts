// Lowpoly Dialogue 3D · demo script: a boy who can't sleep before tomorrow's talk, and the small robot that rehearses it
// with him until he falls asleep on its shoulder. H = the person, R = the robot.
// Silent demo: word times are estimated (estimateWords). With voices: build each line, align it (eleven-align) and use
// `normalizeWords(REAL)` — every pose, cut and screen change below follows the words, so nothing else moves.
import { estimateWords, makeTimeline } from "../lib/words";
import type { Who } from "../lib/perform";

export const FPS = 30;

export const LINES = [
  "هنوز بیداری؟",
  "من همیشه بیدارم. تو چرا نخوابیدی؟",
  "فردا باید جلوی کل کلاس ارائه بدم، و هنوز یه بار هم تمرین نکردم.",
  "بیا با هم ببینیم. چند تا اسلاید داری؟",
  "سه تا. ولی هر بار فکرش رو می‌کنم، دستام می‌لرزه.",
  "پس همین الان تمرین می‌کنیم. جمله‌ی اولت رو بگو.",
  "سلام. امروز می‌خوام درباره‌ی ستاره‌ها حرف بزنم.",
  "عالی بود! دیدی؟ دستات دیگه نمی‌لرزن.",
  "راست می‌گی… پس صبح که بیدار شدم، یادم بنداز.",
  "حتماً. تو بخواب، من حواسم هست.",
  "شبت بخیر.",
];
/** who says each line */
export const SPEAKER: Who[] = ["H", "R", "H", "R", "H", "R", "H", "R", "H", "R", "R"];

// turn gaps ≈ 0.4 s; the two laptop-screen inserts play in the pauses after lines 3 and 6 (so no subtitle ever sits
// on the characters, who stay in frame above the screen); a breath before he presents, a yawn before 8, a pause before 10
export const WORDS = estimateWords(LINES, { lead: 0.35, sentGap: 0.42, before: { 4: 1.3, 6: 0.5, 7: 1.3, 8: 0.7, 10: 0.9 } });
export const TL = makeTimeline(WORDS);
const { at, S, E } = TL;
export const TAIL = 4.2; // the pull-back to the window after «شبت بخیر»
export const DUR = +(TL.VOICE_END + TAIL).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

/** Look frames (props { times }) */
export const LOOK = [
  0, S(1) + 0.4, at(2, "کلاس") + 0.2, E(3) + 0.95, at(4, "دستام") + 0.3, at(5, "تمرین") + 0.3, at(6, "سلام") + 0.3, E(6) + 1.15,
  at(7, "عالی") + 0.25, E(7) + 0.3, E(7) + 0.75, S(8) + 0.8, S(9) + 0.6, S(10) + 0.4, DUR - 1.6, DUR - 0.1,
].map((x) => +x.toFixed(3));
