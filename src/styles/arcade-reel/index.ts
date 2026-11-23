// Arcade Reel — footage-first game reels: full-bleed gameplay with a camera (push, beat kicks, shake on hits), accent
// callouts that stay on a detail of the shot, a speedometer, a sound chip, a scrolling code wall, cards, a lock CTA and
// phrase captions with the spoken word lit. Two code-drawn plates (racer, shooter) stand in when there is no footage.
export { C, FA, MONO, LATIN, FPS, W, H, setPalette, accentA, clamp, ramp, lerp, kick, easeOut, io, back, rng, faNum, TimeCtx, useT } from "./lib/theme";
export { useArcadeFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { Dot, MonoLbl, Slot, Foot, StillImg, xf, boxOf, enterFx, camera, Callout, Pill, Caps, Speedo, SoundChip, CodeWall, CardBox, Lock, Avatar, type ClipInfo, type Frame, type CapWord } from "./lib/kit";
export { RacerPlate, ShooterPlate, RACER, SHOOTER } from "./lib/games";
export { ArcadeReelDemo, ArcadeReelAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, K, SC, CHUNKS, CAP_HIDE, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
