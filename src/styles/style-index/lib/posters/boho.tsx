// 16 · Bohemian — earthy and hand-made: a terracotta arch window with a sunset inside, a sun rising behind a gouache
// toucan among monstera and hibiscus, a macramé fringe swaying from a wooden rod, pampas plumes, a scalloped border,
// twinkling stars and a warm serif title.
import React from "react";
import { F, PH, PW, ease, hash, mix, tween } from "../theme";
import { Cut, Frame, Grain, Paper, ar, type PosterProps } from "../kit";

const CREAM = "#F3E6D0", TERRA = "#C0643F", RUST = "#9C4A2C", MUSTARD = "#D69A2D", OLIVE = "#7B7B3A", BROWN = "#3E2418";
// the arch window
const AX = 100, AW = 520, AR = AW / 2, ACX = AX + AR, ACY = 430, ABOT = 1000;
const archD = (inset = 0) => `M${AX + inset},${ABOT} L${AX + inset},${ACY} A${AR - inset},${AR - inset} 0 0 1 ${AX + AW - inset},${ACY} L${AX + AW - inset},${ABOT} Z`;
const archLen = 2 * (ABOT - ACY) + Math.PI * AR + AW;
// the toucan arrangement (BOH-01, trimmed)
const BW = 560, BH = BW * ar("BOH-01"), BX = 80, BY = 356;

/** a pampas plume: a stem and soft feathery strokes that open upward */
const Plume: React.FC<{ x: number; y: number; h: number; a: number; t: number; at: number; seed: number }> = ({ x, y, h, a, t, at, seed }) => {
  const g = tween(t, at, at + 0.5, ease.out);
  const sway = Math.sin(t * 1.6 + seed) * 3 + a;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${sway}) scale(1, ${g})`}>
      <path d={`M0,0 C4,${-h * 0.4} 10,${-h * 0.75} 14,${-h}`} stroke="#8F7550" strokeWidth={3.5} fill="none" />
      {Array.from({ length: 26 }, (_, i) => {
        const p = 0.45 + (i / 26) * 0.55, py = -h * p, px = 14 * Math.pow(p, 1.4);
        const side = i % 2 ? 1 : -1, len = 34 + 26 * Math.sin(p * Math.PI) + hash(seed * 9 + i) * 10;
        return <path key={i} d={`M${px},${py} q${side * len * 0.4},${-len * 0.5} ${side * len * 0.75},${-len * 0.9}`} stroke="#C9A372" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.9} />;
      })}
    </g>
  );
};

export const Boho: React.FC<PosterProps> = ({ t }) => {
  const draw = tween(t, 0, 0.42, ease.inOut);
  const fill = tween(t, 0.04, 0.34, ease.out);
  const sunY = mix(600, 470, tween(t, 0.08, 0.7, ease.out)) + Math.sin(t * 1.2) * 4;
  const bird = tween(t, 0.1, 0.44, (u) => ease.outBack(u, 1.5));
  const sway = Math.sin(t * 1.6) * 2.2 * tween(t, 0.4, 0.8);
  const cords = tween(t, 0.16, 0.5, ease.out);
  return (
    <Frame bg={CREAM}>
      <Paper color={CREAM} amt={0.22} id="boho" />
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <clipPath id="barch">
            <path d={archD(10)} />
          </clipPath>
          <linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9A55A" />
            <stop offset="0.55" stopColor={TERRA} />
            <stop offset="1" stopColor={RUST} />
          </linearGradient>
        </defs>
        {/* the arch: terracotta frame, a sunset inside, the sun rising with turning rays */}
        <path d={archD(0)} fill={TERRA} opacity={fill} />
        <g clipPath="url(#barch)" opacity={fill}>
          <rect x={AX} y={ACY - AR} width={AW} height={ABOT - ACY + AR} fill="url(#bsky)" />
          <g transform={`translate(${ACX}, ${sunY}) rotate(${t * 10})`}>
            {Array.from({ length: 24 }, (_, i) => (
              <line key={i} x1={0} y1={-176} x2={0} y2={-420} stroke={CREAM} strokeWidth={3} strokeLinecap="round" opacity={0.35} transform={`rotate(${i * 15})`} />
            ))}
          </g>
          <circle cx={ACX} cy={sunY} r={150} fill="#F2C46B" />
          <circle cx={ACX} cy={sunY} r={150} fill="none" stroke={CREAM} strokeWidth={3} opacity={0.6} />
          {/* low dunes */}
          <path d={`M${AX},880 C${AX + 140},840 ${AX + 300},900 ${AX + AW},850 L${AX + AW},${ABOT} L${AX},${ABOT} Z`} fill={RUST} />
          <path d={`M${AX},930 C${AX + 180},900 ${AX + 360},960 ${AX + AW},920 L${AX + AW},${ABOT} L${AX},${ABOT} Z`} fill="#7E3A22" />
        </g>
        {/* the frame lines draw on */}
        <path d={archD(-14)} fill="none" stroke={BROWN} strokeWidth={2.5} strokeDasharray={archLen * 1.05} strokeDashoffset={archLen * 1.05 * (1 - draw)} />
        <path d={archD(-24)} fill="none" stroke={BROWN} strokeWidth={1.2} strokeDasharray="2 7" opacity={draw} />
        {/* scallops along the outer arch */}
        {Array.from({ length: 23 }, (_, i) => {
          const a = Math.PI + (i / 22) * Math.PI, r = AR + 36;
          const x = ACX + Math.cos(a) * r, y = ACY + Math.sin(a) * r;
          return <circle key={i} cx={x} cy={y} r={7} fill={i % 2 ? MUSTARD : TERRA} opacity={tween(t, 0.2 + i * 0.012, 0.3 + i * 0.012)} />;
        })}
        {/* twinkling stars */}
        {[[60, 260, 9, 0], [660, 300, 8, 1.3], [44, 620, 7, 2.1], [676, 700, 9, 3.4], [600, 150, 6, 0.7], [120, 140, 6, 2.6]].map(([x, y, s, p], i) => {
          const k = s * (0.6 + 0.4 * Math.sin(t * 4.5 + p)) * tween(t, 0.3 + i * 0.04, 0.5 + i * 0.04);
          return <path key={i} d={`M${x},${y - k * 1.6} Q${x},${y} ${x + k},${y} Q${x},${y} ${x},${y + k * 1.6} Q${x},${y} ${x - k},${y} Q${x},${y} ${x},${y - k * 1.6} Z`} fill={BROWN} opacity={0.8} />;
        })}
        {/* macramé: a wooden rod and knotted cords that swing */}
        <line x1={150} x2={570} y1={58} y2={58} stroke="#8A5A36" strokeWidth={10} strokeLinecap="round" opacity={tween(t, 0.1, 0.25)} />
        {Array.from({ length: 15 }, (_, i) => {
          const x = 170 + i * 27, len = (70 + Math.sin((i / 14) * Math.PI) * 60) * cords, a = Math.sin(t * 2 + i * 0.5) * 3;
          return (
            <g key={i} transform={`translate(${x}, 62) rotate(${a})`}>
              <line x1={0} y1={0} x2={0} y2={len} stroke="#B98A5E" strokeWidth={6} strokeLinecap="round" />
              {len > 30 ? <circle cx={0} cy={len * 0.4} r={7} fill="#A87449" /> : null}
              {len > 60 ? <circle cx={0} cy={len * 0.75} r={6} fill={i % 3 ? "#A87449" : MUSTARD} /> : null}
              <path d={`M-5,${len} l-3,${18 * cords} M0,${len} l0,${22 * cords} M5,${len} l3,${18 * cords}`} stroke="#B98A5E" strokeWidth={2.4} strokeLinecap="round" />
            </g>
          );
        })}
        {/* pampas */}
        <Plume x={40} y={PH + 20} h={560} a={8} t={t} at={0.18} seed={1} />
        <Plume x={86} y={PH + 30} h={460} a={16} t={t} at={0.24} seed={2} />
        <Plume x={680} y={PH + 20} h={560} a={-8} t={t} at={0.2} seed={3} />
        <Plume x={636} y={PH + 30} h={440} a={-16} t={t} at={0.26} seed={4} />
      </svg>
      {/* the toucan among the leaves, overflowing the arch */}
      <div style={{ position: "absolute", left: BX, top: BY, width: BW, height: BH, transformOrigin: "50% 90%", transform: `scale(${mix(0.6, 1, bird)}) rotate(${sway}deg)`, opacity: t >= 0.1 ? 1 : 0, filter: "drop-shadow(6px 12px 10px rgba(62,36,24,0.3))" }}>
        <Cut id="BOH-01" x={0} y={0} w={BW} />
      </div>
      {/* title */}
      <div style={{ position: "absolute", left: 0, top: 1096, width: PW, textAlign: "center", fontFamily: F.yeseva, fontSize: 96, lineHeight: 1, color: BROWN, clipPath: `inset(-20% ${100 - 100 * tween(t, 0.26, 0.6, ease.inOut)}% -20% 0)` }}>Bohemian</div>
      <div style={{ position: "absolute", left: 0, top: 1214, width: PW, textAlign: "center", fontFamily: F.inter, fontWeight: 500, fontSize: 16, letterSpacing: "0.42em", color: RUST, opacity: tween(t, 0.45, 0.75) }}>
        WILD · FREE · EARTHY — EST. 1969
      </div>
      <div style={{ position: "absolute", left: 250 + 110 * (1 - tween(t, 0.4, 0.8, ease.inOut)), top: 1200, width: 220 * tween(t, 0.4, 0.8, ease.inOut), height: 1.5, background: OLIVE, opacity: 0.7 }} />
      <Grain t={t} amt={0.12} blend="multiply" />
    </Frame>
  );
};
