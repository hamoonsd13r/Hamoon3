// Shader Transitions · the demo (20 s, vertical): seven photos, twelve transitions in a row — a short hold, then the
// next shader carries the frame to the next photo. The chip on top names the transition. Photos: NASA (public
// domain), shared with the boxart-panels style (public/styles/boxart-panels/nasa).
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ShaderStage, type Slide } from "../lib/ShaderStage";
import { SHADER_NAMES } from "../lib/shaders";

export const FPS = 30;
export const HOLD_S = 0.85, TRANS_S = 0.75, SEG = HOLD_S + TRANS_S;
export const DUR = SEG * SHADER_NAMES.length + HOLD_S;
const N = (n: string, focus?: [number, number]): Slide => ({ src: `styles/boxart-panels/nasa/${n}.jpg`, focus });
export const SLIDES: Slide[] = [
  N("launch", [0.5, 0.4]), N("earthrise", [0.5, 0.5]), N("aldrin", [0.52, 0.45]), N("blue-marble"), N("flag", [0.68, 0.5]), N("earth-over-moon", [0.5, 0.3]), N("mission-control", [0.5, 0.5]),
];

const useInter = () => {
  const [h] = useState(() => delayRender("shader-transitions font"));
  useEffect(() => {
    new FontFace("STInter", `url(${staticFile("fonts/Inter.ttf")})`, { weight: "100 900" })
      .load()
      .then((f) => document.fonts.add(f))
      .catch((e) => console.error(e))
      .finally(() => continueRender(h));
  }, [h]);
};
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

export const TransitionReel: React.FC<{ times?: number[] }> = ({ times }) => {
  useInter();
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const k = Math.min(SHADER_NAMES.length, Math.floor(t / SEG));
  const local = t - k * SEG;
  const inTrans = k < SHADER_NAMES.length && local >= HOLD_S;
  const p = inTrans ? ease(clamp((local - HOLD_S) / TRANS_S)) : 0;
  const shader = SHADER_NAMES[Math.min(k, SHADER_NAMES.length - 1)];
  // the chip: the coming transition's name, shown through its hold and its transition
  const chipO = k < SHADER_NAMES.length ? clamp(local / 0.2) * (1 - clamp((local - SEG + 0.12) / 0.12)) : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ShaderStage slides={SLIDES} a={k} b={k + 1} p={p} shader={shader} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", justifyContent: "center", opacity: chipO }}>
        <div style={{ fontFamily: "STInter", fontWeight: 800, fontSize: 30, letterSpacing: 3, color: "#FFF6EC", background: "rgba(10,10,14,0.62)", border: "1.5px solid rgba(255,246,236,0.25)", borderRadius: 999, padding: "12px 28px", whiteSpace: "nowrap" }}>
          <span style={{ color: "#FFB547" }}>{String(Math.min(k + 1, SHADER_NAMES.length)).padStart(2, "0")} / {SHADER_NAMES.length}</span>
          {"  ·  "}
          {shader.replace(/-/g, " ").toUpperCase()}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** stills at chosen times, for review: the middle of every transition */
export const LOOK = SHADER_NAMES.map((_, i) => i * SEG + HOLD_S + TRANS_S * 0.5);
