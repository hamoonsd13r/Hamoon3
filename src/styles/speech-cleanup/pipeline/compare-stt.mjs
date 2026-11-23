// Speech Cleanup · step 11 — checks an edit by re-transcription: aligns the words that should remain (original transcript ∩ kept pieces,
// moved onto the edited clock) with a fresh transcript of the edited audio, and reports trouble near joins:
// words missing or added within ±1.5 s of a join, words Scribe marks as cut off ("--"), leftover fillers.
// usage: node src/styles/speech-cleanup/pipeline/compare-stt.mjs <stt/words.json> <segments-A.json> <check/stt/words.json> [fps=60]
import fs from "node:fs";

const [origPath, segPath, newPath, fpsArg = "60"] = process.argv.slice(2);
const FPS = Number(fpsArg);
const norm = (s) => s.normalize("NFC").replace(/[ً-ٰٟـ]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک")
  .replace(/[‌‎‏]/g, "").replace(/[.,،؛;:!?؟«»"'()\[\]…\-—–]/g, "").toLowerCase().trim();
const segs = JSON.parse(fs.readFileSync(segPath, "utf8")).map((s) => ({ a: s.fa / FPS, b: s.fb / FPS }));
let acc = 0;
for (const s of segs) { s.off = acc; acc += s.b - s.a; }
const joins = segs.slice(1).map((s) => s.off);
const toEdit = (t) => { const s = segs.find((x) => t >= x.a && t < x.b); return s ? s.off + (t - s.a) : null; };

const exp = JSON.parse(fs.readFileSync(origPath, "utf8")).filter((w) => w.type === "word")
  .map((w) => ({ ...w, te: toEdit((w.start + w.end) / 2), n: norm(w.text) })).filter((w) => w.te != null && w.n);
const got = JSON.parse(fs.readFileSync(newPath, "utf8")).filter((w) => w.type === "word").map((w) => ({ ...w, te: (w.start + w.end) / 2, n: norm(w.text) })).filter((w) => w.n);

// edit-distance alignment on normalized words
const N = exp.length, M = got.length, W = M + 1;
const D = new Uint32Array((N + 1) * W), B = new Uint8Array((N + 1) * W); // 1 diag, 2 up (deletion), 3 left (insertion)
for (let i = 0; i <= N; i++) { D[i * W] = i; B[i * W] = 2; }
for (let j = 0; j <= M; j++) { D[j] = j; B[j] = 3; }
for (let i = 1; i <= N; i++) for (let j = 1; j <= M; j++) {
  const sub = D[(i - 1) * W + j - 1] + (exp[i - 1].n === got[j - 1].n ? 0 : 1), del = D[(i - 1) * W + j] + 1, ins = D[i * W + j - 1] + 1;
  const m = Math.min(sub, del, ins);
  D[i * W + j] = m; B[i * W + j] = m === sub ? 1 : m === del ? 2 : 3;
}
const ops = [];
for (let i = N, j = M; i > 0 || j > 0;) {
  const b = B[i * W + j];
  if (b === 1 && i > 0 && j > 0) { ops.push({ op: exp[i - 1].n === got[j - 1].n ? "=" : "~", e: exp[i - 1], g: got[j - 1] }); i--; j--; }
  else if (b === 2 && i > 0) { ops.push({ op: "-", e: exp[i - 1] }); i--; }
  else { ops.push({ op: "+", g: got[j - 1] }); j--; }
}
ops.reverse();
const at = (o) => (o.e ? o.e.te : o.g.te);
const nearJoin = (t) => joins.some((j) => Math.abs(j - t) <= 1.5);
const bad = ops.filter((o) => o.op !== "=");
const near = bad.filter((o) => nearJoin(at(o)));
const tJoin = joins.length * 3, tAll = acc;
console.log(`expected ${N} words, transcribed ${M}; mismatches ${bad.length} (${((100 * bad.length) / N).toFixed(1)}%)`);
console.log(`near joins (±1.5 s, ${((100 * tJoin) / tAll).toFixed(0)}% of the time): ${near.length} mismatches = ${((100 * near.length) / bad.length).toFixed(0)}% of all`);
const t = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
// group consecutive near-join problems by join
const byJoin = new Map();
for (const o of near) {
  const j = joins.reduce((best, x) => (Math.abs(x - at(o)) < Math.abs(best - at(o)) ? x : best), joins[0]);
  if (!byJoin.has(j)) byJoin.set(j, []);
  byJoin.get(j).push(o);
}
for (const [j, os] of [...byJoin].sort((a, b) => a[0] - b[0])) {
  const s = os.map((o) => (o.op === "-" ? `−${o.e.text}` : o.op === "+" ? `+${o.g.text}` : `${o.e.text}→${o.g.text}`)).join("  ");
  console.log(`join ${t(j)}: ${s}`);
}
const cutOff = got.filter((w) => /(--|—)\s*$/.test(w.text));
console.log(`\ncut-off words in the edited audio: ${cutOff.length}`);
for (const w of cutOff) console.log(`  ${t(w.te)} «${w.text}»${nearJoin(w.te) ? "  ← at a join" : ""}`);
const fill = got.filter((w) => /^(ا|اه|اا|ااا|ام|امم|اممم|آم|مم|ممم|اوم)$/.test(w.n));
console.log(`fillers left: ${fill.length}${fill.length ? " → " + fill.map((w) => `${t(w.te)} «${w.text}»`).join(", ") : ""}`);
