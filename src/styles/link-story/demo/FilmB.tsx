// Film B · «تونل ریلز» — the camera rushes through a tunnel of reels; the same copy and CTA as film A ride on top.
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { BEAT, C, DROP, F, FINAL, FPS, STOP, STYLES, beat, clamp, ease, hit, lerp, ramp, useStoryFonts } from "../lib/theme";
import { buildTunnel } from "../lib/tunnel";
import { CTA, En, Grain, Hush, LinkBox, Logo, Rise, SceneCanvas, glowText, hexA } from "../lib/ui";
import { Features, HookText, Prompt } from "./FilmA";

const World: React.FC<{ t: number }> = ({ t }) => {
  const { gl, scene, camera, size } = useThree();
  const T = useMemo(() => buildTunnel(gl, scene, camera as THREE.PerspectiveCamera, size.width, size.height), [gl, scene, camera, size.width, size.height]);
  useLayoutEffect(() => {
    T.update(t);
  }, [t, T]);
  useFrame(() => T.render(), 1);
  return null;
};

/** keeps text readable over the tunnel: darker top band where the headlines sit */
const Scrim: React.FC<{ t: number }> = ({ t }) => {
  const a = t < beat(8) ? 0 : t < STOP ? 1 : t < DROP ? 0 : 0.7;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, height: 560, background: "linear-gradient(to bottom, rgba(2,2,3,0), rgba(2,2,3,0.82) 30%, rgba(2,2,3,0.82) 70%, rgba(2,2,3,0))", opacity: a }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 34% at 50% 46%, rgba(2,2,3,0.55), transparent 80%)", opacity: t >= DROP ? 1 : 0.6 }} />
    </>
  );
};

// 5.81–7.74 · the finished video flies out of the tunnel
const CHECKS = [
  { fa: "تصویر", side: 1, y: 690 },
  { fa: "صدا", side: -1, y: 690 },
  { fa: "آهنگ", side: 1, y: 890 },
  { fa: "ادیت", side: -1, y: 890 },
];
const Result: React.FC<{ t: number }> = ({ t }) => {
  const a = beat(12), b = beat(16);
  if (t < a - 0.1 || t > b + 0.45) return null;
  const fly = ease.out(ramp(t, a - 0.08, a + 0.35));
  const back = ease.in(ramp(t, b - 0.08, b + 0.14));
  const sc = lerp(0.08, 1, fly) * lerp(1, 0.05, back);
  const sceneK = [1, 3, 5, 0][clamp(Math.floor((t - a) / BEAT), 0, 3)];
  const cut = hit(t, beat(13), 0.06) + hit(t, beat(14), 0.06) + hit(t, beat(15), 0.06);
  const prog = ramp(t, a + 0.2, b - 0.05);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl", opacity: 1 - back * 0.6 }}>
      <div style={{ position: "absolute", top: 300, width: 1080, textAlign: "center", opacity: 1 - back }}>
        <div style={{ fontFamily: F.head, fontSize: 110, lineHeight: 1.05, color: C.ink }}>
          <Rise t={t} at={a}>ویدئوی</Rise> <Rise t={t} at={a + 0.12}>کامل،</Rise>
        </div>
        <div style={{ fontFamily: F.head, fontSize: 84, lineHeight: 1.2, color: C.ink }}>
          <Rise t={t} at={beat(13)}>با</Rise> <Rise t={t} at={beat(13) + 0.1} style={{ color: C.orange }}>صدا</Rise> <Rise t={t} at={beat(13) + 0.2}>و</Rise> <Rise t={t} at={beat(13) + 0.3} style={{ color: C.orange }}>ادیت</Rise>
        </div>
      </div>
      <div style={{ position: "absolute", left: 350, top: 560, width: 380, height: 676, borderRadius: 30, overflow: "hidden", border: `3px solid ${C.orange}`, boxShadow: `0 0 ${70 + cut * 80}px ${hexA(C.orange, 0.45)}, 0 40px 120px rgba(0,0,0,0.8)`, transform: `scale(${sc}) rotate(${(1 - fly) * -12}deg)`, transformOrigin: "50% 40%", opacity: clamp(fly * 3) }}>
        <SceneCanvas k={sceneK} t={t} w={380} h={676} />
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 7, background: "rgba(255,255,255,0.15)" }}>
          <div style={{ width: `${prog * 100}%`, height: 7, background: C.orange, marginLeft: "auto" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: cut * 0.32 }} />
      </div>
      {CHECKS.map((c, i) => {
        const at = a + 0.25 + i * (BEAT / 2);
        const k = ease.back(ramp(t, at, at + 0.25));
        if (k <= 0) return null;
        const x = c.side > 0 ? 770 : 60;
        return (
          <div key={i} style={{ position: "absolute", left: x + (1 - k) * c.side * -120, top: c.y, width: 250, height: 92, borderRadius: 46, background: "rgba(12,13,17,0.9)", border: `2px solid ${hexA(C.orange, 0.6)}`, display: "flex", alignItems: "center", gap: 14, padding: "0 22px", opacity: clamp(k * 3) * (1 - back), transform: `scale(${lerp(0.6, 1, k)})` }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={30} height={30} viewBox="0 0 30 30"><path d="M6 16 L12 22 L24 8" stroke="#160700" strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontFamily: F.head, fontSize: 52, color: C.ink }}>{c.fa}</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: 1262, width: 1080, textAlign: "center", opacity: 1 - back }}>
        <Rise t={t} at={beat(14) + 0.05} dy={40}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "10px 32px", borderRadius: 999, background: "rgba(12,13,17,0.9)", border: `2px solid ${C.orange}`, fontFamily: F.text, fontSize: 44, color: C.ink }}>
            فقط با <En s={0.95}>AI</En>
          </span>
        </Rise>
      </div>
    </div>
  );
};

// 7.74–9.68 · every wall switches style on the beat
const LearnB: React.FC<{ t: number }> = ({ t }) => {
  const a = beat(16), b = beat(20);
  if (t < a - 0.02 || t > b + 0.2) return null;
  const inK = ease.out(ramp(t, a - 0.02, a + 0.3));
  const out = ease.in(ramp(t, b - 0.12, b + 0.15));
  const i = clamp(Math.floor((t - a + 0.02) / BEAT), 0, 3);
  const st = STYLES[i];
  const k = ease.back(ramp(t, st.at, st.at + 0.24));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl", opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 300, width: 1080, textAlign: "center", fontFamily: F.text, fontSize: 48, color: C.dim, opacity: inK }}>
        <Rise t={t} at={a + 0.05} dy={30}>تو این دوره یاد می‌گیری</Rise>
      </div>
      <div style={{ position: "absolute", top: 372, width: 1080, textAlign: "center", fontFamily: F.head, fontSize: 108, color: C.ink, lineHeight: 1, opacity: inK }}>
        <Rise t={t} at={a + 0.18}>هر</Rise> <Rise t={t} at={a + 0.3} style={{ color: C.orange }}>ویدئویی</Rise> <Rise t={t} at={a + 0.42}>رو بسازی</Rise>
      </div>
      <div style={{ position: "absolute", top: 830, width: 1080, textAlign: "center" }}>
        <span style={{ display: "inline-block", padding: "22px 64px", borderRadius: 999, background: C.orange, color: "#160700", fontFamily: F.head, fontSize: 96, transform: `scale(${lerp(0.5, 1, k)})`, opacity: clamp(k * 3), boxShadow: `0 0 70px ${hexA(C.orange, 0.6)}` }}>{st.fa}</span>
      </div>
      <div style={{ position: "absolute", top: 1010, width: 1080, display: "flex", justifyContent: "center", gap: 14, opacity: inK }}>
        {STYLES.map((_, q) => <div key={q} style={{ width: q === i ? 44 : 14, height: 14, borderRadius: 7, background: q <= i ? C.orange : "rgba(255,255,255,0.25)" }} />)}
      </div>
    </div>
  );
};

export const FilmB: React.FC<{ times?: number[]; audio?: string }> = ({ times, audio }) => {
  const ready = useStoryFonts();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const shake = t >= DROP ? hit(t, DROP, 0.15) * 12 : hit(t, beat(5), 0.1) * 6;
  return (
    <AbsoluteFill style={{ background: "#020203", overflow: "hidden" }}>
      {ready && (
        <>
          <ThreeCanvas width={width} height={height} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}>
            <World t={t} />
          </ThreeCanvas>
          <div style={{ position: "absolute", inset: 0, transform: `translate(${Math.sin(t * 97) * shake}px, ${Math.cos(t * 81) * shake}px)` }}>
            <Scrim t={t} />
            <HookText t={t} />
            <Prompt t={t} fade />
            <Result t={t} />
            <LearnB t={t} />
            <Features t={t} solid />
            <Hush t={t} />
            {t >= DROP && <div style={{ position: "absolute", left: 0, right: 0, top: 440, height: 860, background: "radial-gradient(60% 50% at 50% 50%, rgba(2,2,3,0.62), transparent 100%)" }} />}
            <CTA t={t} />
            <Logo w={360} t={t} at={FINAL} style={{ position: "absolute", left: 360, top: 300 }} />
          </div>
          <LinkBox t={t} solid />
          <Grain t={t} a={0.04} />
        </>
      )}
      {audio && !times && (
        <Sequence from={0} layout="none">
          <Html5Audio src={staticFile(audio)} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export { glowText };
