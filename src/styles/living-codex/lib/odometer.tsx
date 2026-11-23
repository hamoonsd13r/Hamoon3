// Living Codex · the odometer: a year (or any number) on brass drums rolls, motion-blurs and slams into a new value on
// its word — extra leading digits and thousands commas slide in, the frame punches, shakes and flares, embers rise.
// e.g. 2026 → 12,026 («the Holocene calendar»). 1920×1080, `t` = seconds since the scene began.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Embers, Glow, Motes, Vignette } from "./fx";
import { C, F, clamp, easeInOut, hexA, lerp, win, wob } from "./theme";

const DW = 168, DH = 300, CW = 64;

const Drum: React.FC<{ x: number; target: number; pos: number; blur: number; a?: number; glow?: number }> = ({ x, target, pos, blur, a = 1, glow = 0 }) => {
  // pos = how many digits are still to roll (0 = resting on target)
  const v = target - pos;
  const base = Math.floor(v), fr = v - base;
  const digits = [-1, 0, 1, 2].map((k) => (((base + k) % 10) + 10) % 10);
  const m = "linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)";
  return (
    <div style={{ position: "absolute", left: x, top: 540 - DH / 2, width: DW, height: DH, overflow: "hidden", opacity: a, WebkitMaskImage: m, maskImage: m }}>
      <div style={{ position: "absolute", left: 0, top: -DH * (1 + fr), width: DW, filter: blur > 0.3 ? `url(#lcvblur${Math.min(9, Math.round(blur))})` : undefined }}>
        {digits.map((d, i) => (
          <div key={i} style={{ height: DH, lineHeight: `${DH}px`, textAlign: "center", fontFamily: F.serif, fontSize: 250, color: C.bone, fontVariantNumeric: "lining-nums tabular-nums",
            textShadow: glow > 0.01 ? `0 0 ${30 * glow}px ${hexA(C.amber, 0.9 * glow)}` : undefined }}>{d}</div>
        ))}
      </div>
    </div>
  );
};

export const Odometer: React.FC<{
  t: number;
  from: number; // shown first (no separators), e.g. 2026
  to: number; // lands on «slamAt», shown with thousands commas, e.g. 12026 → 12,026
  slamAt: number;
  rollAt?: number; // the drums start rolling (default slamAt − 0.8)
  top?: string; // small label above (e.g. «سال»)
  bottom?: string; // label that appears after the slam (e.g. «تقویم هولوسن»)
  labelFont?: string;
}> = ({ t, from, to, slamAt, rollAt, top, bottom, labelFont = F.fa }) => {
  const ts = rollAt ?? slamAt - 0.8;
  const toChars = Math.round(to).toLocaleString("en-US").split("");
  const fromDigits = String(Math.round(from)).split("").map(Number);
  // final layout (centred), and the starting layout of the digits that exist in `from` (right-aligned, no commas)
  const widths = toChars.map((c) => (c === "," ? CW : DW));
  const total = widths.reduce((a, b) => a + b, 0);
  const xsF: number[] = [];
  widths.reduce((x, w) => (xsF.push(x), x + w), 960 - total / 2);
  const digitIdx = toChars.map((c, i) => (c === "," ? -1 : i)).filter((i) => i >= 0);
  const nF = fromDigits.length;
  const xs0 = fromDigits.map((_, j) => 960 - (nF * DW) / 2 + j * DW);
  const p = clamp((t - ts) / (slamAt - ts));
  const morph = easeInOut(clamp((t - ts) / 0.55));
  const after = t - slamAt;
  const bounce = after > 0 ? -0.18 * Math.exp(-after * 7) * Math.sin(after * 26) : 0;
  const roll = (K: number, lag: number) => {
    const q = clamp((t - ts - lag) / (slamAt - ts - lag));
    return t < slamAt ? K * (1 - Math.pow(q, 1.7)) : bounce;
  };
  const speed = t < slamAt && p > 0 ? 1.7 * Math.pow(p, 0.7) * 14 : 0;
  const punch = after > 0 ? 1 + 0.1 * Math.exp(-after * 6) : 1;
  const shake = after > 0 ? Math.exp(-after * 8) * 14 : 0;
  const sx = shake * wob(t * 40, 1), sy = shake * wob(t * 40, 2);
  const flare = after > 0 ? Math.exp(-after * 2.2) : 0;
  const lbl = win(t, slamAt + 0.45, 0.5);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          {Array.from({ length: 10 }, (_, i) => (
            <filter key={i} id={`lcvblur${i}`} x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation={`0 ${i * 3}`} /></filter>
          ))}
        </defs>
      </svg>
      <Glow x={960} y={540} r={760} color="#3a1d08" a={0.7 + 0.3 * flare} blend="normal" sy={0.6} />
      <Glow x={960} y={540} r={900} color={C.amber} a={0.55 * flare} sy={0.5} />
      {/* anamorphic streak on the slam */}
      <div style={{ position: "absolute", left: 0, top: 536, width: 1920, height: 8, background: `linear-gradient(90deg, rgba(0,0,0,0), ${hexA("#ffd9a0", 0.9)}, rgba(0,0,0,0))`, opacity: flare, filter: "blur(3px)" }} />
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${punch * (1 + 0.006 * Math.max(0, t))})` }}>
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={360} y1={540 - DH / 2 + 26} x2={1560} y2={540 - DH / 2 + 26} stroke={C.bone} strokeOpacity={0.22} />
          <line x1={360} y1={540 + DH / 2 - 26} x2={1560} y2={540 + DH / 2 - 26} stroke={C.bone} strokeOpacity={0.22} />
        </svg>
        {digitIdx.map((ci, j) => {
          const r = digitIdx.length - 1 - j; // position from the right
          const fi = nF - 1 - r; // matching digit of `from`, if any
          const target = Number(toChars[ci]);
          if (fi >= 0) {
            const delta = (((target - fromDigits[fi]) % 10) + 10) % 10;
            const K = 22 + 4 * r + delta; // integer turns: at rest it shows the `from` digit
            return <Drum key={ci} x={lerp(xs0[fi], xsF[ci], morph)} target={target} pos={roll(K, 0.05 * r)} blur={speed} glow={0.8 * flare} />;
          }
          return <Drum key={ci} x={xsF[ci]} target={target} pos={roll(18, 0.2)} blur={speed} a={morph} glow={0.8 * flare} />;
        })}
        {toChars.map((c, i) => (c === "," ? <div key={`c${i}`} style={{ position: "absolute", left: xsF[i], top: 540 - DH / 2, width: CW, height: DH, lineHeight: `${DH}px`, textAlign: "center", fontFamily: F.serif, fontSize: 250, color: C.bone, opacity: morph }}>,</div> : null))}
      </AbsoluteFill>
      {top && <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", fontFamily: labelFont, fontSize: 30, color: C.bone, opacity: 0.6, letterSpacing: labelFont === F.label ? "0.5em" : 0 }}>{top}</div>}
      {bottom && <div style={{ position: "absolute", left: 0, right: 0, top: 712, textAlign: "center", fontFamily: labelFont, fontSize: 38, color: C.amber, opacity: lbl, letterSpacing: labelFont === F.label ? "0.45em" : 0 }}>{bottom}</div>}
      <Embers t={t} n={60} seed={111} box={[300, 380, 1620, 900]} rise={120 + 160 * flare} size={2.4} opacity={0.4 + 0.6 * flare} drift={90} />
      <Motes t={t} n={40} seed={112} size={1.6} opacity={0.3} />
      <Vignette a={0.6} />
    </AbsoluteFill>
  );
};
