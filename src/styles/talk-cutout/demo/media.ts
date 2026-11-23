// Talk Cutout · YOUR media (public paths). The demo ships none: every unmapped name renders its code-drawn stand-in
// (the silhouette subject on a warm wall for talk.mp4 / talk_fg.webm), so the film always plays.
// After pipeline steps 1–5 put your two layers in public/v01/ and map them:
//   "talk.mp4": "v01/talk.mp4",          // your levelled take (BT.601 tags), 30 fps, full source length
//   "talk_fg.webm": "v01/talk_fg.webm",  // the cut-out: the SAME frames + a steady solid alpha (VP9 alpha)
// and fill SRC with your source's facts (pipeline/probe-cuts.py prints the black frames and the jump cuts).
import type { MediaMap } from "../lib/media";
import type { TalkSrc } from "../lib/talk";

export const MEDIA: MediaMap = {};
export const SRC: TalkSrc = { fps: 30 };
