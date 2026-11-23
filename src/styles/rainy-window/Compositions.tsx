// Rainy Window · the compositions this style registers (WebGL2 plate pass + 2D overlay; --gl=angle).
//   Style-RainyWindow        9:16, 12 s seamless loop: a painted plate behind a rainy window, rain, ripples, drops on
//                            the glass, drips, steam, a character's screen eyes and a little gag on the downbeat (silent)
//   Style-RainyWindow-Look   props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { FILM_FRAMES, RainyWindow, type RainyWindowProps } from "./demo/Video";

const LOOK = [0, 1.5, 3.2, 4.8, 6.4, 8.2, 9.0, 9.4, 10.6, 11.95];

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-RainyWindow" component={RainyWindow} durationInFrames={FILM_FRAMES} fps={30} width={1080} height={1920} defaultProps={{} as RainyWindowProps} />
    <Composition
      id="Style-RainyWindow-Look"
      component={RainyWindow}
      durationInFrames={LOOK.length}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as RainyWindowProps}
      calculateMetadata={({ props }: { props: RainyWindowProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
