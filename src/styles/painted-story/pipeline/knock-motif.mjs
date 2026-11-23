// Painted Story · the knock motif, built from ONE clean knock. Generated "three knocks" come back irregular (4–10 hits,
// uneven), so the motif is assembled: even spacing, tiny level changes between hits, and variants for the story —
// through wood, through a radio, a two-knock "no", and a slow dark one through the floor. motif.json lists each
// variant's hit offsets; the audio build turns them into knocks.json so every hit jolts the picture exactly on its sound.
//
//   node knock-motif.mjs <one-knock.wav> <outDir> [--gap 0.95]
//   → k1.wav · k2.wav (two hits, half gap: "no") · k3_wood.wav · k3_radio.wav · k3_floor.wav (×0.72 tempo, lower, darker) · motif.json
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const [IN, OUT] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--gap");
if (!IN || !OUT) throw new Error("usage: node knock-motif.mjs <one-knock.wav> <outDir> [--gap 0.95]");
const gi = args.indexOf("--gap");
const GAP = gi >= 0 ? +args[gi + 1] : 0.95;
fs.mkdirSync(OUT, { recursive: true });

// hits: [offset s, gain] · post: extra filter on the sum
const V = {
  k1: { hits: [[0, 1]], post: "" },
  k2: { hits: [[0, 1], [GAP * 0.49, 0.9]], post: "" },
  k3_wood: { hits: [[0, 0.95], [GAP, 1], [GAP * 2, 0.9]], post: "" },
  k3_radio: { hits: [[0, 0.95], [GAP, 1], [GAP * 2, 0.9]], post: ",highpass=f=300,lowpass=f=3200,equalizer=f=1400:t=q:w=1:g=4" },
  k3_floor: { hits: [[0, 1], [GAP / 0.72, 0.95], [(2 * GAP) / 0.72, 0.9]], pre: "asetrate=48000*0.85,aresample=48000,", post: ",lowpass=f=2000" },
};
const motif = {};
for (const [name, v] of Object.entries(V)) {
  const n = v.hits.length;
  const parts = [`[0:a]aresample=48000,${v.pre ?? ""}asplit=${n}${v.hits.map((_, i) => `[h${i}]`).join("")}`];
  v.hits.forEach(([o, g], i) => parts.push(`[h${i}]volume=${g},adelay=${Math.round(o * 1000)}:all=1[d${i}]`));
  parts.push(`${v.hits.map((_, i) => `[d${i}]`).join("")}amix=inputs=${n}:normalize=0:duration=longest${v.post}[out]`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", IN, "-filter_complex", parts.join(";"), "-map", "[out]", "-ac", "2", "-ar", "48000", path.join(OUT, `${name}.wav`)]);
  motif[name] = v.hits.map(([o]) => +o.toFixed(3));
}
fs.writeFileSync(path.join(OUT, "motif.json"), JSON.stringify(motif, null, 1));
console.log("→", OUT, JSON.stringify(motif));
