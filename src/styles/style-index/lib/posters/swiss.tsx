// 14 · Swiss Design — a six-column grid, giant sans letters snapping into it, one red circle rolling in like a sun, a
// black-and-white photomontage: a man leaping with an open umbrella in front of it; small objective type.
import React from "react";
import { Img } from "remotion";
import { F, PH, PW, ease, kf, mix, tween } from "../theme";
import { Frame, Grain, ar, img, type PosterProps } from "../kit";

const BG = "#F1EFEA", INK = "#111", RED = "#E2231A";
const M = 48, G = 16, COLW = (PW - 2 * M - 5 * G) / 6; // 6 columns
const col = (i: number) => M + i * (COLW + G);
// the jumper (SWI-01, trimmed): 380 wide; the umbrella hand in image px (he hangs from it)
const JW = 380, JH = JW * ar("SWI-01"), JK = JW / 1118, HX = 317, HY = 650;
const JX = 250, JY = 420;

export const Swiss: React.FC<PosterProps> = ({ t }) => {
  const grid = tween(t, 0, 0.3, ease.expo);
  const letters = ["S", "W", "I", "S", "S"];
  const circK = tween(t, 0.1, 0.44, ease.expo);
  const cx = mix(900, 530, circK), roll = mix(220, 0, circK) + t * 40;
  // he drops in under the umbrella, then floats and sways from the handle
  const drop = tween(t, 0.06, 0.46, (u) => ease.outBack(u, 1.2));
  const fy = mix(-760, 0, drop) + Math.sin(t * 2.4) * 8;
  const sway = Math.sin(t * 1.9 + 0.6) * 2.2 * tween(t, 0.4, 0.8);
  const bar = tween(t, 0.3, 0.7, ease.expo);
  return (
    <Frame bg={BG}>
      {/* grid */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const x = i < 6 ? col(i) : col(5) + COLW;
          return <line key={i} x1={x} x2={x} y1={0} y2={PH * grid} stroke="#D8D3CA" strokeWidth={1} />;
        })}
        {[200, 520, 840, 1160].map((y, i) => (
          <line key={y} x1={0} x2={PW * tween(t, 0.04 + i * 0.04, 0.34 + i * 0.04, ease.expo)} y1={y} y2={y} stroke="#D8D3CA" strokeWidth={1} />
        ))}
      </svg>
      {/* SWISS, vertical, along the left three columns */}
      <div style={{ position: "absolute", left: col(0) - 10, top: 1196, width: 1100, height: 330, transform: "rotate(-90deg)", transformOrigin: "0 0" }}>
        {letters.map((ch, i) => {
          const u = tween(t, 0.04 + i * 0.055, 0.34 + i * 0.055, ease.expo);
          const from = i % 2 ? -1 : 1;
          return (
            <span key={i} style={{ display: "inline-block", fontFamily: F.inter, fontWeight: 900, fontSize: 330, lineHeight: 0.8, letterSpacing: "-0.05em", color: INK, transform: `translateY(${(1 - u) * from * 380}px)`, opacity: u > 0 ? 1 : 0 }}>
              {ch}
            </span>
          );
        })}
      </div>
      {/* the red circle rolls in and keeps turning */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(${cx}, 420) rotate(${roll})`}>
          <circle r={118} fill={RED} />
          <line x1={0} y1={0} x2={0} y2={-118} stroke={BG} strokeWidth={4} />
        </g>
      </svg>
      {/* the jumper, in front of the circle and the letters */}
      <div style={{ position: "absolute", left: JX, top: JY + fy, width: JW, height: JH, transformOrigin: `${HX * JK}px ${HY * JK}px`, transform: `rotate(${sway}deg)`, filter: "grayscale(1) contrast(1.18) brightness(1.04) drop-shadow(0 18px 18px rgba(0,0,0,0.18))" }}>
        <Img src={img("SWI-01")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
      </div>
      {/* objective small type */}
      <div style={{ position: "absolute", left: col(3), top: 86, fontFamily: F.inter, fontWeight: 500, fontSize: 15, letterSpacing: "0.1em", color: INK, opacity: tween(t, 0.4, 0.7) }}>
        {String(Math.min(46, Math.floor(kf(t, [[0.3, 0], [0.9, 46]], ease.out)))).padStart(2, "0")} / Kunstgewerbemuseum
      </div>
      <div style={{ position: "absolute", left: col(3), top: 112, fontFamily: F.inter, fontWeight: 900, fontSize: 132, letterSpacing: "-0.04em", lineHeight: 1, color: RED, transform: `translateX(${(1 - tween(t, 0.2, 0.5, ease.expo)) * 300}px)` }}>
        1957
      </div>
      <div style={{ position: "absolute", left: col(3), top: 1092, width: (col(5) + COLW - col(3)) * bar, height: 10, background: INK }} />
      <div style={{ position: "absolute", left: col(3), top: 1118, width: col(5) + COLW - col(3), fontFamily: F.inter, color: INK }}>
        <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.01em", clipPath: `inset(0 ${100 - 100 * tween(t, 0.26, 0.56, ease.expo)}% 0 0)` }}>
          Internationaler
          <br />
          Typografischer Stil
        </div>
        <div style={{ fontWeight: 400, fontSize: 16, lineHeight: 1.45, marginTop: 10, opacity: tween(t, 0.46, 0.66) }}>Grid. Order. Clarity. Objective sans-serif.</div>
      </div>
      <div style={{ position: "absolute", left: col(3), top: 1232, fontFamily: F.inter, fontWeight: 600, fontSize: 14, letterSpacing: "0.18em", color: INK, opacity: tween(t, 0.5, 0.8) }}>
        SWISS DESIGN — ZÜRICH / BASEL
      </div>
      <Grain t={t} amt={0.06} />
    </Frame>
  );
};
