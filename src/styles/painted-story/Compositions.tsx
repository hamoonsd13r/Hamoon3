// Painted Story · the compositions this style registers.
//   Style-PaintedStory                 16:9 doc demo «سه روزِ بی‌برق» (silent; the estimated timing of a narration)
//   Style-PaintedStory-Look            same film, props { times: number[] } → one frame per entry
//   Style-PaintedStory-Part2           the same film cut as «قسمت 2» (title, starts at night) — how parts are made
//   Style-PaintedStory-Vertical        9:16 tale demo «دریچه»
//   Style-PaintedStory-Vertical-Look   same, props { times }
import React from "react";
import { Composition } from "remotion";
import { DOC_DUR, DOC_FPS, DOC_LOOK, DocDemo, DOC_SPEC } from "./demo/doc/Video";
import { TALE_FPS, TALE_LOOK, TaleDemo } from "./demo/tale/Video";
import { TALE_DUR } from "./demo/tale/shots";
import { partFrames, type StoryProps } from "./lib/film";

const look = { calculateMetadata: ({ props }: { props: StoryProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) }) };
// part 2 of the doc demo starts at night (the shot of line 9, which rises from black) after a 2.6 s title
const P2_START = DOC_SPEC.shots.find((s) => s.lampAt !== undefined)!.at;

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-PaintedStory" component={DocDemo} durationInFrames={Math.ceil(DOC_DUR * DOC_FPS)} fps={DOC_FPS} width={1920} height={1080} defaultProps={{} as StoryProps} />
    <Composition id="Style-PaintedStory-Look" component={DocDemo} durationInFrames={DOC_LOOK.length} fps={DOC_FPS} width={1920} height={1080} defaultProps={{ times: DOC_LOOK } as StoryProps} {...look} />
    <Composition id="Style-PaintedStory-Part2" component={DocDemo} durationInFrames={partFrames(DOC_FPS, DOC_DUR, P2_START, 2.6)} fps={DOC_FPS} width={1920} height={1080}
      defaultProps={{ start: P2_START, pre: 2.6, end: DOC_DUR, part: 2 } as StoryProps} />
    <Composition id="Style-PaintedStory-Vertical" component={TaleDemo} durationInFrames={Math.ceil(TALE_DUR * TALE_FPS)} fps={TALE_FPS} width={1080} height={1920} defaultProps={{} as StoryProps} />
    <Composition id="Style-PaintedStory-Vertical-Look" component={TaleDemo} durationInFrames={TALE_LOOK.length} fps={TALE_FPS} width={1080} height={1920} defaultProps={{ times: TALE_LOOK } as StoryProps} {...look} />
  </>
);
