// Lowpoly Dialogue 3D · the compositions this style registers (render with --gl=angle --concurrency=1).
//   Style-LowpolyDialogue        9:16 night dialogue on a laptop's edge (silent; estimated dialogue timing)
//   Style-LowpolyDialogue-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { LowpolyDialogueDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-LowpolyDialogue" component={LowpolyDialogueDemo} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-LowpolyDialogue-Look"
      component={LowpolyDialogueDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
