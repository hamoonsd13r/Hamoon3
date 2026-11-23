// Archive Machine · «Peace in our time.» — the match the program finds: Chamberlain back at Heston on 30 September 1938,
// the paper held high (hi-res photograph, slow push to his face). We caption what we hear; the history is the
// small source line under it.
import React from "react";
import { Label } from "../../lib/hud";
import { C, F, clamp, ease, mix, ramp, useT } from "../../lib/theme";
import { Plate, coverBox, staticPhoto } from "../../lib/plate";

export const MATCH_A = 12.26, MATCH_B = 13.76;
const ASPECT = 3500 / 2492;
const FOCUS: [number, number] = [58, 34];
const FACE: [number, number, number] = [0.6, 0.33, 0.06];

const FaceLock: React.FC<{ bw: number; bh: number }> = ({ bw, bh }) => {
  const { t } = useT();
  const k = ease.out(ramp(t, MATCH_A + 0.05, MATCH_A + 0.3));
  if (k <= 0) return null;
  const [u, v, r] = FACE;
  const R = mix(r * 2.4, r, k) * bw, L = 30;
  const x = u * bw, y = v * bh;
  return (
    <svg width={bw} height={bh} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <g stroke={C.cyan} fill="none" strokeWidth={3}>
        <path d={`M${x - R} ${y - R + L}V${y - R}H${x - R + L} M${x + R - L} ${y - R}H${x + R}V${y - R + L} M${x + R} ${y + R - L}V${y + R}H${x + R - L} M${x - R + L} ${y + R}H${x - R}V${y + R - L}`} />
      </g>
    </svg>
  );
};

export const Match: React.FC<{ t: number }> = ({ t }) => {
  const { bw, bh } = coverBox(ASPECT, FOCUS);
  const g = clamp(1 - (t - MATCH_A) / 0.08);
  const q = ease.out(ramp(t, 12.54, 12.7));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Plate src={staticPhoto("c111334.jpg")} still a={MATCH_A} b={MATCH_B} aspect={ASPECT} grade="grayscale(1) contrast(1.22) brightness(1.0) sepia(0.14)" focus={FOCUS} push={[1.04, 1.16]} exposure={1 + 0.5 * g}>
        <FaceLock bw={bw} bh={bh} />
      </Plate>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%), radial-gradient(70% 46% at 0% 100%, rgba(0,0,0,0.75), rgba(0,0,0,0) 100%)" }} />
      <Label x={96} y={748} text="MATCH  0.998  ·  NEWSREEL ARCHIVE" a={MATCH_A + 0.06} d={0.3} size={22} bold />
      <div style={{ position: "absolute", left: 96, top: 790, fontFamily: F.title, fontSize: 96, color: C.white, letterSpacing: 6, lineHeight: 1, textShadow: "0 3px 24px rgba(0,0,0,0.6)", opacity: q, transform: `translateY(${(1 - q) * 18}px)` }}>
        “PEACE IN OUR TIME”
      </div>
      <Label x={96} y={912} text="N. CHAMBERLAIN · HESTON · 30 · IX · 1938  —  HIS WORDS: “PEACE FOR OUR TIME”" a={12.75} d={0.5} size={20} color={C.white} />
    </div>
  );
};
