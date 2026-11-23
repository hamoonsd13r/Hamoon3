// Inside App · the app's glyphs, drawn as strokes (lucide-style, round caps).
// Sizes are in output pixels; `c` is the stroke colour.
import React from "react";
import { C } from "./theme";

const SV: React.FC<{ size: number; children: React.ReactNode; vb?: number; style?: React.CSSProperties }> = ({ size, children, vb = 24, style }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={{ display: "block", overflow: "visible", ...style }}>
    {children}
  </svg>
);
const st = (c: string, w = 2) => ({ fill: "none", stroke: c, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

/** two lines, the lower one shorter (the sidebar button) */
export const Hamburger: React.FC<{ size: number; c?: string }> = ({ size, c = C.text }) => (
  <SV size={size}>
    <path d="M4.6 9.2h13.4M4.6 15.2h8.6" {...st(c, 2.1)} />
  </SV>
);
export const Compose: React.FC<{ size: number; c?: string }> = ({ size, c = C.text }) => (
  <SV size={size}>
    <path d="M12 3.6H5.6a2 2 0 0 0-2 2v12.8a2 2 0 0 0 2 2h12.8a2 2 0 0 0 2-2V12" {...st(c, 2.1)} />
    <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3l-8.8 8.8-4 1 1-4z" {...st(c, 2.1)} />
  </SV>
);
export const Plus: React.FC<{ size: number; c?: string }> = ({ size, c = C.text }) => (
  <SV size={size}>
    <path d="M12 4.2v15.6M4.2 12h15.6" {...st(c, 1.9)} />
  </SV>
);
/** two sliders with knobs (the composer's "tools" button) */
export const Sliders: React.FC<{ size: number; c?: string }> = ({ size, c = C.text }) => (
  <SV size={size}>
    <path d="M3.5 8.5h16.8M3.5 15.5h16.8" {...st(c, 1.8)} />
    <circle cx="15.6" cy="8.5" r="2.15" fill={C.panel} stroke={c} strokeWidth={1.8} />
    <circle cx="8.2" cy="15.5" r="2.15" fill={C.panel} stroke={c} strokeWidth={1.8} />
  </SV>
);
export const Mic: React.FC<{ size: number; c?: string }> = ({ size, c = C.text }) => (
  <SV size={size}>
    <rect x="9" y="2.6" width="6" height="11.6" rx="3" {...st(c, 1.8)} />
    <path d="M5.6 10.8a6.4 6.4 0 0 0 12.8 0M12 17.4v3.6" {...st(c, 1.8)} />
  </SV>
);
export const ArrowUp: React.FC<{ size: number; c?: string; w?: number }> = ({ size, c = "#fff", w = 2.4 }) => (
  <SV size={size}>
    <path d="M12 19.6V4.6M5.4 11.2 12 4.6l6.6 6.6" {...st(c, w)} />
  </SV>
);
export const Close: React.FC<{ size: number; c?: string }> = ({ size, c = "#fff" }) => (
  <SV size={size}>
    <path d="M7 7l10 10M17 7 7 17" {...st(c, 2.6)} />
  </SV>
);
export const Play: React.FC<{ size: number; c?: string }> = ({ size, c = "#fff" }) => (
  <SV size={size}>
    <path d="M7 4.6v14.8L19.4 12z" fill={c} stroke={c} strokeWidth={1.2} strokeLinejoin="round" />
  </SV>
);
// iOS keyboard glyphs
export const Shift: React.FC<{ size: number; c?: string }> = ({ size, c = C.keyText }) => (
  <SV size={size}>
    <path d="M12 3.8 3.6 12.6h4.6v7.2h7.6v-7.2h4.6z" {...st(c, 1.7)} />
  </SV>
);
export const Backspace: React.FC<{ size: number; c?: string }> = ({ size, c = C.keyText }) => (
  <SV size={size}>
    <path d="M8.6 5h11.2a1.6 1.6 0 0 1 1.6 1.6v10.8a1.6 1.6 0 0 1-1.6 1.6H8.6L2.6 12z" {...st(c, 1.7)} />
    <path d="M11.4 9.2l5.6 5.6M17 9.2l-5.6 5.6" {...st(c, 1.7)} />
  </SV>
);

/** the assistant's glyph: a four-point star (+ a small one); `spin` (deg) turns it, `breathe` scales it */
export const Glyph: React.FC<{ size: number; spin?: number; breathe?: number; c?: string }> = ({ size, spin = 0, breathe = 1, c = C.accent }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible", transform: `rotate(${spin}deg) scale(${breathe})` }}>
    <path d="M11 1.5 C11.9 7.2 13.8 9.1 19.5 10 C13.8 10.9 11.9 12.8 11 18.5 C10.1 12.8 8.2 10.9 2.5 10 C8.2 9.1 10.1 7.2 11 1.5 Z" fill={c} />
    <path d="M19 15.5 C19.35 17.6 20.1 18.35 22.2 18.7 C20.1 19.05 19.35 19.8 19 21.9 C18.65 19.8 17.9 19.05 15.8 18.7 C17.9 18.35 18.65 17.6 19 15.5 Z" fill={c} opacity={0.75} />
  </svg>
);
