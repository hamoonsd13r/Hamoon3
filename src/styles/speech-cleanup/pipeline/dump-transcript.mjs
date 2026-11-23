// Speech Cleanup · step 5 — writes the transcript as numbered utterances with camera timecodes, for reading and marking edits.
// An utterance breaks at a pause ≥ 0.6 s or a sentence end. Audio events stay inline in [brackets].
// usage: node src/styles/speech-cleanup/pipeline/dump-transcript.mjs <stt/words.json> <utterances.txt>   (also writes utterances.json)
import fs from "node:fs";

const [wordsPath, out] = process.argv.slice(2);
const toks = JSON.parse(fs.readFileSync(wordsPath, "utf8")).filter((w) => w.type !== "spacing").sort((a, b) => a.start - b.start);
const t = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const utts = [];
let cur = null;
for (const w of toks) {
  const gap = cur ? w.start - cur.end : 0;
  if (!cur || gap >= 0.6 || /[.!?؟]\s*$/.test(cur.words.at(-1).text)) {
    cur = { start: w.start, end: w.end, gap, words: [] };
    utts.push(cur);
  }
  cur.words.push(w);
  cur.end = w.end;
}
const lines = utts.map((u, i) => `U${i + 1} ${t(u.start)}${u.gap >= 2 ? ` (+${u.gap.toFixed(0)}s)` : ""} ${u.words.map((w) => w.text).join(" ")}`);
fs.writeFileSync(out, lines.join("\n") + "\n");
fs.writeFileSync(out.replace(/\.txt$/, ".json"), JSON.stringify(utts.map((u, i) => ({ id: i + 1, start: u.start, end: u.end, first: toks.indexOf(u.words[0]), last: toks.indexOf(u.words.at(-1)) }))));
console.log(utts.length, "utterances →", out);
