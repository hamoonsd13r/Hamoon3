// Phone Assistant · captions on the night stage: a dark glass pill with chunks of ≤ 5 words, each word lighting up
// as it is said, key words in the accent; and the scene headline (a short line that rises above the phone).
import React from "react";
import { BODY, C, FA, clamp, easeOut, ramp } from "./theme";
import type { Word } from "./words";

export type Chunk = { s: number; e: number; ws: { w: string; s: number; key: boolean }[] };
export const makeChunks = (words: Word[], key: RegExp): Chunk[] => {
  const out: Chunk[] = [];
  for (const si of [...new Set(words.map((w) => w.si))]) {
    const ws = words.filter((w) => w.si === si);
    let cur: Chunk | null = null;
    ws.forEach((w, i) => {
      if (!cur) cur = { s: w.s, e: w.e, ws: [] };
      const cl = w.w.replace(/[:،,.؟?؛!«»]/g, "");
      cur.ws.push({ w: cl, s: w.s, key: key.test(cl) });
      cur.e = w.e;
      const len = cur.ws.map((x) => x.w).join(" ").length;
      if (/[،,.؟?؛!:]$/.test(w.w) || cur.ws.length >= 5 || len > 24 || i === ws.length - 1) {
        out.push(cur);
        cur = null;
      }
    });
  }
  for (let i = 0; i < out.length; i++) out[i].e = i + 1 < out.length ? Math.min(out[i + 1].s, out[i].e + 1) : out[i].e + 1;
  return out;
};

export const Caption: React.FC<{ t: number; chunks: Chunk[]; y?: number; hide?: boolean }> = ({ t, chunks, y = 1560, hide }) => {
  if (hide) return null;
  const ch = chunks.find((c) => t >= c.s - 0.02 && t < c.e);
  if (!ch) return null;
  const k = easeOut(ramp(t, ch.s - 0.02, ch.s + 0.25));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y - 56, display: "flex", justifyContent: "center" }}>
      <div dir="rtl" style={{ maxWidth: 940, padding: "16px 34px", borderRadius: 28, background: "rgba(12,12,19,.86)", boxShadow: `inset 0 0 0 1.5px ${C.line2}, 0 20px 50px rgba(0,0,0,.5)`, fontFamily: FA, fontWeight: 800, fontSize: 50, lineHeight: 1.35, textAlign: "center", opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
        {ch.ws.map((w, i) => (
          <span key={i} style={{ color: t >= w.s - 0.03 ? (w.key ? C.accent : C.fg) : "rgba(242,241,245,.28)" }}>
            {w.w}
            {i < ch.ws.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

/** a short headline above the phone (k = 0…1 in, out = 0…1 away) */
export const Headline: React.FC<{ k: number; out?: number; y: number; size?: number; children: React.ReactNode; sub?: React.ReactNode }> = ({ k, out = 0, y, size = 64, children, sub }) => {
  const e = easeOut(k) * (1 - clamp(out));
  if (e <= 0.001) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 60, right: 60, top: y, textAlign: "center", opacity: e, transform: `translateY(${(1 - e) * 26}px)` }}>
      <div style={{ fontFamily: FA, fontWeight: 900, fontSize: size, color: C.fg, lineHeight: 1.2 }}>{children}</div>
      {sub ? <div style={{ marginTop: 10, fontFamily: BODY, fontWeight: 600, fontSize: size * 0.48, color: C.fgMute }}>{sub}</div> : null}
    </div>
  );
};
