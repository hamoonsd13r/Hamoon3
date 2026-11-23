// 17 · Victorian — a gilt cameo on damask: the oval frame, its bead border and scrollwork draw themselves round the
// engraved portrait, botanical engravings rise at the foot, a ribbon banner unfurls with Didone caps and a script.
import React from "react";
import { Img } from "remotion";
import { F, PH, PW, ease, mix, ramp, tween } from "../theme";
import { Frame, Grain, Vignette, ar, img, type PosterProps } from "../kit";

const BG = "#152E22", GOLD = "#D2AE62", RIBBON = "#7A1F2B";
const OX = 360, OY = 560, RX = 214, RY = 286;

const Scroll: React.FC<{ d: string; u: number; w?: number }> = ({ d, u, w = 4 }) => (
  <path d={d} stroke="url(#vgold)" strokeWidth={w} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - u} />
);
const oval = (rx: number, ry: number) => `M${OX},${OY - ry} A${rx},${ry} 0 1,1 ${OX},${OY + ry} A${rx},${ry} 0 1,1 ${OX},${OY - ry}`;

const TOP = OY - RY - 10;
const CREST = [
  `M360,${TOP} C344,${TOP - 30} 312,${TOP - 42} 290,${TOP - 30} C270,${TOP - 18} 274,${TOP + 10} 296,${TOP + 12} C312,${TOP + 14} 316,${TOP - 4} 304,${TOP - 10}`,
  `M360,${TOP} C376,${TOP - 30} 408,${TOP - 42} 430,${TOP - 30} C450,${TOP - 18} 446,${TOP + 10} 424,${TOP + 12} C408,${TOP + 14} 404,${TOP - 4} 416,${TOP - 10}`,
  `M360,${TOP - 6} C352,${TOP - 32} 356,${TOP - 56} 360,${TOP - 68} C364,${TOP - 56} 368,${TOP - 32} 360,${TOP - 6}`,
  `M300,${TOP - 20} C270,${TOP - 50} 230,${TOP - 46} 214,${TOP - 20} C204,${TOP - 2} 216,${TOP + 18} 232,${TOP + 14}`,
  `M420,${TOP - 20} C450,${TOP - 50} 490,${TOP - 46} 506,${TOP - 20} C516,${TOP - 2} 504,${TOP + 18} 488,${TOP + 14}`,
];
const CORNER = "M34,34 C96,34 120,58 120,98 C120,122 102,134 88,128 C76,122 78,106 90,106 M34,34 C34,96 58,120 98,120 C122,120 134,102 128,88 C122,76 106,78 106,90";

export const Victorian: React.FC<PosterProps> = ({ t }) => {
  const draw = tween(t, 0, 0.5, ease.inOut);
  const iris = tween(t, 0.04, 0.42, ease.out);
  const orn = tween(t, 0.12, 0.7, ease.inOut);
  const rib = tween(t, 0.3, 0.62, ease.expo);
  const flora = tween(t, 0.18, 0.6, ease.out);
  // candle-light on the gilt: a slow breath and a quick flicker
  const flick = 1 + 0.05 * Math.sin(t * 2.1) * 0.5 + 0.04 * Math.sin(t * 23) * Math.sin(t * 7.3);
  const beads = 52;
  return (
    <Frame bg={BG}>
      {/* damask, drifting */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, opacity: 0.55 }}>
        <defs>
          <pattern id="vdam" width={120} height={160} patternUnits="userSpaceOnUse" patternTransform={`translate(0, ${t * 10})`}>
            <path d="M60,10 C80,40 100,50 100,80 C100,110 80,120 60,150 C40,120 20,110 20,80 C20,50 40,40 60,10 Z M60,50 C70,65 78,72 78,80 C78,92 70,98 60,110 C50,98 42,92 42,80 C42,72 50,65 60,50 Z" fill="#1E4231" fillRule="evenodd" />
            <circle cx={0} cy={80} r={6} fill="#1E4231" />
            <circle cx={120} cy={80} r={6} fill="#1E4231" />
          </pattern>
          <linearGradient id="vgold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F2DC9B" />
            <stop offset="0.45" stopColor={GOLD} />
            <stop offset="1" stopColor="#8E6A2E" />
          </linearGradient>
          <clipPath id="voval">
            <ellipse cx={OX} cy={OY} rx={(RX - 12) * mix(0.15, 1, iris)} ry={(RY - 12) * mix(0.15, 1, iris)} />
          </clipPath>
        </defs>
        <rect width={PW} height={PH} fill="url(#vdam)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, filter: `brightness(${flick})` }}>
        {/* the cameo */}
        <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
          <ellipse cx={OX} cy={OY} rx={RX - 12} ry={RY - 12} fill="#EFE3C8" opacity={iris} />
        </svg>
        <div style={{ position: "absolute", inset: 0, clipPath: "url(#voval)" }}>
          <Img src={img("VIC-01")} style={{ position: "absolute", left: OX - 236, top: OY - 330, width: 472, height: 708, maxWidth: "none", opacity: iris, transform: `scale(${1 + 0.035 * ramp(t, 0.4, 6)})`, transformOrigin: "50% 40%" }} />
        </div>
        {/* the frame: thick gilt oval, a bead border, a fine outer line — locked to the cameo */}
        <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, filter: "drop-shadow(0 3px 2px rgba(0,0,0,0.55))" }}>
          <path d={oval(RX, RY)} stroke="url(#vgold)" strokeWidth={12} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <path d={oval(RX - 12, RY - 12)} stroke="url(#vgold)" strokeWidth={2.5} fill="none" opacity={draw} />
          <path d={oval(RX + 22, RY + 22)} stroke="url(#vgold)" strokeWidth={2} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          {Array.from({ length: beads }, (_, i) => {
            const a = (i / beads) * Math.PI * 2 - Math.PI / 2;
            return ramp(draw, i / beads - 0.02, i / beads) > 0 ? <circle key={i} cx={OX + Math.cos(a) * (RX + 11)} cy={OY + Math.sin(a) * (RY + 11)} r={3.2} fill={GOLD} /> : null;
          })}
          {CREST.map((d, i) => <Scroll key={i} d={d} u={ramp(orn, i * 0.08, i * 0.08 + 0.6)} />)}
          {[[0, 0, 1, 1], [PW, 0, -1, 1], [0, PH, 1, -1], [PW, PH, -1, -1]].map(([x, y, sx, sy], i) => (
            <g key={i} transform={`translate(${x},${y}) scale(${sx},${sy})`}>
              <Scroll d={CORNER} u={ramp(orn, 0.1 + i * 0.05, 0.7 + i * 0.05)} w={3} />
            </g>
          ))}
        </svg>
        {/* botanical engravings at the foot of the cameo, gilded */}
        {[-1, 1].map((s) => (
          <div key={s} style={{ position: "absolute", left: s < 0 ? -10 : PW + 10 - 300, top: 640 + (1 - flora) * 60, width: 300, height: 300 * ar("VIC-02"), opacity: flora * 0.92, transform: `scaleX(${-s}) rotate(${Math.sin(t * 1.3 + s) * 0.8}deg)`, transformOrigin: "50% 100%" }}>
            <Img src={img("VIC-02")} style={{ width: "100%", height: "100%", maxWidth: "none", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }} />
          </div>
        ))}
        {/* ribbon banner with the title */}
        <svg width={PW} height={260} style={{ position: "absolute", left: 0, top: 930, overflow: "visible" }}>
          <g transform={`translate(360, 92) scale(${rib}, 1)`}>
            <path d="M-300,-12 L-330,-48 L-262,-44 L-262,40 L-330,44 L-300,6 Z" fill="#5A1520" />
            <path d="M300,-12 L330,-48 L262,-44 L262,40 L330,44 L300,6 Z" fill="#5A1520" />
            <path d="M-270,-50 Q0,-80 270,-50 L270,48 Q0,18 -270,48 Z" fill={RIBBON} stroke="url(#vgold)" strokeWidth={3} />
          </g>
        </svg>
        <div style={{ position: "absolute", left: 0, top: 962, width: PW, textAlign: "center", fontFamily: F.bodoni, fontWeight: 700, fontSize: 64, letterSpacing: "0.22em", marginLeft: "0.11em", color: "#F3E6C4", opacity: tween(t, 0.42, 0.62), textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}>
          VICTORIAN
        </div>
        <div style={{ position: "absolute", left: 0, top: 878, width: PW, textAlign: "center", fontFamily: F.pinyon, fontSize: 64, color: GOLD, opacity: tween(t, 0.36, 0.56), textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}>The</div>
        <div style={{ position: "absolute", left: 0, top: 1072, width: PW, textAlign: "center", fontFamily: F.pinyon, fontSize: 58, color: GOLD, opacity: tween(t, 0.5, 0.75), textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}>Style &amp; Ornament</div>
        <div style={{ position: "absolute", left: 0, top: 1160, width: PW, textAlign: "center", fontFamily: F.cormorant, fontWeight: 600, fontSize: 22, letterSpacing: "0.42em", color: GOLD, opacity: tween(t, 0.55, 0.85) }}>ANNO MDCCCLXXXVII</div>
      </div>
      <Vignette amt={0.6} />
      <Grain t={t} amt={0.12} />
    </Frame>
  );
};
