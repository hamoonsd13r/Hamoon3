// Word timing loader shared by the audio tools: reads every word-timing format the kit makes and returns
// [{ w, s, e, si }] (si = sentence index when the file knows it).
//   doc-build-vo  → { total, segs, words: [{ w, s, e, line }] }
//   eleven-align  → [{ w, si, s, e }]
//   eleven-stt    → Scribe JSON { words: [{ text, start, end, type, speaker_id }] }
import fs from "node:fs";

export const loadWords = (p) => {
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const arr = Array.isArray(j) ? j : (j.words ?? []);
  return arr
    .filter((x) => (x.type ?? "word") === "word")
    .map((x) => ({ w: String(x.w ?? x.text ?? x.word ?? "").trim(), s: Number(x.s ?? x.start), e: Number(x.e ?? x.end), si: x.si ?? x.line ?? x.sentence }))
    .filter((x) => x.w && Number.isFinite(x.s) && Number.isFinite(x.e) && x.e >= x.s);
};

/** the kind of pause after word i: "sent" (end of a sentence), "comma", or "word" */
export const pauseKind = (words, i) => {
  const a = words[i], b = words[i + 1];
  if (!b) return "sent";
  if (a.si !== undefined && b.si !== undefined && a.si !== b.si) return "sent";
  if (/[.!?؟…]["»”']?$/.test(a.w)) return "sent";
  if (/[،,؛;:]["»”']?$/.test(a.w)) return "comma";
  return "word";
};
