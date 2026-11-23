// Mirror Hall · the compositions this style registers (WebGL: --gl=angle --concurrency=1).
//   Style-MirrorHall        16:9, the first 40 s: one point of light becomes a dancer in an octagonal Persian
//                           mirror-work hall; her mother's mirror shatters into the walls; her light copies multiply
//   Style-MirrorHall-Full   the whole 3:30 film (cut to the demo song's beat grid; pass your song with `audio`)
//   Style-MirrorHall-Look   props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { MirrorHallFilm, type FilmHProps } from "./demo/Video";
import { FPS } from "./lib/base/lib89";
import { DUR_H } from "./lib/dirH";

export const LOOK = [0.4, 3.5, 8.5, 13, 18, 24, 30, 36, 52, 75, 110, 150];
const meta = ({ props }: { props: FilmHProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1, props.cams?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-MirrorHall" component={MirrorHallFilm} durationInFrames={40 * FPS} fps={FPS} width={1920} height={1080} defaultProps={{ ss: 1 } as FilmHProps} />
    <Composition id="Style-MirrorHall-Full" component={MirrorHallFilm} durationInFrames={Math.round(DUR_H * FPS)} fps={FPS} width={1920} height={1080} defaultProps={{ ss: 1.5 } as FilmHProps} />
    <Composition id="Style-MirrorHall-Look" component={MirrorHallFilm} durationInFrames={LOOK.length} fps={FPS} width={1920} height={1080} defaultProps={{ times: LOOK } as FilmHProps} calculateMetadata={meta} />
  </>
);
