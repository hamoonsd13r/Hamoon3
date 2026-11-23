// Snow Castle 3D — a photoreal winter castle on a crag above a frozen loch (three.js): scanned PBR stone and slate,
// a real sky photograph for the light, snow, mist, lanterns and windows that light up on a clock from afternoon to dusk.
// Card: styles/snow-castle-3d.md · Demo (= the accepted 40 s intro): Style-SnowCastle3D · stills: Style-SnowCastle3D-Look
export { Compositions } from "./Compositions";
export { SnowCastleVideo, ASSET_BASE, type FilmProps } from "./demo/Video";
export { FILM, SHOTS, OPENING_TREES, DUR, FPS, FRAMES, LOOK, duskAt, litAt } from "./demo/film";
export { Engine, type EngineOpts, type SnowAssets } from "./lib/engine";
export { sampleShot, shotsAt, camPath, type Cam, type Key, type Shot, type FilmSpec } from "./lib/cam";
export { THEME, hexToLinear, type Theme } from "./lib/theme";
export { heightAt, forestAt, lakeDist } from "./lib/terrain";
