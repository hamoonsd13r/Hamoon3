// Poster Wall 3D · the reel: a tilted wall of posters on a beat-cut camera path (engine.ts) — open full frame on one
// hero card, pull back to the wall, whip across it on the beats, crane, and end on a second hero before receding into
// the dark. Rendered silent; mux the music after. `times` (Look) maps each frame to any reel second.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame } from "remotion";
import { WallEngine } from "../lib/engine";
import { BG, DUR, FPS, H, W, ease, ramp } from "../lib/theme";
import { beat } from "../lib/wall";
import { slotSource } from "./cards";

export type FilmProps = { times?: number[] };

const hex = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

export const PosterWallReel: React.FC<FilmProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const t = times ? times[frame] ?? 0 : frame / FPS;
  const ref = useRef<HTMLCanvasElement>(null);
  const eng = useRef<WallEngine | null>(null);
  useLayoutEffect(() => {
    const h = delayRender(`poster wall t=${t.toFixed(3)}`, { timeoutInMilliseconds: 170000 });
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(h);
      }
    };
    (async () => {
      if (!eng.current) eng.current = new WallEngine(ref.current!, { W, H, fps: FPS, bg: hex(BG), slot: slotSource });
      await eng.current.frame(t);
      finish();
    })().catch((e) => cancelRender(e));
    return finish;
  }, [t]);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />
      {/* the opening and the ending hero own the frame: the edges sink into shadow there */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 9%, rgba(0,0,0,0) 91%, rgba(0,0,0,0.45) 100%)", opacity: 1 - ease.inOut(ramp(t, beat(0.5), beat(1.6))) }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 7%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.38) 88%, rgba(0,0,0,0.6) 100%)", opacity: ease.inOut(ramp(t, beat(18.9), beat(19.1))) * (1 - ease.inOut(ramp(t, 12.3, 13.1))) }} />
      {/* the last 8 frames fade to black: a loop cuts from black straight back to the lit opening */}
      <AbsoluteFill style={{ background: "#000", opacity: ease.inOut(ramp(t, DUR - 8 / FPS, DUR - 1 / FPS)) }} />
    </AbsoluteFill>
  );
};
