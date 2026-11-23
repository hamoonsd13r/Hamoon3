// Poster Wall 3D — a tilted wall of posters (stills or clips) in a dark room, on a camera path cut to the beats:
// full-frame hero → pull-back → whips → cranes → second hero → recede. Depth of field in the card shader, sub-frame
// motion blur, bloom, grain. The layout places ~20 posters so no hold shows one twice and neighbours differ.
export * from "./lib/theme";
export { WallEngine, type SlotInfo, type EngineOpts } from "./lib/engine";
export { configureWall, layout, camAt, poseAt, beat, BEAT, BEAT0, MOVES, type WallCard, type WallCat, type WallConfig, type Card } from "./lib/wall";
export { slotTime, setClipLength, POSTER_LEN, T_IN } from "./lib/timing";
export { CARDS, USE_CLIPS, slotSource } from "./demo/cards";
export { PosterWallReel, type FilmProps } from "./demo/Video";
export { Compositions } from "./Compositions";
