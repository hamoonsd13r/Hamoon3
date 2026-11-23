// Mirror Hall · the light in the hall: the swarm (her, the faces, her mother, her copies,
// the flying shards), air motes lit by the candles, spark bursts and a core glow. A copy of the light-swarm engine's
// particle bodies (engine89) without its own renderer: the hall engine draws these into its frame (and into the
// floor's reflection, and into her picture for the mirror pieces).
import * as THREE from "three";
import { rng } from "../../light-swarm/math";
import { makeSegSystem } from "../../light-swarm/segs";
import { buildShapeTexture, N, SIDE, type ShapeGen } from "../../light-swarm/shapes";
import { makeDof, makeSegs } from "./base/segs24";
import { G, IW0, IW1 } from "./base/shapes89";
import type { HallEngine } from "./engineH";

export const NBW = 24; // beats window for the beat-quantised builds

export type Swarm = ReturnType<typeof buildSwarm>;
export function buildSwarm(E: HallEngine, opts: { shapes: readonly string[]; extra: Record<string, ShapeGen>; dens: Record<string, number> }) {
  const SHP = opts.shapes;
  const KS = SHP.length;
  const si = (name: string) => {
    const k = SHP.indexOf(name);
    if (k < 0) throw new Error(`hall swarm: unknown shape ${name}`);
    return k;
  };
  const R = rng(17);
  const dof = makeDof();
  const all: { U: Record<string, { value: unknown }>; mesh: THREE.Mesh }[] = [];
  const reg = <T extends { U: Record<string, { value: unknown }>; mesh: THREE.Mesh }>(s: T) => {
    (s.mesh.material as THREE.ShaderMaterial).side = THREE.DoubleSide;
    s.mesh.frustumCulled = false;
    all.push(s);
    E.partMats.push(s.mesh.material as THREE.ShaderMaterial);
    E.partScene.add(s.mesh);
    return s;
  };

  // ---------------- the swarm ----------------
  const { data, K } = buildShapeTexture(SHP, opts.extra);
  const tex = new THREE.DataTexture(data, SIDE, SIDE * K, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  const pid = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) pid.set([i, R()], i * 2);
  const partU = {
    shapeTex: { value: tex },
    sA: { value: 0 }, sB: { value: 1 }, offA: { value: new THREE.Vector3() }, offB: { value: new THREE.Vector3() },
    t0: { value: 0 }, D: { value: 1 }, F: { value: 0.6 }, quant: { value: 0 }, swirl: { value: 0 }, turb: { value: 0 },
    tPrev: { value: 0 }, beats: { value: Array.from({ length: NBW }, (_, i) => i) }, dens: { value: SHP.map((n) => opts.dens[n] ?? 0.5) },
    kick: { value: 0 }, beat: { value: 0 }, pAmt: { value: 1 }, sizeK: { value: 1 },
    arrGain: { value: 1.0 }, flyDim: { value: 0.6 },
    herOnly: { value: 0 }, herK: { value: 1 }, othK: { value: 1 }, glassK: { value: 1 }, warmK: { value: 1 },
    scanY: { value: -99 }, scanAmt: { value: 0 },
  };
  const body = /* glsl */ `
#define NB ${NBW}
#define FLOOR ${G.toFixed(2)}
uniform sampler2D shapeTex;
uniform float sA, sB, t0, D, F, quant, swirl, turb, tPrev, kick, beat, pAmt, sizeK, arrGain, flyDim, herOnly, herK, othK, glassK, warmK, scanY, scanAmt;
uniform vec3 offA, offB;
uniform float beats[NB];
uniform float dens[${KS}];
float hsh(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x - s*p.z, p.y, s*p.x + c*p.z); }
vec4 fetchS(float s, float id){
  int i = int(id + 0.5);
  return texelFetch(shapeTex, ivec2(i % ${SIDE}, i / ${SIDE} + int(s + 0.5) * ${SIDE}), 0);
}
float catOf(vec4 q){ return floor(q.w + 1e-4); }
float bOf(vec4 q){ return fract(q.w + 1e-4); }
vec3 shapeP(float s, vec4 q, float t){
  float cat = catOf(q);
  vec3 p = q.xyz;
  if (cat < 0.5) { // air motes drift slowly; the floor glow stays
    if (p.y > FLOOR + 1.0) p += vec3(sin(t * 0.23 + pid.y * 40.0), sin(t * 0.17 + pid.y * 23.0) * 0.6, cos(t * 0.19 + pid.y * 31.0)) * 2.2;
    return p;
  }
  if (cat > 2.5 && cat < 3.5) return p; // parked behind the walls
  if (cat > 6.5 && cat < 7.5) { p.y += sin(t * 0.8 + pid.y * 30.0) * 0.6; return p; } // shards: a slow float
  // figures: a slow living shimmer (light fibres are never quite still)
  p.x += sin(t * 1.3 + p.y * 0.21 + p.z * 0.07) * 0.06;
  p.y += sin(t * 1.1 + p.x * 0.17) * 0.04;
  return p;
}
float departT(float b, float jit){
  float tau = t0 + D * b;
  if (quant > 0.5) {
    float q = beats[0], qn = beats[1];
    for (int i = 0; i + 1 < NB; i++) { if (beats[i] <= tau + 0.02) { q = beats[i]; qn = beats[i + 1]; } }
    float fr = clamp((tau - q) / max(qn - q, 0.1), 0.0, 1.0);
    tau = q + fr * (qn - q) * 0.22 + jit * 0.05;
  } else tau += jit * 0.05;
  return tau;
}
float KE; float ARR; float INF; vec4 QA; vec4 QB; float PY;
vec3 morphAt(float t){
  float id = pid.x;
  QA = fetchS(sA, id);
  QB = fetchS(sB, id);
  vec3 a = shapeP(sA, QA, t) + offA;
  vec3 b = shapeP(sB, QB, t) + offB;
  float tau = departT(bOf(QB), pid.y);
  float k = clamp((t - tau) / F, 0.0, 1.0);
  float ke = 1.0 - pow(1.0 - k, 3.0);
  KE = ke; ARR = tau + F; INF = sin(3.14159 * k);
  vec3 p = mix(a, b, ke);
  if (k > 0.0) p = offB + rotY(p - offB, (1.0 - ke) * (1.0 - ke) * swirl);
  if (INF > 0.001) p += curl3(p * 0.035 + vec3(pid.y * 5.0, 0.0, t * 0.15)) * turb * INF;
  return p;
}
vec3 P(float e){ vec3 p = e < 0.5 ? morphAt(tPrev) : morphAt(time); PY = p.y; return p; }
// classes: 0 air · 1 fibre · 2 bright fibre · 3 parked · 4 eyes · 5 warm glint · 6 her mother (warm) · 7 glass shards
float catBright(float s, vec4 q){
  int k = int(s + 0.5);
  float cat = catOf(q);
  float br = cat < 0.5 ? 0.11 : (cat < 1.5 ? 1.0 : (cat < 2.5 ? 1.45 : (cat < 3.5 ? 0.0 : (cat < 4.5 ? 1.9 : (cat < 5.5 ? 1.8 : (cat < 6.5 ? 1.0 * warmK : (cat < 7.5 ? 1.6 * glassK : 0.075)))))));
  return br * dens[k];
}
vec3 catCol(float s, vec4 q){
  float cat = catOf(q);
  vec3 ice = vec3(0.7, 0.86, 1.0), white = vec3(1.0, 0.98, 0.95);
  float h = hsh(pid.x * 1.3);
  vec3 c = mix(ice, white, step(0.55, h));
  if (cat > 1.5 && cat < 2.5) c = white;
  if (cat > 3.5 && cat < 4.5) c = vec3(0.85, 0.95, 1.0);
  if (cat > 4.5 && cat < 5.5) c = vec3(1.0, 0.82, 0.55);
  if (cat > 5.5 && cat < 6.5) c = mix(vec3(1.0, 0.7, 0.38), vec3(1.0, 0.86, 0.62), h);
  if (cat > 6.5 && cat < 7.5) c = mix(vec3(0.82, 0.9, 1.0), vec3(1.0, 0.95, 0.85), h);
  if (cat > 7.5) c = vec3(0.72, 0.86, 1.0);
  if (cat < 0.5) c = mix(vec3(1.0, 0.86, 0.66), vec3(0.8, 0.88, 1.0), h);
  return c;
}
float WIDTH(){
  DOFK = mix(catOf(QA), catOf(QB), KE) < 0.5 ? 0.45 : 0.35;
  float aur = step(7.5, mix(catOf(QA), catOf(QB), KE));
  if (aur > 0.5) { DOFK = 0.15; return 11.0 * sizeK; }
  return (1.45 + 1.4 * step(0.93, pid.y)) * sizeK * (1.0 + 0.2 * kick);
}
float ALPHA(){
  float br = mix(catBright(sA, QA), catBright(sB, QB), KE);
  float cb = catOf(QB);
  float land = time > ARR ? arrGain * exp(-(time - ARR) * 6.0) * dens[int(sB + 0.5)] * step(0.5, cb) * step(cb, 2.5) : 0.0;
  float tw = 0.78 + 0.22 * sin(time * (1.0 + 3.0 * pid.y) + pid.y * 60.0);
  if (cb > 6.5 && cb < 7.5) tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(time * (2.0 + 5.0 * pid.y) + pid.y * 90.0), 3.0);
  float a = pAmt * (br * tw * mix(1.0, flyDim, INF) + land);
  float hero = step(${IW0.toFixed(1)}, pid.x) * (1.0 - step(${IW1.toFixed(1)}, pid.x));
  a *= mix(othK, herK, hero);
  if (herOnly > 0.5) a *= hero;
  float body = step(0.5, cb) * (1.0 - step(2.5, cb) * step(cb, 3.5));
  float sd = (PY - scanY) / 2.2;
  a *= 1.0 + 1.3 * scanAmt * body * exp(-sd * sd);
  return a;
}
vec3 COL(float e){
  vec3 c = mix(catCol(sA, QA), catCol(sB, QB), KE);
  return c * (0.55 + 0.75 * e);
}
`;
  const parts = reg(makeSegs(N, [{ name: "pid", size: 2, data: pid }], body, partU, dof));
  parts.U.lenFade.value = 0.2;

  // ---------------- air motes lit by the nearest lights ----------------
  const DN = 14000;
  const dPos = new Float32Array(DN * 4);
  for (let i = 0; i < DN; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 135;
    dPos.set([Math.cos(a) * r, G + 4 + Math.pow(R(), 1.4) * 230, Math.sin(a) * r, R()], i * 4);
  }
  const dustU = { dl: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -999, 0, 0)) }, amt: { value: 1 }, vel: { value: new THREE.Vector3() } };
  const dust = reg(
    makeSegs(
      DN,
      [{ name: "dp", size: 4, data: dPos }],
      /* glsl */ `
uniform vec4 dl[8]; uniform float amt; uniform vec3 vel;
float LIT;
vec3 at(float t){
  vec3 p = dp.xyz + vec3(sin(t * 0.13 + dp.w * 50.0) * 3.0, sin(t * 0.09 + dp.w * 31.0) * 4.0 + t * (0.25 + 0.5 * dp.w), cos(t * 0.11 + dp.w * 77.0) * 3.0);
  p.y = ${(G + 4).toFixed(2)} + mod(p.y - ${(G + 4).toFixed(2)}, 230.0);
  return p;
}
vec3 P(float e){
  vec3 p = at(time - (1.0 - e) * 0.05);
  LIT = 0.0;
  for (int i = 0; i < 8; i++) { vec3 d = p - dl[i].xyz; LIT += dl[i].w / (dot(d, d) + 90.0); }
  return p;
}
float WIDTH(){ return 1.1 + 1.0 * step(0.985, dp.w); }
float ALPHA(){ return amt * min(LIT, 1.4) * (0.35 + 0.65 * fract(dp.w * 7.31)) * (0.7 + 0.3 * sin(time * (0.7 + 2.0 * dp.w) + dp.w * 40.0)); }
vec3 COL(float e){ return mix(vec3(1.0, 0.82, 0.6), vec3(0.85, 0.92, 1.0), step(0.6, fract(dp.w * 13.7))); }
`,
      dustU,
      dof,
    ),
  );

  // ---------------- spark bursts ----------------
  const MAXB = 6, BN = 9000;
  const bAttr = new Float32Array(BN * 4);
  for (let i = 0; i < BN; i++) bAttr.set([i % MAXB, R(), R(), R()], i * 4);
  const burstU = {
    evT: { value: Array.from({ length: MAXB }, () => -99) },
    evC: { value: Array.from({ length: MAXB }, () => new THREE.Vector3()) },
    evP: { value: Array.from({ length: MAXB }, () => new THREE.Vector4(30, 2, 1, 2)) },
    evD: { value: Array.from({ length: MAXB }, () => 1) },
    trail: { value: 0.12 },
  };
  const bursts = reg(
    makeSegSystem(
      BN,
      [{ name: "ba", size: 4, data: bAttr }],
      /* glsl */ `
uniform float evT[${MAXB}]; uniform vec3 evC[${MAXB}]; uniform vec4 evP[${MAXB}]; uniform float evD[${MAXB}]; uniform float trail;
float AGE; vec4 EP; float ED;
vec3 dirOf(){ float th = ba.y * 6.2831853; float ph = acos(2.0 * ba.z - 1.0); return vec3(sin(ph)*cos(th), cos(ph)*0.75, sin(ph)*sin(th)); }
vec3 pos(float age){
  int e = int(ba.x + 0.5);
  vec4 p = evP[e];
  float dist = p.x / p.y * (0.35 + 0.65 * ba.w);
  vec3 q = evC[e] + dirOf() * dist * (1.0 - exp(-p.y * age));
  q += curl3(q * 0.06 + ba.yzw * 3.0) * p.z * age * exp(-age * 0.9) * 2.0;
  return q;
}
vec3 P(float e){
  int ev = int(ba.x + 0.5);
  AGE = time - evT[ev]; EP = evP[ev]; ED = evD[ev];
  return pos(max(AGE - (1.0 - e) * trail * (0.6 + 0.8 * ba.z), 0.0));
}
float WIDTH(){ return 1.3 + 1.4 * step(0.9, ba.w); }
float ALPHA(){
  if (AGE < 0.0 || AGE > EP.w) return 0.0;
  if (fract(ba.y * 7.13 + ba.w * 3.71) > ED) return 0.0;
  return smoothstep(0.0, 0.03, AGE) * (1.0 - smoothstep(EP.w * 0.55, EP.w, AGE)) * 0.55;
}
vec3 COL(float e){ return mix(vec3(0.55, 0.75, 1.0) * 0.7, vec3(1.0, 0.98, 0.95) * 1.3, e * e); }
`,
      burstU,
    ),
  );

  // ---------------- core glow ----------------
  const coreAttr = new Float32Array([0, 0, 0, 0, 0, 0, 0, 1]);
  const coreU = { cAmt: { value: 0 }, cSize: { value: 40 }, cPos: { value: new THREE.Vector3() }, cCol: { value: new THREE.Vector3(1, 0.98, 0.94) } };
  const core = reg(
    makeSegSystem(
      2,
      [{ name: "ca4", size: 4, data: coreAttr }],
      /* glsl */ `
uniform float cAmt, cSize; uniform vec3 cPos, cCol;
vec3 P(float e){ return cPos; }
float WIDTH(){ return ca4.w < 0.5 ? cSize : cSize * 4.0; }
float ALPHA(){ return cAmt * (ca4.w < 0.5 ? 1.0 : 0.2); }
vec3 COL(float e){ return ca4.w < 0.5 ? cCol * 3.0 : vec3(0.6, 0.8, 1.0) * 1.4; }
`,
      coreU,
    ),
  );
  (core.mesh.material as THREE.ShaderMaterial).fragmentShader = `
uniform float gain; varying vec2 vUv; varying vec3 vCol; varying float vA;
void main(){ vec2 q = vec2(vUv.x * 2.0 - 1.0, vUv.y); float r = length(q); float a = exp(-r * r * 5.0) + 0.6 * exp(-r * r * 40.0); gl_FragColor = vec4(vCol * vA * a * gain, 1.0); }`;

  // the engine sets the resolution for each target; her picture shows her alone
  E.partRes.push((w, h, px) => all.forEach((s) => {
    (s.U.res.value as THREE.Vector2).set(w, h);
    s.U.px.value = px;
  }));
  let savedB = 0;
  E.herMask.push((on) => {
    partU.herOnly.value = on ? 1 : 0;
    dust.mesh.visible = bursts.mesh.visible = core.mesh.visible = !on;
    // no depth of field in her picture
    if (on) {
      savedB = dof.bokeh.value;
      dof.bokeh.value = 0;
    } else dof.bokeh.value = savedB;
  });
  const setTime = (t: number) => all.forEach((s) => (s.U.time.value = t));
  return { parts, partU, dust, dustU, bursts, burstU, core, coreU, dof, setTime, MAXB, shapeIndex: si, K: KS };
}
