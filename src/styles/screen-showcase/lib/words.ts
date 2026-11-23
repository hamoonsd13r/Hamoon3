// Screen Showcase · word timing (same as Market File). Every beat of the film is a word of the narration: `at(si, "word")` = when it is said.
// Before you have a voice, `estimateWords(LINES)` gives believable timings (calibrated on a real Persian narration:
// 0.078 s per letter, 0.06 s between words). With the voice, use the real alignment instead:
//   node --env-file=.env tools/eleven-align.mjs public/vNN/voice.wav src/vNN/lines.txt src/vNN/words.json
// and in your script: `export const WORDS = REAL as Word[]` (format [{ w, si, s, e }] — wi is filled in here).
export type Word = { si: number; wi: number; w: string; s: number; e: number };
export type RawWord = { si: number; w: string; s: number; e: number; wi?: number };

export type EstimateOpts = { lead?: number; perChar?: number; minWord?: number; wordGap?: number; commaGap?: number; sentGap?: number; /** extra pause before line i (a chapter card, a breath) */ before?: Record<number, number> };

const letters = (w: string) => w.replace(/[ً-ْ‌‏.,،؛:!?؟«»"()…\-]/g, "").length;

/** believable word times for lines that have no voice yet (si = line index) */
export const estimateWords = (lines: string[], o: EstimateOpts = {}): Word[] => {
  const { lead = 0.2, perChar = 0.078, minWord = 0.16, wordGap = 0.063, commaGap = 0.18, sentGap = 0.24, before = {} } = o;
  const out: Word[] = [];
  let t = lead;
  lines.forEach((line, si) => {
    t += before[si] ?? 0;
    const ws = line.split(/\s+/).filter(Boolean);
    ws.forEach((w, wi) => {
      const d = Math.max(minWord, letters(w) * perChar);
      out.push({ si, wi, w, s: +t.toFixed(3), e: +(t + d).toFixed(3) });
      t += d + (/[،,؛:]$/.test(w) ? commaGap : wordGap);
    });
    t += sentGap;
  });
  return out;
};

/** normalise any [{ w, si, s, e }] list (fills wi) */
export const normalizeWords = (raw: RawWord[]): Word[] => {
  const n: Record<number, number> = {};
  return raw.map((x) => ({ ...x, wi: x.wi ?? (n[x.si] = (n[x.si] ?? -1) + 1) }));
};

const clean = (w: string) => w.replace(/[:،,.؟?!"«»؛]/g, "").replace(/ْ/g, "");

/** time helpers over one word list */
export const makeTimeline = (words: Word[]) => {
  const find = (si: number, txt: string, n: number) => {
    const t = txt.replace(/ْ/g, "");
    const exact = words.filter((x) => x.si === si && clean(x.w) === t);
    const m = exact.length > n ? exact : words.filter((x) => x.si === si && clean(x.w).includes(t));
    if (!m[n]) throw new Error(`screen-showcase: no word «${txt}» in line ${si}`);
    return m[n];
  };
  const line = (si: number) => words.filter((x) => x.si === si);
  return {
    words,
    /** start of word `txt` in line `si` (exact word first, then substring; n-th occurrence) */
    at: (si: number, txt: string, n = 0) => find(si, txt, n).s,
    /** end of that word */
    end: (si: number, txt: string, n = 0) => find(si, txt, n).e,
    /** start / end of line si */
    S: (si: number) => line(si)[0].s,
    E: (si: number) => {
      const ws = line(si);
      return ws[ws.length - 1].e;
    },
    VOICE_END: Math.max(...words.map((w) => w.e)),
  };
};
export type Timeline = ReturnType<typeof makeTimeline>;
