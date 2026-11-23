// Hand-Drawn · the compositions this style registers (24 fps, 1080×1920).
//   Style-HandDrawn            the 42 s story: one paper boat through six materials (ink, pencil, riso, screen print,
//                              doodle on a photo, sand), a Persian line per look (silent)
//   Style-HandDrawn-Look       props { times: number[] } → one frame per entry
//   Style-HandDrawn-<Look>     each look alone, 7 s: Ink · Pencil · Riso · Screen · Doodle · Sand
import React from "react";
import { Composition } from "remotion";
import { FPS, HandDrawnLook, HandDrawnStory, LOOK, LOOKS, SEG, STORY_DUR } from "./demo/Video";

type Props = { times?: number[]; captions?: boolean };
const meta = ({ props }: { props: Props }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) });
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-HandDrawn" component={HandDrawnStory} durationInFrames={STORY_DUR * FPS} fps={FPS} width={1080} height={1920} defaultProps={{} as Props} />
    <Composition id="Style-HandDrawn-Look" component={HandDrawnStory} durationInFrames={LOOK.length} fps={FPS} width={1080} height={1920} defaultProps={{ times: LOOK } as Props} calculateMetadata={meta} />
    {LOOKS.map((l) => (
      <Composition key={l} id={`Style-HandDrawn-${cap(l)}`} component={HandDrawnLook} durationInFrames={SEG * FPS} fps={FPS} width={1080} height={1920} defaultProps={{ look: l }} />
    ))}
  </>
);
