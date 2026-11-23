// Noir Panel — minimal cinematic reels: near-black with ONE rounded footage window, a chapter tag and a mono brand line
// above it, the source on the footage, white subtitles under it with key words in one accent; code-drawn beats
// (year line, a month of days, big mono words, a slip, a split, a line chart, old → new jobs) live inside the window.
export { C, FA, MONO, FPS, W, H, PANEL, SUB_Y, SHADOW, setPalette, accentA, clamp, ramp, easeOut, easeInOut, back, rnd, faNum, TimeCtx, useT } from "./lib/theme";
export { useNoirFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { Slot, Vid, Footage, ShotView, SubMask, Grad, Window, Backdrop, SourceLabel, Chrome, HookTitle, Subtitle, Mark, makeChunks, panelMix, type Clip, type Media, type Shot, type Chunk, type ChunkOpts } from "./lib/panel";
export { card, YearLine, Dissolve, DayGrid, BigWord, Meter, Slip, Clock, Progress, Split, LineChart, SwapList, NumList, EndCard, type Side } from "./lib/overlays";
export { NoirPanelDemo, NoirPanelAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, K, TAGS, BRAND, SHOTS, CHUNKS, LOOK, FRAMES, DUR } from "./demo/script";
export { MEDIA } from "./demo/media";
export { Compositions } from "./Compositions";
