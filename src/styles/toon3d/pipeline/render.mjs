// Render a film (or a frame range) to a silent MP4 with the kit's settings (ANGLE, long timeout, CRF 17).
// Usage: node src/styles/toon3d/pipeline/render.mjs <id> <Comp> <name> [--frames a-b] [--concurrency 3] [--crf 17] [--scale 1] [--rebundle]
// Out:   videos/<id>/render/<name>.mp4 ; prints the frame count and size. Sound is added later (master.mjs, then the kit's tools/finalize.mjs).
// Fixing a few shots after a full render: render only their frames (--frames a-b, name seg-xx) and splice them in with
// splice.mjs instead of rendering the whole film again.
import fs from "node:fs";
import { parseArgs, die, film, bundle, remotion, frames, mb } from "./lib.mjs";

const a = parseArgs();
const [slug, comp, name] = a._;
if (!slug || !comp || !name) die("usage: node src/styles/toon3d/pipeline/render.mjs <id> <Comp> <name> [--frames a-b] [--concurrency 3] [--crf 17] [--scale 1]");
const b = bundle({ force: !!a.rebundle });
fs.mkdirSync(film(slug) + "/render", { recursive: true });
const out = `${film(slug)}/render/${name}.mp4`;
const t0 = Date.now();
remotion(["render", b, comp, out, "--codec=h264", `--crf=${a.crf ?? 17}`, "--gl=angle", `--concurrency=${a.concurrency ?? 3}`, "--timeout=240000", "--muted",
  ...(a.frames ? [`--frames=${a.frames}`] : []), ...(a.scale ? [`--scale=${a.scale}`] : [])]);
console.log(`${out}: ${frames(out)} frames, ${mb(out)}, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
