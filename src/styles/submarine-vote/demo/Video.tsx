// Submarine Vote · demo film. Copy this file + script.ts to src/vNN/, change the imports to ../styles/submarine-vote/…,
// then swap the cast names, the lines and who names whom (SPEAK). Room scenes for the narrator, a voice screen per line.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { POSE, mixPose, type Pose } from "../lib/cast";
import { useVoteFonts } from "../lib/fonts";
import { Lineup, Room, Water, type Member } from "../lib/scene";
import { F, FPS, TimeCtx, io, out3, ramp } from "../lib/theme";
import { PhoneScreen } from "../lib/voice";
import { CAST, K, NAMES, SPEAK, TL, WORDS, waterY } from "./script";

export type DemoProps = { times?: number[] };
const { S, E } = TL;
const XS = [180, 360, 540, 720, 900];
const SCARED: Pose = { ...POSE, wide: 1, brow: 1, mouth: "wobble", open: 0.6, sweat: 1, shake: 2.6 };
const CALM: Pose = { ...POSE, wide: 0.4, brow: 0.3, mouth: "smile", open: 0.3, shake: 0.4, arms: "wave", wave: 0 };

/** narrator caption on the empty wall between the hatch and the cast (never on a character) */
const RoomCaption: React.FC<{ t: number; si: number }> = ({ t, si }) => {
  const ws = WORDS.filter((w) => w.si === si);
  if (!ws.length || t < ws[0].s - 0.1 || t > ws[ws.length - 1].e + 0.6) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 80, right: 80, top: 925, textAlign: "center", fontFamily: F.fa, fontSize: 56, lineHeight: 1.3, color: "#fff", textShadow: "0 4px 22px rgba(0,0,0,.85)" }}>
      {ws.map((w, i) => {
        const k = out3(ramp(t, w.s - 0.03, w.s + 0.14));
        const key = /غرق|چهار|کی|قهرمان/.test(w.w);
        return (
          <span key={i} style={{ opacity: 0.25 + 0.75 * k, color: key && k > 0.5 ? "#FFD15C" : "#fff" }}>
            {w.w}
            {i < ws.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
};

const RoomScene: React.FC<{ t: number; si: number; end?: boolean }> = ({ t, si, end }) => {
  const y = waterY(t);
  const leave = end ? io(ramp(t, S(7) - 0.1, S(7) + 1.2)) : 0;
  const cast: Member[] = CAST.map((m, i) => {
    const scared = mixPose(POSE, SCARED, io(ramp(t, K.sinking - 0.2, K.sinking + 0.4)));
    const p = end && m === "bot" ? { ...CALM, wave: Math.sin(t * 7) } : { ...scared, lookX: Math.sin(t * 0.8 + i) * 0.6, blink: (t * 0.7 + i * 0.37) % 3 < 0.12 ? 1 : 0 };
    return { m, name: NAMES[m], x: XS[i], p, out: end && m !== "bot" ? leave : 0, seed: i * 5 };
  });
  return (
    <>
      <Room t={t} seats={4} lit={end ? Math.round(4 * leave) : t >= K.four ? 4 : 0} alarm={end ? 1 - 0.6 * leave : 1} />
      <Lineup t={t} cast={cast} feet={y + 95} s={1.18} tags={1 - (end ? leave : 0)} />
      <Water t={t} y={y} />
      <RoomCaption t={t} si={si} />
    </>
  );
};

export const SubmarineVoteAt: React.FC<{ t: number }> = ({ t }) => {
  // narrator lines play in the room; cast lines on their voice screen
  let si = 0;
  for (let i = 0; i < SPEAK.length; i++) if (t >= S(i) - 0.15) si = i;
  const sp = SPEAK[si];
  if (!sp.who) return <RoomScene t={t} si={si} end={si === SPEAK.length - 1} />;
  const words = WORDS.filter((w) => w.si === si);
  const at = sp.name ? words.find((w) => w.w.includes(sp.name as string))?.s ?? 0 : 0;
  const saved = sp.who === "bot" ? Math.round(4 * ramp(t, K.go, K.go + 0.8)) : 0;
  return (
    <PhoneScreen who={sp.who} names={NAMES} cast={CAST} words={words} t={t} t0={S(si) - 0.15} accuse={sp.accuse} accuseAt={at} saved={saved} pose={sp.who === "bot" ? { mouth: "smile", brow: 0.2, wide: 0.3 } : { brow: -0.4 }} />
  );
};

export const SubmarineVoteDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useVoteFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <AbsoluteFill style={{ background: "#05070B", overflow: "hidden" }}>{ok ? <SubmarineVoteAt t={t} /> : null}</AbsoluteFill>
    </TimeCtx.Provider>
  );
};
void E;
