// Market File — news and market reels built footage-first: one full-frame footage bed cut on the narration's words,
// the kinetic headline with the accent chip on the spoken word, data (chart, big number, dots, map, phases, curve,
// verdict rows) as overlays, the accent flood on the question and the end card.
export { C, INK, FA, LATIN, MONO, W, H, FPS, setPalette, accentA, easeOut, easeCinema, clamp, ramp, lerp, win, kick, io, rng, faNum, faMoney } from "./lib/theme";
export { useFileFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { MonoLbl, ChipTok, ChipLabel, Head, Src, Tag, BigNum, Eyebrow, Btn, measure, type Tok, type On } from "./lib/type";
export { Bed, Full, Panel, Vid, Slot, Gradients, Credit, GRADE, sceneK, type Clip, type Shot } from "./lib/media";
export { Glass, Check, Cross, Warn, Dash, MarkIcon, Row, Glitch, Reticle, type Mark } from "./lib/marks";
export { Hud, Grain, Brow, BrandTile, BrandMark, Flood, floodOn, makeShake, type BrowItem } from "./lib/chrome";
export { LineChart, DotGrid, PhaseCard, PhaseBar, Curve, HeroNumber, Multiplier } from "./lib/charts";
export { NewsMap, MapBox, mapXY, smoothPath, type LL, type Pin, type MapLabel, type MapRoute } from "./lib/map";
export { MarketFileDemo, MarketFileAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, SC, SHOTS, BROWS, HITS, LOOK, FRAMES, DUR } from "./demo/script";
export { MEDIA } from "./demo/media";
export { Compositions } from "./Compositions";
