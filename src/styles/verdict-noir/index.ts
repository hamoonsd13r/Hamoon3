// Verdict Noir — courtroom-thriller reels about a profession: ink black, one danger red, cream legal paper, walnut and
// brass. A camera films a desk «world» (case files, legal pad, contract, clock, phone, request page); red ink stamps,
// scans, a stopwatch, choice pills, profession cards with a hunter's reticle; word-by-word captions; whip pans.
export { C, F, FPS, W, H, SD, setPalette, clamp, mix, ramp, ease, hash, kf, jolt, punch, pop, inn, out, faNum, TimeCtx, useT } from "./lib/theme";
export { useVerdictFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { World, camKF, drift, makeCaps, Captions, Punch, Lift, Scrim, Tag, Timer, Choice, useHBlur, Grain, Scenes, type Cam, type Cap, type Rect, type Scene } from "./lib/kit";
export { Backdrop, type Bg } from "./lib/backdrop";
export * from "./lib/props";
export { VerdictNoirDemo, VerdictNoirAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, K, SC, BGS, CAPS, CAP_HIDE, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
