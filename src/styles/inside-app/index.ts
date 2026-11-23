// Inside App — music reels inside a (neutral) AI chat app on a phone: a slash command typed on the iOS keyboard, the
// assistant's status line, the result developing in a card through a dot screen, the card blowing up full screen on
// the beat; an outro grid of every effect and a comment CTA. Effects follow one contract (FxProps: tau, full, tile).
export { C, F, APP, BEAT, PH, FPS, W, H, K, s, setPalette, setBeat, hit, hitPulse, clamp, mix, ramp, ease, hash, u, fullOf, TAU0, fullTau, TimeCtx, useT, type Attach, type Seg } from "./lib/theme";
export { useAppFonts, fontsReady } from "./lib/fonts";
export type { FxProps, FxDef } from "./lib/types";
export { Hamburger, Compose, Plus, Sliders, Mic, ArrowUp, Close, Play, Shift, Backspace, Glyph } from "./lib/icons";
export { Keyboard, KB_TOP, keyRect } from "./lib/keyboard";
export { TopBar, AttachBox, Composer, composerGeo, Suggest, InputBar, Status, Pill, lineW } from "./lib/phone";
export { SegmentScreen, ResultCard, typing, textW, PILL_Y, bubbleAtt } from "./lib/segment";
export { Outro, makeGridPage, type OutroText, type Tile } from "./lib/outro";
export { makeWordLock } from "./fx/word-lock";
export { makeLedWall } from "./fx/led-wall";
export { makeGlassStat, type GlassText } from "./fx/glass-stat";
export { InsideAppDemo, InsideAppAt, type DemoProps } from "./demo/Video";
export { SEGS, FX, OUT, OUTRO, segStart, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
