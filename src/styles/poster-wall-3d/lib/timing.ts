// Poster Wall 3D · each card's clock. A poster clip lasts POSTER_LEN seconds and brings its title in at its own T_IN;
// a card shows its poster at reel time t + offset. The opening hero is already lit on frame 0 (its match flaring, the
// title complete), the ending hero's letters land on the last hit; every other poster brings its title in on the
// first beat after it comes into view, so the cascade rides the music and anything a poster does on its own beat
// grid (T_IN + k · BEAT) lands on the reel's beats.
import { FPS, clamp } from "./theme";
import { BEAT, BEAT0, beat, layout } from "./wall";

/** clip length in seconds (style-index posters: 6); set before the first frame if your clips differ */
export let POSTER_LEN = 6;
export const setClipLength = (s: number) => (POSTER_LEN = s);
export const T_IN = 2.0;
export const HERO_A_AT = T_IN + 0.14; // the opening hero's clip time on frame 0: fire up, flare at its peak, title in
export const HERO_B_IN = beat(19) - 0.46; // the ending hero's title starts here and is complete on the final hit

const offsetOf = (slot: string) => {
  if (slot.endsWith("@A")) return HERO_A_AT;
  if (slot.endsWith("@B")) return T_IN - HERO_B_IN;
  const f = layout().first[slot];
  if (f === undefined || f > HERO_B_IN) return 3.0;
  const e = Math.max(f + 0.15, 0.45); // the title may start once the card is in view
  return T_IN - beat(Math.ceil((e - BEAT0) / BEAT - 1e-6)); // … on the next beat
};
export const slotTime = (slot: string, t: number) => {
  const x = t + offsetOf(slot);
  if (slot.includes("@") || x < POSTER_LEN - 1 / FPS) return clamp(x, 0, POSTER_LEN - 1 / FPS);
  // loop the living part (after the intro) so short clips never freeze
  const loop = Math.max(0.5, POSTER_LEN - T_IN);
  return T_IN + ((x - T_IN) % loop);
};
