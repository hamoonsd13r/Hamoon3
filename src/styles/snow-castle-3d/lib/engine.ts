// Snow Castle 3D · the renderer. Builds the world once, then draws any film second as a pure function of time:
// mirror pass for the lake → main pass (MSAA, HDR) → ambient occlusion → atmosphere → snow / smoke / halos →
// depth of field → bloom → grade, for one shot or two (dissolve), supersampled down to the canvas.
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { camPath, sampleShot, shotsAt, type Cam, type FilmSpec } from "./cam";
import { Registry, buildCastle, type Lamp } from "./castle";
import { NL, makeBirds, makeFlags, makeFlames, makeFxShared, makeGlows, makeSmoke, makeSnow } from "./fx";
import { Builder } from "./geo";
import { THEME, type Theme } from "./theme";
import { clamp, rng, sstep } from "./util";
import { archMaterial, deckSnowMaterial, lampMaterial, loadSet, makeNoise3D, makeShared, makeWaterNormal, skyMaterial, terrainMaterial, waterMaterial, windowMaterial } from "./mats";
import { addBareTree, bareTreeSpots, buildRocks } from "./nature";
import { AO_BLUR_FRAG, AO_FRAG, Bloom, DOF_FRAG, FINAL_FRAG, FOG_FRAG, FS, MIX_FRAG, NFL, hdrTarget } from "./post";
import { L0, Y0, buildTerrain, heightAt, scatterTrees } from "./terrain";
import { buildForest } from "./trees";

/** public/styles/snow-castle-3d/assets.json (written by pipeline/fetch-assets.mjs): the sky photograph that lights the
 *  world (env) and the one shown as the sky (bg: the 8k file for finals, else the same 2k file), the texture size on disk */
export type SnowAssets = { env: string; bg: string; tex?: string };
export type EngineOpts = { W: number; H: number; ss: number; url: (p: string) => string; film: FilmSpec; assets: SnowAssets; theme?: Partial<Theme>; dbg?: string; log?: (s: string) => void };

/** overcast winter afternoon. The panorama is turned so its most dramatic clouds stand behind the castle
 *  as seen from the ravine (looking north-west). Azimuths are atan2(z, x). */
const SKY = {
  uBehind: 0.16, viewAz: -2.356,
  mean: 0.5,
  /** how the photograph is shown: exposure on top of the lighting level, contrast pivot and power */
  exp: 1.03, con: [0.5, 2.6] as [number, number],
  /** grade window behind the castle: gain at its centre */
  win: 0.75,
  /** soft key: the brighter part of the cloud deck, up and to the left of the lens */
  keyAz: 2.55, keyEl: 0.84, keyInt: 1.1,
  envInt: 1.85,
};


export class Engine {
  r: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  fx = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 16 / 9, 1, 60000);
  mirror = new THREE.PerspectiveCamera();
  U = makeShared();
  F = makeFxShared();
  o: EngineOpts;
  /** the look tokens (theme.ts) with the film's overrides */
  th: Theme;
  IW: number;
  IH: number;
  /** internal pixels per pixel of a 1080p frame: 2 for 1080p at ss 2 and for 4K at ss 1, 3 for 4K at ss 1.5 */
  rs: number;
  reg = new Registry();
  dbg: string;
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
  private fog!: FS;
  private dof!: FS;
  private final!: FS;
  private mix!: FS;
  private sky!: THREE.Mesh;
  private skyMat!: THREE.ShaderMaterial;
  private water!: THREE.Mesh;
  private waterMat!: THREE.ShaderMaterial;
  private moon!: THREE.DirectionalLight;
  private pls: { light: THREE.PointLight; lamp: Lamp; base: number }[] = [];
  private snows: THREE.Mesh[] = [];
  private birds: THREE.Mesh | null = null;
  private skyShift = 0;
  private base = { amb: new THREE.Color(), zen: new THREE.Color(), hor: new THREE.Color(), moon: new THREE.Color(), fog: new THREE.Color() };
  stats: Record<string, number | string> = {};

  private constructor(canvas: HTMLCanvasElement, o: EngineOpts) {
    this.o = o;
    this.dbg = o.dbg ?? "";
    this.th = { ...THEME, ...(o.theme ?? {}) };
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
    r.autoClear = true;
    this.r = r;
  }

  static async create(canvas: HTMLCanvasElement, o: EngineOpts) {
    const e = new Engine(canvas, o);
    await e.init();
    return e;
  }

  /** number from the debug string ("name=1.5"), for look development without a new bundle */
  private P(name: string, def: number) {
    const m = new RegExp("(?:^|,)" + name + "=(-?[\\d.]+)").exec(this.dbg);
    return m ? Number(m[1]) : def;
  }

  private log(s: string) {
    (this.o.log ?? console.log)(`[snow-castle] ${s}`);
  }

  private async init() {
    const { r, o, U, F, scene } = this;
    const t0 = performance.now();
    const aniso = Math.min(16, r.capabilities.getMaxAnisotropy());
    const tex = (id: string, T: number) => loadSet((m) => o.url(`tex/${id}_${m}.jpg`), T, aniso);
    const hdr = new HDRLoader();
    const [stoneT, stone2T, roofT, rockT, woodT, barkT, snowN, envSrc, bgTex] = await Promise.all([
      tex("castle_wall_slates", 2.5), tex("stone_brick_wall_001", 2.5), tex("roof_slates_03", 3), tex("dark_rock_02", 1), tex("weathered_planks", 2), tex("pine_bark", 1.2),
      new THREE.TextureLoader().loadAsync(o.url("tex/snow_02_nor_gl.jpg")),
      new HDRLoader().setDataType(THREE.FloatType).loadAsync(o.url(o.assets.env)),
      hdr.loadAsync(o.url(this.dbg.includes("sky2k") ? o.assets.env : o.assets.bg)),
    ]);
    snowN.wrapS = snowN.wrapT = THREE.RepeatWrapping;
    snowN.anisotropy = aniso;
    this.log(`assets ${(performance.now() - t0).toFixed(0)} ms`);

    // ── sky: set the level, turn the panorama, build the image-based lighting from it
    SKY.exp = this.P("skyexp", SKY.exp); SKY.con[1] = this.P("skycon", SKY.con[1]); SKY.uBehind = this.P("ubehind", SKY.uBehind);
    SKY.win = this.P("skywin", SKY.win); SKY.envInt = this.P("envint", SKY.envInt); SKY.keyInt = this.P("keyint", SKY.keyInt);
    {
      const img = envSrc.image as { data: Float32Array; width: number; height: number };
      const w = img.width, h = img.height, d = img.data;
      let sw = 0;
      const mean = [0, 0, 0], zen = [0, 0, 0, 0], hor = [0, 0, 0, 0];
      const bs = 8;
      for (let y = 0; y < h / 2; y += bs) {
        const el = (0.5 - (y + bs / 2) / h) * Math.PI, wt = Math.cos(el);
        for (let x = 0; x < w; x += bs) {
          const i = ((y + bs / 2) * w + x + bs / 2) * 4;
          const cr = d[i], cg = d[i + 1], cb = d[i + 2];
          mean[0] += cr * wt; mean[1] += cg * wt; mean[2] += cb * wt; sw += wt;
          if (el > 1.0) { zen[0] += cr; zen[1] += cg; zen[2] += cb; zen[3]++; }
          if (el > 0.04 && el < 0.3) { hor[0] += cr; hor[1] += cg; hor[2] += cb; hor[3]++; }
        }
      }
      for (let k = 0; k < 3; k++) mean[k] /= sw;
      const mLum = 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2];
      const k = SKY.mean / mLum;
      const shiftU = SKY.viewAz / (Math.PI * 2) + 0.5 - SKY.uBehind;
      const shift = ((Math.round(shiftU * w) % w) + w) % w;
      const out = new Uint16Array(w * h * 4);
      const cap = SKY.mean * 12;
      // cool the light a little: the reference is a blue-grey winter day
      const tint = [0.94, 1.0, 1.08];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, j = (y * w + ((x + shift) % w)) * 4;
        let rr = d[i] * k * tint[0], gg = d[i + 1] * k * tint[1], bb = d[i + 2] * k * tint[2];
        const l = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
        if (l > cap) { const q = cap / l; rr *= q; gg *= q; bb *= q; }
        if (y > h / 2) {
          const kb = Math.min(1, (y - h / 2) / (h * 0.03)), bn = this.P("bounce", 0.62);
          rr += (mean[0] * k * tint[0] * bn - rr) * kb; gg += (mean[1] * k * tint[1] * bn - gg) * kb; bb += (mean[2] * k * tint[2] * bn - bb) * kb;
        }
        out[j] = THREE.DataUtils.toHalfFloat(rr); out[j + 1] = THREE.DataUtils.toHalfFloat(gg); out[j + 2] = THREE.DataUtils.toHalfFloat(bb); out[j + 3] = 15360;
      }
      const env = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
      env.mapping = THREE.EquirectangularReflectionMapping;
      env.flipY = true;
      env.minFilter = env.magFilter = THREE.LinearFilter;
      env.colorSpace = THREE.LinearSRGBColorSpace;
      env.needsUpdate = true;
      const pm = new THREE.PMREMGenerator(r);
      scene.environment = pm.fromEquirectangular(env).texture;
      scene.environmentIntensity = SKY.envInt;
      pm.dispose();
      env.dispose();
      const M = new THREE.Vector3(Math.cos(SKY.keyEl) * Math.cos(SKY.keyAz), Math.sin(SKY.keyEl), Math.cos(SKY.keyEl) * Math.sin(SKY.keyAz)).normalize();
      U.moonDir.value.copy(M);
      U.amb.value.setRGB(mean[0] * k * tint[0], mean[1] * k * tint[1], mean[2] * k * tint[2]);
      U.skyZen.value.setRGB((zen[0] / zen[3]) * k * tint[0], (zen[1] / zen[3]) * k * tint[1], (zen[2] / zen[3]) * k * tint[2]);
      U.skyHor.value.setRGB((hor[0] / hor[3]) * k * tint[0], (hor[1] / hor[3]) * k * tint[1], (hor[2] / hor[3]) * k * tint[2]);
      this.skyShift = shiftU;
      bgTex.wrapS = THREE.RepeatWrapping;
      bgTex.minFilter = bgTex.magFilter = THREE.LinearFilter;
      bgTex.generateMipmaps = false;
      bgTex.needsUpdate = true;
      this.skyMat = skyMaterial(bgTex);
      this.skyMat.uniforms.uExp.value = k * SKY.exp;
      this.skyMat.uniforms.uTint.value.setRGB(tint[0], tint[1], tint[2]);
      this.skyMat.uniforms.uHorizon.value.copy(U.skyHor.value).multiplyScalar(SKY.exp);
      (this.skyMat.uniforms.uCon.value as THREE.Vector2).set(SKY.con[0], SKY.con[1]);
      (this.skyMat.uniforms.uWin.value as THREE.Vector4).w = SKY.win;
      // the air takes the colour the sky shows just above the horizon (same exposure and contrast as the dome)
      {
        const hc = U.skyHor.value.clone().multiplyScalar(SKY.exp);
        const hl = Math.max(0.2126 * hc.r + 0.7152 * hc.g + 0.0722 * hc.b, 1e-4);
        this.base.fog.copy(hc).multiplyScalar(Math.pow(hl / SKY.con[0], SKY.con[1] - 1));
      }
      this.base.amb.copy(U.amb.value); this.base.zen.copy(U.skyZen.value); this.base.hor.copy(U.skyHor.value);
      this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.skyMat);
      this.sky.frustumCulled = false;
      this.sky.renderOrder = -1000;
      scene.add(this.sky);
      this.stats.skyK = k.toFixed(3);
      this.log(`sky: scale=${k.toFixed(2)} amb=${U.amb.value.toArray().map((v) => v.toFixed(3))} hor=${U.skyHor.value.toArray().map((v) => v.toFixed(3))}`);
    }

    // ── moonlight with one large shadow map over the castle rock
    {
      const moon = new THREE.DirectionalLight(0xe6eeff, SKY.keyInt);
      moon.position.copy(U.moonDir.value).multiplyScalar(700).add(new THREE.Vector3(-25, 40, 5));
      moon.target.position.set(-25, 40, 5);
      moon.castShadow = true;
      const s = moon.shadow;
      s.mapSize.set(8192, 8192);
      s.camera.left = -330; s.camera.right = 330; s.camera.top = 330; s.camera.bottom = -330;
      s.camera.near = 100; s.camera.far = 1500;
      s.bias = -0.0005; s.normalBias = 0.35; s.radius = 7;
      scene.add(moon, moon.target);
      this.moon = moon;
      U.moonCol.value.setRGB(0.9, 0.95, 1.0).multiplyScalar(0.55);
      this.base.moon.copy(U.moonCol.value);
    }

    // ── materials
    const mats: Record<string, THREE.Material> = {
      stone: archMaterial(U, stoneT, { color: 0xffffff, normalScale: 1.2, holes: true }),
      stone2: archMaterial(U, stone2T, { color: 0xffffff, normalScale: 1.15 }),
      roof: archMaterial(U, roofT, { color: 0x8a93a3, roof: true, normalScale: 1.2 }),
      wood: archMaterial(U, woodT, { color: 0x8c7862 }),
      metal: archMaterial(U, null, { color: 0x2a2e33, metal: 0.55, rough: 0.5 }),
      snow: archMaterial(U, null, { color: 0xccd6e8, rough: 0.82, grain: snowN }),
      deck: deckSnowMaterial(U, snowN, stone2T, 46),
      ice: archMaterial(U, null, { color: 0xa9c8de, rough: 0.12 }),
      banner: archMaterial(U, null, { color: this.th.banner, rough: 0.92 }),
      banner2: archMaterial(U, null, { color: this.th.bannerTrim, rough: 0.55, metal: 0.25 }),
      bark: archMaterial(U, barkT, { color: 0x6a5c52, normalScale: 1.4 }),
      glassroof: archMaterial(U, null, { color: 0x182019, rough: 0.2, emissive: 0x7d9440, emissiveIntensity: 0.7 }),
      lamp: lampMaterial(U),
    };

    (mats.stone as THREE.MeshStandardMaterial).color.setRGB(1.72, 1.64, 1.56);
    // stone_brick_wall_001 is four times darker than the wall stone: lifted so buttresses and battlements belong to the same building
    (mats.stone2 as THREE.MeshStandardMaterial).color.setRGB(2.7, 2.85, 2.95);
    (mats.roof as THREE.MeshStandardMaterial).color.setRGB(0.76, 0.82, 0.94);

    // ── terrain, water
    let t1 = performance.now();
    const tg = buildTerrain();
    const terrMat = terrainMaterial(U, rockT, snowN, { T: 5.5, Tfar: 47, color: 0xffffff });
    terrMat.color.setRGB(4.2, 4.05, 3.95);
    terrMat.normalScale.set(1.6, 1.6);
    ((terrMat.userData as { uRockK: { value: THREE.Vector4 } }).uRockK.value).set(this.P("rocklift", 2.0), this.P("celltilt", 0.8), this.P("snowspk", 0.3), this.P("bedsnow", 0.7));
    ((terrMat.userData as { uRockD: { value: THREE.Vector4 } }).uRockD.value).set(this.P("steepless", 0.18), this.P("veins", 0), this.P("granular", 0.55), this.P("bays", 1));
    const terr = tg.map((g, i) => {
      const m = new THREE.Mesh(g, terrMat);
      m.receiveShadow = true;
      m.castShadow = i <= 1;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    });
    void terr;
    this.log(`terrain ${(performance.now() - t1).toFixed(0)} ms`);
    if (!this.dbg.includes("norocks")) {
      const t2 = performance.now();
      const rk = buildRocks(camPath(o.film.shots));
      const rm = new THREE.Mesh(rk.geometry, terrMat);
      rm.castShadow = true; rm.receiveShadow = true; rm.frustumCulled = false;
      scene.add(rm);
      this.stats.rocks = rk.count;
      this.log(`rocks ${(performance.now() - t2).toFixed(0)} ms · ${rk.count} stones · ${Math.round(rk.tris / 1000)}k tris`);
    }
    {
      const n = 448, step = L0.size / n;
      const hd = new Uint16Array(n * n);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) hd[j * n + i] = THREE.DataUtils.toHalfFloat(clamp(heightAt(L0.x0 + (i + 0.5) * step, L0.z0 + (j + 0.5) * step), -30, 30));
      const tH = new THREE.DataTexture(hd, n, n, THREE.RedFormat, THREE.HalfFloatType);
      tH.minFilter = tH.magFilter = THREE.LinearFilter;
      tH.needsUpdate = true;
      this.waterMat = waterMaterial(U, makeWaterNormal(512), tH, new THREE.Vector4(L0.x0, L0.z0, 1 / L0.size, 1 / L0.size));
      const wg = new THREE.PlaneGeometry(44000, 44000, 1, 1);
      wg.rotateX(-Math.PI / 2);
      this.water = new THREE.Mesh(wg, this.waterMat);
      this.water.position.set(-2000, 0, 2000);
      this.water.frustumCulled = false;
      scene.add(this.water);
    }

    // ── castle
    t1 = performance.now();
    const B = new Builder();
    buildCastle(B, this.reg);
    if (!this.dbg.includes("nobare")) {
      const spots = bareTreeSpots(camPath(o.film.shots));
      for (const sp of spots) addBareTree(B, sp);
      this.stats.bareTrees = spots.length;
    }
    const geos = B.build();
    for (const [name, g] of Object.entries(geos)) {
      const m = new THREE.Mesh(g, mats[name] ?? mats.stone);
      m.castShadow = name !== "lamp";
      m.receiveShadow = name !== "lamp";
      scene.add(m);
    }
    this.stats.castleTris = Math.round(B.tris);
    this.stats.windows = this.reg.wins.length;
    this.stats.lamps = this.reg.lamps.length;
    this.log(`castle ${(performance.now() - t1).toFixed(0)} ms · ${Math.round(B.tris / 1000)}k tris · ${this.reg.wins.length} windows · ${this.reg.lamps.length} lamps`);
    scene.add(this.buildWindows());

    // ── lamps that really light the snow around them
    {
      const path = camPath(o.film.shots);
      const near = (l: Lamp) => { let d = 1e9; for (const p of path) d = Math.min(d, Math.hypot(l.p.x - p[0], l.p.y - p[1], l.p.z - p[2])); return d; };
      const pick = this.reg.lamps.filter((l) => l.pl).map((l) => ({ l, d: near(l) })).sort((a, b) => a.d - b.d).slice(0, 30).map((x) => x.l);
      for (const l of pick) {
        const base = l.i * (l.glow > 0 ? 15 : 20);
        const p = new THREE.PointLight(new THREE.Color(l.col[0], l.col[1], l.col[2]), base, l.r * 4.5, 2);
        p.position.copy(l.p);
        scene.add(p);
        this.pls.push({ light: p, lamp: l, base });
      }
      this.stats.pointLights = this.pls.length;
    }

    // ── forest
    t1 = performance.now();
    if (!this.dbg.includes("notrees")) {
      let trees = scatterTrees(camPath(o.film.shots));
      // the opening shot: no trunk in the lens or across the castle, then two spruces set by hand at the edges of the frame
      {
        const A = o.film.shots[0];
        const cams = [A.t0, (A.t0 + A.t1) / 2, A.t1].map((tt) => sampleShot(A, tt));
        trees = trees.filter((tr) => {
          for (const c of cams) {
            const dx = tr.x - c.p[0], dz = tr.z - c.p[2], dist = Math.hypot(dx, dz);
            if (dist < 4.5) return false;
            const vx = c.t[0] - c.p[0], vz = c.t[2] - c.p[2], vl = Math.hypot(vx, vz);
            const cosA = (dx * vx + dz * vz) / (dist * vl);
            if (dist < 46 && cosA > Math.cos(0.5)) return false;
          }
          return true;
        });
        for (const [x, z, hgt, rot] of o.film.openingTrees ?? []) trees.push({ x, y: Math.max(heightAt(x, z), 0.3) - 0.3, z, s: hgt, rot, lod: 0, v: (x * 0.37) % 1 });
      }
      const { group, counts } = buildForest(U, trees);
      scene.add(group);
      this.stats.trees = counts.join("/");
      this.log(`forest ${(performance.now() - t1).toFixed(0)} ms · hero/mid/far ${counts.join("/")}`);
    }

    // ── after-fog layer
    if (!this.dbg.includes("nosnow")) {
      this.snows.push(makeSnow(U, F, 52000, [120, 76, 120], 0.021, 11, 1.0 * this.rs, 1.3));
      this.snows.push(makeSnow(U, F, 1700, [28, 18, 28], 0.011, 12, 1.2 * this.rs, 1.25));
      for (const s of this.snows) this.fx.add(s);
    }
    if (this.reg.smokes.length) this.fx.add(makeSmoke(U, F, this.reg.smokes));
    if (this.reg.flames.length) this.fx.add(makeFlames(U, F, this.reg.flames));
    if (this.reg.flags.length && !this.dbg.includes("noflags")) scene.add(makeFlags(U, this.reg.flags, this.th));
    if (this.dbg.includes("birds")) {
      this.birds = makeBirds(U, F, 7, [-32, Y0 + 66, 50]);
      this.fx.add(this.birds);
    }
    this.fx.add(makeGlows(U, F, this.reg.lamps));

    // ── targets and passes
    const { IW, IH } = this;
    const depth = new THREE.DepthTexture(IW, IH);
    depth.type = THREE.UnsignedIntType;
    depth.format = THREE.DepthFormat;
    depth.minFilter = depth.magFilter = THREE.NearestFilter;
    this.rtScene = hdrTarget(IW, IH, { depthBuffer: true, depthTexture: depth, samples: this.dbg.includes("nomsaa") ? 0 : 4 });
    this.rtRefl = hdrTarget(Math.round(IW / 2), Math.round(IH / 2), { depthBuffer: true });
    this.rtA = hdrTarget(IW, IH);
    this.rtB = hdrTarget(IW, IH);
    const aoOpt = { format: THREE.RGFormat } as const;
    this.rtAO = hdrTarget(IW, IH, aoOpt);
    this.rtAO2 = hdrTarget(IW, IH, aoOpt);
    this.rtShot = [0, 1].map(() => new THREE.WebGLRenderTarget(IW, IH, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }));
    this.bloom = new Bloom(IW, IH, 7);
    const nf = F.nearFar;
    nf.value.set(this.camera.near, this.camera.far);
    F.tDepth.value = depth;
    F.res.value.set(IW, IH);
    F.rs.value = this.rs;
    this.ao = new FS(AO_FRAG, { tDepth: { value: depth }, uNearFar: nf, uRes: { value: new THREE.Vector2(IW, IH) }, uTan: { value: new THREE.Vector2() }, uPx: { value: 1 }, uRadius: { value: new THREE.Vector2(1.5, 6.5) }, uIntensity: { value: 1.0 } });
    this.aoBlur = new FS(AO_BLUR_FRAG, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.fog = new FS(FOG_FRAG, {
      tDepth: { value: depth }, uNearFar: nf, tColor: { value: this.rtScene.texture }, tAO: { value: this.rtAO.texture }, tNoise: { value: makeNoise3D(64) },
      uInvVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uTime: U.time,
      uFogCol: { value: new THREE.Color() }, uFogMoon: { value: new THREE.Color() }, uMoonDir: U.moonDir,
      uHaze: { value: new THREE.Vector4(0.0011, 1 / 900, 0.0011, 1 / 40) },
      uMist: { value: new THREE.Vector4(0.0064, 26, 1 / 170, 0.47) },
      uCloud: { value: new THREE.Vector4(0.0016, 128, 34, 1 / 460) },
      uL: { value: Array.from({ length: NFL }, () => new THREE.Vector4()) }, uLC: { value: Array.from({ length: NFL }, () => new THREE.Vector3()) },
      uGlow: { value: this.P("glow", 0.017) }, uAO: { value: 0.62 },
    });
    this.dof = new FS(DOF_FRAG, { tDepth: { value: depth }, uNearFar: nf, tColor: { value: this.rtA.texture }, uRes: { value: new THREE.Vector2(IW, IH) }, uFocus: { value: new THREE.Vector3(200, 0, 20) } });
    this.final = new FS(FINAL_FRAG, {
      tColor: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2(IW, IH) },
      uExposure: { value: 0.96 }, uBloom: { value: 0.2 }, uSat: { value: 0.62 }, uContrast: { value: 1.2 }, uVig: { value: this.th.vignette }, uGrain: { value: this.th.grain }, uTime: U.time,
      uShadowTint: { value: new THREE.Vector3(-0.016, 0.002, 0.032) }, uHighTint: { value: new THREE.Vector3(...this.th.highTint) }, uBlack: { value: 0.012 },
    });
    this.mix = new FS(MIX_FRAG, { tA: { value: this.rtShot[0].texture }, tB: { value: this.rtShot[1].texture }, uMix: { value: 0 }, uFade: { value: 1 }, uOut: { value: new THREE.Vector2(o.W, o.H) }, uSharp: { value: this.P("sharp", o.W > 2500 ? 0.32 : 0.5) } });

    // first frame also compiles every program and renders the shadow map
    r.shadowMap.needsUpdate = true;
    this.stats.initMs = Math.round(performance.now() - t0);
    this.log(`ready in ${this.stats.initMs} ms`);
  }

  private buildWindows() {
    const W = this.reg.wins, n = W.length;
    const pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), aUv = new Float32Array(n * 8), aSize = new Float32Array(n * 8), aInfo = new Float32Array(n * 16);
    const idx = new Uint32Array(n * 6);
    const up = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(), p = new THREE.Vector3();
    const m = 0.24;
    W.forEach((w, i) => {
      T.crossVectors(up, w.n).normalize();
      const xs = [-w.w / 2 - m, w.w / 2 + m], ys = [-m, w.h + m];
      for (let k = 0; k < 4; k++) {
        const x = xs[k & 1], y = ys[k >> 1], o = i * 4 + k;
        p.copy(w.p).addScaledVector(T, x).addScaledVector(up, y);
        pos.set([p.x, p.y, p.z], o * 3);
        nor.set([w.n.x, w.n.y, w.n.z], o * 3);
        aUv.set([x, y], o * 2);
        aSize.set([w.w, w.h], o * 2);
        aInfo.set([w.type, w.seed, w.tOn, w.lit ? w.warm : -1 - w.warm], o * 4);
      }
      idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("aUv", new THREE.BufferAttribute(aUv, 2));
    g.setAttribute("aSize", new THREE.BufferAttribute(aSize, 2));
    g.setAttribute("aInfo", new THREE.BufferAttribute(aInfo, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const mesh = new THREE.Mesh(g, windowMaterial(this.U));
    mesh.frustumCulled = false;
    return mesh;
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
    const tm = this.waterMat.uniforms.uTexMat.value as THREE.Matrix4;
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
    this.water.visible = false;
    r.setRenderTarget(this.rtRefl);
    r.clear();
    r.render(this.scene, mirror);
    this.water.visible = true;
    this.waterMat.uniforms.tRefl.value = this.rtRefl.texture;
  }

  private renderShot(c: Cam, t: number, slot: number, prev: Cam) {
    const { r, U, F, camera, IW, IH, dbg } = this;
    this.setCam(c, camera);
    const tanY = Math.tan((camera.fov * Math.PI) / 360), tanX = tanY * camera.aspect;
    F.px.value = IH / (2 * tanY);
    F.camVel.value.set((c.p[0] - prev.p[0]) * 30, (c.p[1] - prev.p[1]) * 30, (c.p[2] - prev.p[2]) * 30);
    // aper = blur constant (px·m at 1080p): a point at distance z is blurred by aper · |1/z − 1/focus| pixels
    const kb = (c.aper ?? 0) * this.rs, focus = c.focus ?? 200;
    F.focus.value.set(focus, Math.max(kb, 20 * this.rs));
    // lamps nearest to the lens tint the snow and glow in the air
    const cp = camera.position;
    const lamps = this.reg.lamps
      .map((l) => {
        const on = sstep(0, 0.6, U.lit.value - l.tOn);
        const d2 = l.p.distanceToSquared(cp);
        return { l, on, s: (on * l.i * l.r * l.r) / (d2 + 400) };
      })
      .filter((x) => x.on > 0)
      .sort((a, b) => b.s - a.s);
    for (let i = 0; i < NL; i++) {
      const x = lamps[i];
      if (x) { F.lPos.value[i].set(x.l.p.x, x.l.p.y, x.l.p.z, x.l.i * x.on * 6); F.lCol.value[i].set(x.l.col[0], x.l.col[1], x.l.col[2]); }
      else F.lPos.value[i].set(0, -999, 0, 0);
    }
    const uL = this.fog.u.uL.value as THREE.Vector4[], uLC = this.fog.u.uLC.value as THREE.Vector3[];
    for (let i = 0; i < NFL; i++) {
      const x = lamps[i];
      if (x) { uL[i].set(x.l.p.x, x.l.p.y, x.l.p.z, x.l.i * x.on * (x.l.glow > 0 ? 1 : 1.6)); uLC[i].set(x.l.col[0], x.l.col[1], x.l.col[2]); }
      else uL[i].set(0, 0, 0, 0);
    }
    for (const p of this.pls) p.light.intensity = p.base * sstep(0, 0.6, U.lit.value - p.lamp.tOn);

    // the grade window of the sky sits behind what this shot looks at, a little above the horizon
    {
      const az = Math.atan2(c.t[2] - c.p[2], c.t[0] - c.p[0]), el = 0.36;
      const w = this.skyMat.uniforms.uWin.value as THREE.Vector4;
      w.x = Math.cos(el) * Math.cos(az); w.y = Math.sin(el); w.z = Math.cos(el) * Math.sin(az);
    }
    this.renderMirror();
    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(this.scene, camera);

    // ambient occlusion
    if (!dbg.includes("noao")) {
      this.ao.u.uTan.value.set(tanX, tanY);
      this.ao.u.uPx.value = F.px.value;
      this.ao.render(r, this.rtAO);
      this.aoBlur.u.tAO.value = this.rtAO.texture;
      this.aoBlur.u.uDir.value.set((this.rs * 0.5) / IW, 0);
      this.aoBlur.render(r, this.rtAO2);
      this.aoBlur.u.tAO.value = this.rtAO2.texture;
      this.aoBlur.u.uDir.value.set(0, (this.rs * 0.5) / IH);
      this.aoBlur.render(r, this.rtAO);
    }
    // atmosphere
    const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.fog.u.uInvVP.value.copy(vp).invert();
    this.fog.u.uCam.value.copy(camera.position);
    this.fog.u.uAO.value = dbg.includes("noao") ? 0 : 0.62;
    (this.fog.u.uFogMoon.value as THREE.Color).copy(U.moonCol.value).multiplyScalar(0.05);
    if (dbg.includes("nofog")) { const h = this.fog.u.uHaze.value as THREE.Vector4; h.x = 0; h.z = 0; (this.fog.u.uMist.value as THREE.Vector4).x = 0; (this.fog.u.uCloud.value as THREE.Vector4).x = 0; this.fog.u.uGlow.value = 0; }
    this.fog.render(r, this.rtA);
    // snow, smoke, halos
    r.autoClear = false;
    r.setRenderTarget(this.rtA);
    r.render(this.fx, camera);
    r.autoClear = true;
    // depth of field
    let hdr = this.rtA;
    if (!dbg.includes("nodof") && kb / focus > 0.2 * this.rs) {
      (this.dof.u.uFocus.value as THREE.Vector3).set(focus, kb / focus, 20 * this.rs);
      this.dof.render(r, this.rtB);
      hdr = this.rtB;
    }
    const bl = this.bloom.render(r, hdr.texture, IW, IH);
    this.final.u.tColor.value = hdr.texture;
    this.final.u.tBloom.value = bl;
    this.final.u.uBloom.value = dbg.includes("nobloom") ? 0 : 0.2;
    this.final.render(r, this.rtShot[slot]);
  }

  /** draw film second t (or a free camera for look development) */
  frame(t: number, free?: Cam) {
    const { r, U, th } = this;
    const film = this.o.film;
    U.time.value = t;
    U.lit.value = film.litAt(t);
    {
      // the afternoon sinks into dusk: sky, sky light and key fall together, the grade turns bluer, lamps take over
      const d = film.duskAt(t), lf = 1 - 0.57 * d;
      this.skyMat.uniforms.uDim.value = 1 - 0.5 * d;
      this.scene.environmentIntensity = SKY.envInt * lf;
      this.moon.intensity = SKY.keyInt * (1 - 0.7 * d);
      U.amb.value.copy(this.base.amb).multiplyScalar(lf);
      U.skyZen.value.copy(this.base.zen).multiplyScalar(lf);
      U.skyHor.value.copy(this.base.hor).multiplyScalar(lf);
      U.moonCol.value.copy(this.base.moon).multiplyScalar(1 - 0.7 * d);
      (this.fog.u.uFogCol.value as THREE.Color).copy(this.base.fog).multiplyScalar(1 - 0.5 * d);
      const g = this.final.u;
      g.uExposure.value = this.P("expo", th.exposure) * (1 + 0.1 * d);
      g.uContrast.value = this.P("contrast", th.contrast) - 0.08 * d;
      g.uBlack.value = 0.012 + 0.012 * d;
      g.uSat.value = th.saturation + 0.1 * d;
      (g.uShadowTint.value as THREE.Vector3).set(th.shadowTint[0] - 0.004 * d, th.shadowTint[1], th.shadowTint[2] + 0.012 * d);
    }
    this.skyMat.uniforms.uShift.value = this.skyShift + t * 0.00034;
    if (this.birds) (this.birds.material as THREE.ShaderMaterial).uniforms.uShow.value = 1 - sstep(0.4, 0.8, film.duskAt(t));
    this.sky.position.set(0, 0, 0);
    let mixW = 0, fade = 1;
    if (free) {
      this.renderShot(free, t, 0, free);
    } else {
      const live = shotsAt(film.shots, t);
      const prev = shotsAt(film.shots, Math.max(0, t - 1 / 30));
      live.forEach((s, i) => {
        const pv = prev.find((q) => q.shot.id === s.shot.id) ?? s;
        this.renderShot(s.cam, t, i, pv.cam);
      });
      mixW = live.length > 1 ? live[1].w : 0;
      const fd = film.fade ?? { in: 1.8, out: [film.dur - 2.2, film.dur - 0.25] };
      fade = sstep(0, fd.in, t) * (1 - sstep(fd.out[0], fd.out[1], t));
    }
    this.mix.u.uMix.value = mixW;
    this.mix.u.uFade.value = fade;
    this.mix.render(r, null);
    this.stats.calls = r.info.render.calls;
    this.stats.tris = r.info.render.triangles;
  }
}
void rng;
