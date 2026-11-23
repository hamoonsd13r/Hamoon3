// Inside App · effect «/word-lock»: one red label never moves while the page around it hard-cuts through time on
// every 8th note — a 1891 broadsheet, a 1958 Persian daily, a 1984 typewriter memo, a 2026 phone note. Code only.
import React from "react";
import { BEAT, F, clamp, hash } from "../lib/theme";
import type { FxProps } from "../lib/types";

type Page = { year: string; bg: string; ink: string; line: string; head: React.ReactNode; dir: "ltr" | "rtl"; cols: number; font: string; photo?: boolean; dark?: boolean };
const PAGES: Page[] = [
  { year: "1891", bg: "#EAE0C6", ink: "#2A2116", line: "rgba(42,33,22,.34)", dir: "ltr", cols: 3, font: F.serif, head: <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 96, letterSpacing: 2 }}>THE MORNING GAZETTE</span> },
  { year: "1958", bg: "#E6DECB", ink: "#1E1A14", line: "rgba(30,26,20,.32)", dir: "rtl", cols: 4, font: F.vzB, photo: true, head: <span style={{ fontFamily: F.fa, fontSize: 120 }}>روزنامه‌ی امروز</span> },
  { year: "1984", bg: "#F3F0E8", ink: "#24272C", line: "rgba(36,39,44,.42)", dir: "ltr", cols: 1, font: F.mono, head: <span style={{ fontFamily: F.mono, fontSize: 70, letterSpacing: 6 }}>MEMO — INTERNAL</span> },
  { year: "2026", bg: "#101216", ink: "#EEF0F4", line: "rgba(238,240,244,.22)", dir: "rtl", cols: 1, font: F.vz, dark: true, head: <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 64 }}>Notes</span> },
];

const Lines: React.FC<{ p: Page; seed: number; x: number; y: number; w: number; n: number }> = ({ p, seed, x, y, w, n }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const lw = i % 7 === 6 ? 0.45 + 0.2 * hash(seed + i) : 0.86 + 0.14 * hash(seed + i * 3);
      return <div key={i} style={{ position: "absolute", top: y + i * (p.cols === 1 ? 54 : 40), [p.dir === "rtl" ? "right" : "left"]: p.dir === "rtl" ? 1080 - (x + w) : x, width: w * lw, height: p.cols === 1 ? 14 : 10, borderRadius: 3, background: p.line } as React.CSSProperties} />;
    })}
  </>
);

export const makeWordLock = (word = "ایده", sub = "ONE WORD · 135 YEARS"): React.FC<FxProps> => ({ tau }) => {
  const step = BEAT.P / 2;
  const i = clamp(Math.floor(Math.max(0, tau + 0.02) / step), 0, 1e9) % PAGES.length;
  const p = PAGES[i];
  const since = tau + 0.02 - Math.floor(Math.max(0, tau + 0.02) / step) * step;
  const jolt = Math.exp(-since * 18) * 6;
  const push = 1 + 0.025 * clamp(tau / 2);
  const colW = (1080 - 140 - (p.cols - 1) * 40) / p.cols;
  return (
    <div style={{ position: "absolute", inset: 0, background: p.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push}) translateY(${jolt}px)`, transformOrigin: "50% 47%" }}>
        {/* paper grain or screen glow */}
        <div style={{ position: "absolute", inset: 0, background: p.dark ? "radial-gradient(80% 60% at 50% 30%, rgba(110,139,255,.10), transparent 70%)" : "radial-gradient(120% 90% at 50% 40%, transparent 50%, rgba(80,60,30,.22) 100%)" }} />
        {/* masthead */}
        <div style={{ position: "absolute", left: 70, right: 70, top: 150, textAlign: "center", color: p.ink, direction: p.dir }}>{p.head}</div>
        <div style={{ position: "absolute", left: 70, right: 70, top: 300, height: 4, background: p.ink, opacity: p.dark ? 0.2 : 0.85 }} />
        <div style={{ position: "absolute", left: 70, right: 70, top: 314, height: 1.5, background: p.ink, opacity: p.dark ? 0.15 : 0.6 }} />
        {/* columns */}
        {Array.from({ length: p.cols }, (_, c) => {
          const x = 70 + c * (colW + 40);
          return (
            <React.Fragment key={c}>
              <Lines p={p} seed={i * 50 + c * 7} x={x} y={360} w={colW} n={p.cols === 1 ? 7 : 11} />
              <Lines p={p} seed={i * 50 + c * 7 + 99} x={x} y={1100} w={colW} n={p.cols === 1 ? 9 : 16} />
            </React.Fragment>
          );
        })}
        {p.photo && <div style={{ position: "absolute", left: 70, top: 1100, width: 440, height: 520, background: "radial-gradient(circle at 4px 4px, #2a241b 2.2px, transparent 2.6px)", backgroundSize: "8px 8px", backgroundColor: "#cfc5ad" }} />}
        {/* the year */}
        <div style={{ position: "absolute", left: 70, bottom: 120, fontFamily: F.mono, fontSize: 64, letterSpacing: 8, color: p.ink, opacity: 0.7 }}>{p.year}</div>
        <div style={{ position: "absolute", right: 70, bottom: 136, fontFamily: F.mono, fontSize: 22, letterSpacing: 4, color: p.ink, opacity: 0.55 }}>{sub}</div>
      </div>
      {/* the locked word: never moves */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "6px 46px 18px", background: "#E23B2E", boxShadow: "0 18px 50px rgba(0,0,0,.35)", fontFamily: F.fa, fontSize: 150, lineHeight: 1.15, color: "#fff", direction: "rtl" }}>{word}</div>
      </div>
    </div>
  );
};
