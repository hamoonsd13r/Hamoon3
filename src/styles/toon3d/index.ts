// Toon3D: 2D cartoon characters (flat ink cards) in a coloured 3D world, rendered with three.js inside Remotion.
// Public API (the card styles/toon3d.md is the guide; read it before any code):
//   lib/kit   the film's clock (narration words -> captions, shots, cues), the camera grammar (glides, push-ins, caption-
//             safe framing presets) and the film component (post chain, dissolves, captions, Look / QA / plan passes)
//   lib/base  the look (MIT template, see LICENSE): character cards, two-tone shading, ink, lens blur, grade, painters
//   lib/sea   a ready world: toon sea with a big wave and an oil slick, two ships, rain, lightning, a galley, the cast
//   demo/     the neutral demo film (copy it to start a video: pipeline/new-video.mjs)
export { makeFilm, type FilmSpec, type FilmProps, type WorldLike, type QAPoint } from "./lib/kit/film";
export { makeTiming, makeShots, makeCues, FLASH_ENV, SMALL_FA, bare, clamp01, smooth, smoother, easeOut, easeIn, lerp, type Vo, type Word, type Card } from "./lib/kit/timeline";
export { camRun, push, sway, clear, aimAt, placeFrom, distFor, closeUp, medium, twoShot, wide, SAFE, mixV, addV, subV, lenV, type CK, type CamDef, type V3 } from "./lib/kit/camera";
export { SeaWorld, type FrameDef, type SStage, type StageCtx, type ShipPose, type Space } from "./lib/sea/world";
export { WHO, put, putDog, cookPour, contact, fxAt, lidAt, setSun } from "./lib/sea/cast";
export { LIGHTS, LOOK, GRADES, mixGrade, mixLight, type SLight } from "./lib/sea/lights";
export { DemoFilm, DemoFilmLook, DEMO_FRAMES, DEMO_FPS, DEMO_LOOK } from "./demo/Video";
export { Compositions } from "./Compositions";
