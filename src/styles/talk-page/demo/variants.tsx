// Talk Page demo — three short variants on the same sample talk (each ~9.6 s): Strips, Silver, Card.
// Same film wrapper (placeholder speaker or your talk proxy, Look stills with {times}, overlay band with {overlay}).
import React from "react";
import { TalkFilm, TalkFilmProps } from "../lib/film";
import { Count, Note, Stamp, Tick, Typed } from "../lib/pen";
import { C, F } from "../lib/theme";
import { Card, H, U, Words, X } from "../lib/variants/card";
import { BgWord, Cap, ChromeGlyph, DarkPill, Heavy, Light, Scene, Spheres, Stage, Toggle } from "../lib/variants/silver";
import { Dossier, InkClock, RedLine, Strip, StripStamp } from "../lib/variants/strips";
import { MEDIA } from "./media";

export const VAR_DUR = 9.6;
export const VAR_LOOK = [0.4, 1.6, 2.6, 4.2, 5.9, 7.2, 8.9];

// ── Strips: one torn strip per thought, the key words under a redaction bar that slides off on the word ──
const StripsBeats: React.FC = () => (
  <>
    <Strip a={0} b={3.25} h={250} tag="RULE 01 · NOTES">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 26 }}>
        <div style={{ flex: 1 }}>
          <RedLine at={0.1} size={46} ws={["Write it", { w: "the moment", red: 1.25 }]} />
          <RedLine at={1.9} size={46} style={{ marginTop: 4 }} ws={["you", { w: "think it.", ul: 2.25 }]} />
        </div>
        <InkClock at={0.3} size={140} startSec={40} hhmm="09:14" />
      </div>
    </Strip>
    <Strip a={3.25} b={6.45} h={250} tilt={0.4} seed={2} tag="WHAT I DROPPED">
      <Dossier label="FOLDERS" value="all forty of them" at={3.55} hiAt={4.25} />
      <Dossier label="PAPER" value="recycled" at={4.35} hiAt={4.95} />
      <Dossier label="TABS" value="closed" at={5.0} hiAt={5.45} />
      <StripStamp text="CLEARED" at={5.75} style={{ right: 30, top: 64 }} />
    </Strip>
    <Strip a={6.45} b={VAR_DUR + 1} h={250} seed={3} tag="RESULT · DAY 30">
      <RedLine at={6.6} size={50} ws={["Two hours back —"]} />
      <RedLine at={7.3} size={50} style={{ marginTop: 4 }} ws={[{ w: "every week.", red: 7.7, ul: 8.3 }]} />
      <StripStamp text="KEPT" at={8.6} style={{ right: 60, top: 70 }} />
    </Strip>
  </>
);

// ── Silver: one white stage; the content swaps with blur + scale; spheres glide to a new layout each scene ──
const SilverBeats: React.FC = () => (
  <Stage>
    <Spheres
      keys={[
        { t: 0, balls: [{ x: 790, y: 74, r: 44 }, { x: 850, y: 214, r: 26 }, { x: 700, y: 246, r: 15 }] },
        { t: 3.25, balls: [{ x: 828, y: 222, r: 38 }, { x: 700, y: 70, r: 20 }, { x: 860, y: 92, r: 30 }] },
        { t: 6.45, balls: [{ x: 600, y: 236, r: 22 }, { x: 860, y: 60, r: 18 }, { x: 820, y: 232, r: 40 }] },
      ]}
    />
    <Scene a={0} b={3.25}>
      <BgWord text="NOTES" a={0} />
      <Heavy text="One app." at={0.3} style={{ position: "absolute", left: 50, top: 62 }} />
      <Light text="for every single note" at={1.1} style={{ position: "absolute", left: 54, top: 150 }} />
      <Cap text="30 DAYS · MY OWN TEST" at={1.7} style={{ position: "absolute", left: 56, top: 222 }} />
    </Scene>
    <Scene a={3.25} b={6.45}>
      <BgWord text="FOLDERS" a={3.25} />
      <div style={{ position: "absolute", left: 50, top: 50 }}>
        <DarkPill at={3.5} label="Notes" />
      </div>
      <div style={{ position: "absolute", left: 54, top: 140, display: "flex", alignItems: "center", gap: 22 }}>
        <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 34, color: "#3A3A3A" }}>Folders</span>
        <Toggle at={3.7} offAt={4.6} w={96} />
      </div>
      <Cap text="NO MORE FOLDERS" at={5.0} style={{ position: "absolute", left: 56, top: 226 }} />
    </Scene>
    <Scene a={6.45} b={VAR_DUR + 1} last>
      <BgWord text="TIME" a={6.45} />
      <Heavy text="2 h → 10 min" at={6.7} size={62} style={{ position: "absolute", left: 50, top: 62 }} />
      <Light text="every single week" at={7.5} style={{ position: "absolute", left: 54, top: 150 }} />
      <div style={{ position: "absolute", left: 650, top: 70 }}>
        <ChromeGlyph at={8.2} kind="check" size={130} />
      </div>
    </Scene>
  </Stage>
);

// ── Card: a printed card on the table, swapped for the next; marks on the spoken words ──
const CardBeats: React.FC = () => (
  <>
    <Card a={0} b={4.85} h={330} head="FIELD NOTES · ONE APP, 30 DAYS" sec="§1 · THE SETUP" page={1} foot="My own test — phone and laptop, every note.">
      <Words at={0.2} size={46} toks={["I moved", H("every note", 1.0), "into one app", "— and", U("stopped", 2.4), X("using folders.", 3.0)]} />
      <Note text="no folders!" at={3.45} x={520} y={150} size={46} rot={-5} />
    </Card>
    <Card a={4.85} b={VAR_DUR + 1} h={330} head="FIELD NOTES · ONE APP, 30 DAYS" sec="§2 · THE RESULT" page={2} seed={2}>
      <Typed text="SEARCH TIME PER WEEK" at={5.1} />
      <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 18 }}>
        <Count from={120} to={10} at={5.9} dur={1.3} size={104} weight={700} />
        <span style={{ fontFamily: F.serif, fontSize: 40, color: C.ink2 }}>min</span>
        <Stamp text="−92%" at={7.3} size={34} rot={-8} style={{ marginLeft: 30 }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 196, display: "flex", gap: 34, fontFamily: F.serif, fontSize: 32, color: C.ink }}>
        {(
          [
            ["found in seconds", 7.9],
            ["nothing lost", 8.5],
          ] as [string, number][]
        ).map(([s, at]) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Tick at={at} size={34} />
            {s}
          </span>
        ))}
      </div>
    </Card>
  </>
);

export const StripsDemo: React.FC<TalkFilmProps> = (p) => (
  <TalkFilm talk={MEDIA.talk} ovY={1300} {...p}>
    <StripsBeats />
  </TalkFilm>
);
export const SilverDemo: React.FC<TalkFilmProps> = (p) => (
  <TalkFilm talk={MEDIA.talk} ovY={1300} {...p}>
    <SilverBeats />
  </TalkFilm>
);
export const CardDemo: React.FC<TalkFilmProps> = (p) => (
  <TalkFilm talk={MEDIA.talk} ovY={1240} {...p}>
    <CardBeats />
  </TalkFilm>
);
