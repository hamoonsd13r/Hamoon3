// Talk Cutout · media slots. The films used the speaker's own takes, her own stats screenshot and her own finished films;
// the kit ships none of them. A film provides a MEDIA map (name → your file in public/) through <MediaCtx.Provider>;
// any name that is not mapped renders a code-drawn stand-in (the silhouette subject, a code thumbnail), so the film
// always renders. Names used by the demo: talk.mp4 · talk_fg.webm · film.mp4 (your finished film, for «the result»).
import React from "react";
import { OffthreadVideo, Sequence, staticFile } from "remotion";
import { useT } from "./time";

export type MediaMap = Record<string, string>;
export const MediaCtx = React.createContext<MediaMap>({});
/** the public path mapped to `name`, or null (→ the caller draws its stand-in) */
export const useMedia = (name: string): string | null => {
  const m = React.useContext(MediaCtx);
  return m[name] ? staticFile(m[name]) : null;
};

/** a video that starts at film time t0 (frame-exact in the render AND in Look stills, where frame ≠ time) */
export const Clip: React.FC<{ src: string; t0: number; fps: number; from?: number; style?: React.CSSProperties; transparent?: boolean }> = ({ src, t0, fps, from = 0, style, transparent }) => {
  const { t, frame } = useT();
  const local = Math.max(0, Math.round((t - t0) * fps));
  return (
    <Sequence from={frame - local} layout="none">
      <OffthreadVideo src={src} muted transparent={transparent} startFrom={Math.round(from * fps)} style={style} />
    </Sequence>
  );
};
