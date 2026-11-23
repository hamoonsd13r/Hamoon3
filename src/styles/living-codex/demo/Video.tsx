// Living Codex · demo film. Copy this file + script.ts to src/vNN/, change the imports to ../styles/living-codex/…,
// then swap the lines, the codex words, the reliefs and the odometer numbers. Scenes cut on the narration.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CodexPage, type CodexKey } from "../lib/codex";
import { useCodexFonts } from "../lib/fonts";
import { Odometer } from "../lib/odometer";
import { ChapterPlate, Grade, Subtitle, makeChunks } from "../lib/plate";
import { StoneWall, type ReliefItem } from "../lib/stone";
import { C, F, FPS, TimeCtx, easeOut, ramp } from "../lib/theme";
import { DUR, K, SC, WORDS } from "./script";

export type DemoProps = { times?: number[]; subs?: boolean };
const CHUNKS = makeChunks(WORDS, 7);

const CODEX_KEYS: CodexKey[] = [
  { row: 9, word: "Rex", rest: " Carolus Magnus, imperator Romanorum", gloss: "شاه‌ها", at: K.kings },
  { row: 11, word: "Bellum", rest: " apud Hastingas, Haroldus cecidit", gloss: "جنگ‌ها", at: K.wars },
  { row: 13, word: "Nomina", rest: " testium: Hugo, Odo, Matilda, Adela", gloss: "آدم‌ها", at: K.people },
  { row: 15, word: "Anno MLXVI", rest: ", mense Octobri, luna xiiii", gloss: "تاریخ‌ها", at: K.dates },
];
const RELIEFS: ReliefItem[] = [
  { id: "fox", at: K.fox, label: "روباه" },
  { id: "boar", at: K.boar, label: "گراز" },
  { id: "snake", at: K.snake, label: "مار" },
  { id: "vulture", at: K.vulture, label: "کرکس" },
];

export const LivingCodexAt: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.stone) return <CodexPage t={t} keys={CODEX_KEYS} writeAt={K.written + 0.2} outAt={SC.stone} />;
  if (t < SC.year) {
    const lt = t - SC.stone;
    return (
      <>
        <StoneWall t={lt} items={RELIEFS.map((r) => ({ ...r, at: r.at - SC.stone }))} carveAt={K.stone - SC.stone} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontFamily: F.fa, fontSize: 40, color: C.amber, opacity: easeOut(ramp(t, K.vulture + 0.5, K.vulture + 0.9)) }}>
          حدود ۱۱ هزار سال پیش
        </div>
      </>
    );
  }
  if (t < SC.plate) return <Odometer t={t - SC.year} from={2026} to={12026} slamAt={K.twelve - SC.year} top="سال" bottom="تقویم هولوسن" />;
  return <ChapterPlate t={t - SC.plate} label="فصل ۱" title="صفحه‌ی اول" latin="liber primus" outAt={DUR - SC.plate} />;
};

export const LivingCodexDemo: React.FC<DemoProps> = ({ times, subs = true }) => {
  const frame = useCurrentFrame();
  const ok = useCodexFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
        {ok ? (
          <Grade>
            <LivingCodexAt t={t} />
            {subs && t < SC.plate && <Subtitle t={t} chunks={CHUNKS} />}
          </Grade>
        ) : null}
      </AbsoluteFill>
    </TimeCtx.Provider>
  );
};
