// Speech Cleanup · step 12 — builds evidence files for checking an edit (one file per doubtful spot):
//  - diag/item-NN.txt for each edited-time point: original words around it (kept/removed + which cut),
//    the fresh transcript of the edited audio around it, cut edges and the loudness profile
//  - edited/part-K.txt: the fresh transcript of the edited audio as numbered lines, each with its edited
//    time and the original camera time it came from
// usage: node src/styles/speech-cleanup/pipeline/diag.mjs <dir> <items.json> [parts=5] [segments=segments-A.json]
//          [fresh=check/stt/words.json] [cuts=cuts-A.json] [fps=60]
//   items.json: [{ "t": 1234.5, "label": "what to look at" }]  (t = seconds on the EDITED timeline)
import fs from "node:fs";
import path from "node:path";

const [dir, itemsPath, partsArg = "5", segFile = "segments-A.json", freshFile = "check/stt/words.json", cutsFile = "cuts-A.json", fpsArg = "60"] = process.argv.slice(2);
const FPS = Number(fpsArg);
const J = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const segs = J(segFile).map((s) => ({ a: s.fa / FPS, b: s.fb / FPS }));
let acc = 0;
for (const s of segs) { s.off = acc; acc += s.b - s.a; }
const toOrig = (te) => { const s = segs.find((x) => te >= x.off && te < x.off + (x.b - x.a)) || segs.at(-1); return s.a + (te - s.off); };
const kept = (t) => segs.some((s) => t >= s.a && t < s.b);
const cuts = J(cutsFile).cuts.filter((c) => c.apply);
const orig = J("stt/words.json").filter((w) => w.type !== "spacing").sort((a, b) => a.start - b.start);
const fresh = J(freshFile).filter((w) => w.type !== "spacing").sort((a, b) => a.start - b.start);
const eb = fs.readFileSync(path.join(dir, "env10ms.f32"));
const env = new Float32Array(eb.buffer, eb.byteOffset, eb.length / 4);
const lvl = (t) => env[Math.max(0, Math.min(env.length - 1, Math.floor(t * 100)))];
const T = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
const cutOf = (t) => cuts.find((c) => t >= c.a && t < c.b);

fs.mkdirSync(path.join(dir, "diag"), { recursive: true });
const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));
items.forEach((it, n) => {
  const to = toOrig(it.t);
  const L = [`ITEM ${n + 1}: ${it.label}`, `edited time ${T(it.t)}  ↔  original camera time ${T(to)} (camera seconds ${to.toFixed(2)})`, ""];
  const edges = segs.flatMap((s) => [{ k: "kept piece starts", t: s.a }, { k: "kept piece ends", t: s.b }]).filter((e) => Math.abs(e.t - to) < 4);
  L.push("Cut edges within ±4 s (original time):", ...edges.map((e) => `  ${e.k} at ${T(e.t)} (${e.t.toFixed(3)})`), "");
  L.push("ORIGINAL words ±4 s (start–end, KEPT/CUT, cut reason):");
  for (const w of orig.filter((w) => w.end > to - 4 && w.start < to + 4)) {
    const mid = (w.start + w.end) / 2, c = cutOf(mid);
    L.push(`  ${w.start.toFixed(2)}–${w.end.toFixed(2)}  ${kept(mid) ? "KEPT" : "CUT "}  ${w.type === "audio_event" ? "(event) " : ""}${w.text}${c ? `   [cut: ${c.kind}${c.note ? " – " + c.note : ""}${c.why ? " – " + c.why : ""}]` : ""}`);
  }
  L.push("", "FRESH transcript of the EDITED audio ±4 s (edited time):");
  for (const w of fresh.filter((w) => w.end > it.t - 4 && w.start < it.t + 4)) L.push(`  ${T(w.start)}–${T(w.end)}  ${w.type === "audio_event" ? "(event) " : ""}${w.text}`);
  L.push("", "Loudness (dBFS, 20 ms steps, original time; silence < −36; '|' marks a cut edge):");
  const row = [];
  for (let t = to - 1.5; t < to + 1.5; t += 0.02) {
    const edge = edges.some((e) => Math.abs(e.t - t) < 0.01) ? "|" : "";
    row.push(`${edge}${t.toFixed(2)}:${Math.round(lvl(t))}`);
  }
  for (let i = 0; i < row.length; i += 10) L.push("  " + row.slice(i, i + 10).join(" "));
  fs.writeFileSync(path.join(dir, "diag", `item-${String(n + 1).padStart(2, "0")}.txt`), L.join("\n") + "\n");
});

// the edited transcript as lines with both clocks
fs.mkdirSync(path.join(dir, "edited"), { recursive: true });
const words = fresh.filter((w) => w.type === "word" || w.type === "audio_event");
const lines = [];
let cur = null;
for (const w of words) {
  if (!cur || w.start - cur.end >= 0.6 || /[.!?؟]\s*$/.test(cur.ws.at(-1).text)) { cur = { start: w.start, end: w.end, ws: [] }; lines.push(cur); }
  cur.ws.push(w); cur.end = w.end;
}
const P = Number(partsArg), per = Math.ceil(lines.length / P);
for (let k = 0; k < P; k++) {
  const part = lines.slice(k * per, (k + 1) * per);
  const txt = part.map((l, i) => `L${k * per + i + 1} | edited ${T(l.start)} | original ${T(toOrig(l.start))} | ${l.ws.map((w) => w.text).join(" ")}`).join("\n");
  fs.writeFileSync(path.join(dir, "edited", `part-${k + 1}.txt`), txt + "\n");
}
console.log(`${items.length} diag files, ${lines.length} edited lines in ${P} parts`);
