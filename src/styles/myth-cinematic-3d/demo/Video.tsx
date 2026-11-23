// Myth Cinematic 3D · «Shahmaran» — the film component: 3D world + letterbox, subtitles (EN + FA), fades and the title.
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AbsoluteFill, Html5Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { BAR, CUE, F, FPS, SUBS, W, clamp, ease, lerp, ramp, useMythFonts, asset } from "../lib/lib";
import { dotTex, flameTex, glowTex, smokeTex } from "../lib/tex";
import { buildWorld } from "../lib/world";
import type { Tex } from "../lib/kit";

const PBR = ["large_sandstone_blocks_01", "medieval_blocks_03", "aerial_sand", "damp_sand"];
let texP: Promise<Tex> | null = null;
const loadTex = () => {
  texP ??= (async () => {
    const L = new THREE.TextureLoader();
    const T: Tex = {};
    // each set may list extra Poly Haven textures in public/styles/myth-cinematic-3d/tex/extra-<set>.json: ["id", …] (maps <id>_diff/_nor_gl/_rough.jpg)
    const extra: string[] = [];
    for (const s of ["well", "hall", "c"]) {
      try {
        const r = await fetch(asset(`tex/extra-${s}.json`));
        if (r.ok) extra.push(...((await r.json()) as string[]));
      } catch {
        /* none */
      }
    }
    await Promise.all(
      [...PBR, ...extra.filter((x) => !PBR.includes(x))].flatMap((id) =>
        ["diff", "nor_gl", "rough"].map(async (k) => {
          // retry (parallel renders sometimes drop a request), then fall back to a neutral 1×1 map
          for (let i = 0; i < 4; i++) {
            try {
              T[`${id}_${k}`] = await L.loadAsync(asset(`tex/${id}_${k}.jpg`));
              return;
            } catch {
              await new Promise((r) => setTimeout(r, 400 * (i + 1)));
            }
          }
          console.error("texture failed", id, k);
          const px = k === "nor_gl" ? [128, 128, 255, 255] : k === "rough" ? [200, 200, 200, 255] : [128, 110, 90, 255];
          const d = new THREE.DataTexture(new Uint8Array(px), 1, 1);
          d.needsUpdate = true;
          T[`${id}_${k}`] = d;
        }),
      ),
    );
    T.flame = flameTex();
    T.glow = glowTex();
    T.dot = dotTex();
    T.smoke = smokeTex();
    return T;
  })();
  return texP;
};

const World: React.FC<{ t: number; T: Tex }> = ({ t, T }) => {
  const { gl, scene, camera, size } = useThree();
  const Wd = useMemo(() => buildWorld(gl, scene, camera as THREE.PerspectiveCamera, size.width, size.height, T), [gl, scene, camera, size.width, size.height, T]);
  useLayoutEffect(() => {
    Wd.update(t);
  }, [t, Wd]);
  useFrame(() => Wd.render(), 1);
  return null;
};

const Subs: React.FC<{ t: number; s: number }> = ({ t, s }) => {
  const cur = SUBS.find((x) => t >= x.a && t < x.b + 0.12);
  if (!cur) return null;
  const o = Math.min(ramp(t, cur.a, cur.a + 0.12), 1 - ramp(t, cur.b, cur.b + 0.12));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAR * s, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 * s, opacity: o }}>
      <div style={{ fontFamily: cur.queen ? F.enI : F.en, fontSize: 46 * s, lineHeight: 1.1, color: cur.queen ? "#f3dcae" : "#efe8dc", letterSpacing: 0.3 * s, textAlign: "center" }}>{cur.en}</div>
      <div style={{ fontFamily: F.fa, fontSize: 36 * s, lineHeight: 1.35, color: "rgba(232,223,207,0.9)", direction: "rtl" }}>{cur.fa}</div>
    </div>
  );
};

const Title: React.FC<{ t: number; s: number }> = ({ t, s }) => {
  if (t < CUE.title - 0.1) return null;
  const k = ease.out(ramp(t, CUE.title, CUE.title + 1.4));
  const k2 = ease.out(ramp(t, CUE.title + 0.6, CUE.title + 1.6));
  const sweep = lerp(-0.2, 1.25, ease.io(ramp(t, CUE.title + 0.9, 40)));
  const push = 1 + 0.025 * ease.sine(ramp(t, CUE.title, 40));
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 * s, transform: `scale(${push})` }}>
      <div style={{ position: "relative", fontFamily: F.title, fontSize: 104 * s, color: "#e8dcc4", letterSpacing: `${0.28 + (1 - k) * 0.25}em`, paddingLeft: "0.28em", opacity: k, filter: `blur(${(1 - k) * 10 * s}px)`, textShadow: "0 0 30px rgba(255,190,110,0.25)" }}>
        SHAHMARAN
        {/* a slow warm light sweep across the letters */}
        <span style={{ position: "absolute", left: 0, top: 0, paddingLeft: "0.28em", color: "#fff1d6", textShadow: "0 0 24px rgba(255,200,130,0.6)", WebkitMaskImage: `linear-gradient(100deg, transparent ${sweep * 100 - 22}%, #000 ${sweep * 100}%, transparent ${sweep * 100 + 16}%)` }}>SHAHMARAN</span>
      </div>
      <div style={{ width: 360 * s * k2, height: 1, background: "linear-gradient(90deg, transparent, rgba(220,180,110,0.8), transparent)" }} />
      <div style={{ fontFamily: F.title, fontSize: 24 * s, color: "rgba(230,215,190,0.75)", letterSpacing: "0.5em", paddingLeft: "0.5em", opacity: k2 }}>A PERSIAN LEGEND</div>
      <div style={{ fontFamily: F.fa, fontSize: 26 * s, color: "rgba(230,215,190,0.6)", direction: "rtl", opacity: k2 }}>شاهماران · افسانه‌ای ایرانی</div>
    </div>
  );
};

/** fades: from black, quick dips, the white flood through the door, the end */
const fade = (t: number) => {
  let black = 1 - ease.out(ramp(t, 0, 1.0));
  black = Math.max(black, Math.min(ramp(t, 10.5, 10.65), 1 - ramp(t, 10.65, 10.85)));
  black = Math.max(black, Math.min(ramp(t, 25.4, 25.55), 1 - ramp(t, 25.55, 25.7)));
  black = Math.max(black, ramp(t, 37.35, 37.85));
  const white = Math.min(ease.in(ramp(t, 13.55, 14.05)), 1 - ease.out(ramp(t, 14.05, 14.35)));
  return { black: clamp(black), white: clamp(white) * 0.92 };
};

/** audio: a path inside public/ (your mix); subs: the bilingual subtitles in the bottom bar */
export const MythFilm: React.FC<{ times?: number[]; audio?: string; subs?: boolean }> = ({ times, audio, subs = true }) => {
  const ready = useMythFonts();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = width / W;
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const [T, setT] = useState<Tex | null>(null);
  const [h] = useState(() => delayRender("myth-cinematic-3d textures"));
  useEffect(() => {
    if (!ready) return;
    loadTex().then((x) => { setT(x); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); });
  }, [ready, h]);
  const f = fade(t);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {ready && T && (
        <ThreeCanvas width={width} height={height} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}>
          <World t={t} T={T} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: f.white }} />
      <AbsoluteFill style={{ background: "#000", opacity: f.black }} />
      <Title t={t} s={s} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR * s, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAR * s, background: "#000" }} />
      {ready && subs && <Subs t={t} s={s} />}
      {audio && !times && (
        <Sequence from={0} layout="none">
          <Html5Audio src={staticFile(audio)} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
