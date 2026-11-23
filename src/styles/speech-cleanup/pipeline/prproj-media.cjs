// Speech Cleanup · step 0 — lists the media files and sequences a Premiere project (.prproj = gzipped XML) refers to. Read-only.
// usage: node src/styles/speech-cleanup/pipeline/prproj-media.cjs <project.prproj>
const fs = require("fs");
const zlib = require("zlib");
const p = process.argv[2];
const st = fs.statSync(p);
const xml = zlib.gunzipSync(fs.readFileSync(p)).toString("utf8");
const uniq = (a) => [...new Set(a)];
const grab = (re) => uniq([...xml.matchAll(re)].map((m) => m[1]));
console.log("project", (st.size / 1024).toFixed(0) + " KB", "saved", st.mtime.toISOString());
console.log("media", JSON.stringify(grab(/<ActualMediaFilePath>([^<]*)<\/ActualMediaFilePath>/g), null, 1));
console.log("other paths", JSON.stringify(grab(/<FilePath>([^<]*)<\/FilePath>/g), null, 1));
// sequences: a <Sequence ...> block carries its own <Name>
const seqs = [...xml.matchAll(/<Sequence [^>]*>[\s\S]*?<Name>([^<]*)<\/Name>/g)].map((m) => m[1]);
console.log("sequences", JSON.stringify(uniq(seqs)));
