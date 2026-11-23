// Phone Assistant · the compositions this style registers.
//   Style-PhoneAssistant        9:16 reel demo «منشی هوشمند کلینیک» (silent; estimated narration timing)
//   Style-PhoneAssistant-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { PhoneAssistantDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-PhoneAssistant" component={PhoneAssistantDemo} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-PhoneAssistant-Look"
      component={PhoneAssistantDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
