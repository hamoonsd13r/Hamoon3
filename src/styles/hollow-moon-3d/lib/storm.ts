// Hollow Moon 3D · the storm. One cloud-to-sea lightning flash, built the way a real one unfolds on film: the cloud flickers
// from within, a faint stepped leader works its way down and forks, the return stroke lights the whole channel for one
// frame, then three weaker strokes run down the same channel while the cloud goes on glowing — plus a few silent sheet
// flashes far off in the deck. The channel is a fractal polyline drawn as thin HDR ribbons (the bloom of the lens does
// the rest); where it runs inside the cloud the cloud hides it. Everything is a pure function of film time.
import * as THREE from "three";
import { FPS, rng, type V3 } from "./util";
import { SKY_GLSL, type SkyU } from "./sky";

type Path = { pts: THREE.Vector3[]; s0: number; i0: number; i1: number; main: number; w: number };

/** a tortuous channel from a to b: midpoint displacement across the line of sight (and a little along it) */
function channel(rand: () => number, a: THREE.Vector3, b: THREE.Vector3, depth: THREE.Vector3, rough: number, levels: number) {
  let pts = [a.clone(), b.clone()];
  let amp = a.distanceTo(b) * rough;
  for (let l = 0; l < levels; l++) {
    const next: THREE.Vector3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const dir = q.clone().sub(p).normalize();
      const side = new THREE.Vector3().crossVectors(dir, depth).normalize();
      const mid = p.clone().add(q).multiplyScalar(0.5);
      // real channels kink: now and then a much larger step
      const kick = rand() < 0.16 ? 1.9 : 1;
      mid.addScaledVector(side, (rand() - 0.5) * 2 * amp * kick).addScaledVector(depth, (rand() - 0.5) * amp * 0.7);
      next.push(mid, q);
    }
    pts = next;
    amp *= 0.5;
  }
  return pts;
}
const lengthOf = (p: THREE.Vector3[]) => { let l = 0; for (let i = 1; i < p.length; i++) l += p[i].distanceTo(p[i - 1]); return l; };

/** sheets: the far silent flashes [film second, compass offset, elevation, strength] (default SHEETS, set for the demo) */
export type StormOpts = { t0: number; eye: V3; look: V3; res: THREE.Vector2; az: number; elTop: number; dist: number; seed: number; px: number; sheets?: [number, number, number, number][] };
export type StormState = { ch: number; br: number; lead: number; leadK: number; cloud: number; light: number; sheet: number; sheetDir: THREE.Vector3 };

/** silent flashes inside the deck, far away: film second, compass offset from the opening shot's line of sight and
 *  elevation (degrees), strength */
export const SHEETS: [number, number, number, number][] = [
  [1.47, 19, 9.5, 0.26],
  [5.83, -23, 11, 0.3],
  [9.33, 31, 14, 0.4],
  [16.03, -38, 16, 0.45],
];
/** brightness of the frames of a sheet flash */
const SHEET_ENV = [0.35, 1, 0.3, 0.62, 0.15, 0.05, 0.3, 0.1, 0.03];
/** the main flash, frame by frame from the return stroke: the channel, its forks, and the cloud's own flicker */
const CH = [1, 0.4, 0.1, 0.72, 0.26, 0.07, 0.04, 0.5, 0.16, 0.05, 0.03, 0.26, 0.09, 0.035];
const BR = [1, 0.3, 0.05];
const IC: Record<number, number> = { [-11]: 0.1, [-10]: 0.26, [-9]: 0.08, [-7]: 0.14, [-6]: 0.2, [-5]: 0.12, [-4]: 0.2, [-3]: 0.26, [-2]: 0.3, [-1]: 0.36, 2: 0.5, 5: 0.34, 6: 0.14, 9: 0.26, 10: 0.1, 14: 0.34, 15: 0.16, 16: 0.06, 19: 0.18, 20: 0.07 };
const LEAD_FRAMES = 7;

export class Storm {
  mesh: THREE.Mesh;
  /** where the channel leaves the cloud, and its middle (world) */
  top = new THREE.Vector3();
  mid = new THREE.Vector3();
  private U: Record<string, THREE.IUniform>;
  private f0: number;
  private fwdAz: number;
  state: StormState = { ch: 0, br: 0, lead: 0, leadK: 0, cloud: 0, light: 0, sheet: 0, sheetDir: new THREE.Vector3(0, 1, 0) };

  constructor(sky: SkyU, public o: StormOpts) {
    const rand = rng(o.seed);
    const eye = new THREE.Vector3(...o.eye), look = new THREE.Vector3(...o.look);
    this.fwdAz = Math.atan2(look.x - eye.x, look.z - eye.z);
    const hd = (azDeg: number) => { const a = this.fwdAz - (azDeg * Math.PI) / 180; return new THREE.Vector3(Math.sin(a), 0, Math.cos(a)); };
    // the stroke: from the cloud base, leaning a little, down to the sea
    const depth = hd(o.az), right = new THREE.Vector3(depth.z, 0, -depth.x);
    const ground = new THREE.Vector3(eye.x, 0, eye.z).addScaledVector(depth, o.dist);
    const H = o.dist * Math.tan((o.elTop * Math.PI) / 180) * 1.32;          // it starts well inside the deck
    const topP = ground.clone().addScaledVector(right, -0.2 * H).add(new THREE.Vector3(0, H, 0));
    const main = channel(rand, topP, ground, depth, 0.17, 7);
    const mainLen = lengthOf(main);
    const paths: Path[] = [{ pts: main, s0: 0, i0: 1, i1: 1, main: 1, w: 1 }];
    const cum: number[] = [0];
    for (let i = 1; i < main.length; i++) cum.push(cum[i - 1] + main[i].distanceTo(main[i - 1]));
    const fork = (from: THREE.Vector3[], fromCum: number[], s0base: number, fromLen: number, i: number, lenK: number, inten: number, levelsB: number, sub: number) => {
      const start = from[i];
      const dm = from[Math.min(i + 4, from.length - 1)].clone().sub(from[Math.max(i - 1, 0)]).normalize();
      // forks leave at 20 to 55 degrees, to either side, and keep heading down
      const ang = ((20 + 35 * rand()) * Math.PI) / 180 * (rand() < 0.5 ? -1 : 1);
      const dirB = dm.clone().applyAxisAngle(depth, ang).addScaledVector(depth, (rand() - 0.5) * 0.5).normalize();
      dirB.y = Math.min(dirB.y, -0.12);
      dirB.normalize();
      const len = fromLen * lenK;
      const end = start.clone().addScaledVector(dirB, len);
      if (end.y < 30) end.y = 30 + rand() * 60;                               // forks do not reach the sea
      const pts = channel(rand, start, end, depth, 0.16, levelsB);
      const s0 = s0base + fromCum[i] / mainLen;
      paths.push({ pts, s0, i0: inten, i1: 0.04, main: 0, w: 0.72 });
      if (sub > 0) {
        const c2: number[] = [0];
        for (let k = 1; k < pts.length; k++) c2.push(c2[k - 1] + pts[k].distanceTo(pts[k - 1]));
        const n = Math.floor(rand() * 2.6);
        for (let k = 0; k < n; k++) {
          const j = Math.floor(pts.length * (0.2 + 0.55 * rand()));
          fork(pts, c2, s0, len, j, 0.3 + 0.35 * rand(), inten * (0.45 + 0.25 * rand()), Math.max(levelsB - 1, 3), sub - 1);
        }
      }
    };
    // forks all the way down, longer and brighter ones higher up
    const nodes = [10, 22, 35, 49, 64, 80, 97, 111];
    for (const i0 of nodes) {
      const i = Math.min(main.length - 6, Math.max(3, i0 + Math.floor((rand() - 0.5) * 6)));
      const u = i / main.length;
      fork(main, cum, 0, mainLen, i, (0.16 + 0.26 * rand()) * (1.15 - 0.75 * u), 0.6 - 0.24 * u, 6, u < 0.7 ? 2 : 1);
    }
    // crawlers along the base of the cloud, where the channel comes out of it
    for (const [i, sgn] of [[3, -1], [6, 1], [11, 1]] as const) {
      const start = main[i];
      const dirB = right.clone().multiplyScalar(sgn).add(new THREE.Vector3(0, -0.12 + 0.3 * rand(), 0)).addScaledVector(depth, (rand() - 0.5) * 0.6).normalize();
      const end = start.clone().addScaledVector(dirB, mainLen * (0.2 + 0.2 * rand()));
      paths.push({ pts: channel(rand, start, end, depth, 0.12, 5), s0: cum[i] / mainLen, i0: 0.7, i1: 0.06, main: 0, w: 0.8 });
    }

    // ── ribbons: four vertices to a segment, widened in the vertex shader to a width in pixels
    let nSeg = 0;
    for (const p of paths) nSeg += p.pts.length - 1;
    const pos = new Float32Array(nSeg * 12), oth = new Float32Array(nSeg * 12), side = new Float32Array(nSeg * 8), info = new Float32Array(nSeg * 16);
    const idx = new Uint32Array(nSeg * 6);
    let v = 0, q = 0;
    for (const p of paths) {
      const n = p.pts.length;
      let run = 0;
      const plen = lengthOf(p.pts);
      for (let j = 0; j < n - 1; j++) {
        const A = p.pts[j], B = p.pts[j + 1], seg = A.distanceTo(B);
        const sA = p.s0 + run / mainLen, sB = p.s0 + (run + seg) / mainLen;
        const iA = p.i0 + (p.i1 - p.i0) * Math.pow(run / plen, 0.8), iB = p.i0 + (p.i1 - p.i0) * Math.pow((run + seg) / plen, 0.8);
        run += seg;
        const put = (k: number, P: THREE.Vector3, O: THREE.Vector3, sd: number, av: number, s: number, it: number) => {
          pos.set([P.x, P.y, P.z], (v + k) * 3); oth.set([O.x, O.y, O.z], (v + k) * 3);
          side.set([sd, av], (v + k) * 2); info.set([s, it, p.main, p.w], (v + k) * 4);
        };
        put(0, A, B, 1, 1, sA, iA); put(1, A, B, -1, -1, sA, iA); put(2, B, A, -1, 1, sB, iB); put(3, B, A, 1, -1, sB, iB);
        idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], q);
        v += 4; q += 6;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aOther", new THREE.BufferAttribute(oth, 3));
    g.setAttribute("aSide", new THREE.BufferAttribute(side, 2));
    g.setAttribute("aInfo", new THREE.BufferAttribute(info, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.U = {
      ...(sky as unknown as Record<string, THREE.IUniform>),
      uRes: { value: o.res }, uWidth: { value: o.px }, uCol: { value: new THREE.Vector3(0.74, 0.8, 1.0) },
      uK: { value: new THREE.Vector4(0, 0, 0, 0) },               // strength of the channel, of the forks, leader front, leader strength
      uBase: { value: new THREE.Vector2(((o.elTop - 1.6) * Math.PI) / 180, ((o.elTop + 1.2) * Math.PI) / 180) },
    };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: this.U, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aOther; attribute vec2 aSide; attribute vec4 aInfo;
        uniform vec2 uRes; uniform float uWidth; uniform vec4 uK;
        varying float vV; varying vec4 vI; varying vec3 vDir;
        void main(){
          vec4 c0 = projectionMatrix * viewMatrix * vec4(position, 1.0);
          vec4 c1 = projectionMatrix * viewMatrix * vec4(aOther, 1.0);
          vV = aSide.y; vI = aInfo; vDir = position - cameraPosition;
          if (c0.w < 1.0 || c1.w < 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vec2 n0 = c0.xy / c0.w, n1 = c1.xy / c1.w;
          vec2 d = (n1 - n0) * uRes;
          d = d / max(length(d), 1e-4);
          // forks are thinner; the leader is a hair
          float w = uWidth * aInfo.w * 2.4;
          vec2 off = (vec2(-d.y, d.x) * aSide.x - d * 0.35) * w / uRes * 2.0;
          gl_Position = vec4((n0 + off) * c0.w, c0.z, c0.w);
        }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        ${SKY_GLSL}
        uniform vec3 uCol; uniform vec4 uK; uniform vec2 uBase;
        varying float vV; varying vec4 vI; varying vec3 vDir;
        void main(){
          // the white-hot core and the glow of the air around it
          float core = exp(-vV * vV * 26.0), halo = exp(-vV * vV * 3.6);
          float stroke = mix(uK.y, uK.x, vI.z) * vI.y;
          // the leader: only as far as it has come, brightest at its tip
          float lead = step(vI.x, uK.z) * uK.w * (0.25 + 2.2 * exp(-(uK.z - vI.x) * 28.0)) * mix(0.7, 1.0, vI.z);
          float k = stroke + lead;
          if (k < 1e-4) discard;
          // inside the deck the cloud hides the channel (it shows through the thin places)
          vec3 d = normalize(vDir);
          float el; vec2 uv = skyUv(d, el);
          float l = dot(texture2D(tSky, uv).rgb, vec3(0.2126, 0.7152, 0.0722)) * uSkyExp;
          float cl = smoothstep(0.0, uSkyCon.x * 1.3, l);
          float vis = 1.0 - smoothstep(uBase.x, uBase.y, el) * (0.35 + 0.65 * cl);
          gl_FragColor = vec4(uCol * (k * vis * (core + 0.1 * halo)), 1.0);
        }`,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.mesh.visible = false;
    this.mesh.layers.enable(1);
    this.f0 = Math.ceil(o.t0 * FPS - 1e-4);
    // where the channel shows under the cloud, and the point the sea sees it from
    const it = Math.floor(main.length * 0.22);
    this.top.copy(main[it]);
    this.mid.copy(main[Math.floor(main.length * 0.5)]);
  }

  /** world direction of a point at a compass offset from the opening shot's line of sight and an elevation (degrees) */
  dirOf(azDeg: number, elDeg: number) {
    const a = this.fwdAz - (azDeg * Math.PI) / 180, e = (elDeg * Math.PI) / 180;
    return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  }

  /** the state of the sky at film second t */
  update(t: number, gain = 1): StormState {
    const s = this.state;
    const f = Math.floor(t * FPS + 1e-4), n = f - this.f0;
    const tail = n >= CH.length ? 0.03 * Math.exp(-(n - CH.length + 1) / 2.5) : 0;
    s.ch = n < 0 ? 0 : n < CH.length ? CH[n] : tail;
    s.br = n >= 0 && n < BR.length ? BR[n] : 0;
    const leading = n < 0 && n >= -LEAD_FRAMES;
    s.lead = leading ? (n + LEAD_FRAMES + 1) / (LEAD_FRAMES + 0.6) : 0;
    s.leadK = leading ? 1 : 0;
    const ic = IC[n] ?? 0;
    s.cloud = Math.max(s.ch, ic * 0.62, leading ? 0.05 + 0.07 * s.lead : 0);
    s.light = s.ch + 0.22 * ic;
    // the far sheet flashes
    s.sheet = 0;
    for (const [ts, az, el, k] of this.o.sheets ?? SHEETS) {
      const m = f - Math.round(ts * FPS);
      if (m >= 0 && m < SHEET_ENV.length) { s.sheet = SHEET_ENV[m] * k; s.sheetDir.copy(this.dirOf(az, el)); }
    }
    const hot = (e: number) => 14 * e + 150 * e * e * e * e;
    (this.U.uK.value as THREE.Vector4).set(hot(s.ch) * gain, hot(s.br) * 0.6 * gain, s.lead, 2.2 * s.leadK * gain);
    this.mesh.visible = s.ch > 0 || s.br > 0 || s.leadK > 0;
    return s;
  }
}
