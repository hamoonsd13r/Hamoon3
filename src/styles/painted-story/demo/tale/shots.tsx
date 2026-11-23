// Painted Story · demo 2 (9:16 tale look): «دریچه» — the shot list. Every shot starts on a word and draws its own
// frame: a painted plate the camera travels over (World), cut-outs pinned in plate px (1280×1920 space, whatever the
// file's real size), atmosphere and graphics tied to the words. Shot = { at, cut?, draw(t, t0, t1) }.
import { staticFile } from "remotion";
import { makeClock, type VoJson } from "../../lib/clock";
import { Cut, World } from "../../lib/camera";
import { Glow, flicker } from "../../lib/atmos";
import type { Shot } from "../../lib/film";
import { DoorShadows, FingerTrail, FloorPlan, KnockCode, Measure, RuleSheet } from "../../lib/tale-cards";
import { WARD_PALETTE } from "../../lib/theme";
import { clamp, ease, mix, noise1, pulseAt, ramp } from "../../lib/time";
import VO from "./vo.json";

export const C = makeClock(VO as VoJson);
const { L, E, Wd, speaking } = C;
export const TALE_DUR = C.total;

// files in public/styles/painted-story/tall/: P = a 2:3 plate (no character), Y = the character's cut-outs,
// S = other cut-outs. ar = width / height of each cut-out (pipeline/cutouts.mjs writes these for your own files).
const P = (id: string) => staticFile(`styles/painted-story/tall/${id}.jpg`);
const AR = { Y07: 654 / 1100, Y09: 530 / 1100, Y11: 1044 / 1100, S23: 450 / 1100 };
const cut = (id: keyof typeof AR) => ({ src: staticFile(`styles/painted-story/tall/${id}.webp`), ar: AR[id] });

// the knock motif (in a real film: knocks.json from the audio build)
export const KNOCKS3 = [0, 0.45, 0.9].map((d) => E(6) + 0.3 + d); // three knocks on the vent
const YES = Wd(7, "یه"), NO = Wd(7, "دو");
export const CODE_KNOCKS = [YES + 0.15, NO + 0.15, NO + 0.42]; // the neighbour shows the code
export const KNOCKS_END = [E(12) + 0.3, E(12) + 0.77]; // the answer: two = no
export const END_CARD = E(12) + 1.6;

export const SHOTS: Shot[] = [
  // 1 · day nine: your room, you on the edge of the bed (the day card holds the top)
  {
    at: 0,
    draw: (t) => (
      <World src={P("P16")} t={t} keys={[[0, 1.0, 0.56, 0.5], [L(2), 1.07, 0.6, 0.52]]}>
        <Cut {...cut("Y07")} x={860} y={1640} h={900} />
      </World>
    ),
  },
  // 2 · a bed, a chair … (the camera walks from the bed to the chair on «صندلی»)
  {
    at: L(2),
    draw: (t, t0) => (
      <World src={P("P16")} t={t} keys={[[t0, 1.12, 0.66, 0.6], [Wd(2, "صندلی") - 0.25, 1.12, 0.66, 0.6], [Wd(2, "صندلی") + 0.5, 1.22, 0.33, 0.68]]}>
        <Cut {...cut("Y07")} x={860} y={1640} h={900} />
      </World>
    ),
  },
  // 3 · … and a window that opens a hand's width: a bracket measures the gap on «وجب»
  {
    at: Wd(2, "پنجره") - 0.4,
    draw: (t, t0) => (
      <World src={P("P17")} t={t} keys={[[t0, 1.0, 0.42, 0.45], [L(3), 1.22, 0.4, 0.48]]}>
        <Measure t={t} t0={Wd(2, "وجب")} x0={412} x1={600} y={980} label="10 سانت" />
      </World>
    ),
  },
  // 4 · seven o'clock: the speaker crackles on (small kicks, the grille starts to glow)
  {
    at: L(3),
    draw: (t, t0) => {
      const on = Wd(3, "روشن");
      return (
        <World src={P("P18")} t={t} keys={[[t0, 1.0, 0.5, 0.47], [on, 1.12, 0.52, 0.45], [L(4), 1.2, 0.5, 0.45]]} kicks={[on, on + 0.18]} kick={6}>
          <Glow x={704} y={845} r={95} a={t >= on ? 0.45 + 0.3 * Math.abs(noise1(t * 11, 5)) : 0} />
        </World>
      );
    },
  },
  // 5 · the intercom talks (the grille breathes with its voice); the button is pressed on «دکمه»
  {
    at: L(4),
    draw: (t, t0) => {
      const press = Wd(4, "دکمه");
      const p = 1 - clamp(Math.abs(t - press - 0.12) / 0.18);
      return (
        <World src={P("P18")} t={t} keys={[[t0, 1.2, 0.47, 0.46], [Wd(4, "اسمت"), 1.32, 0.46, 0.5]]}>
          <Glow x={704} y={845} r={95} a={speaking(t, "U") * (0.55 + 0.45 * Math.abs(noise1(t * 11, 5)))} />
          <div style={{ position: "absolute", left: 576 - 78, top: 998 - 78, width: 156, height: 156, borderRadius: 78, background: "radial-gradient(circle, rgba(10,20,16,0.55), rgba(10,20,16,0) 70%)", opacity: p }} />
          {t > press ? <Glow x={576} y={998} r={120} a={0.5 * (1 - ramp(t, press + 0.2, press + 1.2))} color={WARD_PALETTE.blush} /> : null}
        </World>
      );
    },
  },
  // 6 · write your name on the glass: a fingertip clears a trail through the fog, right to left
  {
    at: Wd(4, "اسمت"),
    draw: (t, t0) => {
      const tr = FingerTrail(t, t0 + 0.35, E(4) + 0.4, 610, 820, 1.5);
      const [fx, fy] = tr.tip;
      return (
        <World src={P("P19")} t={t} keys={[[t0, 1.18, 0.47, 0.42], [L(5), 1.24, 0.47, 0.42]]}>
          <svg width={1280} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            <path d={tr.d} stroke="rgba(236,242,238,0.35)" strokeWidth={30} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "blur(3px)" }} />
            <path d={tr.d} stroke="rgba(18,40,34,0.4)" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <Cut {...cut("Y09")} x={fx} y={fy - 10} h={1250} ax={0.43} ay={0} />
        </World>
      );
    },
  },
  // 7 · the rules, taped to the wall (the room pushed back: blur + dim); the stamp lands on «هیچ‌کس»
  {
    at: L(5),
    draw: (t, t0) => (
      <>
        <World src={P("P16")} t={t} keys={[[t0, 1.5, 0.75, 0.3], [L(6), 1.6, 0.75, 0.3]]} blur={12} dim={0.22} kicks={[Wd(5, "هیچ‌کس")]} kick={10} />
        <RuleSheet t={t} t0={t0 + 0.1} t1={L(6)} head={Wd(5, "نوشتن")} title="قرنطینه" tag="بخشِ 4"
          items={[[Wd(5, "چراغ‌ها"), "چراغ‌ها: ساعتِ 10 خاموش"], [Wd(5, "درو"), "درو برای کسی باز نکن"]]} stamp={[Wd(5, "هیچ‌کس"), "برای هیچ‌کس."]} />
      </>
    ),
  },
  // 8 · that night: the vent (dip through black), then the floor plan: your room, room eight, the vent between
  {
    at: L(6),
    cut: "dip",
    draw: (t, t0) => (
      <>
        <World src={P("P20")} t={t} keys={[[t0, 1.0, 0.6, 0.45], [E(6), 1.12, 0.66, 0.42]]} blur={t > Wd(6, "دریچه‌ی") ? 16 : 0} dim={t > Wd(6, "دریچه‌ی") ? 0.4 : 0}>
          <Glow x={934} y={768} r={380} sx={1.25} a={0.25 + 0.08 * Math.sin(t * 2)} />
        </World>
        <FloorPlan t={t} t0={Wd(6, "دریچه‌ی")} t1={E(6) + 0.1} rooms={8} perRow={4} you={7} label="بخشِ 4 · شب" night
          roomsAt={Wd(6, "دریچه‌ی")} hallAt={Wd(6, "دریچه‌ی") + 0.3} dotsAt={Wd(6, "بینِ")} youAt={Wd(6, "تو")} other={8} otherAt={Wd(6, "هشت")} vent={[7, 8]} ventAt={Wd(6, "هشت") + 0.2} />
      </>
    ),
  },
  // 9 · three knocks: you, under the blanket (the plate pushed far back; the cut-out kept above the captions)
  {
    at: E(6) - 0.05,
    draw: (t, t0) => (
      <World src={P("P20")} t={t} keys={[[t0, 1.3, 0.4, 0.5], [L(7), 1.36, 0.4, 0.5]]} blur={18} dim={0.45}>
        <Cut {...cut("Y11")} x={560} y={800} h={800} ay={0.5} fadeBottom={0.32} />
      </World>
    ),
  },
  // 10 · the neighbour through the vent (it glows while he talks); the knock code, shown knock by knock
  {
    at: L(7),
    draw: (t, t0) => (
      <>
        <World src={P("P20")} t={t} keys={[[t0, 1.3, 0.72, 0.42], [L(8), 1.45, 0.72, 0.42]]}>
          <Glow x={934} y={768} r={380} sx={1.25} a={0.25 + 0.55 * speaking(t, "M") * (0.6 + 0.4 * Math.abs(noise1(t * 9, 8))) + 0.4 * pulseAt(t, CODE_KNOCKS, 0.3)} />
        </World>
        <KnockCode t={t} t0={YES - 0.2} t1={L(8) + 0.2} yes={YES} no={NO} />
      </>
    ),
  },
  // 11 · two a.m.: something walks down the red hallway, slowly, under a failing light
  {
    at: L(8),
    cut: "dip",
    draw: (t, t0) => {
      const u = ease.inOut(ramp(t, t0, L(9)));
      const step = Math.abs(Math.sin(((t - t0) * Math.PI) / 1.15));
      return (
        <World src={P("P22")} t={t} keys={[[t0, 1.08, 0.5, 0.38], [L(9), 1.16, 0.5, 0.42]]} dim={1 - flicker(t, 5)}>
          <Cut {...cut("S23")} x={640} y={mix(810, 1180, u) - step * mix(3, 9, u)} h={mix(230, 640, u)} rot={-3} filter="brightness(0.85)" />
        </World>
      );
    },
  },
  // 12 · it stops right outside your door: two shadows slide into the light strip and stop on «وایمیسه»
  {
    at: L(9),
    draw: (t, t0) => {
      const stop = Wd(9, "وایمیسه");
      return (
        <World src={P("P25")} t={t} keys={[[t0, 1.0, 0.55, 0.5], [stop, 1.04, 0.58, 0.5], [L(10), 1.12, 0.6, 0.5]]} kicks={[stop]} kick={8} dim={t < stop ? (1 - flicker(t, 9)) * 0.8 : 0}>
          {t < stop + 0.25 ? <DoorShadows t={t} t0={t0} t1={stop} xs={[640, 985]} y={890} h={170} /> : null}
        </World>
      );
    },
  },
  // 13 · «بیداری؟» — the light under the door breathes with the voice
  {
    at: L(10),
    draw: (t, t0) => (
      <World src={P("P25")} t={t} keys={[[t0, 1.12, 0.6, 0.5], [L(11), 1.3, 0.6, 0.52]]}>
        <Glow x={800} y={975} r={430} sx={1.6} a={0.15 + 0.5 * speaking(t, "X") * (0.6 + 0.4 * Math.abs(noise1(t * 13, 4)))} />
      </World>
    ),
  },
  // 14 · in your own voice: you, under the blanket, the room nearly black
  {
    at: L(11),
    draw: (t, t0) => (
      <World src={P("P20")} t={t} keys={[[t0, 1.3, 0.45, 0.5], [L(12), 1.42, 0.45, 0.5]]} blur={20} dim={0.6}>
        <Cut {...cut("Y11")} x={560} y={800} h={800} ay={0.5} fadeBottom={0.32} />
      </World>
    ),
  },
  // 15 · from the vent: two knocks (no) — the vent flashes on each, then the end card
  {
    at: L(12),
    draw: (t, t0) => (
      <>
        <World src={P("P20")} t={t} keys={[[t0, 1.22, 0.72, 0.42], [E(12) + 2, 1.4, 0.72, 0.42], [TALE_DUR, 1.5, 0.72, 0.42]]} dim={0.4}>
          <Glow x={934} y={768} r={380} sx={1.25} a={0.1 + 0.9 * pulseAt(t, KNOCKS_END, 0.5) + (t > END_CARD ? 0.25 * (0.5 + 0.5 * Math.sin((t - END_CARD) * 2.4)) : 0)} />
        </World>
        <KnockCode t={t} t0={KNOCKS_END[0] - 0.1} t1={END_CARD + 0.2} yes={0} no={KNOCKS_END[0]} onlyNo />
      </>
    ),
  },
];
