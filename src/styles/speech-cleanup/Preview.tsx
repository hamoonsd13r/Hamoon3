// Speech Cleanup — the preview card for the style catalogue (a diagram, the tool has no film). Rendered only by
// src/index-kit-speech-cleanup.ts → styles/previews/speech-cleanup.jpg.
import React from "react";
import { AbsoluteFill } from "remotion";
import { useTalkPageFonts } from "../talk-page/lib/fonts";
import { paperBg } from "../talk-page/lib/page";
import { C, F } from "../talk-page/lib/theme";

const rnd = (i: number) => {
  const v = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return v - Math.floor(v);
};
type Cut = { a: number; b: number; kind: "pause" | "filler" | "stumble" | "retake" | "section" };
const CUTS: Cut[] = [
  { a: 0.05, b: 0.075, kind: "filler" },
  { a: 0.12, b: 0.16, kind: "retake" },
  { a: 0.21, b: 0.235, kind: "pause" },
  { a: 0.3, b: 0.315, kind: "stumble" },
  { a: 0.36, b: 0.39, kind: "pause" },
  { a: 0.44, b: 0.58, kind: "section" },
  { a: 0.63, b: 0.645, kind: "filler" },
  { a: 0.7, b: 0.74, kind: "retake" },
  { a: 0.8, b: 0.83, kind: "pause" },
  { a: 0.88, b: 0.9, kind: "stumble" },
];
const COL: Record<Cut["kind"], string> = { pause: "rgba(28,26,23,0.16)", filler: "rgba(210,86,30,0.35)", stumble: "rgba(210,86,30,0.55)", retake: "rgba(210,86,30,0.8)", section: "rgba(28,26,23,0.45)" };
const LABEL: Record<Cut["kind"], string> = { pause: "سکوت", filler: "پرکننده", stumble: "تپق", retake: "تکرار", section: "بخش حذفی" };

const Wave: React.FC<{ x: number; y: number; w: number; h: number; keep?: boolean }> = ({ x, y, w, h, keep }) => {
  const bars = Math.floor(w / 6);
  const inCut = (u: number) => CUTS.some((c) => u >= c.a && u < c.b);
  const pause = (u: number) => CUTS.some((c) => c.kind === "pause" && u >= c.a && u < c.b);
  const out: React.ReactNode[] = [];
  let k = 0;
  for (let i = 0; i < bars; i++) {
    const u = i / bars;
    if (keep && inCut(u)) continue;
    const amp = pause(u) ? 0.04 : 0.25 + 0.75 * rnd(i) * (0.6 + 0.4 * Math.sin(i * 0.31));
    const bh = Math.max(3, amp * h);
    out.push(<rect key={i} x={x + k * 6} y={y + h / 2 - bh / 2} width={4} height={bh} rx={2} fill={C.ink} opacity={0.85} />);
    k++;
  }
  return <>{out}</>;
};

export const SpeechCleanupPreview: React.FC = () => {
  useTalkPageFonts();
  const W0 = 1560;
  const X0 = 180;
  return (
    <AbsoluteFill style={{ background: "#2A2420" }}>
      <div style={{ position: "absolute", left: 60, top: 50, right: 60, bottom: 50, background: paperBg, borderRadius: 6, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", left: 60, top: 40, fontFamily: F.mono, fontSize: 30, fontWeight: 700, letterSpacing: "0.14em", color: C.accent }}>■ SPEECH CLEANUP · LONG TALK → PREMIERE XML</div>
        <div style={{ position: "absolute", right: 60, top: 40, fontFamily: F.fa, fontSize: 34, fontWeight: 700, color: C.ink, direction: "rtl" }}>حذف تپق، تکرار و سکوت</div>
        <svg width={1800} height={980} style={{ position: "absolute", left: 0, top: 0 }}>
          <text x={X0} y={170} fontFamily="TPMono" fontSize={26} fontWeight={600} letterSpacing="3" fill={C.label}>BEFORE · 70:12 · RAW CLASS</text>
          {CUTS.map((c, i) => (
            <rect key={i} x={X0 + c.a * W0} y={190} width={(c.b - c.a) * W0} height={150} fill={COL[c.kind]} />
          ))}
          <Wave x={X0} y={190} w={W0} h={150} />
          {CUTS.filter((c, i) => i % 2 === 0 || c.kind === "section").map((c, i) => (
            <text key={i} x={X0 + ((c.a + c.b) / 2) * W0} y={372} textAnchor="middle" fontFamily="TPFa" fontSize={26} fontWeight={700} fill={c.kind === "pause" || c.kind === "section" ? C.ink2 : C.accent}>
              {LABEL[c.kind]}
            </text>
          ))}
          {/* the steps — each line ≤ 25 characters, so it stays inside its 300 px box */}
          {[
            ["transcribe", "Scribe: word times", "stt-chunks · fix-timing"],
            ["auto cuts", "pauses · fillers", "cut-off words"],
            ["your edits", "edits.json", "last clean take stays"],
            ["joins", "pause 0.45/0.3/0.15 s", "cut on energy valleys"],
            ["check", "re-transcribe", "compare · diag"],
          ].map(([a, b, c], i) => (
            <g key={a} transform={`translate(${X0 + i * 322} 430)`}>
              <rect x={0} y={0} width={300} height={132} rx={10} fill={C.paperHi} stroke={C.ink} strokeWidth={2.5} />
              <text x={18} y={42} fontFamily="TPMono" fontSize={22} fontWeight={700} fill={i === 2 ? C.accent : C.ink}>{a}</text>
              <text x={18} y={80} fontFamily="TPMono" fontSize={17} fontWeight={500} fill={C.ink2}>{b}</text>
              <text x={18} y={108} fontFamily="TPMono" fontSize={17} fontWeight={500} fill={C.label}>{c}</text>
              {i < 4 ? <path d="M303 66 H319 M311 57 L319 66 L311 75" fill="none" stroke={C.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </g>
          ))}
          <text x={X0} y={628} fontFamily="TPMono" fontSize={26} fontWeight={600} letterSpacing="3" fill={C.label}>AFTER · 42:38 · 316 PIECES · 144 MARKERS</text>
          <Wave x={X0} y={668} w={W0} h={150} keep />
          {/* the markers sit on the timeline, under the label */}
          {[0.12, 0.27, 0.41, 0.55, 0.69].map((u, i) => (
            <g key={i} transform={`translate(${X0 + u * W0 * 0.66} 662)`}>
              <path d="M0 0 L11 -14 H-11 Z" fill={C.accent} />
            </g>
          ))}
          <text x={X0} y={880} fontFamily="TPSerif" fontSize={40} fontWeight={600} fill={C.ink}>Premiere › File › Import: V1 camera · V2 screen (in sync) · A1 voice · markers</text>
        </svg>
      </div>
    </AbsoluteFill>
  );
};
