// Speech Cleanup · step 7 — turns the hand-written edit list into timed cuts and merges them with the automatic ones.
//  - edits name utterances (from dump-transcript) and the exact phrase to remove; edges go into the silence
//    just before the first removed word and just before the next kept word (soft onsets kept whole)
//  - automatic pauses are kept where the screen is busy (a video playing, scrolling); long silent screen work
//    keeps its last second so the result is seen
//  - silence after the last word is trimmed
//  - every join keeps a natural pause (sentence end 0.45 s, comma 0.3 s, mid-sentence 0.15 s), taken only from the
//    silence inside the cut, never by handing back a removed word
// usage: node src/styles/speech-cleanup/pipeline/build-cuts.mjs <dir> <variant A|B>
//   dir holds stt/words.json, utterances.json, env10ms.f32, cuts-auto.json, edits.json, xml-config.json and, when the
//   edit has a screen recording, screen-activity.txt (screen-activity.sh) → cuts-<variant>.json
import fs from "node:fs";
import path from "node:path";

const [dir, variant] = process.argv.slice(2);
const J = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const cfg = J("xml-config.json");
const FPS = cfg.fps, OFF = cfg.scr?.camOffset ?? 0, CLIP_END = cfg.cam.out;
const toks = J("stt/words.json").filter((w) => w.type !== "spacing").sort((a, b) => a.start - b.start);
const utts = J("utterances.json");
const auto = J("cuts-auto.json").cuts;
const edits = J("edits.json");
const eb = fs.readFileSync(path.join(dir, "env10ms.f32"));
const env = new Float32Array(eb.buffer, eb.byteOffset, eb.length / 4);
const sorted = Float32Array.from(env).sort();
const SIL = sorted[Math.floor(sorted.length * 0.1)] + 8;
const lvl = (t) => env[Math.max(0, Math.min(env.length - 1, Math.floor(t * 100)))];
const quiet = (t) => { for (let x = t - 0.02; x < t + 0.02; x += 0.01) if (lvl(x) >= SIL) return false; return true; };
const snap = (t) => Math.round(t * FPS) / FPS;
const snapQuiet = (t, lo, hi) => {
  for (const f of [snap(t), Math.floor(t * FPS) / FPS, Math.ceil(t * FPS) / FPS]) if (f >= lo && f <= hi && quiet(f)) return f;
  return snap(t);
};
const norm = (s) => s.normalize("NFC").replace(/[ً-ٰٟـ]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک")
  .replace(/[‌‎‏]/g, "").replace(/[.,،؛;:!?؟«»"'()\[\]…\-—–]/g, "").toLowerCase().trim();

// cut point in the silence right before token i. side "start": a cut begins here, so the word before is kept
// and must stay whole; side "end": a cut ends here, so token i is kept and its onset must stay whole.
function edgeBefore(i, side) {
  if (i >= toks.length) return CLIP_END;
  const T = toks[i], lo = i > 0 ? toks[i - 1].end : 0;
  if (T.start - lo < 0.1) {
    // words run together: cut at the quietest 10 ms around their boundary, leaning toward the removed word
    const mid = (lo + T.start) / 2;
    const [x0, x1] = side === "start" ? [mid - 0.02, mid + 0.04] : [mid - 0.04, mid + 0.02];
    let best = mid, bv = Infinity;
    for (let t = x0; t <= x1 + 1e-9; t += 0.01) if (lvl(t) < bv) { bv = lvl(t); best = t; }
    return snap(best);
  }
  let q = null;
  for (let t = T.start + 0.02; t >= lo; t -= 0.01) if (quiet(t)) { q = t; break; }
  if (q == null) return snap(T.start - 0.03);
  return snapQuiet(Math.max(lo + 0.02, Math.min(q, T.start - 0.06)), lo, q + 0.005);
}
function findPhrase(i0, i1, phrase, nth = 1) {
  const words = phrase.trim().split(/\s+/);
  const scan = (eq) => {
    const hits = [];
    for (let i = i0; i + words.length - 1 <= i1; i++) if (words.every((p, k) => eq(toks[i + k].text.trim(), p))) hits.push([i, i + words.length - 1]);
    return hits;
  };
  let hits = scan((a, b) => a === b);
  if (hits.length < nth) hits = scan((a, b) => norm(a) !== "" && norm(a) === norm(b));
  return hits[nth - 1] || null;
}
const U = (id) => utts[id - 1];
// marker names in Premiere (kind → label); add your own kinds here
const LABEL = { retake: "تکرار", stumble: "تپق", offtopic: "حاشیه", cue: "برگرد رو تصویر", blur: "BLUR", check: "چک کن", section: "بخش حذفی", repeat: "تپق", filler: "پرکننده", note: "یادداشت" };

const manual = [], markers = [], problems = [];
for (const e of edits) {
  if (e.variant && e.variant !== variant) continue;
  let r = null;
  if (e.u) r = [U(e.u[0]).first, U(e.u[1]).last];
  else if (e.cut) r = findPhrase(U(e.in).first, U(e.in).last, e.cut, e.nth || 1);
  else if (e.from) {
    const a = e.from[1] ? findPhrase(U(e.from[0]).first, U(e.from[0]).last, e.from[1]) : [U(e.from[0]).first];
    const b = a && findPhrase(Math.max(a[0], U(e.to[0]).first), U(e.to[0]).last, e.to[1]);
    r = a && b ? [a[0], b[1]] : null;
  } else if (e.t) {
    // a sound the first transcript never wrote down (e.g. a filler): cut between the valleys around it,
    // never touching the neighbouring words
    const prevW = [...toks].reverse().find((w) => w.end <= e.t[0] + 0.05), nextW = toks.find((w) => w.start >= e.t[1] - 0.05);
    const lo = prevW ? prevW.end : 0, hi = nextW ? nextW.start - 0.02 : CLIP_END;
    const valley = (x0, x1) => { let best = x0, bv = Infinity; for (let t = x0; t <= x1; t += 0.01) if (lvl(t) < bv) { bv = lvl(t); best = t; } return best; };
    const a = Math.ceil(valley(Math.max(lo, e.t[0] - 0.1), Math.max(lo, e.t[0] + 0.03)) * FPS) / FPS;
    const b = Math.floor(valley(Math.min(hi, e.t[1] - 0.03), Math.min(hi, e.t[1] + 0.1)) * FPS) / FPS;
    if (b - a >= 0.08) manual.push({ kind: e.kind, a, b, apply: true, note: e.note, gone: "(filler)" });
    else problems.push(e);
    continue;
  } else if (e.mark) {
    const m = findPhrase(U(e.mark[0]).first, U(e.mark[0]).last, e.mark[1]);
    if (m) markers.push({ t: toks[m[0]].start, kind: e.kind, note: e.note }); else problems.push(e);
    continue;
  }
  if (!r) { problems.push(e); continue; }
  // startAt / endAt (camera seconds) pin an edge by hand, e.g. where a soft «س» onset looks like a dip
  const a = e.startAt != null ? snap(e.startAt) : edgeBefore(r[0], "start");
  const b = e.endAt != null ? snap(e.endAt) : edgeBefore(r[1] + 1, "end");
  manual.push({ kind: e.kind, a, b, apply: true, manual: true, note: e.note, gone: toks.slice(r[0], r[1] + 1).map((w) => w.text).join(" ") });
}

// automatic cuts: unsure ones stay off; pauses over a busy screen stay
const actFile = path.join(dir, "screen-activity.txt");
const act = fs.existsSync(actFile) ? [...fs.readFileSync(actFile, "utf8").matchAll(/YAVG=([\d.]+)/g)].map((m) => +m[1]) : [];
const busy = (a, b) => {
  const xs = act.slice(Math.max(0, Math.floor((a - OFF) * 5)), Math.max(0, Math.ceil((b - OFF) * 5)));
  return xs.length ? xs.filter((x) => x > 1).length / xs.length : 0;
};
const insideManual = (c) => manual.some((m) => c.a >= m.a - 0.02 && c.b <= m.b + 0.02);
let keptBusy = 0, trimmedLong = 0;
const autoOut = auto.map((c) => {
  const o = { ...c, apply: c.sure === true };
  if (!o.apply || insideManual(o) || !["pause", "filler"].includes(o.kind) || o.a < OFF || o.why === "filler sound") return o;
  const s = busy(o.a, o.b);
  if (s >= 0.35) { keptBusy++; return { ...o, apply: false, why: `screen busy ${(s * 100) | 0}%` }; }
  if (o.b - o.a >= 3 && s >= 0.08) { trimmedLong++; return { ...o, b: Math.max(o.a + 0.3, snap(o.b - 1)), why: "keeps last second of screen work" }; }
  return o;
});

// trailing silence after the last spoken word
const lastWord = [...toks].reverse().find((w) => w.type === "word");
const tail = snap(lastWord.end + 1);
const extra = tail < CLIP_END - 0.5 ? [{ kind: "pause", a: tail, b: CLIP_END, apply: true, note: "silence after the last word" }] : [];

const all = [...manual, ...autoOut, ...extra].sort((p, q) => p.a - q.a);

// every join keeps a natural pause: group the cuts the way make-xml merges them, then make the silence from
// the last kept sound to the next kept sound at least K (sentence end 0.45 s, comma 0.3 s, mid-sentence 0.15 s),
// borrowing it from the silence already inside the cut, never from removed speech
const MIN_PIECE = cfg.minPieceFrames / FPS;
const voiced = (t) => lvl(t) >= SIL;
const words = toks.filter((w) => w.type === "word");
const groups = [];
for (const c of all.filter((c) => c.apply)) {
  const g = groups.at(-1);
  if (g && c.a - g.b < MIN_PIECE) { g.b = Math.max(g.b, c.b); g.items.push(c); }
  else groups.push({ a: c.a, b: c.b, items: [c] });
}
let widened = 0, wi = 0;
for (const g of groups) {
  while (wi + 1 < words.length && words[wi + 1].end <= g.a + 0.05) wi++;
  const P = words[wi];
  if (!P || P.end > g.a + 0.05 || g.b >= CLIP_END - 0.01) continue;
  const K = /[.!?؟…]\s*$/.test(P.text) ? 0.45 : /[،,؛;:]\s*$/.test(P.text) ? 0.3 : 0.15;
  let lastBefore = g.a; for (let t = g.a - 0.01; t > g.a - 3; t -= 0.01) if (voiced(t)) { lastBefore = t + 0.01; break; }
  let nextAfter = g.b; for (let t = g.b; t < g.b + 3; t += 0.01) if (voiced(t)) { nextAfter = t; break; }
  const have = g.a - lastBefore + (nextAfter - g.b);
  if (have >= K) continue;
  // never hand back a removed word, even a soft one the loudness gate calls silence
  let removedEnd = g.a;
  for (const w of words) { if (w.start > g.b) break; const m = (w.start + w.end) / 2; if (m >= g.a && m < g.b) removedEnd = Math.max(removedEnd, w.end); }
  for (let t = g.b - 0.01; t > removedEnd; t -= 0.01) if (voiced(t)) { removedEnd = t + 0.01; break; }
  let nb = Math.max(removedEnd + 0.04, g.b - (K - have));
  nb = Math.ceil(nb * FPS) / FPS;
  while (nb < g.b && !quiet(nb)) nb += 1 / FPS;
  if (nb > g.b - 0.03) continue;
  for (const c of g.items) {
    if (c.b <= nb) continue;
    if (c.a < nb) c.b = nb;
    else { c.apply = false; c.why = "silence kept for the join pause"; }
  }
  g.b = nb;
  widened++;
}
console.log(`joins given a longer pause: ${widened} of ${groups.length}`);
// a cut that sits inside a bigger hand-made cut (e.g. a stumble inside a removed section) gets no marker
const bigCuts = all.filter((c) => c.apply && c.manual);
const swallowed = (c) => bigCuts.some((o) => o !== c && o.a <= c.a + 0.01 && o.b >= c.b - 0.01 && o.b - o.a > c.b - c.a);
let n = 0;
for (const c of all) {
  if (!c.apply) continue;
  if ((c.manual || ["stumble", "repeat"].includes(c.kind)) && !swallowed(c)) c.marker = `${String(++n).padStart(3, "0")} ${LABEL[c.kind] || c.kind}`;
}
markers.forEach((m) => (m.name = `${LABEL[m.kind] || m.kind} · ${m.note.slice(0, 40)}`));
fs.writeFileSync(path.join(dir, `cuts-${variant}.json`), JSON.stringify({ fps: FPS, cuts: all, markers }, null, 1));
const on = all.filter((c) => c.apply);
const total = on.reduce((s, c) => s + (c.b - c.a), 0);
console.log(`variant ${variant}: manual ${manual.length}, auto on ${autoOut.filter((c) => c.apply).length}, busy-screen pauses kept ${keptBusy}, long screen pauses trimmed ${trimmedLong}, markers ${n}`);
console.log(`cuts (before merging overlaps) ${total.toFixed(1)} s`);
if (problems.length) console.log("NOT FOUND:", JSON.stringify(problems));
