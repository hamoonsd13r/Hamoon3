// Well set, part 2: the stone shaft opening into a round domed chamber at the bottom (an old cistern), the hidden
// stone door set in its round wall and the light behind it, the climbing rope and its fall, the honey jar and its haul
// rope, the friends leaning over the rim (seen from below), the boy and his oil lamp.
import * as THREE from "three";
import { CUE, ease, flicker, lerp, noise1, ramp, rnd } from "../lib";
import { Board, Flame, shaft, stone, type Tex } from "../kit";
import { V, type Ctx } from "./common";
import { GLSL_N, patch, resample, ropeTube, sstep } from "./well-env";
import { peekProfile, ropeTex } from "./well-tex";
import { makeBoy } from "./well-boy";

export const FLOOR = -12;
const SHAFT_R = 0.95;
/** the chamber: radius, wall height, oculus height (where the shaft starts) */
export const R_C = 4.0;
const H_W = 2.5, H_D = 4.4;
/** the door surround's front face (a flat stone panel set into the round wall, facing +z) */
export const Z_F = -3.8;
const DOOR = { w: 1.1, spring: 1.38, top: 2.1 };
const GAP = 0.012;
/** shot 3: the boy lies at the bottom looking up */
export const CAM3 = V(-0.3, FLOOR + 0.72, 0.28);

/** a Persian four-centred arch outline (bottom-left → apex → bottom-right), its edge roughened like worn stone */
const archPts = (w: number, hR: number, hT: number, n: number, jit: number) => {
  const h = w / 2, d = hT - hR;
  const s = new THREE.Shape();
  s.moveTo(-h, 0);
  s.lineTo(-h, hR);
  s.bezierCurveTo(-h, hR + d * 0.62, -w * 0.14, hT - d * 0.1, 0, hT);
  s.bezierCurveTo(w * 0.14, hT - d * 0.1, h, hR + d * 0.62, h, hR);
  s.lineTo(h, 0);
  const pts = s.getSpacedPoints(n);
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
    const o = jit * (noise1(i * 0.35, 4) - 0.5 + 0.5 * (noise1(i * 1.7, 9) - 0.5));
    return new THREE.Vector2(p.x - (ty / tl) * o, Math.max(0, p.y + (tx / tl) * o));
  });
};

export const buildShaft = (c: Ctx, T: Tex) => {
  const { mk, flames } = c;
  const shaftSet = mk("shaft");
  const room = mk("room");
  const wallTex = (rx: number, ry: number, tint = 0xc8b090) => stone(T, "large_sandstone_blocks_01", rx, ry, tint);
  const AO: [number, number] = [-7.0, 0.9];

  // ---------------- the shaft (down to the dome's oculus) ----------------
  {
    const top = -0.28, bot = FLOOR + H_D - 0.08, H = top - bot;
    const g = new THREE.CylinderGeometry(SHAFT_R, SHAFT_R, H, 72, 40, true);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const off = 0.018 * Math.sin(a * 5 + y * 0.9) + 0.012 * Math.sin(a * 13 - y * 2.3) + 0.01 * noise1(y * 3 + a * 4, 2);
      p.setXYZ(i, Math.cos(a) * (SHAFT_R + off), y, Math.sin(a) * (SHAFT_R + off));
    }
    g.computeVertexNormals();
    const m = wallTex(4, H / 1.6);
    m.side = THREE.BackSide;
    patch(m, { ao: AO, grade: [-7.5, -1.5, 0.55] });
    const wall = new THREE.Mesh(g, m);
    wall.position.y = (top + bot) / 2;
    wall.receiveShadow = wall.castShadow = true;
    shaftSet.add(wall);
  }

  // ---------------- the round chamber: floor, wall, corbelled dome ----------------
  const floorMat = stone(T, "dry_ground_rocks", 1, 1, 0x7a7068, 1);
  patch(floorMat, { wet: 1, ao: AO });
  {
    const g = new THREE.CircleGeometry(R_C + 0.05, 72).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * 2 * R_C) / 1.5, (uv.getY(i) * 2 * R_C) / 1.5);
    const fl = new THREE.Mesh(g, floorMat);
    fl.position.y = FLOOR;
    fl.receiveShadow = true;
    room.add(fl);
    const wm = wallTex((Math.PI * 2 * R_C) / 1.5, H_W / 1.6);
    wm.side = THREE.BackSide;
    // the doorway is cut through the round wall behind the flat surround
    patch(wm, { ao: AO, cut: `vWP.z < -3.2 && abs(vWP.x) < ${(DOOR.w / 2 + 0.06).toFixed(3)} && vWP.y < ${(FLOOR + DOOR.top + 0.05).toFixed(3)}` });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R_C, R_C, H_W + 0.06, 120, 4, true), wm);
    wall.position.y = FLOOR + H_W / 2;
    wall.receiveShadow = wall.castShadow = true;
    room.add(wall);
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 18; i++) {
      const th = (i / 18) * (Math.PI / 2);
      prof.push(new THREE.Vector2(SHAFT_R + (R_C - SHAFT_R) * Math.cos(th), H_W + (H_D - H_W) * Math.sin(th)));
    }
    const dm = wallTex((Math.PI * 2 * R_C) / 1.5, 3.4 / 1.6);
    dm.side = THREE.BackSide;
    patch(dm, { ao: AO });
    const lg = new THREE.LatheGeometry(prof, 120);
    // the lathe's normals point into the room while its faces face out: flip the normals so BackSide lights correctly
    const nA = lg.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < nA.count; i++) nA.setXYZ(i, -nA.getX(i), -nA.getY(i), -nA.getZ(i));
    const dome = new THREE.Mesh(lg, dm);
    dome.position.y = FLOOR;
    dome.receiveShadow = dome.castShadow = true;
    room.add(dome);
  }

  // ---------------- the door: a flat surround in the round wall, a heavy slab, light behind ----------------
  const doorOut = archPts(DOOR.w, DOOR.spring, DOOR.top, 120, 0.022);
  {
    const s = new THREE.Shape();
    s.moveTo(-1.1, -0.06);
    s.lineTo(1.1, -0.06);
    s.lineTo(1.1, H_W - 0.05);
    s.lineTo(-1.1, H_W - 0.05);
    s.lineTo(-1.1, -0.06);
    s.holes.push(new THREE.Path(archPts(DOOR.w + GAP * 2, DOOR.spring, DOOR.top + GAP, 120, 0.022).map((p, i) => new THREE.Vector2(p.x + (doorOut[i].x - p.x) * 0, p.y))));
    const pm = wallTex(1 / 1.5, 1 / 1.6);
    patch(pm, { ao: AO });
    const panel = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 24 }), pm);
    panel.position.set(0, FLOOR, Z_F - 0.5);
    panel.castShadow = panel.receiveShadow = true;
    room.add(panel);
  }
  const hinge = new THREE.Group();
  hinge.position.set(DOOR.w / 2, FLOOR, Z_F);
  room.add(hinge);
  {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(doorOut), { depth: 0.32, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.006, bevelSegments: 2, curveSegments: 24 });
    const sm = wallTex(1 / 1.5, 1 / 1.6, 0xc4ac8c);
    patch(sm, { ao: AO });
    const slab = new THREE.Mesh(g, sm);
    slab.position.set(-DOOR.w / 2, 0, -0.33);
    slab.castShadow = slab.receiveShadow = true;
    hinge.add(slab);
  }
  // the warm golden space behind the door
  const lightU = { uI: { value: 0 }, uT: { value: 0 } };
  {
    const m = new THREE.ShaderMaterial({
      uniforms: lightU,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uI; uniform float uT; varying vec3 vP;
        ${GLSL_N}
        void main(){ float n = 0.8 + 0.2 * wfbm(vP.xy * 1.5 + vec2(uT * 0.3, 0.0));
          float core = exp(-dot(vP.xy - vec2(0.0, -0.4), vP.xy - vec2(0.0, -0.4)) * 0.4);
          gl_FragColor = vec4(vec3(1.0, 0.56, 0.17) * uI * n * (0.5 + 1.0 * core), 1.0); }`,
      side: THREE.BackSide,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 4), m);
    box.position.set(0, FLOOR + 1.6, Z_F - 0.5 - 2.0);
    room.add(box);
  }
  // light leaking round the slab: an uneven glow in the joint, wide where the stone has chipped, rays fanning out
  const seamU = { uK: { value: 0 }, uFlood: { value: 0 }, uT: { value: 0 }, uReveal: { value: 0 } };
  {
    const seamPts = doorOut.map((p) => V(p.x, p.y, 0));
    const seamLen: number[] = [0];
    for (let i = 1; i < seamPts.length; i++) seamLen.push(seamLen[i - 1] + seamPts[i].distanceTo(seamPts[i - 1]));
    const total = seamLen[seamLen.length - 1];
    const pos: number[] = [], sA: number[] = [], vA: number[] = [];
    const rays: number[] = [], rs: number[] = [], rv: number[] = [];
    const n = seamPts.length;
    for (let i = 0; i < n; i++) {
      const p = seamPts[i];
      const a = seamPts[Math.max(0, i - 1)], b = seamPts[Math.min(n - 1, i + 1)];
      const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      const s = seamLen[i] / total;
      const w = 0.03;
      pos.push(p.x - nx * w * 0.5, p.y - ny * w * 0.5, 0.005, p.x + nx * w, p.y + ny * w, 0.005);
      sA.push(s, s);
      vA.push(0, 1);
      const L = 0.45 + 0.45 * rnd(i * 7.1);
      rays.push(p.x + nx * 0.01, p.y + ny * 0.01, 0.012, p.x + nx * L * 0.6, p.y + ny * L * 0.6, L);
      rs.push(s, s);
      rv.push(0, 1);
    }
    const mkStrip = (P: number[], S: number[], Vv: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute("aS", new THREE.Float32BufferAttribute(S, 1));
      g.setAttribute("aV", new THREE.Float32BufferAttribute(Vv, 1));
      const idx: number[] = [];
      for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      g.setIndex(idx);
      return g;
    };
    const head = `attribute float aS; attribute float aV; varying float vS; varying float vV;
      void main(){ vS = aS; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const common = `uniform float uK; uniform float uFlood; uniform float uT; uniform float uReveal; varying float vS; varying float vV;
      ${GLSL_N}
      // how much light gets through the joint here (0 = tight, ~1 = a chipped gap), how wide the gap is
      float leak(float s){
        float l = 0.22 + 0.78 * smoothstep(0.3, 0.85, wn2(vec2(s * 14.0, 3.0))) * (0.55 + 0.45 * wn2(vec2(s * 5.0, 7.0)));
        l += 0.7 * smoothstep(0.88, 0.98, wn2(vec2(s * 55.0, 1.0)));
        return l;
      }
      float reveal(float s){
        float d = min(s, 1.0 - s) * 2.0;
        return (1.0 - smoothstep(uReveal * 1.1 - 0.12, uReveal * 1.1, d)) * step(0.001, uReveal);
      }`;
    const strip = new THREE.Mesh(
      mkStrip(pos, sA, vA),
      new THREE.ShaderMaterial({
        uniforms: seamU,
        vertexShader: head,
        fragmentShader: `${common} void main(){
          float l = leak(vS), k = reveal(vS) * uK;
          // a hairline where the joint is tight, a wider soft glow where it gapes
          float w = 0.05 + 0.35 * clamp(l, 0.0, 1.0);
          float across = exp(-pow((vV - 0.33) / w, 2.0));
          float flick = 0.88 + 0.12 * sin(uT * 19.0 + vS * 70.0);
          gl_FragColor = vec4(vec3(1.0, 0.48, 0.14) * k * l * across * flick * 3.4, 1.0); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    const rayMesh = new THREE.Mesh(
      mkStrip(rays, rs, rv),
      new THREE.ShaderMaterial({
        uniforms: seamU,
        vertexShader: head,
        fragmentShader: `${common} void main(){
          float l = leak(vS), k = reveal(vS) * uK;
          float st = (0.2 + 0.8 * wn2(vec2(vS * 120.0, vV * 2.0 - uT * 0.5))) * smoothstep(0.25, 0.8, l);
          float a = k * pow(clamp(1.0 - vV, 0.0, 1.0), 2.0) * st;
          gl_FragColor = vec4(vec3(1.0, 0.5, 0.18) * a * 0.45, 1.0); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    const seamG = new THREE.Group();
    seamG.add(strip, rayMesh);
    seamG.position.set(0, FLOOR, Z_F);
    room.add(seamG);
  }
  // dust hanging in the rays from the cracks, then swirling in the flood
  const dustU = { uT: { value: 0 }, uK: { value: 0 }, uFlood: { value: 0 }, uH: { value: c.H } };
  {
    const N = 3200;
    const a = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) a.set([(rnd(i * 2 + 1) - 0.5) * 3.0, rnd(i * 2 + 5) * 2.6, rnd(i * 3 + 9) ** 1.8 * 3.4, rnd(i * 5 + 2)], i * 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aS", new THREE.BufferAttribute(a, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: dustU,
      vertexShader: `attribute vec4 aS; uniform float uT; uniform float uK; uniform float uFlood; uniform float uH; varying float vB;
        float sdDoor(vec2 p){ float h = ${(DOOR.w / 2).toFixed(3)};
          if (p.y < ${DOOR.spring.toFixed(3)}) return abs(p.x) - h;
          return length(vec2(p.x / h, (p.y - ${DOOR.spring.toFixed(3)}) / ${(DOOR.top - DOOR.spring).toFixed(3)})) * h - h; }
        void main(){
          float sw = uFlood * 0.25;
          vec3 p = vec3(aS.x + (0.12 + sw) * sin(uT * (0.31 + sw) + aS.w * 20.0), mod(aS.y + uT * (0.02 + 0.05 * aS.w) * (aS.w > 0.5 ? 1.0 : -1.0), 2.6), aS.z + (0.08 + sw) * sin(uT * 0.23 + aS.w * 11.0));
          float sd = sdDoor(p.xy);
          float crack = exp(-abs(sd) * 5.0 - p.z * 1.2) * uK * 2.4;
          float beam = exp(-max(sd, 0.0) * 1.5 - p.z * 0.2) * uFlood;
          vB = (crack + beam * 1.2) * (0.45 + 0.55 * sin(uT * 2.0 + aS.w * 60.0));
          vec4 mv = modelViewMatrix * vec4(p.x, p.y + ${FLOOR.toFixed(2)}, ${Z_F.toFixed(3)} + p.z + 0.03, 1.0);
          gl_PointSize = clamp(0.006 * projectionMatrix[1][1] * uH * 0.5 / -mv.z, 1.0, 6.0);
          vB *= smoothstep(0.8, 2.2, -mv.z);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vB; void main(){ float d = length(gl_PointCoord - 0.5); float a = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * a * vB, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    room.add(pts);
  }
  // the wet floor below the door catching its light
  const glintU = { uK: { value: 0 }, uFlood: { value: 0 } };
  {
    const m = new THREE.ShaderMaterial({
      uniforms: glintU,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uK; uniform float uFlood; varying vec2 vUv;
        void main(){ float x = abs(vUv.x - 0.5) * 2.0; float a = (1.0 - smoothstep(0.0, 1.0, x)) * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.5);
          gl_FragColor = vec4(vec3(1.0, 0.55, 0.2) * a * (uK * 0.35 + uFlood * 1.6), 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.6).rotateX(-Math.PI / 2), m);
    q.geometry.translate(0, 0, -1.3);
    q.position.set(0, FLOOR + 0.004, Z_F);
    q.rotation.y = Math.PI;
    room.add(q);
  }
  // a beam of dusty golden light pouring out of the opening door
  const beam = shaft(4.4, 0.4, 0.95, 0xffb060, 0);
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0.12, FLOOR + 1.0, Z_F + 0.02);
  room.add(beam);
  // the cool column of dusk light falling from the oculus
  const oculusRay = shaft(H_D, 0.86, 1.12, 0x9aa8bc, 0);
  oculusRay.position.set(0, FLOOR + H_D, 0);
  room.add(oculusRay);

  // ---------------- lights ----------------
  const seamLight = new THREE.PointLight(0xffb070, 0, 0, 2);
  seamLight.position.set(0.05, FLOOR + 1.1, Z_F + 0.35);
  const flood = new THREE.SpotLight(0xffb468, 0, 0, 0.7, 0.85, 2);
  flood.position.set(0.25, FLOOR + 1.3, Z_F - 1.4);
  flood.target.position.set(0.2, FLOOR + 0.2, Z_F + 6);
  flood.castShadow = true;
  flood.shadow.mapSize.set(1024, 1024);
  flood.shadow.bias = -0.0008;
  flood.shadow.normalBias = 0.02;
  flood.shadow.camera.near = 0.3;
  flood.shadow.camera.far = 14;
  flood.shadow.radius = 5;
  const cool = new THREE.SpotLight(0x8098c0, 0, 0, 0.36, 0.6, 2);
  cool.position.set(0, FLOOR + H_D - 0.1, 0);
  cool.target.position.set(0, FLOOR, 0);
  room.add(seamLight, flood, flood.target, cool, cool.target);

  // ---------------- the boy and his lamp ----------------
  const B = makeBoy();
  const { boy, headG, armL, armR } = B;
  const lampG = new THREE.Group();
  lampG.position.set(0, -0.25, -0.02);
  const clay = new THREE.MeshStandardMaterial({ color: 0x6a4028, roughness: 0.8 });
  const lampBody = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), clay);
  lampBody.scale.set(1.2, 0.55, 0.9);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 10).rotateZ(Math.PI / 2), clay);
  spout.position.set(0.0, 0.01, -0.065);
  spout.rotation.y = Math.PI / 2;
  lampG.add(lampBody, spout);
  const flame = new Flame(T, 0.05, 5, 7, 0xffa050);
  flame.position.set(0, 0.022, -0.1);
  flame.light!.castShadow = true;
  flame.light!.shadow.mapSize.set(512, 512);
  flame.light!.shadow.camera.near = 0.05;
  flame.light!.shadow.camera.far = 16;
  flame.light!.shadow.bias = -0.003;
  flame.light!.shadow.radius = 5;
  lampG.add(flame);
  armR.el.add(lampG);
  flames.push(flame);
  room.add(boy);

  // ---------------- ropes, jar ----------------
  const rTex = ropeTex();
  const ropeMat = new THREE.MeshStandardMaterial({ map: rTex, bumpMap: rTex, bumpScale: 3, roughness: 1, color: 0x4e3e30 });
  patch(ropeMat, { ao: AO });
  const climb = new THREE.Mesh(new THREE.BufferGeometry(), ropeMat);
  climb.castShadow = true;
  const haul = new THREE.Mesh(new THREE.BufferGeometry(), ropeMat);
  shaftSet.add(climb, haul);
  // the honey jar: a clay amphora tied by the neck, honey glistening at the lip, a drip hanging and falling
  const jar = new THREE.Group();
  const honeyU = { uT: { value: 0 } };
  {
    const prof2 = [[0.0, -0.04], [0.025, -0.04], [0.04, 0.0], [0.09, 0.07], [0.12, 0.16], [0.118, 0.24], [0.085, 0.31], [0.04, 0.35], [0.032, 0.43], [0.045, 0.47], [0.068, 0.49], [0.05, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
    const jm = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.7 });
    const body = new THREE.Group();
    body.add(new THREE.Mesh(new THREE.LatheGeometry(prof2, 28), jm));
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.013, 6, 16, Math.PI * 1.2), jm);
      h.position.set(sx * 0.06, 0.37, 0);
      h.rotation.z = sx > 0 ? -1.0 : Math.PI + 1.0;
      body.add(h);
    }
    const amber = new THREE.MeshStandardMaterial({ color: 0x3a1a04, emissive: 0xff8a1c, emissiveIntensity: 1.6, roughness: 0.15 });
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.013, 8, 20), amber);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.49;
    const sheen = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), amber);
    sheen.scale.set(1, 0.4, 1);
    sheen.position.y = 0.495;
    body.add(lip, sheen);
    body.position.set(0, -0.48, 0);
    body.rotation.z = 1.0;
    body.name = "jarBody";
    jar.add(body);
    // the drip hangs straight down from the tilted lip, a drop swells and falls
    const dripM = new THREE.ShaderMaterial({
      uniforms: honeyU,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ gl_FragColor = vec4(vec3(1.0, 0.55, 0.12) * (1.3 + 0.6 * vUv.y), 1.0); }`,
    });
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 1, 6), dripM);
    strand.name = "strand";
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), dripM);
    drop.name = "drop";
    const fall = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), dripM);
    fall.name = "fall";
    jar.add(strand, drop, fall);
  }
  shaftSet.add(jar);

  // climbing rope: knotted on the rim, down the shaft wall, through the oculus and down to a coil on the floor
  const TH = -0.85;
  const cx = Math.cos(TH), cz = Math.sin(TH);
  const PILE = V(0.42, FLOOR, -0.38);
  const ocu = V(cx * 0.88, FLOOR + H_D, cz * 0.88);
  const climbPath = resample(
    [V(cx * 1.2, 1.12, cz * 1.2), V(cx * 0.97, 1.1, cz * 0.97), V(cx * 0.9, 0.85, cz * 0.9), V(cx * 0.89, -3, cz * 0.89), V(cx * 0.89, FLOOR + H_D + 0.3, cz * 0.89), ocu, V(lerp(ocu.x, PILE.x, 0.85), FLOOR + 1.0, lerp(ocu.z, PILE.z, 0.85)), V(PILE.x, FLOOR + 0.03, PILE.z)],
    0.12,
  );
  const climbLen = climbPath.length * 0.12;
  /** a rope coil on the floor: loose loops laid round and round, piling a little, with a few stray turns */
  const coil = (len: number, first: THREE.Vector3, at: THREE.Vector3, settle: number) => {
    const out: THREE.Vector3[] = [first];
    const n = Math.max(0, Math.floor(len / 0.06));
    for (let i = 0; i < n; i++) {
      const turns = i / 18;
      const L = Math.floor(turns);
      const r = 0.13 + 0.07 * Math.min(1, turns / 6) + 0.035 * Math.sin(L * 2.1) + 0.02 * Math.sin(turns * 9.0);
      const a = turns * Math.PI * 2 + L * 0.7;
      const off = V(0.05 * Math.sin(L * 1.3), 0, 0.05 * Math.cos(L * 1.9));
      const lift = 0.02 + Math.min(0.13, L * 0.018) * Math.max(0, 1 - Math.hypot(Math.cos(a) * r, Math.sin(a) * r) / 0.35) + 0.012 * Math.sin(a * 3 + L);
      out.push(V(at.x + Math.cos(a) * r + off.x, FLOOR + lift * settle + 0.016, at.z + Math.sin(a) * r * 0.9 + off.z));
    }
    return out;
  };
  // the dust puff where the rope lands
  const puffTex = (() => {
    const cv2 = document.createElement("canvas");
    cv2.width = cv2.height = 128;
    const x = cv2.getContext("2d")!;
    for (let i = 0; i < 14; i++) {
      const px = 64 + (rnd(i + 80) - 0.5) * 50, py = 64 + (rnd(i + 90) - 0.5) * 40, r = 18 + rnd(i + 70) * 26;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(cv2);
  })();
  const puffs: Board[] = [];
  for (let i = 0; i < 9; i++) {
    const b = new Board(puffTex, 0x4e3c2e, 0.5, 0.4, false, 0);
    b.material.depthWrite = false;
    room.add(b);
    c.boards.push(b);
    puffs.push(b);
  }

  // ---------------- the friends leaning over the rim, in profile against the sky (shot 3) ----------------
  // camera-facing cut-outs, turned so the shoulders point away from the centre of the sky circle and the heads lean in
  const profs = ([[2.35, 0, 1], [0.7, 1, -1], [TH + 0.32, 2, 1]] as const).map(([th, kind, flip]) => {
    const { tex, pts } = peekProfile(kind);
    const m = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uDir: { value: new THREE.Vector2(-1, 0) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec2 uDir; varying vec2 vUv;
        void main(){ vec4 s = texture2D(uMap, vUv); if (s.g < 0.5) discard;
          // a thin warm edge only on the side toward the sunset glow
          float b = texture2D(uMap, vUv + uDir * 0.012).r;
          float rim = (1.0 - smoothstep(0.3, 0.75, b)) * (1.0 - smoothstep(0.6, 0.92, s.r));
          gl_FragColor = vec4(vec3(0.006, 0.005, 0.005) + vec3(0.6, 0.32, 0.16) * rim * 0.45, 1.0); }`,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.scale.set(1.12 * flip, 1.12, 1);
    shaftSet.add(mesh);
    return { mesh, th, kind, pts };
  });
  const canvasToWorld = (mesh: THREE.Mesh, cxp: number, cyp: number) => V(cxp / 512 - 0.5, 0.5 - cyp / 512, 0).applyMatrix4(mesh.matrixWorld);
  const handW = V(0, 0, 0), tipW = V(0, 0, 0);
  // where the haul rope comes up to the second friend's hands
  const HAND = V(Math.cos(0.7) * 0.6, 1.2, Math.sin(0.7) * 0.6);
  // a glint on the blade as it bites through
  const glint = new Board(T.glow, 0xfff2dc, 0.35, 0.35, true, 0);
  shaftSet.add(glint);
  c.boards.push(glint);
  const star = new Board(T.glow, 0xffffff, 0.9, 0.06, true, 0);
  shaftSet.add(star);

  // dust motes in the shaft, lit by the sky (shot 3)
  const motesU = { uT: { value: 0 }, uB: { value: 1 }, uH: { value: c.H } };
  let motes: THREE.Points | null = null;
  // warm bounce from the lamp on the floor up into the dome and the lower shaft (his own POV shot)
  const bounce = new THREE.PointLight(0xff9a50, 0, 0, 2);
  bounce.position.set(-0.1, FLOOR + 1.8, 0.1);
  const bounce2 = new THREE.PointLight(0xff9a50, 0, 0, 2);
  bounce2.position.set(0.1, FLOOR + H_D - 0.2, -0.1);
  shaftSet.add(bounce, bounce2);
  {
    const N = 520;
    const a = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const r = Math.sqrt(rnd(i + 1)) * 0.85, an = rnd(i + 2) * Math.PI * 2;
      a.set([Math.cos(an) * r, FLOOR + 2 + rnd(i + 3) * 12.5, Math.sin(an) * r, rnd(i + 4)], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aS", new THREE.BufferAttribute(a, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: motesU,
      vertexShader: `attribute vec4 aS; uniform float uT; uniform float uB; uniform float uH; varying float vB;
        void main(){ vec3 p = aS.xyz + vec3(0.05 * sin(uT * 0.4 + aS.w * 30.0), -uT * 0.03 * (0.3 + aS.w), 0.05 * cos(uT * 0.37 + aS.w * 17.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vB = uB * smoothstep(${(FLOOR + 2).toFixed(1)}, -2.0, p.y) * (0.4 + 0.6 * aS.w);
          gl_PointSize = clamp(0.008 * projectionMatrix[1][1] * uH * 0.5 / -mv.z, 1.0, 6.0);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vB; void main(){ float a = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(vec3(0.7, 0.8, 0.9) * a * vB * 0.22, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    motes = new THREE.Points(g, m);
    motes.frustumCulled = false;
    shaftSet.add(motes);
  }

  // ---------------- per-frame ----------------
  const tc = CUE.cut;
  const V0 = 3, G = 30;
  const tLand = tc + (-V0 + Math.sqrt(V0 * V0 + 2 * G * climbLen)) / G;
  const boyPose = (t: number) => {
    if (t < 6.95) {
      // under the oculus, looking up, the lamp held at his side
      boy.position.set(-0.12, FLOOR, 0.12);
      boy.rotation.set(0, 0.6, 0);
      headG.rotation.set(0.7 + 0.05 * Math.sin(t * 0.8), 0.1, 0);
      armR.sh.rotation.set(0.45, 0, 0.22);
      armR.el.rotation.set(0.6, 0, 0);
      armL.sh.rotation.set(-0.1, 0, -0.1);
      armL.el.rotation.set(0.2, 0, 0);
      lampG.rotation.set(-1.05, 0, 0);
      return;
    }
    if (t < 10.65) {
      // his own point of view: only the lamp, set on the floor beside him
      boy.position.set(-0.75, FLOOR - 0.37, 0.65);
      boy.rotation.set(0, 2.2, 0);
      armR.sh.rotation.set(0.05, 0, 0.05);
      armR.el.rotation.set(0.05, 0, 0);
      lampG.rotation.set(0, 0, 0);
      return;
    }
    // at the round wall: he holds the lamp up to the stones, then steps back as light starts to leak
    const lift = ease.io(ramp(t, 10.85, 11.5));
    const back = ease.io(ramp(t, CUE.door + 0.15, CUE.door + 0.9));
    const step = ease.io(ramp(t, 12.9, 13.7));
    const walk = ease.io(ramp(t, 12.55, 13.25));
    boy.position.set(lerp(-0.78 - 0.05 * back, -0.14, walk), FLOOR + 0.012 * Math.abs(Math.sin(walk * Math.PI * 3)), lerp(Z_F + 0.75 + 0.35 * back, Z_F + 1.25, walk) - 0.1 * step);
    boy.rotation.set(0, lerp(0.45 - 0.32 * back, 0.05, walk) + 0.02 * Math.sin(t * 0.7), 0);
    const breathe = 0.01 * Math.sin(t * 2.2);
    headG.rotation.set(-0.1 - 0.12 * lift + 0.2 * back + breathe, -0.25 + 0.22 * back, 0);
    armR.sh.rotation.set(lerp(0.4, 1.5, lift) - 0.4 * back, 0, lerp(0.18, 0.32, lift));
    armR.el.rotation.set(lerp(0.5, 0.35, lift) + 0.3 * back, 0, 0);
    lampG.rotation.set(-lerp(0.9, 1.7, lift) + 0.4 * back, 0, 0);
    armL.sh.rotation.set(0.08 + 0.35 * back, 0, -0.12 - 0.12 * back);
    armL.el.rotation.set(0.25 + 0.6 * back, 0, 0);
  };

  const update = (t: number, set: string[]) => {
    const inShaft = set.includes("shaft"), inRoom = set.includes("room");
    if (!inShaft && !inRoom) return;
    boyPose(t);
    B.showBody(t < 6.95 || t >= 10.65);
    flame.power = t < 6.95 ? 1.5 : t < 10.65 ? 1 : lerp(0.8, 0.35, ramp(t, 12.9, 13.4));

    // the climbing rope
    let pts: THREE.Vector3[];
    if (t < tc) {
      // a little slack: the hanging rope bows away from the wall and sways
      pts = climbPath.map((p) => {
        if (p.y > 0.6 || p.y < FLOOR + 0.1) return p;
        const s = (0.6 - p.y) / (0.6 - FLOOR);
        const bow = Math.sin(Math.PI * Math.min(1, s * 1.6)) * (0.06 + 0.03 * Math.sin(t * 0.9));
        const sway = 0.035 * Math.sin(t * 1.1 + s * 5) * s;
        return V(p.x * (1 - bow / 0.9) + sway, p.y, p.z * (1 - bow / 0.9) - sway * 0.6);
      });
      pts = [...pts, ...coil(1.4, pts[pts.length - 1], PILE, 1).slice(1)];
    } else {
      // cut: the rope slides down its own path; its free end lashes out across the shaft and comes down at the lens
      const dt = t - tc;
      const drop = V0 * dt + 0.5 * G * dt * dt;
      const shift = Math.min(climbPath.length, Math.round(drop / 0.12));
      const hang = climbPath.slice(shift);
      const whip = Math.min(1, dt * 4);
      const bent = hang.map((p, i) => {
        if (i >= 34) return p;
        const k = (1 - i / 34) ** 1.5 * whip;
        // the loose end swings toward the boy (the camera), then down past him
        const toward = V(CAM3.x + 0.07, p.y, CAM3.z + 0.05);
        const q = p.clone().lerp(toward, k * 0.97);
        q.x += 0.12 * k * Math.sin(dt * 14 + i * 0.4);
        q.z += 0.12 * k * Math.cos(dt * 11 + i * 0.3);
        q.y += 0.2 * k;
        return q;
      }).filter((p) => p.y > FLOOR + 0.05);
      const fallen = Math.min(climbLen, drop);
      const end = bent.length ? bent[bent.length - 1] : V(PILE.x, FLOOR + 0.03, PILE.z);
      pts = [...bent, ...coil(1.4 + fallen, end, PILE, 1).slice(1)];
    }
    ropeTube(climb, pts, 0.016);
    // the dust puff as the coil lands
    const pk = t - tLand;
    puffs.forEach((b, i) => {
      const k = Math.max(0, pk) / 0.9;
      const a = (i / puffs.length) * Math.PI * 2 + 0.4;
      b.visible = pk > 0 && pk < 0.9;
      const ex = ease.out(Math.min(1, k * 1.6));
      b.position.set(PILE.x + Math.cos(a) * 0.32 * ex, FLOOR + 0.05 + 0.1 * k + 0.04 * (i % 3), PILE.z + Math.sin(a) * 0.28 * ex);
      b.scale.setScalar(0.4 + 1.1 * k);
      b.material.opacity = 0.55 * (1 - k) ** 1.5 * Math.min(1, pk * 14);
    });

    // the friends lean in on «friends», the knife comes for the rope, they withdraw after the cut
    const cen = V(0, 1.1, 0).project(c.camera);
    const asp = c.camera.aspect;
    let handOn = false;
    profs.forEach((pf, i) => {
      const inK = ease.out(ramp(t, CUE.friends - 0.1 + i * 0.3, CUE.friends + 0.7 + i * 0.3));
      const outK = ease.in(ramp(t, tc + 0.3 + i * 0.22, tc + 0.95 + i * 0.22));
      const k = pf.kind === 2 ? ease.out(ramp(t, 8.85, 9.25)) * (1 - ease.in(ramp(t, tc + 0.15, tc + 0.6))) : inK * (1 - outK);
      pf.mesh.visible = t > 6.95 && t < tLand - 0.04 && k > 0.01;
      if (!pf.mesh.visible) return;
      const saw = pf.kind === 2 ? 0.025 * Math.sin(t * 38) * ramp(t, 9.1, 9.3) : 0;
      const R = lerp(1.5, 0.82, k) + 0.012 * Math.sin(t * 1.7 + i) + saw;
      const th = pf.th + 0.015 * Math.sin(t * 0.8 + i * 2);
      pf.mesh.position.set(Math.cos(th) * R, 1.16, Math.sin(th) * R);
      pf.mesh.quaternion.copy(c.camera.quaternion);
      const q = pf.mesh.position.clone().project(c.camera);
      const dx = (q.x - cen.x) * asp, dy = q.y - cen.y;
      const al = Math.atan2(dx, -dy) + 0.06 * Math.sin(t * 1.1 + i);
      pf.mesh.rotateZ(al);
      // screen-left (the warm side of the sky) in the cut-out's own uv frame
      const flip = Math.sign(pf.mesh.scale.x);
      ((pf.mesh.material as THREE.ShaderMaterial).uniforms.uDir.value as THREE.Vector2).set(-Math.cos(al) * flip, Math.sin(al));
      pf.mesh.updateMatrixWorld();
      if (pf.pts.hand) {
        handW.copy(canvasToWorld(pf.mesh, pf.pts.hand[0], pf.pts.hand[1]));
        handOn = k > 0.6;
      }
      if (pf.pts.tip) tipW.copy(canvasToWorld(pf.mesh, pf.pts.tip[0], pf.pts.tip[1]));
    });
    // the honey jar on its haul rope (shot 3)
    const rise = ease.io(ramp(t, 7.0, 9.0));
    const take = ease.io(ramp(t, 9.0, 9.4));
    const jy = lerp(-3.4, 0.55, rise) + 0.6 * take;
    const sw = 0.07 * Math.sin(t * 2.4) * (1 - rise * 0.6);
    jar.position.set(lerp(0.05, HAND.x * 0.9, rise) + sw + take * HAND.x * 0.6, jy, lerp(0.05, HAND.z * 0.9, rise) + 0.05 * Math.cos(t * 1.9) + take * HAND.z * 0.6);
    jar.rotation.set(0.1 * Math.sin(t * 2.0), t * 0.35, 0.08 * Math.sin(t * 2.4 + 1) + take * 0.5);
    jar.visible = t > 6.95 && t < 9.55;
    haul.visible = jar.visible;
    if (jar.visible) {
      jar.updateMatrixWorld(true);
      const lip = V(0, 0.5, 0).applyMatrix4((jar.getObjectByName("jarBody") as THREE.Object3D).matrixWorld);
      const len = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(t * 3.1));
      const strand = jar.getObjectByName("strand") as THREE.Mesh, drop = jar.getObjectByName("drop") as THREE.Mesh, fall = jar.getObjectByName("fall") as THREE.Mesh;
      const inv = new THREE.Matrix4().copy(jar.matrixWorld).invert();
      // strand and drop hang straight down in world space
      const top = lip.clone(), bot = lip.clone().add(V(0, -len, 0));
      const mid = top.clone().lerp(bot, 0.5).applyMatrix4(inv);
      strand.position.copy(mid);
      strand.scale.set(1, len, 1);
      strand.quaternion.copy(jar.quaternion).invert();
      drop.position.copy(bot.clone().applyMatrix4(inv));
      const ph = (t * 0.9) % 1;
      fall.visible = ph < 0.55;
      fall.position.copy(bot.clone().add(V(0, -ph * ph * 6, 0)).applyMatrix4(inv));
      const H2 = handOn ? handW : HAND;
      ropeTube(haul, [V(jar.position.x, jar.position.y - 0.02, jar.position.z), V(lerp(jar.position.x, H2.x, 0.5) + 0.02, lerp(jar.position.y, H2.y, 0.5), lerp(jar.position.z, H2.z, 0.5)), H2.clone()], 0.011);
    }
    honeyU.uT.value = t;
    // the glint on the blade
    const gk = Math.exp(-(((t - (tc - 0.05)) / 0.06) ** 2));
    glint.visible = star.visible = gk > 0.02 && profs[2].mesh.visible;
    glint.position.copy(tipW);
    star.position.copy(tipW);
    star.quaternion.copy(c.camera.quaternion);
    star.rotateZ(0.6);
    glint.material.opacity = Math.min(1, gk * 1.5);
    star.material.opacity = Math.min(1, gk * 1.2);
    // light
    motesU.uT.value = t;
    if (motes) motes.visible = t >= 6.95 && t < 10.65;
    bounce.intensity = t >= 6.95 && t < 10.65 ? 7 * flicker(t, 5) : 0;
    bounce2.intensity = t >= 6.95 && t < 10.65 ? 2.2 * flicker(t, 5) : 0;
    motesU.uB.value = t < 9.9 ? 1 : lerp(1, 0.25, ramp(t, 9.9, 10.6));
    cool.intensity = t < 6.95 ? 1.2 : t < 10.65 ? 0.6 : lerp(110, 6, ramp(t, 12.6, 13.2));
    const ou = (oculusRay.material as THREE.ShaderMaterial).uniforms;
    ou.uOp.value = t < 10.65 ? 0.05 : 0.07;
    ou.uT.value = t;
    // the door: leaks on «door», grinds open on «behind it»
    const reveal = ramp(t, CUE.door - 0.12, CUE.door + 0.6);
    const seamK = sstep(CUE.door - 0.15, CUE.door + 0.25, t) * (0.85 + 0.35 * ramp(t, 11.9, 13.0)) * (0.92 + 0.08 * noise1(t * 7, 3));
    const open = ease.io(ramp(t, 13.0, 13.85)) * 0.75;
    const fl = sstep(12.98, 13.55, t);
    seamU.uK.value = seamK;
    seamU.uReveal.value = t < CUE.door - 0.12 ? 0 : reveal;
    seamU.uT.value = t;
    seamU.uFlood.value = fl;
    hinge.rotation.y = -open - 0.015 * ramp(t, 12.9, 13.0);
    hinge.position.z = Z_F - 0.04 * ramp(t, 12.82, 12.98) + 0.005 * Math.sin(t * 60) * (ramp(t, 12.82, 12.95) - ramp(t, 13.5, 13.8));
    lightU.uI.value = seamK * 1.1 + fl * 1.5;
    lightU.uT.value = t;
    dustU.uT.value = t;
    dustU.uK.value = seamK;
    dustU.uFlood.value = fl;
    glintU.uK.value = seamK;
    glintU.uFlood.value = fl;
    seamLight.intensity = seamK * 1.4 + fl * 2.5;
    flood.intensity = fl * 70;
    const bu = (beam.material as THREE.ShaderMaterial).uniforms;
    bu.uOp.value = fl * 0.4;
    bu.uT.value = t;
    beam.visible = t > 12.95;
  };
  return { update, tLand, PILE };
};
