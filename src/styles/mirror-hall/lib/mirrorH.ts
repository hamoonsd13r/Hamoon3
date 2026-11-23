// Mirror Hall · her mother's mirror (آینه): a pointed-arch glass in a chased-silver frame
// with a small foot and a crest, its true reflection (planar, rendered by the engine), and the glass pre-cut into
// shards (rays from the point that hits the floor first, uneven rings, every cell clipped to the arch).
// The shards' whole life is a pure function of time: they burst over the floor, lie still, rise into a slow orbit
// around her, fly to the walls (where the mirror-work sets) and, at the end, fly back into the frame.
import * as THREE from "three";
import { G } from "./base/shapes89";
import { HALL_COMMON, type HallUniforms } from "./hallMat";
import { STD_VERT, makeSilver } from "./propsH";

type P2 = [number, number];
export const GW = 6.6, GSP = 13, GAP = 22; // glass half-width, springline, apex (local, from the glass bottom)
export const FB = 1.7; // frame border
export const FOOT = 2.2; // the glass bottom sits this high above the floor
const rngF = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1e9) / 1e9;
  };
};

/** the glass outline: a pointed arch (two arcs), counter-clockwise, offset outwards by `o` */
export function archOutline(o = 0, nArc = 20): P2[] {
  const hw = GW + o, sp = GSP, h = GAP - GSP + o;
  const e = (h * h - hw * hw) / (2 * hw), r = hw + e;
  const aAp = Math.acos(e / r);
  const pts: P2[] = [[-hw, -o], [hw, -o]];
  for (let i = 0; i <= 6; i++) pts.push([hw, -o + ((sp + o) * i) / 6]);
  for (let i = 1; i <= nArc; i++) {
    const a = (aAp * i) / nArc;
    pts.push([-e + r * Math.cos(a), sp + r * Math.sin(a)]);
  }
  for (let i = 1; i <= nArc; i++) {
    const a = Math.PI - aAp + (aAp * i) / nArc;
    pts.push([e + r * Math.cos(a), sp + r * Math.sin(a)]);
  }
  for (let i = 1; i <= 6; i++) pts.push([-hw, sp - ((sp + o) * i) / 6]);
  // drop duplicates
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-4);
}
function clipPoly(subject: P2[], clip: P2[]): P2[] {
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const inside = (p: P2) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
    const inter = (p: P2, q: P2): P2 => {
      const d = (p[0] - q[0]) * (a[1] - b[1]) - (p[1] - q[1]) * (a[0] - b[0]);
      if (Math.abs(d) < 1e-12) return q;
      const t = ((p[0] - a[0]) * (a[1] - b[1]) - (p[1] - a[1]) * (a[0] - b[0])) / d;
      return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length];
      const pi = inside(p), qi = inside(q);
      if (pi && qi) out.push(q);
      else if (pi && !qi) out.push(inter(p, q));
      else if (!pi && qi) {
        out.push(inter(p, q));
        out.push(q);
      }
    }
  }
  return out;
}
const area = (p: P2[]) => {
  let s = 0;
  for (let i = 0; i < p.length; i++) s += p[i][0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * p[i][1];
  return s / 2;
};
export type ShardDef = { poly: P2[]; c: P2; area: number; ring: number };
export function fractureArch(seed: number, impact: P2, rays = 12, rings = 6): ShardDef[] {
  const R = rngF(seed);
  const clip = archOutline(0);
  const th: number[] = [];
  for (let i = 0; i < rays; i++) th.push(((i + 0.15 + R() * 0.7) / rays) * Math.PI * 2);
  th.sort((x, y) => x - y);
  const radii = th.map(() => {
    const rr = [0];
    let r = 0.5 + R() * 0.35;
    for (let j = 0; j < rings; j++) {
      rr.push(r);
      r *= 1.5 + R() * 0.45;
    }
    rr.push(60);
    return rr;
  });
  const P = (i: number, j: number): P2 => {
    const k = i % rays;
    return [impact[0] + Math.cos(th[k]) * radii[k][j], impact[1] + Math.sin(th[k]) * radii[k][j]];
  };
  const out: ShardDef[] = [];
  for (let i = 0; i < rays; i++)
    for (let j = 0; j <= rings; j++) {
      let cell: P2[] = j === 0 ? [impact, P(i, 1), P(i + 1, 1)] : [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      if (area(cell) < 0) cell = cell.slice().reverse();
      const c = clipPoly(cell, clip);
      if (c.length < 3) continue;
      const A = Math.abs(area(c));
      if (A < 0.05) continue;
      const pieces: P2[][] = [];
      if (A > 6 && c.length >= 4 && R() < 0.8) {
        const cx = c.reduce((s, p) => s + p[0], 0) / c.length, cy = c.reduce((s, p) => s + p[1], 0) / c.length;
        const an = R() * Math.PI, dx = Math.cos(an), dy = Math.sin(an), big = 80;
        const h1: P2[] = [[cx - dx * big, cy - dy * big], [cx + dx * big, cy + dy * big], [cx + dx * big - dy * big, cy + dy * big + dx * big], [cx - dx * big - dy * big, cy - dy * big + dx * big]];
        const h2: P2[] = [[cx + dx * big, cy + dy * big], [cx - dx * big, cy - dy * big], [cx - dx * big + dy * big, cy - dy * big - dx * big], [cx + dx * big + dy * big, cy + dy * big - dx * big]];
        const fix = (p: P2[]) => (area(p) < 0 ? p.slice().reverse() : p);
        pieces.push(clipPoly(c, fix(h1)), clipPoly(c, fix(h2)));
      } else pieces.push(c);
      for (const pc of pieces) {
        const a2 = Math.abs(area(pc));
        if (pc.length < 3 || a2 < 0.05) continue;
        out.push({ poly: pc, c: [pc.reduce((s, p) => s + p[0], 0) / pc.length, pc.reduce((s, p) => s + p[1], 0) / pc.length], area: a2, ring: j });
      }
    }
  return out;
}

// ───────────────────────── materials ─────────────────────────
const GLASS_VERT = /* glsl */ `
uniform mat4 reflMatM;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec4 vR;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vR = reflMatM * w;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const GLASS_FRAG = /* glsl */ `
${HALL_COMMON}
uniform sampler2D reflTexM; uniform vec2 reflResM; uniform float glassAmt;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec4 vR;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = normalize(vN);
  vec2 uv = vR.xy / vR.w;
  vec2 px = 1.0 / reflResM;
  vec3 rc = texture2D(reflTexM, uv).rgb * 0.5 + (texture2D(reflTexM, uv + vec2(px.x, 0.0)).rgb + texture2D(reflTexM, uv - vec2(px.x, 0.0)).rgb + texture2D(reflTexM, uv + vec2(0.0, px.y)).rgb + texture2D(reflTexM, uv - vec2(0.0, px.y)).rgb) * 0.125;
  // an old mirror: the silvering has aged at the edges (soft dark foxing), a faint warm cast
  float edge = min(min(vUv.x, 1.0 - vUv.x) * 2.0, min(vUv.y, 1.0 - vUv.y) * 1.2);
  float fox = smoothstep(0.0, 0.22, edge) * (0.82 + 0.18 * fbm(vUv * vec2(9.0, 14.0)));
  float spots = smoothstep(0.62, 0.7, fbm(vUv * vec2(22.0, 30.0) + 3.0)) * (1.0 - smoothstep(0.0, 0.3, edge));
  vec3 col = rc * vec3(0.86, 0.84, 0.8) * fox * (1.0 - 0.5 * spots);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  col += envR(reflect(-V, N)) * fr;
  gl_FragColor = vec4(col * glassAmt, 1.0);
}`;
const SHARD_VERT = /* glsl */ `
attribute float aFront;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vFront;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vFront = aFront;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SHARD_FRAG = /* glsl */ `
${HALL_COMMON}
uniform float sSeed; uniform float sGlow;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vFront;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = normalize(vN);
  float facing = dot(N, V);
  if (facing < 0.0) N = -N;
  vec3 R = reflect(-V, N);
  vec3 col;
  if (vFront > 0.5) {
    // a mirror piece: the room, the lights, and her
    float fr = pow(1.0 - abs(facing), 3.0);
    col = (roomR(vW, R) * 0.7 + glintsAt(vW, R, 0.022) * 1.4) * 0.86 + herRefl(vW, R, vUv) * 1.7 + envR(R) * fr * 2.0;
  } else if (vFront < -0.5) {
    // the back: dark silvering paint
    col = vec3(0.025, 0.022, 0.02) * diffuseAt(vW, N) * 4.0 + glintsAt(vW, R, 0.05) * 0.02;
  } else {
    // the cut edge: green-white glass that catches the light
    float fr = pow(1.0 - abs(facing), 2.0);
    col = vec3(0.55, 0.8, 0.72) * (0.08 + diffuseAt(vW, N) * 1.4) + glintsAt(vW, R, 0.03) * 0.8 + vec3(0.6, 0.9, 0.8) * (0.12 + fr * 0.3);
  }
  col += vec3(1.0, 0.96, 0.9) * sGlow;
  gl_FragColor = vec4(col, 1.0);
}`;

export type Mirror = ReturnType<typeof makeMirror>;
export function makeMirror(U: HallUniforms, at: THREE.Vector3, yaw: number) {
  const root = new THREE.Group();
  root.position.copy(at);
  root.rotation.y = yaw;
  const pivot = new THREE.Group(); // the bottom edge of the frame's foot: the mirror tips over around it
  pivot.position.set(0, 0, -0.9);
  root.add(pivot);
  const body = new THREE.Group();
  body.position.set(0, FOOT, 0.9);
  pivot.add(body);
  const silver = makeSilver(U, new THREE.Vector3(0.84, 0.82, 0.78), 0.06);
  // the frame: outer arch minus the glass, extruded with a bevel; a slimmer bead inside; the crest; the foot
  {
    const outer = new THREE.Shape(archOutline(FB).map(([x, y]) => new THREE.Vector2(x, y)));
    outer.holes.push(new THREE.Path(archOutline(0).map(([x, y]) => new THREE.Vector2(x, y)).reverse()));
    const fg = new THREE.ExtrudeGeometry(outer, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.3, bevelSegments: 3, curveSegments: 2 });
    fg.translate(0, 0, -0.55);
    body.add(new THREE.Mesh(fg, silver));
    const bead = new THREE.Shape(archOutline(0.45).map(([x, y]) => new THREE.Vector2(x, y)));
    bead.holes.push(new THREE.Path(archOutline(0.05).map(([x, y]) => new THREE.Vector2(x, y)).reverse()));
    const bg = new THREE.ExtrudeGeometry(bead, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2, curveSegments: 2 });
    bg.translate(0, 0, 0.25);
    body.add(new THREE.Mesh(bg, silver));
    const crest = new THREE.Mesh(new THREE.LatheGeometry([[0.01, 0], [0.9, 0.25], [0.55, 0.9], [0.9, 1.5], [0.35, 2.4], [0.5, 2.8], [0.01, 3.4]].map(([r, y]) => new THREE.Vector2(r, y)), 24), silver);
    crest.position.set(0, GAP + FB - 0.2, -0.1);
    body.add(crest);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2 * (GW + FB) + 1.2, 1.0, 2.6), silver);
    foot.position.set(0, -FOOT + 0.5, -0.2);
    body.add(foot);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(2 * GW, FOOT - 1.0, 1.0), silver);
    neck.position.set(0, -FOOT + 1.0 + (FOOT - 1.0) / 2 - 0.1, -0.2);
    body.add(neck);
    const back = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(archOutline(FB).map(([x, y]) => new THREE.Vector2(x, y)))), new THREE.MeshBasicMaterial({ color: 0x0a0806, side: THREE.DoubleSide }));
    back.position.z = -0.62;
    body.add(back);
  }
  // the glass (planar reflection)
  const gU = { ...U, reflTexM: { value: null as THREE.Texture | null }, reflMatM: { value: new THREE.Matrix4() }, reflResM: { value: new THREE.Vector2(960, 540) }, glassAmt: { value: 1 } };
  const gshape = new THREE.Shape(archOutline(0).map(([x, y]) => new THREE.Vector2(x, y)));
  const gg = new THREE.ShapeGeometry(gshape, 24);
  {
    const pos = gg.attributes.position, uv = gg.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + GW) / (2 * GW), pos.getY(i) / GAP);
  }
  const glass = new THREE.Mesh(gg, new THREE.ShaderMaterial({ uniforms: gU, vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, side: THREE.FrontSide }));
  glass.position.z = 0.02;
  body.add(glass);
  // the shards (hidden until the glass breaks)
  const defs = fractureArch(89, [0.8, 17.5], 12, 6);
  const sU = { ...U, sSeed: { value: 0 }, sGlow: { value: 0 } };
  const shardMat = new THREE.ShaderMaterial({ uniforms: sU, vertexShader: SHARD_VERT, fragmentShader: SHARD_FRAG, side: THREE.DoubleSide });
  const shards = defs.map((d) => {
    const shape = new THREE.Shape(d.poly.map(([x, y]) => new THREE.Vector2(x - d.c[0], y - d.c[1])));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, -0.18);
    const pos = geo.attributes.position, nrm = geo.attributes.normal;
    const front = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) front[i] = nrm.getZ(i) > 0.5 ? 1 : nrm.getZ(i) < -0.5 ? -1 : 0;
    geo.setAttribute("aFront", new THREE.BufferAttribute(front, 1));
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[2 * i] = (pos.getX(i) + d.c[0] + GW) / (2 * GW);
      uv[2 * i + 1] = (pos.getY(i) + d.c[1]) / GAP;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(geo, shardMat);
    m.matrixAutoUpdate = false;
    m.visible = false;
    m.frustumCulled = false;
    return { m, d };
  });
  // the cracks: every shard edge as a glowing line, revealed outwards from the impact point (crackK 0 → 1)
  const segs: number[] = [], dist: number[] = [];
  const IMP: P2 = [0.8, 17.5];
  let dMax = 0;
  for (const d of defs) for (let i = 0; i < d.poly.length; i++) {
    const p = d.poly[i], q = d.poly[(i + 1) % d.poly.length];
    // skip the outline of the glass (only the cracks inside)
    const onEdge = (x: P2) => clipPoly([[x[0] - 0.02, x[1] - 0.02], [x[0] + 0.02, x[1] - 0.02], [x[0] + 0.02, x[1] + 0.02], [x[0] - 0.02, x[1] + 0.02]], archOutline(-0.15)).length === 0;
    if (onEdge(p) && onEdge(q)) continue;
    segs.push(p[0], p[1], 0.06, q[0], q[1], 0.06);
    const dp = Math.hypot(p[0] - IMP[0], p[1] - IMP[1]), dq = Math.hypot(q[0] - IMP[0], q[1] - IMP[1]);
    dist.push(dp, dq);
    dMax = Math.max(dMax, dp, dq);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
  cg.setAttribute("aD", new THREE.Float32BufferAttribute(dist.map((x) => x / dMax), 1));
  const cU = { crackK: { value: 0 } };
  const cracks = new THREE.LineSegments(cg, new THREE.ShaderMaterial({
    uniforms: cU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `attribute float aD; varying float vD; void main(){ vD = aD; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float crackK; varying float vD; void main(){ float a = smoothstep(crackK + 0.02, crackK - 0.08, vD); if (a <= 0.0) discard; gl_FragColor = vec4(vec3(0.75, 0.88, 1.0) * a * 0.9, 1.0); }`,
  }));
  cracks.position.z = 0.04;
  body.add(cracks);
  root.traverse((o) => (o.frustumCulled = false));
  return { root, pivot, body, glass, gU, shards, sU, defs, silver, cracks, cU };
}

// ───────────────────────── the shards' life ─────────────────────────
export type ShardTimes = { tip: number; impact: number; lev: number; fly: number[]; flyDur: number; ret?: number; retEnd?: number };
export type Life = { base: THREE.Matrix4; baseUp: THREE.Matrix4; rest: THREE.Vector3; restQ: THREE.Quaternion; r: number[] };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const sst = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** the tilt of the mirror at time t: leaning back a little, then toppling backwards onto the floor (glass up) */
export function tiltAt(t: number, T: ShardTimes) {
  const lean = -0.07;
  if (t < T.tip) return lean;
  const u = Math.min(1, (t - T.tip) / (T.impact - T.tip));
  return lean + (-Math.PI / 2 - lean) * u * u;
}

/** precomputed rest state of every shard after the burst (deterministic) */
export function planShards(M: Mirror, T: ShardTimes): Life[] {
  void T;
  M.pivot.rotation.x = -0.07;
  M.root.updateMatrixWorld(true);
  const ups = M.shards.map(({ d }) => new THREE.Matrix4().compose(new THREE.Vector3(d.c[0], d.c[1], 0.15), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).premultiply(M.body.matrixWorld));
  M.pivot.rotation.x = -Math.PI / 2;
  M.root.updateMatrixWorld(true);
  const R = rngF(7);
  const impW = new THREE.Vector3(0.8, 17.5, 0).applyMatrix4(M.body.matrixWorld);
  return M.shards.map(({ d }, si) => {
    const base = new THREE.Matrix4().compose(new THREE.Vector3(d.c[0], d.c[1], 0.15), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).premultiply(M.body.matrixWorld);
    const p0 = new THREE.Vector3().setFromMatrixPosition(base);
    const dir = p0.clone().sub(impW).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(R() - 0.5, 0, R() - 0.5);
    dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 0.9);
    const r = Array.from({ length: 10 }, () => R());
    const dist = (3 + 16 * r[0]) * (1 - 0.06 * d.ring);
    const rest = p0.clone().addScaledVector(dir, dist);
    rest.y = G + 0.14;
    const q0 = new THREE.Quaternion().setFromRotationMatrix(base);
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r[1] - 0.5) * 3.0);
    const flip = r[2] < 0.18 ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI) : new THREE.Quaternion();
    const restQ = spin.multiply(q0).multiply(flip);
    return { base, baseUp: ups[si], rest, restQ, r };
  });
}

/** place every shard for time t. `her` = the centre they orbit; `targets` = where each one sets into the walls */
export function placeShards(M: Mirror, L: Life[], T: ShardTimes, t: number, her: THREE.Vector3, targets: THREE.Vector3[], held?: Map<number, { p: THREE.Vector3; q?: THREE.Quaternion; s?: number }>) {
  const broken = t >= T.impact && !(T.retEnd !== undefined && t >= T.retEnd);
  M.glass.visible = !broken;
  M.shards.forEach(({ m }, i) => {
    const l = L[i];
    const hv = held?.get(i);
    if (hv) {
      _m.compose(hv.p, hv.q ?? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0.3, 1, 0.2).normalize(), t * 0.8 + i), _s.setScalar(hv.s ?? 1));
      m.matrix.copy(_m);
      m.matrixWorld.copy(_m);
      m.visible = (hv.s ?? 1) > 0.01;
      return;
    }
    if (!broken || held) {
      m.visible = false;
      return;
    }
    const r = l.r;
    const tau = t - T.impact;
    // 1 · the burst over the floor
    const k = 1 - Math.exp(-3.6 * tau);
    const p0 = new THREE.Vector3().setFromMatrixPosition(l.base);
    const q0 = new THREE.Quaternion().setFromRotationMatrix(l.base);
    _p.lerpVectors(p0, l.rest, k);
    const hop = tau < 0.4 ? Math.sin((Math.PI * tau) / 0.4) * (0.4 + 2.2 * r[3]) : 0;
    _p.y = Math.max(G + 0.14, p0.y + (l.rest.y - p0.y) * Math.min(1, tau / 0.12)) + hop;
    _q.copy(q0).slerp(l.restQ, Math.min(1, k * 1.15));
    let glow = Math.exp(-tau * 9) * 0.6;
    // 2 · rising into a slow orbit around her
    const tl = T.lev + r[4] * 1.4;
    const u = sst((t - tl) / 2.8);
    if (u > 0) {
      const ang0 = Math.atan2(l.rest.z - her.z, l.rest.x - her.x);
      const om = 0.22 + 0.18 * r[5];
      const ang = ang0 + om * Math.max(0, t - tl);
      const rad = 15 + 24 * r[6];
      const y = G + 9 + 34 * r[7] + Math.sin(t * (0.6 + r[8]) + r[9] * 6) * 1.4;
      const orb = new THREE.Vector3(her.x + Math.cos(ang) * rad, y, her.z + Math.sin(ang) * rad);
      _p.lerp(orb, u);
      const tumble = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(r[1] - 0.5, 1, r[2] - 0.5).normalize(), (t - tl) * (0.5 + r[3]) * u);
      _q.multiply(tumble);
      // stand up: face outwards a little so the pieces catch the light
      const face = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (Math.PI / 2) * u * 0.9);
      _q.multiply(face);
      glow += 0.0;
    }
    // 3 · flying to the walls (each piece on its own beat), gone when it lands
    const tf = T.fly[i % T.fly.length] ?? 1e9;
    const depart = tf - T.flyDur * (0.8 + 0.4 * r[0]);
    let scale = 1;
    if (t >= depart && T.fly.length) {
      const tgt = targets[i % targets.length];
      const v = Math.min(1, (t - depart) / (tf - depart));
      const a = _p.clone();
      const ctrl = a.clone().lerp(tgt, 0.5).add(new THREE.Vector3(0, 18 + 20 * r[5], 0));
      const e = v * v * (3 - 2 * v) * 0.5 + v * 0.5;
      _p.set(0, 0, 0).addScaledVector(a, (1 - e) * (1 - e)).addScaledVector(ctrl, 2 * e * (1 - e)).addScaledVector(tgt, e * e);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), v * 6));
      scale = 1 - 0.35 * v;
      glow = Math.max(glow, v * v * 0.8);
      if (t >= tf) scale = 0;
    }
    // 4 · the end: back into the frame
    if (T.ret !== undefined && T.retEnd !== undefined && t >= T.ret) {
      const tgt = targets[i % targets.length];
      const pU = new THREE.Vector3().setFromMatrixPosition(l.baseUp);
      const qU = new THREE.Quaternion().setFromRotationMatrix(l.baseUp);
      const st0 = T.ret + r[4] * (T.retEnd - T.ret) * 0.45;
      const v = Math.min(1, Math.max(0, (t - st0) / ((T.retEnd - T.ret) * 0.55)));
      const ctrl = tgt.clone().lerp(pU, 0.5).add(new THREE.Vector3(0, 22, 0));
      const e = v * v * (3 - 2 * v);
      _p.set(0, 0, 0).addScaledVector(tgt, (1 - e) * (1 - e)).addScaledVector(ctrl, 2 * e * (1 - e)).addScaledVector(pU, e * e);
      _q.copy(qU);
      scale = v > 0 ? 1 : 0;
      glow = (1 - v) * 0.5;
    }
    m.visible = scale > 0.01;
    _s.setScalar(Math.max(scale, 1e-3));
    _m.compose(_p, _q, _s);
    m.matrix.copy(_m);
    m.matrixWorld.copy(_m);
    void glow;
  });
}
export { G as FLOOR_Y };
export { STD_VERT };
