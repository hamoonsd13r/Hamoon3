// Style Index · the compositions this style registers (posters with three.js need --gl=angle; the reel and the sheet
// show several at once → render them with --concurrency=1).
//   Style-StyleIndex           9:16 reel: numbered list of 20 design styles, each one's motion poster in the card, the wall, the comment CTA
//   Style-StyleIndex-Look      same reel, props { times: number[] } → one frame per entry
//   Style-Poster               one style poster, 720×1280, 6 s, props { id } (minimal, maxi, future, vector, collage, retro, cyber,
//                              pop, glass, clay, pixel, editorial, y2k, swiss, surreal, boho, victorian, graffiti, aurora, hand)
//   Style-Poster-Look          one poster at poster times, props { id, times }
//   Style-PosterSheet          every poster (or `ids`) at one moment per frame, props { times, ids?, cols? }
import React from "react";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import { useFonts } from "./lib/fonts";
import { STYLES } from "./lib/registry";
import { FPS, H, PH, POSTER_SEC, PW, W } from "./lib/theme";
import { FRAMES, StyleIndexReel, type FilmProps } from "./demo/Video";

const LOOK = [0.3, 2.4, 6.4, 9.5, 13.4, 17.6, 19.6, 20.6, 21.5, 22.6, 23.4, 24.6];

type PosterProps = { id: string; times?: number[] };
export const PosterComp: React.FC<PosterProps> = ({ id, times }) => {
  const frame = useCurrentFrame();
  const ok = useFonts();
  const s = STYLES.find((x) => x.id === id) ?? STYLES[0];
  const t = times ? times[frame] ?? 0 : frame / FPS;
  return <AbsoluteFill style={{ background: "#000" }}>{ok ? <s.C t={t} /> : null}</AbsoluteFill>;
};

type SheetProps = { times: number[]; ids?: string[]; cols?: number };
export const PosterSheet: React.FC<SheetProps> = ({ times, ids, cols = 5 }) => {
  const frame = useCurrentFrame();
  const ok = useFonts();
  const list = ids ? STYLES.filter((s) => ids.includes(s.id)) : STYLES;
  const t = times[frame] ?? 0;
  const k = 0.25;
  return (
    <AbsoluteFill style={{ background: "#222" }}>
      {ok
        ? list.map((s, i) => (
            <div key={s.id} style={{ position: "absolute", left: (i % cols) * PW * k, top: Math.floor(i / cols) * PH * k, width: PW * k, height: PH * k, overflow: "hidden" }}>
              <div style={{ width: PW, height: PH, transform: `scale(${k})`, transformOrigin: "0 0", position: "relative" }}>
                <s.C t={t} />
              </div>
            </div>
          ))
        : null}
    </AbsoluteFill>
  );
};

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-StyleIndex" component={StyleIndexReel} durationInFrames={FRAMES} fps={FPS} width={W} height={H} defaultProps={{} as FilmProps} />
    <Composition
      id="Style-StyleIndex-Look"
      component={StyleIndexReel}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ times: LOOK } as FilmProps}
      calculateMetadata={({ props }: { props: FilmProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
    <Composition id="Style-Poster" component={PosterComp} durationInFrames={POSTER_SEC * FPS} fps={FPS} width={PW} height={PH} defaultProps={{ id: "minimal" } as PosterProps} />
    <Composition
      id="Style-Poster-Look"
      component={PosterComp}
      durationInFrames={1}
      fps={FPS}
      width={PW}
      height={PH}
      defaultProps={{ id: "minimal", times: [0.5, 2, 4] } as PosterProps}
      calculateMetadata={({ props }: { props: PosterProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
    <Composition
      id="Style-PosterSheet"
      component={PosterSheet}
      durationInFrames={1}
      fps={FPS}
      width={PW * 0.25 * 5}
      height={PH * 0.25 * 4}
      defaultProps={{ times: [2.5] } as SheetProps}
      calculateMetadata={({ props }: { props: SheetProps }) => ({
        durationInFrames: Math.max(1, props.times.length),
        width: Math.round(PW * 0.25 * (props.cols ?? 5)),
        height: Math.round(PH * 0.25 * Math.ceil((props.ids?.length ?? STYLES.length) / (props.cols ?? 5))),
      })}
    />
  </>
);
