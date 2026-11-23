// Hollow Moon 3D · the hall inside the moon: a hollow sphere lined with tiers of gothic arcades (one instanced bay, about
// six thousand times), meridian ribs, strings of small lights, a glass oculus at the top, a gilded floor at the bottom
// and four rose windows. Everything faces the core at the centre, which lights it.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HALL, fbm3, rng } from "./util";

const D2R = Math.PI / 180;
const BAY_W = 3.4, BAY_H = 4.55, LAT_MAX = 62;

function tag(g: THREE.BufferGeometry, m: number) {
  const ng = g.index ? g.toNonIndexed() : g;
  const n = ng.getAttribute("position").count;
  ng.setAttribute("aM", new THREE.Float32BufferAttribute(new Float32Array(n).fill(m), 1));
  // keep only what every part shares
  for (const k of Object.keys(ng.attributes)) if (!["position", "normal", "uv", "aM"].includes(k)) ng.deleteAttribute(k);
  return ng;
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: number) => tag(new THREE.BoxGeometry(w, h, d).translate(x, y, z), m);

/** pointed (equilateral) window: width w, sill y0, springing line ys */
function lancet(w: number, y0: number, ys: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, y0);
  s.lineTo(w / 2, y0);
  s.lineTo(w / 2, ys);
  s.absarc(-w / 2, ys, w, 0, Math.PI / 3, false);
  s.absarc(w / 2, ys, w, (Math.PI * 2) / 3, Math.PI, false);
  s.lineTo(-w / 2, y0);
  return s;
}

/** one bay, local frame: x along the tier, y up the meridian, z towards the centre of the hall. aM: 0 wall, 1 gold, 2 window, 3 bronze */
function bayGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // back wall
  parts.push(tag(new THREE.PlaneGeometry(BAY_W + 0.06, BAY_H + 0.06), 0));
  // the window and its moulded frame
  const win = new THREE.ShapeGeometry(lancet(1.5, -1.25, 0.55), 10).translate(0, 0, 0.06);
  parts.push(tag(win, 2));
  const fr = lancet(1.94, -1.47, 0.55);
  fr.holes.push(lancet(1.5, -1.25, 0.55));
  parts.push(tag(new THREE.ExtrudeGeometry(fr, { depth: 0.24, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, 0.03), 1));
  parts.push(box(0.055, 2.9, 0.07, 0, 0.1, 0.11, 1), box(1.5, 0.055, 0.07, 0, 0.45, 0.11, 1), box(1.9, 0.12, 0.34, 0, -1.5, 0.2, 1));
  // one column per bay (the neighbour brings the other), with base and capital
  const col = new THREE.CylinderGeometry(0.115, 0.135, 2.05, 10, 1).translate(-BAY_W / 2, -1.03, 0.98);
  parts.push(tag(col, 1), box(0.36, 0.2, 0.36, -BAY_W / 2, -1.97, 0.98, 3), box(0.4, 0.22, 0.4, -BAY_W / 2, 0.09, 0.98, 1));
  // the arcade arch springing from the capitals
  {
    const ys = 0.2, ro = 2.1, ri = 1.9, cx = 0.4, ao = Math.atan2(Math.sqrt(ro * ro - cx * cx), cx), ai = Math.atan2(Math.sqrt(ri * ri - cx * cx), cx);
    const s = new THREE.Shape();
    s.moveTo(BAY_W / 2, ys);
    s.absarc(-cx, ys, ro, 0, ao, false);
    s.absarc(cx, ys, ro, Math.PI - ao, Math.PI, false);
    s.lineTo(-BAY_W / 2 + 0.2, ys);
    s.absarc(cx, ys, ri, Math.PI, Math.PI - ai, true);
    s.absarc(-cx, ys, ri, ai, 0, true);
    s.lineTo(BAY_W / 2, ys);
    parts.push(tag(new THREE.ExtrudeGeometry(s, { depth: 0.26, bevelEnabled: false, curveSegments: 9 }).translate(0, 0, 0.85), 3));
  }
  // gallery floor, its gilded edge, the balustrade
  parts.push(box(BAY_W + 0.04, 0.2, 2.1, 0, -2.17, 1.05, 3), box(BAY_W + 0.04, 0.075, 0.07, 0, -2.1, 2.1, 1), box(BAY_W + 0.04, 0.07, 0.08, 0, -1.3, 2.02, 1));
  for (let i = 0; i < 7; i++) parts.push(box(0.05, 0.76, 0.05, -BAY_W / 2 + ((i + 0.5) / 7) * BAY_W, -1.69, 2.02, 1));
  return mergeGeometries(parts, false)!;
}

export const HALL_GLSL = /* glsl */ `
float h11h(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }`;

export type HallOpts = { breach: THREE.Vector3; br: number; shared: Record<string, THREE.IUniform> };
export type HallRig = { group: THREE.Group; mats: THREE.MeshStandardMaterial[]; bays: number; lights: number; setEnv: (t: THREE.Texture, k: number) => void };

export function buildHall(o: HallOpts): HallRig {
  const group = new THREE.Group();
  const mats: THREE.MeshStandardMaterial[] = [];
  const rand = rng(91404);
  const Bd = o.breach;
  /** true where the hall is broken away (a little inside the opening of the crust, with a ragged edge) */
  const broken = (d: THREE.Vector3) => {
    const th = Math.acos(THREE.MathUtils.clamp(d.dot(Bd), -1, 1)) / D2R;
    return th < o.br - 3 + 9 * fbm3(d.x * 2.3 + 1.7, d.y * 2.3, d.z * 2.3, 3) + 3 * fbm3(d.x * 9, d.y * 9 + 4, d.z * 9, 2);
  };
  const roses: THREE.Vector3[] = [];
  for (let k = 0; k < 4; k++) {
    const lat = (k % 2 === 0 ? 13 : -15) * D2R, lon = (38 + k * 90) * D2R;
    const rd = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
    if (rd.angleTo(Bd) / D2R > o.br + 16) roses.push(rd);
  }
  const ROSE_R = 8.6, roseAng = Math.asin((ROSE_R + 1.6) / HALL);

  // ── the bays
  const bay = bayGeometry();
  const tiers = Math.floor((2 * LAT_MAX * D2R * HALL) / BAY_H);
  /** tiers that open a double-height arcade with the tier above, and tiers that are blind friezes */
  const GRAND = new Set([6, 17, 24, 35]), BLIND = new Set([3, 12, 21, 29, 39]);
  const dLat = (2 * LAT_MAX * D2R) / tiers;
  const mats4: THREE.Matrix4[] = [], info: number[] = [], lightPos: number[] = [], lightCol: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), east = new THREE.Vector3(), north = new THREE.Vector3(), inward = new THREE.Vector3(), p = new THREE.Vector3();
  const basis = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let ti = 0; ti < tiers; ti++) {
    let lat = -LAT_MAX * D2R + (ti + 0.5) * dLat, cl = Math.cos(lat), sl = Math.sin(lat);
    if (GRAND.has(ti - 1)) continue;
    const grand = GRAND.has(ti), blind = BLIND.has(ti);
    if (grand) { lat += dLat / 2; cl = Math.cos(lat); sl = Math.sin(lat); }
    const n = Math.max(12, Math.round((2 * Math.PI * HALL * cl) / (BAY_W * (grand ? 2 : 1))));
    const tierK = 0.7 + 0.6 * rand();
    const off = (ti % 2) * 0.5 + rand() * 0.2;
    for (let j = 0; j < n; j++) {
      const lon = ((j + off) / n) * Math.PI * 2;
      dir.set(cl * Math.cos(lon), sl, cl * Math.sin(lon));
      if (broken(dir)) continue;
      if (roses.some((r) => r.angleTo(dir) < roseAng)) continue;
      east.crossVectors(up, dir).normalize();          // along the tier
      north.crossVectors(dir, east).normalize();       // up the meridian
      inward.copy(dir).negate();
      // right-handed frame (x, y, z) = (-east, north, inward)
      basis.makeBasis(east.clone().negate(), north, inward);
      q.setFromRotationMatrix(basis);
      const w = (2 * Math.PI * HALL * cl) / n;
      sc.set(w / BAY_W, grand ? 2 : 1, grand ? 1.7 : 1);
      p.copy(dir).multiplyScalar(HALL + 1.5);
      mats4.push(new THREE.Matrix4().compose(p, q, sc));
      const r1 = rand(), r2 = rand();
      // a pier: the bay on either side of a meridian rib is blind
      const ru = (lon / (2 * Math.PI)) * 12 - 0.5, pier = !grand && Math.abs(ru - Math.round(ru)) * ((2 * Math.PI) / 12) * HALL * cl < BAY_W * 0.95;
      // districts: whole quarters of the hall are bright, others nearly asleep
      const district = 0.22 + 1.35 * THREE.MathUtils.smoothstep(fbm3(dir.x * 2.7 + 4.1, dir.y * 2.7 - 1.3, dir.z * 2.7 + 0.6, 3), -0.22, 0.26);
      const level = (r1 < (grand ? 0.06 : 0.24) ? 0.02 : (grand ? 0.8 : 0.3) + 1.25 * r2 * r2) * (grand ? 1 : tierK) * district;
      // most rooms are lit, some brighter, some dark; a few cooler
      info.push(blind || pier ? 0.0 : Math.min(level, 1.9), rand() < 0.08 ? 1 : rand() * 0.35, rand(), grand ? 1 : blind || pier ? 2 : 0);
      // a small lamp on the balustrade at the column
      const lp = p.clone().addScaledVector(inward, grand ? 3.5 : 2.06).addScaledVector(north, grand ? -2.4 : -1.2).addScaledVector(east, (w / 2) * 0.98);
      lightPos.push(lp.x, lp.y, lp.z);
      const lk = 0.6 + 0.8 * rand();
      lightCol.push(1.0 * lk, 0.78 * lk, 0.5 * lk);
    }
  }
  const bayMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 1 });
  bayMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, o.shared);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aM; attribute vec4 aBay; varying float vM; varying vec4 vBay; varying vec3 vL;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvM = aM; vBay = aBay; vL = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${HALL_GLSL}\nuniform float uTime; uniform vec4 uHallK; uniform float uPulse; varying float vM; varying vec4 vBay; varying vec3 vL;`)
      .replace("#include <normal_fragment_maps>", /* glsl */ `
        {
          float mId = floor(vM + 0.5);
          float kindB = floor(vBay.w + 0.5);
          if (mId < 0.5) {            // wall: dark panelled timber, a gilded lozenge on the blind friezes
            float pan = step(0.04, fract(vL.x * 1.9 + 0.5)) * step(0.03, fract(vL.y * 1.3));
            diffuseColor.rgb = vec3(0.07, 0.038, 0.02) * (0.5 + 0.5 * pan);
            metalnessFactor = 0.0; roughnessFactor = 0.62;
            if (kindB > 1.5) {
              float lz = abs(vL.x) * 0.9 + abs(vL.y) * 0.62;
              float gl = (1.0 - smoothstep(0.02, 0.05, abs(lz - 0.95))) + (1.0 - smoothstep(0.02, 0.045, abs(lz - 0.4)));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.66, 0.27), clamp(gl, 0.0, 1.0));
              metalnessFactor = clamp(gl, 0.0, 1.0);
            }
          } else if (mId < 1.5) {     // gilding (worn)
            diffuseColor.rgb = vec3(0.92, 0.62, 0.24) * uHallK.z * (0.7 + 0.3 * h11h(floor(vBay.z * 97.0)));
            metalnessFactor = 1.0; roughnessFactor = 0.34 + 0.16 * h11h(floor(vBay.z * 41.0) + 3.0);
          } else if (mId < 2.5) {     // the lit room behind the glass
            float lv = vBay.x * (0.9 + 0.1 * sin(uTime * (0.6 + vBay.z) + vBay.z * 40.0));
            float gy = smoothstep(-1.4, 1.8, vL.y);
            vec3 warm = mix(vec3(1.0, 0.56, 0.2), vec3(1.0, 0.8, 0.5), gy);
            float litR = step(uHallK.y, h11h(vBay.z * 311.7 + 0.37));
            vec3 cool = vec3(0.62, 0.78, 1.0);
            vec3 c = mix(warm, cool, step(0.9, vBay.y)) * (0.75 + 0.5 * vBay.y);
            // curtains and shelves hinted by soft vertical bands
            float bands = 0.72 + 0.28 * sin(vL.x * 9.0 + vBay.z * 30.0) * sin(vL.y * 3.1 + vBay.z * 11.0);
            totalEmissiveRadiance += c * (lv * 3.0 * uHallK.x * uPulse * mix(0.04, 1.0, litR) * bands * (0.55 + 0.45 * (1.0 - gy))) * (kindB > 1.5 ? 0.0 : 1.0);
            diffuseColor.rgb = vec3(0.01);
            metalnessFactor = 0.0; roughnessFactor = 0.15;
          } else {                    // bronze stonework
            diffuseColor.rgb = vec3(0.3, 0.175, 0.085) * uHallK.w * (0.85 + 0.3 * h11h(floor(vBay.z * 53.0)));
            metalnessFactor = 0.1; roughnessFactor = 0.58;
          }
        }`);
  };
  mats.push(bayMat);
  const bays = new THREE.InstancedMesh(bay, bayMat, mats4.length);
  mats4.forEach((m, i) => bays.setMatrixAt(i, m));
  bays.instanceMatrix.needsUpdate = true;
  bay.setAttribute("aBay", new THREE.InstancedBufferAttribute(new Float32Array(info), 4));
  bays.frustumCulled = false;
  bays.receiveShadow = true;
  group.add(bays);

  // ── the wall behind (seen only in gaps and at the broken rim)
  {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.028, 0.015), roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide });
    const uni = { uBreachH: { value: Bd }, uBRH: { value: o.br } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vHd;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvHd = normalize(position);");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uBreachH; uniform float uBRH; varying vec3 vHd;")
        .replace("#include <normal_fragment_maps>", /* glsl */ `
          {
            vec3 d = normalize(vHd);
            float th = acos(clamp(dot(d, uBreachH), -1.0, 1.0)) * 57.29578;
            float edge = uBRH - 1.5 + 7.0 * sin(d.x * 6.1 + d.y * 3.7) * sin(d.z * 5.3 + d.x * 2.9) + 2.5 * sin(d.y * 23.0 + d.z * 17.0);
            if (th < edge) discard;
          }`);
    };
    mats.push(m);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(HALL + 1.62, 40), m);
    shell.frustumCulled = false;
    group.add(shell);
  }

  // ── meridian ribs
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.92, 0.64, 0.26), roughness: 0.36, metalness: 1 });
  mats.push(gold);
  const NR = 12;
  {
    const arc = 2 * (LAT_MAX + 1.5) * D2R;
    const g = new THREE.TorusGeometry(HALL - 0.75, 0.36, 6, 150, arc);
    const ribs = new THREE.InstancedMesh(g, gold, NR);
    let n = 0;
    for (let k = 0; k < NR; k++) {
      const lon = ((k + 0.5) / NR) * Math.PI * 2;
      // the arc of a torus runs in the xy plane from angle 0: turn it to start at the bottom, then about y to its longitude
      const m = new THREE.Matrix4().makeRotationY(-lon).multiply(new THREE.Matrix4().makeRotationZ(-arc / 2));
      // skip ribs whose middle lies in the opening
      const mid = new THREE.Vector3(Math.cos(lon), 0, Math.sin(lon));
      if (mid.angleTo(Bd) / D2R < o.br * 0.55) continue;
      ribs.setMatrixAt(n++, m);
      for (let i = 0; i <= 96; i++) {
        const lat = (-LAT_MAX + (i / 96) * 2 * LAT_MAX) * D2R;
        const d = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        if (broken(d)) continue;
        lightPos.push(d.x * (HALL - 1.2), d.y * (HALL - 1.2), d.z * (HALL - 1.2));
        lightCol.push(1.25, 1.02, 0.7);
      }
    }
    ribs.count = n;
    ribs.instanceMatrix.needsUpdate = true;
    ribs.frustumCulled = false;
    ribs.receiveShadow = true;
    group.add(ribs);
  }

  // ── oculus (top) and the gilded floor (bottom): spherical caps with drawn glazing bars / inlay
  for (const top of [true, false]) {
    const capAng = (90 - LAT_MAX - 0.4) * D2R;
    const g = new THREE.SphereGeometry(HALL + 0.6, 96, 28, 0, Math.PI * 2, 0, capAng);
    if (!top) g.rotateX(Math.PI);
    const m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uTop: { value: top ? 1 : 0 }, uCap: { value: capAng }, ...o.shared },
      vertexShader: /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTop; uniform float uCap; uniform float uTime;
        varying vec3 vD;
        float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
        void main(){
          vec3 d = normalize(vD);
          float r = acos(clamp(abs(d.y), 0.0, 1.0)) / uCap;      // 0 at the pole, 1 at the collar
          float a = atan(d.z, d.x) / 6.2831853 + 0.5;
          float nb = r > 0.5 ? 48.0 : 24.0;
          float da = (0.5 - abs(fract(a * nb) - 0.5)) * max(r, 0.1) * 62.4 / nb, dr = (0.5 - abs(fract(r * 9.0) - 0.5)) * 0.42;
          float lead = 1.0 - smoothstep(0.006, 0.016, min(da, dr));
          vec3 gold = vec3(1.0, 0.72, 0.3) * 0.9;
          vec3 col;
          if (uTop > 0.5) {
            // night-blue glass with a few rose and amber panes, stars beyond
            vec2 id = vec2(floor(a * nb), floor(r * 9.0));
            float hs = h21(id);
            vec3 glass = mix(vec3(0.012, 0.035, 0.16), vec3(0.03, 0.09, 0.36), hs * hs);
            float st = step(0.9965, h21(floor(vec2(a * 900.0, r * 220.0)))) * 5.0;
            col = glass * (0.9 + 0.2 * sin(uTime * 0.4 + hs * 20.0)) + vec3(0.8, 0.9, 1.0) * st;
            col = mix(col, gold * 0.55, lead);
            float boss = 1.0 - smoothstep(0.05, 0.07, r);
            col = mix(col, gold * 1.1, boss);
          } else {
            // floor: dark stone with a gilded compass rose
            float star = abs(fract(a * 16.0) - 0.5) * 2.0;
            float pt = 1.0 - smoothstep(0.0, 0.05, abs(star - r) - 0.02);
            col = mix(vec3(0.045, 0.03, 0.022), gold * 0.8, max(lead, pt * step(r, 0.92)));
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const cap = new THREE.Mesh(g, m);
    cap.frustumCulled = false;
    group.add(cap);
    // the collar and its lights
    const lat = (top ? 1 : -1) * LAT_MAX * D2R, cr = (HALL - 0.2) * Math.cos(lat), cy = (HALL - 0.2) * Math.sin(lat);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(cr, 0.95, 10, 200), gold);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = cy;
    collar.receiveShadow = true;
    group.add(collar);
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const d = new THREE.Vector3(Math.cos(a) * (cr - 1.4), cy - Math.sign(lat) * 0.6, Math.sin(a) * (cr - 1.4));
      if (broken(d.clone().normalize())) continue;
      lightPos.push(d.x, d.y, d.z);
      lightCol.push(1.5, 1.2, 0.8);
    }
  }

  // ── rose windows
  {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...o.shared },
      vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime;
        varying vec2 vP;
        void main(){
          float r = length(vP) / ${ROSE_R.toFixed(2)};
          float a = atan(vP.y, vP.x);
          if (r > 1.0) discard;
          vec3 gold = vec3(1.0, 0.72, 0.3);
          vec3 col = vec3(0.02);
          float lead = 0.0;
          // hub
          float hub = 1.0 - smoothstep(0.1, 0.115, r);
          // inner ring of twelve petals, outer ring of twenty-four
          for (int k = 0; k < 2; k++) {
            float n = k == 0 ? 12.0 : 24.0, r0 = k == 0 ? 0.14 : 0.52, r1 = k == 0 ? 0.5 : 0.86;
            float t = (r - r0) / (r1 - r0);
            float s = abs(fract(a / 6.2831853 * n + (k == 0 ? 0.0 : 0.5)) - 0.5) * 2.0;     // 0 at the petal axis
            float wdt = sin(clamp(t, 0.0, 1.0) * 3.14159) * 0.82 + 0.06;                   // petal outline
            float inside = step(0.0, t) * step(t, 1.0) * step(s, wdt);
            float id = floor(a / 6.2831853 * n + (k == 0 ? 0.0 : 0.5));
            vec3 glass = k == 0 ? mix(vec3(0.1, 0.25, 1.0), vec3(0.35, 0.6, 1.0), fract(id * 0.37)) : mix(vec3(1.0, 0.32, 0.38), vec3(0.2, 0.42, 1.0), step(0.5, fract(id * 0.5)));
            col = mix(col, glass * (1.6 + 0.5 * sin(uTime * 0.5 + id)), inside);
            lead = max(lead, step(0.0, t) * step(t, 1.0) * (1.0 - smoothstep(0.0, 0.07, abs(s - wdt))));
          }
          // roundels in the rim
          float rn = abs(fract(a / 6.2831853 * 24.0) - 0.5) * 2.0;
          float rd = length(vec2((rn) * 0.13, r - 0.93));
          col = mix(col, vec3(1.0, 0.4, 0.3) * 1.8, 1.0 - smoothstep(0.03, 0.037, rd));
          lead = max(lead, 1.0 - smoothstep(0.0, 0.012, abs(r - 0.51)));
          lead = max(lead, 1.0 - smoothstep(0.0, 0.014, abs(r - 0.875)));
          lead = max(lead, smoothstep(0.965, 0.975, r));
          col = mix(col, gold * 0.75, clamp(lead, 0.0, 1.0));
          col = mix(col, gold * 1.6, hub);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const disc = new THREE.InstancedMesh(new THREE.CircleGeometry(ROSE_R, 96), m, roses.length);
    const rim = new THREE.InstancedMesh(new THREE.TorusGeometry(ROSE_R + 0.35, 0.5, 10, 96), gold, roses.length);
    roses.forEach((r, i) => {
      const pos = r.clone().multiplyScalar(HALL + 0.9);
      const mm = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(), up).setPosition(pos);
      // lookAt builds a frame whose -z points at the target: the disc (facing +z) must face the centre
      mm.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      disc.setMatrixAt(i, mm);
      rim.setMatrixAt(i, mm);
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        const lp = new THREE.Vector3(Math.cos(a) * (ROSE_R + 1.15), Math.sin(a) * (ROSE_R + 1.15), 0.4).applyMatrix4(mm);
        lightPos.push(lp.x, lp.y, lp.z);
        lightCol.push(1.4, 1.1, 0.75);
      }
    });
    disc.frustumCulled = false; rim.frustumCulled = false;
    group.add(disc, rim);
  }

  // ── strings of small lights (points that keep a minimum size, so far ones still glitter)
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(lightPos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(lightCol, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPx: o.shared.uPx, uTime: o.shared.uTime, uPulse: o.shared.uPulse, uSize: { value: 0.3 } },
      vertexShader: /* glsl */ `
        uniform float uPx; uniform float uSize; uniform float uTime; uniform float uPulse;
        attribute vec3 color; varying vec3 vC;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float px = uSize * uPx / max(-mv.z, 0.1);
          float tw = 0.85 + 0.15 * sin(uTime * 1.7 + position.x * 3.1 + position.y * 2.3);
          // below a pixel and a half the lamp keeps its size and dims instead
          float k = min(px / 1.6, 1.0);
          gl_PointSize = max(px, 1.6);
          vC = color * (3.6 * tw * k * k * uPulse);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        precision highp float; varying vec3 vC;
        void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(vC * (1.0 - smoothstep(0.55, 1.0, r)), 1.0); }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    group.add(pts);
  }
  const setEnv = (t: THREE.Texture, k: number) => { for (const m of mats) { m.envMap = t; m.envMapIntensity = k; m.needsUpdate = true; } };
  return { group, mats, bays: mats4.length, lights: lightPos.length / 3, setEnv };
}
