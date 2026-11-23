// Lowpoly Dialogue 3D — two characters talking at night on the edge of a laptop: a young man in a hoodie and a small
// white robot with a screen face, low-poly and flat-shaded (three.js), big-bokeh depth of field, a city window behind.
export { FPS, W, H, COL, FA, UI, MONO, HUD, clamp, lerp, ramp, ease, inK, win, hit, rnd, wob } from "./lib/theme";
export { useDialogueFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { K, move, track, steps, type Keys } from "./lib/keys";
export { buildHuman, buildRobot, sitLegs, setArm, type Arm, type Leg, type Human, type Robot } from "./lib/chars";
export { drawFace, drawCore, FACE_W, FACE_H, CHEST, type Face } from "./lib/face";
export { drawScreen, SCREEN_W, SCREEN_H, type ScreenState } from "./lib/screen";
export { buildWorld, LID_TILT, LID_H, LID_W, HUMAN_X, ROBOT_X, type World } from "./lib/world";
export {
  makeVoice, blinkAt, sample, applyHuman, applyRobot, moodAt, applyCamera, shotIndex, headPt, HUMAN_REST, ROBOT_REST,
  type Who, type Mood, type V3, type HumanPose, type RobotPose, type Tracks, type Shot,
} from "./lib/perform";
export { Subs, subLines, type SubLine } from "./lib/subs";
export { LowpolyDialogueDemo, type DemoProps } from "./demo/Video";
export { buildDirector, SHOTS, screenShotAt } from "./demo/director";
export { LINES, SPEAKER, WORDS, TL, DUR, FRAMES, LOOK, TAIL } from "./demo/script";
export { Compositions } from "./Compositions";
