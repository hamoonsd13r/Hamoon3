// Box-Art Panels · the compositions this style registers.
//   Style-BoxArtPanels        9:16, 16 s demo: a «moon mission» as a living game cover — NASA photos in slanted panels,
//                             a title band, rating stars, numbers that lift off chips and dock in a stats rail (silent)
//   Style-BoxArtPanels-Look   props { times: number[] } → one frame per entry
import React from "react";
import { Composition } from "remotion";
import { BoxArtDemo, DUR, LOOK } from "./demo/Video";
import { FPS, H, W } from "./lib/theme";

type Props = { times?: number[] };
const meta = ({ props }: { props: Props }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-BoxArtPanels" component={BoxArtDemo} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={W} height={H} defaultProps={{} as Props} />
    <Composition id="Style-BoxArtPanels-Look" component={BoxArtDemo} durationInFrames={LOOK.length} fps={FPS} width={W} height={H} defaultProps={{ times: LOOK } as Props} calculateMetadata={meta} />
  </>
);
