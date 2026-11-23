// Hollow Moon 3D · the renderer. Builds the world once, then draws any film second as a pure function of time:
// ocean spectrum → shadow map → mirror pass (moon and rings in the sea) → main pass (MSAA, HDR) → ambient occlusion →
// air (haze, the light of the core) → depth of field → bloom → grade, for one shot or two (dissolve).
import * as THREE from "three";
import { AIR_FRAG, MB_FRAG, RAYS_FRAG, airUniforms } from "./air";
import { setBrand } from "./brand";
import { camAt, shotsAt, type Cam, type FilmSpec, type Shot } from "./cam";
import { SUN_R, buildCore, type CoreRig } from "./core";
import { buildHall, type HallRig } from "./hall";
import { BREACH_L, CRUST, FPS, HALL, MOON, MOON_YAW, R, RING_NEAR, clamp, ease, sstep } from "./util";
import { CoreWorld } from "./logo";
import { Plates, buildBoulders, buildDebris, crustMaterial, liningMaterial, loadMoon, loadRocks, loadTex, type CrustTex, type Rock } from "./moon";
import { Ocean } from "./ocean";
import { AO_BLUR_FRAG, AO_FRAG, Bloom, DOF_FRAG, FINAL_FRAG, FS, MIX_FRAG, hdrTarget } from "./post";
import { RING, buildRing, type RingRig } from "./ring";
import { makeSky, type SkyU } from "./sky";
import { Storm } from "./storm";
import { loadFonts, makeInscription, makeWordmark } from "./text";

/** public/styles/hollow-moon-3d/assets.json (written by pipeline/fetch-assets.mjs and pipeline/bake.mts): the night sky
 *  that lights the world (env, 2k) and the one shown as the sky (bg: the 8k file for finals), and whether the moon is baked */
export type MoonAssets = { env: string; bg: string; ready?: boolean };
/** url: a file of the style's public folder → URL · font: a file of the kit's public/fonts → URL */
export type EngineOpts = { W: number; H: number; ss: number; url: (p: string) => string; font: (file: string) => string; film: FilmSpec; assets: MoonAssets; dbg?: string; log?: (s: string) => void };

/** where the light of the scene comes from: the bright part of the real cloud deck, up and behind the lens of shot A */
const KEY = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();

export class Engine {
  r: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 70000);
  mirror = new THREE.PerspectiveCamera();
  o: EngineOpts;
  IW: number;
  IH: number;
  /** internal pixels per pixel of a 1080p frame */
  rs: number;
  dbg: string;
  S = { uPx: { value: 1000 }, uTime: { value: 0 }, uPulse: { value: 1 }, uHallK: { value: new THREE.Vector4(0.5, 0.45, 0.6, 0.8) }, uKeyDir: { value: KEY.clone() }, uKeyCol: { value: new THREE.Vector3(0.8, 0.89, 1.0) }, uAmb: { value: new THREE.Vector3(0.03, 0.04, 0.06) },
    /** the lightning: direction towards it (far away) and its strength at this instant; its colour */
    uBolt: { value: new THREE.Vector4(0, 1, 0, 0) }, uBoltCol: { value: new THREE.Vector3(0.72, 0.8, 1.0) } };
  stats: Record<string, number | string> = {};
  moon = new THREE.Group();
  breachW = new THREE.Vector3();
  private sky!: { U: SkyU; mesh: THREE.Mesh; pmrem: THREE.Texture; ambient: THREE.Color };
  private ocean!: Ocean;
  private storm!: Storm;
  private bolt!: THREE.DirectionalLight;
  private plates!: Plates;
  private ring!: RingRig;
  private hall!: HallRig;
  private coreRig!: CoreRig;
  private coreWorld!: CoreWorld;
  private rays!: FS;
  private rtC!: THREE.WebGLRenderTarget;
  private rtD!: THREE.WebGLRenderTarget;
  private mb!: FS;
  private prevCam = new THREE.PerspectiveCamera();
  private ornament: THREE.Texture | null = null;
  private surge = 0;
  private debris!: { mesh: THREE.Object3D; update: (t: number) => void };
  private rocks: Rock[] = [];
  key!: THREE.DirectionalLight;
  private core!: THREE.PointLight;
  private rtScene!: THREE.WebGLRenderTarget;
  private rtRefl!: THREE.WebGLRenderTarget;
  private rtA!: THREE.WebGLRenderTarget;
  private rtB!: THREE.WebGLRenderTarget;
  private rtAO!: THREE.WebGLRenderTarget;
  private rtAO2!: THREE.WebGLRenderTarget;
  private rtShot!: THREE.WebGLRenderTarget[];
  private bloom!: Bloom;
  private ao!: FS;
  private aoBlur!: FS;
  private air!: FS;
  private dof!: FS;
  private final!: FS;
  private mix!: FS;
  private nearFar = { value: new THREE.Vector2() };

  private constructor(canvas: HTMLCanvasElement, o: EngineOpts) {
    this.o = o;
    this.dbg = o.dbg ?? "";
    this.IW = Math.round(o.W * o.ss);
    this.IH = Math.round(o.H * o.ss);
    this.rs = this.IW / 1920;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(o.W, o.H, false);
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    r.setClearColor(0x000000, 0);
    r.autoClear = true;
    this.r = r;
  }

  static async create(canvas: HTMLCanvasElement, o: EngineOpts) {
    const e = new Engine(canvas, o);
    await e.init();
    return e;
  }

  /** number from the debug string ("name=1.5"), for look development without a new bundle */
  P = (name: string, def: number) => {
    const m = new RegExp("(?:^|,)" + name + "=(-?[\\d.]+)").exec(this.dbg);
    return m ? Number(m[1]) : def;
  };
  has = (flag: string) => new RegExp("(?:^|,)" + flag + "(?:,|=|$)").test(this.dbg);

  private log(s: string) {
    (this.o.log ?? console.log)(`[hollow-moon] ${s}`);
  }

  private async init() {
    const { r, o, scene, S, P } = this;
    const t0 = performance.now();
    setBrand(o.film.brand);
    const aniso = Math.min(16, r.capabilities.getMaxAnisotropy());
    const tx = async (p: string, srgb = false, clampT = false) => { const ta = performance.now(); const t = await loadTex(o.url(p), { srgb, aniso, clampT }); if (performance.now() - ta > 1500) this.log(`  ${p} ${(performance.now() - ta).toFixed(0)} ms`); return t; };

    // ── sky and its light
    const ts = performance.now();
    this.sky = await makeSky(r, { bg: o.url(this.has("sky2k") ? o.assets.env : o.assets.bg), env: o.url(o.assets.env), shift: P("skyshift", 0.44), mean: P("skymean", 0.046), con: P("skycon", 1.7), envInt: 1 }, (s) => this.log(s));
    this.log(`sky ${(performance.now() - ts).toFixed(0)} ms`);
    scene.add(this.sky.mesh);
    scene.environment = this.sky.pmrem;
    scene.environmentIntensity = P("envint", 2.0);
    S.uAmb.value.set(this.sky.ambient.r, this.sky.ambient.g, this.sky.ambient.b);
    S.uKeyCol.value.set(0.8, 0.89, 1.0).multiplyScalar(P("keyint", 4.6));

    const M = new THREE.Vector3(...MOON);
    {
      // ── the storm: the lightning of the opening shot stands to the left of the moon, far behind it
      const cA = camAt(this.o.film.shots[0], this.o.film.cut.BOLT);
      this.storm = new Storm(this.sky.U, { t0: this.o.film.cut.BOLT, eye: cA.p, look: cA.t, res: new THREE.Vector2(this.IW, this.IH), az: P("boltaz", -13), elTop: P("boltel", 12.5), dist: P("boltdist", 5200), seed: 9100 + P("boltseed", 3), px: P("boltpx", 0.85) * this.rs, sheets: this.o.film.farFlashes });
      if (!this.has("nobolt")) scene.add(this.storm.mesh);
      // its light on the moon and the rings: from behind and to the left, with the moon's own shadow
      const bolt = new THREE.DirectionalLight(0xffffff, 0);
      bolt.color.setRGB(0.72, 0.8, 1.0);
      // (it stands for the whole lit deck on that side: from the left of the opening shot, above, and a little in front)
      const fw = new THREE.Vector3(cA.t[0] - cA.p[0], 0, cA.t[2] - cA.p[2]).normalize(), rt = new THREE.Vector3(-fw.z, 0, fw.x);
      const bd = rt.clone().multiplyScalar(-0.8).addScaledVector(fw, -0.45).add(new THREE.Vector3(0, 0.42, 0)).normalize();
      bolt.position.copy(M).addScaledVector(bd, 700);
      bolt.target.position.copy(M);
      bolt.castShadow = !this.has("noshadow");
      const bs = bolt.shadow;
      bs.mapSize.set(4096, 4096);
      bs.camera.left = -240; bs.camera.right = 240; bs.camera.top = 240; bs.camera.bottom = -240;
      bs.camera.near = 420; bs.camera.far = 980;
      bs.bias = -0.0006; bs.normalBias = 0.3; bs.radius = 2.5;
      bolt.layers.enable(1); bolt.target.layers.enable(1);
      scene.add(bolt, bolt.target);
      this.bolt = bolt;
    }
    {
      const key = new THREE.DirectionalLight(0xffffff, 1);
      key.color.setRGB(S.uKeyCol.value.x, S.uKeyCol.value.y, S.uKeyCol.value.z);
      key.position.copy(M).addScaledVector(KEY, 700);
      key.target.position.copy(M);
      key.castShadow = !this.has("noshadow");
      const s = key.shadow;
      s.mapSize.set(8192, 8192);
      s.camera.left = -230; s.camera.right = 230; s.camera.top = 230; s.camera.bottom = -230;
      s.camera.near = 420; s.camera.far = 980;
      s.bias = -0.00035; s.normalBias = 0.22; s.radius = 2.5;
      key.layers.enable(1); key.target.layers.enable(1);
      scene.add(key, key.target);
      this.key = key;
      const core = new THREE.PointLight(0xffffff, 1, 0, P("coredecay", 1.45));
      core.color.setRGB(1.0, 0.7, 0.34);
      core.intensity = P("coreint", 760);
      core.position.copy(M);
      core.layers.enable(1);
      core.castShadow = !this.has("nocoreshadow");
      core.shadow.mapSize.set(2048, 2048);
      core.shadow.camera.near = 6; core.shadow.camera.far = 280;
      core.shadow.bias = -0.004; core.shadow.normalBias = 0.05; core.shadow.radius = 2;
      scene.add(core);
      this.core = core;
    }

    // ── the moon
    const t1 = performance.now();
    const [md, nrm, alb, mesoN, mesoD, microN, microD, cliffD, cliffN] = await Promise.all([
      (async () => { const ta = performance.now(); const m = await loadMoon(o.url); this.log(`  crust.bin ${(performance.now() - ta).toFixed(0)} ms`); return m; })(), tx("moon/nrm.png", false, true), tx("moon/alb.jpg", true, true),
      tx("tex/moon_meteor_01_nor_gl.jpg"), tx("tex/moon_meteor_01_diff.jpg", true), tx("tex/moon_macro_01_nor_gl.jpg"), tx("tex/moon_macro_01_diff.jpg", true),
      tx("tex/dark_rock_02_diff.jpg", true), tx("tex/dark_rock_02_nor_gl.jpg"),
    ]);
    this.rocks = await loadRocks(o.url, aniso);
    for (const rk of this.rocks) rk.mat.envMapIntensity = P("rockenv", 1);
    this.log(`moon assets ${(performance.now() - t1).toFixed(0)} ms`);
    this.plates = new Plates(md, P);
    const T: CrustTex = { nrm, alb, mesoN, mesoD, microN, microD, cliffD, cliffN };
    const cm = crustMaterial(this.plates.tex, T, {});
    cm.uni.uGain.value = P("moongain", 1.0);
    cm.uni.uRelief.value.set(P("relief", 1.45), P("meso", 3.2), P("micro", 3.0));
    cm.uni.uTile.value.set(11, 1.7, P("walltile", 7));
    cm.uni.uWall.value.set(0.085 * P("wall", 1), 0.083 * P("wall", 1), 0.08 * P("wall", 1), P("wallglow", 0.6));
    const crust = new THREE.Mesh(md.geo, cm.mat);
    crust.customDepthMaterial = cm.depth;
    crust.customDistanceMaterial = cm.dist;
    crust.castShadow = true; crust.receiveShadow = true; crust.frustumCulled = false;
    crust.layers.enable(1);
    const Bl = new THREE.Vector3(...BREACH_L);
    const lining = new THREE.Mesh(new THREE.IcosahedronGeometry(R - CRUST - 0.25, 56), liningMaterial(Bl, md.breach.radius + P("breach", 0), { uTime: S.uTime, uPulse: S.uPulse }));
    lining.frustumCulled = false;
    lining.layers.enable(1);
    await loadFonts(o.font);
    const th = performance.now();
    S.uHallK.value.set(P("win", 0.65), P("winoff", 0.38), P("gilt", 0.72), P("bronze", 0.9));
    this.hall = buildHall({ breach: Bl, br: md.breach.radius + P("breach", 0), shared: { uTime: S.uTime, uPx: S.uPx, uHallK: S.uHallK, uPulse: S.uPulse } });
    const ornament = makeInscription(4096, 256, []);
    this.ornament = ornament;
    this.coreRig = buildCore(makeInscription(4096, 256, o.film.brand.inscription, 1), ornament, { uTime: S.uTime });
    this.coreRig.setDoor(Bl);
    ((this.coreRig.sun.material as THREE.ShaderMaterial).uniforms.uSun.value as THREE.Vector4).w = P("sun", 4.6);
    this.log(`hall ${(performance.now() - th).toFixed(0)} ms · ${this.hall.bays} bays · ${this.hall.lights} lamps`);
    this.debris = buildDebris(Bl, md.breach.radius + P("breach", 0), this.rocks, P("rocktone", 0.62));
    this.moon.add(crust, lining);
    if (!this.has("noboulders")) {
      const bo = buildBoulders(md, this.plates, this.rocks, Bl, md.breach.radius + P("breach", 0), P("rocktone", 0.62), P("boulders", 2600));
      this.moon.add(bo.group);
      this.log(`boulders: ${bo.placed} on the crust, ${bo.nShadow} cast shadows`);
    }
    if (!this.has("nodebris")) this.moon.add(this.debris.mesh);
    if (!this.has("nohall")) this.moon.add(this.hall.group);
    this.moon.add(this.coreRig.group);
    this.moon.position.copy(M);
    this.moon.rotation.y = MOON_YAW;
    this.moon.rotation.z = P("moontilt", 0.0);
    this.moon.updateMatrixWorld(true);
    scene.add(this.moon);
    this.breachW.copy(Bl).applyQuaternion(this.moon.quaternion).normalize();
    this.stats.plates = JSON.stringify(this.plates.stats);
    this.log(`moon: ${md.plates.length} plates ${JSON.stringify(this.plates.stats)}, breach faces ${this.breachW.toArray().map((v) => v.toFixed(2))}`);

    // ── the great ring: its name passes the nearest point in the middle of shot B
    {
      const [parm, pnor] = await Promise.all([tx("tex/blue_metal_plate_arm.jpg"), tx("tex/blue_metal_plate_nor_gl.jpg")]);
      const word = makeWordmark(2048);
      const per = (2 * Math.PI) / RING.N, tm = (this.o.film.cut.B + this.o.film.cut.C) / 2;
      let phase = RING_NEAR - 0.5 * per - RING.speed * tm;
      phase = ((phase % per) + per) % per;
      this.ring = buildRing(word, parm, pnor, { uTime: S.uTime }, P, { phase, inscr: this.ornament ?? undefined });
      this.ring.group.position.copy(M);
      if (!this.has("noring")) scene.add(this.ring.group);
    }

    // ── the sea
    // a gale: the wind sea runs to the right and a little towards the opening shot, a long swell crosses it
    this.ocean = new Ocean({ wind: [0.92, 0.38], speed: P("wind", 16), peak: P("peak", 120), height: P("waves", 4.6), chop: P("chop", 1.25), seed: 9107, swell: { dir: [0.3, 0.95], length: 310, height: P("swell", 2.2) } },
      this.sky.U, { uTime: S.uTime, uKeyDir: S.uKeyDir, uKeyCol: S.uKeyCol, uAmb: S.uAmb, uPx: S.uPx, uBolt: S.uBolt, uBoltCol: S.uBoltCol });
    scene.add(this.ocean.mesh);
    if (!this.has("nospray")) scene.add(this.ocean.spray);
    (this.ocean.spray.material as THREE.ShaderMaterial).uniforms.uSpray.value.set(P("spray", 1), P("spraysp", 9.5), 1, 0);
    this.ocean.mat.uniforms.uGlint.value.set(M.x + this.breachW.x * 55, M.y + this.breachW.y * 55, M.z + this.breachW.z * 55, P("glint", 1.7));
    (this.ocean.mat.uniforms.uFoam.value as THREE.Vector4).set(P("foamj", 0.76), P("foamw", 0.14), P("foamlife", 2.0), P("streak", 0));
    (this.ocean.mat.uniforms.uLite.value as THREE.Vector4).x = P("sealite", 0.2);
    (this.ocean.mat.uniforms.uTone.value as THREE.Vector4).set(P("seasat", 0.62), 0.96, 1.0, 1.0);
    (this.ocean.mat.uniforms.uSeaFog.value as THREE.Vector4).w = P("seafog", 0.0006);

    // ── targets and passes
    const { IW, IH } = this;
    const depth = new THREE.DepthTexture(IW, IH);
    depth.type = THREE.UnsignedIntType;
    depth.format = THREE.DepthFormat;
    depth.minFilter = depth.magFilter = THREE.NearestFilter;
    this.rtScene = hdrTarget(IW, IH, { depthBuffer: true, depthTexture: depth, samples: this.has("nomsaa") ? 0 : 4 });
    this.rtRefl = hdrTarget(Math.round(IW / 2), Math.round(IH / 2), { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.rtA = hdrTarget(IW, IH);
    this.rtB = hdrTarget(IW, IH);
    this.rtC = hdrTarget(IW, IH);
    this.rtD = hdrTarget(IW, IH);
    const aoOpt = { format: THREE.RGFormat } as const;
    this.rtAO = hdrTarget(IW, IH, aoOpt);
    this.rtAO2 = hdrTarget(IW, IH, aoOpt);
    this.rtShot = [0, 1].map(() => new THREE.WebGLRenderTarget(IW, IH, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }));
    this.bloom = new Bloom(IW, IH, 8);
    const nf = this.nearFar;
    nf.value.set(this.camera.near, this.camera.far);
    this.ao = new FS(AO_FRAG, { tDepth: { value: depth }, uNearFar: nf, uRes: { value: new THREE.Vector2(IW, IH) }, uTan: { value: new THREE.Vector2() }, uPx: { value: 1 }, uRadius: { value: new THREE.Vector2(0.8, 4.5) }, uIntensity: { value: 1.0 } });
    this.aoBlur = new FS(AO_BLUR_FRAG, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } });
    const au = airUniforms(depth, nf);
    au.tColor.value = this.rtScene.texture;
    au.tAO.value = this.rtAO.texture;
    au.uMoonC.value.copy(M);
    au.uBreachW.value.copy(this.breachW);
    au.uRad.value.set(R, HALL);
    au.uCone.value.set(Math.cos(0.55), Math.cos(1.08), P("cone", 16), P("hallair", 0.22));
    this.air = new FS(AIR_FRAG, au as unknown as Record<string, THREE.IUniform>);
    this.rays = new FS(RAYS_FRAG, { tColor: { value: null }, tBright: { value: null }, uLight: { value: new THREE.Vector2(0.5, 0.5) }, uRay: { value: new THREE.Vector4(0, 0.96, 0.9, 0) } });
    this.mb = new FS(MB_FRAG, { tColor: { value: null }, tDepth: { value: depth }, uInvVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2(IW, IH) }, uMB: { value: new THREE.Vector2(1, 34) } });
    this.dof = new FS(DOF_FRAG, { tDepth: { value: depth }, uNearFar: nf, tColor: { value: this.rtA.texture }, uRes: { value: new THREE.Vector2(IW, IH) }, uFocus: { value: new THREE.Vector3(200, 0, 20) } });
    this.final = new FS(FINAL_FRAG, {
      tColor: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2(IW, IH) },
      uExposure: { value: 1 }, uBloom: { value: 0.2 }, uSat: { value: 0.9 }, uContrast: { value: 1.1 }, uVig: { value: 0.5 }, uGrain: { value: 0.012 }, uTime: S.uTime,
      uShadowTint: { value: new THREE.Vector3(-0.002, 0.0, 0.006) }, uHighTint: { value: new THREE.Vector3(0.008, 0.0, -0.01) }, uBlack: { value: 0.003 }, uCool: { value: new THREE.Vector3(0.93, 0.975, 1.06) },
    });
    this.mix = new FS(MIX_FRAG, { tA: { value: this.rtShot[0].texture }, tB: { value: this.rtShot[1].texture }, uMix: { value: 0 }, uFade: { value: 1 }, uOut: { value: new THREE.Vector2(o.W, o.H) }, uSharp: { value: P("sharp", o.W > 2500 ? 0.28 : 0.4) }, uWhite: { value: 0 } });
    this.coreWorld = new CoreWorld({ uPx: S.uPx, inscr: makeInscription(4096, 256, o.film.brand.inscription, 0) });
    this.coreWorld.bake(r);
    if (!this.has("nohall")) {
      const te = performance.now();
      this.plates.update(0);
      this.ring.update(0);
      this.coreRig.update(0, 0);
      const crt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false });
      const cc = new THREE.CubeCamera(2, 400, crt);
      cc.position.copy(M).add(new THREE.Vector3(26, 9, -21).applyQuaternion(this.moon.quaternion));
      this.ocean.mesh.visible = false; this.ocean.spray.visible = false;
      r.shadowMap.needsUpdate = true;
      cc.update(r, scene);
      this.ocean.mesh.visible = true; this.ocean.spray.visible = true;
      const pm = new THREE.PMREMGenerator(r);
      const envIn = pm.fromCubemap(crt.texture).texture;
      pm.dispose();
      const k = P("envin", 0.3);
      this.hall.setEnv(envIn, k);
      for (const m of this.coreRig.mats) { m.envMap = envIn; m.envMapIntensity = k; m.needsUpdate = true; }
      r.setRenderTarget(null);
      this.log(`interior light probe ${(performance.now() - te).toFixed(0)} ms`);
    }
    this.stats.initMs = Math.round(performance.now() - t0);
    this.log(`ready in ${this.stats.initMs} ms`);
  }

  private setCam(c: Cam, target: THREE.PerspectiveCamera) {
    target.fov = c.fov;
    target.aspect = this.o.W / this.o.H;
    target.near = this.camera.near;
    target.far = this.camera.far;
    target.position.set(...c.p);
    target.up.set(0, 1, 0);
    target.lookAt(c.t[0], c.t[1], c.t[2]);
    if (c.roll) target.rotateZ(c.roll);
    target.updateProjectionMatrix();
    target.updateMatrixWorld(true);
  }

  /** virtual camera below the water plane (y = 0), oblique near plane on the surface (after three's Reflector) */
  private renderMirror() {
    const { r, camera, mirror } = this;
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const normal = new THREE.Vector3(0, 1, 0);
    const view = new THREE.Vector3(0, 0, 0).sub(camPos).reflect(normal).negate();
    const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(camPos);
    const target = new THREE.Vector3(0, 0, 0).sub(look).reflect(normal).negate();
    mirror.position.copy(view);
    mirror.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal);
    mirror.lookAt(target);
    mirror.near = camera.near; mirror.far = camera.far; mirror.fov = camera.fov; mirror.aspect = camera.aspect;
    mirror.updateMatrixWorld(true);
    mirror.projectionMatrix.copy(camera.projectionMatrix);
    mirror.projectionMatrixInverse.copy(mirror.projectionMatrix).invert();
    const tm = this.ocean.mat.uniforms.uTexMat.value as THREE.Matrix4;
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(0, 0.02, 0)).applyMatrix4(mirror.matrixWorldInverse);
    const clip = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = mirror.projectionMatrix, q = new THREE.Vector4();
    q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1;
    q.w = (1 + pm.elements[10]) / pm.elements[14];
    clip.multiplyScalar(2 / clip.dot(q));
    pm.elements[2] = clip.x; pm.elements[6] = clip.y; pm.elements[10] = clip.z + 1; pm.elements[14] = clip.w;
    mirror.projectionMatrixInverse.copy(pm).invert();
    mirror.layers.set(1);
    r.setRenderTarget(this.rtRefl);
    r.clear();
    r.render(this.scene, mirror);
    this.ocean.mat.uniforms.tRefl.value = this.rtRefl.texture;
  }

  private renderShot(c: Cam, shot: Shot | null, t: number, slot: number, core = false, prev?: Cam) {
    const { r, camera, IW, IH, P } = this;
    this.setCam(c, camera);
    const tanY = Math.tan((camera.fov * Math.PI) / 360), tanX = tanY * camera.aspect;
    const px = IH / (2 * tanY);
    this.S.uPx.value = px;
    const M = this.moon.position;
    const sea = shot ? shot.sea : camera.position.distanceTo(M) > R + 2;
    // how far inside the hall the lens is: 0 outside the moon, 1 well within
    const ins = core ? 0 : 1 - sstep(HALL - 12, R + 14, camera.position.distanceTo(M));
    // how near the lens is to the sun: from close its surface shows instead of a white ball
    (this.coreRig.sun.material as THREE.ShaderMaterial).uniforms.uNear.value = core || this.has("nonear") ? 0 : 1 - sstep(P("near0", 6), P("near1", 38), camera.position.distanceTo(M) - SUN_R);
    // the open moon lights the clouds around it, as seen from here
    const gd = new THREE.Vector3(M.x + this.breachW.x * 45, M.y + this.breachW.y * 45, M.z + this.breachW.z * 45).sub(camera.position).normalize();
    this.sky.U.uGlowDir.value.copy(gd);
    {
      const d1 = this.storm.top.clone().sub(camera.position).normalize(), d2 = this.storm.mid.clone().sub(camera.position).normalize();
      const fw = this.sky.U.uFlash.value;
      fw.set(d1.x, d1.y, d1.z, fw.w);
      this.S.uBolt.value.set(d2.x, d2.y, d2.z, this.S.uBolt.value.w);
    }
    this.ocean.mesh.visible = sea && !core && !this.has("nosea");
    this.ocean.spray.visible = this.ocean.mesh.visible;
    if (this.ocean.mesh.visible) {
      (this.ocean.mat.uniforms.uOrigin.value as THREE.Vector2).set(camera.position.x, camera.position.z);
      this.renderMirror();
    }
    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(core ? this.coreWorld.scene : this.scene, camera);

    // ambient occlusion
    const noao = this.has("noao") || core;
    if (!noao) {
      this.ao.u.uTan.value.set(tanX, tanY);
      this.ao.u.uPx.value = px;
      this.ao.render(r, this.rtAO);
      this.aoBlur.u.tAO.value = this.rtAO.texture;
      this.aoBlur.u.uDir.value.set((this.rs * 0.5) / IW, 0);
      this.aoBlur.render(r, this.rtAO2);
      this.aoBlur.u.tAO.value = this.rtAO2.texture;
      this.aoBlur.u.uDir.value.set(0, (this.rs * 0.5) / IH);
      this.aoBlur.render(r, this.rtAO);
    }
    // air
    const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.air.u.uInvVP.value.copy(vp).invert();
    this.air.u.uCam.value.copy(camera.position);
    this.air.u.uAO.value = noao ? 0 : P("ao", 0.7);
    this.air.u.uShut.value = core ? 1 : 0;
    (this.air.u.uCone.value as THREE.Vector4).z = P("cone", 16) * (shot?.cone !== undefined ? P("conec", shot.cone) : 1);
    (this.air.u.uFog.value as THREE.Vector3).x = core ? 0 : 0.0009 * (1 - ins);
    if (this.has("noair")) { (this.air.u.uCone.value as THREE.Vector4).z = 0; (this.air.u.uCone.value as THREE.Vector4).w = 0; (this.air.u.uFog.value as THREE.Vector3).x = 0; }
    this.air.render(r, this.rtA);
    // depth of field
    let hdr = this.rtA;
    const kb = (c.aper ?? 0) * this.rs, focus = P("focus", 0) || (c.focus ?? 200), maxB = P("maxblur", 26) * this.rs;
    if (!this.has("nodof") && kb / focus > 0.2 * this.rs) {
      (this.dof.u.uFocus.value as THREE.Vector3).set(focus, kb / focus, maxB);
      this.dof.render(r, this.rtB);
      hdr = this.rtB;
    }
    // motion blur of the camera (shutter: half the frame)
    if (prev && !this.has("nomb")) {
      this.setCam(prev, this.prevCam);
      this.mb.u.tColor.value = hdr.texture;
      this.mb.u.uInvVP.value.copy(vp).invert();
      this.mb.u.uPrevVP.value.multiplyMatrices(this.prevCam.projectionMatrix, this.prevCam.matrixWorldInverse);
      (this.mb.u.uMB.value as THREE.Vector2).set(P("mb", 1), P("mbmax", 34) * this.rs);
      this.mb.render(r, this.rtD);
      hdr = this.rtD;
    }
    const bl = this.bloom.render(r, hdr.texture, IW, IH);
    // shafts from the core, when it is in front of the lens
    {
      const lp = (core ? this.coreWorld.starPos.clone() : M.clone()).project(camera);
      const on = lp.z < 1 && Math.abs(lp.x) < 1.6 && Math.abs(lp.y) < 1.6 ? 1 : 0;
      const k = core ? P("raysc", 0) :THREE.MathUtils.lerp(P("raysout", 0.06), P("rays", 0.12), ins);
      if (on && k > 0 && !this.has("norays")) {
        this.rays.u.tColor.value = hdr.texture;
        this.rays.u.tBright.value = this.bloom.mips[1].texture;
        (this.rays.u.uLight.value as THREE.Vector2).set(lp.x * 0.5 + 0.5, lp.y * 0.5 + 0.5);
        (this.rays.u.uRay.value as THREE.Vector4).set(k, 0.965, 0.85, 0);
        const dst = hdr === this.rtC ? this.rtB : this.rtC;
        this.rays.render(r, dst);
        hdr = dst;
      }
    }
    this.final.u.tColor.value = hdr.texture;
    this.final.u.tBloom.value = bl;
    this.final.u.uBloom.value = this.has("nobloom") ? 0 : core ? P("bloomc", 0.09) : THREE.MathUtils.lerp(P("bloom", 0.16), P("bloomin", 0.065), ins) * (1 + 0.6 * this.surge);
    this.final.u.uExposure.value = P("expo", 1.0) * (c.exp ?? 1);
    this.final.u.uContrast.value = P("contrast", 1.12);
    this.final.u.uSat.value = P("sat", 0.9);
    this.final.u.uVig.value = core ? P("vigc", 0.75) : P("vig", 0.5);
    this.final.render(r, this.rtShot[slot]);
  }

  /** draw film second t (or a free camera for look development) */
  frame(t: number, free?: Cam) {
    const { r, S } = this;
    S.uTime.value = t;
    this.plates.update(t);
    this.debris.update(t);
    this.ring.update(t);
    this.coreRig.update(t, sstep(this.o.film.cut.F - 2.7, this.o.film.cut.F - 0.9, t));
    this.ocean.update(t);
    r.shadowMap.needsUpdate = true;
    {
      const st = this.storm.update(t, this.P("boltk", 1));
      this.bolt.intensity = st.light * this.P("boltlight", 7);
      S.uBolt.value.w = st.light * this.P("boltsea", 1);
      this.sky.U.uFlash.value.w = st.cloud * this.P("boltsky", 1);
      this.sky.U.uFlashB.value.set(st.sheetDir.x, st.sheetDir.y, st.sheetDir.z, st.sheet * this.P("sheet", 1));
    }
    // the drop: in the gap of the music the hall dims (it holds its breath), on the hit its lights surge and settle
    {
      const g0 = this.o.film.cut.DROP - 0.56, g1 = this.o.film.cut.DROP - 0.04;
      const dip = sstep(g0, g0 + 0.14, t) * (1 - sstep(g1 - 0.06, g1 + 0.04, t));
      this.surge = t >= this.o.film.cut.DROP ? Math.exp(-(t - this.o.film.cut.DROP) / 0.38) : 0;
      const k = this.has("nopulse") ? 1 : (1 - 0.55 * dip) * (1 + 0.9 * this.surge);
      S.uPulse.value = k;
      this.core.intensity = this.P("coreint", 760) * (this.has("nopulse") ? 1 : (1 - 0.35 * dip) * (1 + 0.5 * this.surge));
    }
    let mixW = 0, fade = 1;
    const SH = this.P("shutter", 0.5) / FPS;
    let white = 0;
    if (free) {
      this.renderShot(free, null, t, 0);
    } else if (t >= this.o.film.cut.F) {
      const s = t - this.o.film.cut.F;
      this.coreWorld.update(s, this.o.film.logoT);
      this.renderShot(this.coreWorld.cam(s, this.o.film.dur - this.o.film.cut.F), null, t, 0, true, this.coreWorld.cam(Math.max(s - SH, 0), this.o.film.dur - this.o.film.cut.F));
      white = 1 - ease.out(clamp(s / 0.42));
      fade = this.o.film.fadeAt(t);
    } else {
      const live = shotsAt(this.o.film.shots, t);
      live.forEach((s, i) => this.renderShot(s.cam, s.shot, t, i, false, camAt(s.shot, t - SH)));
      mixW = live.length > 1 ? live[1].w : 0;
      fade = this.o.film.fadeAt(t);
      white = ease.in(clamp((t - (this.o.film.cut.F - 0.42)) / 0.42));
    }
    this.mix.u.uMix.value = mixW;
    this.mix.u.uFade.value = fade;
    this.mix.u.uWhite.value = white;
    this.mix.render(r, null);
    this.stats.calls = r.info.render.calls;
    this.stats.tris = r.info.render.triangles;
    this.stats.oceanMs = Math.round(this.ocean.ms);
  }
}
void clamp;
