// Inside App · the compositions this style registers.
//   Style-InsideApp        9:16 music reel demo: three slash commands → effects → outro grid + comment CTA (silent)
//   Style-InsideApp-Look   same film, props { times: number[] } → one frame per entry
//   Style-InsideApp-FX     one effect alone, full frame (props { id, times? }) — for building a new effect
import React from "react";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import { InsideAppDemo, type DemoProps } from "./demo/Video";
import { FPS, FRAMES, FX, LOOK } from "./demo/script";
import { useAppFonts } from "./lib/fonts";
import { fullOf } from "./lib/theme";

type FxProps = { id: string; times?: number[] };
const FxAlone: React.FC<FxProps> = ({ id, times }) => {
  const frame = useCurrentFrame();
  const ok = useAppFonts();
  const tau = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const Comp = FX.find((d) => d.id === id)?.Comp;
  return <AbsoluteFill style={{ background: "#000" }}>{ok && Comp ? <Comp tau={tau} full={fullOf(tau)} /> : null}</AbsoluteFill>;
};

export const Compositions: React.FC = () => (
  <>
    <Composition id="Style-InsideApp" component={InsideAppDemo} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{} as DemoProps} />
    <Composition
      id="Style-InsideApp-Look"
      component={InsideAppDemo}
      durationInFrames={LOOK.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ times: LOOK } as DemoProps}
      calculateMetadata={({ props }: { props: DemoProps }) => ({ durationInFrames: Math.max(1, props.times?.length ?? 1) })}
    />
    <Composition
      id="Style-InsideApp-FX"
      component={FxAlone}
      durationInFrames={90}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ id: "word-lock" } as FxProps}
      calculateMetadata={({ props }: { props: FxProps }) => ({ durationInFrames: props.times ? Math.max(1, props.times.length) : 90 })}
    />
  </>
);
