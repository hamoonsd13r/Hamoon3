// Talk Cutout · the word clock from a speech-to-text JSON (ElevenLabs Scribe: tools/eleven-stt.mjs <voice> stt.json fas)
// when you have no exact script (with a script, use tools/eleven-align.mjs — same output). Sentences (si) by MEANING:
// give the start time of each sentence (--starts), or split at . ؟ ! (--punct). Scribe marks broken words with «--»
// and breaths as [نفس]: those are dropped from the clock (they stay in her voice: her words are never edited).
// Brand names Scribe mishears: fix the text in the JSON before (a short second pass with language auto often helps).
// usage: node words-from-stt.mjs <stt.json> <out words.json> (--starts 0,4.56,10.38 | --punct)
import fs from "node:fs";

const [inp, out, mode, list] = process.argv.slice(2);
if (!out) throw new Error("usage: node words-from-stt.mjs <stt.json> <out words.json> (--starts a,b,c | --punct)");
const stt = JSON.parse(fs.readFileSync(inp, "utf8"));
const words = (stt.words ?? [])
  .filter((w) => (w.type ?? "word") === "word" && !/--$/.test(w.text) && !/^\[.*\]$/.test(w.text))
  .map((w) => ({ w: w.text.trim(), s: +(+w.start).toFixed(3), e: +(+w.end).toFixed(3) }));
if (mode === "--starts") {
  const st = list.split(",").map(Number);
  for (const w of words) w.si = st.filter((s) => w.s >= s - 0.01).length - 1;
} else {
  let si = 0;
  for (const w of words) {
    w.si = si;
    if (/[.؟?!]$/.test(w.w)) si++;
  }
}
const wi = {};
for (const w of words) w.wi = (wi[w.si] = (wi[w.si] ?? -1) + 1);
fs.writeFileSync(out, JSON.stringify(words.map(({ si, wi, w, s, e }) => ({ si, wi, w, s, e }))));
const by = {};
for (const w of words) (by[w.si] ??= []).push(w);
for (const [si, ws] of Object.entries(by)) console.log(si, ws[0].s.toFixed(2), "→", ws[ws.length - 1].e.toFixed(2), "|", ws.map((x) => x.w).join(" "));
console.log(words.length, "words → ", out);
