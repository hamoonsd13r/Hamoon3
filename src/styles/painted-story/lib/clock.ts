// Painted Story · the narration clock. vo.json (tools/doc-build-vo.mjs, or pipeline/estimate-vo.mjs before the voice
// exists) gives every line and word a start/end in film seconds. Shots, cards, effects and sound cues anchor to a line
// or to a word inside a line, so cuts land on what is being said — and move by themselves when the voice changes.
export type VoWord = { w: string; s: number; e: number; line: number };
export type VoSeg = { n: number; sp: string; start: number; end: number };
export type VoJson = { total: number; segs: VoSeg[]; words: VoWord[] };

/** a word without punctuation, ZWNJ, harakat or case — for matching («صبح،» = «صبح», "Day," = "day") */
export const bare = (w: string) =>
  w
    .toLowerCase()
    .replace(/[‌ً-ْٰ«»"'“”‘’،؛,.!?؟:;…()[\]\-—]/g, "")
    .trim();

export function makeClock(vo: VoJson) {
  const WORDS = vo.words, SEGS = vo.segs;
  const line = (n: number) => {
    const s = SEGS.find((x) => x.n === n);
    if (!s) throw new Error(`painted-story: no line ${n} in vo.json`);
    return s;
  };
  /** start (or end) of the k-th word of line n matching `w` (exact first, else prefix — «پنجره» finds «پنجره‌ای») */
  const word = (n: number, w: string, k = 1, field: "s" | "e" = "s") => {
    const want = bare(w);
    const ws = WORDS.filter((x) => x.line === n);
    let hits = ws.filter((x) => bare(x.w) === want);
    if (hits.length < k) hits = ws.filter((x) => bare(x.w).startsWith(want));
    const x = hits[k - 1];
    if (!x) throw new Error(`painted-story: no word «${w}» #${k} in line ${n}: ${ws.map((q) => q.w).join(" ")}`);
    return x[field];
  };
  return {
    total: vo.total,
    words: WORDS,
    segs: SEGS,
    line,
    /** line start / end */
    L: (n: number) => line(n).start,
    E: (n: number) => line(n).end,
    /** word onset / end (k = which occurrence, 1-based) */
    Wd: (n: number, w: string, k = 1) => word(n, w, k, "s"),
    WE: (n: number, w: string, k = 1) => word(n, w, k, "e"),
    lineWords: (n: number) => WORDS.filter((x) => x.line === n),
    /** 0..1 while speaker `sp` talks (soft edges) — lights that "speak": an intercom, a radio, a vent */
    speaking: (t: number, sp: string) => {
      let v = 0;
      for (const s of SEGS) {
        if (s.sp !== sp) continue;
        if (t > s.start - 0.15 && t < s.end + 0.2) v = Math.max(v, Math.min(1, (t - s.start + 0.15) / 0.15, (s.end + 0.2 - t) / 0.2));
      }
      return v;
    },
    /** 1 while a word of line n is being said (short release) — syllable flicker */
    wordPulse: (t: number, n: number) => {
      let v = 0;
      for (const x of WORDS) {
        if (x.line !== n) continue;
        if (t >= x.s && t <= x.e + 0.08) v = Math.max(v, 1 - Math.max(0, t - x.e) / 0.08);
      }
      return v;
    },
    /** a natural cut point inside [a, b]: the sentence start nearest the middle, else the nearest word start */
    midBeat: (a: number, b: number) => {
      const mid = (a + b) / 2;
      const pick = (ts: number[]) => ts.reduce((best, x) => (Math.abs(x - mid) < Math.abs(best - mid) ? x : best), Infinity);
      const starts = pick(SEGS.map((s) => s.start).filter((x) => x > a + 3 && x < b - 3));
      return Number.isFinite(starts) ? starts : pick(WORDS.map((w) => w.s).filter((x) => x > a + 2.5 && x < b - 2.5));
    },
  };
}
export type Clock = ReturnType<typeof makeClock>;
