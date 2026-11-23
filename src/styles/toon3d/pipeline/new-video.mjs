// Start a Toon3D film: copies the demo (src/styles/toon3d/demo) to src/<id>/ with its imports pointed at the style,
// writes src/<id>/Compositions.tsx (<COMP> + <COMP>-Look), and makes the film's working folder videos/<id>/
// (dlg/script.txt to fill in, build-audio.cjs = the demo's sound script, direction.md = the shot table template).
// Then add ONE line to src/Root.tsx (printed at the end) and replace the demo's story with yours.
// Usage: node src/styles/toon3d/pipeline/new-video.mjs <id> [--comp V07]     (id = folder name, e.g. v07)
import fs from "node:fs";
import path from "node:path";
import { parseArgs, die, ROOT, film } from "./lib.mjs";

const a = parseArgs();
const [id] = a._;
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) die("usage: node src/styles/toon3d/pipeline/new-video.mjs <id> [--comp V07]   (id: lower-case letters, digits, dashes)");
const COMP = String(a.comp ?? id.toUpperCase());
if (!/^[A-Za-z0-9-]+$/.test(COMP)) die("--comp: letters, digits, dashes");
const STYLE = path.join(ROOT, "src/styles/toon3d"), DEMO = path.join(STYLE, "demo"), DST = path.join(ROOT, "src", id);
if (fs.existsSync(DST)) die(`src/${id} exists`);
fs.mkdirSync(DST, { recursive: true });
for (const f of fs.readdirSync(DEMO)) {
  let s = fs.readFileSync(path.join(DEMO, f), "utf8");
  if (/\.(ts|tsx)$/.test(f)) s = s.replaceAll('"../lib/', '"../styles/toon3d/lib/');
  if (f === "Video.tsx") s = s.replace('name: "toon3d-demo"', `name: "${id}"`);
  fs.writeFileSync(path.join(DST, f), s);
}
fs.writeFileSync(path.join(DST, "Compositions.tsx"), `// ${COMP}: the film (silent; the mix is muxed by tools/finalize.mjs) and ${COMP}-Look (stills: props {"times":[...]}).
import React from "react";
import { Composition } from "remotion";
import { DemoFilm, DemoFilmLook, DEMO_FRAMES, DEMO_FPS, DEMO_LOOK, demoLookMetadata } from "./Video";

export const Compositions: React.FC = () => (
  <>
    <Composition id="${COMP}" component={DemoFilm} durationInFrames={DEMO_FRAMES} fps={DEMO_FPS} width={1080} height={1920} />
    <Composition id="${COMP}-Look" component={DemoFilmLook} durationInFrames={DEMO_LOOK.length} fps={DEMO_FPS} width={1080} height={1920}
      defaultProps={{ times: DEMO_LOOK }} calculateMetadata={demoLookMetadata} />
  </>
);
`);
// the film's working folder
const F = film(id);
fs.mkdirSync(path.join(F, "dlg"), { recursive: true });
for (const d of ["music", "audio", "final"]) fs.mkdirSync(path.join(F, d), { recursive: true });
const script = path.join(F, "dlg/script.txt");
if (!fs.existsSync(script)) fs.copyFileSync(path.join(DEMO, "script.txt"), script);
const ba = path.join(F, "build-audio.cjs");
if (!fs.existsSync(ba)) fs.writeFileSync(ba, fs.readFileSync(path.join(STYLE, "pipeline/build-audio.cjs"), "utf8").replace('const ID = process.argv[2] ?? "demo";', `const ID = process.argv[2] ?? "${id}";`));
const dir = path.join(F, "direction.md");
if (!fs.existsSync(dir)) fs.copyFileSync(path.join(STYLE, "pipeline/direction.md"), dir);
console.log(`src/${id}/  (story.ts, timing.ts, vo.json = sample timing until your voice is built, Video.tsx, Compositions.tsx)`);
console.log(`videos/${id}/  (dlg/script.txt, build-audio.cjs, direction.md)`);
console.log(`\nadd to src/Root.tsx:\n  import { Compositions as ${COMP.replace(/-/g, "_")}Comps } from "./${id}/Compositions";\n  ...\n  <${COMP.replace(/-/g, "_")}Comps />`);
console.log(`\nthen: node src/styles/toon3d/pipeline/plan.mjs ${id} ${COMP} --mids`);
