// Talk Page · step 3 — read the Scribe transcript of the talk as phrases with a time on every word, for writing the
// beats (Head `at`/`hl`/`ul` times, zone a/b, element cues). Also writes words.json ([{w, s, e, who?}]) for code.
// Transcribe first (audio only is sent):  node --env-file=.env tools/eleven-stt.mjs <talk.mov|wav> work/stt.json fas
// usage: node src/styles/talk-page/pipeline/words.cjs work/stt.json work/words.txt [src/v01/words.json]
// words.txt line = "start–end | word@time word@time …", a new line after a pause > 0.35 s; [events] in brackets.
// Scribe quirks: brand and English words come back phonetic (check them by ear or a second pass with lang "eng" on
// that piece); a voice from a phone speaker gets its own speaker id → `who` in words.json (speaker 0 = "me").
const fs = require("fs");
const [inp, txt, json] = process.argv.slice(2);
if (!inp || !txt) {
  console.log("usage: node words.cjs <stt.json> <words.txt> [words.json]");
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(inp, "utf8"));
const w = j.words.filter((x) => x.type === "word" || x.type === "audio_event");
const out = [];
let line = [];
let ls = null;
let prevEnd = 0;
for (const x of w) {
  if (line.length && x.start - prevEnd > 0.35) {
    out.push(`${ls.toFixed(2)}–${prevEnd.toFixed(2)} | ${line.join(" ")}`);
    line = [];
  }
  if (!line.length) ls = x.start;
  line.push(x.type === "audio_event" ? `[${x.text}]` : `${x.text}@${x.start.toFixed(2)}`);
  prevEnd = x.end;
}
if (line.length) out.push(`${ls.toFixed(2)}–${prevEnd.toFixed(2)} | ${line.join(" ")}`);
fs.writeFileSync(txt, out.join("\n") + "\n");
if (json) {
  const ids = [...new Set(j.words.filter((x) => x.type === "word").map((x) => x.speaker_id))];
  const me = ids[0];
  const rows = j.words
    .filter((x) => x.type === "word")
    .map((x) => {
      const r = { w: x.text, s: +x.start.toFixed(2), e: +x.end.toFixed(2) };
      if (x.speaker_id && x.speaker_id !== me) r.who = x.speaker_id;
      return r;
    });
  fs.writeFileSync(json, "[\n" + rows.map((r) => " " + JSON.stringify(r)).join(",\n") + "\n]\n");
}
console.log(`${out.length} phrases → ${txt}${json ? ` · words → ${json}` : ""}`);
console.log(j.text);
