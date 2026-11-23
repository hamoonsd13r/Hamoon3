// Painted Story · the image prompt pack: ONE PDF with the instructions, the master reference (character sheet, or a
// "ref combo" = character on top + the main location below), style examples, the palette, the shared designs and every
// prompt in order — each prompt already carries the style and the consistency sentences, so it also works pasted alone.
// The user hands the PDF (+ the reference image) to ChatGPT / the Gemini app and drops the images into one folder.
//
//   node make-pack.mjs <prompts.json> <out.pdf> [--ref ref.jpg] [--examples a.jpg,b.jpg] [--ids s001,s002,...]
//
// prompts.json (see prompts.example.json):
//   { "title": "…", "format": "16:9" | "2:3",
//     "style": "Style: …",                       added to every prompt
//     "palette": [["#DCE3DC", "pale sage", "walls, sky"], …],
//     "character": { "A": "THE HERO = … OUTFIT A …" },   prompts with "char": "A" get it
//     "designs": { "RESCUER": "RESCUER DESIGN: …" },      added to every prompt that names the key
//     "rules": [{ "if": "night|dark", "add": "Keep it readable: …" }],  regex on the prompt → extra sentence
//     "shots": [{ "id": "s001", "kind": "still|plate|cutout|insert|edit|sheet", "char": "A", "edit": "S018", "for": "line 1", "p": "…" }] }
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const [inFile, outPdf] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!inFile || !outPdf) throw new Error("usage: node make-pack.mjs <prompts.json> <out.pdf> [--ref ref.jpg] [--examples a.jpg,b.jpg] [--ids a,b]");
const P = JSON.parse(fs.readFileSync(inFile, "utf8"));
const ids = opt("--ids")?.split(",").filter(Boolean);
const shots = ids ? ids.map((id) => P.shots.find((s) => s.id === id) ?? (() => { throw new Error(`no shot ${id}`); })()) : P.shots;
const REF = opt("--ref"), EX = (opt("--examples") ?? "").split(",").filter(Boolean);

const FORMAT = {
  "16:9": { still: "Format: landscape 16:9, full-bleed, edge to edge, no border, no white margins.", insert: "Format: landscape 16:9 close-up, full-bleed." },
  "2:3": { plate: "Format: PORTRAIT 2:3 (1024×1536), full-bleed, no border. Keep everything important inside the central 9:16 band — the left and right edges will be cropped.", still: "Format: PORTRAIT 2:3, full-bleed." },
  any: { cutout: "Format: the subject alone on a TRANSPARENT background (PNG), the whole subject inside the frame, no ground shadow. If transparency is impossible, use a plain flat pure white background.", sheet: "Format: LANDSCAPE 3:2 design sheet." },
};
const fmt = (kind) => FORMAT[P.format ?? "16:9"]?.[kind] ?? FORMAT.any[kind] ?? FORMAT[P.format ?? "16:9"]?.still ?? "";
const full = (s) => {
  const extra = [];
  if (s.char && P.character?.[s.char]) extra.push(P.character[s.char]);
  for (const [k, v] of Object.entries(P.designs ?? {})) if (s.p.includes(k)) extra.push(v);
  for (const r of P.rules ?? []) if (new RegExp(r.if, "i").test(s.p)) extra.push(r.add);
  if (s.kind === "edit") extra.push(`Edit the ${s.edit ?? "previous"} image you made above: keep the framing, place, light and every character identical; change only what this prompt says.`);
  return [s.p, ...extra, P.style ?? "", fmt(s.kind), "No text, letters, numbers, logos, sound-effect words or speech bubbles anywhere (papers and screens show only abstract scribbles)."].filter(Boolean).join(" ");
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const b64 = (f) => `data:image/${/\.png$/i.test(f) ? "png" : "jpeg"};base64,${fs.readFileSync(f).toString("base64")}`;

const rows = shots.map((s, i) => `<div class="shot"><div class="num">${i + 1}</div><div><div class="id">${esc(s.id)} <span class="k">${esc(s.kind ?? "")}${s.for ? " — " + esc(s.for) : ""}</span></div><div class="p">${esc(full(s))}</div></div></div>`).join("\n");
const pal = (P.palette ?? []).map(([h, n, u]) => `<div class="sw"><div class="chip" style="background:${h}"></div><div><b>${esc(n)}</b> ${h}<br><span>${esc(u ?? "")}</span></div></div>`).join("");
const designs = Object.values(P.designs ?? {}).map((d) => `<div class="design">${esc(d)}</div>`).join("");
const first = shots[0]?.id ?? "S01";

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 14mm; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1d1f24; font-size: 11pt; line-height: 1.45; }
h1 { font-size: 19pt; margin: 0 0 4px; } h2 { font-size: 13pt; margin: 16px 0 6px; }
.fa { direction: rtl; font-family: Tahoma, "Segoe UI", sans-serif; background: #f3efe6; border-radius: 8px; padding: 9px 13px; margin: 8px 0 12px; line-height: 1.9; }
.box { border: 2px solid #1d1f24; border-radius: 8px; padding: 10px 14px; margin: 10px 0; } ol li { margin: 4px 0; }
.ref { width: 100%; border-radius: 6px; border: 1px solid #ccc; }
.ex { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } .ex img { width: 100%; border-radius: 4px; }
.pal { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } .sw { display: flex; gap: 10px; align-items: center; font-size: 10pt; } .sw span { color: #666; }
.chip { width: 44px; height: 44px; border-radius: 6px; border: 1px solid #ccc; flex: none; }
.design { background: #eef0f2; border-radius: 8px; padding: 9px 13px; margin: 8px 0; font-size: 10.5pt; }
.shot { display: grid; grid-template-columns: 32px 1fr; gap: 10px; padding: 9px 0; border-bottom: 1px solid #ddd; page-break-inside: avoid; }
.num { font-weight: 700; font-size: 14pt; color: #c2541d; } .id { font-weight: 700; } .k { font-weight: 400; color: #666; font-size: 9.5pt; } .p { margin-top: 3px; font-size: 10.5pt; }
.pb { page-break-before: always; }
</style></head><body>
<h1>${esc(P.title ?? "Image pack")} · ${shots.length} images</h1>
<div class="fa">این فایل رو به ChatGPT (یا اپ Gemini) بده${REF ? " و عکس مرجع رو هم کنارش ضمیمه کن" : ""} و بنویس: «این فایل رو بخون و عکس‌ها رو یکی‌یکی و به ترتیب بساز؛ هر پیام فقط یک عکس، دقیقاً هم‌سبکِ مرجع». اگه وسط کار قیافه یا سبک عوض شد، همون پرامپت رو دوباره بده و بگو «دقیقاً مثل مرجع». اگه شد اسم هر فایل رو همون ID بذار (مثلاً ${esc(first)}.png)؛ وگرنه فقط ترتیب رو حفظ کن.</div>
<div class="box"><b>Instructions</b>
<ol>
<li>These are ${shots.length} images for ONE narrated animated story. Make them <b>one at a time, in the order below — exactly one image per reply</b>, never a grid or a collage. After each image write only its ID (for example "${esc(first)}").</li>
${REF ? "<li><b>The reference image below (also attached) is the master reference.</b> Every image must look like a frame of the same film: same style, palette, light — and the main character must be the SAME person every time.</li>" : ""}
<li>${esc(P.style ?? "")}</li>
<li><b>Never</b> any text, letters, numbers, logos or speech bubbles — we add the text later in code.</li>
<li>The main character appears only when a prompt mentions them. Draw a normal camera view (not a cross-section or a split panel) unless the prompt asks for one.</li>
</ol></div>
${REF ? `<h2>Master reference</h2><img class="ref" src="${b64(REF)}">` : ""}
${pal ? `<h2>Palette</h2><div class="pal">${pal}</div>` : ""}
${designs ? `<h2>Shared designs</h2>${designs}` : ""}
${EX.length ? `<h2 class="pb">Style examples (match this look)</h2><div class="ex">${EX.map((f) => `<img src="${b64(f)}">`).join("")}</div>` : ""}
<h2 class="pb">The ${shots.length} images, in order</h2>
${rows}
</body></html>`;

const htmlPath = outPdf.replace(/\.pdf$/i, ".html");
fs.mkdirSync(path.dirname(path.resolve(htmlPath)), { recursive: true });
fs.writeFileSync(htmlPath, html);
const WIN = process.platform === "win32", MAC = process.platform === "darwin";
const chrome = [process.env.REMOTION_CHROME, process.env.CHROME,
  ...(WIN ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => path.join(d, "Google/Chrome/Application/chrome.exe"))
    : MAC ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"])].find((p) => p && fs.existsSync(p));
if (!chrome) {
  console.log(`no Chrome found — open ${htmlPath} and print it to PDF yourself`);
} else {
  execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files", `--print-to-pdf=${path.resolve(outPdf)}`, pathToFileURL(path.resolve(htmlPath)).href], { stdio: "ignore" });
  console.log(outPdf, (fs.statSync(outPdf).size / 1e6).toFixed(2) + " MB", shots.length + " images");
}
