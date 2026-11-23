// Verdict Noir · the backdrop behind every scene. Ink black; per section ONE pool of light in its colour (danger red
// by default, almost none for the dark beat), a giant outlined serif word sliding slowly behind everything, faint
// legal-pad rules with one red margin line drifting up, a vignette. Sections cross-fade over 0.8 s. Pure function of t.
import React from "react";
import { C, F, clamp, ease } from "./theme";

/** one section of the backdrop: from `at`, light colour (hex), light amount 0..1, the giant English word */
export type Bg = { at: number; glow?: string; k?: number; word: string };

const hex2 = (k: number) => Math.round(255 * clamp(k)).toString(16).padStart(2, "0");

const Layer: React.FC<{ t: number; bg: Bg; o: number; i: number; beat: number }> = ({ t, bg, o, i, beat }) => {
  const lt = t - bg.at;
  const glow = bg.glow ?? C.red;
  const k = bg.k ?? 0.5;
  const lx = 540 + 220 * Math.sin(t * 0.21 + i), ly = 520 + 160 * Math.sin(t * 0.17 + i * 1.7);
  const slide = ((lt * 38) % 2600) - 600;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(900px 760px at ${lx}px ${ly}px, ${glow}${hex2(k * (0.82 + 0.18 * beat))} 0%, transparent 70%)`, mixBlendMode: "screen", opacity: 0.5 }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(1200px 900px at 540px 1650px, ${glow}22 0%, transparent 70%)` }} />
      {[0, 1].map((r) => (
        <div key={r} style={{ position: "absolute", top: r ? 1180 : 210, left: 0, whiteSpace: "nowrap", fontFamily: F.serif, fontWeight: 700, fontSize: 250, lineHeight: 1, letterSpacing: 6, color: "transparent", WebkitTextStroke: `2px rgba(244,238,230,${0.055 + 0.02 * beat})`, transform: `translateX(${r ? -slide - 400 : slide - 1800}px)` }}>
          {`${bg.word} · ${bg.word} · ${bg.word} · ${bg.word}`}
        </div>
      ))}
    </div>
  );
};

const Pad: React.FC<{ t: number }> = ({ t }) => {
  const off = (t * 14) % 64;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: -64, bottom: -64, transform: `translateY(${-off}px)`, backgroundImage: "repeating-linear-gradient(180deg, transparent 0 63px, rgba(244,238,230,0.035) 63px 64px)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 128, width: 2, background: "rgba(229,50,45,0.16)" }} />
    </div>
  );
};

/** `bgs` sorted by time; `bpm` makes the light breathe on the bar (0 = off) */
export const Backdrop: React.FC<{ t: number; bgs: Bg[]; bpm?: number }> = ({ t, bgs, bpm = 0 }) => {
  let cur = 0;
  for (let i = 0; i < bgs.length; i++) if (t >= bgs[i].at) cur = i;
  const f = ease.inOut(clamp((t - bgs[cur].at) / 0.8));
  const bar = bpm > 0 ? (240 / bpm) : 0;
  const beat = bar ? Math.exp(-((t / bar) % 1) * bar * 4) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.ink, overflow: "hidden" }}>
      {cur > 0 && f < 1 ? <Layer t={t} bg={bgs[cur - 1]} o={1 - f} i={cur - 1} beat={beat} /> : null}
      <Layer t={t} bg={bgs[cur]} o={cur === 0 ? 1 : f} i={cur} beat={beat} />
      <Pad t={t} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 55% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
    </div>
  );
};
