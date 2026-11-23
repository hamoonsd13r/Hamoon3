// Painted Story · demo 1 (16:9 doc look): «سه روزِ بی‌برق» — a second-person survival doc, day one.
// One painted still per beat, cut on the narration (every `at` is a line or a word of vo.json), each still moving;
// a tank that fills on «دوازده», a food checklist that ticks on each word, three rules, a radio with static and a
// quoted voice, the lamp going out on «تاریکی», and the knock motif (three knocks from upstairs, three back).
// vo.json here is ESTIMATED (pipeline/estimate-vo.mjs): no voice ships. Make yours → tools/doc-build-vo.mjs.
import React from "react";
import { staticFile } from "remotion";
import { makeClock, type VoJson } from "../../lib/clock";
import { StoryFilm, type Shot, type StoryProps, type StorySpec } from "../../lib/film";
import { DayCard, Mixed, Quote, RulesList, Tank, TickList, TimeChip, TopChip } from "../../lib/doc-cards";
import { NIGHT_DOC } from "../../lib/theme";
import VO from "./vo.json";

const C = makeClock(VO as VoJson);
const { L, E, Wd } = C;
export const DOC_FPS = 30;
export const DOC_DUR = C.total;

// the knock motif: three knocks from upstairs 0.95 s apart; your answer slower (×0.72 → 1.32 s). In a real film
// these come from the audio build (pipeline/build-audio.mjs → knocks.json) so each jolt sits on its sound.
export const DOC_KNOCKS = [0, 0.95, 1.9].map((d) => E(10) + 0.3 + d).concat([0, 1.32, 2.64].map((d) => E(12) + 0.3 + d));

// ids = files in public/styles/painted-story/wide/ (s = a shot still, i = an insert close-up)
const SHOTS: Shot[] = [
  { img: "s002", at: 0, cam: "in", fx: 0.42, fy: 0.42, punch: Wd(1, "ساکت") }, // dawn: awake in bed; tighter on «ساکت»
  { img: "s006", at: L(2), cam: "in", fx: 0.55, fy: 0.45, fxs: ["shake"], punch: Wd(2, "برق"), zoom: 1.15 }, // the phone alert
  { img: "i01", at: L(3), cam: "in" }, // water first: a bottle under the tap
  { img: "i02", at: Wd(3, "ظرفی"), cam: "right" }, // every container
  { img: "i03", at: Wd(3, "وانِ"), cam: "in" }, // even the bathtub
  { img: "s019", at: L(4), cam: "left" }, // the bottles (+ tank)
  { img: "s026", at: L(5), cam: "down" }, // the food on the table (+ checklist)
  { img: "s036", at: L(6), cam: "in", fx: 0.45 }, // writing the rules
  { img: "i05", at: Wd(6, "درِ"), cam: "in" }, // rule 1: the fridge door
  { img: "s040", at: Wd(6, "شمع"), cam: "in" }, // rule 2: the notebook
  { img: "s034", at: Wd(6, "باتریِ"), cam: "right" }, // rule 3: the radio
  { img: "i07", at: L(7), cam: "in", fxs: ["static", "wave"], punch: L(8) }, // the dial, static; punch on the voice
  { img: "s032", at: L(9), cam: "out", cut: "dip", fxs: ["night"], lampAt: Wd(9, "تاریکی") }, // night falls (through black)
  { img: "s039", at: L(10), cam: "in", fxs: ["night"] }, // nine o'clock: the pipe knocks
  { img: "s047", at: L(11), cam: "in", fxs: ["night"], punch: L(12) }, // the neighbour is fine; you answer
];

const overlay = (t: number) => (
  <>
    <DayCard t={t} t0={0.3} day={1} time="06:10" hold={3.8} />
    <TopChip t={t} t0={Wd(2, "سه")} hold={2.4}><Mixed s="قطعی: 3 روز" size={34} /></TopChip>
    <Tank t={t} t0={Wd(4, "چهار") - 0.2} t1={L(5) + 0.2} max={12} fillEnd={Wd(4, "دوازده") + 0.3} label="برای 3 روز" sub="4 لیتر × 3 روز" subAt={Wd(4, "سه")} />
    <TickList t={t} t0={Wd(5, "نون")} t1={L(6) + 0.1} items={[
      { label: "نون", at: Wd(5, "نون") }, { label: "کنسروِ لوبیا", at: Wd(5, "کنسروِ") }, { label: "جو دوسر", at: Wd(5, "جو") },
      { label: "بیسکوییت", at: Wd(5, "بیسکوییت") }, { label: "کره‌بادوم‌زمینی", at: Wd(5, "کره‌بادوم‌زمینی") },
    ]} />
    <RulesList t={t} until={E(6) + 0.8} rules={[
      { at: Wd(6, "درِ"), text: "درِ یخچال رو الکی باز نکن" }, { at: Wd(6, "شمع"), text: "شمع رو بی‌مراقبت روشن نذار" }, { at: Wd(6, "باتریِ"), text: "باتریِ رادیو فقط برای خبر" },
    ]} />
    <TimeChip t={t} t0={L(7)} time="20:00" />
    <Quote t={t} t0={L(8)} hold={E(8) - L(8) + 0.7} text="«تا اطلاعِ بعدی، توی خونه بمونید»" voice="radio" />
    <TimeChip t={t} t0={L(10)} time="21:00" from="20:00" hold={3} />
  </>
);

export const DOC_SPEC: StorySpec = {
  dur: DOC_DUR,
  shots: SHOTS,
  img: (id) => staticFile(`styles/painted-story/wide/${id}.jpg`),
  midBeat: C.midBeat,
  knocks: DOC_KNOCKS,
  overlay,
  nightLift: [[L(9), DOC_DUR]],
  endCard: { at: E(13) + 0.3, next: "قسمت بعد: روزِ 2" },
  series: "سه روزِ بی‌برق",
  grain: 0.03,
  // audio: "v01/mix-norm.wav",   ← your mix (pipeline/build-audio.mjs → tools/doc-mix.mjs)
};

/** the doc demo; props: Look `times`, or a part window (start / pre / end / card / part / next) */
export const DocDemo: React.FC<StoryProps> = (p) => <StoryFilm spec={DOC_SPEC} theme={NIGHT_DOC} {...p} />;
/** times worth a still (Look / contact sheet) */
export const DOC_LOOK = [1.6, Wd(2, "سه") + 0.5, Wd(3, "ظرفی") + 0.4, Wd(4, "دوازده") + 0.4, Wd(5, "بیسکوییت") + 0.4, Wd(6, "شمع") + 0.6, Wd(6, "باتریِ") + 0.9, L(8) + 1.0, Wd(9, "تاریکی") + 0.9, E(10) + 0.33, L(11) + 1.6, E(13) + 2.6];
