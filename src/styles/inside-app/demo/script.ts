// Inside App · demo script: a 9:16 music reel (no narration) — three slash commands typed in the app, each result
// develops in a card and blows up full screen on the beat; then the outro grid and the comment CTA.
// Swap the commands (SEGS), the effects (FX) and the outro text; set the beat grid to your track (setBeat).
import { PH, hit, type Seg } from "../lib/theme";
import type { FxDef } from "../lib/types";
import type { OutroText } from "../lib/outro";
import { makeGlassStat } from "../fx/glass-stat";
import { makeLedWall } from "../fx/led-wall";
import { makeWordLock } from "../fx/word-lock";

export const FPS = 30;

export const SEGS: Seg[] = [
  { id: "word-lock", verb: "Editing", desc: "One word locked, the page cuts through time", attach: { kind: "pasted", lines: ["one word,", "135 years"] }, typed: 3 },
  { id: "led-wall", verb: "Building", desc: "Any number rebuilt on a live LED wall", attach: { kind: "swatch", from: "#4A2B10", to: "#120A06", label: "1928", play: true }, typed: 3 },
  { id: "glass-stat", verb: "Editing", desc: "A glass card with a live graph over the shot", attach: { kind: "swatch", from: "#2C1A3E", to: "#0A0D1C", play: true }, typed: 3 },
];

export const FX: FxDef[] = [
  { id: "word-lock", Comp: makeWordLock("ایده"), loop: 1.85 },
  { id: "led-wall", Comp: makeLedWall(["1928", "1958", "1984", "2026"]), loop: 2.2 },
  { id: "glass-stat", Comp: makeGlassStat({ label: "شاخص انرژی", tag: "LIVE INDEX", from: 61, to: 90, delta: "29" }), loop: 2.6 },
];

export const OUT: OutroText = {
  cmd: "/effects",
  desc: "Every effect, one prompt each",
  reply: "کلمه‌ی «افکت» رو کامنت کن تا پرامپت‌ها رو برات بفرستم",
  title: "افکت با هوش مصنوعی",
  sub: "3 effects · one prompt each",
  cta: "کامنت کن «افکت»",
  ctaPill: "پرامپت همه‌ی افکت‌ها رو برات می‌فرستم",
};

/** round i starts on hit 3i−1 (round 0 at 0); the outro on the hit after the last round */
export const segStart = (i: number) => (i === 0 ? 0 : hit(3 * i - 1));
export const OUTRO = hit(3 * SEGS.length - 1);
export const DUR = +(OUTRO + 5.7).toFixed(2);
export const FRAMES = Math.round(DUR * FPS);

/** Look frames (props { times }) */
export const LOOK = [...SEGS.flatMap((_, i) => [0.35, 1.25, 1.6, 2.3].map((l) => segStart(i) + l)), ...[0.4, 1.5, 2.2, 3.6].map((l) => OUTRO + l)].map((x) => +x.toFixed(3));
void PH;
