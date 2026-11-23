// Speech Cleanup · step 6 — prints cuts for human review: every non-pause cut with context, and long pauses with screen activity.
// usage: node src/styles/speech-cleanup/pipeline/review.mjs <cuts-auto.json> <screen-activity.txt|-> <screenCamOffset> [minPause=2.5]
import fs from "node:fs";

const [cutsPath, actPath, offArg, minPauseArg = "2.5"] = process.argv.slice(2);
const { cuts } = JSON.parse(fs.readFileSync(cutsPath, "utf8"));
const OFF = Number(offArg);
const act = [];
if (actPath !== "-") for (const m of fs.readFileSync(actPath, "utf8").matchAll(/YAVG=([\d.]+)/g)) act.push(Number(m[1])); // 5 per second, screen clock
const activity = (a, b) => {
  const k0 = Math.floor((a - OFF) * 5), k1 = Math.ceil((b - OFF) * 5);
  if (k1 <= 0 || k0 >= act.length) return null;
  const xs = act.slice(Math.max(0, k0), Math.min(act.length, k1));
  return { max: Math.max(...xs), moving: xs.filter((x) => x > 0.5).length / xs.length };
};
const t = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

for (const c of cuts) {
  if (c.kind === "pause") continue;
  console.log(`#${c.id} ${c.kind}${c.sure ? "" : " (?)"} ${t(c.a)}–${t(c.b)} ${(c.b - c.a).toFixed(2)}s ${c.why || ""}`);
  console.log(`   …${c.before} ⟦${c.gone}⟧ ${c.after}…`);
}
console.log("\n--- long pauses (cam time, s, screen moving share, max change)");
for (const c of cuts.filter((c) => (c.kind === "pause" || c.kind === "filler") && c.b - c.a >= Number(minPauseArg))) {
  const s = activity(c.a, c.b);
  console.log(`#${c.id} ${t(c.a)} ${(c.b - c.a).toFixed(1)}s ${s ? `screen ${(s.moving * 100).toFixed(0)}% max ${s.max.toFixed(1)}` : "camera only"}  …${c.before} ⟦${c.gone}⟧ ${c.after}…`);
}
const sorted = [...act].sort((a, b) => a - b);
console.log(`\nscreen change per frame: p50 ${sorted[Math.floor(sorted.length * 0.5)]} p90 ${sorted[Math.floor(sorted.length * 0.9)]} p99 ${sorted[Math.floor(sorted.length * 0.99)]}`);
