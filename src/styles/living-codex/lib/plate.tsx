// Living Codex · the frame around everything: the film grade (vignette, grain on twos, a hair of gate weave), the
// museum-plate chapter card, and Persian subtitles that appear word by word at the bottom.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Embers, Motes, Vignette } from "./fx";
import { C, F, clamp, easeInOut, easeOut, hash1, hexA, ramp, sstep } from "./theme";
import type { Word } from "./words";

/** the grade over everything: soft vignette, film grain (12 fps), a hair of gate weave */
export const Grade: React.FC<{ children: React.ReactNode; grain?: number }> = ({ children, grain = 0.06 }) => {
  const f = useCurrentFrame();
  const g = Math.floor(f / 2);
  const wx = (hash1(g) - 0.5) * 1.2, wy = (hash1(g + 7.3) - 0.5) * 1.2;
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ transform: `translate(${wx}px, ${wy}px)` }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 55%, rgba(4,5,9,0.55) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ opacity: grain, mixBlendMode: "overlay", pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${g % 97}'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />
    </AbsoluteFill>
  );
};

/** the chapter card: a small tracked label, a gold rule that draws, a big title rising out of blur, a Latin line */
export const ChapterPlate: React.FC<{ t: number; label: string; title: string; latin?: string; outAt?: number }> = ({ t, label, title, latin, outAt = Infinity }) => {
  const rule = easeInOut(ramp(t, 0.1, 0.9));
  const ti = easeOut(ramp(t, 0.35, 1.2));
  const la = easeOut(ramp(t, 0.9, 1.6));
  const out = 1 - sstep(outAt - 0.5, outAt, t);
  return (
    <AbsoluteFill style={{ background: C.ink, opacity: out }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 50% at 50% 55%, ${hexA("#3a1d08", 0.9)} 0%, rgba(7,9,15,0) 70%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: F.fa, fontSize: 34, color: C.amber, opacity: clamp(rule * 1.5) }}>{label}</div>
      <div style={{ position: "absolute", left: 960 - 260 * rule, top: 428, width: 520 * rule, height: 2, background: C.amber, boxShadow: `0 0 14px ${hexA(C.amber, 0.8)}` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", fontFamily: F.faBold, fontSize: 120, color: C.bone, opacity: ti,
        transform: `translateY(${(1 - ti) * 24}px)`, filter: `blur(${(1 - ti) * 10}px)`, textShadow: `0 0 40px ${hexA(C.amber, 0.25)}` }}>{title}</div>
      {latin && <div style={{ position: "absolute", left: 0, right: 0, top: 680, textAlign: "center", fontFamily: F.serif, fontSize: 26, color: C.bone, opacity: 0.7 * la, letterSpacing: "0.4em", textTransform: "uppercase" }}>{latin}</div>}
      <Embers t={t} n={46} seed={301} box={[360, 500, 1560, 1000]} rise={90} size={2.2} opacity={0.7} drift={70} />
      <Motes t={t} n={40} seed={302} size={1.6} opacity={0.3} />
      <Vignette a={0.7} />
    </AbsoluteFill>
  );
};

/** subtitle chunks: ≤ maxWords words, broken after punctuation */
export const makeChunks = (words: Word[], maxWords = 7) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    if (!next || next.si !== w.si || cur.length >= maxWords || /[،,.؛:!?؟]$/.test(w.w)) {
      out.push(cur);
      cur = [];
    }
  });
  return out;
};

/** Persian subtitles at the bottom: the whole chunk's place is reserved, each word appears when it is said */
export const Subtitle: React.FC<{ t: number; chunks: Word[][]; y?: number }> = ({ t, chunks, y = 930 }) => {
  const c = chunks.find((ch, i) => t >= ch[0].s - 0.05 && t < Math.min(ch[ch.length - 1].e + 0.5, (chunks[i + 1]?.[0].s ?? Infinity) - 0.05));
  if (!c) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 160, right: 160, top: y, textAlign: "center", fontFamily: F.fa, fontSize: 46, lineHeight: 1.5, color: C.bone,
      textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.6)" }}>
      {c.map((w, i) => (
        <span key={i} style={{ opacity: easeOut(ramp(t, w.s - 0.04, w.s + 0.12)) }}>
          {w.w}
          {i < c.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};
