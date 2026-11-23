// Snow Castle 3D · the score, synthesised (no samples, no licence): an original lullaby in D minor for celesta, harp and
// strings (66 BPM, 4/4, 11 bars = 40 s), a winter wind under it, and one small bell for each viaduct lantern as it lights.
// Then the hall reverb, tone and level → mix.wav at −14 LUFS (true peak under −1.5 dB), ready to mux with the picture.
//   node src/styles/snow-castle-3d/pipeline/make-music.cjs [outDir = out/snow-castle-music]
// Writes dry.wav, send.wav (reverb send), ir.wav (hall impulse), stem-*.wav (one per instrument, to check the balance),
// premix.wav, mix.wav and spec.png (spectrum: the bass must not sit 10–15 dB over the melody). Needs ffmpeg on PATH.
// A film of another length: change DUR (+2.5 s of tail), the chords CH / ROOT / MEL (bars of 3.64 s) and FILM_DUR.
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const OUT = path.resolve(process.argv[2] || "out/snow-castle-music");
fs.mkdirSync(OUT, { recursive: true });
/** the picture's length: the mix is cut and faded to it */
const FILM_DUR = 40;
const SR = 48000, DUR = 42.5, N = Math.floor(SR * DUR);
const BPM = 66, BEAT = 60 / BPM, BAR = BEAT * 4, E8 = BEAT / 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
let seed = 78123;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const mk = () => [new Float32Array(N), new Float32Array(N)];
const bus = { cel: mk(), harp: mk(), pad: mk(), bass: mk(), wind: mk(), ting: mk() };
const panLR = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

/** celesta / music box: a struck metal bar over a resonator: a pure fundamental, a few slightly stretched partials, a tine click */
function celesta(b, t0, midi, vel = 0.6, pan = 0, long = 1) {
  const f = mtof(midi), k = Math.pow(440 / f, 0.32);
  const parts = [[1, 1, 1.5 * long], [2.0, 0.16, 0.8], [3.01, 0.05, 0.5], [4.03, 0.2, 0.42], [6.27, 0.045, 0.2], [9.1, 0.03, 0.045]];
  const [gl, gr] = panLR(pan);
  const i0 = Math.floor(t0 * SR), len = Math.min(N - i0, Math.floor(SR * 5.5 * k * long));
  const ph = parts.map(() => rnd() * TAU);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const att = Math.min(1, t / 0.003);
    let s = 0;
    for (let p = 0; p < parts.length; p++) {
      const [r, a, tau] = parts[p];
      if (f * r > 16000) continue;
      s += a * Math.exp(-t / (tau * k)) * Math.sin(TAU * f * r * t + ph[p]);
    }
    s *= att * vel * 0.22;
    b[0][i0 + i] += s * gl; b[1][i0 + i] += s * gr;
  }
}
/** harp: a plucked string, brighter at the pluck, harmonics dying in order */
function harp(b, t0, midi, vel = 0.5, pan = 0) {
  const f = mtof(midi);
  const [gl, gr] = panLR(pan);
  const i0 = Math.floor(t0 * SR), len = Math.min(N - i0, Math.floor(SR * 4.2));
  const nh = Math.min(12, Math.floor(9000 / f));
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let s = 0;
    for (let h = 1; h <= nh; h++) s += (Math.sin(h * 0.9) * 0.5 + 0.6) / Math.pow(h, 1.25) * Math.exp(-t * (0.55 + 0.42 * h)) * Math.sin(TAU * f * h * t * (1 + 0.00035 * h * h));
    s *= Math.min(1, t / 0.004) * vel * 0.2;
    b[0][i0 + i] += s * gl; b[1][i0 + i] += s * gr;
  }
}
/** strings: three slightly detuned voices per note, bowed slowly in and out */
function pad(b, t0, t1, notes, vel = 0.5, att = 1.3, rel = 1.9) {
  const i0 = Math.max(0, Math.floor((t0 - 0.02) * SR)), i1 = Math.min(N, Math.floor((t1 + rel) * SR));
  notes.forEach((midi, ni) => {
    const f0 = mtof(midi);
    for (let v = 0; v < 3; v++) {
      const det = 1 + (v - 1) * 0.0035 + (rnd() - 0.5) * 0.001, f = f0 * det;
      const pan = (v - 1) * 0.6 + (ni % 2 ? 0.2 : -0.2), [gl, gr] = panLR(pan);
      const vr = 4.6 + rnd() * 1.1, vp = rnd() * TAU, ph = rnd() * TAU;
      const nh = Math.min(9, Math.floor(5200 / f));
      const amp = [];
      for (let h = 1; h <= nh; h++) amp.push((1 / h) / (1 + Math.pow((h * f) / 1500, 2)));
      let phase = ph;
      for (let i = i0; i < i1; i++) {
        const t = i / SR;
        const env = Math.min(1, Math.max(0, (t - t0) / att)) * Math.min(1, Math.max(0, (t1 + rel - t) / rel));
        if (env <= 0) { phase += TAU * f / SR; continue; }
        const vib = 1 + 0.0028 * Math.sin(TAU * vr * t + vp) * Math.min(1, (t - t0) / 2);
        phase += (TAU * f * vib) / SR;
        let s = 0;
        for (let h = 1; h <= nh; h++) s += amp[h - 1] * Math.sin(phase * h);
        const e2 = env * env * (3 - 2 * env);
        s *= e2 * vel * 0.045 * (0.85 + 0.15 * Math.sin(TAU * 0.11 * t + ni));
        b[0][i] += s * gl; b[1][i] += s * gr;
      }
    }
  });
}
function bass(b, t0, t1, midi, vel = 0.5) {
  const f = mtof(midi), i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.floor((t1 + 1.2) * SR));
  for (let i = i0; i < i1; i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / 0.5) * Math.min(1, Math.max(0, (t1 + 1.2 - t) / 1.2));
    const s = (Math.sin(TAU * f * t) + 0.22 * Math.sin(TAU * 2 * f * t) + 0.06 * Math.sin(TAU * 3 * f * t)) * env * vel * 0.16;
    b[0][i] += s; b[1][i] += s;
  }
}
/** wind: noise through a wandering band-pass, each ear its own gusts; a whisper of high hiss for the falling snow */
function wind(b) {
  for (let ch = 0; ch < 2; ch++) {
    let lo = 0, bp = 0, lo2 = 0, bp2 = 0, hp = 0;
    const p1 = rnd() * TAU, p2 = rnd() * TAU, p3 = rnd() * TAU, p4 = rnd() * TAU;
    for (let i = 0; i < N; i++) {
      const t = i / SR, n = rnd() * 2 - 1;
      const gust = 0.5 + 0.5 * Math.sin(TAU * 0.043 * t + p1) * Math.sin(TAU * 0.017 * t + p2 + ch);
      const fc = 260 + 240 * gust + 110 * Math.sin(TAU * 0.11 * t + p3), q = 0.55;
      const fk = 2 * Math.sin(Math.PI * fc / SR);
      lo += fk * bp; const hi = n - lo - q * bp; bp += fk * hi;
      const fc2 = 900 + 500 * Math.sin(TAU * 0.031 * t + p4), fk2 = 2 * Math.sin(Math.PI * fc2 / SR);
      lo2 += fk2 * bp2; const hi2 = n - lo2 - 0.9 * bp2; bp2 += fk2 * hi2;
      hp += 0.35 * (n - hp);
      const hiss = (n - hp) * 0.012;
      b[ch][i] += bp * 0.09 * (0.35 + 0.65 * gust * gust) + bp2 * 0.012 * (0.3 + 0.7 * gust) + hiss;
    }
  }
}

// ── the score
const CH = [
  [[50, 57, 64, 65, 69]],                                   // 0 Dm(add9)
  [[50, 57, 62, 65, 69]],                                   // 1 Dm
  [[46, 53, 57, 62, 65]],                                   // 2 Bbmaj7
  [[45, 53, 55, 60, 65]],                                   // 3 F(add9)/A
  [[43, 50, 53, 57, 58, 62]],                               // 4 Gm9
  [[45, 52, 57, 62], [45, 52, 57, 61, 64]],                 // 5 Asus4 → A
  [[50, 57, 62, 65, 69]],                                   // 6 Dm
  [[46, 53, 58, 62, 65], [48, 55, 60, 64, 67]],             // 7 Bb → C
  [[41, 48, 53, 57, 60, 65, 69]],                           // 8 F
  [[43, 50, 53, 58, 62], [45, 52, 55, 61, 64]],             // 9 Gm7 → A7
  [[38, 45, 50, 54, 57, 64, 66, 69]],                       // 10 D major (add9)
];
const ROOT = [38, 38, 34, 33, 31, 33, 38, [34, 36], 29, [31, 33], 26];
const T0 = 0.0; // bar 0 starts with the picture
const barT = (b) => T0 + b * BAR;
CH.forEach((halves, b) => {
  halves.forEach((notes, hI) => {
    const t0 = barT(b) + (hI * BAR) / halves.length, t1 = t0 + BAR / halves.length;
    const last = b === CH.length - 1;
    pad(bus.pad, t0, last ? t0 + 2.2 : t1, notes, b === 0 ? 0.42 : b >= 8 ? 0.62 : 0.52, b === 0 ? 2.2 : 1.2, last ? 3.0 : 1.9);
  });
  const r = ROOT[b];
  if (Array.isArray(r)) r.forEach((m, hI) => bass(bus.bass, barT(b) + (hI * BAR) / 2, barT(b) + ((hI + 1) * BAR) / 2, m + 12, 0.5));
  else if (b > 0) bass(bus.bass, barT(b), b === CH.length - 1 ? barT(b) + 2 : barT(b + 1), r + 12, b >= 8 ? 0.6 : 0.5);
});
// celesta melody: [bar, eighth, midi, velocity, long]
const MEL = [
  [0, 4, 81, 0.5, 1.2], [0, 6, 86, 0.55, 1.2],
  [1, 0, 88, 0.6, 1.3], [1, 3, 86, 0.45], [1, 4, 81, 0.5], [1, 6, 77, 0.5, 1.2],
  [2, 0, 86, 0.6], [2, 2, 84, 0.5], [2, 4, 81, 0.55], [2, 6, 77, 0.45], [2, 7, 79, 0.45],
  [3, 0, 81, 0.6, 1.4], [3, 4, 84, 0.5], [3, 6, 81, 0.45], [3, 7, 79, 0.42],
  [4, 0, 82, 0.62, 1.2], [4, 2, 81, 0.5], [4, 4, 79, 0.52], [4, 6, 74, 0.45], [4, 7, 77, 0.45],
  [5, 0, 76, 0.55, 1.5], [5, 4, 81, 0.5], [5, 6, 85, 0.5], [5, 7, 88, 0.52],
  [6, 0, 86, 0.66, 1.6],
  [7, 0, 86, 0.55], [7, 2, 89, 0.55], [7, 4, 88, 0.58], [7, 6, 91, 0.6],
  [8, 0, 93, 0.7, 1.6], [8, 3, 91, 0.48], [8, 4, 89, 0.55], [8, 6, 84, 0.5, 1.2],
  [9, 0, 86, 0.6], [9, 2, 82, 0.5], [9, 4, 81, 0.55], [9, 6, 88, 0.5], [9, 7, 85, 0.48],
];
for (const [b, e, m, v, lg] of MEL) {
  const hum = (rnd() - 0.5) * 0.014;
  celesta(bus.cel, barT(b) + e * E8 + hum, m, v, ((m - 84) / 14) * 0.5, lg ?? 1);
  // an octave below, very soft, gives the bar its body
  celesta(bus.cel, barT(b) + e * E8 + hum + 0.004, m - 12, v * 0.28, ((m - 84) / 14) * -0.3, lg ?? 1);
}
// last chord, rolled
[[86, 0], [90, 0.07], [93, 0.14], [98, 0.24]].forEach(([m, d], i) => celesta(bus.cel, barT(10) + d, m, 0.62 - i * 0.07, (i - 1.5) * 0.3, 1.9));
celesta(bus.cel, barT(10) + BEAT * 2, 102, 0.3, 0.2, 1.6);
// harp: broken chords in eighths (not in the first bar, thinner under the cadence)
CH.forEach((halves, b) => {
  if (b === 0) return;
  for (let e = 0; e < 8; e++) {
    const notes = halves[Math.min(halves.length - 1, Math.floor((e / 8) * halves.length))];
    const up = [0, 1, 2, 3, 4, 3, 2, 1].map((i) => notes[Math.min(i, notes.length - 1)]);
    if (b === 10 && e > 5) continue;
    const m = b === 10 ? notes[Math.min(e, notes.length - 1)] : up[e];
    const t = barT(b) + (b === 10 ? e * 0.11 : e * E8) + (rnd() - 0.5) * 0.012;
    const v = (b === 1 ? 0.3 : b === 5 ? 0.3 : b >= 8 ? 0.5 : 0.4) * (e % 2 ? 0.8 : 1);
    harp(bus.harp, t, m + (m < 50 ? 12 : 0), v, ((e % 4) - 1.5) * 0.25);
  }
});
// a small bell for every lantern of the viaduct as it lights: the inverse of litAt() in demo/film.ts after second 20
// (keep the two in step if you change the light clock)
const litToFilm = (lt) => 20 + (lt - 2) / 1.9;
[74, 77, 81, 84, 86, 89, 93, 96].forEach((m, i) => {
  celesta(bus.ting, litToFilm(7.5 + i * 0.75) + 0.03, m + 12, 0.2 + i * 0.012, -0.7 + i * 0.2, 0.8);
  celesta(bus.ting, litToFilm(7.8 + i * 0.75) + 0.03, m + 19, 0.1, 0.7 - i * 0.2, 0.6);
});
wind(bus.wind);

// ── tone of the buses: the strings and the wind give their lows away, so the mix is not a rumble under a small bell
function hpf(buf, fc, q = 0.707) {
  const w = (2 * Math.PI * fc) / SR, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  const b0 = (1 + c) / 2, b1 = -(1 + c), b2 = (1 + c) / 2, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  for (const ch of buf) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < ch.length; i++) { const x = ch[i]; const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; ch[i] = y; }
  }
}
hpf(bus.pad, 170); hpf(bus.pad, 120);
hpf(bus.wind, 240); hpf(bus.wind, 180);
hpf(bus.harp, 110);

// ── mix
const G = { cel: 1.35, harp: 0.75, pad: 1.0, bass: 0.26, wind: 0.8, ting: 0.9 };
const mixL = new Float32Array(N), mixR = new Float32Array(N), wetL = new Float32Array(N), wetR = new Float32Array(N);
const SEND = { cel: 0.5, harp: 0.4, pad: 0.35, bass: 0.05, wind: 0.08, ting: 0.6 };
for (const k of Object.keys(bus)) {
  const [l, r] = bus[k], g = G[k], sd = SEND[k];
  for (let i = 0; i < N; i++) { mixL[i] += l[i] * g; mixR[i] += r[i] * g; wetL[i] += l[i] * g * sd; wetR[i] += r[i] * g * sd; }
}
// fades with the picture (in 0–1.8 s, out 37.4–40.6 s so the last chord dies after the image)
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const f = Math.min(1, t / 1.6) * Math.min(1, Math.max(0, (41.6 - t) / 4.2));
  const e = f * f * (3 - 2 * f);
  mixL[i] *= e; mixR[i] *= e; wetL[i] *= e; wetR[i] *= e;
}
function wav(file, chans, sr = SR) {
  const n = chans[0].length, nc = chans.length;
  let peak = 0;
  for (const c of chans) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(c[i]));
  const buf = Buffer.alloc(44 + n * nc * 3);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * nc * 3, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nc, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * nc * 3, 28); buf.writeUInt16LE(nc * 3, 32); buf.writeUInt16LE(24, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * nc * 3, 40);
  const g = peak > 0.98 ? 0.98 / peak : 1;
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const v = Math.max(-1, Math.min(1, chans[c][i] * g)); buf.writeIntLE(Math.round(v * 8388607), o, 3); o += 3; }
  fs.writeFileSync(path.join(OUT, file), buf);
  console.log(`${file}: peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS${g < 1 ? " (scaled)" : ""}`);
}
wav("dry.wav", [mixL, mixR]);
wav("send.wav", [wetL, wetR]);
// stems for checking the balance
for (const k of Object.keys(bus)) wav(`stem-${k}.wav`, bus[k]);
// hall impulse: 3.2 s of decaying noise, darker as it dies, 24 ms before the first reflection
{
  const n = Math.floor(SR * 3.6), l = new Float32Array(n), r = new Float32Array(n);
  const pre = Math.floor(SR * 0.024);
  let ll = 0, lr = 0;
  for (let i = pre; i < n; i++) {
    const t = (i - pre) / SR, env = Math.exp(-t / 0.62) * (1 - Math.exp(-t / 0.012));
    const a = 0.12 + 0.6 * Math.exp(-t / 0.5);
    ll += a * (rnd() * 2 - 1 - ll); lr += a * (rnd() * 2 - 1 - lr);
    l[i] = ll * env; r[i] = lr * env;
  }
  // a few early reflections
  for (const [d, g] of [[0.031, 0.5], [0.047, -0.4], [0.071, 0.34], [0.093, -0.26]]) { l[Math.floor(SR * d)] += g; r[Math.floor(SR * (d * 1.13))] += g * 0.9; }
  wav("ir.wav", [l, r]);
}

// ── reverb, tone, level: the hall on the send, low-cut, a dip at 260 Hz and a little air; then −14 LUFS and a limiter
{
  const dry = path.join(OUT, "dry.wav"), send = path.join(OUT, "send.wav"), ir = path.join(OUT, "ir.wav"), pre = path.join(OUT, "premix.wav"), mix = path.join(OUT, "mix.wav");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", dry, "-i", send, "-i", ir, "-filter_complex",
    "[1:a][2:a]afir=dry=0:wet=1:gtype=none,highpass=f=180,lowpass=f=9000[w];[0:a][w]amix=inputs=2:weights=1 1.6:normalize=0,highpass=f=28,equalizer=f=260:t=q:w=1.0:g=-1.5,equalizer=f=9000:t=h:w=4000:g=1.5[m]",
    "-map", "[m]", "-ar", "48000", "-c:a", "pcm_s24le", pre]);
  const loud = (f) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }); const s = r.stderr.slice(r.stderr.lastIndexOf("Summary:")); return { I: Number((/I:\s+(-?[\d.]+) LUFS/.exec(s) || [])[1]), peak: Number((/Peak:\s+(-?[\d.]+) dBFS/.exec(s) || [])[1]) }; };
  const m0 = loud(pre), g = -14 - m0.I;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", pre, "-af", `volume=${g.toFixed(2)}dB,alimiter=limit=0.82:attack=4:release=120:level=false,atrim=0:${FILM_DUR},afade=t=out:st=${FILM_DUR - 1.4}:d=1.4`, "-ar", "48000", "-c:a", "pcm_s24le", mix]);
  const m1 = loud(mix);
  console.log(`premix ${m0.I} LUFS → gain ${g.toFixed(2)} dB → mix.wav ${m1.I} LUFS, peak ${m1.peak} dBFS`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mix, "-lavfi", "showspectrumpic=s=1600x700:legend=1:scale=log:fscale=log:start=40:stop=12000", path.join(OUT, "spec.png")]);
  console.log("→", mix);
}
