// 07 · Cyberpunk — a wet neon street pushing in, rain, flickering katakana, a masked runner who glitches in, RGB-split
// type and a HUD.
import React from "react";
import { Img } from "remotion";
import { F, PH, PW, ease, hash, mix, ramp, tween } from "../theme";
import { Frame, Grain, img, type PosterProps } from "../kit";

const MAG = "#FF2BD6", YEL = "#F5F23A", CY = "#2BF0FF";
const GLITCH: [number, number][] = [[0.0, 0.22], [0.74, 0.82], [1.58, 1.66], [2.36, 2.46]];
const glitchAt = (t: number) => {
  for (const [a, b] of GLITCH) if (t >= a && t < b) return 1 - (t - a) / (b - a) * 0.6;
  return 0;
};

/** the runner, cut in horizontal slices that slide sideways while the glitch is on */
const Runner: React.FC<{ t: number; g: number; x: number; y: number; w: number }> = ({ t, g, x, y, w }) => {
  const h = (w * 1536) / 1024;
  const f = Math.floor(t * 30);
  const N = g > 0 ? 9 : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {g > 0 ? (
        <>
          <Img src={img("CYB-01")} style={{ position: "absolute", width: w, height: h, maxWidth: "none", transform: `translateX(${-10 * g}px)`, opacity: 0.6, mixBlendMode: "screen", filter: "sepia(1) saturate(6) hue-rotate(280deg)" }} />
          <Img src={img("CYB-01")} style={{ position: "absolute", width: w, height: h, maxWidth: "none", transform: `translateX(${10 * g}px)`, opacity: 0.6, mixBlendMode: "screen", filter: "sepia(1) saturate(6) hue-rotate(140deg)" }} />
        </>
      ) : null}
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * 100, b = 100 - ((i + 1) / N) * 100;
        const off = g > 0 ? (hash(i * 7.3 + f) - 0.5) * 60 * g : 0;
        return <Img key={i} src={img("CYB-01")} style={{ position: "absolute", width: w, height: h, maxWidth: "none", clipPath: `inset(${a}% 0 ${b}% 0)`, transform: `translateX(${off}px)`, filter: `drop-shadow(0 0 18px rgba(255,43,214,0.45))` }} />;
      })}
    </div>
  );
};

export const Cyber: React.FC<PosterProps> = ({ t }) => {
  const g = glitchAt(t);
  const rise = tween(t, 0, 0.3, ease.out);
  const kata = "サイバー";
  const flick = (k: number) => (hash(Math.floor(t * 20) + k * 13) > 0.08 ? 1 : 0.35);
  const scan = ((t * 0.7) % 1) * PH;
  return (
    <Frame bg="#07040D">
      {/* the street: slow push, a neon flicker, the far end breathing */}
      <Img src={img("CYB-02")} style={{ position: "absolute", left: 0, top: -5, width: PW, height: 1290, maxWidth: "none", transform: `scale(${mix(1.16, 1.04, ease.out(ramp(t, 0, 3.2))) + 0.012 * Math.sin(t * 0.9)})`, transformOrigin: "52% 46%", filter: `brightness(${0.78 + 0.08 * flick(21)}) saturate(1.15)` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,4,13,0.55) 0%, rgba(7,4,13,0.05) 30%, rgba(7,4,13,0.1) 60%, rgba(7,4,13,0.85) 100%)" }} />
      {/* rain */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        {Array.from({ length: 70 }, (_, i) => {
          const x0 = hash(i * 1.7) * 900 - 100, sp = 1500 + hash(i * 2.3) * 900;
          const y = ((t * sp + hash(i * 3.9) * PH) % (PH + 200)) - 100;
          return <line key={i} x1={x0 + y * 0.18} y1={y} x2={x0 + (y + 46) * 0.18} y2={y + 46} stroke={CY} strokeWidth={1.4} opacity={0.32} />;
        })}
      </svg>
      {/* katakana, vertical neon */}
      <div style={{ position: "absolute", left: 26, top: 110, writingMode: "vertical-rl", fontFamily: F.jp, fontWeight: 900, fontSize: 132, lineHeight: 1, color: YEL, textShadow: `0 0 18px ${YEL}, 0 0 40px rgba(245,242,58,0.5)` }}>
        {Array.from(kata).map((ch, i) => (
          <span key={i} style={{ opacity: ramp(t, 0.08 + i * 0.07, 0.1 + i * 0.07) * flick(i), display: "inline-block", transform: g > 0.3 ? `translateX(${(hash(i + Math.floor(t * 30)) - 0.5) * 18}px)` : undefined }}>
            {ch}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", right: 26, top: 640, writingMode: "vertical-rl", fontFamily: F.jp, fontWeight: 900, fontSize: 84, lineHeight: 1, color: "transparent", WebkitTextStroke: `2px ${MAG}`, textShadow: `0 0 14px rgba(255,43,214,0.6)`, opacity: tween(t, 0.3, 0.42) * flick(9) }}>
        パンク
      </div>
      {/* the runner */}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${mix(260, 0, rise)}px)`, opacity: ramp(t, 0, 0.06) }}>
        <Runner t={t} g={g} x={60} y={250} w={620} />
      </div>
      {/* HUD */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, opacity: tween(t, 0.2, 0.35) }}>
        {[[150, 300, 1, 1], [570, 300, -1, 1], [150, 1000, 1, -1], [570, 1000, -1, -1]].map(([x, y, sx, sy], i) => (
          <path key={i} d={`M${x},${y + 40 * sy} L${x},${y} L${x + 40 * sx},${y}`} stroke={CY} strokeWidth={3} fill="none" />
        ))}
        <rect x={0} y={scan} width={PW} height={3} fill={MAG} opacity={0.35} />
      </svg>
      <div style={{ position: "absolute", left: 166, top: 1010, fontFamily: F.vt, fontSize: 30, color: CY, opacity: tween(t, 0.3, 0.45), letterSpacing: "0.06em" }}>
        ID 2077-X · SYNC {Math.round(mix(40, 99, tween(t, 0.3, 1.4, ease.out)))}%{Math.floor(t * 3) % 2 ? "_" : " "}
      </div>
      {/* RGB-split title */}
      {[[CY, -4], [MAG, 4], ["#fff", 0]].map(([c, o], i) => (
        <div key={i} style={{ position: "absolute", left: 0, top: 1080, width: PW, textAlign: "center", fontFamily: F.orbitron, fontWeight: 900, fontSize: 80, letterSpacing: "0.02em", color: c as string, mixBlendMode: i < 2 ? "screen" : "normal", opacity: i < 2 ? 0.9 : 1, transform: `translateX(${(o as number) * (1 + g * 4) + (1 - tween(t, 0.18, 0.42, ease.expo)) * 700}px)`, clipPath: g > 0.3 && i === 2 ? `inset(${hash(Math.floor(t * 30)) * 60}% 0 ${hash(Math.floor(t * 30) + 3) * 30}% 0)` : undefined }}>
          CYBERPUNK
        </div>
      ))}
      {/* scanlines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 4px)", pointerEvents: "none" }} />
      <Grain t={t} amt={0.1} />
    </Frame>
  );
};
