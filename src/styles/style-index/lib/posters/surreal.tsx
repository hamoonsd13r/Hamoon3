// 15 · Surreal — a dream that holds still long enough to sit in: an island floating up through real clouds with an old
// door standing open on it, warm light spilling out; a red armchair swinging from ropes that come out of the sky,
// pebbles falling from the roots, a pale daytime moon.
import React from "react";
import { Img, staticFile } from "remotion";
import { F, PH, PW, ease, hash, mix, tween } from "../theme";
import { Cut, Frame, Grain, ar, type PosterProps } from "../kit";

const Cloud: React.FC<{ n: number; x: number; y: number; w: number; o?: number; tint?: string }> = ({ n, x, y, w, o = 1, tint }) => (
  <Img src={staticFile(`styles/documentary/clouds/cu${n}.png`)} style={{ position: "absolute", left: x, top: y, width: w, maxWidth: "none", opacity: o, filter: tint }} />
);
// the island (SUR-01) 600 wide: its grass at image y 590; the door (SUR-03) stands on it, right of the trunk
const IX = 60, IY = 470, IW = 600, IK = IW / 1024, GRASS = IY + 590 * IK;
const DW = 92, DH = DW * ar("SUR-03"), DX = 468;

export const Surreal: React.FC<PosterProps> = ({ t }) => {
  const rise = tween(t, 0, 0.42, (u) => ease.outBack(u, 1.15));
  const bob = Math.sin(t * 2.1) * 10, tilt = Math.sin(t * 1.7 + 1) * 1.2;
  const swingIn = tween(t, 0.06, 0.5, ease.out);
  const swing = mix(12, 0, swingIn) + Math.sin((t - 0.3) * Math.PI) * 4 * swingIn;
  const drift = (k: number) => t * k;
  const glow = tween(t, 0.3, 0.7) * (0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 2.3));
  return (
    <Frame bg="#8FC1EC">
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #5E9BD6 0%, #9CCBF0 45%, #EDE3D6 100%)" }} />
      {/* pale moon */}
      <div style={{ position: "absolute", left: 70, top: 300, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.85), rgba(240,236,228,0.55) 60%, rgba(240,236,228,0) 72%)" }} />
      {/* far clouds */}
      <Cloud n={3} x={-200 - drift(18)} y={760} w={1200} o={0.9} tint="brightness(1.25)" />
      <Cloud n={2} x={-120 + drift(12)} y={360} w={620} o={0.5} tint="brightness(1.3)" />
      {/* birds */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, 1, 2].map((i) => {
          const bx = ((t * 40 + i * 70) % 900) - 80, by = 420 + i * 28 + Math.sin(t * 2 + i) * 6, f = Math.sin(t * 11 + i * 2) * 5;
          return <path key={i} d={`M${bx - 9},${by - f} Q${bx - 3},${by - 2} ${bx},${by} Q${bx + 3},${by - 2} ${bx + 9},${by - f}`} stroke="#3B4A5E" strokeWidth={2.4} fill="none" strokeLinecap="round" />;
        })}
      </svg>
      {/* the island, with the door standing open on it */}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${mix(700, 0, rise) + bob}px) rotate(${tilt}deg)`, transformOrigin: "45% 70%" }}>
        <Cut id="SUR-01" x={IX} y={IY} w={IW} style={{ filter: "drop-shadow(0 30px 30px rgba(40,60,90,0.25))" }} />
        {/* light spilling from the door onto the grass */}
        <div style={{ position: "absolute", left: DX - 70, top: GRASS - 40, width: DW + 200, height: 70, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,214,140,0.85), rgba(255,190,110,0))", opacity: glow, mixBlendMode: "screen" }} />
        <div style={{ position: "absolute", left: DX - 40, top: GRASS - DH - 30, width: DW + 80, height: DH + 40, borderRadius: "40%", background: "radial-gradient(closest-side, rgba(255,214,140,0.55), rgba(255,190,110,0))", opacity: glow, mixBlendMode: "screen" }} />
        <Cut id="SUR-03" x={DX} y={GRASS - DH + 6} w={DW} style={{ filter: "drop-shadow(-6px 10px 8px rgba(30,40,30,0.35))" }} />
        {/* pebbles falling from the roots */}
        <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {Array.from({ length: 7 }, (_, i) => {
            const per = 1.3 + hash(i) * 0.8, ph = ((t + hash(i * 3) * per) % per) / per;
            const x = 230 + hash(i * 5.1) * 220, y = 1220 + ph * ph * 260;
            return <circle key={i} cx={x} cy={y} r={3 + hash(i * 2) * 4} fill="#6E5A48" opacity={(1 - ph) * 0.8} />;
          })}
        </svg>
      </div>
      {/* the swing: ropes out of the sky */}
      <div style={{ position: "absolute", left: 414, top: -20, width: 300, height: 450, transform: `rotate(${swing}deg)`, transformOrigin: "50% -120%" }}>
        <Cut id="SUR-02" x={0} y={0} w={300} style={{ filter: "drop-shadow(0 20px 18px rgba(40,60,90,0.25))" }} />
      </div>
      {/* near cloud, in front */}
      <Cloud n={4} x={-260 + drift(30)} y={1060} w={1300} o={0.95} tint="brightness(1.3)" />
      <div style={{ position: "absolute", left: 42, top: 84, fontFamily: F.instrumentI, fontSize: 124, lineHeight: 1, color: "#fff", textShadow: "0 6px 30px rgba(30,60,100,0.35)", clipPath: `inset(-10% ${100 - 100 * tween(t, 0.18, 0.56, ease.inOut)}% -10% 0)` }}>surreal</div>
      <div style={{ position: "absolute", left: 50, top: 222, fontFamily: F.inter, fontWeight: 500, fontSize: 15, letterSpacing: "0.3em", color: "#fff", opacity: tween(t, 0.4, 0.7) * 0.92 }}>A DREAM YOU CAN SIT IN</div>
      <Grain t={t} amt={0.06} />
    </Frame>
  );
};
