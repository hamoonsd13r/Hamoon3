// Archive Machine · the compositions this style registers (WebGL: --gl=angle --concurrency=1).
//   Style-ArchiveMachine        16:9, 24 fps, 21.6 s demo: a machine wakes inside a 3D city of data, reads the archive's
//                               files, finds a match (Munich 1938), counts what followed across a montage, and gives its
//                               verdict — public-domain stills, HUD locks, glitches, film grain (silent)
//   Style-ArchiveMachine-Look   props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { ArchiveMachine, FRAMES, type FilmProps } from "./demo/Video";
import { FPS, H, W } from "./lib/theme";

export const LOOK = [0.5, 2.2, 4.0, 5.4, 6.2, 6.8, 7.3, 8.0, 9.2, 10.3, 11.4, 12.8, 13.9, 14.5, 15.2, 16.0, 16.9, 17.6, 18.3, 19.2, 20.4, 21.3];
const meta = ({ props }: { props: FilmProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-ArchiveMachine" component={ArchiveMachine} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{} as FilmProps} />
    <Composition id="Style-ArchiveMachine-Look" component={ArchiveMachine} durationInFrames={LOOK.length} fps={FPS} width={W} height={H} defaultProps={{ times: LOOK } as FilmProps} calculateMetadata={meta} />
  </>
);
