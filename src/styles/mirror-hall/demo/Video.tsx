// Mirror Hall · the film component: one WebGL canvas (the hall world), the lyrics on top, the
// song. `times` (V89H-Look) maps each frame to a film second; `cams` gives free review cameras.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Html5Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS } from "../lib/base/lib89";
import { LyricsH } from "../lib/lyricsH";
import { HallWorld, type FreeCam } from "../lib/worldH";

export type FilmHProps = { times?: number[]; cams?: (FreeCam | null)[]; dbg?: string; ss?: number; audio?: string; subs?: boolean };

export const MirrorHallFilm: React.FC<FilmHProps> = ({ times, cams, dbg = "", ss = 1, audio, subs = true }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = times ? times[Math.min(frame, times.length - 1)] ?? 0 : frame / FPS;
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useRef<Promise<HallWorld> | null>(null);
  useLayoutEffect(() => {
    const h = delayRender(`mirror-hall t=${t.toFixed(3)}`, { timeoutInMilliseconds: 240000 });
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(h);
      }
    };
    (async () => {
      if (!world.current) world.current = HallWorld.create(ref.current!, { W: width, H: height, ss, url: (p) => staticFile(`styles/mirror-hall/${p}`) });
      const w = await world.current;
      w.frame(t, { free: cams?.[Math.min(frame, (cams?.length ?? 1) - 1)] ?? null, dbg });
      if (frame < 2 || dbg.includes("stats")) console.log(`[mirror-hall] frame ${frame} t=${t.toFixed(2)}`);
      finish();
    })().catch((err) => {
      console.error("[mirror-hall] " + (err?.stack ?? err));
      cancelRender(err);
    });
    return finish;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, frame]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={Math.round(width * ss)} height={Math.round(height * ss)} style={{ position: "absolute", inset: 0, width, height }} />
      {subs ? <LyricsH t={t} /> : null}
      {audio ? <Html5Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
