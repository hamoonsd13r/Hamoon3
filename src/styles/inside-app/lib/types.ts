// Inside App · the contract between the app shell and the effects (fx/*.tsx).
//
// An effect is ONE React component that draws a full 1080×1920 frame from its own clock τ (seconds):
//   τ = 0      the empty result card appears in the chat
//   τ 0.15→0.42 the card "develops": the shell shows the effect through a growing dot screen (dither reveal)
//   τ → 0.82   the effect plays INSIDE the chat card (scaled to 0.647 — it must read at that size)
//   τ 0.82→0.952 the card blows up to full screen; τ = 0.952 = FULL_TAU lands exactly on a music hit
//   τ → 1.878  full screen; at 1.878 (END_TAU, the next hit) the film hard-cuts to the next command
// Music hits fall on τ = 0.026, 0.952, 1.878 (every P = 0.926 s at 129.6 BPM); half-beats on τ ≈ 0.489, 1.415.
// The outro grid also plays every effect as a small looping tile: τ runs 0 → `loop` and repeats (default 3.0).
// Everything must be a pure function of τ (no state, no randomness without a seed).
import type React from "react";

export type FxProps = {
  tau: number;
  /** 0 while the effect sits in the chat card, 1 full screen (eases 0→1 during the blow-up) */
  full: number;
  /** true when drawn as a small tile in the outro grid (cheaper settings are fine) */
  tile?: boolean;
};
export type FxDef = {
  id: string;
  Comp: React.FC<FxProps>;
  /** tile loop length in seconds (default 3) */
  loop?: number;
};
