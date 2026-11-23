// Demo timing on the style's clock (lib/kit/timeline.ts): the narration's words. The demo ships without a voice, so
// vo.json is SAMPLE timing for the neutral script in script.txt; your film's vo.json comes from the voice pipeline
// (pipeline/README.md). Every cue in story.ts reads a word onset (W), so a re-voiced line moves its shots, captions,
// lightning and sound cues with it.
import VO from "./vo.json";
import { makeTiming, type Vo } from "../lib/kit/timeline";
export { clamp01, smooth, smoother, easeOut, easeIn, lerp } from "../lib/kit/timeline";

/** tail: the picture runs 1.2 s past the last word (the last sound rings out, then the film ends: no outro) */
const TM = makeTiming(VO as unknown as Vo, { tail: 1.2 });
export const { FPS, TOTAL, W, WE, LINE0, LINE1, CARDS, cardAt } = TM;
/** reaction lead: visual beats land 2 frames before their word */
export const LEAD = 2 / FPS;

// ---------------- lightning: the kit's measured exposure envelope on these strikes (s) ----------------
export const STRIKES: number[] = [W("کشتی", 4) - 1 / FPS];
export const flashAt = TM.flashOf(STRIKES);
