// Sea world: sky dome (5 stops by elevation, tone-map inverted), cloud cards round the horizon (day / storm
// decks, the black storm front ahead), the Gerstner toon sea with the one big wave and the oil slick, our ship and the
// pirates' riding it, rain, the oil stream, the grappling hook and its rope, the big wave's curling lip, the galley
// set and the soup bowl, the 2D cast.
// update(def, cam, scene) poses everything for one frame from a plain FrameDef (story.ts builds those).
// Cameras and cards can live in a ship's space (on board the lens and the crew ride with the hull, so the horizon
// rolls; upFollow 0..1 = how much of the ship's roll the lens takes) or in the galley's space.
import * as THREE from "three";
import { cloudHD, ctex } from "../base/paint";
import { TONE, CHAR, untone } from "../base/shade";
import { NOINK } from "../base/ink";
import { Pool, Actor, Fx, SU } from "../base/cards";
import type { Place, FxPlace, CamInfo } from "../base/cards";
import { LIGHTS, LOOK, SLight, mixLight, mixLook, hexMix } from "./lights";
import { Sea, heightAt, BIG } from "./sea";
import { Ship, wAt, deckY, keelD, HULL } from "./ship";
import { Rain } from "./rain";
import { OilStream } from "./oil";
import { Hook, RopeTube, Lip, Galley, Bowl, GALLEY, fxOilSplash } from "./props";

export type { V3 } from "../kit/camera";
import type { V3, CamDef as KitCamDef } from "../kit/camera";
export type Space = "world" | "ours" | "pirate" | "galley";
/** big = how much of the big wave's height the hull takes (the pirates stay low so the curl can fall on them) */
export type ShipPose = { x: number; z: number; yaw: number; k?: number; heel?: number; pitch?: number; dip?: number; slick?: number; big?: number };
/** the kit's camera definition in this film's spaces (blend: a glide from one ship's frame into another's) */
export type CamDef = KitCamDef<Space>;
/** face: the head on the card [x, y, radius] (card units) and a name, for the kit's framing checks */
export type SPlace = Place & { space?: Space; face?: [number, number, number]; label?: string };
export type SFx = FxPlace & { space?: Space };
/** pour: the pouring card (index in places), its pot lip in canvas units, the outward direction (card's space);
 *  plane = ship-space z of the release plane outboard of the rail; edge = [z, y] of the rail cap's far top edge as seen
 *  from the lens (where the card's 2D fall hands over to the 3D stream) */
export type SStage = { places: SPlace[]; fx: SFx[]; pour?: { place: number; lip: [number, number]; out: V3; amt: number; plane?: number; edge?: [number, number]; splash?: boolean };
  ropes?: { place: number; pt: [number, number]; to: V3; space?: Space; sag?: number }[] };
export type StageCtx = CamInfo & { t: number; ships: Record<"ours" | "pirate", Ship>; toW: (space: Space | undefined, p: V3) => THREE.Vector3 };
export type BigDef = { zc: number; h: number; L: number; curl: number; xc?: number; hw?: number; taper?: number; steep?: number };
/** rz / ry: the curl's forward and vertical radii (default 0.36 h each) */
export type LipDef = { x0: number; x1: number; zc: number; h: number; base: number; curl: number; drop: number; rz?: number; ry?: number };
export type HookDef = { pos: V3; rot: V3; rope?: [V3, V3] | null; sag?: number; space?: Space; scale?: number };
export type FrameDef = {
  t: number; light: SLight; light2?: SLight; lightK?: number; state: number; cam: CamDef; sun: V3;
  set?: "sea" | "galley";
  ours: ShipPose; pirate?: ShipPose | null;
  rain?: number; wind?: V3; flash?: number; slick?: [number, number, number, number]; glow?: number; lines?: number;
  /** black storm clouds on the horizon ahead (day shots) 0..1; warm break in the clouds (the ending) 0..1 */
  front?: number; rays?: number;
  big?: BigDef | null; lip?: LipDef | null; hook?: HookDef | null;
  /** our wheel angle (rad), the galley lamp's swing (rad), how hard the cook blows on the bowl 0..1 */
  wheel?: number; lamp?: number; blow?: number;
  dof?: { cInf: number; focus?: V3; space?: Space };
  stage?: (c: StageCtx) => SStage;
};

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), UPW = new THREE.Vector3(0, 1, 0);
const glowTex = () => ctex("raysGlow", 512, 512, (g) => {
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, "rgba(255,226,150,0.95)"); gr.addColorStop(0.35, "rgba(255,206,120,0.45)"); gr.addColorStop(1, "rgba(255,190,110,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
});

export class SeaWorld {
  root = new THREE.Group();
  sea = new Sea();
  ships: Record<"ours" | "pirate", Ship>;
  galley: Galley; bowl: Bowl;
  private rain = new Rain();
  private oil: OilStream; private hook: Hook; private rope: RopeTube; private lip: Lip; private ropes: RopeTube[] = [];
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#cccccc", 30, 500);
  private clouds: { m: THREE.Mesh; deck: "day" | "storm" | "front" }[] = [];
  private glow: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private qa: { label: string; p: THREE.Vector3; r: number }[] = [];
  private lastDef: FrameDef | null = null;
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  /** the shared shading uniforms this world wants (re-applied right before its own render: two worlds may be live) */
  private glob = { lit: [1, 1, 1], shade: [0, 0, 0], lift: [0, 0, 0], lambert: 0.35, sideK: 0.84, term: 0.2, bounce: [0, 0, 0], sat: 1,
    charTint: [1, 1, 1], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [1, 1, 1] };

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() }, flash: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; uniform float flash; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c * (1.0 + flash), 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#ffffff", "#444444", 0.5);
    this.sun = new THREE.DirectionalLight("#ffffff", 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    // cloud decks: warm cumulus low all round (day), a heavy storm ring (storm), and the black front ahead (world -z)
    const addCloud = (deck: "day" | "storm" | "front", map: THREE.Texture, a: number, d: number, y: number, w: number) => {
      const mat = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.05, 1.05, 1.05), transparent: true, depthWrite: false, fog: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.position.set(Math.cos(a) * d, y, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); m.renderOrder = -0.9;
      this.clouds.push({ m, deck }); R.add(m);
    };
    const dayMaps = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), stormMaps = [4, 5, 6, 7].map((k) => cloudHD(k, LOOK.storm.cloud));
    for (let i = 0; i < 11; i++) addCloud("day", dayMaps[i % 4], (i / 11) * Math.PI * 2 + 0.4, 900 + (i % 3) * 70, 70 + (i % 4) * 34, 170 + (i % 4) * 45);
    for (let i = 0; i < 18; i++) addCloud("storm", stormMaps[i % 4], (i / 18) * Math.PI * 2 + 0.1, 760 + (i % 3) * 70, 50 + (i % 4) * 26, 300 + (i % 5) * 70);
    for (let i = 0; i < 9; i++) addCloud("front", stormMaps[(i + 1) % 4], -Math.PI / 2 + (i - 4) * 0.16, 860 - (i % 2) * 60, 40 + (i % 3) * 30, 380 + (i % 3) * 90);
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.glow.layers.set(NOINK); this.glow.renderOrder = -0.85; R.add(this.glow);
    R.add(this.sea.mesh);
    this.ships = { ours: new Ship("ours"), pirate: new Ship("pirate", 1.12) };
    R.add(this.ships.ours.root, this.ships.pirate.root);
    R.add(this.rain.mesh);
    this.oil = new OilStream(R);
    this.hook = new Hook(R);
    this.rope = new RopeTube(R, 40, 6, "#5a4430");
    this.lip = new Lip(R);
    this.galley = new Galley(R);
    this.bowl = new Bowl(R);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  toW = (space: Space | undefined, p: V3, out = new THREE.Vector3()) => {
    if (!space || space === "world") return out.set(...p);
    if (space === "galley") return out.set(...p).add(GALLEY.origin);
    return this.ships[space].toWorld(p, out);
  };
  private upOf(space: Space) { return space === "ours" || space === "pirate" ? this.ships[space].dirToWorld([0, 1, 0]) : UPW.clone(); }

  /** re-apply this world's shading uniforms (shared module objects) right before its render */
  prerender() {
    const g = this.glob;
    TONE.uLitCol.value.set(g.lit[0], g.lit[1], g.lit[2]); TONE.uShadeCol.value.set(g.shade[0], g.shade[1], g.shade[2]);
    TONE.uShadeLift.value.set(g.lift[0], g.lift[1], g.lift[2]); TONE.uLambert.value = g.lambert; TONE.uSideK.value = g.sideK;
    TONE.uTerm.value = g.term; TONE.uBounce.value.set(g.bounce[0], g.bounce[1], g.bounce[2]); TONE.uSat.value = g.sat;
    CHAR.uCharTint.value.set(g.charTint[0], g.charTint[1], g.charTint[2]); CHAR.uCharShade.value = g.charShade; CHAR.uGrad.value = g.charGrad;
    CHAR.uBodyGrad.value = g.bodyGrad; CHAR.uSideTint.value.set(g.sideTint[0], g.sideTint[1], g.sideTint[2]);
  }

  /** QA: faces on screen this frame, the solid things that can hide them, and camera problems */
  qaPoints() { return this.qa; }
  qaOccluders() { return [this.ships.ours.root, this.ships.pirate.root, this.galley.root, this.bowl.root].filter((o) => o.visible); }
  qaCamera(cam: THREE.PerspectiveCamera) {
    const d = this.lastDef, out: string[] = [];
    if (!d || d.set === "galley") return out;
    const p = cam.position, sl = d.slick ? 1 : 0;
    if (p.y < heightAt(p.x, p.z, d.t, d.state, sl, 1) + 0.25) out.push("underwater");
    for (const k of ["ours", "pirate"] as const) {
      const s = this.ships[k];
      if (!s.root.visible) continue;
      const q = p.clone().applyMatrix4(s.m.clone().invert()).divideScalar(s.scale);
      if (q.x > HULL.x0 && q.x < HULL.x1 && q.y > -keelD(q.x) && q.y < deckY(q.x) - 0.05 && Math.abs(q.z) < wAt(q.x, q.y)) out.push(`below-${k}-deck`);
    }
    return out;
  }
  update(def: FrameDef, cam: THREE.PerspectiveCamera, scene: THREE.Scene, heightPx = 1920) {
    const t = def.t, flash = def.flash ?? 0, k2 = def.light2 ? def.lightK ?? 0 : 0;
    const L = def.light2 ? mixLight(LIGHTS[def.light], LIGHTS[def.light2], k2) : LIGHTS[def.light];
    const K = def.light2 ? mixLook(LOOK[def.light], LOOK[def.light2], k2) : LOOK[def.light];
    const inGalley = def.set === "galley";
    // ---- the big wave + slick, then the ships ride the sea ----
    const bg = def.big;
    BIG.on = bg && bg.h > 0 ? 1 : 0;
    if (bg) Object.assign(BIG, { zc: bg.zc, h: bg.h, L: bg.L, curl: bg.curl, xc: bg.xc ?? 0, hw: bg.hw ?? 220, taper: bg.taper ?? 120, steep: bg.steep ?? 0 });
    BIG.slick = def.slick ?? [0, 0, 1, 0];
    const { ours, pirate } = this.ships;
    ours.root.visible = !inGalley;
    if (!inGalley) ours.ride(def.ours.x, def.ours.z, def.ours.yaw, t, def.state, def.ours);
    ours.wheel.rotation.x = def.wheel ?? 0;
    pirate.root.visible = !!def.pirate && !inGalley;
    if (def.pirate && !inGalley) pirate.ride(def.pirate.x, def.pirate.z, def.pirate.yaw, t, def.state, def.pirate);
    // ---- camera (optionally riding a ship / inside the galley) ----
    const c = def.cam, pos = this.toW(c.space, c.pos), look = this.toW(c.space, c.look, new THREE.Vector3());
    const up = new THREE.Vector3(0, 1, 0);
    if (c.up) up.set(...c.up).normalize();
    else if (c.space === "ours" || c.space === "pirate") up.lerp(this.upOf(c.space), c.upFollow ?? 0.7).normalize();
    if (c.blend && c.blend.k > 0) {
      const b = c.blend, k = Math.min(1, b.k);
      pos.lerp(this.toW(b.space, b.pos), k); look.lerp(this.toW(b.space, b.look), k);
      const u2 = new THREE.Vector3(0, 1, 0);
      if (b.space === "ours" || b.space === "pirate") u2.lerp(this.upOf(b.space), b.upFollow ?? 0.7).normalize();
      up.lerp(u2, k).normalize();
    }
    cam.position.copy(pos); cam.up.copy(up); cam.lookAt(look); if (c.roll) cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = inGalley ? 0.05 : 0.15; cam.far = 2400; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const dist = cam.position.distanceTo(look);
    // ---- light rig ----
    const sunDir = new THREE.Vector3(...def.sun).normalize();
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.1 + (inGalley ? 3 : 9), inGalley ? 4 : 12, 70);
    this.sun.position.copy(look).addScaledVector(sunDir, inGalley ? 40 : 260); this.sun.target.position.copy(look);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = inGalley ? 5 : 40; sc.far = inGalley ? 80 : 520; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    const fl = 1 + flash * 1.15, g = this.glob;
    g.lit = [L.lit[0] * fl, L.lit[1] * fl, L.lit[2] * fl]; g.shade = [L.shade[0] * (1 + flash * 1.6), L.shade[1] * (1 + flash * 1.6), L.shade[2] * (1 + flash * 1.6)];
    g.lift = [...L.lift]; g.lambert = L.lambert; g.sideK = L.sideK; g.term = L.term; g.bounce = [...K.bounce]; g.sat = K.sat;
    g.charTint = [L.charTint[0] * fl, L.charTint[1] * fl, L.charTint[2] * fl]; g.charShade = L.charShade; g.charGrad = L.charGrad; g.bodyGrad = L.bodyGrad;
    g.sideTint = [...L.sideTint];
    this.prerender();
    // ---- sky, fog, clouds, the rays' glow ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]); su.flash.value = flash * 0.75;
    this.sky.position.copy(cam.position);
    this.sky.visible = !inGalley;
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = inGalley ? null : this.fog; scene.background = inGalley ? new THREE.Color("#140d08") : null;
    const stormK = def.light === "day" ? (def.light2 === "storm" ? k2 : 0) : def.light2 === "day" ? 1 - k2 : 1;
    for (const cl of this.clouds) {
      const op = inGalley ? 0 : cl.deck === "day" ? 1 - stormK : cl.deck === "storm" ? stormK : Math.max(def.front ?? 0, stormK);
      cl.m.visible = op > 0.01;
      const mat = cl.m.material as THREE.MeshBasicMaterial;
      mat.opacity = op; mat.color.setScalar(1.05 * (1 + flash * 1.1) * (cl.deck === "front" && stormK < 0.5 ? 0.72 : 1));
      cl.m.lookAt(cam.position.x, cl.m.position.y, cam.position.z);
    }
    const rays = inGalley ? 0 : def.rays ?? 0;
    this.glow.visible = rays > 0.01;
    if (rays > 0.01) {
      this.glow.position.set(cam.position.x - 380, 120, cam.position.z - 760); this.glow.scale.setScalar(900);
      this.glow.lookAt(cam.position); (this.glow.material as THREE.MeshBasicMaterial).opacity = 0.55 * rays;
    }
    // ---- sea ----
    const hulls = [ours, pirate].filter((s) => s.root.visible).map((s) => {
      const pp = s === ours ? def.ours : def.pirate!;
      return { x: pp.x, z: pp.z, yaw: pp.yaw, hl: 11.6 * s.scale, hb: 3.6 * s.scale, foam: 0.9, wake: 0.7 };
    });
    this.sea.mesh.visible = !inGalley;
    if (!inGalley) this.sea.update({ t, state: def.state, look: K.sea, hor: hexMix(K.sky.c[0], K.sea.far, 0.55), fog: L.fog, fogNear: L.fogNear, fogFar: L.fogFar, sun: sunDir,
      cam: cam.position, slick: def.slick, glow: def.glow ?? 0, flash, lines: def.lines ?? 1, hulls });
    // ---- rain ----
    this.rain.update(t, inGalley ? 0 : def.rain ?? 0, cam, heightPx, def.wind ?? [5, -21, 1.5], def.light === "rays" ? "#e9e2c6" : "#cfe6e8");
    // ---- galley + bowl ----
    this.galley.root.visible = inGalley; this.bowl.root.visible = inGalley;
    this.galley.lamp.rotation.z = def.lamp ?? 0;
    this.bowl.update(t, def.blow ?? 0);
    // ---- the hook and its rope ----
    const hk = def.hook;
    this.hook.root.visible = !!hk && !inGalley;
    if (hk && !inGalley) {
      this.hook.root.position.copy(this.toW(hk.space, hk.pos)); this.hook.root.rotation.set(...hk.rot); this.hook.root.scale.setScalar(hk.scale ?? 1);
      this.hook.root.updateMatrixWorld(true);
      if (hk.rope) { const ring = this.hook.ring(); this.rope.set(this.toW(hk.space, hk.rope[0]), ring, hk.sag ?? 0.8, 0.036 * (hk.scale ?? 1)); } else this.rope.hide();
    } else this.rope.hide();
    // ---- the big wave's lip ----
    if (def.lip && !inGalley) this.lip.set({ ...def.lip, t, body: hexMix(K.sea.mid, K.sea.crest, 0.35), under: K.sea.trough, foam: K.sea.foam, fog: L.fog, fogNear: L.fogNear, fogFar: L.fogFar, sun: sunDir, flash });
    else this.lip.hide();
    // ---- cast ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const stg: SStage = def.stage ? def.stage({ pos: cam.position, right, sun: sunDir, t, ships: this.ships, toW: (s, p) => this.toW(s, p) }) : { places: [], fx: [] };
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    let pourActor: Actor | null = null, pourPlace: SPlace | null = null;
    const byPlace = new Map<number, Actor>();
    stg.places.forEach((p, pi) => {
      const sc2 = p.scale ?? 1, w = this.toW(p.space, [p.x, p.y, p.z], tmp);
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(w.x, w.y + 1.1 * sc2, w.z), 3.5))) return;
      const a = this.actor(ai++);
      const [cw, ch, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, cw, ch, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.copy(w);
      // on a ship: lean the card with the deck as the lens sees it
      let roll = p.roll ?? 0;
      if (p.space === "ours" || p.space === "pirate") {
        const su2 = this.upOf(p.space);
        const aP = UPW.clone().addScaledVector(fwd, -UPW.dot(fwd)), bP = su2.clone().addScaledVector(fwd, -su2.dot(fwd));
        roll += Math.atan2(aP.clone().cross(bP).dot(fwd.clone().negate()), aP.dot(bP));
      }
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - w.x, cam.position.z - w.z), roll);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a); byPlace.set(pi, a);
      if (stg.pour && stg.pour.place === pi) { pourActor = a; pourPlace = p; }
    });
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    // faces on screen (for the kit's QA pass)
    this.qa = []; this.lastDef = def;
    byPlace.forEach((a, pi) => {
      const p = stg.places[pi];
      if (!p.face) return;
      a.mesh.updateMatrixWorld(true);
      this.qa.push({ label: p.label ?? "face", p: new THREE.Vector3((p.face[0] - 300) * SU, (975 - p.face[1]) * SU, 0).applyMatrix4(a.mesh.matrixWorld), r: p.face[2] * SU * Math.abs(a.mesh.scale.y) });
    });
    // ---- the oil stream from the pouring card's pot lip ----
    const pa = pourActor as Actor | null, pp2 = pourPlace as SPlace | null;
    if (pa && pp2 && stg.pour) {
      pa.mesh.updateMatrixWorld(true);
      const [lx, ly] = stg.pour.lip;
      const lip = new THREE.Vector3((lx - 300) * SU, (975 - ly) * SU, 0).applyMatrix4(pa.mesh.matrixWorld);
      const down = new THREE.Vector3().setFromMatrixColumn(pa.mesh.matrixWorld, 1).normalize().negate();
      // The card draws the first stretch of the fall (straight down from the lip, behind the bulwark). The 3D stream takes
      // over exactly where the lens sees that 2D fall cross the rail cap's far (inboard) top edge: there the cap's own ink
      // line hides the seam. Its start sits on the release plane outboard of the rail, so it falls in front of the hull,
      // already moving at the speed of the stretch fallen on the card.
      const ship = pp2.space === "ours" || pp2.space === "pirate" ? this.ships[pp2.space] : null;
      const start = lip.clone();
      let fallen = 0;
      if (ship && stg.pour.plane !== undefined && stg.pour.edge) {
        const inv = ship.m.clone().invert(), s = ship.scale, [zi, yi] = stg.pour.edge, zp = stg.pour.plane;
        const C = cam.position.clone().applyMatrix4(inv).divideScalar(s), L0 = lip.clone().applyMatrix4(inv).divideScalar(s);
        const D = down.clone().transformDirection(inv);
        let sv = 0.15, ok = false;
        const Q = new THREE.Vector3();
        for (let it = 0; it < 8; it++) {
          Q.copy(L0).addScaledVector(D, sv);
          const ai2 = (zi - C.z) / (Q.z - C.z || 1e-6);
          if (!(ai2 > 0 && ai2 < 1)) { ok = false; break; }
          const qy = C.y + (yi - C.y) / ai2;
          sv = Math.max(0, (qy - L0.y) / (D.y || -1e-6));
          ok = true;
        }
        Q.copy(L0).addScaledVector(D, sv);
        const ap = (zp - C.z) / (Q.z - C.z || 1e-6);
        if (ok && ap > 0 && ap < 1) { start.copy(ship.toWorld(C.clone().lerp(Q, ap))); fallen = sv * s; }
      }
      const out = ship ? ship.dirToWorld(stg.pour.out) : new THREE.Vector3(...stg.pour.out).normalize();
      const vel = out.multiplyScalar(0.6).addScaledVector(down, Math.sqrt(2 * 9.81 * fallen));
      this.oil.set(start, vel, heightAt(start.x, start.z, t, def.state), t, 0.0238 * pa.mesh.scale.y, stg.pour.amt, sunDir, cam.position);
    } else this.oil.set(new THREE.Vector3(), new THREE.Vector3(), 0, t, 0, 0);
    // the splash where the stream meets the sea (an effect card at the stream end)
    if (pa && stg.pour?.splash && this.oil.mesh.visible) {
      const e = this.oil.end(), k = Math.round(((t * 2.1) % 1) * 12) / 12;
      // a size up and pushed a little off the hull (out of its waterline foam) so it reads
      const sp = pp2 && (pp2.space === "ours" || pp2.space === "pirate") ? this.ships[pp2.space] : null, od = sp ? sp.dirToWorld(stg.pour.out) : new THREE.Vector3();
      stg.fx.push({ key: "oilsplash|" + k, cw: 400, ch: 300, draw: (pp) => fxOilSplash(pp, k), x: e.x + od.x * 0.4, y: e.y + 0.7, z: e.z + od.z * 0.4, w: 1.8, h: 1.35, space: "world" });
    }
    // ropes from a card's hand to a fixed point (the swinging pirate)
    let ri = 0;
    for (const r of stg.ropes ?? []) {
      const a2 = byPlace.get(r.place);
      if (!a2) continue;
      a2.mesh.updateMatrixWorld(true);
      const from = new THREE.Vector3((r.pt[0] - 300) * SU, (975 - r.pt[1]) * SU, 0).applyMatrix4(a2.mesh.matrixWorld);
      while (this.ropes.length <= ri) this.ropes.push(new RopeTube(this.root, 30, 6, "#8a6a44"));
      this.ropes[ri++].set(from, this.toW(r.space, r.to), r.sag ?? 0.2, 0.03);
    }
    for (let i = ri; i < this.ropes.length; i++) this.ropes[i].hide();
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of stg.fx) {
      const w = this.toW(p.space, [p.x, p.y, p.z], tmp);
      if (!this.frustum.intersectsSphere(this.sph.set(w, Math.max(p.w, p.h)))) continue;
      const ef = this.fx(fi++);
      ef.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      ef.use(!!p.soft);
      ef.mesh.visible = true;
      ef.mesh.position.copy(w);
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { ef.mesh.quaternion.copy(cam.quaternion); ef.mesh.rotateZ(p.rot ?? 0); }
      ef.mesh.scale.set(p.w, p.h, 1);
      fused.push(ef);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const ef of fused) ef.bind();
    void tmp2;
    return look;
  }
}
