// Premiere Showcase — a showcase of many films (a course's, a team's, a festival's) on the beat: a trailer opening
// (a barrage, a giant number with the films inside it, genres as windows, a 3D rush), every film on its own glass
// screen with an ambilight, a hexagon wall of all of them with their total running time, the films inside the words.
export { C, F, FPS, W, H, GRID, beat, setPalette, accentA, clamp, ramp, lerp, ease, hash, runtime, TimeCtx, useTF } from "./lib/theme";
export { usePremiereFonts, fontsReady, measure } from "./lib/fonts";
export { FilmView, Scene, type Film } from "./lib/film";
export { KText, fitK, runsWidth, shakeAt, type KLine, type KRun, type KMode, type KFill } from "./lib/kinetic";
export { Montage, Captions, Counter, Chip, makeShots, rectOf, TR_D, KEEP_OLD, COL, CARD_CY, CARD_W, type Shot, type Tr, type Rect } from "./lib/montage";
export { Wall, TILE, type WallTimes } from "./lib/wall";
export { PremiereShowcaseDemo, PremiereShowcaseAt, type DemoProps } from "./demo/Video";
export { FILMS, SHOTS, ROWS, WALL_T, WALL_TIMES, T_END, HITS, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
