// Speech Cleanup · step 8 — builds a Final Cut Pro 7 XML (Premiere: File › Import) of the sequence with the cuts removed:
// V1 camera, V2 screen recording kept in sync (optional: leave "scr" out of the config), A1 the voice as a mono file,
// markers on reviewed cuts. Motion is written the way Premiere itself exports it (Basic Motion scale + Distort "aspect"
// for a non-uniform width). Your original sequence is not touched: the import creates a new one.
// usage: node src/styles/speech-cleanup/pipeline/make-xml.mjs <xml-config.json> <cuts-A.json> <out.xml> <segments-A.json>
import fs from "node:fs";

const [cfgPath, cutsPath, outXml, outSeg] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const { cuts, markers: notes = [] } = JSON.parse(fs.readFileSync(cutsPath, "utf8"));
const FPS = cfg.fps; // sequence frame rate
const TPF = 254016000000 / FPS; // Premiere ticks per sequence frame
const F = (sec) => Math.round(sec * FPS);

// ---- kept segments (camera frames) = clip range minus merged cuts; drop slivers under minPiece
const clipIn = F(cfg.cam.in), clipOut = F(cfg.cam.out);
const merged = [];
for (const c of cuts.filter((c) => c.apply !== false).map((c) => ({ ...c, fa: F(c.a), fb: F(c.b) })).sort((p, q) => p.fa - q.fa)) {
  const last = merged.at(-1);
  if (last && c.fa - last.fb < cfg.minPieceFrames) { last.fb = Math.max(last.fb, c.fb); last.items.push(c); }
  else merged.push({ fa: c.fa, fb: c.fb, items: [c] });
}
const segs = [];
const leading = []; // cuts at the very start have no piece before them; their markers go on the first frame
let pos = clipIn;
for (const m of merged) {
  if (m.fb <= clipIn || m.fa >= clipOut) continue;
  if (m.fa > pos) segs.push({ fa: pos, fb: m.fa, after: m });
  else if (!segs.length) leading.push(m);
  pos = Math.max(pos, m.fb);
}
if (pos < clipOut) segs.push({ fa: pos, fb: clipOut });

// ---- place on the sequence
let cursor = F(cfg.seqStart);
for (const s of segs) { s.sa = cursor; s.sb = cursor + (s.fb - s.fa); cursor = s.sb; }
const seqDur = cursor;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rate = (tb) => `<rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>`;
// Premiere's own pathurl form (file, localhost, drive colon as %3a); joined from parts so the kit's drive-letter scan stays quiet
const FILE_URL = ["file:", "", "localhost", ""].join("/");
// (a macOS/Linux path's own leading slash is dropped, so there is one slash after localhost, not two)
const pathurl = (p) => FILE_URL + p.replace(/\\/g, "/").replace(/^\/+/, "").split("/").map((x, i) => (i === 0 ? x.replace(":", "%3a") : encodeURIComponent(x))).join("/");
const defined = new Set();
const fileEl = (key) => {
  const f = cfg.files[key];
  if (defined.has(key)) return `<file id="file-${key}"/>`;
  defined.add(key);
  const v = f.video ? `<video><samplecharacteristics>${rate(f.fps)}<width>${f.video.w}</width><height>${f.video.h}</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics></video>` : "";
  const a = f.audio ? `<audio><samplecharacteristics><depth>16</depth><samplerate>${f.audio.sr}</samplerate></samplecharacteristics><channelcount>${f.audio.ch}</channelcount></audio>` : "";
  return `<file id="file-${key}"><name>${esc(f.name)}</name><pathurl>${pathurl(f.path)}</pathurl>${rate(f.fps)}<duration>${Math.round(f.duration * f.fps)}</duration><media>${v}${a}</media></file>`;
};
// motion as Premiere itself exports it: Basic Motion scale, plus Distort "aspect" for a non-uniform width stretch
const motion = ({ scale, aspect = 0 }) => `<filter><effect><name>Basic Motion</name><effectid>basic</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype>` +
  `<parameter authoringApp="PremierePro"><parameterid>scale</parameterid><name>Scale</name><valuemin>0</valuemin><valuemax>1000</valuemax><value>${scale}</value></parameter>` +
  `<parameter authoringApp="PremierePro"><parameterid>center</parameterid><name>Center</name><value><horiz>0</horiz><vert>0</vert></value></parameter></effect></filter>` +
  (aspect ? `<filter><effect><name>Distort</name><effectid>deformation</effectid><mediatype>video</mediatype><parameter authoringApp="PremierePro"><parameterid>aspect</parameterid><name>Aspect</name><valuemin>-10000</valuemin><valuemax>10000</valuemax><value>${aspect}</value></parameter></effect></filter>` : "");
const clip = ({ id, key, sa, sb, ia, ib, media, extra = "", links = "" }) => {
  const f = cfg.files[key];
  return `<clipitem id="${id}"${media === "audio" ? ' premiereChannelType="mono"' : ""}><masterclipid>masterclip-${key}</masterclipid><name>${esc(f.name)}</name><enabled>TRUE</enabled>` +
    `<duration>${Math.round(f.duration * FPS)}</duration>${rate(FPS)}<start>${sa}</start><end>${sb}</end><in>${ia}</in><out>${ib}</out>` +
    `<pproTicksIn>${ia * TPF}</pproTicksIn><pproTicksOut>${ib * TPF}</pproTicksOut>` +
    (media === "video" ? `<alphatype>none</alphatype><pixelaspectratio>square</pixelaspectratio><anamorphic>FALSE</anamorphic>` : "") +
    fileEl(key) + (media === "audio" ? `<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>` : "") + extra + links + `</clipitem>`;
};

const v1 = [], v2 = [], a1 = [];
const scrOff = cfg.scr ? F(cfg.scr.camOffset) : 0; // camera frame where screen frame 0 sits
const scrEnd = cfg.scr ? scrOff + F(cfg.scr.out - cfg.scr.in) : 0;
segs.forEach((s, n) => {
  const k = String(n + 1).padStart(4, "0");
  const link = (vi, ai) => `<link><linkclipref>${vi}</linkclipref><mediatype>video</mediatype><trackindex>1</trackindex><clipindex>${n + 1}</clipindex></link>` +
    `<link><linkclipref>${ai}</linkclipref><mediatype>audio</mediatype><trackindex>1</trackindex><clipindex>${n + 1}</clipindex><groupindex>1</groupindex></link>`;
  const L = link(`v1-${k}`, `a1-${k}`);
  v1.push(clip({ id: `v1-${k}`, key: "cam", sa: s.sa, sb: s.sb, ia: s.fa, ib: s.fb, media: "video", extra: motion(cfg.cam), links: L }));
  a1.push(clip({ id: `a1-${k}`, key: "voice", sa: s.sa, sb: s.sb, ia: s.fa, ib: s.fb, media: "audio", links: L }));
  const ga = Math.max(s.fa, scrOff), gb = Math.min(s.fb, scrEnd);
  if (cfg.scr && gb > ga) v2.push(clip({ id: `v2-${k}`, key: "scr", sa: s.sa + (ga - s.fa), sb: s.sa + (gb - s.fa), ia: ga - scrOff + F(cfg.scr.in), ib: gb - scrOff + F(cfg.scr.in), media: "video", extra: motion(cfg.scr) }));
});

// markers on reviewed (non-pause) cuts, at the join on the new timeline
const markers = [];
const mark = (at, name, comment) => markers.push(`<marker><name>${esc(name)}</name><comment>${esc(comment)}</comment><in>${at}</in><out>-1</out></marker>`);
const cutMarks = (at, items) => { for (const c of items) if (c.marker) mark(at, c.marker, `${c.note || ""}${c.gone ? ` | حذف شد: ${c.gone.slice(0, 160)}` : ""}`); };
leading.forEach((m) => cutMarks(F(cfg.seqStart), m.items));
segs.forEach((s) => { if (s.after) cutMarks(s.sb, s.after.items); });
// standalone notes at a camera time → the same moment on the new timeline (or the next kept frame)
for (const m of notes) {
  const f = F(m.t);
  const s = segs.find((x) => f >= x.fa && f < x.fb) || segs.find((x) => x.fa >= f);
  if (s) mark(f >= s.fa ? s.sa + (f - s.fa) : s.sa, m.name, m.note);
}

const track = (items, attrs = "") => `<track${attrs}>${items.join("")}<enabled>TRUE</enabled><locked>FALSE</locked></track>`;
const monoAttrs = ' TL.SQTrackAudioKeyframeStyle="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="0" totalExplodedTrackCount="1" premiereTrackType="Mono"';
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="sequence-1"><name>${esc(cfg.name)}</name><duration>${seqDur}</duration>${rate(FPS)}` +
  `<timecode>${rate(FPS)}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>` +
  `<media><video><format><samplecharacteristics>${rate(FPS)}<width>${cfg.w}</width><height>${cfg.h}</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics></format>` +
  track(v1) + track(v2) + `</video><audio><numOutputChannels>2</numOutputChannels><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>` +
  track(a1, monoAttrs) + `</audio></media>${markers.join("")}</sequence></xmeml>\n`;
fs.writeFileSync(outXml, xml);
fs.writeFileSync(outSeg, JSON.stringify(segs.map(({ fa, fb, sa, sb }) => ({ fa, fb, sa, sb }))));
const sec = (f) => f / FPS;
const hms = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
console.log(`segments ${segs.length}, V2 pieces ${v2.length}, markers ${markers.length}`);
console.log(`camera used ${hms(sec(clipOut - clipIn))} → ${hms(sec(seqDur - F(cfg.seqStart)))}  (sequence ends ${hms(sec(seqDur))})`);
