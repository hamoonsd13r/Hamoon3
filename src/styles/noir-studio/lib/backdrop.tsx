// Noir Studio · the backdrop behind every scene. Per section: two soft fields of ONE clean colour of light (c1 the key,
// c2 a deep shade of the same hue — no muddy mixes), an optional picture as a faint blurred texture, one giant outlined
// word in three marquee rows sliding in opposite directions, flowing contour lines, a dark centre where the screens
// live, and a glossy floor band. Sections cross-fade over 0.9 s; the colour fields pulse on the bar. Pure function of t.
import React from "react";
import { Img, staticFile } from "remotion";
import { C, F, barPulse, clamp, ease } from "./theme";

export type Plate = { at: number; c1: string; c2: string; word: string; img?: string };

const Contours: React.FC<{ t: number }> = ({ t }) => {
  const cx = 540 + 300 * Math.sin(t * 0.34), cy = 900 + 360 * Math.sin(t * 0.27 + 1.2);
  const flow = (t * 34) % 72;
  const lines: string[] = [];
  for (let i = 0; i < 31; i++) {
    const y0 = -80 + i * 72 - flow;
    const k = i + Math.floor((t * 34) / 72);
    let d = "";
    for (let j = 0; j <= 48; j++) {
      const x = -40 + j * 24.2;
      const dx = (x - cx) / 420, dy = (y0 - cy) / 380;
      const hill = 150 * Math.exp(-(dx * dx + dy * dy)) * Math.sign(y0 - cy || 1);
      const wave = 22 * Math.sin(x * 0.006 + k * 0.7 + t * 1.1) + 12 * Math.sin(x * 0.013 - k * 0.4 - t * 0.8);
      d += (j ? "L" : "M") + x.toFixed(1) + " " + (y0 + hill + wave).toFixed(1);
    }
    lines.push(d);
  }
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="nsbdf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
        </linearGradient>
        <mask id="nsbdm">
          <rect width="1080" height="1920" fill="url(#nsbdf)" />
        </mask>
      </defs>
      <g mask="url(#nsbdm)" fill="none" stroke="rgba(244,238,230,0.11)" strokeWidth={1.5}>
        {lines.map((d, i) => (
          <path key={i} d={d} stroke={(i + Math.floor((t * 34) / 72)) % 5 === 0 ? "rgba(255,190,150,0.22)" : undefined} />
        ))}
      </g>
    </svg>
  );
};

const Layer: React.FC<{ t: number; bg: Plate; a: number }> = ({ t, bg, a }) => {
  const lt = t - bg.at;
  const p = 1 + 0.22 * barPulse(t, 3);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      {bg.img ? <Img src={staticFile(bg.img)} style={{ position: "absolute", left: -170, top: -300, width: 1420, height: 2520, objectFit: "cover", opacity: 0.22, filter: "brightness(0.5) saturate(1.2) blur(18px)", transform: `translate(${40 * Math.sin(t * 0.13)}px, ${50 * Math.sin(t * 0.1 + 1)}px)`, maxWidth: "none" }} /> : null}
      <div style={{ position: "absolute", left: 200 - 900 + 230 * Math.sin(t * 0.55), top: 300 - 900 + 200 * Math.cos(t * 0.48 + 1), width: 1800, height: 1800, borderRadius: "50%", background: `radial-gradient(closest-side, ${bg.c1}, transparent)`, opacity: 0.75 * p }} />
      <div style={{ position: "absolute", left: 880 - 1000 + 220 * Math.sin(t * 0.5 + 2), top: 1600 - 1000 + 220 * Math.cos(t * 0.42 + 3), width: 2000, height: 2000, borderRadius: "50%", background: `radial-gradient(closest-side, ${bg.c2}, transparent)`, opacity: 0.8 }} />
      {[0, 1, 2].map((r) => {
        const dir = r % 2 ? 1 : -1;
        const sz = r === 1 ? 520 : 380;
        const x = dir > 0 ? -5200 + lt * 95 : -900 - r * 140 - lt * 95;
        return (
          <div key={r} style={{ position: "absolute", left: 0, top: [250, 960, 1650][r] - sz / 2, height: sz, display: "flex", alignItems: "center", whiteSpace: "nowrap", transform: `translateX(${x}px)` }}>
            <span style={{ fontFamily: F.anton, fontSize: sz, lineHeight: 1, letterSpacing: 8, color: "transparent", WebkitTextStroke: `3px rgba(244,238,230,${r === 1 ? 0.13 : 0.08})` }}>{`${bg.word} · `.repeat(6)}</span>
          </div>
        );
      })}
    </div>
  );
};

export const Backdrop: React.FC<{ t: number; plates: Plate[] }> = ({ t, plates }) => {
  let k = 0;
  while (k + 1 < plates.length && t >= plates[k + 1].at) k++;
  const u = k === 0 ? 1 : ease.inOut(clamp((t - plates[k].at) / 0.9));
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(#0b0c10, ${C.bg} 55%, #040405)`, overflow: "hidden" }}>
      {k > 0 && u < 1 ? <Layer t={t} bg={plates[k - 1]} a={1} /> : null}
      <Layer t={t} bg={plates[k]} a={u} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(62% 44% at 50% 47%, rgba(5,6,8,0.72), rgba(5,6,8,0.25) 75%, rgba(5,6,8,0.1) 100%)" }} />
      <Contours t={t} />
      <div style={{ position: "absolute", left: -200, right: -200, top: 1290, height: 800, background: "radial-gradient(55% 34% at 50% 6%, rgba(255,236,220,0.085), transparent 72%)" }} />
    </div>
  );
};
