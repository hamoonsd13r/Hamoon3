// «Shahmaran» world: builds the five set modules (sets/*.ts), merges their shots, drives the camera, depth of
// field, fog and the post chain. Each set module owns its geometry, lights, animation and its shots' cameras.
import * as THREE from "three";
import { BlendFunction, BloomEffect, BrightnessContrastEffect, ChromaticAberrationEffect, DepthOfFieldEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { clamp } from "./lib";
import type { Board, Figure, Flame, Tex } from "./kit";
import { scaleTex } from "./tex";
import { V, isVisible, type Ctx, type SetMod } from "./sets/common";
import { buildWell } from "./sets/well";
import { buildHall } from "./sets/hall";
import { buildEye } from "./sets/eye";
import { buildPalace } from "./sets/palace";
import { buildStairs } from "./sets/stairs";

export const buildWorld = (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, W: number, H: number, T: Tex) => {
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.NoToneMapping;
  gl.setClearColor(0x000000, 1);
  scene.clear();
  camera.near = 0.03;
  camera.far = 3000;
  camera.aspect = W / H;
  const sets: Record<string, THREE.Group> = {};
  const ctx: Ctx = {
    gl, scene, camera, W, H, T,
    S: scaleTex(),
    sets,
    mk: (name, at = V(0, 0, 0)) => {
      const g = new THREE.Group();
      g.position.copy(at);
      g.name = name;
      scene.add(g);
      sets[name] = g;
      return g;
    },
    flames: [] as Flame[],
    figures: [] as Figure[],
    boards: [] as Board[],
  };
  // a set that throws (e.g. mid-edit) is skipped so the others still render
  const safe = (name: string, b: (c: Ctx) => SetMod): SetMod => {
    try {
      const m = b(ctx);
      return { ...m, update: (t, sh) => { try { m.update(t, sh); } catch (e) { console.error(name, "update failed", e); } } };
    } catch (e) {
      console.error(name, "build failed", e);
      return { shots: [], update: () => {} };
    }
  };
  const mods: SetMod[] = [safe("well", buildWell), safe("hall", buildHall), safe("eye", buildEye), safe("palace", buildPalace), safe("stairs", buildStairs)];
  const SH = mods.flatMap((m) => m.shots).sort((a, b) => a.a - b.a);

  // ---- post ----
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
  composer.addPass(new RenderPass(scene, camera));
  const dof = new DepthOfFieldEffect(camera, { worldFocusDistance: 10, worldFocusRange: 6, bokehScale: 3.0, resolutionScale: 0.5 });
  composer.addPass(new EffectPass(camera, dof));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.62, luminanceSmoothing: 0.25, intensity: 1.0, radius: 0.78 });
  const vig = new VignetteEffect({ offset: 0.28, darkness: 0.72 });
  composer.addPass(new EffectPass(camera, bloom, vig, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0006, 0.0004), radialModulation: true, modulationOffset: 0.25 });
  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  grain.blendMode.opacity.value = 0.16;
  // gentle global grade: deeper blacks, a touch more contrast (the reference sits darker than our sets)
  const grade = new BrightnessContrastEffect({ brightness: -0.025, contrast: 0.09 });
  composer.addPass(new EffectPass(camera, grade, ca, grain));
  composer.setSize(W, H);

  const update = (t: number) => {
    const sh = SH.find((s) => t >= s.a && t < s.b) ?? SH[SH.length - 1] ?? { a: 0, b: 1, set: [], cam: () => ({ p: V(0, 0, 5), l: V(0, 0, 0), fov: 40 }) };
    const k = clamp((t - sh.a) / (sh.b - sh.a));
    for (const [n, g] of Object.entries(sets)) g.visible = sh.set.includes(n);
    const c = sh.cam(k, t);
    camera.position.copy(c.p);
    camera.up.set(0, 1, 0);
    if (Math.abs(c.l.x - c.p.x) < 0.01 && Math.abs(c.l.z - c.p.z) < 0.01) camera.up.set(0, 0, -1);
    camera.lookAt(c.l);
    if (c.roll) camera.rotateZ(c.roll);
    camera.fov = c.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    dof.cocMaterial.worldFocusDistance = sh.focus ?? 10;
    dof.cocMaterial.worldFocusRange = sh.range ?? 8;
    dof.bokehScale = sh.bokeh ?? 3;
    scene.fog = sh.fog ?? null;
    for (const m of mods) m.update(t, sh);
    for (const f of ctx.flames) if (f.parent && isVisible(f.parent)) f.tick(t, camera);
    for (const fig of ctx.figures) if (isVisible(fig)) fig.face(camera);
    for (const b of ctx.boards) if (isVisible(b)) b.face(camera);
    bloom.intensity = 1.0 + mods.reduce((s, m) => s + (m.bloom?.(t) ?? 0), 0);
  };
  const render = () => composer.render();
  return { update, render };
};
