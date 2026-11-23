// Archive Machine · the three.js layer: the data world (towers, core, dive). Mounted for the whole film; it only draws
// while the film is inside the data world (before DATA_END), and holds the first frame until the atlas is in.
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import { COLLAGE_A, WALL_B } from "./scenes/files";
import { DATA_END, buildWorld } from "../lib/world";

export const ATLAS_GRID: [number, number] = [8, 6];

const World: React.FC<{ t: number; atlas: THREE.Texture | null; onReady: () => void }> = ({ t, atlas, onReady }) => {
  const { gl, scene, camera, size } = useThree();
  const B = useMemo(() => buildWorld(gl, scene, camera as THREE.PerspectiveCamera, size.width, size.height, atlas, ATLAS_GRID), [gl, scene, camera, size.width, size.height, atlas]);
  useLayoutEffect(() => {
    B.update(Math.min(t, DATA_END - 1e-3));
  }, [t, B]);
  useFrame(() => {
    // the hero files and the wall cover the world full-frame (COLLAGE_A → WALL_B): skip drawing it there
    if (t < DATA_END && !(t >= COLLAGE_A && t < WALL_B)) B.render();
    onReady();
  }, 1);
  return null;
};

export const DataWorld: React.FC<{ t: number; width: number; height: number }> = ({ t, width, height }) => {
  const [atlas, setAtlas] = useState<{ tex: THREE.Texture | null } | null>(null);
  const [handle] = useState(() => delayRender("archive-machine atlas"));
  useLayoutEffect(() => {
    new THREE.TextureLoader().load(
      staticFile("styles/archive-machine/atlas.jpg"),
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        setAtlas({ tex });
      },
      undefined,
      () => {
        setAtlas({ tex: null }); // no atlas yet: the dive runs without thumbnails
      },
    );
  }, [handle]);
  const [done, setDone] = useState(false);
  const ready = React.useCallback(() => {
    if (!done) {
      setDone(true);
      requestAnimationFrame(() => continueRender(handle));
    }
  }, [done, handle]);
  const visible = t < DATA_END;
  return (
    <div style={{ position: "absolute", inset: 0, visibility: visible ? "inherit" : "hidden" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}>
        {atlas ? <World t={t} atlas={atlas.tex} onReady={ready} /> : null}
      </ThreeCanvas>
    </div>
  );
};
