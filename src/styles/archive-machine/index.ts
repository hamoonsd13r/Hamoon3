// Archive Machine — a machine reads the archive: a 3D city of data around a glowing core (three.js: instanced data
// cells, a light wave from the core, a dive through archive thumbnails, bloom and zoom blur), HUD locks and labels,
// archive plates that push in with the core's tint on them, a counter montage that runs across the cuts, glitches and
// film grain. Every frame is a pure function of film time.
export * from "./lib/theme";
export { Brackets, DataRain, Glitch, Label, Lock, Vid } from "./lib/hud";
export { CoreTint, Plate, clip, coverBox, staticPhoto, still } from "./lib/plate";
export { buildWorld } from "./lib/world";
export { ArchiveMachine, FRAMES, type FilmProps } from "./demo/Video";
export { Compositions, LOOK } from "./Compositions";
