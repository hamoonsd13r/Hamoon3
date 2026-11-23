// Light Swarm Epic · the film: the light swarm dances through the score's morphs on the song grid, the countdown runs
// to zero, words slam on the beats, prompts type, footage (optional) plays in windows. All the data is in score.ts.
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { pulse, smooth } from "../../light-swarm/math";
import { applyCamera, cameraSpline, glitchAt, transitionAt, type CamKey, type Transition } from "../../light-swarm/timeline";
import { buildEpicEngine, type EpicEngine } from "../lib/engine";
import { FPS, H, W, ease, hit, ramp, shake, useEpicFonts } from "../lib/theme";
import { BEATS, BIG, CARDS, CHAPTERS, DB, DUR, END, FRAME, HITS, KICKS, MORPHS, PROMPTS, QUIET, SHOTS, SNARES, TERM, UNDER, VIEWS, VIEWS_ON, WORDS, CLIMAX, FINALE, LOGO, beatWindow, type Kind } from "./score";
import { Caption, Corners, Full, Grain, Lower, Slam, TimeCtx, Timer, Vignette, Window } from "../lib/type";
import { FinaleTimer, PromptBar, Terminal, Views } from "../lib/ui";

export const EPIC_FRAMES = Math.round(DUR * FPS);
/** footage shots (score.ts SHOTS): the clips live in public/styles/light-swarm-epic/clips/<n>.mp4 */
const shots = SHOTS;
const within = (t: number, a: number, b: number) => t >= a && t < b;
const quiet = (t: number) => QUIET.some(([a, b]) => t >= a && t < b);

// ─────────────── the transitions table
const P: Record<Kind, { D: number; F: number; q: 0 | 1; swirl: number; turb: number; dim: number }> = {
  build: { D: 1.2, F: 0.42, q: 1, swirl: 0.5, turb: 2.5, dim: 0.55 },
  snap: { D: 0.04, F: 0.34, q: 0, swirl: 0.6, turb: 1.4, dim: 0.35 },
  burst: { D: 0.12, F: 0.8, q: 0, swirl: 3.2, turb: 5, dim: 0.8 },
  drift: { D: 0.3, F: 1.2, q: 0, swirl: 0.8, turb: 3, dim: 0.5 },
};
const TABLE: Transition[] = MORPHS.map((m, i) => {
  const p = P[m.kind];
  return { t0: m.t, D: m.D ?? p.D, F: m.F ?? p.F, q: p.q, a: i ? MORPHS[i - 1].to : "cloud", b: m.to, swirl: p.swirl, turb: p.turb, dim: p.dim };
});
const SAMPLE_END = DB(5);

// ─────────────── camera: the sample's own keys, then framing keys generated from the morphs
const KEYS0: CamKey[] = [
  [0.0, -0.4, 0.16, 520, 0, 0, 0, 50],
  [0.6, -0.3, 0.12, 250, 0, 0, 0, 48],
  [1.8, -0.1, 0.06, 66, 0, 0, 0, 44],
  [2.95, 0.0, 0.05, 40, 0, 0, 0, 44],
  [3.6, 0.3, 0.42, 102, 0, 0, 0, 46],
  [4.9, 0.08, 0.14, 92, 0, 0, 0, 46],
  [6.6, 0.0, 0.0, 80, 0, 0, 0, 40],
  [7.85, 0.0, 0.0, 76, 0, 0, 0, 40],
  [8.8, 0.0, 0.0, 62, 0, 0, 0, 40],
  [9.6, 0.3, 0.14, 100, 0, -14, 0, 46],
  [10.4, 0.5, 0.11, 94, 0, -14, 0, 46],
  [11.2, 0.58, 0.1, 92, 0, -14, 0, 46],
];
const KEYS1: CamKey[] = [];
{
  let side = 1;
  const ms = MORPHS.filter((m) => m.t >= SAMPLE_END);
  ms.forEach((m, i) => {
    const f = FRAME[m.to] ?? { d: 100 };
    const tr = TABLE.find((x) => x.t0 === m.t)!;
    const ta = m.t + Math.min(1.4, tr.D + tr.F);
    const tn = i + 1 < ms.length ? ms[i + 1].t : m.t + 6;
    side = -side;
    const flat = !!f.flat;
    const az0 = flat ? side * 0.08 : (m.az ?? side * 0.42);
    const az1 = flat ? -side * 0.03 : az0 + side * 0.3;
    const el = flat ? 0.03 : (m.el ?? f.el ?? 0.2);
    const ly = (m.ly ?? 0) + (f.y ?? 0);
    const d = m.d ?? f.d;
    const fov = flat ? 40 : 46;
    if (i === 0) KEYS1.push([m.t, az0, el, d * 1.1, 0, ly, 0, fov]);
    KEYS1.push([ta, az0, el, d, 0, ly, 0, fov]);
    if (tn - ta > 0.6) KEYS1.push([tn - 0.04, az1, el * 0.9, d * 0.92, 0, ly, 0, fov]);
  });
  KEYS1.sort((a, b) => a[0] - b[0]);
  for (let i = KEYS1.length - 1; i > 0; i--) if (KEYS1[i][0] - KEYS1[i - 1][0] < 0.05) KEYS1.splice(i, 1);
}
const SHK: [number, number][] = [...HITS.map((h) => [h, BIG.some((b) => Math.abs(b - h) < 0.05) ? 1.4 : 0.6] as [number, number])];
const camA = cameraSpline(KEYS0, [[DB(1), 1.2], [DB(4), 1.4]]);
const camB = cameraSpline(KEYS1, SHK.filter(([h]) => h > SAMPLE_END));
const cam = (t: number) => (t < SAMPLE_END ? camA(t) : camB(t));
const camPrev = (t: number) => (x: number) => (t >= SAMPLE_END && x < SAMPLE_END ? camB(SAMPLE_END) : cam(x));

function applyTr(E: EpicEngine, t: number) {
  const tr = transitionAt(TABLE, t);
  const pu = E.partU;
  pu.sA.value = E.shapeIndex(tr.a);
  pu.sB.value = E.shapeIndex(tr.b);
  pu.offA.value.set(0, 0, 0);
  pu.offB.value.set(0, 0, 0);
  pu.t0.value = tr.t0;
  pu.D.value = tr.D;
  pu.F.value = tr.F;
  pu.quant.value = tr.q;
  pu.swirl.value = tr.swirl;
  pu.turb.value = tr.turb;
  pu.flyDim.value = tr.dim ?? 0.6;
  pu.arrGain.value = tr.D < 0.1 ? 0.3 : 1.5;
  pu.tPrev.value = t - 0.06;
  E.setBeats(beatWindow(tr.t0));
  let lk = -9;
  for (const k of KICKS) if (k <= t) lk = k;
  pu.lastKick.value = lk;
  return tr;
}

const lastBurst = (t: number) => {
  let b = -99;
  for (const h of HITS) if (h <= t) b = h;
  return b;
};

function direct(t: number, E: EpicEngine, c: THREE.PerspectiveCamera) {
  E.setPrev(applyCamera(camPrev(t), c, t));
  const q = quiet(t);
  const kick = q ? 0 : pulse(t, KICKS, 10);
  const beat = pulse(t, BEATS, 7);
  if (!q) {
    c.fov -= 1.4 * kick;
    c.updateProjectionMatrix();
  }
  E.setTime(t);
  const tr = applyTr(E, t);
  const k = cam(t);
  const pu = E.partU;
  const lb = lastBurst(t);
  const big = BIG.some((b) => Math.abs(b - lb) < 0.05);
  const nextM = MORPHS.find((m) => m.t > t);
  const inhale = tr.b === "seed" || tr.b === "core" ? ramp(t, (nextM?.t ?? t + 9) - 0.75, nextM?.t ?? t + 9) : 0;
  pu.kick.value = kick;
  pu.beat.value = beat;
  pu.pAmt.value = (0.4 + 0.6 * smooth(0.5, 0.9, t)) * (t > END + 1.6 ? 1 - ramp(t, END + 1.6, END + 2.4) : 1);
  const climax = CLIMAX.some(([a, b]) => within(t, a, b));
  pu.energy.value = climax ? 0.12 : 0;
  pu.red.value = 0;
  pu.sizeK.value = (tr.b === "chip" ? 1.15 : 1) * (1 - 0.35 * inhale);
  pu.spin.value = tr.b === "galaxy" && within(t, tr.t0, tr.t0 + 0.9) ? 2.6 * (1 - ease.out(ramp(t, tr.t0, tr.t0 + 0.9))) + 0.4 : 0;
  pu.jolt.value = 0;
  // the logo: slash and ACADEMY arrive after it is built, then sweeps of light
  const lg = MORPHS.find((m) => m.to === "logo")?.t ?? 1e9;
  pu.slashK.value = t < lg + 1.6 ? 0 : ease.out(ramp(t, lg + 1.6, lg + 1.85));
  pu.acadP.value = 1.3 * ramp(t, lg + 2.0, lg + 2.5);
  const sw = (a: number) => ramp(t, a, a + 0.75);
  const s1 = sw(lg + 4.2);
  const s2 = sw(lg + 7.5);
  const sweep = s1 > 0 && s1 < 1 ? s1 : s2 > 0 && s2 < 1 ? s2 : -1;
  pu.sweepX.value = sweep < 0 ? -999 : -52 + 104 * ease.io(sweep);
  pu.sweepAmt.value = sweep < 0 ? 0 : 1.7 * Math.sin(Math.PI * sweep);

  const flat = !!FRAME[tr.b]?.flat;
  E.dof.focus.value = k.pos.distanceTo(k.look);
  E.dof.bokeh.value = t < SAMPLE_END ? (t < DB(1) ? 18 : t < DB(2) ? 26 : t < DB(4) ? 14 : 30) : flat ? 11 : tr.b === "galaxy" ? 32 : 22;
  E.dof.maxCoc.value = 26;
  for (let i = 0; i < E.MAXB; i++) E.burstU.evT.value[i] = -99;
  for (let i = 0; i < E.MAXR; i++) E.ringU.rT.value[i] = -99;

  const au = E.arcU;
  const charging = tr.b === "core" || (tr.b === "chip" && within(t, 7.98, DB(4)));
  au.arcAmt.value = charging ? 0.25 + 0.5 * Math.max(inhale, t < DB(4) ? ramp(t, 8.3, DB(4)) : 0) + 0.35 * pulse(t, SNARES, 14) : 0;
  au.arcMode.value = 0;
  au.arcR.value = tr.b === "core" ? 16 : 24;
  au.arcC.value.set(0, 0, 0);

  const cu = E.coreU;
  let amt = 0;
  let size = 24;
  if (tr.b === "seed") {
    amt = (t < 3 ? smooth(0.5, 1.0, t) : 0.6) * (0.7 + 0.8 * inhale) + 0.45 * pulse(t, KICKS, 12);
    size = 14 + 12 * beat + 18 * inhale;
  } else if (t - lb < 0.6) {
    amt = (big ? 0.5 : 0.3) + (big ? 1.3 : 0.8) * hit(t, lb, 0.12);
    size = 20 + 16 * hit(t, lb, 0.2);
  } else if (tr.b === "core") {
    amt = 0.5 * (0.85 + 0.3 * beat) + 0.5 * inhale;
    size = 26 + 10 * beat;
  }
  cu.cAmt.value = amt;
  cu.cSize.value = size;
  cu.cRed.value = 0;
  cu.cPos.value.set(0, 0, 0);

  const nb = E.neb.U;
  nb.time.value = t;
  const baseB = q ? 0.24 : tr.b === "galaxy" ? 0.6 : 0.48;
  nb.bright.value = baseB * (1 + 0.24 * kick) * (t < 3 ? 0.5 + 0.5 * ramp(t, 0, 3) : 1);
  nb.energy.value = climax ? 0.22 : 0;
  nb.pulse.value = kick * 0.25 + (big ? 1.8 : 0.9) * hit(t, lb, 0.5);
  nb.radial.value = tr.b === "galaxy" && t - tr.t0 < 0.9 ? 0.6 : 0;
  nb.red.value = 0;
  nb.eC.value.set(0, 0, 0);
  E.dustU.amt.value = 0.5;

  const g = E.grade;
  g.set("seed", Math.floor(t * 30));
  g.set("glitch", glitchAt(t, HITS, BIG, SNARES, TABLE));
  g.set("flash", 0);
  g.set("black", 0);
  g.set("exposure", 1);
  g.set("ca", 0.0012 + 0.0028 * kick + 0.004 * hit(t, lb, 0.12) * (big ? 1 : 0.5));
  g.set("streak", 0.2 + (big ? 0.6 : 0.25) * hit(t, lb, 0.25));
  E.bloom.intensity = 1.3 + 0.35 * kick + (big ? 0.4 : 0.2) * hit(t, lb, 0.3);
}

const World: React.FC<{ t: number }> = ({ t }) => {
  const { gl, scene, camera, size } = useThree();
  const E = useMemo(() => buildEpicEngine(gl, scene, camera as THREE.PerspectiveCamera, size.width, size.height, beatWindow(0), LOGO), [gl, scene, camera, size.width, size.height]);
  useLayoutEffect(() => {
    direct(t, E, camera as THREE.PerspectiveCamera);
  }, [t, E, camera]);
  useFrame(() => E.render(), 1);
  return null;
};

const chapterAt = (t: number) => {
  let c = CHAPTERS[0];
  for (const x of CHAPTERS) if (t >= x[0]) c = x;
  return c;
};

export const LightSwarmEpic: React.FC<{ times?: number[]; audio?: string; from?: number }> = ({ times, audio, from = 0 }) => {
  useEpicFonts();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const S = height / H;
  const t = times ? times[Math.min(frame, times.length - 1)] : from + frame / FPS;
  const hitsNow = HITS.filter((h) => h <= t && t - h < 0.6);
  const [sx, sy] = shake(t, [...WORDS.filter((w) => !w.calm).map((w) => w.t0), ...hitsNow], 7);
  const [bx, by] = shake(t, BIG, 15, 0.16);
  const hud = ease.out(ramp(t, 0.1, 0.9));
  const [, ch, name] = chapterAt(t);
  const finale = t >= FINALE;
  const under = t >= UNDER.t0 && t < UNDER.t1 + 0.1 ? ease.out(ramp(t, UNDER.t0, UNDER.t0 + 0.25)) * (1 - ramp(t, UNDER.t1 - 0.07, UNDER.t1)) : 0;
  const words = WORDS.filter((w) => t >= w.t0 - 0.01 && t < w.t1 + 0.3);
  const floor = 0.85;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <AbsoluteFill style={{ background: "#050403" }}>
        <AbsoluteFill style={{ transform: `translate(${(sx + bx).toFixed(1)}px, ${(sy + by).toFixed(1)}px) scale(1.02)` }}>
          <ThreeCanvas width={width} height={height} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}>
            <World t={t} />
          </ThreeCanvas>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${S})`, transformOrigin: "0 0" }}>
            {shots.map((s, i) =>
              s.kind === "window" ? (
                <Window key={i} t={t} t0={s.t0} t1={s.t1} s={s.word ?? ""} n={s.n} from={s.from} size={560} />
              ) : (
                <Full key={i} t={t} t0={s.t0} t1={s.t1} n={s.n} from={s.from} fadeOut={s.fade ?? 0} push={0.06} />
              ),
            )}
            <Terminal t={t} t0={TERM.t0} t1={TERM.t1} lines={TERM.lines} />
            <Vignette o={0.55} />
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)", opacity: floor }} />
            {words.map((w, i) => (
              <Slam key={`${w.s}-${i}`} w={{ s: w.s, t0: w.t0, t1: w.t1, size: w.size ?? 150, y: w.y ?? 880, exit: w.exit }} t={t} />
            ))}
            {under > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: 948, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, opacity: under }}>
                <div style={{ width: 70 * under, height: 2, background: "#FF8A3D" }} />
                <span style={{ fontFamily: "EpicHud", fontWeight: 600, fontSize: 34, letterSpacing: "0.5em", paddingLeft: "0.5em", color: "#FFF6EC", textShadow: "0 6px 30px rgba(0,0,0,0.7)" }}>OF TRAINING</span>
                <div style={{ width: 70 * under, height: 2, background: "#FF8A3D" }} />
              </div>
            )}
            {CARDS.filter((c) => t >= c.t0 - 0.01 && t < c.t1 + 0.25).map((c, i) => (
              <Lower key={i} t={t} t0={c.t0} t1={c.t1} big={c.big} small={c.small} />
            ))}
            {PROMPTS.map((p, i) => (
              <PromptBar key={i} t={t} t0={p.t0} t1={p.t1} text={p.text} enter={p.enter} />
            ))}
            {shots.map((s, i) => (
              <Caption key={`c${i}`} t={t} t0={s.t0} t1={s.t1} text={s.cap} />
            ))}
          </div>
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${S})`, transformOrigin: "0 0" }}>
          {!finale && <Timer t={t} o={hud} />}
          <FinaleTimer t={t} start={FINALE} end={END} />
          <Views t={t} keys={VIEWS} on={VIEWS_ON} />
          <Corners o={hud * (t >= END ? 1 - ramp(t, END, END + 0.4) : 1)} chapter={ch} name={name} />
          <Grain frame={frame} o={0.045} />
        </div>
        {audio && !times && (
          <Sequence from={-Math.round(from * FPS)} layout="none">
            <Html5Audio src={staticFile(audio)} />
          </Sequence>
        )}
      </AbsoluteFill>
    </TimeCtx.Provider>
  );
};

/** stills at chosen times, for review (Style-LightSwarmEpic-Look) */
export const LOOK = [0.75, 3.4, 6.5, 8.9, 12, 15.5, 18, 21.5, 23.6, 25.6, 27.6, 29.6, 31.6, 33.4, 35.4, 37.6, 40.2, 42.4, 45, 47, 51.2, 55.8, 57.95, 59.3];
