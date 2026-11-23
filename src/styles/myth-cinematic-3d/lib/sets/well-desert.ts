// Well set, part 1: the dusk sky, seif dunes with baked long shadows, a far ruined iwan, drifting sand, the well head
// (rim, frame, pulley, rope, stones, sand around it) and the three friends as backlit silhouettes.
import * as THREE from "three";
import { ease, lerp, ramp, rnd } from "../lib";
import { stone } from "../kit";
import { V, type Ctx } from "./common";
import { GLSL_HAZE, GLSL_N, HZ, patch, ropeTube, sstep } from "./well-env";
import { boyHang, man, ropeTex } from "./well-tex";

/** the push-in camera of shot 1 starts/ends here; the sun is placed on the dune line seen from CAM_MID */
export const CAM_A = V(3.2, 1.05, 34), CAM_B = V(2.3, 1.3, 25);
const CAM_MID = V(2.75, 1.02, 29.5);
const SUN_AZ = -0.245; // radians, left of −z: the sun sets to the left of the well, beside the friend with the staff

// ---------------- terrain ----------------
const LAM = 120;
const warp = (z: number) => 26 * (Math.sin(z / 210 + 0.4) - Math.sin(0.4)) + 12 * (Math.sin(z / 83 + 2.1) - Math.sin(2.1));
// the ridges run diagonally across the view, so the low sun lights one flank and the other lies in shadow
const ROT = 0.42, cR = Math.cos(ROT), sR = Math.sin(ROT);
export const duneH = (x: number, z: number) => {
  const xr = x * cR - z * sR, zr = x * sR + z * cR;
  const u0 = (xr - warp(zr)) / LAM;
  const u = u0 - Math.floor(u0);
  const cr = 0.6; // crest position across the dune (asymmetric: the slip face is the short side)
  const tri = u < cr ? u / cr : (1 - u) / (1 - cr);
  const k = Math.min(1, Math.max(0, (tri - 0.28) / 0.72));
  const amp = 14 + 5 * Math.sin(zr / 260 + xr / 500 + 1) + 3.5 * Math.sin(zr / 97 - xr / 150);
  let h = amp * (0.7 * k ** 1.7 + 0.3 * k);
  // secondary transverse dunes on the flanks and small undulation of the corridor floor
  h += (0.75 * Math.sin((zr + 9 * Math.sin(xr / 37) + 5 * Math.sin(xr / 13 + zr / 50)) / 21) + 0.35 * Math.sin((zr * 0.8 + xr * 0.55) / 11 + Math.sin(xr / 23))) * k ** 0.7 * (1 - 0.5 * k);
  const r = Math.hypot(x, z);
  const floor = sstep(10, 34, r);
  h += floor * (0.45 * Math.sin(x / 9 + z / 17) + 0.35 * Math.sin(z / 7.5 - x / 23) + 0.6 * Math.sin(x / 31 - z / 41));
  // the erg rises far away
  h += sstep(160, 900, -z) * (7 + 5 * Math.sin(x / 170 + 0.7));
  return h;
};

const GRID = 1024, EXT = 1350;
const heightGrid = () => {
  const g = new Float32Array(GRID * GRID);
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) g[j * GRID + i] = duneH(-EXT + (2 * EXT * i) / (GRID - 1), -EXT + (2 * EXT * j) / (GRID - 1));
  const at = (x: number, z: number) => {
    const fx = ((x + EXT) / (2 * EXT)) * (GRID - 1), fz = ((z + EXT) / (2 * EXT)) * (GRID - 1);
    if (fx < 0 || fz < 0 || fx >= GRID - 1 || fz >= GRID - 1) return 0;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = g[j * GRID + i], b = g[j * GRID + i + 1], c = g[(j + 1) * GRID + i], d = g[(j + 1) * GRID + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
  return at;
};

/** elevation (rad) of the dune line seen from p along azimuth az */
const horizonElev = (at: (x: number, z: number) => number, p: THREE.Vector3, az: number) => {
  const sx = Math.sin(az), sz = -Math.cos(az);
  let best = -1;
  for (let d = 5; d < 1300; d += 1 + d * 0.01) best = Math.max(best, Math.atan2(at(p.x + sx * d, p.z + sz * d) - p.y, d));
  return best;
};

export const buildDesert = (c: Ctx) => {
  const { T, mk } = c;
  const at = heightGrid();
  // the sun sits on the dune line: its centre a little above the crest, the lower part hidden
  const SUN_R = 0.017;
  const elev = horizonElev(at, CAM_MID, SUN_AZ) + SUN_R * 0.25;
  const sunDir = V(Math.sin(SUN_AZ) * Math.cos(elev), Math.sin(elev), -Math.cos(SUN_AZ) * Math.cos(elev)).normalize();
  // the light itself comes from a touch higher than the disc, so the sand at the camera's feet still catches it
  const elevL = elev + 0.024;
  const lightDir = V(Math.sin(SUN_AZ) * Math.cos(elevL), Math.sin(elevL), -Math.cos(SUN_AZ) * Math.cos(elevL)).normalize();
  HZ.wSun.value.copy(sunDir);

  // ---------------- sky ----------------
  const sky = mk("sky");
  const skyU = { uDim: { value: 1 }, uWell: { value: 0 }, uT: { value: 0 }, uSunR: { value: SUN_R }, uCloudDim: { value: 1 } };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { ...HZ, ...skyU },
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uDim; uniform float uWell; uniform float uT; uniform float uSunR; uniform float uCloudDim; varying vec3 vD;
      ${GLSL_N}
      ${GLSL_HAZE}
      void main(){
        vec3 d = normalize(vD); float e = max(d.y, 0.0);
        float s = max(dot(d, wSun), 0.0);
        vec3 hor = wHazeCol(d);
        // dusk grade: the warm horizon gives way to a dusty band, then a deep teal-blue
        vec3 mid = vec3(0.04, 0.036, 0.048);
        vec3 zen = vec3(0.004, 0.018, 0.032);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.1, e));
        c = mix(c, zen, smoothstep(0.05, 0.24, e));
        // the glow climbing above the sun
        c += vec3(0.5, 0.15, 0.03) * pow(s, 16.0) * (1.0 - smoothstep(0.0, 0.17, e));
        c += vec3(0.9, 0.26, 0.04) * pow(s, 700.0) * 1.1;
        // thin streaks of altostratus, lit from below near the sun
        float az = atan(d.x, -d.z);
        vec2 q = vec2(az * 3.0 + uT * 0.004, e * 46.0);
        float n = wfbm(vec2(q.x * 1.3, q.y * 1.6) + vec2(wfbm(q * vec2(0.5, 2.2)) * 1.6, 0.0));
        float band = smoothstep(0.02, 0.07, e) * (1.0 - smoothstep(0.14, 0.3, e));
        // soft, low-contrast cloud: a veil that only warms near the sun
        float cl = smoothstep(0.42, 0.85, n) * band * uCloudDim;
        vec3 lit = vec3(0.8, 0.34, 0.12) * (0.05 + 0.7 * pow(s, 9.0));
        vec3 dark = vec3(0.035, 0.032, 0.04);
        vec3 cc = mix(dark, lit, smoothstep(0.5, 0.9, n) * (0.2 + 0.8 * pow(s, 3.0)));
        c = mix(c, cc, cl * 0.5);
        // the sun disc: deep orange, redder at the limb
        // the sun: a soft-edged disc dissolving into a haze glow about three times its size
        float ang = length(cross(d, wSun)) * step(0.0, dot(d, wSun)) + (1.0 - step(0.0, dot(d, wSun))) * 9.0;
        float rr = ang / uSunR;
        float disc = 1.0 - smoothstep(0.72, 1.12, rr);
        vec3 sunC = mix(vec3(2.4, 0.86, 0.18), vec3(1.25, 0.24, 0.035), smoothstep(0.0, 1.0, rr));
        c = mix(c, sunC, disc * 0.94);
        c += vec3(1.0, 0.36, 0.07) * exp(-pow(rr / 3.0, 2.0)) * 0.42;
        c += vec3(0.75, 0.25, 0.05) * exp(-rr / 7.0) * 0.16;
        // seen from the bottom of the well: a luminous twilight circle with drifting cloud
        if (uWell > 0.0) {
          // a deep twilight blue, a little warmer toward the sunset side, with slow pink-gold cloud
          // deep dusk: teal-blue, warming toward the sunset side, soft low-contrast cloud
          vec2 p = d.xz / max(d.y, 0.3);
          float side = clamp(dot(p, normalize(wSun.xz)) * 7.0 + 0.45, 0.0, 1.0);
          vec3 tw = mix(vec3(0.022, 0.058, 0.088), vec3(0.17, 0.09, 0.055), side * side * side);
          float cn = wfbm(p * 8.0 + vec2(uT * 0.05, uT * 0.02));
          float cl = smoothstep(0.45, 0.85, cn);
          tw = mix(tw, mix(vec3(0.07, 0.07, 0.09), vec3(0.36, 0.17, 0.08), side), cl * 0.5);
          c = mix(c, tw, uWell * smoothstep(0.55, 0.85, d.y));
        }
        gl_FragColor = vec4(c * uDim, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 96, 48), skyMat);
  skyMesh.renderOrder = -100;
  skyMesh.frustumCulled = false;
  sky.add(skyMesh);

  // ---------------- dunes ----------------
  const desert = mk("desert");
  {
    const NX = 440, NZ = 400;
    const pos = new Float32Array((NX + 1) * (NZ + 1) * 3), uv = new Float32Array((NX + 1) * (NZ + 1) * 2), tshA = new Float32Array((NX + 1) * (NZ + 1));
    const sx = Math.sin(SUN_AZ), sz = -Math.cos(SUN_AZ), tanE = Math.tan(elevL);
    let n = 0;
    for (let j = 0; j <= NZ; j++) {
      const b = j / NZ;
      for (let i = 0; i <= NX; i++, n++) {
        const a = (i / NX) * 2 - 1;
        let x = Math.sign(a) * EXT * Math.abs(a) ** 2;
        let z = 90 - (EXT + 90) * b ** 2.15;
        const h = duneH(x, z) - 0.04;
        pos[n * 3] = x;
        pos[n * 3 + 1] = h;
        pos[n * 3 + 2] = z;
        uv[n * 2] = x / 3.2;
        uv[n * 2 + 1] = z / 3.2;
        // soft shadow from the dunes toward the low sun (ray-marched on the height grid)
        let sh = 1;
        for (let d = 0.6; d < 1200; d += 0.5 + d * 0.035) {
          const y = h + 0.08 + d * tanE;
          if (y > 60) break;
          const pen = (y - at(x + sx * d, z + sz * d)) / (d * 0.009 + 0.12);
          if (pen < sh) sh = pen;
          if (sh <= 0) break;
        }
        sh = Math.min(1, Math.max(0, sh));
        tshA[n] = sh * sh * (3 - 2 * sh);
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < NZ; j++)
      for (let i = 0; i < NX; i++) {
        const a = j * (NX + 1) + i, b2 = a + 1, c2 = a + NX + 1, d2 = c2 + 1;
        idx.push(a, b2, c2, b2, d2, c2);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setAttribute("tsh", new THREE.BufferAttribute(tshA, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = stone(T, "sand_01", 1, 1, 0xdcac84, 1);
    m.normalScale.set(0.7, 0.7);
    patch(m, { haze: true, tsh: true, ripple: 0.0055, grade: [-2, 14, 0.82], spec: 0.15 });
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    desert.add(mesh);
  }

  // a ruined iwan on a far crest (hazy silhouette)
  {
    const sh = new THREE.Shape();
    const W = 13, H = 24;
    sh.moveTo(-W, 0);
    sh.lineTo(-W, H * 0.78);
    sh.lineTo(-W * 0.55, H * 0.86);
    sh.lineTo(-W * 0.3, H * 0.8);
    sh.lineTo(-W * 0.18, H * 0.93);
    sh.lineTo(W * 0.1, H * 0.9);
    sh.lineTo(W * 0.42, H);
    sh.lineTo(W, H * 0.97);
    sh.lineTo(W, 0);
    const hole = new THREE.Path();
    const w = 6.2, sp = 11, ap = 19;
    hole.moveTo(-w, 0);
    hole.lineTo(-w, sp);
    hole.quadraticCurveTo(-w * 0.9, sp + (ap - sp) * 0.75, 0, ap);
    hole.quadraticCurveTo(w * 0.9, sp + (ap - sp) * 0.75, w, sp);
    hole.lineTo(w, 0);
    sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 7, bevelEnabled: false });
    const m = patch(new THREE.MeshStandardMaterial({ color: 0x4a3830, roughness: 1 }), { haze: true });
    const ruin = new THREE.Mesh(geo, m);
    const rz = -760, rx = -330;
    ruin.position.set(rx, at(rx, rz) - 3, rz);
    ruin.rotation.y = -0.5;
    desert.add(ruin);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 17, 12), m);
    col.position.set(rx - 34, at(rx - 34, rz + 10) + 6, rz + 10);
    desert.add(col);
    const col2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 9, 12), m);
    col2.position.set(rx - 46, at(rx - 46, rz + 14) + 2.5, rz + 14);
    col2.rotation.z = 0.08;
    desert.add(col2);
  }

  // ---------------- sun + sky light (shots 1–3) ----------------
  const sunG = mk("sun");
  const sun = new THREE.DirectionalLight(0xff8a48, 9);
  sun.position.copy(lightDir).multiplyScalar(90);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  const hemi = new THREE.HemisphereLight(0x4a68b8, 0x4a2a18, 0.85);
  // the dusk sky pouring down the shaft (shots 2–3): grazing light on the walls that dies with depth
  const skyFill = new THREE.SpotLight(0x9aa6bc, 0, 0, 0.42, 1, 2);
  skyFill.position.set(0.15, 7, 0.1);
  skyFill.target.position.set(0, -12, 0);
  sunG.add(sun, sun.target, hemi, skyFill, skyFill.target);
  c.gl.shadowMap.enabled = true;
  c.gl.shadowMap.type = THREE.PCFShadowMap;
  const shadowBox = (l: number, r: number, b: number, t: number, far: number) => {
    const sc = sun.shadow.camera;
    sc.left = l;
    sc.right = r;
    sc.bottom = b;
    sc.top = t;
    sc.near = 1;
    sc.far = far;
    sc.updateProjectionMatrix();
  };

  // ---------------- drifting sand (shot 1) ----------------
  const N = 7000;
  const seedA = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    seedA[i * 4] = (rnd(i * 3 + 1) - 0.5) * 70;
    seedA[i * 4 + 1] = -30 + rnd(i * 3 + 2) * 72;
    seedA[i * 4 + 2] = rnd(i * 5 + 7) < 0.85 ? 0.04 + rnd(i + 11) ** 2 * 0.4 : 0.4 + rnd(i + 13) * 2.2;
    seedA[i * 4 + 3] = rnd(i * 7 + 3);
  }
  const sandG = new THREE.BufferGeometry();
  sandG.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  sandG.setAttribute("aS", new THREE.BufferAttribute(seedA, 4));
  const sandU = { uT: { value: 0 }, uPx: { value: c.H } };
  const sandMat = new THREE.ShaderMaterial({
    uniforms: { ...HZ, ...sandU },
    vertexShader: `attribute vec4 aS; uniform float uT; uniform float uPx; uniform vec3 wSun; varying float vA; varying float vS;
      void main(){
        float sp = 4.5 + aS.w * 4.0;
        float x = mod(aS.x - uT * sp + 35.0, 70.0) - 35.0;
        float hop = aS.z < 0.45 ? aS.z * abs(sin(uT * (3.0 + aS.w * 4.0) + aS.w * 40.0)) : aS.z + 0.2 * sin(uT * 0.7 + aS.w * 9.0);
        vec3 p = vec3(x, hop, aS.y + uT * 0.6 * aS.w);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float big = aS.z < 0.45 ? 1.0 : 0.6;
        gl_PointSize = clamp(0.014 * big * projectionMatrix[1][1] * uPx * 0.5 / -mv.z, 1.0, 14.0);
        vS = gl_PointSize;
        vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
        float fwd = pow(max(dot(normalize(wp - cameraPosition), wSun), 0.0), 6.0);
        vA = (aS.z < 0.45 ? 0.55 : 0.25) * (1.0 - smoothstep(26.0, 35.0, abs(x))) * smoothstep(0.0, 2.0, -mv.z) * (0.45 + 2.2 * fwd);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying float vS;
      void main(){ vec2 q = gl_PointCoord - 0.5; q.y *= 3.2; float a = 1.0 - smoothstep(0.0, 0.5, length(q));
        gl_FragColor = vec4(vec3(1.0, 0.52, 0.22) * a * vA, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sandPts = new THREE.Points(sandG, sandMat);
  sandPts.frustumCulled = false;
  desert.add(sandPts);

  // low veils of blowing sand skimming the corridor
  const veilU = { uT: { value: 0 } };
  const veilMat = new THREE.ShaderMaterial({
    uniforms: { ...veilU },
    vertexShader: `varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uT; varying vec2 vUv; varying vec3 vWP;
      ${GLSL_N}
      void main(){
        vec2 q = vec2(vWP.x * 0.09 + uT * 0.55, vUv.y * 2.2);
        float n = wfbm(vec2(q.x, q.y * 1.4) + vec2(wfbm(q * 0.7 + uT * 0.1) * 1.8, 0.0));
        float a = smoothstep(0.42, 0.85, n) * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.2) * smoothstep(0.02, 0.22, vUv.y) * smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
        gl_FragColor = vec4(vec3(0.85, 0.42, 0.17) * a * 0.3, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (const [z, w, h] of [[-26, 120, 2.2], [-8, 90, 1.4], [8, 80, 1.0], [20, 70, 0.8]] as const) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), veilMat);
    q.position.set(0, h / 2 - 0.12, z);
    desert.add(q);
  }

  // ---------------- the well head ----------------
  const wellTop = mk("wellTop");
  const wood = patch(stone(T, "rough_wood", 1, 3, 0x9a8070, 1), { haze: true });
  const rimMat = patch(stone(T, "large_sandstone_blocks_01", 5, 0.75, 0xe0c4a0), { haze: true });
  const rope = ropeTex();
  const ropeMat = new THREE.MeshStandardMaterial({ map: rope, bumpMap: rope, bumpScale: 1.5, roughness: 1, color: 0xc8a888 });
  const frameG = new THREE.Group();
  {
    const prof = [V(1.48, -0.3, 0), V(1.44, 0.82, 0), V(1.4, 0.9, 0), V(0.97, 0.9, 0), V(0.95, 0.86, 0), V(0.95, -0.3, 0)].map((v) => new THREE.Vector2(v.x, v.y));
    const rim = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), rimMat);
    rim.castShadow = rim.receiveShadow = true;
    wellTop.add(rim);
    // one continuous ring of dressed coping stones, each a bevelled block, set in mortar with real joints
    const NB = 16, R0 = 0.955, R1 = 1.46, JOINT = 0.014;
    const copM = patch(stone(T, "large_sandstone_blocks_01", 1 / 3.2, 1 / 3.2, 0xd2b694), { haze: true });
    const mortar = patch(new THREE.MeshStandardMaterial({ color: 0x7a6c5c, roughness: 1, side: THREE.DoubleSide }), { haze: true });
    let hMax = 0;
    for (let i = 0; i < NB; i++) {
      const da = JOINT / 1.2 / 2;
      const a0 = (i / NB) * Math.PI * 2 + da, a1 = ((i + 1) / NB) * Math.PI * 2 - da;
      const sh = new THREE.Shape();
      const N = 10;
      for (let k = 0; k <= N; k++) {
        const a = a0 + ((a1 - a0) * k) / N;
        if (k === 0) sh.moveTo(Math.cos(a) * R1, Math.sin(a) * R1);
        else sh.lineTo(Math.cos(a) * R1, Math.sin(a) * R1);
      }
      for (let k = N; k >= 0; k--) {
        const a = a0 + ((a1 - a0) * k) / N;
        sh.lineTo(Math.cos(a) * R0, Math.sin(a) * R0);
      }
      const h = 0.15 + rnd(i + 44) * 0.018;
      hMax = Math.max(hMax, h);
      const g = new THREE.ExtrudeGeometry(sh, { depth: h - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4 });
      g.rotateX(-Math.PI / 2);
      const uvA = g.attributes.uv as THREE.BufferAttribute;
      const ou = rnd(i + 42) * 3, ov = rnd(i + 43) * 3;
      for (let k = 0; k < uvA.count; k++) uvA.setXY(k, uvA.getX(k) + ou, uvA.getY(k) + ov);
      const b = new THREE.Mesh(g, copM);
      b.position.y = 0.915;
      b.castShadow = b.receiveShadow = true;
      wellTop.add(b);
    }
    {
      const yb = 0.9, yt = 0.9 + hMax - 0.05;
      const ring = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(R1 - 0.006, yb), new THREE.Vector2(R1 - 0.006, yt), new THREE.Vector2(R0 + 0.006, yt), new THREE.Vector2(R0 + 0.006, yb)], 96), mortar);
      ring.receiveShadow = true;
      wellTop.add(ring);
    }
    const post = (x: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, 2.95, 0.17), wood);
      m.position.set(x, 1.32, 0);
      m.rotation.z = x > 0 ? 0.025 : -0.02;
      m.castShadow = true;
      return m;
    };
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 3.25, 14).rotateZ(Math.PI / 2), wood);
    beam.position.y = 2.72;
    beam.castShadow = true;
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 28), wood);
    pulley.position.y = 2.52;
    pulley.castShadow = false;
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), wood);
    hook.position.y = 2.64;
    frameG.add(post(-1.42), post(1.42), beam, pulley, hook);
    wellTop.add(frameG);
    // stones and pebbles around the rim
    const sm = patch(stone(T, "large_sandstone_blocks_01", 0.4, 0.4, 0xb89878), { haze: true });
    for (let i = 0; i < 40; i++) {
      const gg = new THREE.IcosahedronGeometry(1, 1);
      const p = gg.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) {
        const f = 0.75 + 0.5 * rnd(i * 97 + k);
        p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.45, p.getZ(k) * f);
      }
      gg.computeVertexNormals();
      const s = 0.025 + rnd(i + 5) ** 4 * 0.14;
      const a = rnd(i + 9) * Math.PI * 2, r = 1.5 + rnd(i + 3) ** 1.6 * 1.1;
      const st = new THREE.Mesh(gg, sm);
      st.scale.setScalar(s);
      st.position.set(Math.cos(a) * r, -s * 0.1, Math.sin(a) * r);
      st.rotation.set(rnd(i) * 3, rnd(i + 1) * 3, rnd(i + 2) * 3);
      st.castShadow = st.receiveShadow = true;
      wellTop.add(st);
    }
  }
  // the rope over the pulley: one end down the well, the other to the hauler's hands
  const ropeTop = new THREE.Mesh(new THREE.BufferGeometry(), ropeMat);
  ropeTop.castShadow = true;
  wellTop.add(ropeTop);

  // a thin trickle of sand slipping over the coping and falling into the dark (shots 2–3)
  const trickU = { uT: { value: 0 }, uH: { value: c.H } };
  {
    const N = 2600;
    const a = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) a.set([(i + rnd(i * 3 + 1)) / N, rnd(i * 3 + 2), rnd(i * 3 + 3), rnd(i * 3 + 4)], i * 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aS", new THREE.BufferAttribute(a, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: trickU,
      vertexShader: `attribute vec4 aS; uniform float uT; uniform float uH; varying float vB;
        void main(){
          // a fine continuous stream: sand slides over the lip, then falls and slowly spreads
          float T = 1.6;
          float age = fract(uT / T + aS.x) * T;
          float slide = min(age, 0.12);
          float fall = max(age - 0.12, 0.0);
          float spread = 0.004 + 0.02 * fall;
          float th = 2.4 + (aS.y - 0.5) * 0.05 + 0.015 * sin(uT * 0.7 + aS.x * 3.0);
          float r = 1.04 - 0.75 * slide - 0.08 * fall + (aS.z - 0.5) * spread * 2.0;
          float y = 1.09 - 0.3 * slide - 4.9 * fall * fall + (aS.w - 0.5) * 0.01;
          vec3 p = vec3(cos(th) * r, y, sin(th) * r);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vB = smoothstep(-3.5, 0.6, y) * (0.4 + 0.6 * aS.w) * 0.35;
          gl_PointSize = clamp(0.0025 * projectionMatrix[1][1] * uH * 0.5 / -mv.z, 1.0, 2.5);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vB; void main(){ float a = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.42) * a * vB * 0.9, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    mk("trickle").add(pts);
  }

  // sand ground around the rim (top-down shot; the dunes are hidden there)
  const rimGround = mk("rimGround");
  {
    const g = new THREE.RingGeometry(0.97, 9, 160, 40);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, uvA = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      // sand piled against the rim + low ripples
      const y = 0.16 * Math.exp(-(r - 1.45) * 2.2) * (r > 1.45 ? 1 : 0) + 0.035 * Math.sin(x * 2.1 + Math.sin(z * 1.3) * 2) + 0.02 * Math.sin(z * 3.7 - x);
      p.setY(i, r < 1.44 ? -0.2 : y);
      uvA.setXY(i, x / 1.6, z / 1.6);
    }
    g.computeVertexNormals();
    const m = stone(T, "dry_ground_rocks", 1, 1, 0xb4b2aa, 1);
    patch(m, { ripple: 0.0028, spec: 0.3 });
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = mesh.castShadow = true;
    rimGround.add(mesh);
  }

  // ---------------- the friends (backlit silhouettes) ----------------
  const friends = mk("friends");
  const figU = { uT: { value: 0 }, uHide: { value: 0 } };
  const FH = 1.95; // plane height for a 1.78 m man (the canvas has margins)
  const fr: { pose: "rope" | "staff" | "lean"; p: THREE.Vector3; s: number; seed: number }[] = [
    { pose: "rope", p: V(2.35, 0, 0.55), s: 1.0, seed: 1 },
    { pose: "staff", p: V(-2.55, 0, 0.95), s: 1.04, seed: 2 },
  ];
  const figMats: THREE.ShaderMaterial[] = [];
  const handA = V(0, 0, 0);
  const silMat = (tex: THREE.Texture, seed: number) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...HZ, ...figU, uMap: { value: tex }, uSeed: { value: 0 }, uRim: { value: new THREE.Color(1.3, 0.5, 0.17) }, uBody: { value: new THREE.Color(0.012, 0.009, 0.01) } },
      vertexShader: `uniform float uT; uniform float uSeed; varying vec2 vUv; varying vec3 vWP;
        void main(){ vUv = uv; vec3 p = position;
          float hem = (1.0 - smoothstep(0.1, 0.62, uv.y)) * smoothstep(0.0, 0.07, uv.y);
          p.x += hem * (0.018 * sin(uT * 4.7 + uSeed + uv.y * 8.0) + 0.008 * sin(uT * 10.3 + uv.y * 21.0 + uSeed));
          p.x += 0.006 * sin(uT * 0.9 + uSeed) * uv.y;
          vec4 w = modelMatrix * vec4(p, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uRim; uniform vec3 uBody; uniform float uHide; varying vec2 vUv; varying vec3 vWP;
        ${GLSL_HAZE}
        void main(){ vec4 s = texture2D(uMap, vUv); if (s.g < 0.5 || uHide > 0.5) discard;
          // a thin warm rim on the sun side (the sun is low on the left)
          float b = texture2D(uMap, vUv + vec2(-0.012, 0.005)).r;
          float b0 = s.r;
          float rim = (1.0 - smoothstep(0.3, 0.72, b)) * (1.0 - smoothstep(0.62, 0.93, b0)) * 1.15;
          vec3 c = uBody + uRim * rim;
          gl_FragColor = vec4(wHaze(c, vWP), 1.0); }`,
    });
    m.uniforms.uSeed.value = seed * 3.7;
    figMats.push(m);
    return m;
  };
  for (const f of fr) {
    const tex = man(f.pose, f.seed);
    const m = silMat(tex, f.seed);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(FH * 0.5 * f.s, FH * f.s, 1, 24), m);
    plane.position.copy(f.p);
    plane.position.y = (FH * f.s) / 2 - 0.045 * f.s;
    // face the push-in camera (fixed), cast the silhouette's shadow
    plane.rotation.y = Math.atan2(CAM_MID.x - f.p.x, CAM_MID.z - f.p.z);
    plane.castShadow = true;
    plane.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: tex, alphaTest: 0.5 });
    friends.add(plane);
    if (f.pose === "rope") {
      // the hauler's hands in world space (canvas (62, 82) of 512×1024)
      const local = V((62 / 512 - 0.5) * FH * 0.5 * f.s, (1 - 82 / 1024) * FH * f.s - (FH * f.s) / 2, 0);
      plane.updateMatrixWorld();
      handA.copy(local.applyMatrix4(plane.matrixWorld));
    }
  }

  // the boy, hanging on the rope by his hands, is lowered into the well on «a boy»
  const BH = 1.85;
  const hangTex = boyHang();
  const boyPlane = new THREE.Mesh(new THREE.PlaneGeometry(BH * 0.5, BH, 1, 24), silMat(hangTex, 7));
  boyPlane.rotation.y = Math.atan2(CAM_MID.x, CAM_MID.z);
  boyPlane.castShadow = true;
  boyPlane.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: hangTex, alphaTest: 0.5 });
  friends.add(boyPlane);
  const boyHands = V(0, 0, 0);
  const tmp = new THREE.Vector3();
  // in the shaft shots the sun is raised (unseen there) so the rim and the sand read; the box covers the whole shaft
  const sunHigh = V(-1, 0, -0.18).normalize().multiplyScalar(Math.cos(0.21)).setY(Math.sin(0.21));
  const update = (t: number, set: string[]) => {
    const s1 = set.includes("desert");
    HZ.wHazeOn.value = s1 ? 1 : 0;
    skyU.uT.value = t;
    skyMesh.position.copy(c.camera.position);
    if (s1) {
      sandU.uT.value = t;
      veilU.uT.value = t;
      sun.position.copy(lightDir).multiplyScalar(90);
      sun.intensity = 10;
      sun.color.set(0xff9a5c);
      hemi.intensity = 0.55;
      skyFill.intensity = 0;
      shadowBox(-26, 26, -9, 9, 260);
    } else {
      sun.position.copy(sunHigh).multiplyScalar(60);
      sun.intensity = 6;
      sun.color.set(0xffc490);
      hemi.intensity = set.includes("rimGround") ? 1.2 : 0.5;
      skyFill.intensity = set.includes("rimGround") ? 240 : 45;
      shadowBox(-5, 5, -14, 5, 140);
    }
    figU.uT.value = t;
    figU.uHide.value = s1 ? 0 : 1;
    trickU.uT.value = t;
    frameG.visible = s1;
    // rope: hands → pulley → down into the well
    if (set.includes("wellTop")) {
      const sw = 0.03 * Math.sin(t * 1.1);
      const lower = ease.io(ramp(t, 2.4, 3.3));
      const swing = 0.045 * Math.sin(t * 2.3) * (1 - 0.5 * lower);
      boyHands.set(0.04 + swing, lerp(2.28, 0.05, lower) + 0.015 * Math.sin(t * 3.1), 0.02);
      boyPlane.position.set(boyHands.x, boyHands.y + (40 / 512) * BH - BH / 2, boyHands.z);
      boyPlane.rotation.z = -swing * 0.8;
      boyPlane.visible = s1;
      ropeTube(ropeTop, [handA.clone(), tmp.set(0.45, 2.38, 0.28).clone(), V(0.12, 2.5, 0.03), V(0, 2.42, 0), V(boyHands.x * 0.5 + sw * 0.1, (2.42 + boyHands.y) / 2, 0.01), boyHands.clone().add(V(0, 0.15, 0))], 0.016);
      ropeTop.visible = set.includes("desert");
    }
  };
  return { update, sunDir, sun, figMats, skyU, wood, rimMat, ropeMat, at };
};
