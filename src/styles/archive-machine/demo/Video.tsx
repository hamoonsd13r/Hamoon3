// Archive Machine · the demo film: the data world wakes (three.js) → it reads the files → a match in the archive →
// a montage of what followed, counted → the verdict and the title. Every layer is a pure function of film time t.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Html5Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { DataWorld } from "./DataWorld";
import { fontsReady } from "../lib/fonts";
import { C, END, FPS, H, TimeCtx, W } from "../lib/theme";
import { Grain } from "../lib/fx";
import { DataHud } from "./scenes/datahud";
import { FILES_A, FILES_B, Files } from "./scenes/files";
import { MATCH_A, MATCH_B, Match } from "./scenes/match";
import { MONTAGE_A, MONTAGE_B, Montage } from "./scenes/montage";
import { Outro } from "./scenes/outro";

export const FRAMES = Math.ceil(END * FPS);
export type FilmProps = { audio?: string; times?: number[] };

type Scene = { a: number; b: number; el: (t: number) => React.ReactNode };
const SCENES: Scene[] = [
  { a: 0, b: MATCH_A, el: (t) => <DataHud t={t} /> },
  { a: FILES_A, b: FILES_B, el: (t) => <Files t={t} /> },
  { a: MATCH_A, b: MATCH_B, el: (t) => <Match t={t} /> },
  { a: MONTAGE_A, b: MONTAGE_B, el: (t) => <Montage t={t} /> },
  { a: MONTAGE_B, b: END + 1, el: (t) => <Outro t={t} /> },
];

export const ArchiveMachine: React.FC<FilmProps> = ({ audio, times }) => {
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const [handle] = useState(() => delayRender("archive-machine fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <AbsoluteFill style={{ background: t < MONTAGE_B ? C.bg : "#000", overflow: "hidden" }}>
        <DataWorld t={t} width={W} height={H} />
        {ready ? SCENES.map((s, i) => (t >= s.a && t < s.b ? <React.Fragment key={i}>{s.el(t)}</React.Fragment> : null)) : null}
        {t < 34.78 ? <Grain t={t} a={0.045} size={256} /> : null}
        {audio && !times ? (
          <Sequence from={0} layout="none">
            <Html5Audio src={staticFile(audio)} />
          </Sequence>
        ) : null}
      </AbsoluteFill>
    </TimeCtx.Provider>
  );
};
