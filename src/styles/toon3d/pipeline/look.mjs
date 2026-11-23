// Stills of a film at chosen times, labelled and tiled into one sheet (the first check after every change).
// Usage: node src/styles/toon3d/pipeline/look.mjs <id> <Comp> <name> <t1> [t2 ...] [--scale 0.4] [--cols 6] [--png] [--post '{"ink":false}'] [--rebundle]
//   times may be ranges a:b:step (e.g. 10:14:0.5). Writes videos/<id>/look/<name>/element-NN.jpeg + sheet.jpg.
//   The Look composition is <Comp>-Look (frame i renders the film at times[i]); the bundle is rebuilt when sources changed.
import { parseArgs, die, film, bundle, lookStills, sheet, lookOf } from "./lib.mjs";

const a = parseArgs();
const [slug, comp, name, ...ts] = a._;
if (!slug || !comp || !name || !ts.length) die("usage: node src/styles/toon3d/pipeline/look.mjs <id> <Comp> <name> <t1> [t2 ...] [--scale 0.4] [--cols 6] [--png] [--post json] [--rebundle]");
const times = ts.flatMap((s) => {
  const p = s.split(":").map(Number);
  if (p.length === 1) return [p[0]];
  const out = []; for (let t = p[0]; t <= p[1] + 1e-9; t += p[2] ?? 1) out.push(Math.round(t * 1000) / 1000);
  return out;
});
const dir = `${film(slug)}/look/${name}`;
const b = bundle({ force: !!a.rebundle });
const props = { times, ...(a.post ? { post: JSON.parse(a.post) } : {}) };
console.log(`rendering ${times.length} stills of ${comp}Look ...`);
const { files } = lookStills(b, lookOf(comp), dir, props, { scale: Number(a.scale ?? 0.4), png: !!a.png });
const out = sheet(files, times.map((t) => `t=${t.toFixed(2)}  f${Math.round(t * 30)}`), `${dir}/sheet.jpg`, { cols: Number(a.cols ?? 6) });
console.log(out);
