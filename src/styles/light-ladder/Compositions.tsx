// Light Ladder · the compositions this style registers.
//   Style-LightLadder        9:16 explainer demo «سه سطح هوش مصنوعی» (silent; estimated narration timing)
//   Style-LightLadder-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { LightLadderDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-LightLadder" component={LightLadderDemo} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-LightLadder-Look"
      component={LightLadderDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
