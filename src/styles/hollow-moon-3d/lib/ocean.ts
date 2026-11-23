// Hollow Moon 3D · the sea in a gale. A Tessendorf ocean: four cascades of a wind-driven spectrum (a developed wind sea plus
// a long swell from another quarter) are evolved in time and brought back to space with an FFT on the CPU — a pure
// function of film time — then drawn on a grid that follows the lens.
// Shading: Fresnel reflection of the real sky and of the mirrored moon, the glitter of the golden core, the dark body
// of the water, and whitecaps: foam where the surface folds over itself, left behind the crest as it runs on, torn
// into lace and wind streaks as it ages, with aerated water around it. Spray is blown off the breaking crests.
// The lightning (storm.ts) lights all of it: uBolt / uBoltCol.
import * as THREE from "three";
import { rng } from "./util";
import { SKY_GLSL, type SkyU } from "./sky";

const N = 256;
const G = 9.81;
/** patch sizes in metres (non-commensurate, so the tiling never lines up) */
export const PATCH = [1730, 401, 97, 23.3];

class FFT {
  rev: Uint32Array;
  cos: Float32Array;
  sin: Float32Array;
  constructor(public n: number) {
    const bits = Math.log2(n);
    this.rev = new Uint32Array(n);
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); this.rev[i] = r; }
    this.cos = new Float32Array(n / 2);
    this.sin = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) { this.cos[i] = Math.cos((2 * Math.PI * i) / n); this.sin[i] = Math.sin((2 * Math.PI * i) / n); }
  }
  /** in-place inverse transform (positive exponent, no scaling) of n values starting at off with the given stride */
  run(re: Float32Array, im: Float32Array, off: number, stride: number) {
    const { n, rev, cos, sin } = this;
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        const a = off + i * stride, b = off + j * stride;
        const tr = re[a]; re[a] = re[b]; re[b] = tr;
        const ti = im[a]; im[a] = im[b]; im[b] = ti;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1, step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < half; k++) {
          const wr = cos[k * step], wi = sin[k * step];
          const a = off + (i + k) * stride, b = off + (i + k + half) * stride;
          const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi;
          re[a] += xr; im[a] += xi;
        }
      }
    }
  }
  run2d(re: Float32Array, im: Float32Array) {
    const n = this.n;
    for (let y = 0; y < n; y++) this.run(re, im, y * n, 1);
    for (let x = 0; x < n; x++) this.run(re, im, x, n);
  }
}

type Cascade = {
  L: number;
  h0r: Float32Array; h0i: Float32Array; hmr: Float32Array; hmi: Float32Array;
  kx: Float32Array; kz: Float32Array; ik: Float32Array; om: Float32Array;
  texA: THREE.DataTexture; texB: THREE.DataTexture; a: Uint16Array; b: Uint16Array;
};

/** wind: the way the waves run (x, z) · speed: wind in m/s · height: significant height of the wind sea in metres
 *  (0 = what a fully developed sea reaches in this wind) · peak: wavelength of its dominant waves in metres (default:
 *  that of a developed sea; shorter = younger and steeper) · swell: a second, long-crested train */
export type OceanOpts = { wind: [number, number]; speed: number; peak?: number; height: number; chop: number; seed: number; swell?: { dir: [number, number]; length: number; height: number } };

const sst = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** a tile of sea foam: R = lace (walls of bubbles at three sizes, holes in the big cells), G = froth, B = slow blotches */
function foamTexture(S = 512, seed = 9133) {
  const cellular = (cells: number, sd: number) => {
    const r = rng(sd), px = new Float32Array(cells * cells), py = new Float32Array(cells * cells);
    for (let i = 0; i < cells * cells; i++) { px[i] = r(); py[i] = r(); }
    return (u: number, v: number): [number, number] => {
      const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
      let f1 = 9, f2 = 9;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const cx = (((ix + dx) % cells) + cells) % cells, cy = (((iy + dy) % cells) + cells) % cells, q = cy * cells + cx;
        const d = Math.hypot(ix + dx + px[q] - x, iy + dy + py[q] - y);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      return [f1, f2];
    };
  };
  const value = (cells: number, sd: number) => {
    const r = rng(sd), g = new Float32Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = r();
    return (u: number, v: number) => {
      const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
      let fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const at = (a: number, b: number) => g[(((b % cells) + cells) % cells) * cells + (((a % cells) + cells) % cells)];
      return (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) + (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy;
    };
  };
  const A = cellular(6, seed), B = cellular(17, seed + 1), C = cellular(47, seed + 2);
  const n1 = value(5, seed + 3), n2 = value(13, seed + 4), n3 = value(31, seed + 5);
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x + 0.5) / S, v = (y + 0.5) / S;
    const [a1, a2] = A(u, v), [b1, b2] = B(u, v), [c1, c2] = C(u, v);
    const wa = 1 - sst(0.0, 0.2, a2 - a1), wb = 1 - sst(0.0, 0.26, b2 - b1), wc = 1 - sst(0.0, 0.36, c2 - c1);
    const lace = Math.min(1, 0.72 * wa + 0.52 * wb * (0.25 + 0.75 * sst(0.12, 0.55, a1)) + 0.3 * wc * (0.4 + 0.6 * sst(0.1, 0.5, b1)));
    const froth = 0.55 * wc + 0.45 * (1 - sst(0.0, 0.5, c1));
    const blot = 0.5 * n1(u, v) + 0.3 * n2(u, v) + 0.2 * n3(u, v);
    const o = (y * S + x) * 4;
    data[o] = Math.round(lace * 255); data[o + 1] = Math.round(froth * 255); data[o + 2] = Math.round(blot * 255); data[o + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 16;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export class Ocean {
  fft = new FFT(N);
  cas: Cascade[] = [];
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  spray: THREE.Points;
  private fr = [0, 1, 2, 3].map(() => new Float32Array(N * N));
  private fi = [0, 1, 2, 3].map(() => new Float32Array(N * N));
  private tLast = NaN;
  private told = false;
  ms = 0;
  /** significant wave height of the whole sea, metres */
  hs = 0;

  constructor(public o: OceanOpts, sky: SkyU, shared: Record<string, THREE.IUniform>) {
    const rand = rng(o.seed);
    const gauss = () => { const u = Math.max(rand(), 1e-9), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const wl = Math.hypot(o.wind[0], o.wind[1]) || 1, wx = o.wind[0] / wl, wz = o.wind[1] / wl;
    const U = o.speed, Lw = o.peak ? (Math.SQRT1_2 * o.peak) / (2 * Math.PI) : (U * U) / G, kp = Math.SQRT1_2 / Lw;
    const hsWind = o.height > 0 ? o.height : (0.21 * U * U) / G;
    const sw = o.swell ?? { dir: [wx, wz] as [number, number], length: 300, height: 0 };
    const sl = Math.hypot(sw.dir[0], sw.dir[1]) || 1, sx = sw.dir[0] / sl, sz = sw.dir[1] / sl, ks = (2 * Math.PI) / sw.length;
    // cascade c holds the waves between cut[c] and cut[c + 1]: at least five of the next patch's longest waves fit in it
    const cut = [0, ...PATCH.slice(1).map((L) => (2 * Math.PI * 5) / L), 1e9];
    const windSea = (kx: number, kz: number, k: number) => {
      const kd = (kx * wx + kz * wz) / k;
      // long-crested at the peak of the spectrum, short-crested ripples; waves against the wind almost gone
      const s = 2 + 6 / (1 + (k / (2.5 * kp)) ** 2);
      const dirn = kd > 0 ? Math.pow(kd, s) : 0.03 * kd * kd;
      return (Math.exp(-1 / (k * Lw) ** 2) / k ** 4) * dirn * Math.exp(-((k * 0.03) ** 2));
    };
    const swellSea = (kx: number, kz: number, k: number) => {
      const sd = (kx * sx + kz * sz) / k;
      return sd > 0 ? Math.exp(-(((k - ks) / (0.2 * ks)) ** 2)) * Math.pow(sd, 28) : 0;
    };
    // first pass: the variance each system would have, so both can be set to their own height (Hs = 4 σ)
    let vw = 0, vs = 0;
    for (let c = 0; c < PATCH.length; c++) {
      const dk = (2 * Math.PI) / PATCH[c];
      for (let m = 0; m < N; m++) for (let n = 0; n < N; n++) {
        const kx = (n < N / 2 ? n : n - N) * dk, kz = (m < N / 2 ? m : m - N) * dk, k = Math.hypot(kx, kz);
        if (k < 1e-6 || k < cut[c] || k >= cut[c + 1]) continue;
        vw += 2 * windSea(kx, kz, k) * dk * dk;
        vs += 2 * swellSea(kx, kz, k) * dk * dk;
      }
    }
    const scw = (hsWind / 4) ** 2 / Math.max(vw, 1e-20), scs = (sw.height / 4) ** 2 / Math.max(vs, 1e-20);
    this.hs = Math.hypot(hsWind, sw.height);
    for (let c = 0; c < PATCH.length; c++) {
      const L = PATCH[c], n2 = N * N;
      const cs: Cascade = {
        L, h0r: new Float32Array(n2), h0i: new Float32Array(n2), hmr: new Float32Array(n2), hmi: new Float32Array(n2),
        kx: new Float32Array(n2), kz: new Float32Array(n2), ik: new Float32Array(n2), om: new Float32Array(n2),
        a: new Uint16Array(n2 * 4), b: new Uint16Array(n2 * 4), texA: null as unknown as THREE.DataTexture, texB: null as unknown as THREE.DataTexture,
      };
      const dk = (2 * Math.PI) / L;
      for (let m = 0; m < N; m++) for (let n = 0; n < N; n++) {
        const i = m * N + n;
        const kx = (n < N / 2 ? n : n - N) * dk, kz = (m < N / 2 ? m : m - N) * dk;
        const k = Math.hypot(kx, kz);
        cs.kx[i] = kx; cs.kz[i] = kz; cs.ik[i] = k > 1e-6 ? 1 / k : 0; cs.om[i] = Math.sqrt(G * k);
        const inBand = k >= 1e-6 && k >= cut[c] && k < cut[c + 1];
        const a = inBand ? Math.sqrt((windSea(kx, kz, k) * scw + swellSea(kx, kz, k) * scs) * 0.5) * dk : 0;
        cs.h0r[i] = gauss() * a; cs.h0i[i] = gauss() * a;
      }
      for (let m = 0; m < N; m++) for (let n = 0; n < N; n++) {
        const i = m * N + n, j = ((N - m) % N) * N + ((N - n) % N);
        cs.hmr[i] = cs.h0r[j]; cs.hmi[i] = -cs.h0i[j];
      }
      for (const key of ["a", "b"] as const) {
        const t = new THREE.DataTexture(cs[key], N, N, THREE.RGBAFormat, THREE.HalfFloatType);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;
        t.anisotropy = 8;
        t.colorSpace = THREE.NoColorSpace;
        if (key === "a") cs.texA = t; else cs.texB = t;
      }
      this.cas.push(cs);
    }

    // ── the surface: rings around the lens whose spacing grows with the distance (about the same size on screen)
    const NR = 760, NA = 512, gb = 0.0093, ga = 0.25 / gb;
    const pos = new Float32Array((NR + 1) * NA * 3);
    const rad = (i: number) => ga * (Math.exp(gb * i) - 1);
    for (let i = 0; i <= NR; i++) for (let j = 0; j < NA; j++) {
      const a = ((j + (i % 2) * 0.5) / NA) * 2 * Math.PI, r = rad(i), o3 = (i * NA + j) * 3;
      pos[o3] = Math.cos(a) * r; pos[o3 + 1] = 0; pos[o3 + 2] = Math.sin(a) * r;
    }
    const idx = new Uint32Array(NR * NA * 6);
    let q = 0;
    for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
      const a = i * NA + j, b = i * NA + ((j + 1) % NA), c = (i + 1) * NA + j, d = (i + 1) * NA + ((j + 1) % NA);
      if (i % 2 === 0) { idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c; }
      else { idx[q++] = a; idx[q++] = d; idx[q++] = c; idx[q++] = a; idx[q++] = b; idx[q++] = d; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const U4 = {
      tA0: { value: this.cas[0].texA }, tB0: { value: this.cas[0].texB }, tA1: { value: this.cas[1].texA }, tB1: { value: this.cas[1].texB },
      tA2: { value: this.cas[2].texA }, tB2: { value: this.cas[2].texB }, tA3: { value: this.cas[3].texA }, tB3: { value: this.cas[3].texB },
      uPatch: { value: new THREE.Vector4(PATCH[0], PATCH[1], PATCH[2], PATCH[3]) }, uChop: { value: o.chop }, uWind: { value: new THREE.Vector2(wx, wz) },
      uOrigin: { value: new THREE.Vector2() },
      // fold below which the surface breaks, softness of that edge, seconds the foam lives, wind streaks
      uFoam: { value: new THREE.Vector4(0.62, 0.22, 2.4, 0.7) },
      uBolt: { value: new THREE.Vector4(0, 1, 0, 0) }, uBoltCol: { value: new THREE.Vector3(0.7, 0.8, 1.0) },
      uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKeyCol: { value: new THREE.Vector3(1, 1, 1) }, uAmb: { value: new THREE.Vector3(0.03, 0.04, 0.06) }, uTime: { value: 0 },
      uGlint: { value: new THREE.Vector4(0, 0, 0, 0) }, uGlintCol: { value: new THREE.Vector3(1, 0.46, 0.11) },
      uFoamCol: { value: new THREE.Vector3(0.62, 0.66, 0.72) },
    };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: OCEAN_VS, fragmentShader: OCEAN_FS,
      uniforms: {
        ...(sky as unknown as Record<string, THREE.IUniform>), ...U4, ...shared,
        tFoam: { value: foamTexture() }, tRefl: { value: null }, uTexMat: { value: new THREE.Matrix4() },
        uGlintK: { value: new THREE.Vector2(170, 1) },
        uBody: { value: new THREE.Vector3(0.0024, 0.0072, 0.0118) }, uScatter: { value: new THREE.Vector3(0.05, 0.19, 0.2) },
        uSeaFog: { value: new THREE.Vector4(0.012, 0.018, 0.03, 0.0006) }, uTone: { value: new THREE.Vector4(0.62, 0.96, 1.0, 1.0) }, uLite: { value: new THREE.Vector4(0.12, 0, 0, 0) },
      },
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;

    // ── spray: puffs lifted off the breaking crests and carried down the wind. Every puff lives on a lattice fixed to
    // the sea and runs through its short life again and again; it shows only if a crest was breaking where it started.
    {
      const SN = 460, cell = 1.5, span = SN * cell;
      const p = new Float32Array(SN * SN * 3), sd = new Float32Array(SN * SN * 4);
      const r2 = rng(o.seed + 77);
      for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
        const k = j * SN + i;
        p[k * 3] = (i + r2()) * cell; p[k * 3 + 1] = 0; p[k * 3 + 2] = (j + r2()) * cell;
        sd[k * 4] = r2(); sd[k * 4 + 1] = r2(); sd[k * 4 + 2] = r2(); sd[k * 4 + 3] = r2();
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.BufferAttribute(p, 3));
      sg.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
      const mu = this.mat.uniforms;
      const sm = new THREE.ShaderMaterial({
        vertexShader: SPRAY_VS, fragmentShader: SPRAY_FS, transparent: true, depthWrite: false, depthTest: true,
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: {
          tA0: mu.tA0, tB0: mu.tB0, tA1: mu.tA1, tB1: mu.tB1, uPatch: mu.uPatch, uChop: mu.uChop, uWind: mu.uWind, uFoam: mu.uFoam, uTime: mu.uTime,
          uBolt: mu.uBolt, uBoltCol: mu.uBoltCol, uKeyCol: mu.uKeyCol, uAmb: mu.uAmb, uGlint: mu.uGlint, uGlintCol: mu.uGlintCol, uSeaFog: mu.uSeaFog,
          uPx: shared.uPx ?? { value: 1000 }, uSpan: { value: span }, uSpray: { value: new THREE.Vector4(1, 9.5, 1, 0) },
        },
      });
      this.spray = new THREE.Points(sg, sm);
      this.spray.frustumCulled = false;
      this.spray.renderOrder = 20;
    }
  }

  /** evolve the spectrum to time t and upload displacement / derivative maps */
  update(t: number) {
    if (t === this.tLast) return;
    this.tLast = t;
    const t0 = performance.now();
    const [r1, r2, r3, r4] = this.fr, [i1, i2, i3, i4] = this.fi;
    const half = THREE.DataUtils.toHalfFloat;
    for (const cs of this.cas) {
      const { h0r, h0i, hmr, hmi, kx, kz, ik, om, a, b } = cs;
      for (let i = 0; i < N * N; i++) {
        // h = h0·e^{-iωt} + conj(h0(-k))·e^{iωt}: the waves the spectrum favours (k along the wind) run down the wind
        const w = -om[i] * t, c = Math.cos(w), s = Math.sin(w);
        const hr = h0r[i] * c - h0i[i] * s + hmr[i] * c + hmi[i] * s;
        const hi = h0r[i] * s + h0i[i] * c - hmr[i] * s + hmi[i] * c;
        const x = kx[i], z = kz[i], q = ik[i];
        const a1 = 1 + x * q;                       // h + i·Dx
        r1[i] = hr * a1; i1[i] = hi * a1;
        const a2 = -x, b2 = -z * q;                 // Dz + i·slopeX
        r2[i] = hr * a2 - hi * b2; i2[i] = hr * b2 + hi * a2;
        const b3 = z + x * x * q;                   // slopeZ + i·dDx/dx
        r3[i] = -hi * b3; i3[i] = hr * b3;
        const a4 = z * z * q, b4 = x * z * q;       // dDz/dz + i·dDx/dz
        r4[i] = hr * a4 - hi * b4; i4[i] = hr * b4 + hi * a4;
      }
      this.fft.run2d(r1, i1); this.fft.run2d(r2, i2); this.fft.run2d(r3, i3); this.fft.run2d(r4, i4);
      for (let i = 0, o = 0; i < N * N; i++, o += 4) {
        a[o] = half(i1[i]); a[o + 1] = half(r1[i]); a[o + 2] = half(r2[i]); a[o + 3] = half(i4[i]);
        b[o] = half(i2[i]); b[o + 1] = half(r3[i]); b[o + 2] = half(i3[i]); b[o + 3] = half(r4[i]);
      }
      cs.texA.needsUpdate = true;
      cs.texB.needsUpdate = true;
    }
    this.ms = performance.now() - t0;
    if (!this.told) {
      this.told = true;
      // how much of the sea folds: the J of the two long cascades on the lattice of the second
      const c0 = this.cas[0], c1 = this.cas[1], ch = this.o.chop, js: number[] = [];
      const hf = THREE.DataUtils.fromHalfFloat;
      let hmax = 0;
      for (let i = 0; i < N * N; i += 5) {
        const o = i * 4, x = (i % N) * (c1.L / N), z = Math.floor(i / N) * (c1.L / N);
        const j0 = ((Math.floor((z / c0.L) * N) % N) * N + (Math.floor((x / c0.L) * N) % N)) * 4;
        const jxx = 1 - ch * (hf(c0.b[j0 + 2]) + hf(c1.b[o + 2])), jzz = 1 - ch * (hf(c0.b[j0 + 3]) + hf(c1.b[o + 3])), jxz = ch * (hf(c0.a[j0 + 3]) + hf(c1.a[o + 3]));
        js.push(jxx * jzz - jxz * jxz);
        hmax = Math.max(hmax, hf(c0.a[j0 + 1]) + hf(c1.a[o + 1]));
      }
      js.sort((a, b) => a - b);
      const q = (p: number) => js[Math.floor(js.length * p)].toFixed(2);
      console.log(`[hollow-moon] ocean Hs ${this.hs.toFixed(1)} m, highest crest ${hmax.toFixed(1)} m · folding J: p1 ${q(0.01)} p3 ${q(0.03)} p5 ${q(0.05)} p10 ${q(0.1)} p20 ${q(0.2)} p50 ${q(0.5)} · ${this.ms.toFixed(0)} ms`);
    }
  }
}

const OCEAN_VS = /* glsl */ `
uniform sampler2D tA0; uniform sampler2D tA1; uniform sampler2D tA2; uniform sampler2D tA3;
uniform vec4 uPatch; uniform float uChop; uniform vec2 uOrigin;
varying vec3 vW; varying vec2 vXZ; varying float vDist;
void main(){
  vec2 xz = position.xz + uOrigin;
  // each cascade moves the grid only where the grid is fine enough to carry its waves
  float dist = length(vec3(position.x, cameraPosition.y, position.z));
  vec3 d = texture2D(tA0, xz / uPatch.x).xyz * (1.0 - smoothstep(5000.0, 16000.0, dist));
  d += texture2D(tA1, xz / uPatch.y).xyz * (1.0 - smoothstep(600.0, 1900.0, dist));
  d += texture2D(tA2, xz / uPatch.z).xyz * (1.0 - smoothstep(110.0, 330.0, dist));
  d += texture2D(tA3, xz / uPatch.w).xyz * (1.0 - smoothstep(24.0, 72.0, dist));
  vec3 w = vec3(xz.x - d.x * uChop, d.y, xz.y - d.z * uChop);
  vW = w; vXZ = xz; vDist = dist;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const OCEAN_FS = /* glsl */ `
precision highp float;
${SKY_GLSL}
uniform sampler2D tA0; uniform sampler2D tA1; uniform sampler2D tA2; uniform sampler2D tA3;
uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform sampler2D tFoam;
uniform vec4 uPatch; uniform float uChop; uniform float uTime; uniform vec2 uWind;
uniform sampler2D tRefl; uniform mat4 uTexMat;
uniform vec4 uGlint; uniform vec3 uGlintCol; uniform vec2 uGlintK;
uniform vec3 uBody; uniform vec3 uScatter; uniform vec3 uFoamCol; uniform vec4 uFoam; uniform vec4 uSeaFog;
uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uAmb;
uniform vec4 uBolt; uniform vec3 uBoltCol; uniform vec4 uTone; uniform vec4 uLite;
varying vec3 vW; varying vec2 vXZ; varying float vDist;
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
// how far the long waves fold the surface at a point of the lattice (1 = flat, below ~0.6 = breaking)
float fold(vec2 xz, float bias, float f1){
  vec2 u0 = xz / uPatch.x, u1 = xz / uPatch.y;
  vec4 b0 = texture2D(tB0, u0, bias), b1 = texture2D(tB1, u1, bias);
  float x0 = texture2D(tA0, u0, bias).w, x1 = texture2D(tA1, u1, bias).w;
  float jxx = 1.0 - uChop * (b0.z + b1.z * f1), jzz = 1.0 - uChop * (b0.w + b1.w * f1), jxz = uChop * (x0 + x1 * f1);
  return jxx * jzz - jxz * jxz;
}
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float dist = length(cameraPosition - vW);
  // slopes and the folding of the surface from the four cascades (mip-mapped: far water loses detail, gains roughness)
  vec2 u0 = vXZ / uPatch.x, u1 = vXZ / uPatch.y, u2 = vXZ / uPatch.z, u3 = vXZ / uPatch.w;
  vec4 b0 = texture2D(tB0, u0), b1 = texture2D(tB1, u1), b2 = texture2D(tB2, u2), b3 = texture2D(tB3, u3);
  float x0 = texture2D(tA0, u0).w, x1 = texture2D(tA1, u1).w, x2 = texture2D(tA2, u2).w;
  float f1 = 1.0 - smoothstep(2500.0, 9000.0, dist), f2 = 1.0 - smoothstep(700.0, 3000.0, dist), f3 = 1.0 - smoothstep(140.0, 700.0, dist);
  vec2 slope = b0.xy + b1.xy * f1 + b2.xy * f2 + b3.xy * f3;
  float jxx = 1.0 - uChop * (b0.z + b1.z * f1 + b2.z * f2 + b3.z * f3), jzz = 1.0 - uChop * (b0.w + b1.w * f1 + b2.w * f2 + b3.w * f3);
  float jxz = uChop * (x0 + x1 * f1 + x2 * f2);
  vec3 N = normalize(vec3(-slope.x / max(jxx, 0.3), 1.0, -slope.y / max(jzz, 0.3)));
  // what the lost detail would have done: flatten towards the mean plane, blur what is mirrored
  vec2 gu = vec2(dot(vXZ, uWind), dot(vXZ, vec2(-uWind.y, uWind.x)));
  float gust = texture2D(tFoam, gu * vec2(1.0 / 520.0, 1.0 / 170.0) + vec2(uTime * 0.012, 0.0)).b * 0.6 + texture2D(tFoam, gu * vec2(1.0 / 140.0, 1.0 / 41.0) + vec2(uTime * 0.03, 0.4)).b * 0.4;
  gust = smoothstep(0.34, 0.66, gust);
  float rough = 0.03 + 0.05 * (1.0 - f3) + 0.09 * (1.0 - f2) + 0.14 * (1.0 - f1) + 0.07 * gust;
  float NV = max(dot(N, V), 0.0);
  if (NV < 0.02) { N = normalize(N + V * (0.02 - dot(N, V))); NV = max(dot(N, V), 0.02); }
  float F = 0.02 + 0.98 * pow(1.0 - NV, 5.0) / (1.0 + 18.0 * rough);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y) + 0.004;
  R = normalize(R);
  vec3 refl = skyLow(R, 1.0 + rough * 22.0);
  // a storm sea is steel, not ink blue
  refl = mix(vec3(dot(refl, vec3(0.2126, 0.7152, 0.0722))), refl, uTone.x) * uTone.yzw;
  // the mirrored moon and rings (planar reflection, smeared along the line of sight like a glitter path)
  vec4 pc = uTexMat * vec4(vW.x, 0.0, vW.z, 1.0);
  vec2 puv = pc.xy / pc.w;
  vec2 dis = N.xz * (0.055 + 0.5 * rough) / (1.0 + dist * 0.0022);
  vec4 pr = vec4(0.0);
  float lod = 0.5 + rough * 14.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i) - 2.0;
    vec2 o = dis * (1.0 + 0.35 * fi) + vec2(0.0, fi * rough * 0.05);
    pr += textureLod(tRefl, clamp(puv + o, vec2(0.002), vec2(0.998)), lod);
  }
  pr /= 5.0;
  refl = mix(refl, pr.rgb, clamp(pr.a, 0.0, 1.0));
  // glitter of the core's light on the facets
  vec3 Lg = uGlint.xyz - vW;
  float dg2 = dot(Lg, Lg);
  Lg *= inversesqrt(dg2);
  vec3 Hh = normalize(Lg + V);
  float sp = pow(max(dot(N, Hh), 0.0), uGlintK.x) * uGlintK.y;
  vec3 col = refl * F + uGlintCol * (sp * uGlint.w);
  // the lightning: its channel breaks up on the facets that face it
  vec3 Hb = normalize(uBolt.xyz + V);
  col += uBoltCol * (uBolt.w * (pow(max(dot(N, Hb), 0.0), 260.0) * 3.6 + pow(max(dot(N, Hb), 0.0), 24.0) * 0.05));
  // key light: a faint cold sparkle
  vec3 Hk = normalize(uKeyDir + V);
  col += uKeyCol * (pow(max(dot(N, Hk), 0.0), 140.0) * 0.045);
  // what falls on anything pale in the water: the night sky, the key, the gold of the open moon, the flash
  vec3 warm = uGlintCol * (uGlint.w * 2600.0 / (dg2 + 60000.0)) * (0.35 + 0.65 * max(dot(N, Lg), 0.0));
  vec3 lite = uAmb * 2.4 + uKeyCol * (uLite.x * (0.3 + 0.7 * max(dot(N, uKeyDir), 0.0))) + warm + uBoltCol * (uBolt.w * (0.3 + 0.7 * max(dot(N, uBolt.xyz), 0.0)));
  // the body of the water; the thin tops of the waves let light through
  float crest = smoothstep(0.4, 4.5, vW.y);
  float thru = pow(max(dot(V, -normalize(vec3(uBolt.x, 0.0, uBolt.z) + 1e-4)), 0.0), 2.0) * uBolt.w;
  vec3 body = uBody * (1.0 + 2.0 * max(dot(N, uKeyDir), 0.0) * length(uKeyCol)) + uScatter * (0.012 * crest * lite + uBoltCol * (0.05 * crest * thru));

  // ── whitecaps. The surface breaks where it folds (J small); the foam stays where the crest was while the crest
  // runs on down the wind, so an older crest is found by looking down the wind from here.
  float fF = 1.0 - smoothstep(3500.0, 11000.0, dist);
  float J = fold(vXZ, 0.0, fF);
  float Jall = jxx * jzz - jxz * jxz;
  float cov = 1.0 - smoothstep(uFoam.x - uFoam.y, uFoam.x, J - 0.22 * (1.0 - smoothstep(0.2, 0.9, Jall)) * f2);
  float aer = cov;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float d = 2.2 + fi * (2.4 + fi * 1.15);
    float tau = d / 8.5;
    float Jt = fold(vXZ + uWind * d, 0.6 + 0.55 * fi, fF);
    float ft = 1.0 - smoothstep(uFoam.x - uFoam.y * 1.5, uFoam.x + 0.03, Jt);
    cov = max(cov, ft * 0.86 * exp(-tau / uFoam.z));
    aer = max(aer, ft * exp(-tau / (uFoam.z * 2.2)));
  }
  // across / along the wind, riding the surface
  vec2 fu = vec2(dot(vW.xz, uWind), dot(vW.xz, vec2(-uWind.y, uWind.x)));
  // streaks of foam blown out along the wind
  float blot = texture2D(tFoam, fu * vec2(1.0 / 900.0, 1.0 / 420.0) + 0.21).b;
  float st = texture2D(tFoam, fu * vec2(1.0 / 310.0, 1.0 / 17.0) + vec2(uTime * 0.006, 0.0)).b * 0.6 + texture2D(tFoam, fu * vec2(1.0 / 97.0, 1.0 / 5.3) + 0.63).b * 0.4;
  cov = max(cov, uFoam.w * smoothstep(0.56, 0.74, st) * smoothstep(0.38, 0.62, blot) * 0.42 * f2);
  vec2 warp = (vec2(vnoise(fu * 0.13), vnoise(fu * 0.13 + 7.7)) - 0.5) * 2.6;
  vec2 fa = (fu + warp) * vec2(1.0 / 23.0, 1.0 / 14.0) + vec2(uTime * 0.004, 0.0), fb = (fu - warp * 0.4) * vec2(1.0 / 5.9, 1.0 / 4.1) + 0.37;
  float lace = texture2D(tFoam, fa).r * 0.6 + texture2D(tFoam, fb).r * 0.4;
  float froth = texture2D(tFoam, fb * 2.3).g;
  float th = 1.12 - 1.2 * cov * cov;
  float foam = smoothstep(th - 0.16, th + 0.08, lace + 0.12 * (froth - 0.5)) * step(0.004, cov) * (0.62 + 0.38 * cov);
  // far away the lace is smaller than a pixel: what is left is its share of the surface
  float px = max(length(dFdx(fb)), length(dFdy(fb))) * 512.0;
  foam = mix(foam, cov * cov * cov * 0.7, smoothstep(1.5, 7.0, px));
  vec3 foamC = uFoamCol * lite * (0.62 + 0.5 * froth * froth + 0.25 * cov);
  // aerated water around the foam: pale, milky green
  body += uScatter * lite * (0.2 * smoothstep(0.08, 0.7, aer));
  col += (1.0 - F) * body;
  col = mix(col, foamC, foam * 0.92);
  // sea haze towards the horizon; the flash lights it
  float fg = 1.0 - exp(-dist * uSeaFog.w);
  col = mix(col, uSeaFog.rgb + uBoltCol * (uBolt.w * 0.012), fg);
  gl_FragColor = vec4(col, 1.0);
}`;

const SPRAY_VS = /* glsl */ `
uniform sampler2D tA0; uniform sampler2D tA1; uniform sampler2D tB0; uniform sampler2D tB1;
uniform vec4 uPatch; uniform float uChop; uniform vec2 uWind; uniform vec4 uFoam; uniform float uTime; uniform float uPx; uniform float uSpan; uniform vec4 uSpray;
attribute vec4 aSeed;
varying float vA; varying float vAge; varying vec3 vP; varying float vSeed;
void main(){
  // the lattice is fixed to the sea; the patch of it that is drawn follows the lens
  vec2 base = position.xz;
  vec2 xz = base + floor((cameraPosition.xz - base) / uSpan + 0.5) * uSpan;
  float life = 1.5 + 1.5 * aSeed.x;
  float age = fract(uTime / life + aSeed.y) * life;
  // where the crest that threw this puff is now: it has run on down the wind since
  vec2 src = xz + uWind * (uSpray.y * age);
  vec2 u0 = src / uPatch.x, u1 = src / uPatch.y;
  vec4 a0 = textureLod(tA0, u0, 0.0), a1 = textureLod(tA1, u1, 0.0);
  vec4 b0 = textureLod(tB0, u0, 0.0), b1 = textureLod(tB1, u1, 0.0);
  float jxx = 1.0 - uChop * (b0.z + b1.z), jzz = 1.0 - uChop * (b0.w + b1.w), jxz = uChop * (a0.w + a1.w);
  float J = jxx * jzz - jxz * jxz;
  float emit = 1.0 - smoothstep(uFoam.x - uFoam.y * 1.3, uFoam.x - 0.06, J);
  float h = a0.y + a1.y;
  float u = age / life;
  // thrown up and forward, then it hangs and sinks while the wind carries it
  vec3 p = vec3(xz.x, h, xz.y);
  p.xz += uWind * (age * (3.0 + 5.0 * aSeed.z)) + vec2(-uWind.y, uWind.x) * ((aSeed.w - 0.5) * 2.4 * age);
  p.y += (1.2 + 3.2 * aSeed.z) * age - 1.5 * age * age + 0.3;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float size = (0.6 + 1.7 * aSeed.w) * (0.45 + 2.8 * u);
  float d = length(p.xz - cameraPosition.xz);
  float edge = 1.0 - smoothstep(uSpan * 0.36, uSpan * 0.48, d);
  vA = emit * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.35, 1.0, u)) * edge * uSpray.x * smoothstep(1.0, 4.0, -mv.z);
  vAge = u; vP = p; vSeed = aSeed.x;
  gl_PointSize = clamp(size * uPx / max(-mv.z, 0.5), 0.0, 420.0);
  gl_Position = projectionMatrix * mv;
  if (vA < 0.003) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const SPRAY_FS = /* glsl */ `
precision highp float;
uniform vec4 uBolt; uniform vec3 uBoltCol; uniform vec3 uKeyCol; uniform vec3 uAmb; uniform vec4 uGlint; uniform vec3 uGlintCol; uniform vec4 uSeaFog;
varying float vA; varying float vAge; varying vec3 vP; varying float vSeed;
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  // a ragged puff, not a disc
  float n = vnoise(q * 2.3 + vSeed * 37.0) * 0.6 + vnoise(q * 5.1 - vSeed * 11.0) * 0.4;
  float a = vA * exp(-3.4 * r2) * (0.3 + 0.7 * n) * 0.1;
  vec3 Lg = uGlint.xyz - vP;
  float dg2 = dot(Lg, Lg);
  vec3 lite = uAmb * 2.6 + uKeyCol * 0.12 + uGlintCol * (uGlint.w * 2600.0 / (dg2 + 60000.0)) + uBoltCol * (uBolt.w * 0.8);
  vec3 c = vec3(0.6, 0.64, 0.7) * lite;
  float dist = length(cameraPosition - vP);
  c = mix(c, uSeaFog.rgb, 1.0 - exp(-dist * uSeaFog.w));
  gl_FragColor = vec4(c * a, a);
}`;
