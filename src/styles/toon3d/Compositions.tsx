// Toon3D compositions (registered by the kit's Root through src/styles/kit-v3.tsx; dev entry: src/index-kit-toon3d.ts).
//   Style-Toon3D       the demo film (silent, 1080x1920, 30 fps): render with --gl=angle --concurrency=1..3 --timeout=240000
//   Style-Toon3D-Look  stills of the same film: frame i = times[i] (props {"times":[...]}, default: one per shot)
import React from "react";
import { Composition } from "remotion";
import { DemoFilm, DemoFilmLook, DEMO_FRAMES, DEMO_FPS, DEMO_LOOK, demoLookMetadata } from "./demo/Video";

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-Toon3D" component={DemoFilm} durationInFrames={DEMO_FRAMES} fps={DEMO_FPS} width={1080} height={1920} />
    <Composition id="Style-Toon3D-Look" component={DemoFilmLook} durationInFrames={DEMO_LOOK.length} fps={DEMO_FPS} width={1080} height={1920}
      defaultProps={{ times: DEMO_LOOK }} calculateMetadata={demoLookMetadata} />
  </>
);
