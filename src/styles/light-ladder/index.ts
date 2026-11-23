// Light Ladder — explainers about levels and stages: one light point climbs obsidian steps (lit edges, glossy
// reflection, ghost steps with «؟»), a head of light dots fills up, an intelligence ruler with portraits, A?I tiles with
// a spinning letter, a meter, a «we are here» marker, a poll; phrase captions with the spoken word lit.
export { C, FA, MONO, LATIN, FPS, W, H, setPalette, lightA, rgb, clamp, ramp, lerp, win, kick, io, easeOut, back, rng, faNum, TimeCtx, useT } from "./lib/theme";
export { useLadderFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { Backdrop, Orb, Stairs, stepTop, DotHead, HEAD_BOX, Medallion, ZetaPlot, VennPlot, FlowPlot, Stamp, FieldIcon, lerpPt, hop, type Step, type StairGeo, type Island } from "./lib/stage";
export { Dot, MonoLbl, Pill, CardBox, Corners, LevelHead, Tiles, Meter, Ruler, Marker, Poll, Caps, makeChunks, type Chunk } from "./lib/ui";
export { LightLadderDemo, LightLadderAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, K, SC, WORDS_BG, CHUNKS, CAP_HIDE, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
