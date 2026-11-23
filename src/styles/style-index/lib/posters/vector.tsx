// 04 · Vector Art — a flat editorial vector poster: the illustrated coast drifts in, the guy rises with the setting sun
// as a halo, flat rays turn behind him, his shades flash, flat clouds and birds drift, palm leaves sway in front, a
// badge spins under a bold serif title.
import React from "react";
import { Img } from "remotion";
import { F, PH, PW, ease, mix, ramp, tween } from "../theme";
import { Frame, Grain, Letters, ar, img, type PosterProps } from "../kit";

const NAVY = "#1C2541", CREAM = "#FFF4E0", CORAL = "#FF7E67", MUSTARD = "#FFD166", LEAF = "#0F4C4A";
// the guy (VEC-01, trimmed): 700 wide, his face centred on the plate's sun; lens centres in image px
const GW = 700, GH = GW * ar("VEC-01"), GX = 10, GY = 417;
const SUN = { x: 359, y: 672 };

const Leaf: React.FC<{ a: number; s?: number }> = ({ a, s = 1 }) => (
  <g transform={`rotate(${a}) scale(${s})`}>
    <path d="M0,0 C140,30 300,140 380,330 C250,250 120,170 0,0 Z" fill={LEAF} />
    <path d="M0,0 C130,60 260,170 380,330" stroke="#0A3533" strokeWidth={4} fill="none" />
  </g>
);

export const Vector: React.FC<PosterProps> = ({ t }) => {
  const push = mix(1.1, 1.0, ease.out(ramp(t, 0, 2.6)));
  const rise = tween(t, 0, 0.36, (u) => ease.outBack(u, 1.15));
  const bob = Math.sin(2 * Math.PI * (t - 0.4)) * 6 * tween(t, 0.4, 0.8);
  const badge = tween(t, 0.32, 0.56, (u) => ease.outBack(u, 2.2));
  const sway = (k: number) => Math.sin(t * 2.2 + k) * 3;
  return (
    <Frame bg={CORAL}>
      {/* the coast */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={img("VEC-02")} style={{ position: "absolute", left: 0, top: -5, width: PW, height: 1290, maxWidth: "none", transform: `scale(${push}) translateY(${(1 - ramp(t, 0, 3)) * 14}px)`, transformOrigin: "50% 52%" }} />
      </div>
      {/* flat rays turning round the sun, behind him */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, opacity: 0.42 * tween(t, 0.1, 0.5) }}>
        <clipPath id="vsky">
          <rect x={0} y={0} width={PW} height={698 + (1 - ramp(t, 0, 3)) * 14} />
        </clipPath>
        <g clipPath="url(#vsky)">
        <g transform={`translate(${SUN.x}, ${SUN.y + (1 - ramp(t, 0, 3)) * 14}) rotate(${t * 9}) scale(${mix(0.6, 1, tween(t, 0.1, 0.6, ease.out))})`}>
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M-14,-150 L14,-150 L40,-560 L-40,-560 Z" fill={i % 2 ? MUSTARD : CREAM} transform={`rotate(${i * 22.5})`} />
          ))}
        </g>
        </g>
      </svg>
      {/* flat clouds drifting */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        {[[0, 330, 1, 0], [1, 372, 0.7, 0.45]].map(([k, y, s, ph]) => {
          const x = ((t * 22 * (1 + k * 0.5) + ph * 900) % 980) - 160;
          return (
            <g key={k} transform={`translate(${x}, ${y}) scale(${s})`}>
              <path d="M0,40 C0,18 22,8 40,16 C48,-6 84,-8 96,14 C112,4 140,12 140,40 Z" fill={CREAM} />
              <rect x={0} y={38} width={140} height={6} rx={3} fill={CREAM} />
            </g>
          );
        })}
      </svg>
      {/* flat birds */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, 1, 2].map((i) => {
          const bx = mix(-60, 780, (t * 0.16 + i * 0.13) % 1), by = 380 + i * 34 + Math.sin(t * 2 + i) * 6, f = Math.sin(t * 13 + i) * 8;
          return <path key={i} d={`M${bx - 14},${by - f} Q${bx - 5},${by - 3} ${bx},${by} Q${bx + 5},${by - 3} ${bx + 14},${by - f}`} stroke={NAVY} strokeWidth={4} fill="none" strokeLinecap="round" />;
        })}
      </svg>
      {/* the guy */}
      <div style={{ position: "absolute", left: GX, top: GY + mix(620, 0, rise) + bob, width: GW, height: GH, filter: "drop-shadow(0 24px 0 rgba(28,37,65,0.18))" }}>
        <Img src={img("VEC-01")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
      </div>
      {/* flat palms in front */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(-40,${PH + 20}) rotate(${-70 + sway(0)})`}>
          <Leaf a={10} s={0.8} /><Leaf a={34} s={0.7} />
        </g>
        <g transform={`translate(${PW + 40},${PH + 20}) scale(-1,1) rotate(${-70 + sway(1.4)})`}>
          <Leaf a={12} s={0.78} /><Leaf a={36} s={0.66} />
        </g>
        {/* spinning badge */}
        <g transform={`translate(600, 470) rotate(${t * 60}) scale(${badge})`}>
          <circle r={66} fill={MUSTARD} stroke={NAVY} strokeWidth={5} />
          <path id="vbadge" d="M-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" fill="none" />
          <text fontFamily={F.inter} fontWeight={800} fontSize={15} letterSpacing="3" fill={NAVY}>
            <textPath href="#vbadge">100% VECTOR ✦ FLAT ✦ CLEAN ✦</textPath>
          </text>
          <circle r={16} fill={CORAL} />
        </g>
      </svg>
      {/* title */}
      <div style={{ position: "absolute", left: 0, top: 70, width: PW, textAlign: "center", fontFamily: F.dmSerif, fontSize: 176, lineHeight: 1, color: CREAM, textShadow: `7px 7px 0 ${NAVY}` }}>
        <Letters text="VECTOR" t={t} at={0.05} each={0.045} dur={0.26} letter={(u) => ({ opacity: u > 0 ? 1 : 0, transform: `translateY(${(1 - ease.outBack(u, 2)) * 90}px) scale(${mix(0.6, 1, ease.outBack(u, 2))})` })} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 262, width: PW, display: "flex", justifyContent: "center", gap: 16, opacity: tween(t, 0.3, 0.55) }}>
        {["ART", "·", "SUMMER", "·", "VOL. 04"].map((s, i) => (
          <span key={i} style={{ fontFamily: F.inter, fontWeight: 800, fontSize: 22, letterSpacing: "0.36em", color: NAVY, background: i % 2 ? undefined : CREAM, padding: i % 2 ? 0 : "4px 6px 4px 12px" }}>{s}</span>
        ))}
      </div>
      <Grain t={t} amt={0.1} />
    </Frame>
  );
};
