// 12 · Editorial — a fashion-magazine cover being set: the page swings in, the Didone masthead rises letter by letter,
// cover lines and rules wipe on beside the model (never over him), the barcode prints, the photo keeps a slow push.
import React from "react";
import { Img } from "remotion";
import { F, PW, ease, hash, mix, ramp, tween } from "../theme";
import { Frame, Grain, img, type PosterProps } from "../kit";

const INK = "#111", RED = "#D7261E";

export const Editorial: React.FC<PosterProps> = ({ t }) => {
  const swing = tween(t, 0, 0.36, ease.expo);
  const push = mix(1.08, 1.0, ease.out(ramp(t, 0, 1.6))) + 0.007 * Math.max(0, t - 0.8);
  const line = (a: number) => tween(t, a, a + 0.26, ease.expo);
  return (
    <Frame bg="#CFCFCC">
      <div style={{ position: "absolute", inset: 0, transform: `perspective(1600px) translateX(${(1 - swing) * 420}px) rotateY(${(1 - swing) * -38}deg)`, transformOrigin: "0% 50%", boxShadow: "0 0 60px rgba(0,0,0,0.3)" }}>
        {/* the photograph */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <Img src={img("EDI-01")} style={{ position: "absolute", left: -20, top: 0, width: 853, height: 1280, maxWidth: "none", transform: `scale(${push})`, transformOrigin: "40% 30%" }} />
        </div>
        {/* masthead */}
        <div style={{ position: "absolute", left: 0, top: 22, width: PW, textAlign: "center", fontFamily: F.inter, fontWeight: 600, fontSize: 17, letterSpacing: "0.42em", color: INK, opacity: tween(t, 0.25, 0.5) }}>
          ISSUE 46 · AUTUMN 2026 · €12
        </div>
        <div style={{ position: "absolute", left: 0, top: 46, width: PW, display: "flex", justifyContent: "center", fontFamily: F.bodoni, fontWeight: 900, fontSize: 214, lineHeight: 0.92, letterSpacing: "-0.04em", color: INK }}>
          {Array.from("MODE").map((ch, i) => {
            const u = tween(t, 0.1 + i * 0.06, 0.42 + i * 0.06, ease.expo);
            return (
              <span key={i} style={{ display: "inline-block", overflow: "hidden", height: 204 }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - u) * 210}px)` }}>{ch}</span>
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, top: 262, width: PW, textAlign: "center", fontFamily: F.bodoniI, fontWeight: 500, fontSize: 26, letterSpacing: "0.04em", color: INK, opacity: tween(t, 0.3, 0.5) }}>The Art of Style — since 1986</div>
        <div style={{ position: "absolute", left: 40, top: 318, width: 640 * line(0.3), height: 2, background: INK }} />
        {/* cover lines */}
        <div style={{ position: "absolute", left: 34, top: 350, fontFamily: F.bodoni, color: INK, clipPath: `inset(0 ${100 - 100 * line(0.36)}% 0 0)` }}>
          <div style={{ fontWeight: 800, fontSize: 36, lineHeight: 1, letterSpacing: "0.02em" }}>THE NEW</div>
          <div style={{ fontFamily: F.bodoniI, fontWeight: 500, fontSize: 66, lineHeight: 0.95, marginLeft: -3 }}>Silence</div>
          <div style={{ fontFamily: F.inter, fontWeight: 600, fontSize: 13, letterSpacing: "0.2em", marginTop: 10 }}>WHY LESS IS LOUDER</div>
          <div style={{ fontFamily: F.inter, fontWeight: 600, fontSize: 13, letterSpacing: "0.2em", marginTop: 2 }}>P.46</div>
          <div style={{ width: 54, height: 3, background: RED, marginTop: 14 }} />
          <div style={{ fontFamily: F.bodoni, fontWeight: 700, fontSize: 30, lineHeight: 1.05, marginTop: 14 }}>12 designers<br /><span style={{ fontFamily: F.bodoniI, fontWeight: 500 }}>to watch</span></div>
        </div>
        <div style={{ position: "absolute", right: 34, top: 356, textAlign: "right", fontFamily: F.inter, color: INK, clipPath: `inset(0 0 0 ${100 - 100 * line(0.46)}%)` }}>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "0.16em" }}>FASHION</div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "0.16em" }}>CULTURE</div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "0.16em", color: RED }}>DESIGN</div>
          <div style={{ fontFamily: F.bodoniI, fontWeight: 500, fontSize: 24, marginTop: 14, letterSpacing: 0 }}>Paris · Milan · Tokyo</div>
        </div>
        <div style={{ position: "absolute", right: 30, top: 560, padding: "8px 16px", background: RED, color: "#fff", fontFamily: F.inter, fontWeight: 800, fontSize: 18, letterSpacing: "0.24em", transform: `rotate(-90deg) translateX(${(1 - tween(t, 0.6, 0.8, ease.expo)) * 200}px)`, transformOrigin: "100% 0" }}>EXCLUSIVE</div>
        <div style={{ position: "absolute", left: 34, top: 1046, fontFamily: F.bodoniI, fontWeight: 500, fontSize: 76, lineHeight: 0.95, color: "#F2F0EC", clipPath: `inset(-10% ${100 - 100 * line(0.5)}% -10% 0)` }}>
          Less noise,
          <br />
          more <span style={{ color: RED }}>signal.</span>
        </div>
        {/* barcode */}
        <div style={{ position: "absolute", left: 556, top: 1150, width: 136, height: 98, background: "#F2F0EC", opacity: tween(t, 0.55, 0.62) }}>
          <svg width={136} height={98}>
            {Array.from({ length: 30 }, (_, i) => {
              const x = 10 + i * 3.9, on = i / 30 < tween(t, 0.58, 0.9);
              return on ? <rect key={i} x={x} y={10} width={hash(i * 2.7) > 0.5 ? 2.4 : 1.2} height={62} fill={INK} /> : null;
            })}
            <text x={68} y={90} textAnchor="middle" fontFamily={F.inter} fontSize={13} fontWeight={600} fill={INK}>4 602026 000460</text>
          </svg>
        </div>
        <div style={{ position: "absolute", left: 640, top: 26, width: 48, height: 48, borderRadius: 24, background: RED, color: "#fff", fontFamily: F.inter, fontWeight: 800, fontSize: 17, lineHeight: "48px", textAlign: "center", transform: `scale(${tween(t, 0.6, 0.78, (u) => ease.outBack(u, 2))})` }}>
          NEW
        </div>
      </div>
      <Grain t={t} amt={0.08} />
    </Frame>
  );
};
