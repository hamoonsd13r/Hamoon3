// Inside App · a dark AI chat app on a phone, measured on a real app reference (720×1280) and drawn ×1.5: a slash
// command is typed on the iOS keyboard, sent, the assistant answers "Editing with …", the result develops in a card
// through a dot screen and blows up to full screen on the beat. Neutral app (no vendor name, glyph or colour).
// Every frame is a pure function of film time. Your app/brand: setPalette({ accent, send, pill, pillText }) + APP.
import React from "react";

export const FPS = 30, W = 1080, H = 1920;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const ease = {
  in: (x: number) => clamp(x) ** 3,
  out: (x: number) => 1 - (1 - clamp(x)) ** 3,
  inOut: (x: number) => {
    const c = clamp(x);
    return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
  },
  outBack: (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
};
export const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const u = (t: number, a: number, d: number) => clamp((t - a) / d);

// ── the beat grid: one hit every P seconds (129.6 BPM by default; set it to your track) ────────────────────────
export const BEAT = { P: 0.92591, first: 0.925 };
export const setBeat = (P: number, first: number) => Object.assign(BEAT, { P, first });
/** film time of hit k (hit 0 = `first`) */
export const hit = (k: number) => BEAT.first + BEAT.P * k;
/** a sharp 0..1 pulse on every hit */
export const hitPulse = (t: number, decay = 7) => {
  const x = (t - BEAT.first) / BEAT.P;
  return Math.exp(-(x - Math.floor(x)) * BEAT.P * decay);
};

// ── the reference phone is 720×1280; s() scales its pixels to 1080×1920 ──────────────────────────────────────
export const K = 1.5;
export const s = (x: number) => x * K;

/** the app palette (dark) */
export const C = {
  bg: "#141519",
  panel: "#1E1F25", // composer, segmented control, top buttons
  panelHi: "#2E3038", // selected segment
  sugg: "#272930", // slash-suggestion row
  card: "#1B1C21", // empty result card
  border: "rgba(255,255,255,0.065)",
  text: "#F1F2F5",
  text2: "#A3A6AE",
  text3: "#72757E",
  desc: "#8C8F98",
  accent: "#6E8BFF", // the assistant's glyph, the cursor, accents
  send: "#5B78F0", // the send button
  pill: "#1E2547", // the user's command pill
  pillText: "#9DB2FF",
  bubble: "#2A2C33",
  kb: "#1C1D22",
  key: "#3A3C43",
  keyFn: "#2A2C32",
  keyText: "#E3E5EA",
  keyPop: "#5A5C64",
};
export const setPalette = (p: Partial<typeof C>) => Object.assign(C, p);
/** app strings (English UI like most AI apps; Persian lines go through `rtl`) */
export const APP = { tabs: ["Chat", "Create"] as [string, string], placeholder: "Ask anything...", greeting: "Good evening" };

export const F = {
  ui: "IAInter", // Inter — app UI and keyboard
  fa: "IAVazirBlack", // Vazirmatn Black — Persian display
  vz: "IAVazir", // Vazirmatn — Persian UI lines
  vzB: "IAVazirB",
  serif: "IABaskerville", // Libre Baskerville — old print in the effects
  mono: "IAMono", // IBM Plex Mono — typewriter / data
};

// ── attachments and command rounds ─────────────────────────────────────────────────────────────────────────────
export type Attach =
  | { kind: "clip"; src: string } // a video thumbnail (public path) with a play icon
  | { kind: "image"; src: string } // a still thumbnail
  | { kind: "pasted"; lines: string[] } // a pasted-text chip ("PASTED")
  | { kind: "swatch"; from: string; to: string; label?: string; play?: boolean }; // a code-drawn thumbnail
export type Seg = {
  id: string; // the effect id = the slash command without "/"
  verb: "Editing" | "Animating" | "Building";
  desc: string; // the slash-suggestion description
  attach: Attach;
  typed: number; // characters typed before the autocomplete fills the rest (after "/")
};

/** phase times inside a round, seconds after its start (measured on the reference at 30 fps) */
export const PH = {
  slash: 0.1, // "/" typed, the suggestion row appears
  key: 0.1, // one more character every 0.1 s
  auto: 0.5, // the autocomplete fills the command
  send: 0.62, // send: keyboard + composer go down, the message flies to the top right
  sendDur: 0.12,
  status: 0.78, // the glyph pops, "Editing with …" types in
  card: 0.9, // the empty result card fades in
  dither: 1.05, // the result appears through a dot screen …
  sharp: 1.32, // … fully resolved
  expand: 1.72, // the card blows up to full screen …
  get full() {
    return BEAT.P * 2; // … and lands exactly on a hit
  },
  get end() {
    return BEAT.P * 3; // next round
  },
};
/** effect clock: τ = 0 when the card appears; full-screen landing at FULL_TAU */
export const TAU0 = PH.card;
export const fullTau = () => PH.full - PH.card;
/** the film's blow-up curve as seen by an effect: 0 in the card, 1 full screen */
export const fullOf = (tau: number) => ease.inOut((tau - (fullTau() - 0.132)) / 0.132);

export const TimeCtx = React.createContext({ t: 0, frame: 0 });
export const useT = () => React.useContext(TimeCtx);
