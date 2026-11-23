// Talk Page — the composition wrapper. One layer (your beats), three ways to see it:
//   full     — your talk video (or the placeholder) + the layer: Studio preview, Look stills, the demo
//   overlay  — ONLY the band y ≥ ovY, transparent: this is what you render (ProRes 4444) and lay on the original
//   times    — Look stills: frame i shows time times[i] (any order, any spacing)
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useTalkPageFonts } from "./fonts";
import { Guides, PlaceholderSubject, TalkVideo } from "./subject";
import { H, OV_Y, W } from "./theme";
import { TCtx } from "./time";

export type TalkFilmProps = {
  /** Look stills: frame i shows t = times[i] */
  times?: number[];
  /** render only the transparent band y ≥ ovY (set the composition height to 1920 − ovY) */
  overlay?: boolean;
  ovY?: number;
  /** your talk video in public/ (a 540p proxy is enough for previews); unset = placeholder subject */
  talk?: string;
  /** seconds to add to t when reading the talk video (if the layer's clock starts later than the clip) */
  talkOffset?: number;
  /** placeholder phone screen lit while ringing [from, to] */
  phoneLit?: [number, number];
  /** draw the Instagram UI zones and the band top (previews only) */
  guides?: boolean;
};

export const TalkFilm: React.FC<TalkFilmProps & { children: React.ReactNode }> = ({ times, overlay, ovY = OV_Y, talk, talkOffset = 0, phoneLit, guides, children }) => {
  useTalkPageFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / fps;
  return (
    <TCtx.Provider value={t}>
      {overlay ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: -ovY, width: W, height: H }}>{children}</div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
          {talk ? <TalkVideo src={talk} offset={talkOffset} /> : <PlaceholderSubject phoneLit={phoneLit} />}
          {children}
          {guides ? <Guides ovY={ovY} /> : null}
        </AbsoluteFill>
      )}
    </TCtx.Provider>
  );
};
