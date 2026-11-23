// Archive Doc · the compositions this style registers.
//   Style-ArchiveDoc        16:9 archival documentary excerpt «اولین پرواز» (silent; estimated narration timing)
//   Style-ArchiveDoc-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { ArchiveDocDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-ArchiveDoc" component={ArchiveDocDemo} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-ArchiveDoc-Look"
      component={ArchiveDocDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
