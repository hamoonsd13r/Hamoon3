// Market File · demo footage map. The kit ships no video: put your clips in public/<your folder>/ and name them here.
// A slot left empty plays a labelled placeholder, so the film always renders. One clip per phrase; never reuse one.
// Free sources and how to cut them: FOOTAGE.md (tools/footage.mjs). Every credit goes on the clip (shown bottom-left).
//   "cocoa-macro": { src: "v01/clips/cocoa-macro.mp4", w: 1920, h: 1080, dur: 9.4, credit: "COVERR" },
//   "market-screen": { src: "v01/clips/board.mp4", w: 1280, h: 720, dur: 12, credit: "MIXKIT", focus: [640, 300] },
//   a still photo: dur 0 → { src: "v01/photos/farm.jpg", w: 2400, h: 1600, dur: 0, credit: "NASA · PUBLIC DOMAIN" }
import type { Clip } from "../lib/media";

export const MEDIA: Record<string, Clip | undefined> = {};
