// Set: the dying king's chamber, shot 27.6 – 33.3 («Years later, a king lay dying… and the only cure, was her.»).
// A royal room in near-darkness: plaster walls over a glazed star-and-cross tile wainscot, an arched lattice window in
// the back wall that throws a patterned moonlight pool and a shaft across the floor, a canopy bed in heavy velvet, the
// king under a brocade blanket, the physician as a silhouette against the window. Incense rises from a brass burner;
// from «only cure» to «was her» the smoke slithers out of the burner as a serpent and rears its head over the king.
import * as THREE from "three";
import { CUE, ease, hit, lerp, noise1, ramp, rnd } from "../lib";
import { Board, Flame, dust } from "../kit";
import { PAL, V, type Ctx, type SetMod, type Shot } from "./common";
import { BeamCard, Puffs, SilFig, SmokeTube, archPath, pbr } from "./c-kit";
import { carpetC, jamaspC, kingShadowC, latticeC, nightC, screenC, starC, tilesC } from "./c-tex";

/** review stills for the palace, the eye and the stairs (seconds) — owned with eye.ts and stairs.ts */
export const LOOK_C = [25.8, 26.4, 27.3, 27.8, 28.95, 29.7, 32.2, 32.85, 33.9, 34.9, 35.6, 36.25];

export const buildPalace = (c: Ctx): SetMod => {
  const { T, mk, flames } = c;
  const pal = mk("palace", PAL);
  c.gl.shadowMap.enabled = true;
  c.gl.shadowMap.type = THREE.PCFShadowMap;
  const add = <O extends THREE.Object3D>(m: O, cast = true, recv = true) => {
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = cast;
        o.receiveShadow = recv;
      }
    });
    pal.add(m);
    return m;
  };
  const at = <O extends THREE.Object3D>(o: O, x: number, y: number, z: number) => {
    o.position.set(x, y, z);
    return o;
  };

  // ---------------- room ----------------
  const ZB = -3.6, XL = -5, XR = 5, HW = 5.6;
  const WX = -3.1; // window centre (back wall)
  const floorM = pbr(T, "marble_01", 5, 5, { tint: 0x6a5646, rough: 0.42, nScale: 0.5 });
  add(at(new THREE.Mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), floorM), 0, 0, 0.5), false);
  const plaster = (rx: number, ry: number) => pbr(T, "patterned_clay_plaster", rx, ry, { tint: 0x8a7060, nScale: 1.3 });
  // back wall: the lattice window and a candle niche
  const back = new THREE.Shape();
  back.moveTo(XL, 0);
  back.lineTo(XR, 0);
  back.lineTo(XR, HW);
  back.lineTo(XL, HW);
  back.closePath();
  back.holes.push(archPath(new THREE.Path(), WX, 1.8, 2.35, 0.62, 0.72) as THREE.Path);
  back.holes.push(archPath(new THREE.Path(), 2.9, 1.15, 2.2, 0.62, 1.35) as THREE.Path);
  add(at(new THREE.Mesh(new THREE.ExtrudeGeometry(back, { depth: 0.5, bevelEnabled: false }), plaster(0.4, 0.4)), 0, 0, ZB - 0.5));
  // a dim cool ambience: shadows fall to teal-blue, candlelight stays gold
  pal.add(new THREE.HemisphereLight(0x3a5470, 0x140c08, 0.38));
  add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.4), plaster(0.5, 0.5)), 2.9, 2.5, ZB - 0.45), false);
  // side walls and ceiling
  const leftM = add(at(new THREE.Mesh(new THREE.PlaneGeometry(10, HW), plaster(4, 2.2)), XL, HW / 2, 1.4), false);
  leftM.rotation.y = Math.PI / 2;
  const rightM = add(at(new THREE.Mesh(new THREE.PlaneGeometry(10, HW), plaster(4, 2.2)), XR, HW / 2, 1.4), false);
  rightM.rotation.y = -Math.PI / 2;
  add(at(new THREE.Mesh(new THREE.PlaneGeometry(10, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 })), 0, HW, 1), false, false);
  // glazed tile wainscot with a gilded border on the walls
  const tl = tilesC();
  const tileMat = (w: number) => {
    const m = tl.map.clone(), n = tl.normal.clone();
    m.repeat.set(w / 0.6, 1.2 / 0.6);
    n.repeat.copy(m.repeat);
    m.needsUpdate = n.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: m, normalMap: n, roughness: 0.2, color: 0x7a7468, normalScale: new THREE.Vector2(1.5, 1.5) });
  };
  const gold = new THREE.MeshStandardMaterial({ color: 0x8a6428, metalness: 0.9, roughness: 0.35 });
  const wains = (x: number, z: number, w: number, ry: number) => {
    const g = new THREE.Group();
    g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(w, 1.2), tileMat(w)), 0, 0.6, 0));
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.04), gold), 0, 1.22, 0.01));
    g.rotation.y = ry;
    add(at(g, x, 0, z), false);
  };
  wains(1.4, ZB + 0.005, 7.2, 0);
  wains(-4.5, ZB + 0.005, 1.0, 0);
  const under = add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), tileMat(1.8)), WX, 0.35, ZB + 0.005), false);
  void under;
  wains(XL + 0.005, 1.4, 10, Math.PI / 2);
  wains(XR - 0.005, 1.4, 10, -Math.PI / 2);
  // the window: night sky + a carved lattice screen in the embrasure
  pal.add(at(new THREE.Mesh(new THREE.PlaneGeometry(4, 5), new THREE.MeshBasicMaterial({ map: nightC(), color: new THREE.Color(0.8, 0.95, 1.15).multiplyScalar(1.7), fog: false })), WX + 0.4, 2.6, ZB - 2.2));
  const latA = screenC(3);
  latA.repeat.set(1.85 / 0.92, 2.9 / 0.92);
  const scrM = new THREE.MeshStandardMaterial({ color: 0x140c06, alphaMap: latA, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide });
  scrM.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <alphamap_fragment>", "diffuseColor.a *= 1.0 - texture2D( alphaMap, vAlphaMapUv ).g;");
  };
  add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.85, 2.9), scrM), WX, 2.1, ZB - 0.3), false, false);

  // moonlight through the lattice: a cool spot with the lattice as its cookie, a shaft, dust and haze
  const moon = new THREE.SpotLight(0x8fb6ff, 1500, 0, 0.17, 0.6, 2);
  moon.target.position.set(-2.5, 0, 0.9);
  moon.position.copy(V(WX, 2.4, ZB)).addScaledVector(V(WX, 2.4, ZB).sub(moon.target.position).normalize(), 4.5);
  moon.map = latticeC(true, 4);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.bias = -0.0015;
  moon.shadow.camera.near = 1;
  pal.add(moon, moon.target);
  const winC = V(WX, 2.3, ZB - 0.2);
  const beam = new BeamCard(winC, winC.clone().lerp(moon.target.position, 0.95), 0.5, 0.85, 0x86aee0, 0.42);
  pal.add(beam.mesh);
  const mDust = dust(T, 420, [2.4, 2.6, 4.2], V(-1.9, 1.4, -1.4), 0x9cc0ff, 0.02, 0.5);
  pal.add(mDust.pts);

  // ---------------- carpet ----------------
  const carpet = at(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: carpetC(), roughness: 0.95, color: 0x9a8a80 })), 0.25, 0.012, 1.1);
  carpet.rotation.y = Math.PI / 2;
  add(carpet, false);

  // ---------------- the bed ----------------
  const wood = pbr(T, "dark_wood", 1, 1, { tint: 0x5a4034, rough: 0.55 });
  const BZ = -0.6;
  add(at(new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.36, 2.0), wood), 0, 0.3, BZ));
  const brocade = pbr(T, "quatrefoil_jacquard_fabric", 3, 2, { tint: 0x8a5a44, rough: 0.9, sheen: 0xb07850, sheenRough: 0.5 });
  add(at(new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.22, 1.86), pbr(T, "quatrefoil_jacquard_fabric", 3, 2, { tint: 0x4a3028, rough: 0.9 })), 0, 0.59, BZ));
  // straight turned posts: a square-ish foot, a slender shaft with three small rings, a finial
  const postProf = [[0.075, 0], [0.075, 0.46], [0.05, 0.52], [0.038, 0.58], [0.038, 0.98], [0.05, 1.02], [0.038, 1.06], [0.036, 1.76], [0.048, 1.8], [0.036, 1.84], [0.034, 2.6], [0.046, 2.64], [0.034, 2.7], [0.03, 2.76]].map(([r, y]) => new THREE.Vector2(r, y));
  const postG = new THREE.LatheGeometry(postProf, 20);
  const finG = new THREE.SphereGeometry(0.06, 14, 10);
  for (const [px, pz] of [[-1.38, BZ - 0.98], [1.38, BZ - 0.98], [-1.38, BZ + 0.98], [1.38, BZ + 0.98]]) {
    add(at(new THREE.Mesh(postG, wood), px, 0, pz));
    add(at(new THREE.Mesh(finG, gold), px, 2.8, pz));
  }
  for (const [bx, bz, w, d] of [[0, BZ - 0.98, 2.84, 0.09], [0, BZ + 0.98, 2.84, 0.09], [-1.38, BZ, 0.09, 2.0], [1.38, BZ, 0.09, 2.0]]) add(at(new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), wood), bx, 2.72, bz));
  // a carved headboard with an arched top
  const hbS = new THREE.Shape();
  hbS.moveTo(-0.95, 0);
  hbS.lineTo(0.95, 0);
  hbS.lineTo(0.95, 0.75);
  hbS.bezierCurveTo(0.7, 0.8, 0.35, 1.0, 0, 1.15);
  hbS.bezierCurveTo(-0.35, 1.0, -0.7, 0.8, -0.95, 0.75);
  hbS.closePath();
  const hb = add(at(new THREE.Mesh(new THREE.ExtrudeGeometry(hbS, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), wood), -1.36, 0.45, BZ));
  hb.rotation.y = Math.PI / 2;
  // heavy velvet drapes: many soft, irregular folds
  const velvet = pbr(T, "velour_velvet", 2, 2, { tint: 0x4a1418, rough: 0.9, sheen: 0x7a3a34, sheenRough: 0.4, side: THREE.DoubleSide });
  const drape = (w: number, h: number, folds: number, depth: number, tie = 0, seed = 0) => {
    const g = new THREE.PlaneGeometry(w, h, Math.max(32, folds * 8), 28);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const v = 0.5 - y / h; // 0 top .. 1 bottom
      let xx = x;
      if (tie) {
        const g2 = Math.exp(-(((v - 0.6) / 0.3) ** 2));
        xx = x * (1 - 0.32 * g2) + tie * (w / 2) * 0.32 * g2;
      }
      const u = x / w;
      const f = Math.sin(u * folds * Math.PI * 2 + seed + 0.6 * Math.sin(u * 7 + seed)) * (0.7 + 0.5 * Math.sin(u * 3.1 + seed * 1.7));
      const pl = f * depth * (0.55 + 0.6 * v) + Math.sin(u * folds * 4.7 + seed * 2) * depth * 0.18;
      p.setXYZ(i, xx, y, pl);
    }
    g.computeVertexNormals();
    return new THREE.Mesh(g, velvet);
  };
  add(at(drape(2.9, 2.55, 11, 0.045, 0, 1), 0, 1.42, BZ - 1.03));
  const cr = add(at(drape(1.1, 2.6, 6, 0.05, 1, 3), 1.44, 1.4, BZ - 0.45));
  cr.rotation.y = -Math.PI / 2;
  for (const [vx, vz, ry, w] of [[0, BZ + 1.02, 0, 2.86], [0, BZ - 1.02, 0, 2.86], [-1.42, BZ, Math.PI / 2, 2.0], [1.42, BZ, Math.PI / 2, 2.0]]) {
    const va = add(at(drape(w, 0.3, 16, 0.018, 0, vx + vz), vx, 2.55, vz));
    va.rotation.y = ry;
  }
  // the canopy: a velvet sheet laid over the top frame, sagging between the rails
  const cg = new THREE.PlaneGeometry(2.9, 2.05, 36, 24);
  const cgp = cg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cgp.count; i++) {
    const x = cgp.getX(i), z = cgp.getY(i);
    const u = x / 1.45, v = z / 1.025;
    const sag = 0.16 * (1 - u * u) * (1 - v * v) + 0.012 * Math.sin(u * 19 + v * 3);
    cgp.setXYZ(i, x, 2.8 - sag, -z);
  }
  cg.computeVertexNormals();
  add(at(new THREE.Mesh(cg, velvet), 0, 0, BZ));
  // window drapes, tied back
  add(at(drape(0.9, 3.8, 5, 0.05, -1, 5), WX - 1.35, 1.9, ZB + 0.08));
  add(at(drape(0.9, 3.8, 5, 0.05, 1, 6), WX + 1.35, 1.9, ZB + 0.08));
  // pillows
  const pillowG = new THREE.SphereGeometry(1, 24, 14);
  for (const [px, py, pz, sx, sy] of [[-1.15, 0.86, BZ - 0.5, 0.42, 0.15], [-1.02, 0.8, BZ, 0.36, 0.07]]) {
    const pm = add(at(new THREE.Mesh(pillowG, brocade), px, py, pz));
    pm.scale.set(0.22, sy, sx);
  }
  // the blanket, draped over the king (rebuilt each frame for his slow, shallow breathing)
  const NU = 72, NW = 44;
  const blG = new THREE.PlaneGeometry(1, 1, NU - 1, NW - 1);
  const blP = blG.attributes.position as THREE.BufferAttribute;
  // an indigo silk coverlet woven with gold (the brocade's relief, a warm sheen)
  const silkN = (T.quatrefoil_jacquard_fabric_nor_gl as THREE.Texture).clone();
  silkN.wrapS = silkN.wrapT = THREE.RepeatWrapping;
  silkN.repeat.set(4, 4);
  silkN.needsUpdate = true;
  const silkR = (T.quatrefoil_jacquard_fabric_rough as THREE.Texture).clone();
  silkR.wrapS = silkR.wrapT = THREE.RepeatWrapping;
  silkR.repeat.set(4, 4);
  silkR.needsUpdate = true;
  const silk = new THREE.MeshPhysicalMaterial({ color: 0x1c2438, normalMap: silkN, roughnessMap: silkR, roughness: 0.75, normalScale: new THREE.Vector2(1.4, 1.4), sheen: 0.6, sheenColor: new THREE.Color(0x8a7050), sheenRoughness: 0.4, side: THREE.DoubleSide });
  add(new THREE.Mesh(blG, silk));
  const body = (x: number, w: number, br: number) => {
    const g = (a: number, s: number) => Math.exp(-(a * a) / (s * s));
    let h = 0.19 * br * g(x + 0.42, 0.32) * g(w, 0.3);
    h += 0.14 * g(x + 0.02, 0.3) * g(w, 0.27);
    h = Math.max(h, 0.1 * g(w - 0.12, 0.1) * (1 - ramp(x, 0.9, 1.1)) * ramp(x, -0.1, 0.25));
    h = Math.max(h, 0.1 * g(w + 0.12, 0.1) * (1 - ramp(x, 0.9, 1.1)) * ramp(x, -0.1, 0.25));
    h += 0.12 * g(x - 1.02, 0.07) * (g(w - 0.12, 0.08) + g(w + 0.12, 0.08));
    return h;
  };
  const buildBlanket = (t: number) => {
    const br = 1 + 0.02 * Math.sin(t * 1.2);
    for (let j = 0; j < NW; j++)
      for (let i = 0; i < NU; i++) {
        const x = lerp(-1.3, 1.62, i / (NU - 1));
        const w = lerp(-1.45, 1.45, j / (NW - 1));
        const aw = Math.abs(w);
        const fold = 0.012 * Math.sin(x * 9 + w * 4) + 0.008 * Math.sin(x * 23 - w * 7);
        let X = Math.min(x, 1.33), Y = 0.72 + body(x, w, br) + fold, Z = BZ + w;
        const over = Math.max(0, aw - 0.93);
        if (over > 0) {
          Z = BZ + Math.sign(w) * (0.95 + 0.03 * over + 0.02 * Math.sin(x * 11 + w));
          Y = 0.72 - over + 0.02 * Math.cos(x * 7);
          X += 0.025 * Math.sin(x * 14 + over * 4);
        }
        if (x > 1.33) {
          Y -= x - 1.33;
          X = 1.335 + 0.02 * Math.sin(w * 12);
        }
        blP.setXYZ(j * NU + i, X, Y, Z);
      }
    blP.needsUpdate = true;
    blG.computeVertexNormals();
  };
  buildBlanket(28);
  // the king, hidden: he lies behind a sheer curtain drawn across the head of the bed. A candle on the far side of
  // the bed throws his profile onto the gauze as a shadow (projected in the gauze's shader from a drawing of him on
  // his own plane), the gauze glows around it; one thin hand hangs off the bed in front of the curtain.
  const BL = V(-0.84, 0.74, BZ - 0.92); // where his shadow is thrown from
  // (the candle itself stays hidden behind him; only its light on the gauze is seen)
  const kingSh = kingShadowC(); // his profile on the plane z = BZ, x in [-1.5, 0.3], y in [0.55, 1.45]
  const sheerU = {
    uSh: { value: kingSh },
    uL: { value: BL.clone() },
    uGC: { value: V(-0.8, 1.18, BZ - 0.75) },
    uPZ: { value: BZ },
    uRect: { value: new THREE.Vector4(-1.5, 0.55, 0.3, 1.45) },
    uPow: { value: 1 },
    uBreath: { value: 0 },
    uGlow: { value: new THREE.Color(0xffa860) },
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  };
  const sheerM = new THREE.ShaderMaterial({
    uniforms: sheerU,
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vP = position + vec3(-0.88, 1.75, ${(BZ + 1.06).toFixed(3)}); vN = normal; vec4 mvPosition = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D uSh; uniform vec3 uL; uniform vec3 uGC; uniform float uPZ; uniform vec4 uRect; uniform float uPow; uniform float uBreath; uniform vec3 uGlow; varying vec3 vP; varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main(){
        float s = (uPZ - uL.z)/(vP.z - uL.z);
        vec2 q = uL.xy + (vP.xy - uL.xy)*s;
        vec2 st = (q - uRect.xy)/(uRect.zw - uRect.xy);
        st.y -= uBreath*(1.0 - smoothstep(0.35, 0.6, st.x))*smoothstep(0.2, 0.5, st.x);
        float sh = (st.x > 0.0 && st.x < 1.0 && st.y > 0.0 && st.y < 1.0) ? texture2D(uSh, st).a : 0.0;
        vec2 d = (vP.xy - uGC.xy)*vec2(1.0, 1.6);
        float glow = uPow/(1.0 + dot(d, d)*3.0);
        // soft edges: gauze, not a screen
        float edge = smoothstep(0.0, 0.12, vUv.x)*smoothstep(1.0, 0.85, vUv.x)*smoothstep(1.0, 0.8, vUv.y);
        float fold = 0.7 + 0.3*abs(normalize(vN).z);
        vec3 col = uGlow*glow*fold*(1.0 - 0.97*sh);
        gl_FragColor = vec4(col*edge, clamp(0.22 + 0.55*glow, 0.0, 0.9)*edge);
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const sheer = drape(1.12, 1.95, 8, 0.035, 0, 9);
  (sheer as THREE.Mesh).material = sheerM;
  sheer.castShadow = false;
  sheer.receiveShadow = false;
  pal.add(at(sheer, -0.88, 1.75, BZ + 1.06));
  // the hand: the forearm slips off the edge of the mattress and hangs, the wrist slack, fingers loosely curled
  // (faintly warmed by the gauze's glow beside it, so it reads against the dark bed)
  const handM = new THREE.MeshStandardMaterial({ color: 0x86685a, roughness: 0.6, emissive: 0x4a2410, emissiveIntensity: 0.8 });
  const armC = new THREE.CatmullRomCurve3([V(-0.56, 0.8, 0.12), V(-0.49, 0.8, 0.36), V(-0.455, 0.72, 0.46), V(-0.47, 0.6, 0.5), V(-0.48, 0.535, 0.505)]);
  const armTube = new THREE.TubeGeometry(armC, 32, 1, 10, false);
  {
    // taper from elbow to wrist
    const pos = armTube.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= 32; i++) {
      const p = armC.getPointAt(i / 32);
      const r = lerp(0.032, 0.019, i / 32);
      for (let j = 0; j <= 10; j++) {
        const k = i * 11 + j;
        pos.setXYZ(k, p.x + (pos.getX(k) - p.x) * r, p.y + (pos.getY(k) - p.y) * r, p.z + (pos.getZ(k) - p.z) * r);
      }
    }
    armTube.computeVertexNormals();
  }
  add(new THREE.Mesh(armTube, handM));
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), handM);
  palm.scale.set(0.038, 0.05, 0.016);
  hand.add(palm);
  for (let f = 0; f < 4; f++) {
    const len = 0.045 + (f === 1 || f === 2 ? 0.01 : 0);
    const fg = new THREE.CapsuleGeometry(0.0068, len, 4, 8);
    fg.translate(0, -len / 2, 0);
    const fm = at(new THREE.Mesh(fg, handM), -0.024 + f * 0.016, -0.045, 0.002);
    fm.rotation.x = 0.35 + f * 0.08;
    hand.add(fm);
  }
  const thumb = at(new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.03, 4, 8), handM), 0.036, -0.012, 0.01);
  thumb.rotation.z = 0.6;
  hand.add(thumb);
  hand.rotation.set(-0.25, 0.4, 0.12);
  add(at(hand, -0.482, 0.49, 0.508));

  // ---------------- props: candelabra, side table, burner, the crown set aside ----------------
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a6434, metalness: 0.85, roughness: 0.32 });
  const standProf = [0.16, 0.14, 0.05, 0.03, 0.045, 0.025, 0.025, 0.05, 0.09, 0.02].map((r, i, a) => new THREE.Vector2(r, (i / (a.length - 1)) * 1.32));
  const standG = new THREE.LatheGeometry(standProf, 16);
  const candleM = new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.5, emissive: 0x1a0c04 });
  const lights: THREE.Vector3[] = [];
  const palF: Flame[] = [];
  const candle = (x: number, y: number, z: number, h: number, size: number, seed: number, cd: number, shadow = false) => {
    add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, h, 10), candleM), x, y + h / 2, z), false);
    const f = new Flame(T, size, seed, cd, 0xff9c48);
    f.position.set(x, y + h, z);
    if (f.light && shadow) {
      f.light.castShadow = true;
      f.light.shadow.mapSize.set(512, 512);
      f.light.shadow.bias = -0.004;
      f.light.shadow.radius = 4;
      f.light.shadow.camera.near = 0.05;
    }
    pal.add(f);
    flames.push(f);
    lights.push(V(x, y + h + size * 0.4, z));
    palF.push(f);
    return f;
  };
  const stand = (x: number, z: number, seed: number, cd: number, shadow = false) => {
    add(at(new THREE.Mesh(standG, brass), x, 0, z));
    candle(x, 1.32, z, 0.16, 0.085, seed, cd, shadow);
    candle(x - 0.12, 1.18, z + 0.02, 0.12, 0.07, seed + 1, 0);
    candle(x + 0.12, 1.18, z - 0.02, 0.12, 0.07, seed + 2, 0);
    add(at(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.05), brass), x, 1.18, z));
  };
  stand(-2.75, -0.45, 700, 8, true);
  stand(2.05, 0.75, 710, 2.5);
  const BX = -2.2, BZb = 0.85;
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.06, 24), wood), BX, 0.56, BZb));
  add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.53, 12), wood), BX, 0.27, BZb));
  candle(BX + 0.2, 0.59, BZb + 0.14, 0.1, 0.05, 720, 5);
  candle(BX + 0.25, 0.59, BZb - 0.04, 0.07, 0.045, 721, 0);
  candle(BX + 0.12, 0.59, BZb + 0.24, 0.13, 0.05, 722, 0);
  // brass incense burner: a footed bowl with a pierced dome
  const burnProf = [[0.0, 0], [0.06, 0], [0.055, 0.015], [0.025, 0.05], [0.03, 0.08], [0.085, 0.11], [0.1, 0.14], [0.095, 0.15], [0.085, 0.16], [0.07, 0.2], [0.04, 0.23], [0.02, 0.245], [0.025, 0.26], [0.008, 0.28]].map(([r, y]) => new THREE.Vector2(r, y));
  add(at(new THREE.Mesh(new THREE.LatheGeometry(burnProf, 24), brass), BX - 0.06, 0.59, BZb - 0.06));
  const SRC = V(BX - 0.06, 0.88, BZb - 0.06);
  const ember = new Flame(T, 0.025, 777, 1.2, 0xff6a20);
  ember.position.copy(SRC).add(V(0, -0.06, 0));
  ember.flame.visible = false;
  pal.add(ember);
  flames.push(ember);
  // the crown, set aside on a cushion at the table's edge: a gold band with low points and red stones
  const cushion = add(at(new THREE.Mesh(pillowG, brocade), BX - 0.12, 0.62, BZb + 0.18));
  cushion.scale.set(0.13, 0.035, 0.13);
  const crown = new THREE.Group();
  const crownM = new THREE.MeshStandardMaterial({ color: 0x9a7030, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  const cp = [new THREE.Vector2(0.07, 0), new THREE.Vector2(0.072, 0.012), new THREE.Vector2(0.071, 0.035), new THREE.Vector2(0.074, 0.042)];
  crown.add(new THREE.Mesh(new THREE.LatheGeometry(cp, 32), crownM));
  const ruby = new THREE.MeshStandardMaterial({ color: 0x6a0810, roughness: 0.12, metalness: 0.3 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    crown.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), crownM), Math.cos(a) * 0.072, 0.05, Math.sin(a) * 0.072));
    crown.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), ruby), Math.cos(a + 0.39) * 0.076, 0.022, Math.sin(a + 0.39) * 0.076));
  }
  crown.rotation.set(0.1, 0.5, -0.07);
  crown.scale.setScalar(1.35);
  add(at(crown, BX - 0.08, 0.66, BZb + 0.24));
  // a glint that runs round the crown on «king»
  const glint = new Board(starC(), 0xffe0a0, 0.3, 0.3, true, 0);
  pal.add(glint);
  const CROWN = V(BX - 0.08 + 0.06, 0.74, BZb + 0.3);
  // a candle in the back niche, a pair on the floor by the far wall, and a hanging brass lantern
  candle(2.82, 1.35, ZB - 0.25, 0.18, 0.06, 730, 1.2);
  candle(3.02, 1.35, ZB - 0.3, 0.12, 0.05, 731, 0);
  candle(1.75, 0, ZB + 0.45, 0.32, 0.06, 740, 1.4);
  candle(1.95, 0, ZB + 0.35, 0.22, 0.055, 741, 0);
  const lantern = new THREE.Group();
  const lProf = [[0.0, 0.0], [0.05, 0.0], [0.11, 0.06], [0.12, 0.16], [0.09, 0.24], [0.04, 0.28], [0.01, 0.34]].map(([r, y]) => new THREE.Vector2(r, y));
  // pierced brass: the flame inside shows through star-shaped holes
  const holes = screenC(3);
  holes.repeat.set(5, 2);
  const lanM = new THREE.MeshStandardMaterial({ color: 0x5a4020, metalness: 0.8, roughness: 0.45, side: THREE.DoubleSide, alphaMap: holes, alphaTest: 0.5 });
  lanM.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <alphamap_fragment>", "diffuseColor.a *= 1.0 - texture2D( alphaMap, vAlphaMapUv ).g;");
  };
  lantern.add(new THREE.Mesh(new THREE.LatheGeometry(lProf, 24), lanM));
  lantern.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.8, 4), brass), 0, 1.24, 0));
  add(at(lantern, 1.7, 2.35, -2.55), false, false);
  const lf = new Flame(T, 0.04, 750, 1.6, 0xffa050);
  lf.position.set(1.7, 2.45, -2.55);
  pal.add(lf);
  flames.push(lf);

  // ---------------- the physician: a silhouette against the moonlit window ----------------
  // (the physician is the grown Jamasp: tunic, sash, small turban, head bowed)
  const doc = new SilFig(jamaspC({ step: 0, bow: 0.7, hands: "low" }), 1.72, { body: 0x050404, shadow: true });
  at(doc, 2.3, 0, -2.3);
  pal.add(doc);

  // ---------------- incense smoke → the serpent ----------------
  const sLights = [lights[6], lights[0], lights[3]];
  // body = a faint soft core + four smoke filaments braided around it (+ puffs); the core thickens into the head
  const serpent = new SmokeTube(170, 18, 0xffc488);
  serpent.u.uEdge.value = 1.7;
  serpent.u.uFadeA.value = 0.02;
  serpent.u.uFadeB.value = 0.0;
  serpent.u.uHead.value = 3.6;
  pal.add(serpent.mesh);
  const fil = [0, 1, 2, 3, 4, 5].map(() => {
    const s = new SmokeTube(150, 8, 0xffcc98);
    s.u.uEdge.value = 1.3;
    s.u.uBreak.value = 0.32;
    s.u.uFadeA.value = 0.03;
    s.u.uFadeB.value = 0.06;
    s.u.uFlow.value = 1.1;
    pal.add(s.mesh);
    return s;
  });
  const zAx = V(0, 0, 1);
  const strands = [0, 1, 2].map(() => {
    const s = new SmokeTube(90, 10, 0xffd8b0);
    s.u.uEdge.value = 1.8;
    s.u.uFadeA.value = 0.01;
    s.u.uFadeB.value = 0.4;
    s.u.uFlow.value = 1.4;
    pal.add(s.mesh);
    return s;
  });
  const NP = 240;
  const puffs = new Puffs(T, NP, c.H, 0xc8b0a0);
  puffs.u.uAmb.value = 0.06;
  pal.add(puffs.pts);
  const tongue = new SmokeTube(24, 6, 0xff8a58);
  tongue.u.uEdge.value = 0.5;
  pal.add(tongue.mesh);
  const eyes = [0, 1].map((k) => {
    const e = new Flame(T, 0.018, 990 + k, 0, 0xff9a28);
    e.flame.visible = false;
    pal.add(e);
    flames.push(e);
    return e;
  });
  // a warm glow gathering in the smoke of the head as it forms
  const headGlow = new Board(T.glow, 0xffc080, 0.8, 0.8, true, 0);
  pal.add(headGlow);
  // the serpent's path (tail at the burner → head over the king's chest, looking down at his face)
  const curve = new THREE.CatmullRomCurve3(
    [
      SRC.clone(),
      V(BX - 0.02, 1.4, BZb - 0.15),
      V(BX + 0.25, 1.9, BZb - 0.45),
      V(-1.25, 2.3, -0.25),
      V(-0.35, 2.48, -0.5),
      V(0.55, 2.4, -0.68),
      V(1.2, 2.02, -0.75),
      V(1.3, 1.56, -0.7),
      V(0.95, 1.32, -0.62),
      V(0.55, 1.36, -0.5),
      V(0.3, 1.55, -0.36),
      V(0.16, 1.72, -0.22),
      V(-0.04, 1.64, -0.08),
    ],
    false,
    "centripetal",
  );
  const LEN = curve.getLength();
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0);
  // plume (before the serpent): a laminar thread that breaks into curls, drifting toward the bed
  const plume = (s: number, t: number, ph: number, spread: number) => {
    const h = s * 1.75;
    const turb = Math.pow(Math.max(0, s - 0.12), 1.3);
    const x = SRC.x + 0.42 * s * s + Math.sin(s * 9 - t * 1.7 + ph) * 0.07 * turb * spread + Math.sin(s * 19 - t * 2.6 + ph * 2) * 0.025 * turb;
    const z = SRC.z - 0.2 * s * s + Math.cos(s * 7.5 - t * 1.4 + ph * 1.3) * 0.06 * turb * spread;
    return V(x, SRC.y + h, z);
  };
  // the head arrives exactly on «her», then turns to the lens
  const front = (t: number) => ease.io(ramp(t, CUE.cure - 0.2, CUE.her));
  const turn = (t: number) => ease.out(ramp(t, CUE.her - 0.04, CUE.her + 0.45));
  const camLocal = V(0, 0, 0);
  const neckB = V(0, 0, 0), neckD = V(0, 0, 1);
  /** serpent body point at arc fraction u (0 tail .. 1 head), with a travelling undulation and the head's rear-up */
  const serp = (u: number, t: number, fr: number) => {
    const uu = Math.min(1, Math.max(0, u));
    const p = curve.getPointAt(uu);
    const tg = curve.getTangentAt(uu, tmpA);
    const nrm = tmpB.set(-tg.y, tg.x, 0).normalize();
    const dh = (fr - u) * LEN; // metres behind the head
    const env = ramp(dh, 0.35, 1.0) * ramp(u, 0.05, 0.2);
    p.addScaledVector(nrm, Math.sin((u * LEN - t * 0.9) * 5.2) * 0.045 * env);
    p.z += Math.cos((u * LEN - t * 0.7) * 3.1) * 0.05 * env;
    // the head swings round to face the lens: the last 0.55 m bends from the neck toward the camera
    const tn = turn(t);
    if (tn > 0 && dh < 0.55) {
      const along = 0.55 - dh;
      const tgt = neckB.clone().addScaledVector(neckD, along * 0.85);
      tgt.y += along * 0.22 - along * along * 0.32;
      p.lerp(tgt, tn * (1 - ramp(dh, 0.3, 0.55)));
    }
    // and it keeps breathing and swaying afterwards
    const sway = ramp(t, CUE.her, CUE.her + 0.4) * Math.exp(-(dh * dh) / 0.4);
    p.y += Math.sin(t * 2.1) * 0.025 * sway;
    p.x += Math.sin(t * 1.3 + 1) * 0.03 * sway;
    return p;
  };
  const radius = (u: number, fr: number) => {
    const dh = (fr - u) * LEN;
    const headR = dh < 0 ? 0 : dh < 0.07 ? lerp(0.03, 0.078, dh / 0.07) : dh < 0.17 ? lerp(0.078, 0.118, (dh - 0.07) / 0.1) : dh < 0.27 ? lerp(0.118, 0.08, (dh - 0.17) / 0.1) : lerp(0.08, 0.1, ramp(dh, 0.27, 0.9));
    return headR * lerp(0.15, 1, ramp(u, 0.0, 0.22));
  };

  const update = (t: number, sh: Shot) => {
    if (!sh.set.includes("palace")) return;
    mDust.tick(t, [0.02, 0.01, 0.04]);
    // «years later»: the room's candlelight comes up out of the moonlit dark, one flame after another; dust hangs
    // in the moonbeam. On «dying» the bedside candle gutters and the whole room drops about a fifth.
    const dim = 1 - 0.2 * ease.io(ramp(t, CUE.dying - 0.05, CUE.dying + 0.3));
    const yrs = (k: number) => lerp(0.08, 1, ease.io(ramp(t, 27.6 + 0.11 * k, 28.4 + 0.09 * k)));
    palF.forEach((f, k) => (f.power = yrs(k % 5) * dim));
    lf.power = yrs(3) * dim;
    ember.power = yrs(2);
    const gut = 1 - 0.78 * Math.max(0, Math.sin(ramp(t, CUE.dying - 0.05, CUE.dying + 0.65) * Math.PI)) * (0.55 + 0.45 * noise1(t * 28, 9));
    sheerU.uPow.value = 1.7 * yrs(1) * dim * gut * (0.88 + 0.12 * noise1(t * 8, 21));
    sheerU.uBreath.value = 0.012 * Math.sin(t * 1.2);
    (mDust.pts.material as THREE.PointsMaterial).opacity = lerp(0.85, 0.5, ramp(t, 27.6, 29));
    // the crown catches the light on «king»
    const gl = hit(t, CUE.king + 0.02, 0.32) + 0.3 * ramp(t, CUE.king - 0.12, CUE.king) * (1 - ramp(t, CUE.king + 0.3, CUE.king + 1.1));
    glint.visible = gl > 0.004;
    glint.position.copy(CROWN);
    glint.material.opacity = Math.min(1, gl);
    glint.scale.setScalar(0.5 + 0.9 * gl);
    glint.face(c.camera);
    glint.rotateZ(0.3 + t * 0.6);
    beam.face(c.camera.position.clone().sub(PAL), t);
    buildBlanket(t);
    doc.face(c.camera);
    doc.rimFrom(V(PAL.x + 2.85, 1.5, ZB - 0.3), c.camera, 0xffa060, 0.6);
    doc.rotation.z = Math.sin(t * 0.9) * 0.004;
    const fr = front(t);
    const form = ramp(t, CUE.cure - 0.3, CUE.cure + 0.3);
    camLocal.copy(c.camera.position).sub(PAL);
    neckB.copy(curve.getPointAt(Math.max(0, fr - 0.55 / LEN)));
    neckD.copy(camLocal).sub(neckB).normalize();
    const wl = sLights.map((l) => l.clone().add(PAL));
    const LK = [0.6, 0.45, 0.2];
    serpent.lights(wl, LK);
    for (const s of [...strands, ...fil]) s.lights(wl, LK);
    puffs.lights(wl, [0.7, 0.55, 0.2]);
    tongue.lights(wl, LK);
    serpent.u.uT.value = t;
    // ---- plume strands: thin, see-through, fading as the serpent takes over
    strands.forEach((s, i) => {
      s.u.uT.value = t + i * 3;
      s.set((u) => plume(u, t, i * 2.1, 1 + i * 0.3), (u) => (0.005 + u * 0.03) * (i ? 0.7 : 1), 0, 1);
      s.u.uOp.value = (i ? 0.1 : 0.16) * (1 - form) * ramp(t, 27.6, 27.9);
      s.mesh.visible = s.u.uOp.value > 0.002;
    });
    // ---- the serpent body: grows out of the burner with its head leading
    serpent.mesh.visible = fr > 0.002;
    if (serpent.mesh.visible) {
      // the head is flatter than it is wide, like a viper's
      serpent.set((u) => serp(u, t, fr), (u) => radius(u, fr), 0, Math.max(fr, 0.01), (u) => lerp(0.62, 1, ramp((fr - u) * LEN, 0.2, 0.45)));
      serpent.u.uLen.value = LEN * fr;
      serpent.u.uOp.value = lerp(0.1, 0.22, ramp(t, CUE.cure, CUE.her)) * ramp(fr, 0, 0.08);
      serpent.u.uHeadL.value = Math.min(1, 0.4 / Math.max(0.05, LEN * fr));
    }
    fil.forEach((s, i) => {
      s.mesh.visible = fr > 0.01;
      if (!s.mesh.visible) return;
      s.u.uT.value = t + i * 1.7;
      s.set(
        (u) => {
          const p = serp(u, t, fr);
          const tg = curve.getTangentAt(Math.min(1, Math.max(0, u)), V(0, 0, 0));
          const n = zAx.clone().cross(tg).normalize();
          const b = tg.clone().cross(n);
          const dh = (fr - u) * LEN;
          const rr = radius(u, fr) * (0.45 + 0.5 * noise1(u * 7 + i * 3.3 + t * 0.3, i)) * ramp(dh, 0.12, 0.5);
          const ph = u * LEN * (3.5 + i * 0.9) + (i * Math.PI) / 3 + t * (0.8 + 0.2 * i) + 2.2 * noise1(u * 5 + i, i + 7);
          // a wisp now and then peels away from the body
          const peel = Math.max(0, noise1(u * 3 + i * 5 + t * 0.25, i + 20) - 0.62) * 0.5 * ramp(dh, 0.6, 1.2);
          return p.addScaledVector(n, Math.cos(ph) * (rr + peel)).addScaledVector(b, Math.sin(ph) * (rr + peel) * 0.8);
        },
        (u) => 0.007 + radius(u, fr) * (0.12 + 0.08 * (i % 3)),
        0,
        Math.max(fr, 0.01),
      );
      s.u.uLen.value = LEN * fr;
      s.u.uOp.value = lerp(0.16, 0.3, ramp(t, CUE.cure, CUE.her)) * ramp(fr, 0, 0.08) * (i % 2 ? 0.75 : 1);
    });
    // ---- the head: two amber ember eyes open as it turns to the lens on «her», a warm glow, a flick of the tongue
    const hp = serp(fr, t, fr);
    const hb = serp(Math.max(0, fr - 0.1 / LEN), t, fr);
    const hdir = hp.clone().sub(hb).normalize();
    const side = hdir.clone().cross(V(0, 1, 0)).normalize();
    const tn = turn(t);
    const eyeOn = tn * (0.75 + 1.4 * hit(t, CUE.her + 0.12, 0.3));
    eyes.forEach((e, k) => {
      e.position.copy(serp(Math.max(0, fr - 0.085 / LEN), t, fr)).addScaledVector(side, (k ? 1 : -1) * 0.048);
      e.position.y += 0.03;
      e.power = eyeOn;
    });
    headGlow.position.copy(hb);
    headGlow.material.opacity = 0.1 * ramp(fr, 0.6, 0.98) + 0.16 * hit(t, CUE.her + 0.1, 0.5);
    headGlow.face(c.camera);
    headGlow.visible = headGlow.material.opacity > 0.003;
    const flick = (a: number) => Math.max(0, Math.sin(ramp(t, a, a + 0.3) * Math.PI));
    const tl = 0.12 * Math.max(flick(CUE.her + 0.35), flick(CUE.her + 0.62));
    tongue.mesh.visible = tl > 0.005;
    if (tongue.mesh.visible) {
      const up = V(0, 1, 0);
      tongue.set(
        (u) => {
          // one tube that runs out along the tongue and back along the second prong of the fork
          const out = u < 0.5 ? u * 2 : 2 - u * 2;
          const prong = u < 0.5 ? -1 : 1;
          const p = hp.clone().addScaledVector(hdir, out * tl).addScaledVector(up, -0.02 * out);
          p.addScaledVector(side, prong * ramp(out, 0.65, 1) * 0.028 + Math.sin(out * 9 + t * 30) * 0.004);
          return p;
        },
        (u) => 0.0055 * (1 - Math.abs(u - 0.5)),
      );
      tongue.u.uOp.value = 1.6;
      tongue.u.uT.value = t;
    }
    // ---- puffs: drifting incense haze, then gathered around the serpent's body
    for (let i = 0; i < NP; i++) {
      const s0 = rnd(i * 3.7), ph = rnd(i * 1.3) * 6.28;
      const life = 3.2 + rnd(i * 5.1) * 2;
      const age = ((((t - 27.0) / life + s0) % 1) + 1) % 1;
      const pp = plume(0.35 + age * 0.65, t, ph, 1.3);
      pp.x += age * age * 0.9 + Math.sin(ph + t * 0.4) * 0.12 * age;
      pp.y += age * 0.35;
      pp.z += Math.cos(ph) * 0.25 * age - age * 0.3;
      let size = 0.1 + age * 0.55, alpha = 0.1 * Math.sin(Math.PI * age) * (0.5 + rnd(i * 9.3));
      const us = rnd(i * 7.7) * 0.97 + 0.02;
      const on = ramp(fr, us - 0.02, us + 0.12) * form;
      if (on > 0) {
        const bp = serp(Math.min(us, fr), t, fr);
        const rr = radius(Math.min(us, fr), fr);
        const k = (i * 2.39996) % 6.283;
        bp.x += Math.cos(k) * rr * 0.9 + Math.sin(t * 0.8 + i) * 0.02;
        // wisps that peel off the body and rise
        bp.y += Math.sin(k) * rr * 0.9 + age * age * 0.28;
        bp.x += Math.sin(ph + t * 0.5) * age * 0.06;
        bp.z += Math.cos(k * 1.7) * rr * 0.6;
        pp.lerp(bp, on);
        size = lerp(size, rr * 3.0 + 0.05 + age * 0.3, on);
        alpha = lerp(alpha, 0.13 * Math.sin(Math.PI * age), on);
      }
      puffs.set(i, pp, size, alpha * ramp(t, 27.6, 28.0), ph + t * 0.25 * (rnd(i) - 0.5));
    }
    puffs.commit(c.camera);
  };

  // ---------------- camera: a slow, low dolly in from the foot of the bed toward the king ----------------
  const camAt = (t: number) => {
    const k = ease.sine(ramp(t, 27.6, 33.3));
    const p = V(lerp(1.7, 0.55, k), lerp(1.35, 1.3, k), lerp(7.0, 4.3, k));
    p.x += (noise1(t * 0.4, 31) - 0.5) * 0.04;
    p.y += (noise1(t * 0.5, 32) - 0.5) * 0.025;
    const l = V(lerp(-0.75, -0.42, k), lerp(1.35, 1.55, k), lerp(-1.2, -0.8, k));
    return { p, l, fov: lerp(40, 37, k) };
  };
  let curT = 27.6;
  const rack = (t: number) => ease.io(ramp(t, CUE.king - 0.2, CUE.king + 0.2)) * (1 - ease.io(ramp(t, CUE.dying - 0.15, CUE.dying + 0.4)));
  const FOG = new THREE.FogExp2(0x0c0a0a, 0.05);
  const shot: Shot = {
    a: 27.6,
    b: 33.3,
    set: ["palace"],
    fog: FOG,
    // focus racks to the crown on «king», then back to the bed
    get focus() {
      const p = camAt(curT).p;
      // the gauze first, then the serpent as it forms over the bed
      const bed = lerp(p.distanceTo(V(-0.7, 1.1, 0.4)), p.distanceTo(V(0.1, 1.7, -0.3)), ease.io(ramp(curT, CUE.cure - 0.3, CUE.her - 0.3)));
      return lerp(bed, p.distanceTo(CROWN), rack(curT));
    },
    get range() {
      return lerp(2.6, 0.9, rack(curT));
    },
    cam: (_k, t) => {
      curT = t;
      const cm = camAt(t);
      return { p: cm.p.add(PAL), l: cm.l.add(PAL), fov: cm.fov };
    },
  };
  return { shots: [shot], update };
};
