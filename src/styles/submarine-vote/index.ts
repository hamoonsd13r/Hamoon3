// Submarine Vote — a cartoon «who stays behind?» format: a cast of cel characters (code-drawn SVG, poses that mix)
// stuck in a flooding room with a four-seat pod; each one speaks on a phone voice screen and names who should stay.
export { F, FPS, W, H, clamp, ramp, lerp, out3, io, kick, hash, noise, faNum, TimeCtx, useT } from "./lib/theme";
export { useVoteFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { Char, Tag, POSE, mixPose, COL, GEO, CHAR_TOP, CHAR_HW, INK, type Model, type Pose, type Mouth, type Arms } from "./lib/cast";
export { Room, Water, Lineup, type Member } from "./lib/scene";
export { PhoneScreen, ampOf, chunkOf } from "./lib/voice";
export { SubmarineVoteDemo, SubmarineVoteAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, K, NAMES, CAST, SPEAK, nameAt, waterY, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
