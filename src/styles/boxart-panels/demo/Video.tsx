// Box-Art Panels · the demo (16 s, vertical, silent): «Moon mission» as a living game cover. The launch photo full-bleed →
// the frame slices into a cover (launch, Earthrise, the title band, Aldrin, the Blue Marble, the flag) and the rating
// stars fill → dive into the launch: the rocket's height lifts off its chip, lands in the stats rail → Earthrise: the
// distance to the Moon → Aldrin under a target lock: hours on the surface → the cover reassembles: LEVEL COMPLETE.
// Photos: NASA (public domain), public/styles/boxart-panels/nasa. Every layer is a pure function of t.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Chip, FULL, FlyNum, Ink, Kin, LIFT, Lock, Panel, Pic, Scrim, Stars, cell, hl, mixQ, vl, type Quad, type Rect } from "../lib/kit";
import { C, F, FPS, HORIZON, SD, SDP, TimeCtx, clamp, ease, fmtInt, jolt, mix, punch, ramp, useBoxFonts, win } from "../lib/theme";

const P = (n: string) => `styles/boxart-panels/nasa/${n}.jpg`;
export const T = { split: 0.6, title: 1.0, dive: 3.2, launch: 3.45, n1: 4.4, d1: 6.2, cut2: 6.8, to: 7.05, n2: 7.9, d2: 9.8, cut3: 10.2, on: 10.45, lock: 10.6, n3: 11.3, d3: 13.1, end: 13.5, done: 13.95 };
export const DUR = 16;

// ── the cover: two slanted gutters across, three down (frame px) ──────────────────────────────────────
const H1 = hl(760, -0.05), H2 = hl(1150, 0.04);
const V1 = vl(590, 0.07), V3A = vl(370, 0.05), V3B = vl(720, -0.045);
const E0 = vl(0), E1 = vl(1080), TOP = hl(0), BOT = hl(1920);
const QA = cell(TOP, H1, E0, V1), QB = cell(TOP, H1, V1, E1), QBAND = cell(H1, H2, E0, E1);
const QC = cell(H2, BOT, E0, V3A), QD = cell(H2, BOT, V3A, V3B), QE = cell(H2, BOT, V3B, E1);
// the Earthrise pair (one slanted gutter)
const HS = hl(980, -0.08);
const QT = cell(TOP, HS, E0, E1), QM = cell(HS, BOT, E0, E1);
const shift = (q: Quad, dx: number, dy: number): Quad => q.map((v, i) => v + (i % 2 === 0 ? dx : dy)) as Quad;
/** a band that opens from its own centre line */
const openQ = (q: Quad, u: number): Quad => {
  const yl = (q[1] + q[7]) / 2, yr = (q[3] + q[5]) / 2;
  return [q[0], mix(yl, q[1], u), q[2], mix(yr, q[3], u), q[4], mix(yr, q[5], u), q[6], mix(yl, q[7], u)];
};

// ── the stats: each number sits on a chip, lifts to the hero spot on its moment, then docks in the rail ─────────────
type Stat = { a: number; dock: number; chip: Rect; num: Rect; label: string; tag: string; text: (u: number) => string; size: number; slot: number };
const SLOT_X = [220, 540, 860], RAIL_Y = 1610;
const STATS: Stat[] = [
  { a: T.n1, dock: T.d1, chip: { x: 70, y: 1428, w: 420, h: 74 }, num: { x: 318, y: 1436, w: 150, h: 58 }, label: "ارتفاع موشک", tag: "SATURN V", text: (u) => `${Math.round(110 * u)} m`, size: 250, slot: 0 },
  { a: T.n2, dock: T.d2, chip: { x: 70, y: 1428, w: 560, h: 74 }, num: { x: 330, y: 1436, w: 280, h: 58 }, label: "فاصله‌ی زمین تا ماه", tag: "TO THE MOON", text: (u) => `${fmtInt(384400 * u)} km`, size: 196, slot: 1 },
  {
    a: T.n3, dock: T.d3, chip: { x: 70, y: 1428, w: 400, h: 74 }, num: { x: 262, y: 1436, w: 190, h: 58 }, label: "ساعت روی سطح ماه", tag: "ON THE MOON",
    text: (u) => { const m = Math.round(1296 * u); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; }, size: 250, slot: 2,
  },
];
const SLOT_FA = ["ارتفاع", "فاصله", "روی ماه"];

const StatChip: React.FC<{ t: number; s: Stat; from: number; to: number }> = ({ t, s, from, to }) => {
  const o = win(t, from, to, 0.25, 0.2);
  if (o <= 0) return null;
  const lifted = t >= s.a - LIFT;
  return (
    <div style={{ position: "absolute", left: s.chip.x, top: s.chip.y, opacity: o, transform: `translateX(${(1 - ease.out(clamp((t - from) / 0.3))) * -80}px)` }}>
      <Chip style={{ height: s.chip.h, boxSizing: "border-box", fontSize: 32, gap: 16 }}>
        <span style={{ color: C.gold }}>{s.tag}</span>
        <span style={{ opacity: lifted ? 0 : 1, fontFamily: F.anton, fontWeight: 400, fontSize: 40 }}>{s.text(1)}</span>
      </Chip>
    </div>
  );
};

const Rail: React.FC<{ t: number }> = ({ t }) => {
  const o = ease.out(clamp((t - (T.n1 - 0.4)) / 0.35));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: RAIL_Y - 62, height: 124, opacity: o, transform: `translateY(${(1 - o) * 40}px)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: "rgba(8,12,26,0.8)", border: `1.5px solid ${C.line2}`, boxShadow: "0 18px 50px rgba(4,8,20,0.55)" }} />
      {SLOT_X.map((x, i) => (
        <div key={i} style={{ position: "absolute", left: x - 60 - 150, width: 300, bottom: 10, textAlign: "center", direction: "rtl", fontFamily: F.faB, fontSize: 22, color: C.dim }}>
          {SLOT_FA[i]}
        </div>
      ))}
      <div style={{ position: "absolute", left: 360 - 60 - 1, top: 22, width: 2, height: 80, background: C.line }} />
      <div style={{ position: "absolute", left: 700 - 60 - 1, top: 22, width: 2, height: 80, background: C.line }} />
    </div>
  );
};

const Stage: React.FC<{ t: number }> = ({ t }) => {
  const s = ease.inOut(clamp((t - T.split) / 0.34));
  const e2 = (d: number) => ease.out(clamp((t - T.split - d) / 0.3));
  const dive = ease.inOut(clamp((t - T.dive) / 0.28));
  const back = ease.inOut(clamp((t - T.end) / 0.36));
  const eb = (d: number) => ease.out(clamp((t - T.end - d) / 0.32));
  const scene = t < T.cut2 ? 1 : t < T.cut3 ? 2 : 3;
  const coverOn = t < T.dive + 0.3 || t >= T.end;
  const shake = jolt(t, T.split, 7, 44, 11) + jolt(t, T.launch, 9, 40, 9) + jolt(t, T.done, 8, 44, 10);
  // the cover (start and end): the panels that are not the dive target
  const side = (q: Quad, d: number, dx: number, dy: number) => (t < T.end ? shift(q, (1 - e2(d)) * dx, (1 - e2(d)) * dy) : shift(q, (1 - eb(d)) * dx, (1 - eb(d)) * dy));
  const bandU = t < T.end ? e2(0) : eb(0.04);
  const ldx = 1 + 0.06 * clamp(t / 3.2);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${shake}px, ${-shake * 0.6}px)` }}>
      <Ink />
      {coverOn && (t < T.dive + 0.3 ? s > 0 : true) ? (
        <>
          <Panel q={side(QB, 0.02, 560, 0)}>
            <Pic src={P("earthrise")} pos="50% 52%" scale={1.12} />
          </Panel>
          <Panel q={side(QD, 0.06, 0, 760)}>
            <Pic src={P("blue-marble")} pos="50% 50%" scale={1.18} />
          </Panel>
          <Panel q={side(QE, 0.09, 460, 200)}>
            <Pic src={P("flag")} pos="70% 50%" />
          </Panel>
          {t >= T.end ? (
            <Panel q={side(QA, 0, -560, 0)}>
              <Pic src={P("launch")} pos="50% 42%" scale={1.06} origin="50% 40%" />
            </Panel>
          ) : null}
          {t >= T.end ? null : (
            <Panel q={side(QC, 0.05, -460, 200)}>
              <Pic src={P("aldrin")} pos="52% 42%" scale={1.05} />
            </Panel>
          )}
          <Panel q={openQ(QBAND, bandU)} bg={C.ink}>
            <div style={{ position: "absolute", inset: 0, background: HORIZON }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${-30 + (t * 46) % 160}%, rgba(255,240,220,0.2) ${-14 + (t * 46) % 160}%, transparent ${2 + (t * 46) % 160}%)` }} />
            <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 120px rgba(4,8,20,0.5)" }} />
          </Panel>
        </>
      ) : null}
      {/* scene 1–2: the launch (full-bleed → its cover panel → dives back to full) */}
      {scene === 1 ? (
        <Panel q={t < T.dive ? mixQ(FULL, QA, s) : mixQ(QA, FULL, dive)}>
          <Pic src={P("launch")} pos="50% 42%" scale={t < T.dive ? ldx : mix(ldx, 1.02, dive) + 0.1 * clamp((t - T.dive) / 3.6)} origin="50% 40%" />
        </Panel>
      ) : null}
      {/* scene 2: Earthrise over the Earth seen from lunar orbit */}
      {scene === 2 ? (
        <>
          <Panel q={shift(QM, (1 - ease.out(clamp((t - T.cut2 - 0.06) / 0.3))) * 1100, 0)}>
            <Pic src={P("blue-marble")} pos="50% 50%" scale={1.02 + 0.05 * clamp((t - T.cut2) / 3.4)} origin="50% 50%" />
          </Panel>
          <Panel q={shift(QT, (1 - ease.out(clamp((t - T.cut2) / 0.3))) * -1100, 0)}>
            <Pic src={P("earthrise")} pos="50% 50%" scale={1.12 + 0.06 * clamp((t - T.cut2) / 3.4)} origin="50% 45%" />
          </Panel>
        </>
      ) : null}
      {/* scene 3 → end: Aldrin full, then back into his cover panel */}
      {scene === 3 ? (
        <Panel q={t < T.end ? mixQ(shift(FULL, 0, (1 - ease.out(clamp((t - T.cut3) / 0.3))) * 1920), FULL, 1) : mixQ(FULL, QC, back)}>
          <Pic src={P("aldrin")} pos="50% 45%" scale={t < T.end ? 1.02 + 0.08 * clamp((t - T.cut3) / 3.3) : mix(1.1, 1.05, back)} origin="52% 40%" />
        </Panel>
      ) : null}
    </div>
  );
};

export const BoxArtDemo: React.FC<{ times?: number[] }> = ({ times }) => {
  useBoxFonts();
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const lit = t < T.split ? 0 : t < T.end ? 5 * clamp((t - T.split) / 1.8) : 5;
  const flashAt = t < T.end ? T.split + 1.8 : T.done;
  const flash = t >= flashAt && t < flashAt + 0.5 ? (Math.floor((t - flashAt) / 0.09) % 2 === 0 ? 1 : 0) : 0;
  const hud = t < T.dive ? 1 : t >= T.end ? ease.out(clamp((t - T.end) / 0.3)) : 1 - clamp((t - T.dive) / 0.2);
  const hold = STATS.reduce((m, s) => Math.max(m, win(t, s.a - LIFT, s.dock + 0.05, 0.2, 0.18)), 0);
  const lockA = t >= T.lock && t < T.n3 - LIFT + 0.1 ? clamp((t - T.lock) / 0.25) * (1 - clamp((t - (T.n3 - LIFT)) / 0.1)) : 0;
  const hitDone = punch(t, T.done, 5);
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
        <Stage t={t} />
        <Scrim a={hold} k={0.5} blur={5} />
        {/* the title band's words (start and end) */}
        <Kin t={t} a={T.title} b={T.dive - 0.05} y={915} size={156} font={F.head} color={C.cream}>
          ماموریت ماه
        </Kin>
        {t >= T.title + 0.2 && t < T.dive ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1040, display: "flex", justifyContent: "center", opacity: ease.out(clamp((t - T.title - 0.2) / 0.25)) }}>
            <Chip>APOLLO 11 · JULY 1969</Chip>
          </div>
        ) : null}
        <Kin t={t} a={T.done} y={925} size={124} font={F.anton} color={C.gold} ltr ls={2} shadow={SDP}>
          LEVEL COMPLETE
        </Kin>
        {t >= T.done + 0.25 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1040, display: "flex", justifyContent: "center", opacity: ease.out(clamp((t - T.done - 0.25) / 0.25)) }}>
            <Chip>
              <span style={{ color: C.gold }}>3 / 3</span> MISSION STATS
            </Chip>
          </div>
        ) : null}
        {/* the words of each scene */}
        <Kin t={t} a={T.launch} b={T.n1 - LIFT - 0.05} y={1240} size={170} font={F.head} from="slam">
          پرتاب
        </Kin>
        <Kin t={t} a={T.to} b={T.n2 - LIFT - 0.05} y={1240} size={160} font={F.head} from="rise">
          تا ماه
        </Kin>
        <Kin t={t} a={T.on} b={T.n3 - LIFT - 0.05} y={1240} size={160} font={F.head} from="rise">
          روی ماه
        </Kin>
        {/* Aldrin under the target lock */}
        <Lock r={{ x: 455, y: 150, w: 300, h: 1060 }} a={lockA} color={C.gold} />
        {/* the stats: chips, the rail, the numbers */}
        <StatChip t={t} s={STATS[0]} from={T.launch + 0.25} to={T.d1} />
        <StatChip t={t} s={STATS[1]} from={T.to + 0.25} to={T.d2} />
        <StatChip t={t} s={STATS[2]} from={T.on + 0.3} to={T.d3} />
        <Rail t={t} />
        {STATS.map((s, i) => (
          <FlyNum
            key={i}
            t={t}
            a={s.a}
            dockAt={s.dock}
            from={s.num}
            hero={{ x: 540, y: 820, size: s.size }}
            dock={{ x: SLOT_X[s.slot], y: RAIL_Y - 14, size: 54 }}
            text={() => s.text(1)}
            label={<span style={{ direction: "rtl", fontFamily: F.head, fontSize: 64, color: C.cream, textShadow: SDP }}>{s.label}</span>}
          />
        ))}
        {/* HUD: the rating stars (top right, inside the safe zone) */}
        <div style={{ position: "absolute", right: 64, top: 250, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, opacity: hud, transform: `scale(${1 + 0.08 * hitDone})`, transformOrigin: "100% 0%" }}>
          <Stars lit={lit} size={58} gap={9} flash={flash} />
          <div style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 24, letterSpacing: 6, color: C.cream, opacity: 0.85, textShadow: SD }}>MISSION RATING</div>
        </div>
        {/* a last soft fade */}
        <AbsoluteFill style={{ background: "#000", opacity: ramp(t, DUR - 0.35, DUR), pointerEvents: "none" }} />
      </AbsoluteFill>
    </TimeCtx.Provider>
  );
};

/** stills at chosen times, for review */
export const LOOK = [0.1, 0.9, 1.6, 2.6, 3.35, 3.9, 4.6, 5.6, 6.5, 7.2, 8.4, 9.9, 10.5, 11.0, 12.2, 13.3, 13.7, 14.3, 15.2, 15.8];
