// AE Grid · the compositions this style registers.
//   Style-Grid9         9:16, an 8 s seamless loop: nine flat motion tiles (arches, linked gears, hourglass, discs,
//                       toggles, waves, a cube on endless stairs, a pendulum) in three colours; props { palette }
//   Style-Grid9-Look    props { times: number[] } → one frame per entry
// The same grid as a fully layered After Effects project: after-effects/build_grid9.jsx (README in that folder).
import React from "react";
import { Composition } from "remotion";
import { Grid9, LOOK, type GridProps } from "./demo/Video";
import { DUR, FPS, H, W } from "./lib/theme";

const meta = ({ props }: { props: GridProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-Grid9" component={Grid9} durationInFrames={DUR * FPS} fps={FPS} width={W} height={H} defaultProps={{ palette: "P2" } as GridProps} />
    <Composition id="Style-Grid9-Look" component={Grid9} durationInFrames={LOOK.length} fps={FPS} width={W} height={H} defaultProps={{ palette: "P2", times: LOOK } as GridProps} calculateMetadata={meta} />
  </>
);
