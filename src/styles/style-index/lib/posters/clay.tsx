// 10 · Claymorphism — the word is the hero: inflated clay letters CLAY / MORPHISM drop in on the first two beats with
// squash and stretch, then hop in a wave on every beat under one soft key light; below, the clay creator pops up on a
// puffy UI card whose toggle flips and slider glides, a liked chat bubble floating beside him.
import React from "react";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { Img } from "remotion";
import { F, PW, clamp, ease, mix, ramp, tween } from "../theme";
import { Frame, Grain, ar, img, type PosterProps } from "../kit";
import { ThreeLayer, loadFont, type BuildArgs } from "../three";

const BG = "#F1E3D2", BROWN = "#7A4E36";
const COLS = ["#F08A6E", "#F6C453", "#7CCFB0", "#A79BF2"];
const COLS2 = ["#F2A1B8", "#F08A6E", "#F6C453", "#7CCFB0", "#6FB9E8", "#A79BF2", "#F2A1B8", "#F08A6E"];
const SHIFT = 450; // the 3-D layer is lifted so the word sits in the top third; its floor is the poster's own colour

const clay = (c: string) =>
  new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.84, metalness: 0, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(c).lerp(new THREE.Color("#fff"), 0.5) });

/** drop + bounce + squash for one letter, u = time since its release */
const drop = (u: number) => {
  if (u <= 0) return { y: 4, sy: 1.1 };
  const T = 0.22; // fall time
  if (u < T) return { y: 4 * (1 - (u / T) ** 2), sy: 1.14 };
  const v = u - T;
  const bounce = Math.abs(Math.sin(v * 12)) * Math.exp(-v * 8) * 0.55;
  const sq = 1 - 0.32 * Math.exp(-v * 12) * Math.cos(v * 26);
  return { y: bounce, sy: clamp(sq, 0.64, 1.2) };
};
/** a small hop on every beat from t0, letter i a little later than i−1 (a wave), squashing as it lands */
const hop = (t: number, t0: number, i: number) => {
  if (t < t0) return { y: 0, sy: 1 };
  const l = (t - t0 - i * 0.045) % 0.5;
  if (l < 0) return { y: 0, sy: 1 };
  if (l < 0.26) return { y: 0.14 * Math.sin((Math.PI * l) / 0.26), sy: 1.04 };
  const v = l - 0.26;
  return { y: 0, sy: 1 - 0.07 * Math.exp(-v * 18) * Math.cos(v * 30) };
};

type Letter = { holder: THREE.Group; w: number };
const word = (scene: THREE.Scene, font: Font, text: string, size: number, depth: number, cols: string[], z: number, gap: number) => {
  const ls: Letter[] = Array.from(text).map((ch, i) => {
    const g = new TextGeometry(ch, { font, size, depth, curveSegments: 16, bevelEnabled: true, bevelThickness: size * 0.12, bevelSize: size * 0.055, bevelSegments: 10 });
    g.computeBoundingBox();
    const b = g.boundingBox!;
    g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    const m = new THREE.Mesh(g, clay(cols[i % cols.length]));
    m.castShadow = true;
    m.receiveShadow = true;
    const holder = new THREE.Group();
    holder.add(m);
    holder.position.z = z;
    scene.add(holder);
    return { holder, w: b.max.x - b.min.x };
  });
  const total = ls.reduce((s, l) => s + l.w, 0) + gap * (ls.length - 1);
  let x = -total / 2;
  for (const l of ls) {
    l.holder.position.x = x + l.w / 2;
    x += l.w + gap;
  }
  return ls;
};

const build = ({ gl, scene, camera, assets }: BuildArgs<Font>) => {
  gl.setClearColor(BG, 1);
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.05;
  scene.background = new THREE.Color(BG);
  camera.fov = 30;
  camera.position.set(0, 2.6, 11);
  camera.lookAt(0, 0.85, 0);
  camera.updateProjectionMatrix();
  scene.add(new THREE.HemisphereLight("#FFF6EC", "#D6BFA3", 0.95));
  // one soft key from the top left (the creator's own light comes from there too)
  const key = new THREE.DirectionalLight("#FFF1E0", 2.5);
  key.position.set(-5, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#FFE9DA", 0.3);
  fill.position.set(5, 2, 6);
  scene.add(fill);
  // the floor is exactly the poster's colour (unlit, not tone-mapped), so the lifted layer has no seam; shadows ride on top
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: BG, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.2, color: "#6B4A30" }));
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.002;
  shade.receiveShadow = true;
  scene.add(shade);
  const big = word(scene, assets, "CLAY", 0.6, 0.36, COLS, 0, 0.09);
  const small = word(scene, assets, "MORPHISM", 0.235, 0.16, COLS2, 1.8, 0.03);
  return {
    update: (t: number) => {
      const place = (ls: Letter[], at: number, hopFrom: number) =>
        ls.forEach((l, i) => {
          const d = drop(t - at - i * 0.05);
          const h = hop(t, hopFrom, i);
          const breathe = 1 + Math.sin(t * 3 + i) * 0.02 * tween(t, 0.9, 1.3);
          const sy = d.sy * h.sy;
          l.holder.position.y = d.y + h.y;
          l.holder.scale.set((1 / Math.sqrt(sy)) * breathe, sy * breathe, 1 / Math.sqrt(sy));
          l.holder.rotation.z = Math.sin(t * 2.2 + i * 1.7) * 0.025 * tween(t, 0.8, 1.2);
        });
      place(big, 0.0, 1.0); // CLAY on the first beat
      place(small, 0.5, 1.25); // MORPHISM on the second
      camera.position.set(Math.sin(t * 0.4) * 0.35, 2.6 - t * 0.02, 11 - t * 0.06);
      camera.lookAt(0, 0.85, 0);
    },
    render: () => gl.render(scene, camera),
  };
};
const load = () => loadFont("Sniglet-ExtraBold");

const puffy = (bg: string): React.CSSProperties => ({
  background: bg,
  boxShadow: "16px 18px 34px rgba(150,110,80,0.26), inset -10px -12px 20px rgba(120,80,50,0.16), inset 10px 12px 22px rgba(255,255,255,0.65)",
});

// the creator (CLY-01, trimmed): 250 wide, standing on the card
const CW = 250, CH = CW * ar("CLY-01"), CX = (PW - CW) / 2 + 8, CARD_Y = 1090, CY = CARD_Y + 8 - CH;

export const Clay: React.FC<PosterProps> = ({ t }) => {
  const card = tween(t, 0.15, 0.45, (u) => ease.outBack(u, 1.5));
  const boy = tween(t, 0.3, 0.6, (u) => ease.outBack(u, 1.9));
  const beat = t > 0.9 ? Math.abs(Math.sin(((t - 0.9) * Math.PI) / 0.5)) : 0;
  const on = Math.floor(Math.max(0, t - 0.9) / 1) % 2 === 1 ? 1 : 0; // the toggle flips every second
  const onK = mix(1 - on, on, tween(((t - 0.9) % 1 + 1) % 1, 0, 0.2, ease.out));
  const slide = 0.5 + 0.5 * Math.sin(t * 1.6);
  const bob = (k: number) => Math.sin(t * 2.1 + k) * 7;
  const left = tween(t, 0.45, 0.7, (u) => ease.outBack(u, 2));
  const right = tween(t, 0.55, 0.8, (u) => ease.outBack(u, 2));
  return (
    <Frame bg={BG}>
      <ThreeLayer t={t} build={build} load={load} style={{ transform: `translateY(${-SHIFT}px)` }} />
      {/* a liked chat bubble and a slider, floating either side of him */}
      <div style={{ position: "absolute", left: 40, top: 640 + bob(0), width: 176, height: 84, borderRadius: 42, ...puffy("#FFF4EA"), transform: `scale(${left})`, opacity: t >= 0.45 ? 1 : 0 }}>
        <div style={{ position: "absolute", left: 16, top: 16, width: 52, height: 52, borderRadius: 26, ...puffy("#F2A1B8"), fontSize: 26, lineHeight: "52px", textAlign: "center", color: "#fff", transform: `scale(${1 + 0.12 * beat})` }}>♥</div>
        <div style={{ position: "absolute", left: 80, top: 20, fontFamily: F.sniglet, fontSize: 32, color: BROWN }}>2.4k</div>
      </div>
      <div style={{ position: "absolute", left: 506, top: 760 + bob(2), width: 176, height: 62, borderRadius: 31, ...puffy("#EAD9C6"), transform: `scale(${right})`, opacity: t >= 0.55 ? 1 : 0 }}>
        <div style={{ position: "absolute", left: 14, top: 22, width: 148 * (0.2 + 0.8 * slide), height: 18, borderRadius: 9, background: "#7CCFB0", boxShadow: "inset 3px 3px 6px rgba(255,255,255,0.6), inset -3px -3px 6px rgba(60,120,100,0.25)" }} />
        <div style={{ position: "absolute", left: 6 + 120 * slide, top: 7, width: 48, height: 48, borderRadius: 24, ...puffy("#FFF7EE") }} />
      </div>
      {/* the card he stands on */}
      <div style={{ position: "absolute", left: 60, top: CARD_Y, width: 600, height: 150, borderRadius: 48, ...puffy("#F7EBDD"), transform: `translateY(${(1 - card) * 260}px) scale(${mix(0.8, 1, card)})`, opacity: t >= 0.15 ? 1 : 0 }}>
        <div style={{ position: "absolute", left: 26, top: 28, width: 94, height: 94, borderRadius: 30, ...puffy("#F2A1B8") }} />
        <div style={{ position: "absolute", left: 140, top: 40, width: 120, height: 26, borderRadius: 13, ...puffy("#EAD9C6") }} />
        <div style={{ position: "absolute", left: 140, top: 84, width: 80, height: 26, borderRadius: 13, ...puffy("#EAD9C6") }} />
        <div style={{ position: "absolute", left: 380, top: 46, width: 110, height: 56, borderRadius: 28, ...puffy(onK > 0.5 ? "#7CCFB0" : "#E6D3BF") }}>
          <div style={{ position: "absolute", top: 7, left: mix(8, 60, onK), width: 42, height: 42, borderRadius: 21, ...puffy("#FFF7EE") }} />
        </div>
        <div style={{ position: "absolute", left: 506, top: 40, width: 68, height: 68, borderRadius: 34, ...puffy("#F6C453"), fontSize: 26, lineHeight: "68px", textAlign: "center", color: "#7A4E2A", transform: `scale(${1 + 0.1 * beat})` }}>▶</div>
      </div>
      {/* the creator pops up on the card, then bounces on the beat; his shadow falls to the right like the letters' */}
      {t >= 0.3 ? (
        <>
          <div style={{ position: "absolute", left: CX + 70, top: CARD_Y - 6, width: CW - 40, height: 26, borderRadius: "50%", background: "rgba(120,80,50,0.32)", filter: "blur(8px)", transform: `scale(${(0.6 + 0.4 * boy) * (1 - beat * 0.1)})` }} />
          <div style={{ position: "absolute", left: CX, top: CY - beat * 10, width: CW, height: CH, transformOrigin: "50% 100%", transform: `scale(${boy * (1 + (beat - 0.5) * 0.015)}, ${boy * (1 - (beat - 0.5) * 0.015)}) rotate(${Math.sin(t * 2.2) * 1.2 * ramp(t, 0.7, 1)}deg)`, filter: "drop-shadow(10px 14px 16px rgba(120,80,50,0.22))" }}>
            <Img src={img("CLY-01")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
          </div>
        </>
      ) : null}
      <Grain t={t} amt={0.05} />
    </Frame>
  );
};
