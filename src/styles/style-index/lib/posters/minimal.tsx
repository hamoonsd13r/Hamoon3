// 01 · Minimalism — a fine-art minimal poster on one bold field: one horizon, a pale sun setting behind it for the
// whole poster, one walker crossing slowly whose real silhouette throws a long shadow that stretches as the light
// drops; precise small type on a grid.
import React from "react";
import { Img } from "remotion";
import { F, PH, PW, ease, mix, ramp, tween } from "../theme";
import { Frame, Grain, Letters, ar, img, type PosterProps } from "../kit";

const SKY = "#E2512B", GROUND = "#C4401F", SUN = "#F6EADB", INK = "#17100D";
const HOR = 842;
// the walker (MIN-01, trimmed to her): 270 px tall, feet on the horizon, walking slowly right
const FH = 270, FW = FH / ar("MIN-01"), FX = 150;

export const Minimal: React.FC<PosterProps> = ({ t }) => {
  const line = tween(t, 0, 0.3, ease.expo);
  const sunK = tween(t, 0.02, 0.42, ease.out);
  const set = ramp(t, 0, 6);
  const sy = mix(730, 828, set), sr = 182 * mix(0.82, 1, sunK);
  const walk = tween(t, 0.08, 0.36, ease.out);
  const shadow = tween(t, 0.14, 0.55, ease.out);
  const sh = mix(0.3, 0.62, set) * shadow, sk = mix(48, 60, set);
  const rule = tween(t, 0.3, 0.8, ease.expo);
  const wx = FX + t * 20, bob = Math.abs(Math.sin(t * Math.PI * 1.8)) * 3;
  return (
    <Frame bg={SKY}>
      <div style={{ position: "absolute", left: 0, top: HOR, width: PW, height: PH - HOR, background: GROUND }} />
      {/* the sun, setting behind the line */}
      <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: HOR, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 505 - sr, top: sy - sr, width: sr * 2, height: sr * 2, borderRadius: "50%", background: SUN }} />
      </div>
      <div style={{ position: "absolute", left: PW / 2 - (PW / 2) * line, top: HOR - 1.5, width: PW * line, height: 3, background: INK }} />
      {/* her shadow: the same silhouette, flattened onto the ground */}
      <div style={{ position: "absolute", left: wx, top: HOR - FH, width: FW, height: FH, transformOrigin: "50% 100%", transform: `scaleY(${-sh}) skewX(${sk}deg)`, opacity: 0.32 * shadow, filter: "blur(1.2px)" }}>
        <Img src={img("MIN-01")} style={{ width: "100%", height: "100%", maxWidth: "none", filter: "brightness(0)" }} />
      </div>
      {/* the walker */}
      <div style={{ position: "absolute", left: wx, top: HOR - FH + (1 - walk) * 26 - bob, width: FW, height: FH, opacity: walk, clipPath: `inset(0 0 ${(1 - walk) * 10}% 0)` }}>
        <Img src={img("MIN-01")} style={{ width: "100%", height: "100%", maxWidth: "none", filter: "contrast(1.08)" }} />
      </div>
      {/* a single bird, far away */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, opacity: tween(t, 0.4, 0.8) }}>
        {(() => {
          const bx = mix(560, 640, ramp(t, 0, 3)), by = 330 + Math.sin(t * 2) * 4, f = Math.sin(t * 9) * 4;
          return <path d={`M${bx - 8},${by - f} Q${bx - 3},${by - 1} ${bx},${by} Q${bx + 3},${by - 1} ${bx + 8},${by - f}`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />;
        })()}
      </svg>
      {/* the type, on a two-column grid */}
      <div style={{ position: "absolute", left: 56, top: 56, fontFamily: F.inter, fontWeight: 600, fontSize: 19, letterSpacing: "0.5em", color: INK, opacity: tween(t, 0.18, 0.42) }}>MINIMALISM</div>
      <div style={{ position: "absolute", right: 56, top: 56, fontFamily: F.inter, fontWeight: 400, fontSize: 19, letterSpacing: "0.18em", color: INK, opacity: tween(t, 0.24, 0.48) }}>N°01</div>
      <div style={{ position: "absolute", left: 56, top: 92, width: 608 * rule, height: 1.5, background: INK, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: 52, top: 930, fontFamily: F.instrumentI, fontSize: 92, lineHeight: 0.95, color: INK, letterSpacing: "-0.01em" }}>
        <Letters text="Less, but" t={t} at={0.16} each={0.03} dur={0.22} letter={(u) => ({ opacity: u, transform: `translateY(${(1 - ease.out(u)) * 26}px)` })} />
        <br />
        <Letters text="better." t={t} at={0.36} each={0.03} dur={0.22} letter={(u) => ({ opacity: u, transform: `translateY(${(1 - ease.out(u)) * 26}px)` })} />
      </div>
      <div style={{ position: "absolute", left: 420, top: 952, width: 248, fontFamily: F.inter, fontWeight: 400, fontSize: 17, lineHeight: 1.5, color: "#3A1A10", opacity: tween(t, 0.42, 0.75) }}>
        One shape. One line.
        <br />
        One figure. Everything
        <br />
        else is silence.
      </div>
      <div style={{ position: "absolute", left: 56, top: 1180, width: 608 * rule, height: 1.5, background: INK, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: 56, top: 1198, fontFamily: F.inter, fontWeight: 600, fontSize: 15, letterSpacing: "0.42em", color: INK, opacity: tween(t, 0.5, 0.8) }}>SPACE · LIGHT · TIME</div>
      <div style={{ position: "absolute", right: 56, top: 1198, fontFamily: F.inter, fontWeight: 400, fontSize: 15, letterSpacing: "0.3em", color: INK, opacity: tween(t, 0.55, 0.85) }}>MMXXVI</div>
      <Grain t={t} amt={0.09} />
    </Frame>
  );
};
