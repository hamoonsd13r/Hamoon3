// Painted Story · demo 2 (9:16 tale look): «دریچه» — day nine of a quarantine ward. A narrator in second person, an
// intercom, a neighbour behind the vent and a voice at the door; painted plates + the character's cut-outs moved by
// code; word-by-word captions that reserve their space (skipped on the day-card line); the knock code.
// vo.json here is ESTIMATED (pipeline/estimate-vo.mjs): no voice ships. Make yours → tools/doc-build-vo.mjs.
import React from "react";
import { Captions, makeChunks, type CapChunk } from "../../lib/captions";
import { StoryFilm, type StoryProps, type StorySpec } from "../../lib/film";
import { Checklist, FormField, Hud, LogDayCard, TallEndCard, hideIn } from "../../lib/tale-cards";
import { FOREST_WARD } from "../../lib/theme";
import { C, CODE_KNOCKS, END_CARD, KNOCKS3, KNOCKS_END, SHOTS, TALE_DUR } from "./shots";

const { L, E, Wd } = C;
export const TALE_FPS = 30;
const CHUNKS = makeChunks({ total: C.total, segs: C.segs, words: C.words }, 30);

// the log chip: hidden while the day card, the intercom panels, the floor plan, the knock code or the end card hold the top
const HUD_OFF: [number, number][] = [[0, L(2) + 0.2], [Wd(4, "دکمه") - 0.3, E(4) + 0.6], [Wd(6, "دریچه‌ی") - 0.2, E(6) + 0.3], [Wd(7, "یه") - 0.3, L(8) + 0.3], [END_CARD - 0.4, 999]];
const hudText = (t: number) => (t < L(6) ? "روزِ 9 · اتاقِ 7" : t < L(8) ? "روزِ 9 · شب" : "روزِ 9 · 02:00");

// the hand that writes on the glass rises from the bottom: its caption card moves up, onto the empty glass
const capY = (c: CapChunk) => (c.line === 4 && c.words.some((w) => w.s === Wd(4, "اسمت")) ? 640 : undefined);

const overlay = (t: number) => (
  <>
    <LogDayCard t={t} t0={0.3} t1={L(2) + 0.2} day="9" label="گزارشِ قرنطینه" time={["06:59", "07:00", Wd(1, "نُهم")]} top={330} />
    <Hud text={hudText(t)} a={hideIn(t, HUD_OFF)} />
    <Checklist t={t} t0={Wd(4, "دکمه") - 0.3} t1={E(4) + 0.4} title="هر صبح · اتاقِ 7"
      items={[["دکمه رو بزن", Wd(4, "دکمه")], ["دمات رو بگو", Wd(4, "دمات")], ["اسمت رو روی شیشه بنویس", Wd(4, "اسمت") + 0.3]]} />
    <FormField t={t} t0={Wd(4, "دمات") - 0.1} t1={Wd(4, "اسمت")} label="دمای بدن" value="36.8°" fill={Wd(4, "دمات") + 0.2} />
    {t < END_CARD ? <Captions t={t} chunks={CHUNKS} skip={[1]} quoteSp={["U", "M"]} mimicSp={["X"]} yOf={capY} /> : null}
    <TallEndCard t={t} t0={END_CARD} series="دریچه" from="9" to="10" />
  </>
);

export const TALE_SPEC: StorySpec = {
  dur: TALE_DUR,
  shots: SHOTS,
  knocks: [...KNOCKS3, ...CODE_KNOCKS, ...KNOCKS_END],
  knockShake: 15,
  overlay,
  nightLift: [[L(6), END_CARD]], // night reads too dark on a phone: +20% from «همون شب» to the end card
  vignette: 0.55,
  grain: 0.06,
  fadeIn: 0, // Reels/Shorts: the first frame is the full picture (it is the cover and the autoplay frame)
  // audio: "v01/mix-norm.wav",
};

/** the tale demo; props: Look `times` (or a part window, like the doc) */
export const TaleDemo: React.FC<StoryProps> = (p) => <StoryFilm spec={TALE_SPEC} theme={FOREST_WARD} {...p} />;
export const TALE_LOOK = [1.3, Wd(2, "صندلی") + 0.4, Wd(2, "وجب") + 0.9, Wd(4, "دکمه") + 0.5, Wd(4, "دمات") + 0.9, E(4) + 0.1, Wd(5, "هیچ‌کس") + 0.5, E(6) - 0.4, KNOCKS3[1] + 0.05, Wd(7, "دو") + 0.5, L(8) + 2.0, Wd(9, "وایمیسه") + 0.2, L(10) + 0.3, END_CARD + 2.6];
