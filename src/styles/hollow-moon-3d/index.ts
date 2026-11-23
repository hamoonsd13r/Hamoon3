// Hollow Moon 3D — a photoreal brand intro (three.js): a hollow, broken moon over a storm sea at night, lightning on the
// first hit of the music, a great ring carrying your name, a plunge through the opening into a golden hall, and your
// logo cast in gold inside the core on the last hit. Card: styles/hollow-moon-3d.md
// Demo (= the accepted 35 s intro, with a neutral sample logo): Style-HollowMoon3D · stills: Style-HollowMoon3D-Look
export { Compositions } from "./Compositions";
export { HollowMoonVideo, ASSET_BASE, type FilmProps } from "./demo/Video";
export { LogoCard, type LogoCardProps } from "./demo/LogoCard";
export { FILM, SHOTS, CUT, MUSIC, bar, DUR, FPS, FRAMES, LOOK, LOGO_T, BRAND, FAR_FLASHES, fadeAt } from "./demo/film";
export { Engine, type EngineOpts, type MoonAssets } from "./lib/engine";
export { H, camAt, shotsAt, type Cam, type Key, type Shot, type FilmSpec } from "./lib/cam";
export { setBrand, LOGO, type Brand, type LogoPaths } from "./lib/brand";
export { THEME, hexToLinear, type Theme } from "./lib/theme";
export type { LogoTimes } from "./lib/logo";
