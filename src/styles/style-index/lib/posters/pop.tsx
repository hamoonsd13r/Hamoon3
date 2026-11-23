// 08 · Pop Art — a screen-printed comic cover: a Warhol grid of one marble bust in four flat palettes that swap on
// every beat (with misregistered ink), Ben-Day dots, a narration box, a price corner, speed lines and a POP! that
// slams in, and a halftone-filled masthead.
import React from "react";
import { Img } from "remotion";
import { F, PW, ease, hash, mix, ramp, tween } from "../theme";
import { Frame, Grain, Halftone, img, jitter, type PosterProps } from "../kit";

// [shadow, mid, highlight, background]
const PAL = [
  ["#1B1B3A", "#FF3EA5", "#FFD1E8", "#00B4FF"],
  ["#2B1500", "#FF6A00", "#FFE600", "#FF3EA5"],
  ["#00283A", "#00B4FF", "#CFF6FF", "#FFE600"],
  ["#2A0B00", "#E8341C", "#FFC9A8", "#2BD47D"],
];
const INK = "#111";
const hexc = (h: string) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

const Filters: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    {PAL.map((p, i) => {
      const [s, m, h] = [hexc(p[0]), hexc(p[1]), hexc(p[2])];
      return (
        <filter key={i} id={`popf${i}`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues={`${s[0]} ${m[0]} ${m[0]} ${h[0]}`} />
            <feFuncG type="discrete" tableValues={`${s[1]} ${m[1]} ${m[1]} ${h[1]}`} />
            <feFuncB type="discrete" tableValues={`${s[2]} ${m[2]} ${m[2]} ${h[2]}`} />
          </feComponentTransfer>
        </filter>
      );
    })}
    {/* the key plate: only the darkest tones, in black, for the misregistered print */}
    <filter id="popkey" colorInterpolationFilters="sRGB">
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncR type="discrete" tableValues="0 1 1 1" />
        <feFuncG type="discrete" tableValues="0 1 1 1" />
        <feFuncB type="discrete" tableValues="0 1 1 1" />
      </feComponentTransfer>
    </filter>
  </svg>
);

const starPts = (n: number, r1: number, r2: number) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1 * (0.84 + 0.16 * (((i * 37) % 5) / 4));
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");

export const Pop: React.FC<PosterProps> = ({ t }) => {
  const beat = Math.max(0, Math.floor((t - 0.5) / 0.5) + 1);
  const cx = [18, 362], cy = [252, 746], cw = 340, ch = 486;
  const popK = tween(t, 0.3, 0.5, (u) => ease.outBack(u, 2.8));
  const [jx, jy, jr] = jitter(t, 9, 2.4, 15);
  const lines = tween(t, 0.28, 0.6, ease.out);
  const mis = (k: number) => 3 + Math.sin(t * 7 + k) * 1.2; // misregistration, px
  return (
    <Frame bg="#FFF3D6">
      <Filters />
      <Halftone color="rgba(232,52,28,0.22)" size={18} dot={0.34} angle={20} />
      {/* masthead with a halftone-filled title */}
      <div style={{ position: "absolute", left: 18, top: 18, width: 684, height: 220, background: "#FFE600", border: `6px solid ${INK}`, overflow: "hidden", transform: `translateY(${(1 - tween(t, 0, 0.22, ease.expo)) * -260}px)` }}>
        <Halftone color="rgba(255,106,0,0.45)" size={12} dot={0.36} angle={30} />
        <div style={{ position: "absolute", left: 18, top: 10, fontFamily: F.anton, fontSize: 168, lineHeight: 1, letterSpacing: "0.01em", color: "#fff", WebkitTextStroke: `7px ${INK}`, paintOrder: "stroke", textShadow: `9px 9px 0 #E8341C`, transform: `translateX(${(1 - tween(t, 0.06, 0.3, ease.expo)) * -600}px)` }}>
          POP ART
        </div>
        {/* price corner + issue */}
        <div style={{ position: "absolute", right: 14, top: 14, width: 92, height: 92, background: "#fff", border: `5px solid ${INK}`, textAlign: "center", fontFamily: F.bungee, color: INK, transform: `rotate(6deg) scale(${tween(t, 0.18, 0.34, (u) => ease.outBack(u, 2.4))})` }}>
          <div style={{ fontSize: 20, marginTop: 8 }}>No.62</div>
          <div style={{ fontSize: 36, lineHeight: 1, color: "#E8341C" }}>25¢</div>
        </div>
        <div style={{ position: "absolute", left: 22, bottom: 10, fontFamily: F.bungee, fontSize: 21, color: INK, letterSpacing: "0.06em", opacity: tween(t, 0.25, 0.45) }}>THE BOLDEST STYLE IN THE WORLD!</div>
      </div>
      {/* the Warhol grid */}
      <div style={{ position: "absolute", left: 12, top: 246, width: 696, height: 998, background: INK }} />
      {[0, 1, 2, 3].map((i) => {
        const pi = (i + beat) % 4, p = PAL[pi];
        const u = tween(t, 0.04 + i * 0.06, 0.28 + i * 0.06, (q) => ease.outBack(q, 1.8));
        const w = cw + 12, h = (w * 1536) / 1024;
        return (
          <div key={i} style={{ position: "absolute", left: cx[i % 2], top: cy[Math.floor(i / 2)], width: cw, height: ch, background: p[3], overflow: "hidden", transform: `scale(${mix(0.6, 1, u)})`, opacity: t >= 0.04 + i * 0.06 ? 1 : 0 }}>
            <Halftone color="rgba(0,0,0,0.18)" size={13} dot={0.32} angle={15} />
            <Img src={img("POP-01")} style={{ position: "absolute", left: -6, top: 0, width: w, height: h, maxWidth: "none", filter: `url(#popf${pi})` }} />
            {/* misregistered black key plate */}
            <Img src={img("POP-01")} style={{ position: "absolute", left: -6 + mis(i), top: mis(i + 2) - 2, width: w, height: h, maxWidth: "none", filter: "url(#popkey)", mixBlendMode: "multiply", opacity: 0.55 }} />
          </div>
        );
      })}
      {/* narration box */}
      <div style={{ position: "absolute", left: 34, top: 268, padding: "8px 14px", background: "#FFE600", border: `4px solid ${INK}`, fontFamily: F.bungee, fontSize: 22, color: INK, transform: `translateX(${(1 - tween(t, 0.22, 0.42, ease.expo)) * -420}px)` }}>
        MEANWHILE, IN 1962…
      </div>
      {/* speed lines + POP! */}
      <svg width={PW} height={1280} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform="translate(520, 812)" opacity={ramp(t, 0.28, 0.32)}>
          {Array.from({ length: 28 }, (_, i) => {
            const a = (i / 28) * Math.PI * 2 + hash(i) * 0.1, r0 = 150 + hash(i * 3) * 30, r1 = r0 + 60 + 140 * lines;
            return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={INK} strokeWidth={5} strokeLinecap="round" opacity={1 - lines * 0.5} />;
          })}
        </g>
        <g transform={`translate(${520 + jx}, ${812 + jy}) rotate(${-12 + jr * 2}) scale(${popK})`}>
          <polygon points={starPts(14, 190, 122)} fill="#FFE600" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
          <text x={0} y={38} textAnchor="middle" fontFamily={F.bungee} fontSize={116} fill="#E8341C" stroke={INK} strokeWidth={7} paintOrder="stroke">POP!</text>
        </g>
      </svg>
      <Grain t={t} amt={0.1} blend="multiply" />
    </Frame>
  );
};
