// Inside App · demo film. Copy this file + script.ts to src/vNN/, change the imports to ../styles/inside-app/…,
// then swap the commands, the effects and the outro text (script.ts). Rendered silent; music + sfx are mixed after.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useAppFonts } from "../lib/fonts";
import { Outro, makeGridPage } from "../lib/outro";
import { SegmentScreen } from "../lib/segment";
import { C, FPS, TimeCtx } from "../lib/theme";
import { FX, OUT, OUTRO, SEGS, segStart } from "./script";

export type DemoProps = { times?: number[] };

const GRID = makeGridPage([...FX.map((fx) => ({ fx })), ...FX.map((fx) => ({ fx, at: (fx.loop ?? 3) / 2 }))], OUT, 3);

export const InsideAppAt: React.FC<{ t: number }> = ({ t }) => {
  if (t >= OUTRO) return <Outro l={t - OUTRO} Grid={GRID} txt={OUT} />;
  let i = SEGS.length - 1;
  while (i > 0 && t < segStart(i)) i--;
  const seg = SEGS[i];
  const Fx = FX.find((d) => d.id === seg.id)?.Comp;
  return <SegmentScreen key={seg.id} seg={seg} l={t - segStart(i)} Fx={Fx} />;
};

export const InsideAppDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useAppFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>{ok ? <InsideAppAt t={t} /> : null}</AbsoluteFill>
    </TimeCtx.Provider>
  );
};
