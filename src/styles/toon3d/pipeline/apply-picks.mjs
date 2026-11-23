// Write the chosen take of every line into dlg/lines.json ("take"), from dlg/picks.json ({ "<line>": <take> }).
// picks.json comes from pipeline/expr.cjs (the liveliest take among those the STT check heard right); edit it by
// hand after listening, then run this again. doc-build-vo.mjs uses `take` when it builds the narration.
// Usage: node src/styles/toon3d/pipeline/apply-picks.mjs <id>
import fs from "node:fs";
import { parseArgs, die, film } from "./lib.mjs";

const [slug] = parseArgs()._;
if (!slug) die("usage: node src/styles/toon3d/pipeline/apply-picks.mjs <id>");
const dir = film(slug) + "/dlg";
const P = JSON.parse(fs.readFileSync(dir + "/picks.json", "utf8")), L = JSON.parse(fs.readFileSync(dir + "/lines.json", "utf8"));
for (const l of L) if (P[l.n]) l.take = P[l.n];
fs.writeFileSync(dir + "/lines.json", JSON.stringify(L, null, 1));
console.log("takes:", L.map((l) => `${l.n}:${l.take ?? "-"}`).join(" "));
