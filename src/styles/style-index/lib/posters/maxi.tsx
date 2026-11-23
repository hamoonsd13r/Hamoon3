// 02 · Maximalism — more is more: a pattern-clash collage behind, a spinning starburst, the cover girl whose gum bubble
// swells on every beat, stickers that pop on twos, mixed type, a turning badge and a marquee. Loud, but ordered.
import React from "react";
import { F, PH, PW, ease, mix, ramp, tween } from "../theme";
import { Img } from "remotion";
import { Cut, Frame, Grain, Halftone, img, jitter, Letters, type PosterProps } from "../kit";

const PINK = "#FF2E88", YEL = "#F7E733", CYAN = "#2BE0FF", INK = "#111";

const starPts = (n: number, r1: number, r2: number) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");

/** a sticker that pops in (overshoot) and then wobbles on twos */
const Sticker: React.FC<{ t: number; at: number; x: number; y: number; r?: number; s?: number; seed: number; children: React.ReactNode }> = ({ t, at, x, y, r = 0, s = 1, seed, children }) => {
  const u = tween(t, at, at + 0.22, (q) => ease.outBack(q, 2.6));
  if (u <= 0) return null;
  const [jx, jy, jr] = jitter(t, seed, 1.6, 12);
  return <g transform={`translate(${x + jx}, ${y + jy}) rotate(${r + jr * 3}) scale(${u * s})`}>{children}</g>;
};

export const Maxi: React.FC<PosterProps> = ({ t }) => {
  const rise = tween(t, 0, 0.34, (u) => ease.outBack(u, 1.3));
  const scroll = (t * 120) % 80;
  const marquee = (t * 160) % 560;
  return (
    <Frame bg={PINK}>
      {/* the pattern clash: leopard, checkers, glitter, chrome hearts — slowly pushing and turning */}
      <Img src={img("MAXI-02")} style={{ position: "absolute", left: 0, top: -5, width: PW, height: 1290, maxWidth: "none", transform: `scale(${mix(1.14, 1.04, ease.out(ramp(t, 0, 3))) + 0.01 * Math.sin(t * 1.2)}) rotate(${mix(-3, 0, ease.out(ramp(t, 0, 3)))}deg)` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,46,136,0.35) 0%, rgba(255,46,136,0) 35%, rgba(17,17,17,0) 70%, rgba(17,17,17,0.35) 100%)" }} />
      {/* checkerboard band */}
      <div style={{ position: "absolute", left: -200, top: 380, width: 1200, height: 120, transform: "rotate(-12deg)", backgroundImage: `conic-gradient(${INK} 25%, #fff 0 50%, ${INK} 0 75%, #fff 0)`, backgroundSize: "60px 60px", backgroundPosition: `${scroll}px 0`, boxShadow: `0 8px 0 ${INK}` }} />
      {/* zebra block */}
      <div style={{ position: "absolute", left: 452, top: 170, width: 230, height: 230, borderRadius: 34, overflow: "hidden", transform: `rotate(${8 + Math.sin(t * 3) * 2}deg) scale(${tween(t, 0.08, 0.3, (u) => ease.outBack(u, 2))})`, border: `6px solid ${INK}`, background: `repeating-linear-gradient(55deg, ${INK} 0 18px, #fff 18px 36px)` }} />
      <Halftone color={INK} size={16} dot={0.28} opacity={0.5} mask="linear-gradient(100deg, #000 0%, transparent 45%)" />
      {/* starburst behind her */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(360, 640) rotate(${t * 24}) scale(${tween(t, 0, 0.3, (u) => ease.outBack(u, 1.8))})`}>
          <polygon points={starPts(18, 330, 270)} fill={YEL} stroke={INK} strokeWidth={8} />
        </g>
      </svg>
      {/* the cover girl */}
      <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transform: `translateY(${mix(700, 0, rise)}px)` }}>
        <Cut id="MAXI-01" x={20} y={330} w={680} style={{ filter: `drop-shadow(10px 10px 0 ${INK})` }} />
      </div>
      {/* her gum bubble swells on every beat (120 BPM) and wobbles */}
      {(() => {
        const ph = ((t + 0.02) % 0.5) / 0.5, beat = Math.exp(-ph * 5) * tween(t, 0.3, 0.5);
        const r = 56 * (1 + 0.22 * beat + 0.04 * Math.sin(t * 9));
        const x = 418, y = 629 + mix(700, 0, rise);
        return (
          <div style={{ position: "absolute", left: x - r, top: y - r * 0.96, width: r * 2, height: r * 1.92, borderRadius: "50%", background: "radial-gradient(circle at 36% 32%, #FFE3F1 0 6%, #FF8AC6 14%, #FF3D9A 46%, #E01579 78%, #B30D60 100%)", boxShadow: "inset -6px -8px 14px rgba(120,0,60,0.35), 0 6px 14px rgba(120,0,60,0.25)" }} />
        );
      })()}
      {/* stickers */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        <Sticker t={t} at={0.22} x={110} y={620} r={-14} seed={1}>
          <circle r={62} fill={YEL} stroke={INK} strokeWidth={6} />
          <circle cx={-20} cy={-12} r={8} fill={INK} /><circle cx={20} cy={-12} r={8} fill={INK} />
          <path d="M-32,12 Q0,46 32,12" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
        </Sticker>
        <Sticker t={t} at={0.3} x={620} y={700} r={12} seed={2}>
          <polygon points="-20,-70 30,-70 6,-12 36,-12 -26,74 -6,8 -36,8" fill={CYAN} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        </Sticker>
        <Sticker t={t} at={0.38} x={590} y={470} r={-8} seed={3}>
          <path d="M0,22 C-46,-8 -40,-46 -12,-46 C-2,-46 0,-34 0,-30 C0,-34 2,-46 12,-46 C40,-46 46,-8 0,22 Z" transform="scale(1.4)" fill="#FF3B30" stroke={INK} strokeWidth={4.5} />
        </Sticker>
        <Sticker t={t} at={0.46} x={130} y={1010} r={-10} seed={4}>
          <path d="M-90,-46 L90,-46 L90,30 L-10,30 L-40,64 L-36,30 L-90,30 Z" fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <text x={0} y={6} textAnchor="middle" fontFamily={F.bungee} fontSize={50} fill={INK}>WOW!</text>
        </Sticker>
        <Sticker t={t} at={0.54} x={612} y={1000} seed={5}>
          <polygon points={starPts(5, 52, 22)} fill="#fff" stroke={INK} strokeWidth={5} transform="rotate(-90)" />
        </Sticker>
        {/* turning badge */}
        <g transform={`translate(446, ${1012 + mix(700, 0, rise)}) rotate(${-t * 60}) scale(${t < 0.12 ? 0 : tween(t, 0.12, 0.32, (u) => ease.outBack(u, 2))})`}>
          <circle r={112} fill={INK} stroke="#fff" strokeWidth={6} />
          <path id="mxb" d="M-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" fill="none" />
          <text fontFamily={F.bungee} fontSize={27} fill={YEL} letterSpacing="3">
            <textPath href="#mxb">MORE IS MORE ✦ MORE IS MORE ✦ </textPath>
          </text>
          <circle r={44} fill={PINK} stroke={INK} strokeWidth={4} />
          <polygon points={starPts(5, 26, 11)} fill={YEL} transform={`rotate(${t * 140})`} />
        </g>
      </svg>
      {/* mixed type */}
      <div style={{ position: "absolute", left: 30, top: 54, fontFamily: F.bungee, fontSize: 182, lineHeight: 1, color: YEL, textShadow: `6px 6px 0 ${INK}, 12px 12px 0 ${CYAN}` }}>
        <Letters text="MAXI" t={t} at={0.04} each={0.05} dur={0.22} letter={(u, i) => ({ opacity: u > 0 ? 1 : 0, display: "inline-block", transform: `translateY(${(1 - ease.outBack(u, 2.4)) * -120}px) rotate(${(i % 2 ? 6 : -6) * (1 - u) + (i % 2 ? 3 : -3)}deg)` })} />
      </div>
      <div style={{ position: "absolute", left: 286, top: 236, padding: "4px 16px 0", background: "#fff", border: `5px solid ${INK}`, transform: `rotate(-4deg) translateX(${(1 - tween(t, 0.16, 0.4, ease.expo)) * 500}px)`, fontFamily: F.rubikMono, fontSize: 58, lineHeight: 1.15, color: PINK }}>
        MALISM
      </div>
      {/* marquee */}
      <div style={{ position: "absolute", left: -60, top: 1196, width: 900, height: 64, background: INK, transform: "rotate(-4deg)", overflow: "hidden", opacity: ramp(t, 0.1, 0.2) }}>
        <div style={{ position: "absolute", left: -marquee, top: 6, whiteSpace: "nowrap", fontFamily: F.anton, fontSize: 48, color: YEL, letterSpacing: "0.04em" }}>
          {"MAXIMALISM ✦ MORE COLOUR ✦ MORE TYPE ✦ MAXIMALISM ✦ MORE COLOUR ✦ MORE TYPE ✦ "}
        </div>
      </div>
      <Grain t={t} amt={0.09} />
    </Frame>
  );
};
