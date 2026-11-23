// Living Codex — history documentaries by candlelight: a manuscript page in extreme macro (blackletter ink turning to
// gold leaf), carved reliefs in raking torchlight, a year odometer that slams into a new number, a museum-plate card.
export { C, F, FPS, TimeCtx, useT, clamp, ramp, lerp, sstep, win, env, easeOut, easeInOut, backOut, expOut, rng, hash1, vnoise, fbm, wob, flick, hexA, fmt, spline } from "./lib/theme";
export { useCodexFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { Embers, Motes, Stars, Glow, Vignette, Sweep, PopDot, Lbl, Frame } from "./lib/fx";
export { parchmentURL, stoneURL, noiseField, maskURL, maskCSS } from "./lib/tex";
export { GLYPHS, Relief, GlyphLine, RoleIcon, ROLE_ICON, humanPath, type GlyphId } from "./lib/glyphs";
export { CodexPage, CODEX_PHRASES, type CodexKey, type CodexProps } from "./lib/codex";
export { StoneWall, type ReliefItem } from "./lib/stone";
export { Odometer } from "./lib/odometer";
export { Grade, ChapterPlate, Subtitle, makeChunks } from "./lib/plate";
export { LivingCodexDemo, LivingCodexAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, K, SC, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
