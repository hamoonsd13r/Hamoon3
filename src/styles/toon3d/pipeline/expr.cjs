// The liveliest clean take of every line: among the takes the STT check heard right (score within 0.03 of the line's
// best, from tools/doc-voices.mjs vo/verify.json), pick the widest pitch range (semitone std over voiced frames) +
// 0.15 x loudness range. Writes <dlg>/picks.json ({ "<line>": <take> }); then pipeline/apply-picks.mjs <id>.
// Usage: node src/styles/toon3d/pipeline/expr.cjs videos/<id>/dlg [bad,takes]   (e.g. 03-2,07-1: heard wrong when you listened)
const { execFileSync } = require("child_process");
const fs = require("fs");
const DIR = process.argv[2], BAD = new Set((process.argv[3] || "").split(",").filter(Boolean));
const SR = 16000, FR = 640, HOP = 160;
const V = JSON.parse(fs.readFileSync(`${DIR}/vo/verify.json`, "utf8"));
const res = {};
for (const k of Object.keys(V).sort()) {
  const b = execFileSync("ffmpeg", ["-v", "error", "-i", `${DIR}/vo/${k}.mp3`, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const x = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
  const f0 = [], en = [];
  for (let i = 0; i + FR < x.length; i += HOP) {
    let e = 0;
    for (let j = 0; j < FR; j++) e += x[i + j] * x[i + j];
    e = Math.sqrt(e / FR);
    if (e < 0.02) continue;
    en.push(20 * Math.log10(e));
    let best = 0, bl = 0;
    for (let lag = Math.floor(SR / 320); lag <= Math.floor(SR / 70); lag++) {
      let c = 0, n1 = 0, n2 = 0;
      for (let j = 0; j < FR - lag; j++) { c += x[i + j] * x[i + j + lag]; n1 += x[i + j] ** 2; n2 += x[i + j + lag] ** 2; }
      const r = c / Math.sqrt(n1 * n2 + 1e-12);
      if (r > best) { best = r; bl = lag; }
    }
    if (best > 0.6) f0.push(12 * Math.log2(SR / bl / 100));
  }
  const m = f0.reduce((a, v) => a + v, 0) / f0.length;
  const sd = Math.sqrt(f0.reduce((a, v) => a + (v - m) ** 2, 0) / f0.length);
  en.sort((a, b) => a - b);
  const er = en[Math.floor(en.length * 0.95)] - en[Math.floor(en.length * 0.1)];
  res[k] = { score: V[k].score, pitchSd: +sd.toFixed(2), meanSt: +m.toFixed(1), eRange: +er.toFixed(1), dur: V[k].dur, bad: BAD.has(k) };
}
const lines = {};
for (const [k, r] of Object.entries(res)) (lines[k.split("-")[0]] ??= []).push([k, r]);
const pick = {};
for (const [n, arr] of Object.entries(lines)) {
  const ok = arr.filter(([, r]) => !r.bad);
  const top = Math.max(...ok.map(([, r]) => r.score));
  const cand = ok.filter(([, r]) => r.score >= top - 0.03);
  cand.sort((a, b) => b[1].pitchSd + 0.15 * b[1].eRange - (a[1].pitchSd + 0.15 * a[1].eRange));
  pick[+n] = +cand[0][0].split("-")[1];
  console.log(n, arr.map(([k, r]) => `${k}${r.bad ? "✗" : ""}: sd ${r.pitchSd} er ${r.eRange} sc ${r.score}`).join(" | "), "→", cand[0][0]);
}
fs.writeFileSync(`${DIR}/picks.json`, JSON.stringify(pick));
