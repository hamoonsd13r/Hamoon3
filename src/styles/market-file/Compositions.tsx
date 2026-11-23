// Market File · the compositions this style registers.
//   Style-MarketFile        9:16 news / market reel demo «چرا شکلات یهو این‌قدر گرون شد؟» (silent; estimated narration timing)
//   Style-MarketFile-Look   same film, props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { MarketFileDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, LOOK } from "./demo/script";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-MarketFile" component={MarketFileDemo} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-MarketFile-Look"
      component={MarketFileDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
  </>
);
