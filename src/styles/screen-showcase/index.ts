// Screen Showcase — reels that show a thing being built on screen (a site, an app, a workflow): the result first, the
// prompt typing, the agent's steps, the code writing itself, a camera that tours the screen with labelled frames and
// click rings, a live edit, one click to publish. Your screen recording or a page built in code.
export { C, FA, LATIN, MONO, FPS, W, H, SHADOW, setPalette, accentA, clamp, ramp, lerp, eo, eio, pop, faNum, TimeCtx, useT } from "./lib/theme";
export { useShowcaseFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { CamView, Vid, camAt, type Key, type Mark, type Ripple, type Clip } from "./lib/cam";
export { Win, CH, enter, Chip, Backdrop, TopBar, StatusLine, Dots } from "./lib/chrome";
export { PromptBox, Step, Editor } from "./lib/code";
export { Subtitle, makeChunks, type Chunk } from "./lib/subtitle";
export { ScreenShowcaseDemo, ScreenShowcaseAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, SC, K, PROMPT, EDIT, CHUNKS, LOOK, FRAMES, DUR } from "./demo/script";
export { DemoSite, Photo, SITE, SITE_W, SITE_H } from "./demo/site";
export { Compositions } from "./Compositions";
