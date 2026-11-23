// Explore Wall — results reels: an endless Instagram-style wall of reel covers with their view counts, flown by a 3D
// camera; dives into one reel for proof (its screenshot with the number ringed, usernames blurred); follower jumps;
// the whole wall with the total; an empty slot «the next one is yours» for the call to action.
export { C, F, FPS, W, H, SD, MUSIC, setPalette, accentA, clamp, ramp, mix, ease, hash, pop, beatPulse, fmtV, TimeCtx, useT } from "./lib/theme";
export { useWallFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { World, camKF, drift, Captions, Punch, Lift, Scrim, Tag, Vid, type Cam, type Cap, type Rect as LiftRect } from "./lib/kit";
export { MosaicWall, CodeTile, ImgTile, TileView, Views, tileFrom, CELL, cellX, cellY, cellCenter, wallSize, type Tile, type WallP } from "./lib/wall";
export { ProofShot, shotToFrame, type Rect, type Patch, type Ring, type ProofP } from "./lib/proof";
export { ExploreWallDemo, ExploreWallAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, SC, TILES, TOTAL, COLS, ROWS, HERO, SLOT, CAPS, LOOK, FRAMES, DUR } from "./demo/script";
export { ReelInsights, ProfileHeader, INS, PRO } from "./demo/screens";
export { Compositions } from "./Compositions";
