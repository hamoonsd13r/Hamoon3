// 06 · Retro — an '80s city-pop record sleeve: the airbrushed sunset city pushes in under a misregistered print and
// VHS lines, the walkman floats in with an equaliser playing, chunky extruded type, racing stripes, a Japanese line.
import React from "react";
import { Img } from "remotion";
import { F, PH, PW, ease, hash, mix, ramp, stepT, tween } from "../theme";
import { Frame, Grain, Halftone, Letters, ar, img, type PosterProps } from "../kit";

// the walkman (RET-02, trimmed): 480 wide; its two cassette reels in image px
const WW = 480, WH = WW * ar("RET-02"), WK = WW / 1192;
const REELS: [number, number][] = [[416, 600], [632, 660]];

const BROWN = "#5A2A1D", ORANGE = "#F06B3A", MUSTARD = "#F4B13E", PINK = "#FF5FA2", TEAL = "#2F6E6A", CREAM = "#FFF1DC";

export const Retro: React.FC<PosterProps> = ({ t }) => {
  const push = mix(1.12, 1.0, ease.out(ramp(t, 0, 2.8)));
  const st = stepT(t, 12);
  const mx = 3 + (hash(Math.floor(st * 12)) - 0.5) * 2, my = 2 + (hash(Math.floor(st * 12) + 9) - 0.5) * 2;
  const wk = tween(t, 0.06, 0.42, (u) => ease.outBack(u, 1.4));
  const vhs = ((t * 0.9) % 1) * PH;
  return (
    <Frame bg="#0E3A40">
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="rtri" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.04 0.06 0.55 0.92 1.0" />
            <feFuncG type="table" tableValues="0.16 0.27 0.36 0.47 0.9" />
            <feFuncB type="table" tableValues="0.2 0.29 0.27 0.25 0.74" />
          </feComponentTransfer>
        </filter>
      </svg>
      {/* the city at sunset */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={img("RET-01")} style={{ position: "absolute", left: 0, top: -5, width: PW, height: 1290, maxWidth: "none", transform: `scale(${push})`, transformOrigin: "50% 40%", filter: "url(#rtri) contrast(1.05)" }} />
        {/* the print's magenta plate, slightly off register */}
        <Img src={img("RET-01")} style={{ position: "absolute", left: mx, top: -5 + my, width: PW, height: 1290, maxWidth: "none", transform: `scale(${push})`, transformOrigin: "50% 40%", mixBlendMode: "screen", opacity: 0.16, filter: "url(#rtri) hue-rotate(160deg) saturate(1.4)" }} />
      </div>
      <Halftone color="rgba(90,42,29,0.22)" size={10} dot={0.3} angle={30} mask="linear-gradient(180deg, transparent 55%, #000 100%)" />
      {/* VHS tracking line + scanlines */}
      <div style={{ position: "absolute", left: 0, top: vhs, width: PW, height: 14, background: "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.16), rgba(255,255,255,0))" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 1px, transparent 1px 4px)" }} />
      {/* title */}
      <div style={{ position: "absolute", left: 0, top: 70, width: PW, textAlign: "center", fontFamily: F.shrikhand, fontSize: 188, lineHeight: 1.1, color: TEAL, opacity: 0.6, mixBlendMode: "multiply", transform: `translate(${mx}px, ${my}px)` }}>
        <Letters text="Retro" t={t} at={0.04} each={0.05} dur={0.28} letter={(u) => ({ opacity: u > 0 ? 1 : 0, transform: `translateY(${(1 - ease.outBack(u, 2.2)) * 80}px) rotate(${(1 - u) * -12}deg)` })} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 70, width: PW, textAlign: "center", fontFamily: F.shrikhand, fontSize: 188, lineHeight: 1.1, color: MUSTARD, textShadow: [...Array.from({ length: 10 }, (_, i) => `${i + 1}px ${i + 1}px 0 ${ORANGE}`), "12px 12px 0 " + BROWN, "13px 14px 18px rgba(0,0,0,0.35)"].join(",") }}>
        <Letters text="Retro" t={t} at={0.04} each={0.05} dur={0.28} letter={(u) => ({ opacity: u > 0 ? 1 : 0, transform: `translateY(${(1 - ease.outBack(u, 2.2)) * 80}px) rotate(${(1 - u) * -12}deg)` })} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 300, width: PW, textAlign: "center", fontFamily: F.jp, fontWeight: 700, fontSize: 30, letterSpacing: "0.6em", color: CREAM, textShadow: "0 2px 8px rgba(0,0,0,0.4)", opacity: tween(t, 0.25, 0.5) }}>シティポップ · 1984</div>
      {/* the walkman, floating, with an equaliser */}
      <div style={{ position: "absolute", left: 76, top: mix(1400, 570, wk) + Math.sin(t * 2.6) * 10, width: WW, height: WH, transform: `rotate(${mix(-18, -6, wk) + Math.sin(t * 2) * 1.5}deg)`, filter: "drop-shadow(14px 22px 20px rgba(30,10,40,0.45))" }}>
        <Img src={img("RET-02")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
        {/* the reels turn while it plays */}
        <svg width={WW} height={WH} style={{ position: "absolute", left: 0, top: 0 }}>
          {REELS.map(([x, y], i) => (
            <g key={i} transform={`translate(${x * WK}, ${y * WK}) scale(1, 0.92) rotate(${t * 260 + i * 40})`}>
              <circle r={9.5} fill="#F4EBDD" stroke="#3A2A2A" strokeWidth={1.6} />
              {[0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={-1.3} y={-9.5} width={2.6} height={4} fill="#3A2A2A" transform={`rotate(${k * 60})`} />)}
              <circle r={2.6} fill="#3A2A2A" />
            </g>
          ))}
        </svg>
      </div>
      {/* racing stripes + equaliser bars */}
      {[PINK, ORANGE, MUSTARD, TEAL].map((c, i) => {
        const k = tween(t, 0.02 + i * 0.05, 0.34 + i * 0.05, ease.expo);
        return <div key={c} style={{ position: "absolute", left: -20, top: 1150 + i * 22, width: (PW + 40) * k, height: 16, background: c, borderRadius: "0 8px 8px 0" }} />;
      })}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        {Array.from({ length: 14 }, (_, i) => {
          const h = 16 + 44 * Math.abs(Math.sin(t * (6 + (i % 5)) + i * 1.3)) * tween(t, 0.3, 0.5);
          return <rect key={i} x={430 + i * 18} y={1132 - h} width={12} height={h} fill={i % 3 === 0 ? PINK : CREAM} opacity={0.9} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: 40, top: 1092, fontFamily: F.bebas, fontSize: 34, letterSpacing: "0.3em", color: CREAM, textShadow: "0 2px 6px rgba(0,0,0,0.4)", opacity: tween(t, 0.3, 0.55) }}>SIDE A ◆ 90 MIN</div>
      <Grain t={t} amt={0.12} />
    </Frame>
  );
};
