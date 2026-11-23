// Atlas Doc · the film: one full-frame section at a time on the film clock, then the chapter cards, the end card,
// the brand bug, grain and vignette on top. Each section is drawn in its own stacking context, so the Atlas's
// z-indexed labels can never rise above the cards drawn after it. Fonts load before frame 0.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandBug, ChapterCard, EndCard, Grain } from "./doc";
import { docFonts } from "./fonts";
import { C, TimeCtx } from "./theme";

export type Section = { from: number; to: number; C: React.FC<{ t: number }> };
export type Card = { a: number; b: number; n: number; title: string; en: string };
export type Brand = { name?: string; sub?: string; logo?: string };
export type FilmProps = { times?: number[] };

export const makeFilm = (o: { sections: Section[]; cards?: Card[]; end?: { a: number; b: number; note?: string }; brand?: Brand; grain?: number }) => {
  const Film: React.FC<FilmProps> = ({ times }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const [h] = useState(() => delayRender("atlas-doc fonts"));
    useEffect(() => {
      docFonts().then(() => continueRender(h));
    }, [h]);
    const t = times ? (times[Math.min(frame, times.length - 1)] ?? 0) : frame / fps;
    const sec = o.sections.find((s) => t >= s.from && t < s.to);
    const endOn = o.end ? t >= o.end.a : false;
    return (
      <TimeCtx.Provider value={{ t, frame }}>
        <AbsoluteFill style={{ background: C.ink0 }}>
          {sec ? (
            <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
              <sec.C t={t} />
            </div>
          ) : null}
          {(o.cards ?? []).map((c) => (
            <ChapterCard key={c.n} t={t} a={c.a} b={c.b} n={c.n} title={c.title} en={c.en} />
          ))}
          {o.end ? <EndCard t={t} a={o.end.a} b={o.end.b} note={o.end.note} {...o.brand} /> : null}
          {!endOn ? <BrandBug t={t} {...o.brand} /> : null}
          <Grain frame={frame} amount={o.grain ?? 0.07} />
        </AbsoluteFill>
      </TimeCtx.Provider>
    );
  };
  return Film;
};
