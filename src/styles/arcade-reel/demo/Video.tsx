// Arcade Reel · demo film. Copy this file + script.ts to src/vNN/, change the imports to ../styles/arcade-reel/lib/…,
// then put your gameplay in: <Foot clip={…} t={t} t0={…} len={…} fr={{ focus, push }} /> instead of the code-drawn
// plates, and aim the callouts with boxOf(clip, frame, t, t0, [sx, sy, sw, sh]) so they stay on a detail of the shot.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useArcadeFonts } from "../lib/fonts";
import { RACER, RacerPlate, SHOOTER, ShooterPlate } from "../lib/games";
import { Callout, Caps, CardBox, CodeWall, Lock, Pill, SoundChip, Speedo, camera, enterFx } from "../lib/kit";
import { C, FA, FPS, MONO, TimeCtx, accentA, clamp, easeOut, faNum, io, kick, lerp, ramp } from "../lib/theme";
import { CAP_HIDE, CHUNKS, K, SC, TL, WORDS } from "./script";

export type DemoProps = { times?: number[] };
const { S, E } = TL;

const CODE = [
  "const road = new Road({ lanes: 3, glow: true });",
  "const car = new Car({ speed: 0, maxSpeed: 140 });",
  "function update(dt) {",
  "  car.speed += input.gas ? 42 * dt : -18 * dt;",
  "  road.scroll(car.speed * dt);",
  "  if (car.hits(road.edge)) return crash();",
  "}",
  "const sfx = await loadSounds(['engine', 'brake', 'crash']);",
  "function crash() {",
  "  camera.shake(0.5); sfx.crash.play();",
  "  return reset();",
  "}",
  "const wave = new Formation({ rows: 3, cols: 5 });",
  "if (laser.hits(enemy)) enemy.explode();",
];

const Racer: React.FC<{ t: number }> = ({ t }) => {
  const cam = camera(t, [K.crash], [], []);
  const speed = lerp(0.6, 1.2, ramp(t, K.speedo, K.speedo + 0.8)) * (1 - 0.7 * ramp(t, K.crash, K.crash + 0.3));
  const v = clamp(0.35 + 0.55 * io(ramp(t, K.speedo - 0.1, K.speedo + 0.9)) - 0.6 * ramp(t, K.brake, K.crash + 0.3));
  const hookOut = ramp(t, E(0) - 0.1, E(0) + 0.3);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${cam.x}px, ${cam.y}px) scale(${1 + cam.s + 0.03 * clamp(t / 6)})` }}>
        <RacerPlate t={t} speed={speed} />
      </div>
      {/* a red edge pulse on the crash (no white flash) */}
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${260 * kick(t, K.crash, 0.6)}px ${accentA(0.85)}` }} />
      {/* hook title: complete from frame 0 */}
      {hookOut < 1 && (
        <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, top: 180, textAlign: "center", opacity: 1 - hookOut, transform: `translateY(${-30 * hookOut}px)` }}>
          <div style={{ fontFamily: FA, fontWeight: 900, fontSize: 70, color: C.fg, textShadow: "0 6px 30px rgba(0,0,0,.8)" }}>این بازی رو</div>
          <div style={{ fontFamily: FA, fontWeight: 900, fontSize: 112, lineHeight: 1.2, color: C.fg, textShadow: "0 8px 40px rgba(0,0,0,.8)" }}>
            با <span style={{ color: C.accent, display: "inline-block", transform: `scale(${1 + 0.12 * kick(t, K.prompt, 0.5)})` }}>یه پرامپت</span> ساختم
          </div>
        </div>
      )}
      <Callout {...RACER.car} k={ramp(t, K.car - 0.05, K.car + 0.5) * (1 - ramp(t, K.speedo + 0.6, K.speedo + 0.9))} label="ماشین" mono="CAR" below />
      <Callout {...RACER.road} k={ramp(t, K.road - 0.05, K.road + 0.5) * (1 - ramp(t, K.speedo + 0.6, K.speedo + 0.9))} label="جاده" mono="ROAD" />
      <Speedo x={760} y={240} size={260} v={v} k={ramp(t, K.speedo - 0.1, K.speedo + 0.3)} />
      <SoundChip t={t} k={ramp(t, K.sound - 0.1, K.sound + 0.3) * (1 - ramp(t, S(3) - 0.3, S(3)))} hits={[K.engine, K.brake, K.crash]} style={{ left: 70, top: 300 }} />
    </>
  );
};

const KILLS = [0, 2, 4, 6, 8, 11, 13].reduce((m, idx, j) => ({ ...m, [idx]: K.attack + 0.1 + j * 0.13 }), {} as Record<number, number>);
const Shooter: React.FC<{ t: number }> = ({ t }) => {
  const kills = Array.from({ length: 15 }, (_, i) => KILLS[i]) as number[];
  const dim = ramp(t, K.code - 0.2, K.code + 0.3);
  const ent = enterFx("whip", t - S(3));
  return (
    <div style={{ position: "absolute", inset: 0, ...ent }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1.02 + 0.03 * clamp((t - S(3)) / 6)})`, filter: dim > 0 ? `brightness(${1 - 0.65 * dim}) blur(${6 * dim}px)` : undefined }}>
        <ShooterPlate t={t} kills={kills} />
      </div>
      <Callout {...SHOOTER.enemies} k={ramp(t, K.enemies - 0.05, K.enemies + 0.5) * (1 - ramp(t, K.attack + 0.4, K.attack + 0.7))} label="دشمن‌ها" mono="WAVE 03" below />
      <div style={{ position: "absolute", left: 70, top: 250, opacity: 1 - dim, display: "flex", gap: 18, direction: "ltr", fontFamily: MONO, fontSize: 30, color: C.fg }}>
        <span style={{ letterSpacing: 4 }}>SCORE</span>
        <span style={{ color: C.accentHot }}>{String(Math.round(4200 + 900 * Object.values(KILLS).filter((k) => t >= k).length)).padStart(6, "0")}</span>
      </div>
    </div>
  );
};

const Code: React.FC<{ t: number }> = ({ t }) => {
  const k = ramp(t, K.code - 0.1, K.code + 0.3) * (1 - ramp(t, S(5) - 0.3, S(5)));
  const n = Math.round(lerp(640, 2480, io(ramp(t, K.lines - 0.2, K.minutes + 0.3))));
  return (
    <>
      <CodeWall t={t} t0={K.code} k={k} code={CODE} style={{ top: 260, height: 820 }} />
      <CardBox x={140} y={1120} w={800} h={190} k={ramp(t, K.lines - 0.15, K.lines + 0.25) * (1 - ramp(t, S(5) - 0.3, S(5)))} lit>
        <div dir="rtl" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px" }}>
          <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 54, color: C.fg }}>خط کد</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 92, color: C.accent, direction: "ltr" }}>{n.toLocaleString("en-US")}</span>
        </div>
      </CardBox>
      <Pill k={ramp(t, K.minutes - 0.1, K.minutes + 0.3) * (1 - ramp(t, S(5) - 0.3, S(5)))} fa={`${faNum(4)} دقیقه`} mono="BUILD TIME" style={{ left: 330, top: 1030 }} />
    </>
  );
};

const Cta: React.FC<{ t: number }> = ({ t }) => {
  const open = ramp(t, K.comment, K.comment + 0.5);
  return (
    <CardBox x={110} y={520} w={860} h={560} k={ramp(t, S(5), S(5) + 0.4)} lit>
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center" }}>
        <Lock size={150} open={open} glow={kick(t, K.comment + 0.4, 0.8)} />
      </div>
      <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, top: 270, textAlign: "center", fontFamily: FA, fontWeight: 900, fontSize: 78, color: C.fg }}>
        کامنت کن <span style={{ color: C.accent }}>«بازی»</span>
      </div>
      <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: FA, fontWeight: 700, fontSize: 38, color: C.fgDim, opacity: easeOut(ramp(t, K.word, K.word + 0.4)) }}>
        پرامپت بازی‌ها رو برات می‌فرستم
      </div>
    </CardBox>
  );
};

export const ArcadeReelAt: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
    {t < SC.racer[1] + 0.3 && <Racer t={t} />}
    {t >= SC.shooter[0] && <Shooter t={t} />}
    {t >= SC.code[0] && t < SC.code[1] && <Code t={t} />}
    {t >= SC.cta[0] && <Cta t={t} />}
    <Caps t={t} y={1320} words={WORDS} chunks={CHUNKS} hide={CAP_HIDE} />
  </AbsoluteFill>
);

export const ArcadeReelDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useArcadeFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.ink }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <ArcadeReelAt t={t} />
    </TimeCtx.Provider>
  );
};
