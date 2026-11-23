// Set: the underground hall of serpents and the queen on her coils.
// Shots: 6 hall reveal (14.05–17.2), 7 the queen (17.2–21.35), 8 healing (21.35–25.55), 12 last look (36.3–40).
// Helpers: hall-serpent.ts (tube bodies + paths), hall-queen.ts (her coil + the layered queen rig), hall-sil.ts
// (rim-lit silhouettes), hall-tex.ts (scales, mist, streaks), hall-art.ts (queen layers, soldiers, manuscript, tiles),
// hall-props.ts (candle clusters, column mouldings, Jamasp in 3D).
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { CUE, clamp, ease, flicker, hit, lerp, ramp, rnd } from "../lib";
import { Board, Flame, dust, shaft, stone } from "../kit";
import { tileTex } from "../tex";
import { HALL, V, type Ctx, type SetMod, type Shot } from "./common";
import { Sil } from "./hall-sil";
import { mistTex, ringTex, snakeSkin, streakTex, tileSkin } from "./hall-tex";
import { herbLeaf, manuscriptPage, poolTex, qBodyMask, qDrape, qForearm, qHeadBack, qHeadProfile, qUpperArm, soldierMask, tileBand, waxGlow } from "./hall-art";
import { CandleCluster, buildJamasp, columnBase, columnCapital } from "./hall-props";
import { Path, Tube, floorPath, helixPath, rear, ringS, slowAfter, snakeProfile } from "./hall-serpent";
import { QueenRig, coil, type CoilOut } from "./hall-queen";

/** review stills for this set (seconds) */
export const LOOK_HALL = [14.2, 14.9, 15.6, 16.3, 17.5, 18.4, 19.8, 21.0, 22.1, 23.7, 36.6, 37.25];

const ZH = HALL.z;
/** hall-local → world */
const P3 = (x: number, y: number, z: number) => V(x, y, z + ZH);

const arch = (s: THREE.Path | THREE.Shape, w: number, hR: number, hT: number, cw = true) => {
  const h = w / 2, d = hT - hR;
  if (cw) {
    s.moveTo(-h, 0);
    s.lineTo(-h, hR);
    s.bezierCurveTo(-h, hR + d * 0.62, -w * 0.14, hT - d * 0.1, 0, hT);
    s.bezierCurveTo(w * 0.14, hT - d * 0.1, h, hR + d * 0.62, h, hR);
    s.lineTo(h, 0);
  } else {
    s.moveTo(h, 0);
    s.lineTo(h, hR);
    s.bezierCurveTo(h, hR + d * 0.62, w * 0.14, hT - d * 0.1, 0, hT);
    s.bezierCurveTo(-w * 0.14, hT - d * 0.1, -h, hR + d * 0.62, -h, hR);
    s.lineTo(-h, 0);
  }
  s.closePath();
};
const wallWithArch = (w: number, h: number, aw: number, ahR: number, ahT: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.closePath();
  const hole = new THREE.Path();
  arch(hole, aw, ahR, ahT, false);
  s.holes.push(hole);
  return new THREE.ShapeGeometry(s, 24);
};
const archBand = (aw: number, ahR: number, ahT: number, b: number) => {
  const s = new THREE.Shape();
  arch(s, aw + b * 2, ahR, ahT + b, true);
  const hole = new THREE.Path();
  arch(hole, aw, ahR, ahT, false);
  s.holes.push(hole);
  return new THREE.ShapeGeometry(s, 24);
};

/** dim candle-lit environment for the glossy serpents (PMREM of a painted panorama) */
const makeEnv = (gl: THREE.WebGLRenderer) => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#060d12");
  g.addColorStop(0.42, "#0c0e0f");
  g.addColorStop(0.5, "#1c140c");
  g.addColorStop(0.56, "#0e0a07");
  g.addColorStop(1, "#040303");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) {
    const px = rnd(i * 3.1) * 512, py = 118 + rnd(i * 5.7) * 16, r = 3 + rnd(i) * 5;
    const gg = x.createRadialGradient(px, py, 0, px, py, r * 4);
    gg.addColorStop(0, "rgba(255,190,110,0.8)");
    gg.addColorStop(1, "rgba(255,120,40,0)");
    x.fillStyle = gg;
    x.fillRect(px - r * 4, py - r * 4, r * 8, r * 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(gl);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose();
  return env;
};

/** add a fresnel rim (emissive) to a lit material */
const withRim = (m: THREE.MeshStandardMaterial, rim: { value: THREE.Color }, pow = 3) => {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRimC = rim;
    sh.fragmentShader = "uniform vec3 uRimC;\n" + sh.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
       { float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); totalEmissiveRadiance += uRimC * pow(fr, ${pow.toFixed(1)}); }`,
    );
  };
  m.customProgramCacheKey = () => `rim${pow}`;
  return m;
};

type Snake = {
  tube: Tube;
  path: Path;
  L: number;
  r: number;
  n: number;
  s: Float32Array;
  c: Float32Array;
  rx: Float32Array;
  ry: Float32Array;
  s0: number;
  v: number;
  rise?: { t0: number; sR: number; sway: number };
  water: boolean;
  eyes: THREE.Mesh[];
  glints: Board[];
  glintT: number;
  ripples: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  shots: number[];
  climb: boolean;
};

export const buildHall = (c: Ctx): SetMod => {
  const { T, mk, flames, W: VW, H: VH } = c;
  const hall = mk("hall", HALL);
  const env = makeEnv(c.gl);
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0);

  // ================= architecture =================
  const mirror = new Reflector(new THREE.PlaneGeometry(70, 190), { clipBias: 0.003, textureWidth: VW / 2, textureHeight: VH / 2, color: 0x5a5a5a });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, 0, -55);
  const wetM = stone(T, "large_sandstone_blocks_01", 14, 38, 0x4a4238, 0.55);
  wetM.transparent = true;
  wetM.opacity = 0.42;
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(70, 190), wetM);
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, 0.01, -55);
  hall.add(mirror, wet);

  // columns: moulded Attic base, sandstone shaft, glazed tile band (grout normals, varied roughness), capital
  const pm = stone(T, "large_sandstone_blocks_01", 3, 7, 0xa89070);
  const baseM = stone(T, "large_sandstone_blocks_01", 5, 0.6, 0x9a8466);
  const band = tileBand();
  band.map.repeat.set(1.375, 1);
  band.normal.repeat.set(1.375, 1);
  band.rough.repeat.set(1.375, 1);
  const tileM = new THREE.MeshStandardMaterial({ map: band.map, normalMap: band.normal, roughnessMap: band.rough, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(1.5, 1.5), color: 0x8a8a8a, envMap: env, envMapIntensity: 0.15 });
  const shaftG = new THREE.CylinderGeometry(0.85, 0.95, 15, 32);
  const baseG = columnBase(0.95);
  const capG = columnCapital(0.85);
  const abacus = new THREE.BoxGeometry(2.3, 0.4, 2.3);
  const bandG = new THREE.CylinderGeometry(0.958, 0.958, 1.1, 64, 1, true);
  const PILLAR_Z = (i: number) => -4 - i * 8;
  for (let i = 0; i < 11; i++)
    for (const x of [-6.5, 6.5]) {
      const z = PILLAR_Z(i);
      const p = new THREE.Mesh(shaftG, pm);
      p.position.set(x, 8.5, z);
      const b = new THREE.Mesh(baseG, baseM);
      b.position.set(x, 0, z);
      const cp = new THREE.Mesh(capG, baseM);
      cp.position.set(x, 15.0, z);
      const ab = new THREE.Mesh(abacus, pm);
      ab.position.set(x, 15.75, z);
      const bd = new THREE.Mesh(bandG, tileM);
      bd.position.set(x, 2.3, z);
      bd.rotation.y = rnd(i * 2 + x);
      hall.add(p, b, cp, ab, bd);
    }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 96).rotateX(Math.PI / 2), stone(T, "large_sandstone_blocks_01", 6, 22, 0x2a221c));
  ceil.position.set(0, 16, -40);
  hall.add(ceil);
  const wallM = stone(T, "medieval_blocks_03", 30, 6, 0x4a3e32);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(92, 16), wallM);
    w.rotation.y = s * -Math.PI / 2;
    w.position.set(s * 12, 8, -40);
    hall.add(w);
  }
  // entrance wall with the door (z = +4) and a short corridor behind it
  const entM = stone(T, "medieval_blocks_03", 0.4, 0.4, 0x5a4c3e);
  const ent = new THREE.Mesh(wallWithArch(26, 16, 3.4, 4.4, 6.2), entM);
  ent.rotation.y = Math.PI;
  ent.position.set(0, 0, 4);
  const entBand = new THREE.Mesh(archBand(3.4, 4.4, 6.2, 0.38), new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.45, color: 0x8a8a8a, envMap: env, envMapIntensity: 0.3 }));
  (entBand.material as THREE.MeshStandardMaterial).map!.repeat.set(0.6, 0.6);
  entBand.rotation.y = Math.PI;
  entBand.position.set(0, 0, 3.97);
  hall.add(ent, entBand);
  const corM = stone(T, "medieval_blocks_03", 5, 2.5, 0x5a4c3e);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), corM);
    w.rotation.y = s * -Math.PI / 2;
    w.position.set(s * 1.75, 3.5, 11);
    hall.add(w);
  }
  const corC = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 14).rotateX(Math.PI / 2), corM);
  corC.position.set(0, 6.4, 11);
  hall.add(corC);

  // back wall with the great iwan arch behind the queen (z = -84); a light-filled chamber beyond it
  const backM = stone(T, "medieval_blocks_03", 0.36, 0.36, 0x4a3c2e);
  const back = new THREE.Mesh(wallWithArch(26, 16, 9.6, 8.4, 13.6), backM);
  back.position.set(0, 0, -84);
  const ibM = new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.4, color: 0x909090, envMap: env, envMapIntensity: 0.4 });
  ibM.map!.repeat.set(0.45, 0.45);
  const iwanBand = new THREE.Mesh(archBand(9.6, 8.4, 13.6, 0.9), ibM);
  iwanBand.position.set(0, 0, -83.96);
  hall.add(back, iwanBand);
  const glowCan = document.createElement("canvas");
  glowCan.width = 256;
  glowCan.height = 512;
  {
    const x = glowCan.getContext("2d")!;
    const g = x.createLinearGradient(0, 512, 0, 0);
    g.addColorStop(0, "rgb(110,56,26)");
    g.addColorStop(0.3, "rgb(130,70,32)");
    g.addColorStop(0.65, "rgb(55,32,22)");
    g.addColorStop(1, "rgb(14,10,10)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 7; i++) {
      const cx = 18 + i * 37 + (rnd(i * 5) - 0.5) * 10;
      const cg = x.createLinearGradient(0, 120, 0, 512);
      cg.addColorStop(0, "rgba(10,6,6,0)");
      cg.addColorStop(0.5, "rgba(20,10,8,0.4)");
      cg.addColorStop(1, "rgba(20,10,8,0.55)");
      x.fillStyle = cg;
      if (Math.abs(cx - 128) > 40) x.fillRect(cx - 5, 120, 10, 392);
    }
    const core = x.createRadialGradient(128, 330, 4, 128, 330, 200);
    core.addColorStop(0, "rgba(255,232,180,1)");
    core.addColorStop(0.2, "rgba(255,186,100,0.8)");
    core.addColorStop(0.6, "rgba(200,100,50,0.22)");
    core.addColorStop(1, "rgba(120,60,30,0)");
    x.fillStyle = core;
    x.fillRect(0, 0, 256, 512);
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const cx = 40 + rnd(i * 11) * 176, w = 10 + rnd(i * 3) * 22;
      const rg = x.createLinearGradient(0, 0, 0, 512);
      rg.addColorStop(0, "rgba(255,200,130,0.08)");
      rg.addColorStop(0.8, "rgba(255,150,80,0.02)");
      rg.addColorStop(1, "rgba(255,150,80,0)");
      x.fillStyle = rg;
      x.beginPath();
      x.moveTo(cx - w * 0.3, 0);
      x.lineTo(cx + w * 0.3, 0);
      x.lineTo(cx + w + (cx - 128) * 0.25, 512);
      x.lineTo(cx - w + (cx - 128) * 0.25, 512);
      x.fill();
    }
  }
  const glowTexV = new THREE.CanvasTexture(glowCan);
  glowTexV.colorSpace = THREE.SRGBColorSpace;
  const chamber = new THREE.Mesh(new THREE.PlaneGeometry(16, 18), new THREE.MeshBasicMaterial({ map: glowTexV, color: 0xffffff, fog: false }));
  chamber.position.set(0, 8, -96);
  hall.add(chamber);
  const archShafts: THREE.Mesh[] = [];
  for (const [x, rx, op] of [[-2.2, 0.32, 0.1], [1.8, 0.26, 0.12], [0.2, 0.4, 0.08]] as const) {
    const s = shaft(17, 0.6, 3.2, 0xffb070, op);
    s.position.set(x, 15, -90);
    s.rotation.x = rx;
    hall.add(s);
    archShafts.push(s);
  }

  // cool light shafts from the ceiling + pools of blue light on the water
  const rays: THREE.Mesh[] = [];
  for (const z of [-26, -44, -62]) {
    const r = shaft(16, 0.5, 2.4, 0x6f9fb8, 0.14);
    r.position.set((rnd(z) - 0.5) * 3, 16, z);
    hall.add(r);
    rays.push(r);
  }
  const bluePools: THREE.SpotLight[] = [];
  for (const z of [-26, -44]) {
    const s = new THREE.SpotLight(0x7fb4d0, 700, 0, 0.17, 0.9, 2);
    s.position.set((rnd(z) - 0.5) * 3, 15.5, z);
    s.target.position.set((rnd(z) - 0.5) * 3, 0, z);
    hall.add(s, s.target);
    bluePools.push(s);
  }
  const doorLight = new THREE.SpotLight(0xffe2b8, 3000, 0, 0.75, 0.8, 2);
  doorLight.position.set(0, 3.6, 3.6);
  doorLight.target.position.set(0, 0, -30);
  hall.add(doorLight, doorLight.target);
  const hemi = new THREE.HemisphereLight(0x3a5a6a, 0x120c08, 0.1);
  hall.add(hemi);

  // ================= candles: fewer, real ones (wax, flame, pool of light) =================
  const waxM = new THREE.MeshStandardMaterial({ color: 0xcfc0a2, roughness: 0.55, emissive: 0xffb070, emissiveMap: waxGlow(), emissiveIntensity: 0.9 });
  const poolT = poolTex();
  type CC = { cl: CandleCluster; z: number; kind: "pillar" | "aisle" | "dais"; pre: number };
  const clusters: CC[] = [];
  const addCluster = (x: number, z: number, n: number, kind: CC["kind"], seed: number, scale = 1, poolR = 1.6, poolK = 0.3, pre = 0) => {
    const cl = new CandleCluster(T, waxM, poolT, seed, n, 0.2 * scale, scale, poolR, poolK);
    cl.position.set(x, 0, z);
    hall.add(cl);
    flames.push(...cl.flames);
    clusters.push({ cl, z, kind, pre });
  };
  for (let i = 0; i < 11; i++)
    for (const x of [-6.5, 6.5]) {
      const z = PILLAR_Z(i) + (rnd(i * 5 + x) - 0.5) * 1.2;
      addCluster(x > 0 ? 4.65 : -4.65, z, 3 + Math.floor(rnd(i * 3 + x) * 3), "pillar", i * 31 + (x > 0 ? 7 : 0), 1.15, 1.7, 0.32, i === 0 ? 0.85 : 0);
    }
  for (const [x, z] of [[-2.6, -9], [2.7, -21], [-2.7, -33], [2.6, -45], [-2.6, -57]] as const) addCluster(x, z, 2, "aisle", 500 + z, 1.0, 1.2, 0.26, z === -9 ? 0.8 : 0);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3;
    addCluster(Math.cos(a) * 6.3, -72 + Math.sin(a) * 6.3, 3, "dais", 700 + k, 1.25, 1.8, 0.3, 0.3);
  }
  // a few real lights (the pools above fake the rest)
  const pLights: { l: THREE.PointLight; z: number }[] = [];
  for (const [x, i] of [[-6.5, 1], [6.5, 2], [-6.5, 3], [6.5, 5], [-6.5, 6], [6.5, 8]] as const) {
    const l = new THREE.PointLight(0xffa458, 0, 0, 2);
    l.position.set(x > 0 ? 4.3 : -4.3, 1.0, PILLAR_Z(i) + 0.4);
    hall.add(l);
    pLights.push({ l, z: PILLAR_Z(i) });
  }
  const floorL = new THREE.PointLight(0xffa860, 0, 0, 2); // under-light for the serpents rising in the foreground
  floorL.position.set(0, 0.5, -15.5);
  hall.add(floorL);
  const daisL = [0.3, 1.9, 3.5, 5.1].map((a) => {
    const l = new THREE.PointLight(0xffa050, 0, 0, 2);
    l.position.set(Math.cos(a) * 6.3, 0.6, -72 + Math.sin(a) * 6.3);
    hall.add(l);
    return l;
  });
  const waveL = [-4.2, 4.2].map((x) => {
    const l = new THREE.PointLight(0xffa860, 0, 0, 2);
    l.position.set(x, 1.2, 0);
    hall.add(l);
    return l;
  });
  const WAVE0 = CUE.kingdom - 0.12, WAVE_V = 46;
  const igniteAt = (z: number) => WAVE0 + Math.max(0, -z - 3) / WAVE_V;

  // ================= serpents =================
  const skin = snakeSkin();
  const rimSnake = { value: new THREE.Color(0x2a5a5a) };
  const snakeM = withRim(
    new THREE.MeshPhysicalMaterial({ map: skin.map, normalMap: skin.normal, roughnessMap: skin.rm, metalnessMap: skin.rm, roughness: 1, metalness: 1, clearcoat: 0.35, clearcoatRoughness: 0.3, envMap: env, envMapIntensity: 0.3, normalScale: new THREE.Vector2(1.2, 1.2), color: 0xb4b4b4 }),
    rimSnake,
    2.6,
  );
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 0.04, metalness: 0, envMap: env, envMapIntensity: 1.5 });
  const eyeG = new THREE.SphereGeometry(1, 12, 8);
  const ringT = ringTex();
  const snakes: Snake[] = [];
  const addSnake = (o: { path: Path; L: number; r: number; v: number; rise?: { t0: number; sR: number; sway: number }; water?: boolean; glintT?: number; shots?: number[]; climb?: boolean }) => {
    const n = 96, m = 16;
    const tube = new Tube(n, m, snakeM);
    hall.add(tube.mesh);
    const eyes = [0, 1].map(() => {
      const e = new THREE.Mesh(eyeG, eyeM);
      e.scale.setScalar(o.r * 0.2);
      hall.add(e);
      return e;
    });
    const glints = [0, 1].map(() => {
      const b = new Board(T.glow, 0xffcf70, o.r * 0.9, o.r * 0.9, true, 0);
      hall.add(b);
      return b;
    });
    const ripples = o.water
      ? Array.from({ length: 4 }, () => {
          const m2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringT, color: 0x9fc0c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
          hall.add(m2);
          return m2;
        })
      : [];
    snakes.push({ tube, path: o.path, L: o.L, r: o.r, n, s: ringS(n, o.L), c: new Float32Array(n * 3), rx: new Float32Array(n), ry: new Float32Array(n), s0: o.L + 0.3, v: o.v, rise: o.rise, water: !!o.water, eyes, glints, glintT: o.glintT ?? CUE.serpents, ripples, shots: o.shots ?? [6, 7, 12], climb: !!o.climb });
  };
  const wig = (a: number, w: number, ph: number) => [{ a, w, ph }, { a: a * 0.35, w: w * 0.31, ph: ph * 1.7 + 1 }];
  const plen = (L: number, v: number) => L + 0.6 + v * 26;
  const S = CUE.serpents;
  // foreground: three big ones rise into the candlelight on «serpents»
  addSnake({ path: floorPath(-5.0, -13.2, 1.25, plen(5.6, 0.4), 0.17, wig(0.5, 1.3, 0.3)), L: 5.6, r: 0.18, v: 0.4, rise: { t0: S - 0.05, sR: 2.1, sway: -0.95 }, glintT: S, shots: [6] });
  addSnake({ path: floorPath(4.6, -18.8, -1.95, plen(5.4, 0.38), 0.17, wig(0.5, 1.4, 1.2)), L: 5.4, r: 0.175, v: 0.38, rise: { t0: S + 0.15, sR: 2.0, sway: 0.75 }, glintT: S + 0.15, shots: [6] });
  addSnake({ path: floorPath(-1.4, -24.5, 2.65, plen(5.0, 0.42), 0.16, wig(0.45, 1.5, 2.0)), L: 5.0, r: 0.165, v: 0.42, rise: { t0: S + 0.3, sR: 1.8, sway: -0.4 }, glintT: S + 0.3, shots: [6] });
  // gliders across the wet floor (their reflections double them)
  const GL: [number, number, number, number, number, number, boolean][] = [
    // x, z, heading, L, r, v, water
    [-3.6, -24, 0.9, 5.0, 0.15, 0.45, false],
    [3.8, -30, -0.8, 5.5, 0.16, 0.4, false],
    [-2.2, -36, 1.3, 4.6, 0.14, 0.5, true],
    [2.6, -12.5, -2.6, 4.8, 0.15, 0.36, false],
    [-4.0, -44, 0.5, 5.2, 0.15, 0.42, false],
    [1.2, -50, -1.4, 5.0, 0.14, 0.45, true],
    [3.9, -40, -1.9, 4.8, 0.15, 0.4, false],
    [-0.8, -29, 2.8, 4.4, 0.13, 0.4, false],
    [0.4, -56, 1.7, 4.6, 0.14, 0.42, false],
    [-3.2, -17.5, 1.9, 4.2, 0.13, 0.48, false],
    [3.4, -26, -1.2, 4.6, 0.14, 0.44, true],
    [-0.4, -33.5, -1.75, 4.4, 0.13, 0.5, false],
    [-3.8, -48, 0.7, 4.8, 0.14, 0.4, true],
    [2.2, -38, 2.4, 4.2, 0.13, 0.46, false],
    [-1.8, -52, 1.5, 4.4, 0.13, 0.44, false],
  ];
  GL.forEach(([x, z, h, L, r, v, w], i) => addSnake({ path: floorPath(x, z, h, plen(L, v), w ? 0.015 : r * 0.85, wig(0.5, 1.4 + (i % 3) * 0.2, i * 0.9)), L, r, v, water: w, glintT: S + 0.1 + i * 0.07 }));
  // around the dais: they rise when her name is spoken
  const N = CUE.shahmaran;
  addSnake({ path: floorPath(-7.6, -66.5, 1.6, plen(4.4, 0.3), 0.13, wig(0.5, 1.6, 0.4)), L: 4.4, r: 0.14, v: 0.3, rise: { t0: N + 0.05, sR: 1.5, sway: 0.45 }, glintT: N + 0.1, shots: [7, 12] });
  addSnake({ path: floorPath(7.9, -68.5, -1.55, plen(4.4, 0.3), 0.13, wig(0.5, 1.7, 1.4)), L: 4.4, r: 0.14, v: 0.3, rise: { t0: N + 0.18, sR: 1.5, sway: -0.45 }, glintT: N + 0.2, shots: [7, 12] });
  addSnake({ path: floorPath(4.6, -62.8, -2.5, plen(3.6, 0.32), 0.12, wig(0.5, 1.8, 0.2)), L: 3.6, r: 0.12, v: 0.32, rise: { t0: N + 0.3, sR: 1.2, sway: -0.3 }, glintT: N + 0.35, shots: [7, 12] });
  void helixPath;

  // a serpent coiled round the foot of every column, its head raised toward the aisle (static mesh, built once)
  type Coiled = { mesh: THREE.Mesh; glints: Board[]; z: number; ph: number };
  const rimCoiled = { value: new THREE.Color(0.1, 0.055, 0.02) };
  const coiledM = withRim(snakeM.clone() as THREE.MeshPhysicalMaterial, rimCoiled, 2.2);
  const coiled: Coiled[] = [];
  {
    const n = 150, m = 14;
    for (let i = 0; i < 11; i++)
      for (const side of [-1, 1]) {
        if (i === 10) continue;
        const seed = i * 2 + (side > 0 ? 1 : 0);
        const r = 0.12 + rnd(seed * 3) * 0.05, L = 7.5 + rnd(seed) * 2;
        const R = 0.955 + r + 0.01;
        const aisle = side < 0 ? 0 : Math.PI; // direction from the column toward the aisle (x)
        // dense centreline from the head to the tail
        const pts: THREE.Vector3[] = [];
        const turns = 1.5 + rnd(seed * 7) * 0.5, y0 = 1.05, y1 = 1.55 + rnd(seed) * 0.2;
        const aEnd = aisle + (side < 0 ? -0.6 : 0.6), aStart = aEnd - turns * Math.PI * 2 * (side < 0 ? 1 : -1);
        const helix = (k: number) => {
          const a = aStart + (aEnd - aStart) * k;
          return V(Math.cos(a) * R, y0 + (y1 - y0) * k, Math.sin(a) * R);
        };
        const hEnd = helix(1), hT = helix(1).sub(helix(0.99)).normalize();
        const headP = hEnd.clone().add(V(Math.cos(aisle) * 0.42, 0.62 + rnd(seed * 5) * 0.2, Math.sin(aisle) * 0.42));
        // neck: Hermite from the helix end to the raised head
        for (let k = 30; k >= 0; k--) {
          const u = k / 30;
          const m0 = V(0, 1, 0).add(hT.clone().multiplyScalar(0.3)).multiplyScalar(0.9), m1 = V(Math.cos(aisle), -0.45, Math.sin(aisle)).multiplyScalar(0.7);
          const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
          pts.push(hEnd.clone().multiplyScalar(h00).addScaledVector(m0, h10).addScaledVector(headP, h01).addScaledVector(m1, h11));
        }
        for (let k = 1; k <= 120; k++) pts.push(helix(1 - k / 120));
        // tail spilling down over the mouldings to the floor
        const tStart = helix(0), tDir = helix(0).sub(helix(0.01)).normalize();
        for (let k = 1; k <= 30; k++) {
          const u = k / 30;
          const p = tStart.clone().addScaledVector(tDir, u * 1.2);
          p.multiplyScalar(1 + u * 0.55);
          p.y = Math.max(r * 0.7, y0 * (1 - u) ** 1.5);
          pts.push(p);
        }
        // resample by arc length
        const cum = [0];
        for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
        const tot = cum[cum.length - 1];
        const Ls = Math.min(L, tot);
        const s = ringS(n, Ls), cc = new Float32Array(n * 3), rx = new Float32Array(n), ry = new Float32Array(n);
        let j = 0;
        for (let q = 0; q < n; q++) {
          while (j < pts.length - 2 && cum[j + 1] < s[q]) j++;
          const kk = clamp((s[q] - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]));
          const p = pts[j].clone().lerp(pts[j + 1], kk);
          cc.set([p.x, p.y, p.z], q * 3);
          const [w, h] = snakeProfile(s[q], Ls, r);
          rx[q] = w;
          ry[q] = h;
        }
        const tube = new Tube(n, m, coiledM);
        tube.set(cc, rx, ry, s, 2 * Math.PI * r * (24 / 22), rnd(seed), 0.3);
        tube.mesh.position.set(side * 6.5, 0, PILLAR_Z(i));
        hall.add(tube.mesh);
        // eye glints at the head
        let ie = 0;
        while (ie < n - 1 && s[ie] < r * 4.6 * 0.42) ie++;
        const hp = V(cc[ie * 3], cc[ie * 3 + 1], cc[ie * 3 + 2]);
        const fw = V(cc[0] - cc[(ie + 3) * 3], cc[1] - cc[(ie + 3) * 3 + 1], cc[2] - cc[(ie + 3) * 3 + 2]).normalize();
        const sideV = V(0, 1, 0).cross(fw).normalize();
        const [hw, hh] = snakeProfile(s[ie], Ls, r);
        const glints = [-1, 1].map((sg) => {
          const b = new Board(T.glow, 0xffcf70, r * 0.8, r * 0.8, true, 0);
          b.position.copy(hp).addScaledVector(sideV, sg * hw * 0.8).add(V(0, hh * 0.45, 0)).add(tube.mesh.position);
          hall.add(b);
          return b;
        });
        coiled.push({ mesh: tube.mesh, glints, z: PILLAR_Z(i), ph: seed * 1.7 });
      }
  }

  // ================= the queen =================
  const tile = tileSkin();
  const rimCoil = { value: new THREE.Color(0x000000) };
  const coilM = withRim(
    new THREE.MeshPhysicalMaterial({ map: tile.map, normalMap: tile.normal, roughnessMap: tile.rm, metalnessMap: tile.rm, roughness: 1, metalness: 1, clearcoat: 0.45, clearcoatRoughness: 0.32, envMap: env, envMapIntensity: 0.45, normalScale: new THREE.Vector2(0.38, 0.38), color: 0xffffff }),
    rimCoil,
    2.5,
  );
  const NC = 560;
  const coilTube = new Tube(NC, 30, coilM);
  coilTube.mesh.position.set(0, 0, -72);
  hall.add(coilTube.mesh);
  let coilBuf: CoilOut | undefined;
  const rig = new QueenRig(T, qBodyMask(), qHeadProfile(), qHeadBack(), qUpperArm(), qForearm(), qDrape());
  const QS = 1.25;
  rig.scale.setScalar(QS);
  rig.position.set(0, 3.0 - 3.0 * QS, -72);
  hall.add(rig);
  // warm haze behind her upper body, so she is a silhouette against her own light even from a low camera
  const haze = [0, 1, 2, 3].map((i) => {
    const b2 = new Board(T.glow, i % 2 ? 0xffa860 : 0xffc890, 12 + i * 3, 12 + i * 3, true, 0);
    b2.position.set((i - 1.5) * 0.9, 7.2 + i * 0.5, -77 - i * 0.8);
    hall.add(b2);
    return b2;
  });
  const qBack = new Board(T.glow, 0xffaa58, 15, 15, true, 0.4);
  qBack.position.set(0, 6.4, -79);
  hall.add(qBack);
  const qBack2 = new Board(T.glow, 0xff9a48, 7, 7, true, 0.3);
  qBack2.position.set(0, 6.0, -74.5);
  hall.add(qBack2);
  const qFlare = new Board(T.glow, 0xffe2b0, 7, 7, true, 0);
  qFlare.position.set(0, 7.0, -73.5);
  hall.add(qFlare);
  const qSpot = new THREE.SpotLight(0xffb070, 900, 0, 0.62, 0.7, 2);
  qSpot.position.set(0, 12.5, -83);
  qSpot.target.position.set(0, 1.5, -70);
  hall.add(qSpot, qSpot.target);
  const rimL = new THREE.SpotLight(0x6fc0d0, 500, 0, 0.5, 0.8, 2);
  rimL.position.set(-8, 5, -82);
  rimL.target.position.set(0, 1.8, -71);
  const rimR = new THREE.SpotLight(0xffc080, 600, 0, 0.5, 0.8, 2);
  rimR.position.set(8, 6, -82);
  rimR.target.position.set(0, 1.8, -71);
  hall.add(rimL, rimL.target, rimR, rimR.target);
  const NE = 420;
  const emPos = new Float32Array(NE * 3);
  const emG = new THREE.BufferGeometry();
  emG.setAttribute("position", new THREE.BufferAttribute(emPos, 3));
  const embers = new THREE.Points(emG, new THREE.PointsMaterial({ map: T.dot, color: 0xffc070, size: 0.09, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  embers.frustumCulled = false;
  hall.add(embers);

  // ================= healing (shot 8) =================
  const healing = new THREE.Group();
  hall.add(healing);
  const JX = 0.7, JZ = -61.2;
  const jam = buildJamasp(withRim);
  jam.group.position.set(JX, 0, JZ);
  jam.group.rotation.y = Math.atan2(JX - 0, -72 - JZ) + Math.PI; // face the queen
  healing.add(jam.group);
  const jSpot = new THREE.SpotLight(0xffd28a, 0, 0, 0.2, 0.8, 2);
  jSpot.position.set(JX, 9.5, JZ - 0.15);
  jSpot.target.position.set(JX, 0.5, JZ);
  healing.add(jSpot, jSpot.target);
  const jFill = new THREE.PointLight(0xffa868, 5, 0, 2);
  jFill.position.set(JX - 1.4, 1.5, JZ - 1.6);
  healing.add(jFill);
  const bookL = new THREE.PointLight(0xffc880, 0, 0, 2);
  bookL.position.set(JX, 0.42, JZ - 0.35);
  healing.add(bookL);
  const beam = shaft(16, 0.1, 1.35, 0xffcf8a, 0.22);
  beam.position.set(JX, 9.5, JZ - 0.15);
  healing.add(beam);
  const NM = 220;
  const moPos = new Float32Array(NM * 3);
  const moG = new THREE.BufferGeometry();
  moG.setAttribute("position", new THREE.BufferAttribute(moPos, 3));
  const motes = new THREE.Points(moG, new THREE.PointsMaterial({ map: T.dot, color: 0xffd590, size: 0.03, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  motes.frustumCulled = false;
  healing.add(motes);
  // herbs flowing from her hand to him on «teach»
  const herbT = [herbLeaf(1), herbLeaf(2), herbLeaf(3)];
  const herbs: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.26), new THREE.MeshBasicMaterial({ map: herbT[i % 3], color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    healing.add(m);
    herbs.push(m);
  }
  // manuscript leaves drifting down the light column
  const pages: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  for (let i = 0; i < 4; i++) {
    const pt = manuscriptPage(i + 1);
    const pg2 = new THREE.PlaneGeometry(0.26, 0.36, 8, 2);
    const pp = pg2.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pp.count; v++) {
      const px = pp.getX(v) / 0.13;
      pp.setZ(v, 0.025 * (1 - px * px) + 0.01 * px * px * px * (i % 2 ? 1 : -1));
    }
    pg2.computeVertexNormals();
    const m = new THREE.Mesh(pg2, new THREE.MeshStandardMaterial({ map: pt, emissiveMap: pt, emissive: 0xffd8a0, emissiveIntensity: 0.2, side: THREE.DoubleSide, roughness: 0.85, transparent: true }));
    healing.add(m);
    pages.push(m);
  }

  // ================= the last look (shot 12): soldiers walking in with torches =================
  const proc = new THREE.Group();
  hall.add(proc);
  const SOLH = 2.05;
  type Sold = { a: Sil; b: Sil; x: number; z0: number; ph: number; torch?: Flame; halo?: Board; light?: THREE.PointLight; pool?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> };
  const soldiers: Sold[] = [];
  const TROOP = [
    { x: -0.55, z0: -50.2, torch: true },
    { x: 0.95, z0: -49.2, spear: true, shield: true },
    { x: -1.7, z0: -48.0, spear: true },
    { x: 0.25, z0: -47.2, torch: true },
    { x: 1.8, z0: -46.0, spear: true, shield: true },
  ];
  TROOP.forEach((tr, i) => {
    const mkS = (stride: number) => {
      const s = new Sil(soldierMask({ torch: tr.torch, spear: tr.spear, shield: tr.shield, stride }), SOLH, true);
      s.u.uRimCol.value.set(0xffa860);
      s.u.uWrap.value = 0.5;
      s.u.uRimPx.value = 2.2;
      s.u.uRim.value = 1.0;
      s.u.uFill.value.setRGB(0.05, 0.025, 0.01);
      proc.add(s);
      return s;
    };
    const so: Sold = { a: mkS(0.15), b: mkS(0.85), x: tr.x, z0: tr.z0, ph: i * 1.3 };
    if (tr.torch) {
      so.torch = new Flame(T, 0.5, 520 + i, 0, 0xffd090);
      proc.add(so.torch);
      flames.push(so.torch);
      so.halo = new Board(T.glow, 0xffd296, 4.5, 4.5, true, 0);
      proc.add(so.halo);
      so.light = new THREE.PointLight(0xffb060, 0, 0, 2);
      proc.add(so.light);
      so.pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      proc.add(so.pool);
    }
    soldiers.push(so);
  });
  const corridorGlow = new Board(T.glow, 0xffc488, 10, 10, true, 0);
  corridorGlow.position.set(0, 2.6, 10);
  proc.add(corridorGlow);

  // ================= atmosphere =================
  const hallDust = dust(T, 2000, [22, 14, 96], V(0, 6, -42), 0xffd8a8, 0.035, 0.36);
  hall.add(hallDust.pts);
  const mists: { b: Board; x: number; y: number; z: number; sp: number; op: number; bank: boolean }[] = [];
  const mT = [mistTex(0), mistTex(1), mistTex(2)];
  for (let i = 0; i < 32; i++) {
    const nearDais = i >= 16 && i < 26, bank = i >= 26;
    const z = bank ? -60 - rnd(i * 3) * 9 : nearDais ? -72 + (rnd(i * 5) - 0.5) * 18 : -8 - rnd(i * 3) * 50;
    const x = (rnd(i * 7) - 0.5) * (bank ? 12 : nearDais ? 16 : 13);
    const sz = bank ? 9 + rnd(i) * 5 : 5 + rnd(i) * 5;
    const b = new Board(mT[i % 3], bank ? 0x8a8478 : nearDais ? 0xffb070 : 0x6a8898, sz, sz * 0.55, true, 0);
    hall.add(b);
    mists.push({ b, x, y: bank ? 1.5 + rnd(i * 11) * 4 : 0.7 + rnd(i * 11) * 1.1, z, sp: 0.08 + rnd(i * 13) * 0.12, op: bank ? 0.16 : nearDais ? 0.06 : 0.045, bank });
  }
  const stT = streakTex();
  type Streak = { b: Board; src: Flame; w: number; h: number; k: number };
  const streaks: Streak[] = [];
  const addStreak = (src: Flame, color: number, w: number, h: number, k: number) => {
    const b = new Board(stT, color, 1, 1, true, 0);
    hall.add(b);
    streaks.push({ b, src, w, h, k });
  };
  clusters.forEach((cc) => addStreak(cc.cl.flames[0], 0xffb060, 0.22, 2.0, 0.3));
  soldiers.forEach((so) => so.torch && addStreak(so.torch, 0xffc888, 0.7, 7, 0.7));

  // ================= shots =================
  let tNow = 0;
  const fog6 = new THREE.FogExp2(0x070c0f, 0.022), fog7 = new THREE.FogExp2(0x090d10, 0.022), fog8 = new THREE.FogExp2(0x0a0b0c, 0.03), fog12 = new THREE.FogExp2(0x070b0e, 0.014);
  const shots: Shot[] = [
    {
      a: 14.05, b: 17.2, set: ["hall"], focus: 16, range: 14, fog: fog6,
      cam: (k, t) => {
        tNow = t;
        const e = ease.io(k) * 0.8 + k * 0.2;
        return { p: P3(0.3 * Math.sin(t * 0.45) - 0.15, lerp(1.2, 1.45, e), lerp(2.6, -7.0, e)), l: P3(0.1 * Math.sin(t * 0.3), lerp(1.0, 1.5, e), -72), fov: lerp(42, 39, k) };
      },
    },
    {
      a: 17.2, b: 21.35, set: ["hall"], focus: 19, range: 10, fog: fog7,
      cam: (k, t) => {
        tNow = t;
        const e = ease.out(ramp(t, 17.2, CUE.shahmaran + 0.2)) * 0.82 + ease.sine(k) * 0.18;
        const push = 0.9 * ease.out(ramp(t, CUE.shahmaran - 0.1, CUE.shahmaran + 2.0));
        return { p: P3(lerp(-3.4, -0.9, e), lerp(0.6, 1.45, e), lerp(-51.0, -58.2, e) - push), l: P3(lerp(-0.3, 0.05, e), lerp(5.1, 6.0, e), -72), fov: lerp(35, 31, e) - 1.2 * ramp(t, CUE.shahmaran, 21.35) };
      },
    },
    {
      // from his right, off the hall's axis, arcing ~12° round him
      a: 21.35, b: 25.55, set: ["hall"], range: 1.6, fog: fog8,
      get focus() {
        return 6.4;
      },
      cam: (k, t) => {
        tNow = t;
        const al = lerp(0.66, 0.45, ease.sine(k));
        return { p: P3(JX + Math.sin(al) * 6.4, lerp(0.85, 1.05, ease.sine(k)), JZ + Math.cos(al) * 6.4), l: P3(lerp(-0.1, 0.0, k), lerp(2.7, 3.0, k), -66), fov: 44 };
      },
    },
    {
      a: 36.3, b: 40, set: ["hall"], fog: fog12,
      get focus() {
        return lerp(7.2, 28.0, ease.io(ramp(tNow, 36.85, 37.25)));
      },
      get range() {
        return lerp(2.0, 12, ease.io(ramp(tNow, 36.85, 37.25)));
      },
      cam: (k, t) => {
        tNow = t;
        return { p: P3(lerp(1.95, 1.88, k), lerp(8.15, 8.08, k), lerp(-78.9, -78.3, k)), l: P3(-0.35, 2.0, -40), fov: lerp(24, 23.3, ramp(t, 36.3, 37.85)) };
      },
    },
  ];

  // ================= per-frame =================
  const camLocal = V(0, 0, 0);
  const shotOf = (t: number) => (t < 17.2 ? 6 : t < 21.35 ? 7 : t < 25.55 ? 8 : 12);
  const qWorld = V(0, 0, 0);
  const update = (t: number, sh: Shot) => {
    if (!sh.set.includes("hall")) return;
    const cam = c.camera;
    const SH = shotOf(t);
    camLocal.copy(cam.position).sub(HALL);
    hallDust.tick(t, [0.05, 0.02, 0]);
    for (const r of rays) (r.material as THREE.ShaderMaterial).uniforms.uT.value = t;
    for (const r of archShafts) (r.material as THREE.ShaderMaterial).uniforms.uT.value = t;

    const sw = hit(t, CUE.shahmaran, 0.7);
    const named = ease.out(ramp(t, CUE.shahmaran - 0.05, CUE.shahmaran + 0.5));
    const qRev = SH === 7 ? ease.io(ramp(t, CUE.queen - 0.3, CUE.queen + 1.1)) : SH === 6 ? 0 : 1;

    // --- light levels: one dominant light per shot ---
    const flood = SH === 6 ? Math.exp(-(t - 14.05) / 0.3) : 0;
    doorLight.visible = SH === 6;
    doorLight.intensity = 850 + 3000 * flood;
    hemi.intensity = SH === 6 ? 0.1 + 0.6 * flood : 0.05;
    bluePools.forEach((b) => (b.visible = SH !== 8));
    bluePools.forEach((b) => (b.intensity = SH === 6 ? 700 : 350));
    rays.forEach((r) => ((r.material as THREE.ShaderMaterial).uniforms.uOp.value = SH === 6 ? 0.15 : SH === 12 ? 0.08 : 0.1));
    rays[2].visible = SH !== 8;
    waveL.forEach((l) => (l.visible = SH === 6));
    floorL.visible = SH === 6;
    jSpot.visible = bookL.visible = SH === 8;
    healing.visible = SH === 8;
    proc.visible = SH === 12;
    const candleK = SH === 6 ? 1 : SH === 7 ? 0.55 : SH === 8 ? 0.4 : 0.5;
    for (const pl of pLights) {
      const ign = igniteAt(pl.z);
      const lit = SH === 6 ? ease.out(ramp(t, ign, ign + 0.25)) * (1 + 0.6 * Math.exp(-Math.max(0, t - ign) / 0.3)) : 1;
      const near7 = SH === 7 && pl.z > -58 && pl.z < -40 ? 0.04 : 1;
      pl.l.intensity = 44 * lit * flicker(t, pl.z) * candleK * near7 * (SH === 8 ? 0.4 : 1);
    }
    floorL.intensity = 22 * ease.out(ramp(t, igniteAt(-15), igniteAt(-15) + 0.4)) * flicker(t, 77);
    daisL.forEach((l, i) => (l.intensity = (SH === 6 ? 6 * ramp(t, igniteAt(-62), igniteAt(-62) + 0.6) : SH === 7 ? 10 + 14 * sw : SH === 8 ? 5 : 6) * flicker(t, 90 + i)));
    rimSnake.value.setRGB(0.028, 0.065, 0.065).multiplyScalar(SH === 12 ? 0.6 : 1);
    rimCoil.value.setRGB(0.05, 0.035, 0.018).multiplyScalar(SH === 7 ? 0.5 + 0.8 * qRev + 1.4 * sw : 0.6);

    // --- candles: a few lit at the door, then a wave down the hall on «kingdom»; the dais ones flare on «Shahmaran» ---
    for (const cc of clusters) {
      const ign = cc.kind === "dais" ? igniteAt(-60) + rnd(cc.cl.flames[0].seed) * 0.35 : igniteAt(cc.z) + rnd(cc.cl.flames[0].seed * 3) * 0.06;
      const age = t - ign;
      const lit = age < 0 ? 0 : Math.min(1, age / 0.08) * (1 + 1.2 * Math.exp(-age / 0.22));
      let p = SH === 6 ? Math.max(cc.pre, lit) : 1;
      const near = cc.kind === "dais";
      p *= 1 + sw * (near ? 1.6 : 0.5) + (SH === 7 && near ? 0.2 * named : 0);
      if (SH === 12) p *= 0.8;
      if (SH === 8 && near && cc.cl.position.x > -2.4 && cc.cl.position.x < 0.4 && cc.cl.position.z > -67.5) p = 0;
      cc.cl.setPower(p, flicker(t, cc.cl.flames[0].seed) * (SH === 6 ? 1 : 0.7));
    }
    if (SH === 6) {
      const zf = -3 - (t - WAVE0) * WAVE_V;
      const on = t > WAVE0 && zf > -78 ? Math.min(1, (t - WAVE0) / 0.08) * (1 - ramp(zf, -60, -78)) : 0;
      waveL.forEach((l, i) => {
        l.position.z = zf - 1 + i * 2;
        l.intensity = 300 * on;
      });
    }

    // --- serpents (dynamic) ---
    const tt = SH === 12 ? 25.55 + (t - 36.3) : t;
    for (let si = 0; si < snakes.length; si++) {
      const sn = snakes[si];
      const vis = sn.shots.includes(SH);
      sn.tube.mesh.visible = vis;
      sn.eyes.forEach((e) => (e.visible = vis));
      sn.glints.forEach((g) => (g.visible = vis));
      sn.ripples.forEach((r) => (r.visible = vis));
      if (!vis) continue;
      const rt = sn.rise ? sn.rise.t0 : 1e9;
      const sh0 = sn.s0 + sn.v * (slowAfter(tt, rt, 0.6, 0.12) - 14);
      for (let i = 0; i < sn.n; i++) {
        sn.path.at(sh0 - sn.s[i], tmp);
        const [w, h] = snakeProfile(sn.s[i], sn.L, sn.r);
        sn.c[i * 3] = tmp.x;
        sn.c[i * 3 + 1] = sn.climb ? tmp.y : sn.water ? h * 0.08 : h * 0.7 + 0.004;
        sn.c[i * 3 + 2] = tmp.z;
        sn.rx[i] = w;
        sn.ry[i] = h;
      }
      if (sn.rise) {
        const k = ease.out(ramp(tt, sn.rise.t0, sn.rise.t0 + 0.9));
        rear(sn.c, sn.s, sn.rise.sR, k, sn.rise.sway * Math.sin(tt * 0.9 + si) * 0.6 + sn.rise.sway * 0.4, 0.12 * Math.sin(tt * 2.1 + si));
      }
      sn.tube.set(sn.c, sn.rx, sn.ry, sn.s, 2 * Math.PI * sn.r * (24 / 22), 0, 0.3);
      const hl = sn.r * 4.6;
      let ie = 0;
      while (ie < sn.n - 1 && sn.s[ie] < hl * 0.42) ie++;
      const hp = V(sn.c[ie * 3], sn.c[ie * 3 + 1], sn.c[ie * 3 + 2]);
      const fw = V(sn.c[0] - sn.c[(ie + 3) * 3], sn.c[1] - sn.c[(ie + 3) * 3 + 1], sn.c[2] - sn.c[(ie + 3) * 3 + 2]).normalize();
      const sideV = V(0, 1, 0).cross(fw).normalize();
      const upV = fw.clone().cross(sideV).normalize();
      const [hw, hh] = snakeProfile(sn.s[ie], sn.L, sn.r);
      const g = 0.35 + 0.65 * Math.max(hit(tt, sn.glintT, 0.5), 0.5 * ramp(tt, sn.glintT, sn.glintT + 0.4)) + 0.25 * Math.max(0, Math.sin(tt * 1.7 + si * 2.3)) ** 8;
      sn.eyes.forEach((e, k) => {
        e.position.copy(hp).addScaledVector(sideV, (k ? 1 : -1) * hw * 0.8).addScaledVector(upV, hh * 0.45);
        const gl = sn.glints[k];
        gl.position.copy(e.position).addScaledVector(fw, sn.r * 0.05);
        gl.face(cam);
        gl.material.opacity = (SH === 6 && tt < sn.glintT - 0.3 ? 0.25 : 1) * g * (SH === 12 ? 0.5 : 1);
      });
      sn.ripples.forEach((rm, k) => {
        const period = 0.7, age = (tt + k * period) % (period * 4);
        const born = tt - age;
        sn.path.at(sn.s0 + sn.v * (born - 14), tmp);
        rm.position.set(tmp.x, 0.025, tmp.z);
        const R = 0.15 + age * 0.55;
        rm.scale.set(R * 2, 1, R * 2);
        rm.material.opacity = 0.2 * (1 - age / (period * 4)) * Math.min(1, age * 4);
      });
    }
    // coiled column serpents: breathe, sway a little, eyes glint on «serpents»
    for (const cs of coiled) {
      const vis = SH === 6 || SH === 12 || (SH === 7 && cs.z < -40);
      cs.mesh.visible = vis;
      cs.glints.forEach((g) => (g.visible = vis));
      if (!vis) continue;
      const b = 1 + 0.008 * Math.sin(t * 1.3 + cs.ph);
      cs.mesh.scale.set(b, 1, b);
      cs.mesh.rotation.y = 0.03 * Math.sin(t * 0.6 + cs.ph);
      const gt = S + (-cs.z / 72) * 0.5;
      const gk = SH === 6 ? (t < gt ? 0.12 : 0.35 + 0.65 * Math.max(hit(t, gt, 0.5), 0.55)) : 0.5;
      cs.glints.forEach((g) => {
        g.face(cam);
        g.material.opacity = gk * (0.85 + 0.15 * Math.sin(t * 2.3 + cs.ph));
      });
    }

    // --- the queen: hidden in the reveal of the hall; coil + rig ---
    const qVis = SH !== 6;
    coilTube.mesh.visible = rig.visible = qVis;
    if (qVis) {
      coilBuf = coil(t, NC, 4.15, coilBuf);
      coilTube.set(coilBuf.c, coilBuf.rx, coilBuf.ry, coilBuf.s, 2.0, -t * 0.02, 0.28);
    }
    rig.face(cam);
    // pose: breathing (3 s), head tilt on «queen», arms rising on «Shahmaran», head turn on «knew»
    const breathe = Math.sin((t * Math.PI * 2) / 3);
    const tilt = SH === 7 ? 0.09 * ease.io(ramp(t, CUE.queen - 0.1, CUE.queen + 0.9)) : SH === 8 ? 0.12 : 0;
    const riseAt = (tt2: number) => (SH === 7 ? ease.io(ramp(tt2, CUE.shahmaran - 0.05, CUE.shahmaran + 2.6)) : 0);
    const rise = riseAt(t);
    const trail = SH === 7 ? (riseAt(t) - riseAt(t - 0.4)) * 2.2 : 0;
    const lean = SH === 7 ? 0.07 * ease.io(ramp(t, CUE.shahmaran - 0.1, CUE.shahmaran + 2.0)) : SH === 8 ? 0.05 : 0;
    const armUp = SH === 7 ? lerp(0.2, 0.8, rise) : SH === 8 ? 0.5 : 0.1;
    const foreUp = SH === 7 ? lerp(0.05, 1.45, rise) : SH === 8 ? 0.7 : 0.05;
    const armL = SH === 8 ? 0.78 + 0.05 * Math.sin(t * 0.7) : armUp;
    const foreL = SH === 8 ? 0.35 + 0.05 * Math.sin(t * 0.9) : foreUp;
    let squash = SH === 7 ? 1 - 0.08 * ease.io(ramp(t, CUE.queen - 0.1, CUE.queen + 0.9)) : 1;
    let back = false;
    if (SH === 12) {
      const kt = CUE.knew;
      if (t < kt + 0.14) {
        back = true;
        squash = lerp(1, 0.22, ease.in(ramp(t, kt, kt + 0.14)));
      } else squash = lerp(0.22, 1, ease.out(ramp(t, kt + 0.14, kt + 0.45)));
    }
    rig.pose({ breathe, tilt, squash, armL: armL + 0.02 * breathe, armR: armUp + 0.02 * breathe, foreL, foreR: foreUp, lean, trailL: trail + 0.04 * Math.sin(t * 0.8), trailR: trail + 0.04 * Math.sin(t * 0.8 + 1) });
    rig.head.u.uMap.value = back ? rig.back.map : rig.front.map;
    rig.head.u.uLitAmt.value = back ? 0 : SH === 12 ? 0.3 * ramp(t, CUE.knew + 0.2, CUE.knew + 0.6) : SH === 7 ? 0.35 + 0.45 * qRev + 0.9 * sw : 0.5;
    rig.all((s) => {
      s.u.uT.value = t;
      if (SH === 12) {
        const rk = ramp(t, 36.45, 37.0);
        s.u.uRim.value = 0.15 + 0.3 * rk;
        s.u.uRimCol.value.set(0xffa060);
        s.u.uLDir.value.set(-0.85, 0.5);
        s.u.uWrap.value = 0.0;
        s.u.uVeil.value = 0.03 + 0.05 * rk;
        s.u.uGold.value = 0.06;
        s.u.uGlint.value = 0.0;
        s.u.uRimPx.value = 5;
        s.u.uSoft.value = lerp(1.5, 14, ease.io(ramp(t, 36.85, 37.25)));
        s.u.uFill.value.setRGB(0, 0, 0);
      } else {
        const lvl = SH === 7 ? 0.35 + 0.55 * qRev + 1.6 * sw + 0.3 * named : 0.7;
        s.u.uRim.value = lvl;
        s.u.uRimCol.value.set(0xffbe78);
        s.u.uLDir.value.set(-0.35, 1);
        s.u.uWrap.value = 0.04;
        s.u.uVeil.value = 0.08 + 0.3 * qRev + 0.5 * sw + 0.12 * named;
        s.u.uGold.value = 0.25 + 0.35 * qRev + 0.8 * sw;
        s.u.uGlint.value = SH === 7 ? 0.2 + 1.0 * named : 0.5;
        s.u.uRimPx.value = SH === 8 ? 4 : 2.6;
        s.u.uSoft.value = SH === 8 ? 5 : 0;
        s.u.uFill.value.setRGB(0.012, 0.007, 0.004);
      }
    });
    // layers that sit in front of her body must not glow as if backlit
    rig.head.u.uVeil.value = 0;
    for (const s of [rig.upL, rig.upR, rig.foL, rig.foR]) s.u.uVeil.value *= 0.25;
    // her face is lit from the front-left side; the rim models brow, nose, lips
    rig.head.u.uLDir.value.set(-0.9, 0.45);
    rig.head.u.uWrap.value = 0;
    rig.head.u.uRimCol.value.set(0xffb060);
    if (SH === 12) rig.head.u.uRim.value = 0.1 + 0.22 * ramp(t, CUE.knew + 0.25, CUE.knew + 0.7);
    const eyeOn = back ? 0 : SH === 7 ? 0.35 + 0.65 * named : SH === 8 ? 0.6 : 0.8 * ramp(t, CUE.knew + 0.3, CUE.knew + 0.6);
    rig.eye.face(cam);
    rig.eye.material.opacity = eyeOn * (0.75 + 0.1 * Math.sin(t * 3)) * (1 + 1.4 * sw);
    rig.eye.scale.setScalar(1 + 1.2 * sw);
    const glow = SH === 6 ? 0.12 + 0.1 * ramp(t, WAVE0 + 1.2, WAVE0 + 2.0) : SH === 7 ? 0.22 + 0.35 * qRev + 1.5 * sw + 0.25 * named : SH === 8 ? 0.35 : 0;
    qBack.visible = qBack2.visible = SH !== 12;
    qBack.material.opacity = glow;
    qBack.face(cam);
    qBack2.material.opacity = SH === 6 ? 0 : glow * 0.7;
    qBack2.face(cam);
    haze.forEach((b2, i) => {
      b2.visible = SH === 7 || SH === 8;
      b2.face(cam);
      b2.position.x = (i - 1.5) * 1.2 + 0.4 * Math.sin(t * 0.17 + i * 2);
      b2.material.opacity = (SH === 7 ? 0.05 + 0.08 * qRev + 0.22 * sw + 0.03 * named : 0.06) * (0.85 + 0.15 * Math.sin(t * 0.6 + i));
    });
    qFlare.visible = SH === 7;
    qFlare.face(cam);
    qFlare.material.opacity = 0.85 * sw * ramp(t, CUE.shahmaran - 0.04, CUE.shahmaran + 0.04);
    qFlare.scale.setScalar(0.7 + 0.5 * (1 - sw));
    (chamber.material as THREE.MeshBasicMaterial).color.setScalar(SH === 6 ? 0.14 + 0.12 * ramp(t, WAVE0 + 1.2, WAVE0 + 2.2) : SH === 7 ? 0.3 + 0.4 * qRev + 1.6 * sw + 0.2 * named : 0.42);
    archShafts.forEach((s) => ((s.material as THREE.ShaderMaterial).uniforms.uOp.value = SH === 7 ? 0.06 + 0.1 * qRev + 0.45 * sw + 0.06 * named : 0.06));
    qSpot.intensity = SH === 7 ? 220 + 380 * qRev + 1300 * sw + 220 * named : SH === 6 ? 120 : 380;
    rimL.intensity = SH === 7 ? 90 + 140 * qRev + 380 * sw : SH === 8 ? 12 : 110;
    rimR.intensity = SH === 7 ? 110 + 170 * qRev + 450 * sw : 130;
    const ea = SH === 7 ? ramp(t, CUE.shahmaran - 0.1, CUE.shahmaran + 0.2) * (1 - ramp(t, 20.6, 21.35)) : 0;
    (embers.material as THREE.PointsMaterial).opacity = ea * 0.9;
    if (ea > 0) {
      for (let i = 0; i < NE; i++) {
        const age = t - CUE.shahmaran + 0.1 - rnd(i * 3) * 0.6;
        const a = rnd(i) * Math.PI * 2, R0 = 5.6 + rnd(i * 7) * 1.4;
        const up = Math.max(0, age) * (0.9 + rnd(i * 5) * 1.6);
        const a2 = a + up * 0.12, R = R0 - up * 0.35;
        emPos[i * 3] = Math.cos(a2) * R + Math.sin(t * 2 + i) * 0.05;
        emPos[i * 3 + 1] = 0.5 + up + 0.08 * Math.sin(t * 3 + i);
        emPos[i * 3 + 2] = -72 + Math.sin(a2) * R;
      }
      emG.attributes.position.needsUpdate = true;
    }

    // --- healing ---
    if (SH === 8) {
      const hk = ease.out(ramp(t, 21.35, 21.9));
      const sec = ease.out(ramp(t, CUE.secret - 0.1, CUE.secret + 0.5));
      const heal = hit(t, CUE.healing, 0.9);
      const nm = ease.out(ramp(t, CUE.jamasp - 0.1, CUE.jamasp + 0.6));
      jSpot.intensity = (700 + 500 * sec + 1600 * heal + 400 * nm) * hk;
      (beam.material as THREE.ShaderMaterial).uniforms.uOp.value = (0.2 + 0.08 * sec + 0.3 * heal + 0.08 * nm) * hk;
      (beam.material as THREE.ShaderMaterial).uniforms.uT.value = t;
      jam.rim.value.setRGB(0.32, 0.2, 0.09).multiplyScalar((0.7 + 0.4 * sec + 0.9 * heal) * hk);
      jam.book.emissiveIntensity = 0.5 + 1.5 * sec + 2.5 * heal;
      bookL.intensity = (0.8 + 2 * sec + 4 * heal) * hk;
      // breathing / a slow nod up toward her on «Jamasp»
      jam.group.scale.set(1, 1 + 0.008 * Math.sin(t * 2.1), 1);
      jam.group.rotation.x = -0.04 * nm;
      // herb stream: from her left hand to his hands
      rig.handL.getWorldPosition(qWorld);
      const src = qWorld.clone().sub(HALL), dst = V(JX + 0.05, 0.4, JZ - 0.32);
      const ctrl = src.clone().lerp(dst, 0.5).add(V(0.4, 1.6, 0));
      (motes.material as THREE.PointsMaterial).opacity = 0.85 * hk;
      for (let i = 0; i < NM; i++) {
        if (i < 90) {
          // drifting in the beam
          const a = rnd(i) * Math.PI * 2 + t * (0.15 + rnd(i * 3) * 0.2);
          const rr = 0.1 + rnd(i * 7) * 0.55;
          const y = ((rnd(i * 11) * 4 + t * (0.06 + rnd(i * 13) * 0.08)) % 4) + 0.2;
          moPos[i * 3] = JX + Math.cos(a) * rr * (0.4 + y * 0.12);
          moPos[i * 3 + 1] = y;
          moPos[i * 3 + 2] = JZ - 0.2 + Math.sin(a) * rr * (0.4 + y * 0.12);
        } else {
          const j = i - 90;
          const u = (rnd(j * 3) + (t - CUE.teach) * 0.32) % 1;
          const alive = t > CUE.teach + rnd(j) * 0.5 && u < Math.min(1, (t - CUE.teach) * 0.9);
          const q = 1 - u;
          const p = src.clone().multiplyScalar(q * q).addScaledVector(ctrl, 2 * q * u).addScaledVector(dst, u * u);
          const sp = 0.08 + 0.14 * Math.sin(u * Math.PI);
          p.x += Math.sin(j * 1.7 + t * 1.3) * sp * (rnd(j) - 0.5) * 2;
          p.y += Math.cos(j * 2.3 + t * 1.1) * sp * (rnd(j + 5) - 0.5) * 2;
          p.z += Math.sin(j * 0.9 + t * 0.9) * sp * (rnd(j + 9) - 0.5) * 2;
          if (!alive) p.set(0, -50, 0);
          moPos[i * 3] = p.x;
          moPos[i * 3 + 1] = p.y;
          moPos[i * 3 + 2] = p.z;
        }
      }
      moG.attributes.position.needsUpdate = true;
      herbs.forEach((m, i) => {
        const st = CUE.teach + i * 0.16;
        const u = clamp((t - st) / 2.0);
        const q = 1 - u;
        const p = src.clone().multiplyScalar(q * q).addScaledVector(ctrl, 2 * q * u).addScaledVector(dst, u * u);
        p.x += Math.sin(i * 2.1 + t * 1.6) * 0.18 * Math.sin(u * Math.PI);
        p.y += Math.cos(i * 1.3 + t * 1.2) * 0.12 * Math.sin(u * Math.PI);
        m.position.copy(p);
        m.rotation.set(t * (1.1 + rnd(i)) + i, t * 0.8 + i * 2, t * (0.6 + rnd(i * 3)));
        m.material.opacity = t < st ? 0 : Math.sin(Math.min(1, u * 1.15) * Math.PI) * (0.9 + 0.6 * heal);
        m.visible = m.material.opacity > 0.01;
      });
      // manuscript pages drifting down the light column (falling-leaf sway)
      pages.forEach((m, i) => {
        const st = [21.4, CUE.secret - 0.2, 23.2, 23.9][i];
        const age = t - st;
        const y = 2.9 - age * 0.42;
        const sway = Math.sin(age * 2.2 + i * 1.7);
        m.position.set(JX - 0.15 + sway * 0.32 + (i - 1.5) * 0.12, Math.max(0.55, y), JZ - 0.6 + Math.cos(age * 1.6 + i) * 0.22);
        m.rotation.set(-1.2 + 0.5 * Math.cos(age * 2.2 + i * 1.7), age * 0.6 + i, 0.45 * sway);
        m.material.opacity = age < 0 ? 0 : Math.min(1, age * 2) * (1 - ramp(y, 0.9, 0.55));
        m.visible = m.material.opacity > 0.01;
        m.material.emissiveIntensity = 0.18 + 0.4 * heal + 0.1 * sec;
      });
    }

    // --- the soldiers walking in with their torches (shot 12) ---
    if (SH === 12) {
      const tk = ease.out(ramp(t, 36.3, 36.7));
      corridorGlow.material.opacity = 0.35 * tk;
      corridorGlow.face(cam);
      soldiers.forEach((so) => {
        const d = (t - 36.3) * 1.5;
        const z = so.z0 - d;
        const step = Math.floor((t - 36.3) * 3.4 + so.ph) % 2;
        const bob = Math.abs(Math.sin((t - 36.3) * Math.PI * 3.4 + so.ph)) * 0.04;
        for (const [s, on] of [[so.a, step === 0], [so.b, step === 1]] as const) {
          s.visible = on;
          s.position.set(so.x + 0.04 * Math.sin(t * 3.4 + so.ph), bob, z);
          s.face(cam);
          s.u.uRim.value = 1.0 * tk;
          s.u.uT.value = t;
        }
        if (so.torch && so.halo && so.light && so.pool) {
          // the torch is held up on his right (in the mask: +0.27 m, 1.55 m up)
          const fx = so.x + 0.27, fy = 1.62 + bob, fz = z - 0.05;
          so.torch.position.set(fx, fy, fz);
          so.torch.power = tk * (1.2 + 0.15 * Math.sin(t * 7 + so.ph));
          so.halo.position.set(fx, fy + 0.15, fz);
          so.halo.face(cam);
          so.halo.material.opacity = 0.5 * tk * flicker(t, so.ph * 10);
          so.light.position.set(fx, fy + 0.2, fz - 0.3);
          so.light.intensity = 120 * tk * flicker(t, so.ph * 7);
          so.pool.position.set(fx - 0.2, 0.03, fz - 1.4);
          so.pool.material.opacity = 0.32 * tk * flicker(t, so.ph * 5);
        }
      });
    }

    // --- mist, streaks ---
    mists.forEach((ms, i) => {
      const x = ms.x + Math.sin(t * ms.sp + i) * 1.6 + t * 0.05;
      ms.b.position.set(x, ms.y + 0.1 * Math.sin(t * 0.3 + i), ms.z);
      ms.b.face(cam);
      const near = ms.b.position.distanceTo(camLocal);
      const k = ms.bank ? (SH === 6 ? 1 : 0) : (i >= 16 && SH === 7 ? 1 + 0.8 * qRev + 2.0 * sw : 1) * (SH === 8 ? 0.6 : 1);
      ms.b.material.opacity = ms.op * clamp((near - 2.5) / 5) * k;
      ms.b.visible = ms.b.material.opacity > 0.002;
    });
    for (const st of streaks) {
      const src = st.src;
      const pow = src.power * (src.parent?.visible === false ? 0 : 1);
      if (pow <= 0.01) {
        st.b.visible = false;
        continue;
      }
      src.getWorldPosition(tmp);
      tmp.sub(HALL);
      const my = -tmp.y;
      const k = (camLocal.y - 0.03) / (camLocal.y - my);
      if (k <= 0 || k > 1) {
        st.b.visible = false;
        continue;
      }
      st.b.visible = true;
      tmp2.set(camLocal.x + (tmp.x - camLocal.x) * k, 0.03, camLocal.z + (tmp.z - camLocal.z) * k);
      st.b.position.copy(tmp2);
      st.b.scale.set(st.w * k, st.h * k, 1);
      st.b.face(cam);
      st.b.translateY(-st.h * k * 0.42);
      st.b.material.opacity = st.k * Math.min(1.5, pow) * flicker(t, src.seed);
    }
  };
  const bloom = (t: number) =>
    hit(t, CUE.shahmaran, 0.6) * 2.0 + (t > 14.05 && t < 15 ? 0.6 * Math.exp(-(t - 14.05) / 0.3) : 0) + (t > 21.35 && t < 25.55 ? 1.1 * hit(t, CUE.healing, 0.7) : 0);
  return { shots, update, bloom };
};
