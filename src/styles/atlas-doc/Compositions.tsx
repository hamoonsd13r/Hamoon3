// Atlas Doc · the compositions this style registers.
//   Style-AtlasDoc        16:9 map documentary excerpt «نیل؛ رودی که یک کشور را ساخت» (silent; estimated narration timing)
//   Style-AtlasDoc-Look   same film, props { times: number[] } → one frame per entry
// Satellite look: fetch the tiles (pipeline/tiles-get.mjs) and pass --props='{"tiles":"<folder in public>"}'.
import React from "react";
import { Composition } from "remotion";
import { AtlasDocDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-AtlasDoc" component={AtlasDocDemo} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-AtlasDoc-Look"
      component={AtlasDocDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
