// Talk Cutout · code-drawn video thumbnails (no real channel's thumbnails ever ship): a two-tone light, one hero object
// and a bold two-line title, like a real thumbnail. Use them for sample channels, sample uploads and «your film» slots.
import React from "react";
import { F } from "../theme";

export type ThumbSpec = { hue: number; title: string; motif: "loaf" | "cake" | "cup" | "bowl" | "pie" | "jar"; hi?: string };

const Motif: React.FC<{ m: ThumbSpec["motif"]; hue: number }> = ({ m, hue }) => {
  const warm = `hsl(${hue + 8}, 62%, 58%)`, warmD = `hsl(${hue + 2}, 58%, 34%)`, cream = "hsl(38, 60%, 88%)";
  switch (m) {
    case "loaf":
      return (
        <g>
          <ellipse cx={112} cy={70} rx={46} ry={8} fill="rgba(0,0,0,0.35)" />
          <path d="M70 66 C66 44 84 30 112 30 C140 30 158 44 154 66 Z" fill={warm} />
          <path d="M70 66 C66 44 84 30 112 30 C140 30 158 44 154 66 Z" fill="url(#tcthl)" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${92 + i * 16} 40 L${102 + i * 16} 56`} stroke={cream} strokeWidth={3.2} strokeLinecap="round" opacity={0.85} />)}
        </g>
      );
    case "cake":
      return (
        <g>
          <ellipse cx={112} cy={72} rx={42} ry={7} fill="rgba(0,0,0,0.35)" />
          <rect x={78} y={50} width={68} height={20} rx={4} fill={warmD} />
          <rect x={84} y={34} width={56} height={18} rx={4} fill={warm} />
          <path d="M84 36 h56 v6 q-5 6 -9 0 q-5 7 -10 0 q-5 7 -10 0 q-5 7 -10 0 q-5 7 -9 0 z" fill={cream} />
          <rect x={110} y={22} width={4} height={12} rx={2} fill={cream} />
          <circle cx={112} cy={20} r={3} fill="hsl(40, 100%, 65%)" />
        </g>
      );
    case "cup":
      return (
        <g>
          <ellipse cx={110} cy={72} rx={34} ry={6} fill="rgba(0,0,0,0.35)" />
          <path d="M86 38 h44 l-5 32 h-34 z" fill={cream} />
          <path d="M130 44 q12 0 12 10 q0 10 -14 10" stroke={cream} strokeWidth={5} fill="none" />
          <ellipse cx={108} cy={38} rx={22} ry={5} fill={warmD} />
          {[0, 1].map((i) => <path key={i} d={`M${100 + i * 12} 28 q-4 -6 0 -12`} stroke="rgba(255,255,255,0.6)" strokeWidth={2.5} fill="none" strokeLinecap="round" />)}
        </g>
      );
    case "bowl":
      return (
        <g>
          <ellipse cx={112} cy={72} rx={44} ry={7} fill="rgba(0,0,0,0.35)" />
          <path d="M72 46 h80 q-4 26 -40 26 q-36 0 -40 -26 z" fill={warm} />
          <ellipse cx={112} cy={46} rx={40} ry={8} fill={cream} />
          {[0, 1, 2].map((i) => <path key={i} d={`M${98 + i * 13} 34 q-4 -7 0 -14`} stroke="rgba(255,255,255,0.55)" strokeWidth={2.5} fill="none" strokeLinecap="round" />)}
        </g>
      );
    case "pie":
      return (
        <g>
          <ellipse cx={112} cy={70} rx={46} ry={8} fill="rgba(0,0,0,0.35)" />
          <ellipse cx={112} cy={52} rx={44} ry={16} fill={warmD} />
          <ellipse cx={112} cy={49} rx={40} ry={13} fill={warm} />
          {[-2, -1, 0, 1, 2].map((i) => <path key={i} d={`M${112 + i * 14 - 8} 38 L${112 + i * 14 + 8} 60`} stroke={cream} strokeWidth={3} opacity={0.85} />)}
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={112} cy={72} rx={30} ry={6} fill="rgba(0,0,0,0.35)" />
          <rect x={90} y={30} width={44} height={42} rx={8} fill={warm} opacity={0.9} />
          <rect x={88} y={24} width={48} height={10} rx={4} fill={cream} />
        </g>
      );
  }
};

/** a thumbnail drawn at w × h (16:9); `zoom` for a slow push when it plays as a «film» */
export const CodeThumb: React.FC<{ spec: ThumbSpec; w: number; h: number; zoom?: number; style?: React.CSSProperties }> = ({ spec, w, h, zoom = 1, style }) => {
  const [l1, l2] = spec.title.split("|");
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", background: `linear-gradient(135deg, hsl(${spec.hue}, 52%, 40%), hsl(${spec.hue + 18}, 58%, 14%))`, ...style }}>
      <svg width={w} height={h} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "70% 55%" }}>
        <defs>
          <radialGradient id="tcthl" cx="0.35" cy="0.25" r="0.8">
            <stop offset="0" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <circle cx={118} cy={40} r={44} fill={`hsl(${spec.hue + 30}, 80%, 70%)`} opacity={0.16} />
        <Motif m={spec.motif} hue={spec.hue} />
      </svg>
      <div style={{ position: "absolute", left: w * 0.06, top: h * 0.14, width: w * 0.55, fontFamily: F.anton, fontSize: h * 0.2, lineHeight: 1.02, color: "#fff", textShadow: "0 2px 0 rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.45)", direction: "ltr", textTransform: "uppercase" }}>
        <div>{l1}</div>
        {l2 ? <div style={{ color: spec.hi ?? "#FFD23F" }}>{l2}</div> : null}
      </div>
    </div>
  );
};
