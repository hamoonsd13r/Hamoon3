// Lowpoly Dialogue 3D · dialogue subtitles: one line at a time, white, in the upper third (top 380): frame every shot so
// the heads sit below y ≈ 620, so a line never crosses a character. On laptop-screen shots the line sits on a soft dark plate so it reads over the app.
import React from "react";
import { clamp, FA, ramp } from "./theme";
import type { Word } from "./words";

export type SubLine = { text: string; a: number; b: number };
/** one card per dialogue line: from its first word to a little after its last one (or until the next line starts) */
export const subLines = (lines: string[], words: Word[]): SubLine[] =>
  lines.map((text, i) => {
    const ws = words.filter((w) => w.si === i);
    const a = ws[0]?.s ?? 0, e = ws[ws.length - 1]?.e ?? a;
    const nx = words.find((w) => w.si === i + 1)?.s ?? e + 1.2;
    return { text, a, b: Math.min(e + 0.45, nx - 0.05) };
  });

export const Subs: React.FC<{ t: number; lines: SubLine[]; plate?: boolean; scale?: number; top?: number }> = ({ t, lines, plate = false, scale = 1, top = 380 }) => {
  const l = lines.find((x, i) => t >= x.a - 0.08 && t < x.b + 0.12 && !(lines[i + 1] && t >= lines[i + 1].a - 0.08));
  if (!l) return null;
  const k = clamp(ramp(t, l.a - 0.08, l.a + 0.1)) * (1 - ramp(t, l.b, l.b + 0.12));
  return (
    <div style={{ position: "absolute", left: 70 * scale, right: 70 * scale, top: top * scale, display: "flex", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * 8 * scale}px)` }}>
      <div
        style={{
          direction: "rtl",
          textAlign: "center",
          fontFamily: FA,
          fontSize: 48 * scale,
          lineHeight: 1.55,
          color: "#F4F1FA",
          textShadow: `0 ${2 * scale}px ${10 * scale}px rgba(4,5,18,0.85), 0 0 ${26 * scale}px rgba(4,5,18,0.55)`,
          maxWidth: 920 * scale,
          ...(plate ? { background: "rgba(6,8,20,0.6)", borderRadius: 16 * scale, padding: `${8 * scale}px ${22 * scale}px`, boxShadow: `0 0 ${24 * scale}px rgba(6,8,20,0.6)` } : {}),
        }}
      >
        {l.text}
      </div>
    </div>
  );
};
