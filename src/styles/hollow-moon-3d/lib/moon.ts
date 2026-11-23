// Hollow Moon 3D · the moon: a fractured crust (baked by pipeline/bake.mts) whose plates can be lifted, tilted and set
// adrift, the golden cell lattice that lines its inside, and the materials that shade them:
// real lunar tone (NASA LROC) + baked crater relief + photoscanned regolith (Poly Haven "moon" set) on top,
// layered rock (Poly Haven "cliff_side") on the broken edges.
import * as THREE from "three";
import { CRUST, R, rng } from "./util";

export type Plate = { i: number; c: [number, number, number]; ang: number; th: number; line: boolean; tris: number };
/** pmap: 2048 × 1024 pairs (plate, relief in metres) over the whole sphere, rows from north to south */
export type MoonData = { geo: THREE.BufferGeometry; plates: Plate[]; breach: { dir: [number, number, number]; radius: number }; pmap: Float32Array };

const TL = new THREE.TextureLoader();
export async function loadTex(url: string, o: { srgb?: boolean; aniso?: number; clampT?: boolean } = {}) {
  const t = await TL.loadAsync(url);
  t.colorSpace = o.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = o.clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = o.aniso ?? 8;
  return t;
}

/** a scanned lunar rock (Poly Haven "moon_rock", CC0): unit size (its longest half-axis = 1), with its own maps */
export type Rock = { id: string; geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial; nV: number; half: [number, number, number] };
export async function loadRocks(url: (p: string) => string, aniso: number): Promise<Rock[]> {
  const meta = (await fetch(url("rocks/rocks.json")).then((r) => r.json())) as { id: string; nV: number; nI: number; size: [number, number, number]; tex: Record<string, string> }[];
  return Promise.all(meta.map(async (m) => {
    const buf = await fetch(url(`rocks/${m.id}.hdr`)).then((r) => r.arrayBuffer());
    const head = new Uint32Array(buf, 0, 2), nV = head[0], nI = head[1];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buf, 8, nV * 3), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(buf, 8 + nV * 12, nV * 3), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(buf, 8 + nV * 24, nV * 2), 2));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, 8 + nV * 32, nI), 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.8);
    const [diff, nor, arm] = await Promise.all([loadTex(url(`rocks/${m.tex.diff}`), { srgb: true, aniso }), loadTex(url(`rocks/${m.tex.nor}`), { aniso }), loadTex(url(`rocks/${m.tex.arm}`), { aniso })]);
    // the maps follow the glTF convention (first row at the top)
    for (const t of [diff, nor, arm]) { t.flipY = false; t.needsUpdate = true; }
    const mat = new THREE.MeshStandardMaterial({ map: diff, normalMap: nor, roughnessMap: arm, aoMap: arm, metalness: 0, roughness: 1 });
    mat.normalScale.set(1.25, 1.25);
    mat.aoMapIntensity = 1.0;
    return { id: m.id, geo, mat, nV, half: m.size };
  }));
}

export async function loadMoon(url: (p: string) => string): Promise<MoonData> {
  const [buf, meta, pm] = await Promise.all([fetch(url("moon/crust.hdr")).then((r) => r.arrayBuffer()), fetch(url("moon/plates.json")).then((r) => r.json()), fetch(url("moon/platemap.hdr")).then((r) => r.arrayBuffer())]);
  const head = new Uint32Array(buf, 0, 4), nV = head[0], nI = head[1];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buf, 16, nV * 3), 3));
  geo.setAttribute("aInfo", new THREE.BufferAttribute(new Float32Array(buf, 16 + nV * 12, nV), 1));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, 16 + nV * 16, nI), 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R + 120);
  return { geo, plates: meta.plates as Plate[], breach: meta.breach, pmap: new Float32Array(pm) };
}

// ───────────────────────────────────────────────────────── plates
type PlateAnim = { size: number; base: THREE.Vector3; out: THREE.Vector3; axis: THREE.Vector3; angle: number; scale: number; pivot: THREE.Vector3; drift: number; spin: number; bob: number; ph: number };

export class Plates {
  tex: THREE.DataTexture;
  data: Float32Array;
  anim: PlateAnim[] = [];
  n: number;
  stats = { removed: 0, debris: 0, rim: 0, cracked: 0, hair: 0 };
  constructor(md: MoonData, P: (n: string, d: number) => number) {
    const n = (this.n = md.plates.length);
    this.data = new Float32Array(n * 4 * 3);
    this.tex = new THREE.DataTexture(this.data, n, 3, THREE.RGBAFormat, THREE.FloatType);
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    const rand = rng(91777);
    const B = new THREE.Vector3(...md.breach.dir);
    const BR = md.breach.radius + P("breach", 0);
    const gapK = P("gap", 1);
    let debris = 0;
    for (let i = 0; i < n; i++) {
      const p = md.plates[i];
      const c = new THREE.Vector3(...p.c);
      const a: PlateAnim = { size: i === 0 ? Math.PI * R : Math.max(p.ang * R, 2), base: new THREE.Vector3(), out: c.clone(), axis: new THREE.Vector3(0, 1, 0), angle: 0, scale: 1, pivot: c.clone().multiplyScalar(R - CRUST * 0.5), drift: 0, spin: 0, bob: 0, ph: rand() * 6.283 };
      this.anim.push(a);
      if (i === 0) continue;
      const size = Math.max(p.ang * R, 2);
      const tB = B.clone().addScaledVector(c, -c.dot(B)).normalize();
      const hinge = new THREE.Vector3().crossVectors(tB, c).normalize();
      const rAxis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
      if (p.th < BR - 8) {
        // inside the opening: gone, except a few slabs that hang in front of the rim
        const canFloat = p.th > BR - 27 && size < 15 && debris < 15 && r1 < 0.42;
        if (!canFloat) { a.scale = 0; this.stats.removed++; continue; }
        debris++;
        this.stats.debris++;
        a.base.copy(c).multiplyScalar(16 + r2 * 46).addScaledVector(tB, -(4 + r3 * 22)).addScaledVector(hinge, (r4 - 0.5) * 24);
        a.axis.copy(rAxis);
        a.angle = (r3 - 0.5) * 3.2;
        a.scale = 0.72 + 0.28 * r4;
        a.drift = 0.1 + 0.22 * r2;
        a.spin = (r1 - 0.2) * 0.05;
        a.bob = 0.5;
      } else if (p.th < BR + 5) {
        // the rim: plates prised up like petals, hinged on their outer edge
        const k = (p.th - (BR - 8)) / 13;
        const tilt = (THREE.MathUtils.lerp(30, 5, k) * (0.55 + 0.9 * r1) * Math.PI) / 180;
        a.axis.copy(hinge).addScaledVector(c, (r2 - 0.5) * 0.5).normalize();
        a.angle = tilt;
        a.base.copy(c).multiplyScalar(THREE.MathUtils.lerp(6.5, 0.9, k) * (0.6 + 0.8 * r3) + Math.sin(tilt) * size * 0.75).addScaledVector(tB, -(1 - k) * 2.5 * r4);
        a.scale = 0.95 - 0.05 * r4;
        a.drift = 0.03 * (1 - k);
        a.spin = (r2 - 0.5) * 0.008;
        a.bob = 0.22 * (1 - k) + 0.05;
        this.stats.rim++;
      } else if (p.th < BR + 17) {
        const gap = (0.5 + 1.1 * r1) * gapK;
        a.scale = Math.max(0.9, 1 - gap / size);
        a.axis.copy(rAxis).addScaledVector(c, -rAxis.dot(c)).normalize();
        a.angle = ((r2 - 0.5) * 6 * Math.PI) / 180;
        a.base.copy(c).multiplyScalar((r3 - 0.42) * 0.9);
        a.bob = 0.035;
        this.stats.cracked++;
      } else {
        const far = THREE.MathUtils.clamp((p.th - BR - 17) / 60, 0, 1);
        const gap = THREE.MathUtils.lerp(0.5, 0.2, far) * (0.5 + r1) * gapK * (p.line ? 1.25 : 1);
        a.scale = Math.max(0.955, 1 - gap / size);
        a.axis.copy(rAxis).addScaledVector(c, -rAxis.dot(c)).normalize();
        a.angle = ((r2 - 0.5) * 1.4 * Math.PI) / 180;
        a.base.copy(c).multiplyScalar((r3 - 0.45) * 0.22);
        a.bob = 0.012;
        this.stats.hair++;
      }
    }
    this.update(0);
  }
  update(t: number) {
    const d = this.data, n = this.n;
    for (let i = 0; i < n; i++) {
      const a = this.anim[i];
      const bob = a.bob * Math.sin(t * 0.33 + a.ph);
      const k = a.drift * t + bob;
      d[i * 4] = a.base.x + a.out.x * k; d[i * 4 + 1] = a.base.y + a.out.y * k; d[i * 4 + 2] = a.base.z + a.out.z * k;
      d[i * 4 + 3] = a.angle + a.spin * t + bob * 0.02;
      const o1 = (n + i) * 4, o2 = (2 * n + i) * 4;
      d[o1] = a.axis.x; d[o1 + 1] = a.axis.y; d[o1 + 2] = a.axis.z; d[o1 + 3] = a.scale;
      d[o2] = a.pivot.x; d[o2 + 1] = a.pivot.y; d[o2 + 2] = a.pivot.z; d[o2 + 3] = a.size;
    }
    this.tex.needsUpdate = true;
  }
}

// ───────────────────────────────────────────────────────── crust material
const PLATE_VS = /* glsl */ `
attribute float aInfo;
uniform highp sampler2D tPlate;
vec3 rotAA(vec3 v, vec3 ax, float a){ float c = cos(a), s = sin(a); return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c); }
vec3 platePos(out float kind, out vec4 q0, out vec4 q1, out vec4 q2){
  kind = floor(aInfo / 2048.0 + 0.0001);
  int pid = int(aInfo - kind * 2048.0 + 0.5);
  q0 = texelFetch(tPlate, ivec2(pid, 0), 0);
  q1 = texelFetch(tPlate, ivec2(pid, 1), 0);
  q2 = texelFetch(tPlate, ivec2(pid, 2), 0);
  return q2.xyz + rotAA((position - q2.xyz) * q1.w, q1.xyz, q0.w) + q0.xyz;
}`;

export type CrustTex = { nrm: THREE.Texture; alb: THREE.Texture; mesoN: THREE.Texture; mesoD: THREE.Texture; microN: THREE.Texture; microD: THREE.Texture; cliffD: THREE.Texture; cliffN: THREE.Texture };

export function crustMaterial(plateTex: THREE.Texture, T: CrustTex, shared: Record<string, THREE.IUniform>) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, side: THREE.FrontSide });
  m.shadowSide = THREE.FrontSide;
  const uni = {
    tPlate: { value: plateTex }, tMoonN: { value: T.nrm }, tMoonA: { value: T.alb }, tMesoN: { value: T.mesoN }, tMesoD: { value: T.mesoD }, tMicroN: { value: T.microN }, tMicroD: { value: T.microD },
    tCliffD: { value: T.cliffD }, tCliffN: { value: T.cliffN },
    uR: { value: R }, uCrust: { value: CRUST }, uTile: { value: new THREE.Vector3(11, 1.7, 9) },
    uTone: { value: new THREE.Vector3(1.04, 1.0, 0.95) }, uGain: { value: 1.0 }, uRelief: { value: new THREE.Vector3(1.0, 0.9, 0.7) },
    uGlow: { value: new THREE.Vector4(1.0, 0.55, 0.16, 1.0) },
    // colour of the broken rock (linear albedo); how strongly the lattice lights its foot
    uWall: { value: new THREE.Vector4(0.085, 0.083, 0.08, 0.6) },
    ...shared,
  };
  m.userData.uni = uni;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\n${PLATE_VS}\nvarying vec3 vDir0; varying float vKind; varying float vRad; varying vec3 vP0; varying vec3 vE; varying vec3 vNo; varying vec3 vUp; varying vec4 vCen; varying float vLift;`)
      .replace("#include <beginnormal_vertex>", /* glsl */ `
        float kind; vec4 q0; vec4 q1; vec4 q2;
        vec3 plateP = platePos(kind, q0, q1, q2);
        vCen = vec4(normalize(q2.xyz), q2.w);
        vLift = length(q0.xyz);
        vec3 dir0 = normalize(position);
        vec3 e0 = normalize(vec3(dir0.z, 0.0, -dir0.x) + vec3(1e-6, 0.0, 0.0));
        vec3 n0 = cross(dir0, e0);
        vec3 upR = rotAA(dir0, q1.xyz, q0.w);
        vec3 objectNormal = kind > 1.5 ? -upR : upR;
        vDir0 = dir0; vKind = kind; vRad = length(position); vP0 = position;
        vE = normalize(normalMatrix * rotAA(e0, q1.xyz, q0.w)); vNo = normalize(normalMatrix * rotAA(n0, q1.xyz, q0.w)); vUp = normalize(normalMatrix * upR);`)
      .replace("#include <begin_vertex>", "vec3 transformed = plateP;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", /* glsl */ `#include <common>
        uniform sampler2D tMoonN; uniform sampler2D tMoonA; uniform sampler2D tMesoN; uniform sampler2D tMesoD; uniform sampler2D tMicroN; uniform sampler2D tMicroD; uniform sampler2D tCliffD; uniform sampler2D tCliffN;
        uniform float uR; uniform float uCrust; uniform vec3 uTile; uniform vec3 uTone; uniform float uGain; uniform vec3 uRelief; uniform vec4 uGlow; uniform vec4 uWall;
        varying vec3 vDir0; varying float vKind; varying float vRad; varying vec3 vP0; varying vec3 vE; varying vec3 vNo; varying vec3 vUp; varying vec4 vCen; varying float vLift;
        float hmAO = 1.0;
        vec3 h3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
        float crackle(vec3 x){
          vec3 ip = floor(x), fp = fract(x); float f1 = 8.0, f2 = 8.0;
          for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
            vec3 g = vec3(float(i), float(j), float(k)); vec3 r = g + h3(ip + g) - fp; float d = dot(r, r);
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
          }
          return sqrt(f2) - sqrt(f1);
        }
        // tri-planar lookup on the unbroken sphere; returns colour, adds the tangent-plane tilt of the normal map to w
        vec3 tri(sampler2D tn, sampler2D td, vec3 p, vec3 bw, float tile, inout vec3 w, float k){
          vec2 ux = p.zy / tile, uy = p.xz / tile, uz = p.xy / tile;
          vec2 nx = texture2D(tn, ux).xy * 2.0 - 1.0, ny = texture2D(tn, uy).xy * 2.0 - 1.0, nz = texture2D(tn, uz).xy * 2.0 - 1.0;
          w += k * (bw.x * vec3(0.0, nx.y, nx.x) + bw.y * vec3(ny.x, 0.0, ny.y) + bw.z * vec3(nz.x, nz.y, 0.0));
          return texture2D(td, ux).rgb * bw.x + texture2D(td, uy).rgb * bw.y + texture2D(td, uz).rgb * bw.z;
        }`)
      .replace("#include <normal_fragment_maps>", /* glsl */ `
        {
          vec3 d0 = normalize(vDir0);
          vec3 e0 = normalize(vec3(d0.z, 0.0, -d0.x) + vec3(1e-6, 0.0, 0.0));
          vec3 n0 = cross(d0, e0);
          vec3 bw = pow(abs(d0), vec3(5.0)); bw /= (bw.x + bw.y + bw.z);
          float fw = length(fwidth(vP0));
          if (vKind < 0.5) {
            // ── the surface
            float u = atan(-d0.z, d0.x) / 6.2831853 + 0.5;
            float u2 = fract(u + 0.5) - 0.5;
            u = fwidth(u) < fwidth(u2) + 1e-7 ? u : u2;
            vec2 muv = vec2(u, asin(clamp(d0.y, -1.0, 1.0)) / 3.14159265 + 0.5);
            vec3 nm = texture2D(tMoonN, muv).xyz;
            float tone = texture2D(tMoonA, muv).r;
            vec2 nxy = (nm.xy * 2.0 - 1.0) * uRelief.x;
            vec3 w = vec3(0.0);
            float kMeso = (1.0 - smoothstep(0.12, 0.7, fw)) * uRelief.y, kMicro = (1.0 - smoothstep(0.012, 0.09, fw)) * uRelief.z;
            vec3 cMeso = tri(tMesoN, tMesoD, vP0, bw, uTile.x, w, kMeso);
            vec3 cMicro = tri(tMicroN, tMicroD, vP0 + 3.7, bw, uTile.y, w, kMicro);
            nxy += vec2(dot(w, e0), dot(w, n0));
            float nz = sqrt(max(1.0 - dot(nm.xy * 2.0 - 1.0, nm.xy * 2.0 - 1.0), 0.05));
            normal = normalize(vE * nxy.x + vNo * nxy.y + vUp * nz);
            // colour: the broad lunar tone, modulated by the scanned regolith (relative to its own mean)
            vec3 reg = mix(vec3(1.0), cMeso / vec3(0.216, 0.194, 0.161), 0.8 * kMeso / max(uRelief.y, 1e-3));
            reg *= mix(vec3(1.0), cMicro / vec3(0.208, 0.187, 0.154), 0.6 * kMicro / max(uRelief.z, 1e-3));
            // hairline cracks of an old, stressed shell
            vec3 cq = d0 * 9.0 + 3.1;
            cq += 0.2 * vec3(sin(cq.y * 2.3 + 1.7) + sin(cq.z * 5.1), sin(cq.z * 2.1 + 4.2) + sin(cq.x * 4.7), sin(cq.x * 2.5 + 0.3) + sin(cq.y * 5.3));
            cq += 0.045 * vec3(sin(cq.z * 17.0), sin(cq.x * 19.0), sin(cq.y * 23.0)) + 0.18 * (cMeso - 0.19);
            float ck = crackle(cq);
            float cmask = smoothstep(-0.25, 0.3, sin(d0.x * 11.3 + sin(d0.y * 7.1) * 2.0) * sin(d0.z * 9.7 + 1.3) + 0.3 * sin(d0.y * 31.0 + d0.x * 17.0));
            float cwid = 0.0025 + 0.004 * (0.5 + 0.5 * sin(d0.z * 41.0 + d0.x * 29.0));
            float line = (1.0 - smoothstep(0.0, cwid + fw * 0.012, ck)) * cmask * (1.0 - smoothstep(0.25, 1.4, fw));
            diffuseColor.rgb = tone * uTone * uGain * clamp(reg, 0.35, 1.9) * (1.0 - 0.72 * line);
            roughnessFactor = 0.94;
            metalnessFactor = 0.0;
            hmAO = mix(1.0, nm.z, 0.85) * (1.0 - 0.5 * line);
          } else {
            // ── broken edge (1) and underside (2): fractured basalt, a pale skin of regolith just under the surface,
            // lit from within towards the bottom. The rock is looked up on the three planes of the face itself, at
            // two sizes, so no joint pattern repeats and nothing is stretched along the edge.
            float depth = clamp((uR - vRad) / uCrust, 0.0, 1.0);
            vec3 fnL = normalize(cross(dFdx(vP0), dFdy(vP0)));
            vec3 fnV = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
            vec3 bwf = pow(abs(fnL), vec3(4.0)); bwf /= (bwf.x + bwf.y + bwf.z);
            vec3 w = vec3(0.0);
            float kBig = 1.0 - smoothstep(0.3, 1.6, fw), kSmall = 1.0 - smoothstep(0.05, 0.4, fw);
            vec3 rock = tri(tCliffN, tCliffD, vP0, bwf, uTile.z, w, 1.1 * kBig);
            vec3 rock2 = tri(tCliffN, tCliffD, vP0 + 13.7, bwf, uTile.z * 0.23, w, 0.7 * kSmall);
            normal = normalize(fnV + vE * dot(w, e0) + vNo * dot(w, n0) + vUp * dot(w, d0));
            // brightness of the scan relative to its own mean; lunar basalt has hardly any colour
            float lum = dot(rock, vec3(0.333)) / 0.0306, lum2 = dot(rock2, vec3(0.333)) / 0.0306;
            float tex = clamp(mix(1.0, lum, 0.75 * kBig) * mix(1.0, lum2, 0.55 * kSmall), 0.25, 2.4);
            // the skin: dust and rubble for the first half metre, in an uneven line
            float u = atan(-d0.z, d0.x) / 6.2831853 + 0.5;
            float u2 = fract(u + 0.5) - 0.5;
            u = fwidth(u) < fwidth(u2) + 1e-7 ? u : u2;
            float tone = texture2D(tMoonA, vec2(u, asin(clamp(d0.y, -1.0, 1.0)) / 3.14159265 + 0.5)).r;
            float skin = (1.0 - smoothstep(0.03, 0.13, depth + 0.035 * (lum - 1.0))) * step(vKind, 1.5);
            vec3 basalt = uWall.rgb * tex;
            vec3 dust = tone * uTone * uGain * (0.72 + 0.28 * lum2);
            diffuseColor.rgb = mix(basalt, dust, skin * 0.85);
            roughnessFactor = 0.9;
            metalnessFactor = 0.0;
            // the lattice glows on the lower strata
            totalEmissiveRadiance += uGlow.rgb * (uGlow.a * pow(depth, 2.4) * (0.2 + 0.5 * tex) * uWall.a * exp(-vLift / 9.0));
            hmAO = mix(1.0, 0.6, depth * depth) * clamp(0.55 + 0.45 * lum * lum2, 0.5, 1.0);
          }
        }`)
      .replace("#include <aomap_fragment>", "reflectedLight.indirectDiffuse *= hmAO; reflectedLight.indirectSpecular *= hmAO; reflectedLight.directDiffuse *= mix(1.0, hmAO, 0.4);");
  };
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.FrontSide });
  depth.onBeforeCompile = (sh) => {
    sh.uniforms.tPlate = uni.tPlate;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${PLATE_VS}`).replace("#include <begin_vertex>", "float kind; vec4 q0; vec4 q1; vec4 q2; vec3 transformed = platePos(kind, q0, q1, q2);");
  };
  const dist = new THREE.MeshDistanceMaterial({ side: THREE.FrontSide });
  dist.onBeforeCompile = (sh) => {
    sh.uniforms.tPlate = uni.tPlate;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${PLATE_VS}`).replace("#include <begin_vertex>", "float kind; vec4 q0; vec4 q1; vec4 q2; vec3 transformed = platePos(kind, q0, q1, q2);");
  };
  return { mat: m, depth, dist, uni };
}

// ───────────────────────────────────────────────────────── loose rock adrift around the rim
/** scanned rocks set adrift around the opening: a few boulders, many stones, a cloud of pebbles; each turns slowly */
export function buildDebris(breach: THREE.Vector3, br: number, rocks: Rock[], tone = 1) {
  const rand = rng(91911);
  const n = 560;
  const B = breach.clone().normalize();
  const side = new THREE.Vector3(B.z, 0, -B.x).normalize(), up = new THREE.Vector3().crossVectors(B, side);
  // the lightest meshes carry the pebbles, the most detailed ones the boulders
  const byWeight = rocks.map((_, i) => i).sort((p, q) => rocks[p].nV - rocks[q].nV);
  const light = byWeight.slice(0, Math.max(2, Math.ceil(rocks.length * 0.45))), heavy = byWeight.slice(-Math.max(2, Math.floor(rocks.length * 0.45)));
  type Item = { dir: THREE.Vector3; rad: number; s: THREE.Vector3; axis: THREE.Vector3; w: number; ph: number; drift: number; q0: THREE.Quaternion; col: THREE.Color };
  const items: Item[][] = rocks.map(() => []);
  for (let i = 0; i < n; i++) {
    // around the rim (a little inside it, a little outside), most of it close to the surface, small stones by far the most
    const th = ((br - 17 + 30 * rand()) * Math.PI) / 180, ph = rand() * Math.PI * 2;
    const dir = B.clone().multiplyScalar(Math.cos(th)).addScaledVector(up, Math.sin(th) * Math.cos(ph)).addScaledVector(side, Math.sin(th) * Math.sin(ph));
    const big = i < 14;
    const s = big ? 2.2 + 3.4 * rand() : 0.16 + 1.9 * Math.pow(rand(), 3.4);
    const pool = s > 1.1 ? heavy : light;
    const kind = pool[Math.floor(rand() * pool.length)];
    const g = 0.74 + 0.36 * rand();
    items[kind].push({
      dir, rad: R + (big ? 6 + 40 * rand() : 2.5 + 52 * Math.pow(rand(), 2.4)), s: new THREE.Vector3(s * (0.88 + 0.24 * rand()), s * (0.88 + 0.24 * rand()), s * (0.88 + 0.24 * rand())),
      axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), w: (rand() - 0.5) * (big ? 0.12 : 0.5), ph: rand() * 6.283, drift: 0.04 + 0.16 * rand(),
      q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.283, rand() * 6.283, rand() * 6.283)),
      col: new THREE.Color(g * tone * (1.0 + 0.04 * (rand() - 0.5)), g * tone, g * tone * (0.97 + 0.05 * (rand() - 0.5))),
    });
  }
  const group = new THREE.Group();
  const meshes: THREE.InstancedMesh[] = [];
  rocks.forEach((rk, k) => {
    const im = new THREE.InstancedMesh(rk.geo, rk.mat, Math.max(items[k].length, 1));
    im.count = items[k].length;
    items[k].forEach((it, i) => im.setColorAt(i, it.col));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    im.layers.enable(1);
    group.add(im);
    meshes.push(im);
  });
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3();
  const update = (t: number) => {
    meshes.forEach((im, k) => {
      const list = items[k];
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        q.setFromAxisAngle(it.axis, it.ph + it.w * t).multiply(it.q0);
        pos.copy(it.dir).multiplyScalar(it.rad + it.drift * t + 0.3 * Math.sin(t * 0.4 + it.ph));
        M4.compose(pos, q, it.s);
        im.setMatrixAt(i, M4);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  };
  update(0);
  return { mesh: group as THREE.Object3D, update };
}

// ───────────────────────────────────────────────────────── boulders and stones lying on the crust
/** scanned rocks strewn over the surface, thickest around the opening: each lies flat, half sunk in the dust, and
 *  sits on its own plate (moved, turned and shrunk with it). Only the larger ones cast shadows. */
export function buildBoulders(md: MoonData, plates: Plates, rocks: Rock[], breach: THREE.Vector3, br: number, tone = 1, count = 2600) {
  const rand = rng(91444);
  const MW = 2048, MH = 1024, pm = md.pmap;
  const look = (x: number, y: number, z: number): [number, number] => {
    const lon = Math.atan2(-z, x), lat = Math.asin(Math.max(-1, Math.min(1, y)));
    const px = ((Math.floor((lon / (2 * Math.PI) + 0.5) * MW) % MW) + MW) % MW, py = Math.max(0, Math.min(MH - 1, Math.floor((0.5 - lat / Math.PI) * MH)));
    const o = (py * MW + px) * 2;
    return [pm[o], pm[o + 1]];
  };
  const B = breach.clone().normalize();
  const side = new THREE.Vector3(B.z, 0, -B.x).normalize(), up = new THREE.Vector3().crossVectors(B, side);
  const byWeight = rocks.map((_, i) => i).sort((p, q) => rocks[p].nV - rocks[q].nV);
  const light = byWeight.slice(0, 2), mid = byWeight.slice(1, Math.max(3, rocks.length - 1));
  type It = { m: THREE.Matrix4; col: THREE.Color };
  const small: It[][] = rocks.map(() => []), large: It[][] = rocks.map(() => []);
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  let placed = 0;
  for (let tries = 0; tries < count * 6 && placed < count; tries++) {
    // four in five lie in a belt around the opening, the rest anywhere on the near half
    const belt = rand() < 0.8;
    const th = ((belt ? br + 3 + 62 * Math.pow(rand(), 1.6) : br + 20 + 110 * rand()) * Math.PI) / 180, ph = rand() * Math.PI * 2;
    const d = B.clone().multiplyScalar(Math.cos(th)).addScaledVector(up, Math.sin(th) * Math.cos(ph)).addScaledVector(side, Math.sin(th) * Math.sin(ph)).normalize();
    const s = 0.1 + 1.25 * Math.pow(rand(), 4.5) + (rand() < 0.012 ? 1.0 + 1.2 * rand() : 0);
    const [pid, h] = look(d.x, d.y, d.z);
    const a = plates.anim[pid];
    if (!a || a.scale === 0 || a.drift > 0.004 || a.bob > 0.08) continue;
    // not on the brink of a crack
    const t1 = new THREE.Vector3(d.z, 0, -d.x).normalize(), t2 = new THREE.Vector3().crossVectors(d, t1);
    const del = (s * 1.3 + 0.55) / R;
    let edge = false;
    for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const e = d.clone().addScaledVector(t1, u * del).addScaledVector(t2, v * del).normalize(); if (look(e.x, e.y, e.z)[0] !== pid) { edge = true; break; } }
    if (edge) continue;
    const pool = s > 0.42 ? mid : light, kind = pool[Math.floor(rand() * pool.length)], rk = rocks[kind];
    // its flattest side down
    const hf = rk.half, ax = hf[0] <= hf[1] && hf[0] <= hf[2] ? X : hf[1] <= hf[2] ? Y : Z, hmin = Math.min(hf[0], hf[1], hf[2]);
    const q = new THREE.Quaternion().setFromUnitVectors(ax, d).multiply(new THREE.Quaternion().setFromAxisAngle(ax, rand() * 6.283));
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(t1, (rand() - 0.5) * 0.5));
    const p0 = d.clone().multiplyScalar(R + h + s * hmin * (0.3 + 0.45 * rand()));
    // with its plate
    const qa = new THREE.Quaternion().setFromAxisAngle(a.axis, a.angle);
    const p = p0.sub(a.pivot).multiplyScalar(a.scale).applyQuaternion(qa).add(a.pivot).add(a.base);
    q.premultiply(qa);
    const g = (0.7 + 0.38 * rand()) * tone;
    (s > 0.5 ? large : small)[kind].push({ m: new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, s, s).multiplyScalar(a.scale * (0.9 + 0.2 * rand()))), col: new THREE.Color(g * (1 + 0.04 * (rand() - 0.5)), g, g * (0.97 + 0.05 * (rand() - 0.5))) });
    placed++;
  }
  const group = new THREE.Group();
  let nShadow = 0;
  for (const [set, shadow] of [[small, false], [large, true]] as const) rocks.forEach((rk, k) => {
    const list = set[k];
    if (!list.length) return;
    const im = new THREE.InstancedMesh(rk.geo, rk.mat, list.length);
    list.forEach((it, i) => { im.setMatrixAt(i, it.m); im.setColorAt(i, it.col); });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false;
    if (shadow) { im.layers.enable(1); nShadow += list.length; }
    group.add(im);
  });
  return { group, placed, nShadow };
}

// ───────────────────────────────────────────────────────── the golden lattice under the crust
export function liningMaterial(breach: THREE.Vector3, br: number, shared: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uBreach: { value: breach }, uBR: { value: br }, uGold: { value: new THREE.Vector3(1.0, 0.63, 0.2) }, uAmber: { value: new THREE.Vector3(1.0, 0.42, 0.09) }, uLevel: { value: new THREE.Vector2(3.4, 0.5) }, ...shared },
    vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uBreach; uniform float uBR; uniform vec3 uGold; uniform vec3 uAmber; uniform vec2 uLevel; uniform float uTime; uniform float uPulse;
      varying vec3 vDir;
      vec3 h3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
      void main(){
        vec3 d = normalize(vDir);
        vec3 x = d * 25.0, ip = floor(x), fp = fract(x); float f1 = 8.0, f2 = 8.0; vec3 id = vec3(0.0);
        for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec3 g = vec3(float(i), float(j), float(k)); vec3 r = g + h3(ip + g) - fp; float dd = dot(r, r);
          if (dd < f1) { f2 = f1; f1 = dd; id = ip + g; } else if (dd < f2) f2 = dd;
        }
        float edge = sqrt(f2) - sqrt(f1);
        vec3 hs = h3(id + 7.0);
        float aa = fwidth(edge) * 1.2;
        float vein = 1.0 - smoothstep(0.045 - aa, 0.045 + aa, edge);
        float th = acos(clamp(dot(d, uBreach), -1.0, 1.0)) * 57.29578 + 8.0 * sin(d.x * 5.1 + d.y * 3.3) * sin(d.z * 4.7 + d.y * 2.1);
        float open = uBR + 6.0 - th + (hs.x - 0.5) * 13.0;
        if (open > 13.0) discard;
        if (open > 0.0 && vein < 0.5) discard;
        float pulse = 0.85 + 0.15 * sin(uTime * 0.9 + hs.y * 6.283);
        vec3 pane = uAmber * (uLevel.y * (0.2 + 1.3 * hs.z * hs.z)) * (0.75 + 0.25 * smoothstep(0.05, 0.4, edge)) * pulse;
        vec3 col = mix(pane, uGold * uLevel.x, vein);
        gl_FragColor = vec4(col * uPulse, 1.0);
      }`,
  });
}
