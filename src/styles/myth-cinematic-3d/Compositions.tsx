// Myth Cinematic 3D · the compositions this style registers (three.js + postprocessing: --gl=angle --concurrency=1).
//   Style-MythCinematic          16:9 film, 40 s, 2.39 letterbox: the well → the serpents' hall → the eye → the palace →
//                                the stairs; bilingual subtitles (EN + FA) in the bottom bar (silent)
//   Style-MythCinematic-NoSubs   the same without subtitles
//   Style-MythCinematic-Look     props { times: number[] } → one frame per entry (also -Look-Well / -Hall / -C)
import React from "react";
import { Composition } from "remotion";
import { MythFilm } from "./demo/Video";
import { FPS, FRAMES, H, W } from "./lib/lib";
import { LOOK_WELL } from "./lib/sets/well";
import { LOOK_HALL } from "./lib/sets/hall";
import { LOOK_C } from "./lib/sets/palace";

export const LOOK = [1.6, 3.0, 5.0, 8.2, 9.9, 11.8, 13.6, 15.0, 16.5, 18.4, 19.6, 22.5, 24.5, 26.2, 27.2, 29.0, 32.3, 34.2, 35.8, 37.0, 39.3];
type P = { times?: number[]; audio?: string; subs?: boolean };
const meta = ({ props }: { props: P }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });
const look = (id: string, times: number[]) => <Composition id={id} component={MythFilm} durationInFrames={times.length} fps={FPS} width={W} height={H} defaultProps={{ times } as P} calculateMetadata={meta} />;

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-MythCinematic" component={MythFilm} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{} as P} />
    <Composition id="Style-MythCinematic-NoSubs" component={MythFilm} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{ subs: false } as P} />
    {look("Style-MythCinematic-Look", LOOK)}
    {look("Style-MythCinematic-Look-Well", LOOK_WELL)}
    {look("Style-MythCinematic-Look-Hall", LOOK_HALL)}
    {look("Style-MythCinematic-Look-C", LOOK_C)}
  </>
);
