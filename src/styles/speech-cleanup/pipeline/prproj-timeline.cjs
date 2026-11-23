// Speech Cleanup · step 0 — prints every clip on the sequences of a Premiere project (read-only; gives the numbers for
// xml-config.json: where the camera starts on the sequence, the screen's offset, scale): track, timeline start/end, source in/out, file.
// usage: node src/styles/speech-cleanup/pipeline/prproj-timeline.cjs <project.prproj | decompressed.xml>
const fs = require("fs");
const zlib = require("zlib");
const p = process.argv[2];
const raw = fs.readFileSync(p);
const xml = raw[0] === 0x1f ? zlib.gunzipSync(raw).toString("utf8") : raw.toString("utf8");
const TPS = 254016000000; // Premiere ticks per second

// every object is a flat child of <PremiereData>: index them by ObjectID / ObjectUID
const obj = {};
for (const m of xml.matchAll(/<(\w+) Object(?:U)?ID="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) obj[m[2]] = { type: m[1], body: m[3] };
const tag = (b, t) => (b.match(new RegExp(`<${t}>([^<]*)</${t}>`)) || [])[1];
const ref = (b, t) => (b.match(new RegExp(`<${t} Object(?:U)?Ref="([^"]+)"`)) || [])[1];
const sec = (ticks) => (ticks == null ? null : Number(ticks) / TPS);
const hms = (s) => (s == null ? "?" : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`);

const mediaPath = (srcId) => {
  const src = obj[srcId];
  if (!src) return "?";
  const media = obj[ref(src.body, "Media")];
  return media ? tag(media.body, "ActualMediaFilePath") || tag(media.body, "FilePath") : "?";
};

for (const [id, o] of Object.entries(obj)) {
  if (!/ClipTrack$/.test(o.type)) continue;
  const items = [...o.body.matchAll(/<TrackItem Index="\d+" ObjectRef="([^"]+)"/g)].map((m) => m[1]);
  const flags = ["IsMuted", "IsLocked", "IsSyncLocked"].map((f) => `${f}=${tag(o.body, f)}`).join(" ");
  console.log(`${o.type} ${id.slice(0, 8)} items=${items.length} ${flags}`);
  for (const it of items) {
    const ti = obj[it];
    if (!ti) continue;
    const start = sec(tag(ti.body, "Start") ?? 0), end = sec(tag(ti.body, "End"));
    const sub = obj[ref(ti.body, "SubClip")];
    const clip = sub && obj[ref(sub.body, "Clip")];
    const inP = clip && sec(tag(clip.body, "InPoint")), outP = clip && sec(tag(clip.body, "OutPoint"));
    const speed = clip && tag(clip.body, "PlaybackSpeed");
    const disabled = tag(ti.body, "Disabled") || tag(clip?.body || "", "Disabled");
    console.log(`   ${ti.type} seq ${hms(start)} → ${hms(end)} | src in ${hms(inP)} out ${hms(outP)} | speed ${speed ?? 1}${disabled ? " disabled=" + disabled : ""} | ${clip ? mediaPath(ref(clip.body, "Source")) : "?"}`);
  }
}
const seq = Object.values(obj).find((o) => o.type === "Sequence");
if (seq) console.log("sequence", tag(seq.body, "Name"));
for (const o of Object.values(obj)) if (/TrackGroup$/.test(o.type) && tag(o.body, "FrameRate")) console.log(o.type, "frame", tag(o.body, "FrameRate"), "ticks =", (TPS / Number(tag(o.body, "FrameRate"))).toFixed(3), "fps", "size", tag(o.body, "FrameRect") || "");
