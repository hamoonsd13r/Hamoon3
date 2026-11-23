// Talk Cutout · the word clock. words.json = [{ si, wi, w, s, e }] (si = sentence, s/e = start/end in film seconds) —
// from tools/eleven-align.mjs (your voice + the script, one sentence per line) or pipeline/words-from-stt.mjs (Scribe).
// The speaker's own voice is never edited, so film time = source time. Every cue in a film is a word: at(si, "کلمه").
export type Word = { si: number; wi?: number; w: string; s: number; e: number };

/** strip punctuation, guillemets and ZWNJ; unify Arabic ي/ك */
export const norm = (x: string) =>
  x.replace(/[.,!?؟،؛«»:;"'()]/g, "").replace(/‌/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase();

export const makeClock = (words: Word[], tag = "talk-cutout") => {
  const find = (si: number, w: string, n: number) => {
    const want = norm(w);
    const exact = words.filter((x) => x.si === si && norm(x.w) === want);
    const m = exact.length > n ? exact : words.filter((x) => x.si === si && norm(x.w).includes(want));
    if (!m[n]) throw new Error(`${tag}: no word «${w}» #${n} in sentence ${si}`);
    return m[n];
  };
  /** start of the n-th (0-based) word `w` inside sentence si (exact match first, then «contains») */
  const at = (si: number, w: string, n = 0) => find(si, w, n).s;
  /** end of that word */
  const atE = (si: number, w: string, n = 0) => find(si, w, n).e;
  /** the occurrence of `w` nearest to film time `near` (robust when words repeat) */
  const near = (w: string, t: number) => {
    const want = norm(w);
    let best: Word | null = null;
    for (const x of words) if (norm(x.w) === want && (!best || Math.abs(x.s - t) < Math.abs(best.s - t))) best = x;
    if (!best) throw new Error(`${tag}: no word «${w}» near ${t}`);
    return best;
  };
  const sentence = (si: number) => {
    const ws = words.filter((x) => x.si === si);
    if (!ws.length) throw new Error(`${tag}: no sentence ${si}`);
    return { s: ws[0].s, e: ws[ws.length - 1].e, words: ws };
  };
  /** 0..1: is a word being spoken at t (drives the placeholder's talking bob) */
  const speaking = (t: number) => (words.some((x) => t >= x.s && t < x.e) ? 1 : 0);
  return { words, at, atE, near, sentence, speaking, total: words.length ? words[words.length - 1].e : 0 };
};
export type Clock = ReturnType<typeof makeClock>;
