// Toon3D: the film component. One ThreeCanvas per layer (two in a dissolve), each with its own world instance; the
// post chain render -> ink -> lens pre -> lens main -> [bloom + NEUTRAL tone + grade + grain] on a plain postprocessing
// composer driven by useFrame (the R3F <EffectComposer> drew an empty canvas with these versions); captions (Persian RTL
// by default) as a DOM layer on top.
//   makeFilm(spec) -> { Film, FilmLook, FRAMES, LOOK_FRAMES, lookMetadata }
//   props (Studio / --props) or CLI input props: {"times":[...]} (Look: frame i renders the film at times[i]);
//                {"post":{...}} toggles (composer, ink, lens, pre, bloom, grade, grain, captions);
//                {"qa":true} prints one "QA|frame|time|caption|shot|heads..." console line per frame (tools/qa.mjs);
//                {"qa":"only"} does the same without drawing (a fast QA pass: frames come out black)
//                {"plan":true} (Look comp, one frame): no 3D at all; prints one "PLAN|..." line per frame of the whole
//                film (shot, dissolve, camera, caption) + one "PLANCUES|{json}" line with spec.cues (tools/plan.mjs)
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../base/ink";
import { LensBlur, GrainEffect } from "../base/lensblur";
import { GradeEffect } from "../base/grade";
import type { Card } from "./timeline";
import type { V3 } from "./camera";
import { SAFE } from "./camera";
import { WIDTH, HEIGHT } from "./defaults";

export type DofDef = { cInf: number; focus?: V3; space?: string };
export type BaseDef = { dof?: DofDef };
/** a head the QA pass checks: its centre and radius in world units */
export type QAPoint = { label: string; p: THREE.Vector3; r: number };
export interface WorldLike<D> {
  root: THREE.Object3D;
  update(def: D, cam: THREE.PerspectiveCamera, scene: THREE.Scene, heightPx: number): THREE.Vector3;
  prerender(): void;
  toW(space: string | undefined, p: V3, out?: THREE.Vector3): THREE.Vector3;
  /** faces on screen this frame (for QA) */
  qaPoints?(): QAPoint[];
  /** solid geometry that can hide a face (ships, rooms, props), for QA */
  qaOccluders?(): THREE.Object3D[];
  /** camera problems this frame, e.g. "underwater", "in-ours-hull" (printed as cam:<flag>) */
  qaCamera?(cam: THREE.PerspectiveCamera): string[];
}
export type FilmSpec<D extends BaseDef, G> = {
  name: string;
  world: () => WorldLike<D>;
  frameDef: (id: number, f: number) => D;
  layersAt: (f: number) => { id: number; alpha: number }[];
  total: number;
  fps: number;
  /** the grade for a frame (GradeEffect parameters) */
  grade: (def: D) => G;
  gradeInit: G;
  cardAt?: (t: number) => Card | null;
  /** [family, file under public/] loaded before the first frame */
  fonts?: [string, string, FontFaceDescriptors?][];
  /** a film's own DOM layer over the picture (titles, labels), under the captions */
  overlay?: (t: number, f: number) => React.ReactNode;
  /** world outline look (base/ink.ts InkOptions; default near-black) */
  ink?: import("../base/ink").InkOptions;
  caption?: { font?: string; size?: number; top?: number; color?: string; outline?: string;
    /** text direction (default rtl, Persian); weight for variable fonts */
    dir?: "rtl" | "ltr"; weight?: number;
    /** a film's own caption look: replaces the default text node (positioning stays the kit's) */
    node?: (c: Card, t: number) => React.ReactNode };
  bg?: string;
  /** the story's named times and event lists (seconds, JSON-serialisable): the plan pass writes them to
   *  <slug>/plan/plan.json, so build-audio.cjs reads the picture's clock instead of copying its formulas */
  cues?: Record<string, unknown>;
};

export type PostToggles = { composer: boolean; ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean; captions: boolean };
/** what a Film / FilmLook composition reads from its props (the Studio, --props) or the CLI input props (pipeline tools) */
export type FilmProps = { times?: number[]; post?: Partial<PostToggles>; qa?: boolean | "only"; plan?: boolean };
const inProps = () => getInputProps() as FilmProps;
const optsOf = (p: FilmProps): FilmProps => ({ ...inProps(), ...p });
const toggles = (o: FilmProps): PostToggles => ({ composer: true, ink: true, lens: true, pre: true, bloom: true, grade: true, grain: true, captions: true, ...(o.post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((HEIGHT * w) / Math.max(h, 1)), HEIGHT);
  return b;
};
const outline = (c: string) => [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [-0.7, -0.7], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7]]
  .map(([x, y]) => `${(x * 6).toFixed(1)}px ${(y * 6).toFixed(1)}px 0 ${c}`).join(", ") + ", 0 9px 14px rgba(0,0,0,0.55)";

/** the caption font when a film names none (OFL, in public/fonts) */
const DEFAULT_FONTS: [string, string][] = [["Lalezar", "fonts/Lalezar-Regular.ttf"]];

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), ray = new THREE.Raycaster(), qfwd = new THREE.Vector3(), qd = new THREE.Vector3();

export function makeFilm<D extends BaseDef, G>(spec: FilmSpec<D, G>) {
  const WORLDS: Record<string, WorldLike<D>> = {};
  let fontsReady: Promise<void> | null = null;
  const loadFonts = () => (fontsReady ??= (async () => {
    for (const [name, file, desc] of spec.fonts ?? DEFAULT_FONTS) { const ff = new FontFace(name, `url(${staticFile(file)})`, desc); await ff.load(); document.fonts.add(ff); }
  })());
  const useFonts = () => {
    const [ok, setOk] = useState(false);
    const [h] = useState(() => delayRender(`${spec.name} fonts`));
    useEffect(() => { loadFonts().then(() => { setOk(true); continueRender(h); }); }, [h]);
    return ok;
  };
  const cap = { font: "Lalezar", size: 104, top: 1290, color: "#ffffff", outline: "#14181b", ...(spec.caption ?? {}) };
  const OUT = outline(cap.outline);

  /** QA: every head on screen -> one token label:state:visible%:x:y:size (x, y = centre as fractions of the frame,
   *  size = head height / frame height). States: ok, cut (partly out of frame), caption (under the caption while one
   *  shows), low / high (under Instagram's UI), hidden (solid geometry in front). Heads wholly out of frame are skipped.
   *  Camera problems from the world follow as cam:<flag>. tools/qa.mjs reads these lines. */
  const qaCheck = (world: WorldLike<D>, cam: THREE.PerspectiveCamera, frame: number, t: number, shot: number) => {
    const out: string[] = [];
    const card = spec.cardAt?.(t) ?? null, capOn = !!card;
    // the caption block: centred, ~4.8 % of the frame width per letter at 104 px (Lalezar), a little outline margin
    const capHalf = card ? Math.min(0.47, (0.024 * [...card.text.replace(/‌/g, "")].length + 0.012) * (cap.size / 104)) : 0;
    const occ = world.qaOccluders?.() ?? [];
    const tv = Math.tan((cam.fov * Math.PI) / 360);
    cam.getWorldDirection(qfwd);
    for (const q of world.qaPoints?.() ?? []) {
      const depth = qd.copy(q.p).sub(cam.position).dot(qfwd);
      if (depth <= cam.near) continue;
      const v = q.p.clone().project(cam), x = (v.x + 1) / 2, y = (1 - v.y) / 2;
      const rh = q.r / (depth * tv) / 2, rw = rh / cam.aspect; // head radius as fractions of frame height / width
      const ov = (c: number, r: number) => Math.max(0, Math.min(1, c + r) - Math.max(0, c - r)) / (2 * r);
      const vis = ov(x, rw) * ov(y, rh);
      if (vis <= 0) continue;
      const size = 2 * rh;
      let st = "ok";
      if (vis < 0.97) st = "cut";
      else if (capOn && size > 0.02 && y + rh > SAFE.captionTop && y - rh < SAFE.captionBottom && Math.abs(x - 0.5) < capHalf + rw) st = "caption";
      else if (y > SAFE.uiBottom) st = "low";
      else if (y < SAFE.uiTop) st = "high";
      else if (occ.length && size > 0.01) {
        ray.set(cam.position, qd.copy(q.p).sub(cam.position).normalize()); ray.far = q.p.distanceTo(cam.position) - q.r;
        if (ray.intersectObjects(occ, true).some((h) => h.object.visible)) st = "hidden";
      }
      out.push(`${q.label}:${st}:${Math.round(vis * 100)}:${x.toFixed(3)}:${y.toFixed(3)}:${size.toFixed(3)}`);
    }
    for (const c of world.qaCamera?.(cam) ?? []) out.push("cam:" + c);
    console.log(`QA|${frame}|${t.toFixed(3)}|${capOn ? 1 : 0}|${shot}|${out.join(" ")}`);
  };

  const Inner: React.FC<{ role: string; def: D; frame: number; t: number; qa: boolean; shot: number; o: FilmProps }> = ({ role, def, frame, t, qa, shot, o }) => {
    const { camera, scene, gl, size } = useThree();
    const world = useMemo(() => (WORLDS[role] ??= spec.world()), [role]);
    const on = useMemo(() => toggles(o), [o]);
    const fx = useMemo(() => ({
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera, spec.ink),
      lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
      bloom: makeBloom(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(spec.gradeInit as never, 1),
      grain: new GrainEffect({ amount: 0.022, cellPx: 1.5 }),
    }), [camera, scene]);
    useEffect(() => () => fx.ink.dispose(), [fx]);
    const composer = useMemo(() => {
      const pc = camera as THREE.PerspectiveCamera;
      const c = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
      c.addPass(new RenderPass(scene, pc));
      if (on.ink) c.addPass(fx.ink);
      if (on.lens && on.pre) c.addPass(new EffectPass(pc, fx.lens.pre));
      if (on.lens) c.addPass(new EffectPass(pc, fx.lens.main));
      const last = [on.bloom ? fx.bloom : null, fx.tone, on.grade ? fx.grade : null, on.grain ? fx.grain : null].filter(Boolean) as Effect[];
      c.addPass(new EffectPass(pc, ...last));
      return c;
    }, [gl, scene, camera, fx, on]);
    useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size.width, size.height]);
    useEffect(() => () => composer.dispose(), [composer]);
    // two worlds can be live in a dissolve and share the toon uniforms: re-apply this world's right before rendering
    // qa "only": a priority-1 subscriber that draws nothing also stops R3F's own render
    const blank = o.qa === "only";
    useFrame(() => { if (blank) return; if (on.composer) { world.prerender(); composer.render(); } }, on.composer || blank ? 1 : 0);
    const cam = camera as THREE.PerspectiveCamera;
    const target = world.update(def, cam, scene, size.height);
    noInkFallback(world.root);
    cam.getWorldDirection(fwd);
    const dof = def.dof ?? { cInf: 0 };
    if (dof.focus) world.toW(dof.space, dof.focus, fpt); else fpt.copy(target);
    fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    fx.lens.cInf = dof.cInf;
    (fx.grade as unknown as { set(g: G): void }).set(spec.grade(def));
    fx.grain.seed = frame;
    if (qa && role === "base") qaCheck(world, cam, frame, t, shot);
    return <primitive object={world.root} dispose={null} />;
  };

  const View: React.FC<{ role: string; def: D; frame: number; t: number; alpha: number; qa: boolean; shot: number; o: FilmProps }> = ({ role, def, frame, t, alpha, qa, shot, o }) => (
    <AbsoluteFill style={{ opacity: alpha }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.15, far: 2400 }}>
        <Inner role={role} def={def} frame={frame} t={t} qa={qa} shot={shot} o={o} />
      </ThreeCanvas>
    </AbsoluteFill>
  );

  const Caption: React.FC<{ t: number }> = ({ t }) => {
    const c = spec.cardAt?.(t);
    if (!c) return null;
    return (
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
        <div dir={cap.dir ?? "rtl"} style={{ position: "absolute", top: cap.top, width: 1000, left: 40, textAlign: "center", fontFamily: cap.font, fontSize: cap.size,
          fontWeight: cap.weight, lineHeight: 1.25, color: cap.color, textShadow: OUT }}>{cap.node ? cap.node(c, t) : c.text}</div>
      </AbsoluteFill>
    );
  };

  const Frame: React.FC<{ f: number; t: number; o: FilmProps }> = ({ f, t, o }) => {
    const on = useMemo(() => toggles(o), [o]);
    const qa = !!o.qa;
    const layers = spec.layersAt(f);
    return (
      <AbsoluteFill style={{ background: spec.bg ?? "#10181c" }}>
        {layers.map((l, i) => <View key={i ? "over" : "base"} role={i ? "over" : "base"} def={spec.frameDef(l.id, f)} frame={f} t={t} alpha={l.alpha} qa={qa} shot={l.id} o={o} />)}
        {spec.overlay?.(t, f)}
        {on.captions && <Caption t={t} />}
      </AbsoluteFill>
    );
  };

  const Film: React.FC<FilmProps> = (props) => {
    const f = useCurrentFrame();
    const ok = useFonts();
    const o = useMemo(() => optsOf(props), [props]);
    if (!ok) return null;
    return <Frame f={f} t={f / spec.fps} o={o} />;
  };
  /** frames of the Look composition when it is registered without calculateMetadata (CLI --props only) */
  const LOOK_FRAMES = Math.max(1, (inProps().times ?? [0]).length);
  /** calculateMetadata for the Look composition: one frame per entry of props.times */
  const lookMetadata = ({ props }: { props: FilmProps }) => ({ durationInFrames: Math.max(1, (props.times ?? inProps().times ?? [0]).length) });
  /** the plan pass: the camera of the shot on screen at every frame, read from the story alone (pure functions, no
   *  world is built). Line: PLAN|frame|shot|dissolveShot|dissolveAlpha|space|px py pz|lx ly lz|fov|roll|caption */
  const PlanDump: React.FC = () => {
    const [h] = useState(() => delayRender(`${spec.name} plan`));
    useEffect(() => {
      const r = (x: number) => Math.round(x * 10000) / 10000;
      for (let f = 0; f < spec.total; f++) {
        const L = spec.layersAt(f), cur = L.length > 1 && L[1].alpha >= 0.5 ? L[1] : L[0];
        const c = (spec.frameDef(cur.id, f) as unknown as { cam?: { space?: string; pos: V3; look: V3; fov: number; roll?: number } }).cam;
        const card = spec.cardAt?.(f / spec.fps);
        const cam = c ? `${c.space ?? ""}|${c.pos.map(r).join(" ")}|${c.look.map(r).join(" ")}|${r(c.fov)}|${r(c.roll ?? 0)}` : "||||0";
        console.log(`PLAN|${f}|${cur.id}|${L.length > 1 ? L[1].id : 0}|${L.length > 1 ? r(L[1].alpha) : 0}|${cam}|${card ? card.text.replace(/[|\n]/g, " ") : ""}`);
      }
      console.log(`PLANCUES|${JSON.stringify(spec.cues ?? {})}`);
      continueRender(h);
    }, [h]);
    return <AbsoluteFill style={{ background: "#000" }} />;
  };
  const FilmLook: React.FC<FilmProps> = (props) => {
    const o = useMemo(() => optsOf(props), [props]);
    return o.plan ? <PlanDump /> : <LookFrame o={o} />;
  };
  const LookFrame: React.FC<{ o: FilmProps }> = ({ o }) => {
    const i = useCurrentFrame();
    const ok = useFonts();
    const times = o.times ?? [0];
    if (!ok) return null;
    const t = times[Math.min(i, times.length - 1)], f = Math.round(t * spec.fps);
    return <Frame f={f} t={t} o={o} />;
  };
  return { Film, FilmLook, FRAMES: spec.total, LOOK_FRAMES, lookMetadata };
}
