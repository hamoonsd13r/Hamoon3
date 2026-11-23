// Paper UI · the compositions this style registers.
//   Style-PaperUI        9:16 product reel demo «اپ نوبت» (silent; estimated narration timing)
//   Style-PaperUI-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { PaperUIDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-PaperUI" component={PaperUIDemo} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-PaperUI-Look"
      component={PaperUIDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
