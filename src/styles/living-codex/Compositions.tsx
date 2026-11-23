// Living Codex · the compositions this style registers.
//   Style-LivingCodex        16:9 documentary opener (manuscript → carved stone → year odometer → chapter card), silent
//   Style-LivingCodex-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { LivingCodexDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-LivingCodex" component={LivingCodexDemo} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-LivingCodex-Look"
      component={LivingCodexDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
