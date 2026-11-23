// Talk Cutout · landscape demo clock: the same script and words as the vertical demo, laid out the landscape way —
// she is centred; cards live in two columns beside her (behind her cut-out); the parts where she explains the method
// are FULL-SCREEN windows («the camcorder films a screen»), and she comes back between them for her own lines.
import { FPS, T } from "../script";

export const FSW: [number, number][] = [
  [T.steps - 0.04, T.step3 - 0.06], // steps 1–2: the channel research
  [T.hoosh3 - 0.25, T.har4 - 0.06], // step 3: the AI (from «به هوش مصنوعی»)
  [T.har4 - 0.06, T.talk2], // publish weekly + the stats
];
export const inFS = (t: number) => FSW.some(([a, b]) => t >= a && t < b);
/** the cuts in and out of the full-screen windows (a tape glitch on each) */
export const FS_CUTS = FSW.flat();
export const WIDE_DUR = T.endHit + 2.0;
export const WIDE_FRAMES = Math.ceil(WIDE_DUR * FPS);
export const END_CARD = T.endHit - 0.06;
/** key moments for the landscape contact sheet */
export const WIDE_LOOK = [0.5, 2.3, 4.4, T.porbazdid + 0.3, T.dide + 0.35, T.step3 + 0.7, T.matn + 0.9, T.amar + 0.3, T.hoosh5 + 0.3, T.comment + 0.3, T.chek + 0.2, T.endHit + 0.8];
