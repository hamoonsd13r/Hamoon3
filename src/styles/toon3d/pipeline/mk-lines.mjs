// Narration script -> the voice pipeline's input (dlg/lines.json + dlg/voices.json, the format of the kit's
// tools/doc-voices.mjs). One sentence per line in videos/<id>/dlg/script.txt:
//   [storytelling, intrigued] وسطِ طوفان، چراغِ آشپزخونه‌ی کشتی دیوونه‌وار تاب می‌خوره.   | 0.2
//   [tags] steer the delivery (not spoken); "| gap" = pause after the line (s, default 0.15); # = comment
// The user's text goes in word for word (only typos / half-space fixes, and tell the user which).
// voices.json is written only if missing, for the voice you pass (--voice): eleven_v4, 4 takes, stability 0.36,
// similarity 0.8, style 0.42 (the settings of the accepted films). Send the user 3-5 voice samples first.
// Usage: node src/styles/toon3d/pipeline/mk-lines.mjs <id> [--voice <id>] [--takes 4] [--stability 0.36] [--style 0.42] [--force-voices]
import fs from "node:fs";
import { parseArgs, die, film } from "./lib.mjs";

const a = parseArgs();
const [slug] = a._;
if (!slug) die("usage: node src/styles/toon3d/pipeline/mk-lines.mjs <id> [--voice id] [--takes 4] [--stability 0.36] [--style 0.42] [--force-voices]");
const dir = film(slug) + "/dlg", src = dir + "/script.txt";
if (!fs.existsSync(src)) die(`write ${src} first (one sentence per line, "[tags] text | gap")`);
const L = [];
for (const raw of fs.readFileSync(src, "utf8").split(/\r?\n/)) {
  const s = raw.trim();
  if (!s || s.startsWith("#")) continue;
  const m = s.match(/^(\[[^\]]*\])?\s*(.*?)\s*(?:\|\s*([\d.]+))?$/);
  const tag = m[1] ?? "", text = m[2], gap = m[3] ? Number(m[3]) : 0.15;
  const check = text.replace(/[«»"،؛,.!?؟:]/g, " ").replace(/‌/g, "").replace(/\s+/g, " ").trim();
  L.push({ n: L.length + 1, sp: "N", fa: (tag ? tag + " " : "") + text, check, gap });
}
fs.writeFileSync(dir + "/lines.json", JSON.stringify(L, null, 1));
const vf = dir + "/voices.json";
if (!fs.existsSync(vf) || a["force-voices"]) {
  if (!a.voice) die("voices.json is missing: pass --voice <ElevenLabs voice id> (cast first: 3-5 samples, the user picks)");
  fs.writeFileSync(vf, JSON.stringify({ N: a.voice, model: "eleven_v4", takes: Number(a.takes ?? 4), lang: "fa",
    settings: { N: { stability: Number(a.stability ?? 0.36), similarity_boost: 0.8, style: Number(a.style ?? 0.42) } } }, null, 1));
}
console.log(`${L.length} lines -> ${dir}/lines.json` + (fs.existsSync(vf) ? `, voices ${vf}` : ""));
