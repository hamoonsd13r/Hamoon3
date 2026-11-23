// Lowpoly Dialogue 3D · the demo's direction, all data: the shot list, the two performances (key tracks per channel,
// cued on words), the robot's moods and the laptop screen. Copy it to src/vNN/ and rewrite the data for your dialogue.
import * as THREE from "three";
import { steps } from "../lib/keys";
import {
  applyCamera, applyHuman, applyRobot, HUMAN_REST, makeVoice, moodAt, ROBOT_REST, sample, shotIndex,
  type HumanPose, type Mood, type RobotPose, type Shot, type Tracks,
} from "../lib/perform";
import { drawScreen, type ScreenState } from "../lib/screen";
import { hit, ramp } from "../lib/theme";
import type { World } from "../lib/world";
import { DUR, SPEAKER, TL, WORDS } from "./script";

const { at, S, E } = TL;
const SCR: Omit<Shot, "a" | "scr"> = { p0: [0, 0, 0], p1: [0, 0, 0], t0: [0, 0, 0], t1: [0, 0, 0], fov: [42, 42], focus: [0, 0, 0], bokeh: 4, range: 1.2 };

// ───────────────────────────── shot list (people sit at x −0.37 (H) and +0.37 (R) on the lid's top edge, heads ≈ 0.8)
export const SHOTS: Shot[] = [
  // wide establishing, slow push — «هنوز بیداری؟»
  { a: 0, p0: [1.5, 0.74, 3.4], p1: [1.15, 0.72, 3.0], t0: [-0.12, 0.6, 0], t1: [-0.08, 0.62, 0], fov: [34, 34], focus: "H", bokeh: 7, range: 0.5 },
  // robot close — «من همیشه بیدارم…»
  { a: S(1) - 0.18, p0: [-0.12, 0.9, 2.35], p1: [-0.02, 0.9, 2.15], t0: [0.37, 0.8, 0], t1: [0.37, 0.8, 0], fov: [30, 30], focus: "R", bokeh: 9, range: 0.35 },
  // man close — «فردا باید جلوی کل کلاس…»
  { a: S(2) - 0.12, p0: [0.8, 0.86, 2.25], p1: [0.66, 0.86, 2.05], t0: [-0.37, 0.76, 0], t1: [-0.37, 0.77, 0], fov: [30, 30], focus: "H", bokeh: 9, range: 0.35 },
  // robot, low angle, thinking — «بیا با هم ببینیم…»
  { a: S(3) - 0.1, p0: [0.78, 0.58, 2.1], p1: [0.7, 0.6, 1.95], t0: [0.37, 0.84, 0], t1: [0.37, 0.84, 0], fov: [31, 31], focus: "R", bokeh: 9, range: 0.35 },
  // the screen — the three slides, in the pause after «…چند تا اسلاید داری؟» (inserts never sit under a subtitle)
  { ...SCR, a: E(3) + 0.45, scr: [820, 520, 6.4, 5.7] },
  // man medium, hands up and shaking — «سه تا. ولی… دستام می‌لرزه»
  { a: S(4) - 0.12, p0: [0.72, 0.86, 2.4], p1: [0.62, 0.86, 2.2], t0: [-0.37, 0.76, 0], t1: [-0.37, 0.77, 0], fov: [31, 31], focus: "H", bokeh: 8, range: 0.4 },
  // two-shot front — «پس همین الان تمرین می‌کنیم…»
  { a: S(5) - 0.12, p0: [0.0, 0.8, 3.6], p1: [0.0, 0.8, 3.3], t0: [0, 0.7, 0], t1: [0, 0.7, 0], fov: [32, 32], focus: [[0.37, 0.8, 0], [-0.37, 0.8, 0]], bokeh: 5, range: 0.8 },
  // man medium, straight on — he presents «سلام. امروز…»
  { a: S(6) - 0.12, p0: [-0.34, 0.84, 2.45], p1: [-0.28, 0.84, 2.25], t0: [-0.36, 0.8, 0], t1: [-0.35, 0.8, 0], fov: [32, 32], focus: "H", bokeh: 6, range: 0.4 },
  // the screen — in the pause after his first line: the deck moves on to the star slide, the practice timer runs
  { ...SCR, a: E(6) + 0.45, scr: [860, 500, 6.2, 5.5] },
  // robot close, delighted — «عالی بود! دیدی؟…»
  { a: S(7) - 0.1, p0: [0.2, 0.9, 2.3], p1: [0.24, 0.9, 2.1], t0: [0.37, 0.8, 0], t1: [0.37, 0.8, 0], fov: [31, 31], focus: "R", bokeh: 9, range: 0.35 },
  // two-shot — the yawn (a big stretch), sleepy «راست می‌گی… یادم بنداز»
  { a: E(7) + 0.2, p0: [-0.55, 0.84, 3.3], p1: [-0.42, 0.82, 3.0], t0: [-0.1, 0.8, 0], t1: [-0.08, 0.78, 0], fov: [32, 32], focus: [[-0.37, 0.8, 0], [0.37, 0.8, 0]], bokeh: 6, range: 0.75 },
  // two-shot close — asleep on the robot's shoulder «حتماً. تو بخواب…»
  { a: S(9) - 0.1, p0: [0.36, 0.8, 2.6], p1: [0.28, 0.78, 2.35], t0: [0.0, 0.7, 0], t1: [0.02, 0.7, 0], fov: [32, 32], focus: "R", bokeh: 7, range: 0.6 },
  // «شبت بخیر» — the long pull back to the window, the desk and the city
  { a: S(10) - 0.1, p0: [0.14, 0.8, 3.0], p1: [0.25, 1.5, 11.5], t0: [0.02, 0.68, 0], t1: [0, -0.95, 0], fov: [34, 42], focus: [0, 0.5, 0], bokeh: 5, range: 1.4 },
];
/** is the shot at t a laptop-screen shot? (the subtitles get a plate there) */
export const screenShotAt = (t: number) => !!SHOTS[shotIndex(SHOTS, t)].scr;

const T_PRACTICE = at(5, "تمرین");
const T_STARS = at(6, "ستاره‌ها");
const T_GREAT = at(7, "عالی");
const T_YAWN = E(7) + 0.35;
const T_NEXT = E(6) + 0.7; // the deck advances during the screen insert

// ───────────────────────────── the man (yaw + = towards the robot, pitch + = down; arms: pitch, out, bend)
const H: Tracks<HumanPose> = {
  hy: steps(0.42, [[S(2), 0.3], [at(3, "اسلاید"), 0.1], [S(4), 0.25], [S(5), 0.45], [S(6), 0.2], [S(7), 0.45], [S(8), 0.4]]),
  hp: steps(0, [[S(2), 0.18], [at(2, "کلاس"), 0.05], [at(2, "تمرین"), 0.3], [at(3, "اسلاید"), 0.5], [S(4), 0.35], [S(5), 0.06], [S(6), -0.04], [S(7), 0.02], [S(8), 0.1]]),
  hr: steps(0, [[at(8, "یادم"), 0.25], [E(8) + 0.3, 0.38]]),
  lean: steps(-0.05, [[S(2), 0.1], [at(3, "اسلاید"), 0.16], [S(4), 0.12], [S(6), -0.08], [S(7), 0.02], [E(8) + 0.4, 0.06]]),
  roll: steps(0, [[S(8) + 0.5, 0], [E(8) + 0.4, 0.2]], 0.9),
  twist: steps(0.1, [[S(5), 0.2], [S(6), 0.12], [S(8), 0.18]]),
  // right arm: a gesture on «کلاس», both hands up on «دستام», an open palm while presenting, pointing up on «ستاره‌ها»
  rp: steps(-0.28, [[at(2, "کلاس"), 1.0], [E(2) + 0.1, -0.28], [at(4, "دستام") - 0.1, 0.95], [E(4) + 0.3, -0.28], [at(6, "سلام"), 0.9], [T_STARS - 0.15, 1.9], [E(6) + 0.3, -0.28], [T_YAWN, 2.5], [S(8) + 0.25, -0.28]]),
  ro: steps(0.34, [[at(2, "کلاس"), 0.25], [E(2) + 0.1, 0.34], [at(4, "دستام") - 0.1, 0.1], [E(4) + 0.3, 0.34], [at(6, "سلام"), 0.45], [T_STARS - 0.15, 0.2], [E(6) + 0.3, 0.34], [T_YAWN, 0.3], [S(8) + 0.25, 0.34]]),
  rb: steps(0.12, [[at(2, "کلاس"), 1.2], [E(2) + 0.1, 0.12], [at(4, "دستام") - 0.1, 1.5], [E(4) + 0.3, 0.12], [at(6, "سلام"), 0.7], [T_STARS - 0.15, 0.3], [E(6) + 0.3, 0.12], [T_YAWN, 0.35], [S(8) + 0.25, 0.12]]),
  // left arm: hands up on «دستام», both arms stretch up on the yawn
  lp: steps(-0.28, [[at(4, "دستام") - 0.1, 0.95], [E(4) + 0.3, -0.28], [T_YAWN, 2.5], [S(8) + 0.25, -0.28]]),
  lo: steps(0.34, [[at(4, "دستام") - 0.1, 0.1], [E(4) + 0.3, 0.34], [T_YAWN, 0.3], [S(8) + 0.25, 0.34]]),
  lb: steps(0.12, [[at(4, "دستام") - 0.1, 1.5], [E(4) + 0.3, 0.12], [T_YAWN, 0.35], [S(8) + 0.25, 0.12]]),
  tremble: steps(0, [[at(4, "دستام"), 1], [E(4) + 0.4, 0], [S(6) - 0.1, 0.5], [at(6, "امروز"), 0]]),
  brow: steps(0, [[S(1) + 0.3, 0.5], [E(1) + 0.3, 0.1], [S(5), 0.4], [E(5), 0], [S(7), 0.6], [E(7) + 0.3, 0.2], [S(8), 0]]),
  worry: steps(0, [[S(2) + 0.3, 0.6], [S(3), 0.3], [S(4), 0.7], [S(5) + 0.4, 0.2], [S(6), 0.25], [T_STARS, 0], [S(8), 0]]),
  yawn: steps(0, [[T_YAWN + 0.1, 1], [S(8) - 0.05, 0]], 0.25),
  sleep: steps(0, [[at(8, "بیدار"), 0.5], [E(8) + 0.5, 1]], 0.8),
};

// ───────────────────────────── the robot (yaw − = towards the man)
const R: Tracks<RobotPose> = {
  hy: steps(-0.4, [[S(1), -0.55], [S(3), -0.25], [at(3, "اسلاید"), -0.05], [S(4), -0.5], [S(5), -0.55], [S(6), -0.48], [S(7), -0.55], [S(9), -0.5], [E(10) + 0.4, 0.05]]),
  hp: steps(0.03, [[S(1), 0.05], [S(2), 0.18], [S(3), 0.1], [at(3, "اسلاید"), 0.45], [S(4), 0.12], [S(5), 0.02], [S(6), 0.05], [S(7), -0.05], [S(8), 0.12], [S(9), 0.2], [E(10) + 0.4, 0.5]]),
  hr: steps(0, [[S(1), -0.1], [S(2), 0.12], [S(3), 0], [S(9), -0.12], [S(10), 0]]),
  lean: steps(0.02, [[S(2), 0.06], [at(3, "اسلاید"), 0.18], [S(4), 0.04], [S(5), 0], [S(7), -0.04], [S(8), 0.08], [E(10) + 0.4, 0.14]]),
  twist: steps(-0.1, [[S(1), -0.2], [S(5), -0.25], [S(6), -0.18], [S(9), -0.2], [E(10) + 0.4, -0.02]]),
  // right arm: a raised hand on «تمرین», both arms open wide on «عالی» (kept below the subtitle band)
  rp: steps(0.62, [[T_PRACTICE, 1.5], [E(5) + 0.1, 0.62], [T_GREAT, 1.8], [E(7), 0.62]]),
  ro: steps(0.06, [[T_PRACTICE, 0.55], [E(5) + 0.1, 0.06], [T_GREAT, 0.5], [E(7), 0.06]]),
  rb: steps(0.18, [[T_PRACTICE, 1.3], [E(5) + 0.1, 0.18], [T_GREAT, 0.25], [E(7), 0.18]]),
  // left arm (next to the man): an open palm on «بگو», the cheer, then around his shoulders when he sleeps
  lp: steps(0.62, [[at(5, "بگو") - 0.2, 1.0], [E(5) + 0.3, 0.62], [T_GREAT, 1.8], [E(7), 0.62], [S(9) - 0.2, 0.12]]),
  lo: steps(0.06, [[at(5, "بگو") - 0.2, 0.35], [E(5) + 0.3, 0.06], [T_GREAT, 0.5], [E(7), 0.06], [S(9) - 0.2, 0.62]]),
  lb: steps(0.18, [[at(5, "بگو") - 0.2, 1.0], [E(5) + 0.3, 0.18], [T_GREAT, 0.25], [E(7), 0.18], [S(9) - 0.2, 0.25]]),
  lookX: steps(-0.4, [[S(3), 0], [at(3, "اسلاید"), 0.2], [S(4), -0.5], [S(7), -0.2], [S(8), -0.5], [S(9), -0.6], [E(10) + 0.3, 0]]),
  lookY: steps(0, [[S(2), 0.4], [S(3), 0], [at(3, "اسلاید"), 0.6], [S(4), 0], [S(9), 0.3]]),
};
const MOODS: [number, Mood][] = [
  [0, "neutral"], [S(1), "happy"], [at(1, "تو"), "curious"], [S(2) + 0.4, "sad"], [S(3), "think"], [at(3, "اسلاید"), "search"],
  [S(4), "curious"], [at(4, "دستام"), "soft"], [S(5), "happy"], [S(6), "curious"], [T_STARS, "wide"], [S(7), "heart"],
  [at(7, "دیدی"), "happy"], [S(8), "soft"], [E(10) + 0.6, "think"],
];

const screenAt = (t: number, vH: number): ScreenState => ({
  slide: ramp(t, T_NEXT, T_NEXT + 0.3),
  practice: ramp(t, T_PRACTICE, T_PRACTICE + 0.5),
  ready: ramp(t, at(7, "نمی‌لرزن"), at(7, "نمی‌لرزن") + 0.4),
  level: t > T_PRACTICE && t < E(6) + 0.2 ? vH : 0,
  timer: Math.max(0, Math.min(t, E(7)) - T_PRACTICE),
  dim: 0.85 * ramp(t, S(9), S(10)),
  twinkle: 0.4 + 0.6 * hit(t, T_NEXT, 0.9),
});

export function buildDirector(w: World, camera: THREE.PerspectiveCamera) {
  const voice = makeVoice(WORDS, (si) => SPEAKER[si]);
  const update = (t: number) => {
    const vH = voice(t, "H"), vR = voice(t, "R");
    drawScreen(w.screen.ctx, t, screenAt(t, vH));
    w.screen.tex.needsUpdate = true;
    applyHuman(w, t, sample(HUMAN_REST, H, t), vH);
    const rp = sample(ROBOT_REST, R, t);
    rp.spin = t > T_PRACTICE ? (t - T_PRACTICE) * 0.35 : 0;
    rp.glow = 0.55 * hit(t, T_GREAT, 0.5) + 0.25 * hit(t, T_PRACTICE, 0.4);
    applyRobot(w, t, rp, vR, moodAt(MOODS, t));
    const dim = ramp(t, S(9), S(10));
    w.scrLight.intensity = 2.0 * (1 - 0.55 * dim) + 0.6 * rp.glow;
    w.bloom.intensity = 0.85 + 0.9 * rp.glow;
    // whose line is it now (two-shots focus on the speaker)
    let li = 0;
    for (let i = 0; i < SPEAKER.length; i++) if (t >= S(i) - 0.1) li = i;
    applyCamera(w, camera, SHOTS, t, DUR, { talking: SPEAKER[li], jolt: 0.012 * hit(t, T_GREAT, 0.18) });
  };
  return { update, render: w.render };
}
