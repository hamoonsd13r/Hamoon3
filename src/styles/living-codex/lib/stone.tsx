// Living Codex · a relief wall in raking torchlight: a procedural limestone wall, carved animals that are cut and lit
// one by one on their words (the torch travels to each), chisel sparks, a slow camera drift. 1920×1080, `t` = seconds.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Embers, Glow, Motes, Vignette } from "./fx";
import { GLYPHS, Relief, type GlyphId } from "./glyphs";
import { stoneURL } from "./tex";
import { C, F, clamp, easeInOut, env, flick, lerp, sstep, win } from "./theme";

export type ReliefItem = { id: GlyphId; at: number; label?: string };

export const StoneWall: React.FC<{
  t: number;
  items: ReliefItem[]; // up to five, left → right, each carved + lit on its word
  carveAt: number; // the moment carving starts («on stone»): every outline is faint before it
  inAt?: number; // the torch starts moving (default 0)
  labelFont?: string; // F.fa for Persian labels, F.label for Latin
  y?: number;
  tone?: [number, number, number];
}> = ({ t, items, carveAt, inAt = 0, labelFont = F.fa, y: GY = 440, tone = [156, 136, 108] }) => {
  const stone = stoneURL(57, 960, 540, tone, 1.15, { relief: 70, chisel: 0.12, pits: 1.4 });
  const n = items.length, gap = n > 1 ? Math.min(315, 1300 / (n - 1)) : 0;
  const GX = items.map((_, i) => 960 + (i - (n - 1) / 2) * gap);
  const cues = items.map((it) => it.at);
  const lastCue = cues[n - 1] ?? carveAt;
  // which relief has the torch
  let k = -1;
  for (let i = 0; i < n; i++) if (t >= cues[i] - 0.25) k = i;
  const tx = k < 0 ? lerp(1100, GX[0] ?? 960, clamp((t - inAt) / 2.5)) : lerp(k === 0 ? GX[0] : GX[k - 1], GX[k], easeInOut(clamp((t - (cues[k] - 0.25)) / 0.45)));
  const fl = flick(t, 17);
  const camX = lerp(70, -70, clamp((t - inAt) / (lastCue + 1.5 - inAt)));
  const allLit = sstep(lastCue + 0.6, lastCue + 1.6, t);
  const lf = labelFont === F.label;
  return (
    <AbsoluteFill style={{ background: "#0a0806" }}>
      <AbsoluteFill style={{ transform: `translateX(${camX}px) scale(1.08)` }}>
        <AbsoluteFill style={{ backgroundImage: `url(${stone})`, backgroundSize: "100% 100%", filter: `brightness(${0.42 + 0.08 * fl})` }} />
        {/* the torch pool on the stone */}
        <Glow x={tx} y={GY + 30} r={420} color="#ffb060" a={0.55 * (0.8 + 0.2 * fl)} blend="overlay" />
        <Glow x={tx} y={GY + 30} r={300} color="#ffb766" a={0.28 * (0.8 + 0.2 * fl)} blend="screen" />
        <Glow x={960} y={GY} r={1100} color="#ff9a40" a={0.22 * allLit} blend="overlay" sy={0.5} />
        {items.map((it, i) => {
          const tc = cues[i];
          const carve = 0.18 + 0.82 * easeInOut(clamp((t - tc + 0.35) / 0.7)) * (t > carveAt - 0.5 ? 1 : 0);
          const near = Math.exp(-Math.pow((tx - GX[i]) / 230, 2));
          const hot = t > tc - 0.2 ? Math.exp(-Math.max(0, t - tc) * 0.9) : 0;
          const lit = clamp(Math.max(hot, near * (t > tc - 0.2 ? 0.75 : 0.25), t > tc ? 0.35 : 0, allLit * 0.6)) * (0.85 + 0.15 * fl);
          const lab = win(t, tc - 0.1, 0.4);
          return (
            <React.Fragment key={`${it.id}${i}`}>
              <Relief id={it.id} x={GX[i]} y={GY} s={1.22} lit={lit} carve={carve} uid={`w${i}`} />
              <div dir="auto" style={{ position: "absolute", left: GX[i] - 160, width: 320, top: GY + 128 - (lf ? 14 : 22), textAlign: "center", opacity: lab, fontFamily: labelFont,
                fontSize: lf ? 22 : 34, letterSpacing: lf ? "0.32em" : 0, textTransform: lf ? "uppercase" : undefined, color: hot > 0.4 ? C.amber : C.bone }}>
                {it.label ?? GLYPHS[it.id].label}
              </div>
              <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: lab }}>
                <line x1={GX[i] - 40 * lab} y1={GY + 106} x2={GX[i] + 40 * lab} y2={GY + 106} stroke={C.amber} strokeOpacity={0.6} />
              </svg>
            </React.Fragment>
          );
        })}
        {/* chisel sparks while carving */}
        {cues.map((tc, i) => {
          const a = env(t, tc - 0.4, tc + 0.35, 0.1, 0.25);
          if (a <= 0) return null;
          return <Embers key={i} t={t * 1.6} n={18} seed={170 + i} box={[GX[i] - 120, GY - 60, GX[i] + 120, GY + 60]} rise={110} size={1.8} drift={110} opacity={a} />;
        })}
      </AbsoluteFill>
      <Motes t={t} n={60} seed={171} size={1.5} color="#ffd9a8" opacity={0.35} />
      <Vignette a={0.75} inner={35} />
    </AbsoluteFill>
  );
};
