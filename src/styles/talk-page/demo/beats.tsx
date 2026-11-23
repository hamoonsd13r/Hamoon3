// Talk Page demo — the overlay for an invented sample talk: «سی روز همه‌ی یادداشت‌هامو فقط توی یه اپ نوشتم…»
// (a vertical to-camera video, Persian voice; the page text is English, the accepted look). Every time below is a word
// time from demo/words.json (in your copy: from your own Scribe transcript, pipeline/words.cjs → words.txt).
//   0.0–4.5  tall page, figure 1 printed from the first frame (a code-drawn app; ILLUSTRATION label)
//   4.5      the figure is swept aside, the page settles to the lower third
//   4.6–18   checklist · pen clock + rows · figure 2 (your clip slot) with a ring, a note and a typed search
//   18–22.6  bars + stamp, labelled as his own log
//   24.2–31.5 the page steps aside: call card on the left, ring + live waveform around the phone on the table
//   31.6–end map of three cities · comment keyword → DM · verdict + good night
import React from "react";
import WORDS from "./words.json";
import { BarChart, CallCard, CARD, Checklist, CommentSheet, DotMap, PenClock, PhoneRing, Row, Search, Verdict, VoiceWave } from "../lib/elements";
import { Figure, Head, Page, Running, Zone } from "../lib/page";
import { Note, Ring, Stamp, Stroke, Svg, Tag } from "../lib/pen";
import { PHONE } from "../lib/subject";
import { C, F, PAGE } from "../lib/theme";
import { clamp, eInOut, eOut5, hash, mix, ramp, useT } from "../lib/time";
import { NotesApp } from "./app";
import { MEDIA } from "./media";

export const DEMO_DUR = 40.8;
const SETTLE: [number, number] = [4.45, 5.2]; // tall → low
const AWAY: [number, number] = [24.2, 32.0]; // the page steps aside for the phone; back once CALL ENDED has been read
const SECS: [number, string][] = [
  [0.9, "FIG. 1 · p.1"],
  [4.6, "BEFORE · p.2"],
  [11.85, "FIG. 2 · p.3"],
  [18.25, "MY LOG · p.4"],
  [31.65, "ON THE ROAD · p.5"],
  [35.05, "THE LINK · p.6"],
  [37.75, "MY TAKE · p.7"],
];
const BUMPS = SECS.slice(1).map(([a]) => a);

// who speaks on the phone (from the transcript's `who`), and a speech level for the waveform. In your edit use the
// real loudness of your clip instead: pipeline/voice-env.cjs → env.json → envLevel(env) from lib/elements.
type W = { w: string; s: number; e: number; who?: string };
const WD = WORDS as W[];
const phoneWho = (t: number) => WD.find((x) => x.who && t >= x.s - 0.03 && t <= x.e + 0.05)?.who ?? null;
const phoneLevel = (t: number) => (phoneWho(t) ? 0.45 + 0.55 * hash(Math.floor(t * 12), 3) : 0.04);

// demo-only pen pictures for «کاغذ، پیام به خودم، گالری عکس»: they land where he names them
const Scraps: React.FC<{ at: [number, number, number] }> = ({ at }) => {
  const t = useT();
  const land = (k: number) => eOut5(ramp(t, at[k], at[k] + 0.4));
  const g = (k: number, x: number, y: number, r: number, children: React.ReactNode) => {
    const p = land(k);
    return p > 0 ? (
      <g transform={`translate(${x} ${y - (1 - p) * 30}) rotate(${r + (1 - p) * 8})`} opacity={clamp(p * 1.5)}>
        {children}
      </g>
    ) : null;
  };
  const d = (k: number) => eInOut(ramp(t, at[k] + 0.05, at[k] + 0.5));
  return (
    <Svg>
      {g(0, 470, 26, -7, <>
        <Stroke d="M0 0 L120 4 L114 70 L122 86 L104 132 L4 128 L10 84 L0 66 Z" p={d(0)} w={3} fill={C.paperHi} />
        {[28, 50, 72, 94].map((y, i) => <Stroke key={i} d={`M18 ${y} L${96 - i * 8} ${y + 2}`} p={ramp(d(0), 0.4 + i * 0.12, 0.6 + i * 0.12)} w={2.2} color={C.ink3} />)}
      </>)}
      {g(1, 640, 40, 5, <>
        <Stroke d="M0 18 Q0 0 18 0 H132 Q150 0 150 18 V62 Q150 80 132 80 H40 L18 102 L22 80 H18 Q0 80 0 62 Z" p={d(1)} w={3} fill={C.paperHi} />
        <Stroke d="M20 28 H120 M20 52 H92" p={ramp(d(1), 0.5, 1)} w={2.6} color={C.ink3} />
        <circle cx={150} cy={6} r={12} fill={C.accent} opacity={ramp(d(1), 0.7, 1)} />
      </>)}
      {g(2, 520, 168, -3, <>
        <Stroke d="M0 0 H150 V112 H0 Z" p={d(2)} w={3} fill={C.paperHi} />
        <Stroke d="M14 96 L58 46 L86 76 L104 58 L136 96 Z" p={ramp(d(2), 0.4, 1)} w={2.6} color={C.ink} />
        <circle cx={112} cy={30} r={11} fill="none" stroke={C.ink} strokeWidth={2.6} opacity={ramp(d(2), 0.7, 1)} />
      </>)}
    </Svg>
  );
};

// demo-only: today's calendar, the current block lights up on «جلسه»
const Meeting: React.FC<{ at: number; nowAt: number }> = ({ at, nowAt }) => {
  const t = useT();
  const rows: [string, string][] = [
    ["13:00", "Lunch"],
    ["14:00", "Client review"],
    ["15:30", "Design sync"],
  ];
  const now = eOut5(ramp(t, nowAt, nowAt + 0.35));
  return (
    <>
      <div style={{ ...CARD, left: 0, top: 6, width: 520, height: 280, opacity: eOut5(ramp(t, at, at + 0.4)), transform: `translateY(${(1 - eOut5(ramp(t, at, at + 0.4))) * 16}px) rotate(-1deg)` }}>
        <div style={{ position: "absolute", left: 22, top: 18, fontFamily: F.mono, fontSize: 21, fontWeight: 700, letterSpacing: "0.12em", color: C.label }}>TODAY</div>
        {rows.map(([h, s], i) => {
          const cur = i === 1;
          const q = eOut5(ramp(t, at + 0.15 + i * 0.1, at + 0.45 + i * 0.1));
          return (
            <div key={h} style={{ position: "absolute", left: 18, right: 18, top: 58 + i * 70, height: 60, borderRadius: 8, display: "flex", alignItems: "center", gap: 18, paddingLeft: 14, opacity: q, background: cur ? `rgba(210,86,30,${0.14 + 0.1 * now})` : "rgba(28,26,23,0.05)", borderLeft: `5px solid ${cur && now > 0 ? C.accent : "rgba(28,26,23,0.2)"}` }}>
              <span style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 600, color: C.ink2 }}>{h}</span>
              <span style={{ fontFamily: F.serif, fontSize: 32, fontWeight: cur ? 700 : 500, color: C.ink }}>{s}</span>
              {cur && now > 0 ? <span style={{ marginLeft: "auto", marginRight: 14, padding: "5px 9px 4px", borderRadius: 5, background: C.accent, fontFamily: F.mono, fontSize: 21, fontWeight: 700, letterSpacing: "0.1em", color: C.paperHi, opacity: now }}>NOW</span> : null}
            </div>
          );
        })}
      </div>
      <Tag text="DO NOT DISTURB" at={nowAt + 0.25} x={556} y={120} dark />
    </>
  );
};

export const DemoBeats: React.FC = () => {
  const t = useT();
  const settle = eInOut(ramp(t, SETTLE[0], SETTLE[1]));
  const down = eInOut(ramp(t, AWAY[0], AWAY[0] + 0.35)) * (1 - eOut5(ramp(t, AWAY[1] + 0.05, AWAY[1] + 0.55)));
  const top = mix(PAGE.tall, PAGE.low, settle) + down * 720;
  const away = t > AWAY[0] + 0.4 && t < AWAY[1];
  const fig2Marks = 1 - eInOut(ramp(t, 15.45, 15.7));
  return (
    <>
      {/* the call layer sits under the page: the page slides away to uncover it and back over it */}
      {/* ── the call: the narrow card on the left, pen marks around the real phone on the table ── */}
      <PhoneRing x={PHONE.x - 40} y={PHONE.y - 26} w={PHONE.w + 80} h={PHONE.h + 52} at={24.8} until={25.95} />
      <VoiceWave a={26.3} b={31.5} x={530} y={1440} bars={26} level={phoneLevel} who={phoneWho} labels={{ ai: "ASSISTANT", them: "CALLER" }} accentKey="ai" />
      <CallCard
        inAt={24.3}
        outAt={32.05}
        ringAt={24.8}
        answerAt={25.9}
        endAt={31.45}
        headline="In a meeting"
        caller="Unknown number"
        names={{ ai: "ASSISTANT", them: "CALLER" }}
        lines={[
          { who: "ai", a: 26.45, b: 28.1, text: "Hello — in a meeting right now. Leave a message?" },
          { who: "them", a: 28.25, b: 29.5, text: "Tell them the parcel comes at five." },
          { who: "ai", a: 29.65, b: 31.4, text: "Sure. I'll remind them at 4:30." },
        ]}
      />
      {!away ? (
        <Page bumps={BUMPS} y={top}>
          <Running title="ONE APP · 30 DAYS" secs={SECS} />

          {/* ── 0 · hook: the tall page, figure 1 printed from the first frame ── */}
          <Figure a={-0.4} b={SETTLE[0]} aside={SETTLE[0]} h={540} tagBottom tags={[[0.3, "FIG. 1 · THE APP · DAY 30", 2.5]]} shots={[{ id: "app", a: -0.4, b: SETTLE[0] + 0.8, draw: (tt) => <NotesApp t={tt} newAt={2.3} />, z: [1.0, 1.05], o: "62% 20%" }]}>
            <Tag text="ILLUSTRATION" at={0.3} x={634} y={488} />
            <Ring x={648} y={0} w={180} h={66} at={3.42} />
          </Figure>
          <Head a={0} b={3.0} ws={[{ w: "30", at: -0.4, b: true }, { w: "days.", at: -0.4, b: true }, { w: "One", at: 1.64, hl: 2.24 }, { w: "notes", at: 1.72, hl: 2.27 }, { w: "app.", at: 2.24, hl: 2.3 }]} />
          <Head a={3.02} b={4.5} ws={[{ w: "The", at: 3.05 }, { w: "result?", at: 3.12, hl: 3.14 }, { w: "Hard", at: 3.64 }, { w: "to", at: 3.7 }, { w: "believe.", at: 3.96, ul: 3.98 }]} />

          {/* ── 1 · before: notes everywhere ── */}
          <Head a={4.52} b={8.62} ws={[{ w: "Before:", at: 4.6 }, { w: "notes", at: 4.98 }, { w: "everywhere.", at: 5.6, hl: 5.62 }]} />
          <Zone a={4.5} b={8.68}>
            <Checklist
              title="WHERE MY NOTES LIVED"
              titleAt={4.75}
              items={[
                { text: "paper scraps", boxAt: 4.95, at: 6.5, tick: 6.62 },
                { text: "messages to myself", boxAt: 5.07, at: 7.02, tick: 7.16 },
                { text: "the photo gallery", boxAt: 5.19, at: 7.88, tick: 8.02 },
              ]}
            />
            <Scraps at={[6.56, 7.06, 7.92]} />
          </Zone>

          {/* ── 2 · two hours a week, searching ── */}
          <Head a={8.64} b={11.8} ws={[{ w: "Every", at: 8.7 }, { w: "week:", at: 8.86 }, { w: "2", at: 9.72, b: true, hl: 9.72 }, { w: "hours", at: 9.92, hl: 9.94 }, { w: "searching.", at: 10.44, ul: 10.5 }]} />
          <Zone a={8.55} b={11.94}>
            <PenClock at={8.5} spinAt={9.72} hours={2} dur={1.0} x={128} y={136} r={110} label="PER WEEK" />
            <Row label="TIME LOST" at={9.9} y={40} x={300}>
              ≥ 2 hours
            </Row>
            <Ring x={478} y={22} w={206} h={66} at={10.3} />
            <Row label="LOOKING FOR" at={10.88} y={130} x={300}>
              one note
            </Row>
          </Zone>

          {/* ── 3 · figure 2 (your clip): it tags every note; one question finds it ── */}
          <Figure a={11.8} b={18.16} tags={[[11.95, "FIG. 2 · MY SCREEN RECORDING", 13.6]]} shots={[{ id: "app-tags.mp4", src: MEDIA["app-tags.mp4"], a: 11.8, b: 18.2, z: [1.0, 1.06] }]}>
            <div style={{ position: "absolute", inset: 0, opacity: fig2Marks }}>
              <Ring x={36} y={150} w={300} h={110} at={14.62} />
              <Note text="it tags itself" at={14.82} x={352} y={176} size={48} rot={-4} shadow />
            </div>
            <Search at={15.62} typeAt={16.88} query="the plumber's number?" placeholder="Ask your notes…" result="Kitchen repair · #home" resultAt={17.5} x={40} y={120} w={600} />
          </Figure>
          <Head a={11.85} b={13.5} ws={[{ w: "It", at: 11.9 }, { w: "does", at: 12.0 }, { w: "one", at: 12.28 }, { w: "simple", at: 12.64, ul: 12.66 }, { w: "thing:", at: 12.98 }]} />
          <Head a={13.52} b={15.5} ws={[{ w: "it", at: 13.54 }, { w: "tags", at: 13.6, hl: 14.6 }, { w: "every", at: 13.68 }, { w: "note", at: 13.78 }, { w: "by", at: 14.24 }, { w: "itself.", at: 14.3 }]} />
          <Head a={15.52} b={16.86} ws={[{ w: "And", at: 15.55 }, { w: "when", at: 15.64 }, { w: "you", at: 15.92 }, { w: "look", at: 16.0 }, { w: "for", at: 16.1 }, { w: "it…", at: 16.32 }]} />
          <Head a={16.88} b={18.18} ws={[{ w: "one", at: 16.88 }, { w: "question", at: 17.1, ul: 17.12 }, { w: "finds", at: 17.46, hl: 17.48 }, { w: "it.", at: 17.8 }]} />

          {/* ── 4 · the number: 2 h → 10 min, his own log ── */}
          <Head a={18.2} b={22.62} ws={[{ w: "In", at: 18.25 }, { w: "30", at: 18.54 }, { w: "days:", at: 18.74 }, { w: "2 h", at: 20.12, strike: 20.9 }, { w: "→", at: 20.74 }, { w: "10", at: 21.18, b: true, hl: 21.18 }, { w: "min.", at: 21.42, b: true, hl: 21.44 }]} />
          <Zone a={18.16} b={22.76}>
            <BarChart
              title="SEARCH TIME PER WEEK · MY OWN LOG"
              titleAt={18.3}
              y={0}
              w={420}
              labelW={124}
              max={120}
              trackAt={18.45}
              bars={[
                { label: "DAY 1", value: 120, at: 20.12, text: "2 h" },
                { label: "DAY 30", value: 10, at: 21.18, key: true, text: "10 min" },
              ]}
            />
            <Stamp text="−92%" at={21.95} x={620} y={168} size={36} rot={-8} />
          </Zone>

          {/* ── 5 · one day, mid-meeting (the page slides down just before «گوشیم») ── */}
          <Head a={22.64} b={24.6} ws={[{ w: "One", at: 22.65 }, { w: "day,", at: 22.77 }, { w: "mid-meeting", at: 23.14, ul: 23.42 }, { w: "—", at: 23.8 }]} />
          <Zone a={22.62} b={24.6}>
            <Meeting at={22.6} nowAt={23.42} />
          </Zone>

          {/* ── 6 · three cities (back from the call) ── */}
          <Head a={31.6} b={35.02} ws={[{ w: "One", at: 31.65 }, { w: "month,", at: 31.8 }, { w: "three", at: 32.2, hl: 32.2 }, { w: "cities.", at: 32.52, hl: 32.54 }]} />
          <Zone a={31.6} b={35.14}>
            <DotMap
              at={31.7}
              title="WHERE I WORKED THIS MONTH"
              sites={[
                { lon: 51.4, lat: 35.7, at: 33.5, label: "TEHRAN", key: true, dx: 14, dy: 6 },
                { lon: 13.4, lat: 52.5, at: 34.0, label: "BERLIN", dx: -60, dy: -40 },
                { lon: -79.4, lat: 43.7, at: 34.48, label: "TORONTO", dx: -46, dy: 12 },
              ]}
              routes={[
                [0, 1, 34.0],
                [1, 2, 34.48],
              ]}
            />
          </Zone>

          {/* ── 7 · the link: comment the keyword, it lands in the DM ── */}
          <Head a={35.02} b={36.28} ws={[{ w: "Want", at: 35.05 }, { w: "the", at: 35.12 }, { w: "link?", at: 35.2, ul: 35.24 }]} />
          <Head a={36.3} b={37.72} ws={[{ w: "Comment", at: 36.3, b: true }, { w: "«یادداشت»", at: 36.98, hl: 36.98, ff: "TPFa", size: 44 }]} />
          <Zone a={35.0} b={38.44}>
            <CommentSheet
              at={35.05}
              others={[
                { who: "2h", text: "which app is this?", at: 35.2 },
                { who: "1h", text: "need this for my notes", at: 35.42 },
              ]}
              word="یادداشت"
              rtlWord
              typeAt={36.98}
              sendAt={37.28}
              dmAt={37.45}
              dmText="Here's the link"
              dmLink="your-link.com"
            />
          </Zone>

          {/* ── 8 · my take, good night ── */}
          <Head a={37.74} b={DEMO_DUR + 1} ws={[{ w: "My", at: 37.75 }, { w: "take?", at: 37.82, hl: 37.95 }, { w: "Good", at: 39.7 }, { w: "night.", at: 39.94, ul: 39.98 }]} />
          <Zone a={38.3} b={DEMO_DUR + 1}>
            <Verdict at={38.3} line="Write it once" lineAt={38.46} ulAt={38.9} moonAt={39.7} />
          </Zone>
        </Page>
      ) : null}
    </>
  );
};
