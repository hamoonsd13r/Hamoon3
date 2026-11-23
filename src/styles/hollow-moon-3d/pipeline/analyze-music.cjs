// Hollow Moon 3D · the structure of a music take or of your own song, without listening: level per quarter second in
// three bands (all / low / mid / high), the first and last sound, the strongest hits, and the level of every second.
// Use it to pick the take whose big hits fall where the film needs them, and to find the offset (two bars before hit 1).
//   node src/styles/hollow-moon-3d/pipeline/analyze-music.cjs music/take1.mp3 music/take2.mp3 …
const { execFileSync } = require("child_process");
const SR = 22050;
const decode = (f) => {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
};
// RBJ biquads
const biquad = (x, type, f0, q = 0.707) => {
  const w = (2 * Math.PI * f0) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
};
const rms = (x, win) => {
  const n = Math.floor(x.length / win), o = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < win; j++) { const v = x[i * win + j]; s += v * v; } o[i] = Math.sqrt(s / win); }
  return o;
};
const db = (v) => (v > 1e-7 ? 20 * Math.log10(v) : -140);
const bar = (d, lo = -48, hi = -6) => { const k = Math.max(0, Math.min(8, Math.round(((d - lo) / (hi - lo)) * 8))); return " ▁▂▃▄▅▆▇█"[k]; };

for (const f of process.argv.slice(2)) {
  const x = decode(f);
  const dur = x.length / SR;
  const low = biquad(biquad(x, "lp", 120), "lp", 120), high = biquad(biquad(x, "hp", 4000), "hp", 4000), mid = biquad(biquad(x, "hp", 250), "lp", 3000);
  const W = Math.round(SR * 0.25);
  const rA = rms(x, W), rL = rms(low, W), rM = rms(mid, W), rH = rms(high, W);
  console.log(`\n== ${f}  ${dur.toFixed(2)} s`);
  const row = (name, r, lo, hi) => console.log(name.padEnd(5) + Array.from(r, (v) => bar(db(v), lo, hi)).join(""));
  let ruler = "     ";
  for (let i = 0; i < rA.length; i++) ruler += i % 4 === 0 ? String(Math.floor(i / 4) % 10) : " ";
  console.log(ruler);
  row("all", rA, -40, -8); row("low", rL, -44, -10); row("mid", rM, -46, -12); row("high", rH, -60, -24);
  // fine envelope (10 ms): first sound, last sound, strongest onsets
  const w10 = Math.round(SR * 0.01), e = rms(x, w10), eL = rms(low, w10);
  let first = 0; while (first < e.length && db(e[first]) < -45) first++;
  let last = e.length - 1; while (last > 0 && db(e[last]) < -45) last--;
  console.log(`first sound ${(first * 0.01).toFixed(2)} s · last sound above -45 dB ${(last * 0.01).toFixed(2)} s`);
  // onset = rise of the 10 ms level against the mean of the 80 ms before it
  const ons = [];
  for (let i = 10; i < e.length - 2; i++) {
    let m = 0; for (let j = i - 9; j < i - 1; j++) m += e[j]; m /= 8;
    const pk = Math.max(e[i], e[i + 1], e[i + 2]);
    const rise = db(pk) - db(m + 1e-5);
    ons.push({ t: i * 0.01, rise, pk: db(pk), low: db(Math.max(eL[i], eL[i + 1], eL[i + 2])) });
  }
  // local maxima of level*rise, at least 0.3 s apart
  const score = (o) => o.rise * 1.0 + (o.pk + 30) * 0.7;
  const picks = [];
  for (const o of [...ons].sort((a, b) => score(b) - score(a))) {
    if (picks.length >= 14) break;
    if (o.rise < 3) continue;
    if (picks.some((p) => Math.abs(p.t - o.t) < 0.3)) continue;
    picks.push(o);
  }
  picks.sort((a, b) => a.t - b.t);
  console.log("hits  " + picks.map((p) => `${p.t.toFixed(2)}(+${p.rise.toFixed(0)}dB→${p.pk.toFixed(0)},L${p.low.toFixed(0)})`).join(" "));
  // loudest second and the quietest second inside the body
  const r1 = rms(x, SR);
  let hi = 0, lo = 1; for (let i = 0; i < r1.length; i++) { if (r1[i] > r1[hi]) hi = i; if (i > 0 && i < r1.length - 4 && r1[i] < r1[lo]) lo = i; }
  console.log(`per second dB: ${Array.from(r1, (v) => db(v).toFixed(0)).join(" ")}`);
  console.log(`low per second: ${Array.from(rms(low, SR), (v) => db(v).toFixed(0)).join(" ")}`);
}
