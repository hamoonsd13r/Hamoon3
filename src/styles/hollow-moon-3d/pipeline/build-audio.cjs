// Hollow Moon 3D · the sound. Your track from two bars before its first big hit (nothing cut inside it), ended on its
// third hit with a reverb ring-out; under the opening a storm made in code (a gale sea, wind, the thunder of the one
// lightning strike on the first hit, far rumbles); a few soft effects on the events of the picture.
// Every layer is levelled by measurement (RMS in dBFS before the master gain), not by ear:
//   opening (music −27): sea −26, wind −29…−31 · strike: thunder ≈ the level of the music's hit for half a second, then
//   rolling away under it · later ambience ≥ 14 dB and effects ≥ 10 dB under the music.
// Output: <out>/mix.wav at −14 LUFS (linear gain + limiter), premix.wav, and with --stems stem-music.wav / stem-fx.wav.
//   node src/styles/hollow-moon-3d/pipeline/build-audio.cjs --song music/your-track.mp3 --off 11.093 --bpm 130 [--stems]
//   options: --out <dir> (default out/hollow-moon-audio) · --dur 35 · --sfx <a CC0 library checkout with sfx/<group>/<name>.wav>
//            (else the kit's own public/sfx-lib is used, levelled to −20 dBFS) · no --song = the storm and effects only.
// Keep --off / --bpm / --dur in step with demo/film.ts (MUSIC, DUR): the cuts below are the same bars.
// The song must be one you may use (your own, or licensed for it). Never cut inside it: only its start offset moves.
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const A = path.resolve(opt("--out", "out/hollow-moon-audio"));
const SONG = opt("--song", null);
const LIB = opt("--sfx", null) ? path.resolve(opt("--sfx")) : null;
const KIT_SFX = path.resolve(opt("--kit-sfx", "public/sfx-lib"));
fs.mkdirSync(A, { recursive: true });
const SR = 48000, DUR = Number(opt("--dur", 35.0)), N = Math.round(DUR * SR);
// the grid of the film (keep in step with demo/film.ts · MUSIC, bar() and CUT)
const OFF = Number(opt("--off", 11.093)), BEAT = 60 / Number(opt("--bpm", 130));
const bar = (n, beats = 0) => ((n - 1) * 4 + beats) * BEAT;
const CUT = { BOLT: bar(3), B: bar(5), C: bar(7), CD: bar(9), DROP: bar(11), D2: bar(13), E: bar(15), F: bar(17), END: bar(19) };
/** the frame of the return stroke (storm91.ts: ceil(CUT.BOLT · 30)) */
const STRIKE = Math.ceil(CUT.BOLT * 30) / 30;

const dec = (file, extra = []) => {
  const b = execFileSync("ffmpeg", ["-v", "error", ...extra, "-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
const writeWav = (file, x) => {
  const raw = path.join(A, "_tmp.f32");
  fs.writeFileSync(raw, Buffer.from(x.buffer, x.byteOffset, x.byteLength));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", raw, "-c:a", "pcm_f32le", file]);
  fs.rmSync(raw);
};
const lufs = (file) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const out = r.stderr || "", tail = out.slice(out.lastIndexOf("Summary:"));
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(tail), P = /Peak:\s+(-?[\d.]+) dBFS/.exec(tail);
  return { I: I ? Number(I[1]) : NaN, peak: P ? Number(P[1]) : NaN };
};
const lin = (db) => Math.pow(10, db / 20);
const dB = (v) => (v > 1e-9 ? 20 * Math.log10(v) : -180);
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (t, a, b) => { const u = ramp(t, a, b); return u * u * (3 - 2 * u); };
let seed = 913;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const uni = () => (rnd() + 1) / 2;
/** RMS of an interleaved stereo buffer between two times */
const rmsOf = (x, t0, t1) => { let q = 0, m = 0; for (let i = Math.max(0, Math.round(t0 * SR)) * 2; i < Math.round(t1 * SR) * 2 && i < x.length; i++) { q += x[i] * x[i]; m++; } return Math.sqrt(q / Math.max(m, 1)); };
const peakOf = (x) => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };
const scale = (x, g) => { for (let i = 0; i < x.length; i++) x[i] *= g; return x; };
const biquad = (type, f0, q = 0.7071) => {
  const w = (2 * Math.PI * f0) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
};
/** wind when no library recording is given: noise through a wandering band-pass, each ear its own gusts (interleaved
 *  stereo, `sec` seconds, about −20 dBFS RMS; it is levelled again where it is used) */
function synthWind(sec) {
  const L = Math.round(sec * SR), x = new Float32Array(L * 2);
  for (let ch = 0; ch < 2; ch++) {
    let lo = 0, bp = 0, lo2 = 0, bp2 = 0;
    const p1 = uni() * 6.283, p2 = uni() * 6.283, p3 = uni() * 6.283, p4 = uni() * 6.283;
    for (let i = 0; i < L; i++) {
      const t = i / SR, nz = rnd();
      const gust = 0.5 + 0.5 * Math.sin(6.283 * 0.043 * t + p1) * Math.sin(6.283 * 0.017 * t + p2 + ch);
      const fc = 260 + 240 * gust + 110 * Math.sin(6.283 * 0.11 * t + p3), fk = 2 * Math.sin((Math.PI * fc) / SR);
      lo += fk * bp; const hi = nz - lo - 0.55 * bp; bp += fk * hi;
      const fc2 = 900 + 500 * Math.sin(6.283 * 0.031 * t + p4), fk2 = 2 * Math.sin((Math.PI * fc2) / SR);
      lo2 += fk2 * bp2; const hi2 = nz - lo2 - 0.9 * bp2; bp2 += fk2 * hi2;
      x[i * 2 + ch] = bp * (0.35 + 0.65 * gust * gust) + bp2 * 0.15 * (0.3 + 0.7 * gust);
    }
  }
  return scale(x, lin(-20) / Math.max(rmsOf(x, 0, sec), 1e-9));
}
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// ── 1 · the music: the song from OFF, untouched but for a fade in; on its third hit it stops before the next beat and
//        a hall rings on with what the hit left
const music = new Float32Array(N * 2);
const cutAt = CUT.END + 0.455;                                 // just before the beat after the hit
if (!SONG) console.log("music: no --song given · building the storm and the effects only");
else {
  const song = dec(SONG), s0 = Math.round(OFF * SR);
  if ((song.length / 2 - s0) / SR < cutAt) console.log(`music: the song ends ${((song.length / 2 - s0) / SR).toFixed(2)} s into the film, before the third hit (${cutAt.toFixed(2)} s)`);
  for (let i = 0; i < Math.round(cutAt * SR); i++) {
    const t = i / SR, g = smooth(t, 0, 0.5) * (1 - smooth(t, CUT.END + 0.2, cutAt));
    music[i * 2] = (song[(s0 + i) * 2] ?? 0) * g; music[i * 2 + 1] = (song[(s0 + i) * 2 + 1] ?? 0) * g;
  }
  // the hall: decorrelated noise, RT60 ≈ 3 s, darker as it decays; it hears the hit itself (without the sub)
  const RT = 4.0, IRN = Math.round(4.2 * SR), from = CUT.END - 0.03, SN = Math.round((cutAt - from) * SR);
  let n = 1;
  while (n < SN + IRN) n <<= 1;
  const wet = [];
  for (let c = 0; c < 2; c++) {
    const ar = new Float64Array(n), ai = new Float64Array(n), br = new Float64Array(n), bi = new Float64Array(n);
    const hp = biquad("hp", 110), i0 = Math.round(from * SR);
    for (let i = 0; i < SN; i++) ar[i] = hp(music[(i0 + i) * 2 + c]) * Math.min(1, i / (0.01 * SR));
    let lp = 0;
    for (let i = 0; i < IRN; i++) {
      const t = i / SR, k = 0.2 + 0.6 * Math.exp(-t / 1.2);
      lp += k * (rnd() - lp);
      br[i] = lp * Math.exp((-6.9 * t) / RT) * Math.min(1, t / 0.015);
    }
    fft(ar, ai, false); fft(br, bi, false);
    for (let i = 0; i < n; i++) { const r = ar[i] * br[i] - ai[i] * bi[i], im = ar[i] * bi[i] + ai[i] * br[i]; ar[i] = r; ai[i] = im; }
    fft(ar, ai, true);
    wet.push(ar);
  }
  const i0 = Math.round(from * SR), w = new Float32Array(N * 2);
  for (let i = i0; i < N; i++) { w[i * 2] = wet[0][i - i0]; w[i * 2 + 1] = wet[1][i - i0]; }
  // the ring-out starts 8 dB under the hit and has faded out at the end of the film
  const dryR = rmsOf(music, CUT.END + 0.02, CUT.END + 0.2), wetR = rmsOf(w, cutAt, cutAt + 0.3), wg = wetR > 1e-9 ? (dryR * lin(-7)) / wetR : 0;
  for (let i = i0; i < N; i++) { const g = wg * smooth(i / SR, CUT.END + 0.08, cutAt) * (1 - smooth(i / SR, DUR - 0.6, DUR - 0.02)); music[i * 2] += w[i * 2] * g; music[i * 2 + 1] += w[i * 2 + 1] * g; }
  console.log(`music: hit ${dB(dryR).toFixed(1)} dBFS · ring-out from ${cutAt.toFixed(2)} s at ${dB(rmsOf(music, cutAt + 0.05, cutAt + 0.35)).toFixed(1)}, ${dB(rmsOf(music, 34.2, 34.5)).toFixed(1)} at 34.2 s`);
}

// ── 2 · the storm
const fx = new Float32Array(N * 2);
const add = (src, g = 1, at = 0) => { const o = Math.round(at * SR) * 2; for (let i = 0; i < src.length; i++) { const j = o + i; if (j >= 0 && j < fx.length) fx[j] += src[i] * g; } };

// the sea in a gale: a steady roar, crests that break one after another (a hiss that opens as the crest spreads, a low
// thump as it falls), different in each ear
{
  const end = CUT.DROP + 0.4, L = Math.round(end * SR);
  const ev = [];
  for (let t = -1.4; t < end; t += 1.3 + 1.7 * uni()) ev.push({ t, rise: 0.8 + 0.6 * uni(), fall: 1.2 + 1.0 * uni(), amp: 0.55 + 0.45 * uni(), pan: (uni() * 2 - 1) * 0.65 });
  const roar = new Float32Array(L * 2), hiss = new Float32Array(L * 2), thump = new Float32Array(L * 2), heA = new Float32Array(L * 2), teA = new Float32Array(L * 2);
  for (let c = 0; c < 2; c++) {
    const he = new Float32Array(L), te = new Float32Array(L);
    for (const e of ev) {
      const g = e.amp * (c === 0 ? 1 - Math.max(0, e.pan) * 0.75 : 1 + Math.min(0, e.pan) * 0.75);
      for (let i = Math.max(0, Math.round(e.t * SR)); i < Math.min(L, Math.round((e.t + e.rise + 3.2 * e.fall) * SR)); i++) {
        const x = i / SR - e.t;
        he[i] += g * (x < e.rise ? (x / e.rise) ** 2 : Math.exp((-2.3 * (x - e.rise)) / e.fall));
        if (x >= e.rise) te[i] += g * Math.min(1, (x - e.rise) / 0.04) * Math.exp(-(x - e.rise) / 0.42);
      }
    }
    const lpRoar = biquad("lp", 620), hpRoar = biquad("hp", 45), hpH = biquad("hp", 1000), lpH = biquad("lp", 5200), lpD = biquad("lp", 1700), lpT = biquad("lp", 85), lpT2 = biquad("lp", 85);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < L; i++) {
      const t = i / SR, w = rnd();
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      const heave = 0.8 + 0.2 * Math.sin((2 * Math.PI * t) / (5.3 + c * 0.9) + c * 1.7) * Math.sin((2 * Math.PI * t) / 8.7 + 0.6);
      roar[i * 2 + c] = hpRoar(lpRoar(b0 + b1 + b2 + w * 0.1848)) * heave;
      const h = lpH(hpH(rnd())), e = Math.min(he[i], 1.6);
      hiss[i * 2 + c] = h; thump[i * 2 + c] = lpT2(lpT(rnd()));
      heA[i * 2 + c] = e; teA[i * 2 + c] = Math.min(te[i], 1.3);
    }
  }
  // at the height of a crest the hiss stands as loud as the roar, the thump of its fall well under it
  scale(roar, 1 / rmsOf(roar, 0, end)); scale(hiss, 1.0 / rmsOf(hiss, 0, end)); scale(thump, 0.6 / rmsOf(thump, 0, end));
  const sea = new Float32Array(L * 2);
  for (let i = 0; i < L * 2; i++) sea[i] = roar[i] + hiss[i] * heA[i] * (0.35 + 0.65 * heA[i]) + thump[i] * teA[i];
  const g0 = lin(-26) / rmsOf(sea, 0.3, 3.5);
  // full over the water; under the music once it has hit; thinner from high up; gone inside
  for (let i = 0; i < L; i++) {
    const t = i / SR;
    const g = g0 * smooth(t, 0, 0.45) * (1 - 0.3 * smooth(t, STRIKE, STRIKE + 0.9)) * (1 - 0.3 * smooth(t, CUT.B - 0.3, CUT.B + 0.5)) * (1 - 0.3 * smooth(t, CUT.C - 0.3, CUT.C + 0.5)) * (1 - smooth(t, CUT.DROP - 0.5, CUT.DROP + 0.25));
    sea[i * 2] *= g; sea[i * 2 + 1] *= g;
  }
  add(sea);
  console.log(`sea: ${ev.length} breakers · ${dB(rmsOf(sea, 0.3, 3.5)).toFixed(1)} dBFS before the strike, ${dB(rmsOf(sea, 5, 7)).toFixed(1)} after, ${dB(rmsOf(sea, 12, 14)).toFixed(1)} over the crust`);
}
// wind: under the sea at first, harder over the crust and through the plunge, gone on the drop
{
  const lw = LIB && path.join(LIB, "sfx/ambience/wind.wav");
  const x = lw && fs.existsSync(lw) ? dec(lw) : synthWind(24), n = x.length / 2, L = Math.round((CUT.DROP + 0.3) * SR);
  const w = new Float32Array(L * 2), g0 = lin(-29) / rmsOf(x, 0, n / SR);
  for (let i = 0; i < L; i++) {
    const t = i / SR, k = (i + Math.round(3.1 * SR)) % n;
    const g = g0 * smooth(t, 0, 0.8) * (0.7 + 0.3 * smooth(t, CUT.C - 0.5, CUT.C + 1.2) + 0.4 * ramp(t, CUT.CD, CUT.DROP - 0.2) ** 2) * (1 - smooth(t, CUT.DROP - 0.05, CUT.DROP + 0.25));
    w[i * 2] = x[k * 2] * g; w[i * 2 + 1] = x[k * 2 + 1] * g;
  }
  add(w);
  console.log(`wind: ${dB(rmsOf(w, 0.5, 3.5)).toFixed(1)} dBFS over the water, ${dB(rmsOf(w, 12, 14)).toFixed(1)} over the crust, ${dB(rmsOf(w, 17.4, 18.3)).toFixed(1)} in the plunge`);
}

const lead = (o) => (o.attack ?? 0.015) * 1.5;
/** thunder in three layers, each levelled on its own: the crack (the air torn: sharp bursts, the restrikes among
 *  them), the body (noise whose pitch rolls down), the rumble (far below, with late peals) */
const thunder = (o) => {
  const len = Math.round(7.6 * SR), crack = new Float32Array(len * 2), body = new Float32Array(len * 2), rumble = new Float32Array(len * 2);
  const f0 = o.bodyFrom ?? 1400, f1 = o.bodyTo ?? 110, att = o.attack ?? 0.015, decay = o.decay ?? 1.1;
  for (let c = 0; c < 2; c++) {
    if (o.crack !== undefined) {
      // [time, level, decay]: the stroke, the splits of its channel, the two restrikes (3 and 7 frames later), the echoes
      const bursts = [[0, 1, 0.034], [0.021, 0.5, 0.018], [0.047, 0.66, 0.045], [0.1, 0.6, 0.055], [0.137, 0.36, 0.04], [0.186, 0.42, 0.07], [0.2333, 0.48, 0.065], [0.3, 0.28, 0.1], [0.41, 0.22, 0.14], [0.56, 0.15, 0.2]]
        .map(([t, a, d], k) => [k === 0 || k === 3 || k === 6 ? t : t + 0.005 * rnd(), a * (1 + 0.25 * rnd() * (k ? 1 : 0)), d]);
      const hp = biquad("hp", 280), lp = biquad("lp", 7200);
      for (let i = 0; i < Math.round(1.6 * SR); i++) {
        const t = i / SR;
        let e = 0;
        for (const [bt, ba, bd] of bursts) if (t >= bt) e += ba * Math.min(1, (t - bt) / 0.0012) * Math.exp(-(t - bt) / bd);
        crack[i * 2 + c] = lp(hp(rnd())) * e;
      }
    }
    let lpB = 0, am = 0;
    const ph = 6.28 * uni();
    const lpR = biquad("lp", o.rumbleHz ?? 75), lpR2 = biquad("lp", o.rumbleHz ?? 75), hpR = biquad("hp", 24);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const fc = f1 + (f0 - f1) * Math.exp(-t / 0.6), k = 1 - Math.exp((-2 * Math.PI * fc) / SR);
      lpB += k * (rnd() - lpB);
      am += 0.0005 * (rnd() - am);
      const roll = 1 + 0.5 * Math.sin(2 * Math.PI * 6.3 * t + ph) * Math.sin(2 * Math.PI * 2.1 * t + 1.3) + 16 * am;
      body[i * 2 + c] = lpB * Math.min(1, t / att) * Math.exp(-t / decay) * Math.max(0.15, roll);
      const peals = Math.exp(-t / 1.9) + 0.42 * Math.exp(-Math.abs(t - 1.45) / 0.5) + 0.22 * Math.exp(-Math.abs(t - 2.8) / 0.8) + 0.1 * Math.exp(-Math.abs(t - 4.3) / 1.0);
      rumble[i * 2 + c] = hpR(lpR2(lpR(rnd()))) * Math.min(1, t / (att * 8)) * peals * (0.72 + 0.28 * Math.sin(2 * Math.PI * 4.1 * t + ph * 1.7)) * (1 - smooth(t, 5.6, 7.5));
    }
  }
  const out = new Float32Array(len * 2);
  if (o.crack !== undefined) { const g = lin(o.crack) / peakOf(crack); for (let i = 0; i < out.length; i++) out[i] += crack[i] * g; }
  { const g = lin(o.body) / rmsOf(body, lead(o), lead(o) + 0.5); for (let i = 0; i < out.length; i++) out[i] += body[i] * g; }
  { const g = lin(o.rumble) / rmsOf(rumble, 0.4, 1.4); for (let i = 0; i < out.length; i++) out[i] += rumble[i] * g; }
  return out;
};
/** an effect by its library id (sfx/<group>/<name>): from --sfx if given, else the kit's sfx-lib stand-in, levelled to
 *  −20 dBFS active RMS like the library's own files, so the gains below mean the same with either */
const KIT_MAP = {
  "sfx/whoosh/soft-medium": "whoosh", "sfx/whoosh/soft-long": "whoosh", "sfx/whoosh/soft-short": "whoosh",
  "sfx/riser/noise-2s": "riser", "sfx/transition/swell-cymbal-long": "riser",
  "sfx/impact/subdrop-short": "boom", "sfx/impact/subdrop-long": "boom", "sfx/impact/cinematic-heavy": "boom",
  "sfx/impact/metallic": "ping", "sfx/magic/shimmer-pad": "chime", "sfx/magic/sparkle-rise": "chime", "sfx/mechanical/gear-winding": "servo",
};
const activeLevel = (x) => {
  let pk = 0;
  for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
  let q = 0, m = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk * 0.05) { q += x[i] * x[i]; m++; }
  return Math.sqrt(q / Math.max(m, 1));
};
const sfxFile = (id) => {
  if (LIB && fs.existsSync(path.join(LIB, id + ".wav"))) return { file: path.join(LIB, id + ".wav"), level: false };
  const k = KIT_MAP[id];
  if (k && fs.existsSync(path.join(KIT_SFX, k + ".wav"))) return { file: path.join(KIT_SFX, k + ".wav"), level: true };
  return null;
};
const place = (id, at, gain, o = {}) => {
  const f = sfxFile(id);
  if (!f) { console.log("  missing", id); return; }
  const x = dec(f.file), n = x.length / 2, s0 = Math.round(at * SR);
  if (f.level) { const a = activeLevel(x); if (a > 1e-6) scale(x, lin(-20) / a); }
  const fin = Math.round((o.fadeIn ?? 0) * SR), fout = Math.round((o.fadeOut ?? 0.02) * SR), len = o.len ? Math.min(n, Math.round(o.len * SR)) : n;
  for (let i = 0; i < len; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    let g = gain;
    if (fin && i < fin) g *= i / fin;
    if (fout && i > len - fout) g *= (len - i) / fout;
    fx[j * 2] += x[i * 2] * g;
    fx[j * 2 + 1] += x[i * 2 + 1] * g;
  }
};
// the strike: a hiss of static as the leader comes down, the crack on the frame of the return stroke (the first hit of
// the song), the roll
{
  for (let c = 0; c < 2; c++) {
    const hp = biquad("hp", 2500);
    for (let i = Math.round((STRIKE - 0.25) * SR); i < Math.round(STRIKE * SR); i++) {
      const u = (i / SR - (STRIKE - 0.25)) / 0.25;
      if (Math.abs(rnd()) < 0.0008 + 0.007 * u * u) { const a = (0.04 + 0.2 * u) * (rnd() > 0 ? 1 : -1); for (let k = 0; k < 20 && i + k < N; k++) fx[(i + k) * 2 + c] += hp(a * Math.exp(-k / 4) * rnd()); }
    }
  }
  const th = thunder({ crack: -7, body: -16, rumble: -22 });
  add(th, 1, STRIKE);
  // a real roll under it (the recording's first clap is 0.88 s into its file, its peak at 1.00)
  if (LIB && fs.existsSync(path.join(LIB, "sfx/ambience/thunder-01.wav"))) { const x = dec(path.join(LIB, "sfx/ambience/thunder-01.wav")); place("sfx/ambience/thunder-01", STRIKE + 0.1 - 0.88, lin(-13) / peakOf(x), { fadeOut: 0.6 }); }
  console.log(`thunder: ${dB(rmsOf(th, 0, 0.5)).toFixed(1)} dBFS in its first half second, ${dB(rmsOf(th, 1, 1.5)).toFixed(1)} a second later, ${dB(rmsOf(th, 3, 3.5)).toFixed(1)} after three · peak ${dB(peakOf(th)).toFixed(1)}`);
}
// the far storm: no crack, a growl that swells and rolls away (one before the strike, one after each far flash)
{
  const far = thunder({ body: -30, rumble: -34, bodyFrom: 320, bodyTo: 80, attack: 0.3, decay: 1.3, rumbleHz: 60 });
  for (let i = 0; i < far.length / 2; i++) { const g = 1 - smooth(i / SR, 1.5, 2.6); far[i * 2] *= g; far[i * 2 + 1] *= g; }
  add(far, 1, 1.5);
  console.log(`far thunder: ${dB(rmsOf(far, 0.3, 0.8)).toFixed(1)} dBFS, ${dB(rmsOf(far, 0.8, 1.6)).toFixed(1)}, ${dB(rmsOf(far, 1.6, 2.4)).toFixed(1)} · peak ${dB(peakOf(far)).toFixed(1)}`);
}

// ── 3 · events (peak of each effect on its frame: start = event − peak)
const E = [
  ["sfx/whoosh/soft-medium", CUT.B - 0.32, 0.42],
  ["sfx/whoosh/soft-long", CUT.C - 0.573, 0.42],
  ["sfx/whoosh/soft-medium", CUT.CD - 0.32, 0.4],
  ["sfx/riser/noise-2s", CUT.DROP - 1.608, 0.34],
  ["sfx/impact/subdrop-short", CUT.DROP - 0.002, 0.5],
  ["sfx/whoosh/soft-short", CUT.D2 - 0.184, 0.48],
  ["sfx/whoosh/soft-medium", CUT.E - 0.32, 0.48],
  // the doors of the cage, then the swell into the light
  ["sfx/mechanical/gear-winding", CUT.F - 2.7 - 0.2, 0.3],
  ["sfx/transition/swell-cymbal-long", CUT.F - 2.378, 0.46],
  // the core: one deep hit, a shimmer while the name ignites, a small ring of metal for the accent, a sparkle for the second line
  ["sfx/impact/cinematic-heavy", CUT.F - 0.146, 0.55],
  ["sfx/impact/subdrop-long", CUT.F - 0.002, 0.4],
  ["sfx/magic/shimmer-pad", CUT.F + 0.92 - 1.311, 0.28],
  ["sfx/impact/metallic", CUT.F + 1.846 - 0.242, 0.2],
  ["sfx/magic/sparkle-rise", CUT.F + 2.31 - 0.291, 0.18],
  // the seal: the rings lock on the third hit of the song; a low boom carries the ending under the ring-out
  ["sfx/impact/metallic", CUT.END - 0.242, 0.16],
  ["sfx/impact/subdrop-long", CUT.END - 0.002, 0.42],
];
for (const [id, at, g] of E) place(id, at, g);

// ── 4 · mix, level to −14 LUFS, limit
const mix = new Float32Array(N * 2);
for (let i = 0; i < N * 2; i++) mix[i] = music[i] + fx[i];
for (let i = 0; i < N; i++) { const t = i / SR, g = Math.min(1, t / 0.03) * Math.min(1, (DUR - t) / 0.25); mix[i * 2] *= g; mix[i * 2 + 1] *= g; }
const pre = path.join(A, "premix.wav");
writeWav(pre, mix);
const m0 = lufs(pre);
const gainDb = -14 - m0.I;
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", pre, "-af", `volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.84:attack=3:release=60:level=false`, "-ar", "48000", "-c:a", "pcm_s24le", path.join(A, "mix.wav")]);
const m1 = lufs(path.join(A, "mix.wav"));
console.log(`premix ${m0.I} LUFS (peak ${m0.peak}) → gain ${gainDb.toFixed(2)} dB → mix ${m1.I} LUFS, peak ${m1.peak} dBFS`);
if (process.argv.includes("--stems")) {
  writeWav(path.join(A, "stem-music.wav"), music);
  writeWav(path.join(A, "stem-fx.wav"), fx);
  console.log("music stem", lufs(path.join(A, "stem-music.wav")), "· fx stem", lufs(path.join(A, "stem-fx.wav")));
}
console.log("cuts", Object.entries(CUT).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(" · "), "· strike", STRIKE.toFixed(3));
