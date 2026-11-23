// Speech Cleanup · step 4 — finds what to remove from a talk: long pauses, fillers/coughs, cut-off words ("--") with their false start,
// stuttered function words, and restarted sentences (review candidates). Cut edges are placed inside real
// silence (10 ms loudness envelope) and snapped to the sequence frame grid.
// usage: node src/styles/speech-cleanup/pipeline/analyze.mjs <stt/words.json> <env10ms.f32> <cuts-auto.json> [fps=60]   (fps = the SEQUENCE frame rate)
import fs from "node:fs";

const [wordsPath, envPath, outPath, fpsArg = "60"] = process.argv.slice(2);
const FPS = Number(fpsArg);
const raw = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
const envBuf = fs.readFileSync(envPath);
const env = new Float32Array(envBuf.buffer, envBuf.byteOffset, envBuf.length / 4);
const END = env.length / 100;

// ---- loudness → silence mask
const sorted = Float32Array.from(env).sort();
const floor = sorted[Math.floor(sorted.length * 0.1)];
const SIL = floor + 8; // dBFS: below this counts as silence
const lvl = (t) => env[Math.max(0, Math.min(env.length - 1, Math.floor(t * 100)))];
const silentAt = (t, span = 0.05) => { for (let x = t; x < t + span; x += 0.01) if (lvl(x) >= SIL) return false; return true; };

// ---- text helpers
export const norm = (s) => s.normalize("NFC").replace(/[ً-ٰٟ]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک")
  .replace(/[‌‎‏]/g, "").replace(/[.,،؛;:!?؟«»"'()\[\]…\-—–]/g, "").toLowerCase().trim();
const FILLER = new Set(["ا", "اه", "اا", "ااا", "آ", "آآ", "ام", "امم", "اممم", "آم", "آمم", "آممم", "مم", "ممم", "اوم", "هوم", "هومم", "eh", "uh", "um", "umm", "hmm", "er", "ah"]);
const EDIT_TERMS = new Set(["ببخشید", "نه", "یعنی", "چیز", "چیزه"]);
const FUNC = new Set(["که", "این", "اون", "آن", "من", "تو", "رو", "را", "با", "از", "به", "در", "و", "یه", "یک", "ما", "شما", "اینو", "اونو", "ولی", "اما", "چون", "اگه", "اگر", "برای", "تا", "توی", "اینا", "اونا", "هر", "بعد", "الان"]);
// audio events: only laughter counts as speech; coughs, sneezes, sniffs, drinking are cut even when short
const isLaugh = (t) => /خنده|laugh/i.test(t);
const isBreath = (t) => !isLaugh(t);
const isCough = (t) => /سرف|گلو|عطسه|خوردن|نوشیدن|cough|throat|sniff|sneeze|drink|AirPod/i.test(t);
const cutOff = (t) => /(--|—|–)\s*$/.test(t);
const sentenceEnd = (t) => /[.!?؟…]\s*$/.test(t);
const clauseEnd = (t) => /[،,؛;:]\s*$/.test(t);

const toks = raw.filter((w) => w.type !== "spacing").sort((a, b) => a.start - b.start);
toks.forEach((w, i) => { w.i = i; w.n = norm(w.text); });
const isFiller = (w) => w.type === "word" && FILLER.has(w.n);
const nonContent = (w) => (w.type === "audio_event" && (isBreath(w.text) || isCough(w.text))) || isFiller(w);
const content = toks.filter((w) => !nonContent(w));

const snapUp = (t) => Math.ceil(t * FPS - 1e-6) / FPS;
const snapDown = (t) => Math.floor(t * FPS + 1e-6) / FPS;
const quiet = (t) => silentAt(t - 0.02, 0.04);
// walk t (dir −1 earlier / +1 later, staying inside [lo, hi]) to the nearest frame edge that sits in silence
const settle = (t, lo, hi, dir) => {
  for (let x = t; x >= lo && x <= hi; x += dir * 0.01) {
    for (const f of [Math.round(x * FPS) / FPS, snapUp(x), snapDown(x)]) if (f >= lo && f <= hi && quiet(f)) return f;
  }
  return null;
};
const cuts = [];
const ctx = (i0, i1, k = 8) => {
  const before = toks.slice(Math.max(0, i0 - k), i0).map((w) => w.text).join(" ");
  const gone = toks.slice(i0, i1).map((w) => w.text).join(" ");
  const after = toks.slice(i1, i1 + k).map((w) => w.text).join(" ");
  return { before, gone, after };
};

// ---- 1. pauses (and fillers/breaths/coughs sitting inside them)
for (let k = 0; k + 1 < content.length; k++) {
  const A = content[k], B = content[k + 1];
  if (B.start - A.end < 0.3) continue;
  // real end of speech after A and real onset before B, inside silence
  let u = null, v = null;
  for (let t = Math.max(A.end - 0.06, A.start); t < B.start; t += 0.01) if (silentAt(t)) { u = t; break; }
  for (let t = B.start + 0.04; t > (u ?? B.start); t -= 0.01) if (silentAt(t - 0.05)) { v = t - 0.0; break; }
  if (u == null || v == null || v - u < 0.3) continue;
  const inner = toks.slice(A.i + 1, B.i);
  const hasJunk = inner.some((w) => isFiller(w) || (w.type === "audio_event" && isCough(w.text)));
  const keep = sentenceEnd(A.text) ? 0.5 : clauseEnd(A.text) ? 0.35 : 0.28;
  const minCut = hasJunk ? 0.08 : 0.3;
  if (v - u - keep < minCut) continue;
  const a = settle(u + keep * 0.55, u + 0.02, v, -1), b = settle(v - keep * 0.45, u, v - 0.01, +1);
  if (a == null || b == null || b - a < minCut) continue;
  cuts.push({ kind: hasJunk ? "filler" : "pause", a, b, sure: true, gap: +(B.start - A.end).toFixed(2), ...ctx(A.i + 1, B.i, 4) });
}

// helper: cut a token range [i0, i1) with edges moved into nearby silence when possible
function rangeCut(i0, i1, kind, sure, why) {
  const W0 = toks[i0], W1 = toks[i1];
  if (!W0 || !W1) return;
  const prev = toks[i0 - 1];
  // start: in the silence between prev and W0 if there is one, else right at W0.start
  let a = W0.start - 0.02;
  if (prev) for (let t = prev.end; t < W0.start; t += 0.01) if (silentAt(t, 0.03)) { a = Math.max(t + 0.02, W0.start - 0.12); break; }
  let b = W1.start - 0.03;
  for (let t = W1.start; t > W0.end; t -= 0.01) if (silentAt(t - 0.04, 0.04)) { b = Math.min(t - 0.02, W1.start - 0.02); break; }
  a = snapUp(a); b = snapDown(b);
  if (b - a < 0.05) return;
  cuts.push({ kind, a, b, sure, why, ...ctx(i0, i1) });
}

// ---- 1b. fillers and coughs glued to the previous word (no silence between): cut from the loudness valley
// before them; keep a short natural pause before the next word
const avg = (t) => (lvl(t - 0.01) + lvl(t) + lvl(t + 0.01)) / 3;
for (const F of toks) {
  if (!(isFiller(F) || (F.type === "audio_event" && isCough(F.text)))) continue;
  const P = toks[F.i - 1], N = toks[F.i + 1];
  if (!P || !N) continue;
  let a = F.start, best = Infinity;
  for (let t = Math.max(P.end - 0.04, P.start + 0.05); t <= F.start + 0.06; t += 0.01) if (avg(t) < best) { best = avg(t); a = t; }
  // end of the filler's sound, then the next word's real onset
  let soundEnd = F.end;
  for (let t = F.start + 0.05; t < N.start; t += 0.01) if (silentAt(t, 0.05)) { soundEnd = t; break; }
  let onset = N.start;
  for (let t = N.start + 0.02; t > soundEnd; t -= 0.01) if (silentAt(t - 0.04, 0.04)) { onset = t; break; }
  if (soundEnd >= N.start - 0.02) {
    // no silence between the filler and the next word: cut only if there is a clear dip, else leave it
    let dip = Infinity, peak = -Infinity;
    for (let t = F.start; t < F.end; t += 0.01) peak = Math.max(peak, lvl(t));
    for (let t = F.end - 0.12; t <= N.start - 0.01; t += 0.01) if (lvl(t) < dip) { dip = lvl(t); soundEnd = t; }
    if (dip > peak - 12) continue;
    onset = soundEnd + 0.02;
  }
  const keep = sentenceEnd(P.text) ? 0.45 : 0.25;
  const b = Math.max(soundEnd + 0.02, onset - keep);
  const A = snapUp(a), B = settle(b, soundEnd, onset, +1) ?? snapUp(b);
  if (B - A < 0.08) continue;
  cuts.push({ kind: "filler", a: A, b: B, sure: true, why: "filler sound", ...ctx(F.i, F.i + 1, 4) });
}

// ---- 2. cut-off words → remove the false start (reparandum) up to where the speaker restarts
for (const w of toks) {
  if (w.type !== "word" || !cutOff(w.text)) continue;
  const i = w.i;
  const L = toks.slice(Math.max(0, i - 6), i).filter((x) => x.type === "word");
  const R = toks.slice(i + 1, i + 12).filter((x) => x.type === "word");
  let best = null;
  for (let kk = Math.min(4, L.length); kk >= 1 && !best; kk--) {
    const tail = L.slice(-kk).map((x) => x.n);
    for (let j = 0; j <= 2 && j + kk <= R.length; j++) {
      if (tail.every((n, q) => n === R[j + q].n)) { best = { kk, j }; break; }
    }
  }
  if (best) {
    const startTok = L[L.length - best.kk];
    // words between the cut-off and the restart: drop them only if they are editing terms (ببخشید / نه / یعنی…)
    const between = R.slice(0, best.j);
    const endTok = between.every((x) => EDIT_TERMS.has(x.n) || FILLER.has(x.n)) ? R[best.j] : R[0];
    rangeCut(startTok.i, endTok.i, "stumble", true, `restart «${R.slice(best.j, best.j + best.kk).map((x) => x.text).join(" ")}»`);
  } else {
    const nxt = toks[i + 1];
    if (nxt) rangeCut(i, i + 1, "stumble", w.n.length <= 5, "cut-off word");
  }
}

// ---- 3. stuttered function words: «که که», «این این»
for (let i = 0; i + 1 < toks.length; i++) {
  const x = toks[i], y = toks[i + 1];
  if (x.type !== "word" || y.type !== "word" || x.n !== y.n || !x.n) continue;
  if (y.start - x.end > 0.8) continue;
  if (FUNC.has(x.n)) rangeCut(i, i + 1, "repeat", true, "stutter");
}

// ---- 4. restarted sentences (review candidates, not applied until reviewed)
const utts = [];
let cur = [];
for (const w of toks) {
  if (w.type !== "word") continue;
  const last = cur.at(-1);
  if (last && (w.start - last.end > 0.5 || sentenceEnd(last.text))) { utts.push(cur); cur = []; }
  cur.push(w);
}
if (cur.length) utts.push(cur);
for (let k = 0; k + 1 < utts.length; k++) {
  const P = utts[k], Q = utts[k + 1];
  if (P.length < 2 || Q.length < 2) continue;
  const same = P[0].n === Q[0].n && P[1].n === Q[1].n;
  const cutTail = cutOff(P.at(-1).text);
  if (same && (P.length <= 10 || cutTail)) {
    rangeCut(P[0].i, Q[0].i, "retake", false, "sentence restarted");
  }
}

cuts.sort((p, q) => p.a - q.a);
cuts.forEach((c, n) => (c.id = n + 1));
fs.writeFileSync(outPath, JSON.stringify({ fps: FPS, silence_dB: +SIL.toFixed(1), duration: END, cuts }, null, 1));
const sum = (k) => cuts.filter((c) => c.kind === k).reduce((s, c) => s + (c.b - c.a), 0);
const count = (k) => cuts.filter((c) => c.kind === k).length;
for (const k of ["pause", "filler", "stumble", "repeat", "retake"]) console.log(k.padEnd(8), String(count(k)).padStart(4), "cuts", sum(k).toFixed(1).padStart(7), "s");
console.log("silence threshold", SIL.toFixed(1), "dBFS; total", cuts.reduce((s, c) => s + c.b - c.a, 0).toFixed(1), "s of", END.toFixed(1));
