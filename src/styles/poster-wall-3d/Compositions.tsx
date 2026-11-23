// Poster Wall 3D · the compositions this style registers (WebGL: render with --gl=angle --concurrency=1).
//   Style-PosterWall        9:16 reel, 15 s: the wall of posters on its beat-cut camera path (silent)
//   Style-PosterWall-Look   same reel, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { PosterWallReel, type FilmProps } from "./demo/Video";
import { FPS, FRAMES, H, W } from "./lib/theme";

const LOOK = [0, 0.6, 1.6, 2.5, 3.2, 4.6, 6.2, 7.4, 9.0, 10.4, 11.4, 12.6, 13.6, 14.6];

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-PosterWall" component={PosterWallReel} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{} as FilmProps} />
    <Composition
      id="Style-PosterWall-Look"
      component={PosterWallReel}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ times: LOOK } as FilmProps}
      calculateMetadata={({ props }: { props: FilmProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
