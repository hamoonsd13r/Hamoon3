// Talk Cutout · the stage under the motion sections (never a plain black studio): one clean colour of light per section
// (a key hue + a deep shade of it, drifting), one giant outlined word in three marquee rows sliding opposite ways,
// flowing contour lines, a glossy floor band and a dark centre so the screens stay the brightest thing. Sections
// cross-fade over 0.9 s. Pure function of t.
import React from "react";
import { C, F } from "./theme";
import { clamp, ease } from "./time";

export type BgSection = { at: number; c1: string; c2: string; word: string };

const Contours: React.FC<{ t: number; W: number; H: number }> = ({ t, W, H }) => {
  const cx = W / 2 + W * 0.28 * Math.sin(t * 0.34), cy = H * 0.47 + H * 0.19 * Math.sin(t * 0.27 + 1.2);
  const flow = (t * 34) % 72;
  const rows = Math.ceil(H / 72) + 3, cols = 48, step = (W + 80) / cols;
  const lines: string[] = [];
  for (let i = 0; i < rows; i++) {
    const y0 = -80 + i * 72 - flow;
    const k = i + Math.floor((t * 34) / 72);
    let d = "";
    for (let j = 0; j <= cols; j++) {
      const x = -40 + j * step;
      const dx = (x - cx) / (W * 0.39), dy = (y0 - cy) / (H * 0.2);
      const hill = 150 * Math.exp(-(dx * dx + dy * dy)) * Math.sign(y0 - cy || 1);
      const wave = 22 * Math.sin(x * 0.006 + k * 0.7 + t * 1.1) + 12 * Math.sin(x * 0.013 - k * 0.4 - t * 0.8);
      d += (j ? "L" : "M") + x.toFixed(1) + " " + (y0 + hill + wave).toFixed(1);
    }
    lines.push(d);
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="tcbdf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
        </linearGradient>
        <mask id="tcbdm">
          <rect width={W} height={H} fill="url(#tcbdf)" />
        </mask>
      </defs>
      <g mask="url(#tcbdm)" fill="none" stroke="rgba(244,238,230,0.11)" strokeWidth={1.5}>
        {lines.map((d, i) => (
          <path key={i} d={d} stroke={(i + Math.floor((t * 34) / 72)) % 5 === 0 ? "rgba(255,190,150,0.22)" : undefined} />
        ))}
      </g>
    </svg>
  );
};

const Layer: React.FC<{ t: number; bg: BgSection; a: number; pulse: number; W: number; H: number }> = ({ t, bg, a, pulse, W, H }) => {
  const lt = t - bg.at;
  const p = 1 + 0.22 * pulse;
  const R = Math.max(W, H);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <div style={{ position: "absolute", left: W * 0.19 - R * 0.47 + 230 * Math.sin(t * 0.55), top: H * 0.16 - R * 0.47 + 200 * Math.cos(t * 0.48 + 1), width: R * 0.94, height: R * 0.94, borderRadius: "50%", background: `radial-gradient(closest-side, ${bg.c1}, transparent)`, opacity: 0.75 * p }} />
      <div style={{ position: "absolute", left: W * 0.81 - R * 0.52 + 220 * Math.sin(t * 0.5 + 2), top: H * 0.83 - R * 0.52 + 220 * Math.cos(t * 0.42 + 3), width: R * 1.04, height: R * 1.04, borderRadius: "50%", background: `radial-gradient(closest-side, ${bg.c2}, transparent)`, opacity: 0.8 }} />
      {[0, 1, 2].map((r) => {
        const dir = r % 2 ? 1 : -1;
        const sz = (r === 1 ? 520 : 380) * (H / 1920 > 0.7 ? 1 : 0.62);
        const x = dir > 0 ? -5200 + lt * 95 : -900 - r * 140 - lt * 95;
        return (
          <div key={r} style={{ position: "absolute", left: 0, top: [0.13, 0.5, 0.86][r] * H - sz / 2, height: sz, display: "flex", alignItems: "center", whiteSpace: "nowrap", transform: `translateX(${x}px)` }}>
            <span style={{ fontFamily: F.anton, fontSize: sz, lineHeight: 1, letterSpacing: 8, color: "transparent", WebkitTextStroke: `3px rgba(244,238,230,${r === 1 ? 0.13 : 0.08})` }}>{`${bg.word} · `.repeat(6)}</span>
          </div>
        );
      })}
    </div>
  );
};

/** sections sorted by `at`; pulse = a bar pulse (makeBeat().barPulse(t, 3)) so the light breathes with the music */
export const Backdrop: React.FC<{ t: number; sections: BgSection[]; pulse?: number; W?: number; H?: number }> = ({ t, sections, pulse = 0, W = 1080, H = 1920 }) => {
  let k = 0;
  while (k + 1 < sections.length && t >= sections[k + 1].at) k++;
  const u = k === 0 ? 1 : ease.inOut(clamp((t - sections[k].at) / 0.9));
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(#0b0c10, ${C.bg} 55%, #040405)`, overflow: "hidden" }}>
      {k > 0 && u < 1 ? <Layer t={t} bg={sections[k - 1]} a={1} pulse={pulse} W={W} H={H} /> : null}
      <Layer t={t} bg={sections[k]} a={u} pulse={pulse} W={W} H={H} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(62% 44% at 50% 47%, rgba(5,6,8,0.72), rgba(5,6,8,0.25) 75%, rgba(5,6,8,0.1) 100%)" }} />
      <Contours t={t} W={W} H={H} />
      <div style={{ position: "absolute", left: -200, right: -200, top: H * 0.67, height: H * 0.42, background: "radial-gradient(55% 34% at 50% 6%, rgba(255,236,220,0.085), transparent 72%)" }} />
    </div>
  );
};
