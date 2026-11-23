// Lowpoly Dialogue 3D · demo film: the 3D world (three.js) + Persian subtitles (DOM). Copy with director.ts and
// script.ts to src/vNN/ and add your mixed audio (<Html5Audio> inside a <Sequence layout="none">).
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { useDialogueFonts } from "../lib/fonts";
import { Subs, subLines } from "../lib/subs";
import { FPS } from "../lib/theme";
import { buildWorld } from "../lib/world";
import { buildDirector, screenShotAt } from "./director";
import { LINES, WORDS } from "./script";

const SUBS = subLines(LINES, WORDS);

const Stage: React.FC<{ t: number }> = ({ t }) => {
  const { gl, scene, camera, size } = useThree();
  // rebuild only when the canvas size changes (an object dep here rebuilds every frame and leaks lights/textures)
  const D = useMemo(() => {
    scene.clear();
    const w = buildWorld(gl, scene, camera as THREE.PerspectiveCamera, size.width, size.height);
    return buildDirector(w, camera as THREE.PerspectiveCamera);
  }, [gl, scene, camera, size.width, size.height]);
  useLayoutEffect(() => {
    D.update(t);
  }, [t, D]);
  useFrame(() => D.render(), 1);
  return null;
};

export type DemoProps = { times?: number[]; subs?: boolean };
export const LowpolyDialogueDemo: React.FC<DemoProps> = ({ times, subs = true }) => {
  const ready = useDialogueFonts();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  return (
    <AbsoluteFill style={{ background: "#04050d" }}>
      {ready && (
        <ThreeCanvas width={width} height={height} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}>
          <Stage t={t} />
        </ThreeCanvas>
      )}
      {ready && subs && <Subs t={t} lines={SUBS} plate={screenShotAt(t)} scale={width / 1080} />}
    </AbsoluteFill>
  );
};
