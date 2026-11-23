// Poster Wall 3D · render every card as a short clip, so the wall's posters move (instead of the shipped stills).
//   node src/styles/poster-wall-3d/pipeline/render-cards.mjs [--entry src/index.ts] [--comp Style-Poster] [--ids minimal,retro]
// Writes public/styles/poster-wall-3d/clips/<id>.mp4 (6 s each, ~20 s to render one). Then set USE_CLIPS = true in your
// cards file. Your own posters: any composition that takes { id } (or drop your own mp4/jpg files there by id).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const entry = arg("entry", "src/index.ts");
const comp = arg("comp", "Style-Poster");
const ids = arg("ids", "minimal,maxi,future,vector,collage,retro,cyber,pop,glass,clay,pixel,editorial,y2k,swiss,surreal,boho,victorian,graffiti,aurora,hand").split(",");
const out = path.join("public", "styles", "poster-wall-3d", "clips");
fs.mkdirSync(out, { recursive: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
for (const id of ids) {
  const dst = path.join(out, `${id}.mp4`);
  if (fs.existsSync(dst)) {
    console.log(`skip ${id} (exists)`);
    continue;
  }
  const props = path.join(os.tmpdir(), `pw-props-${id}.json`); // a props file: inline JSON breaks in Windows shells
  fs.writeFileSync(props, JSON.stringify({ id }));
  console.log(`render ${id}…`);
  execFileSync(npx, ["remotion", "render", entry, comp, dst, `--props=${props}`, "--gl=angle", "--concurrency=2", "--crf=20", "--muted", "--timeout=240000", "--log=error"], { stdio: "inherit", shell: process.platform === "win32" });
}
console.log(`done → ${out}. Set USE_CLIPS = true in your cards file.`);
