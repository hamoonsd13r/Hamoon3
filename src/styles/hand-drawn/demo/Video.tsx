// Hand-Drawn · the demo: one paper boat, six materials. Six 7-second films (ink, pencil, riso, screen print, doodle on
// a photo, sand) play back to back; the boat stays in the same place, so every hard cut reads as one journey. A plain
// Persian line sits in the calm lower third of each film.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { HandDrawnFilm } from "../lib/HandDrawnFilm";

export const FPS = 24;
export const SEG = 7; // every look film is 7 s (168 frames)
export const LOOKS = ["ink", "pencil", "riso", "screen", "doodle", "sand"] as const;
export type Look = (typeof LOOKS)[number];
export const LINES: Record<Look, string> = {
  ink: "یه قایقِ کاغذی بود که دریا ندیده بود.",
  pencil: "هر شب نقشه‌ی سفر رو می‌کشید.",
  riso: "تا یه روز، دریا خودش اومد.",
  screen: "روز رفت، شب رفت…",
  doodle: "از هر چیزی یه بادبون ساخت.",
  sand: "موج‌ها ردش رو پاک می‌کردن، ولی دوباره کشیده می‌شد.",
};
export const STORY_DUR = SEG * LOOKS.length;

const useCaptionFont = () => {
  const [h] = useState(() => delayRender("hand-drawn caption font"));
  useEffect(() => {
    new FontFace("HDCaption", `url(${staticFile("fonts/Vazirmatn-Bold.ttf")})`)
      .load()
      .then((f) => document.fonts.add(f))
      .catch((e) => console.error(e))
      .finally(() => continueRender(h));
  }, [h]);
};

const clamp = (x: number) => Math.min(1, Math.max(0, x));
/** the line in the lower third (y ≈ 1430): fades in after the film has started, out before the cut */
export const Caption: React.FC<{ text: string; t: number }> = ({ text, t }) => {
  const o = clamp((t - 0.55) / 0.35) * (1 - clamp((t - (SEG - 0.55)) / 0.35));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1372, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${(1 - o) * 14}px)` }}>
      <div style={{ direction: "rtl", fontFamily: "HDCaption", fontSize: 52, lineHeight: 1.5, color: "#FBF5EA", background: "rgba(26,20,14,0.6)", padding: "16px 38px 20px", borderRadius: 30, textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
        {text}
      </div>
    </div>
  );
};

/** the six looks as one story (or the stills at `times`) */
export const HandDrawnStory: React.FC<{ times?: number[]; captions?: boolean }> = ({ times, captions = true }) => {
  useCaptionFont();
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const k = Math.min(LOOKS.length - 1, Math.floor(t / SEG));
  const lt = t - k * SEG;
  const look = LOOKS[k];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <HandDrawnFilm key={look} film={look} t={lt} />
      {captions ? <Caption text={LINES[look]} t={lt} /> : null}
    </AbsoluteFill>
  );
};

/** one look on its own (7 s, no caption) */
export const HandDrawnLook: React.FC<{ look: Look }> = ({ look }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <HandDrawnFilm film={look} t={frame / FPS} />
    </AbsoluteFill>
  );
};

/** stills at chosen times, for review: two per look */
export const LOOK = LOOKS.flatMap((_, i) => [i * SEG + 2.2, i * SEG + 5.6]);
