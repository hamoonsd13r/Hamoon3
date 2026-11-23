// Screen Showcase · the compositions this style registers.
//   Style-ScreenShowcase        9:16 reel demo «با یه پرامپت، یه سایت کامل ساختم» (silent; estimated narration timing)
//   Style-ScreenShowcase-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { ScreenShowcaseDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-ScreenShowcase" component={ScreenShowcaseDemo} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-ScreenShowcase-Look"
      component={ScreenShowcaseDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
