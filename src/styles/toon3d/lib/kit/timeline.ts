// Toon3D kit: the film's clock. Everything is keyed to the narration's words (vo.json from the voice pipeline), so a
// re-voiced line moves its shots, captions, lightning and effects with it.
//   makeTiming(vo)  -> W / WE / LINE0 (word onsets), TOTAL frames, caption cards, lightning envelope
//   makeShots(...)  -> the shot list: shot(id, start, def, dissolveFrames), shotAt, frameDef, layersAt (dissolves)

export type Word = { w: string; s: number; e: number; line: number };
export type Vo = { words: Word[]; total: number };
export type Card = { text: string; a: number; b: number; line: number };

// ---------------- easing ----------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
export const easeOut = (x: number, p = 3) => 1 - Math.pow(1 - clamp01(x), p);
export const easeIn = (x: number, p = 2) => Math.pow(clamp01(x), p);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Persian word compare: punctuation, guillemets and the zero-width non-joiner do not count */
export const bare = (s: string) => s.replace(/[.،؛,!?؟«»"]/g, "").replace(/‌/g, "");

/** short words that ride on the next word's caption card */
export const SMALL_FA = ["و", "که", "به", "از", "رو", "تو", "با", "در", "این", "اون", "یه", "یک", "هم", "بعد", "ولی", "اما", "تا", "برای", "روی", "توی", "حتی", "فقط", "چرا", "هر", "داره", "دارن", "می‌گه", "بهش"];

/** lightning exposure envelope measured on the reference: two bright frames, a dip, a second peak, an 8-frame fade */
export const FLASH_ENV = [1, 0.95, 0.42, 0.9, 0.85, 0.72, 0.6, 0.48, 0.37, 0.27, 0.18, 0.1, 0.04];

export type TimingOpts = {
  fps?: number;
  /** seconds of picture after the last word (the last sound rings out) */
  tail?: number;
  small?: string[];
  /** captions switch this many frames before their first word */
  earlyFrames?: number;
  /** the first film's original matching (its ZWNJ small words never matched); keep false */
  legacySmall?: boolean;
};

export function makeTiming(vo: Vo, o: TimingOpts = {}) {
  const FPS = o.fps ?? 30;
  const WORDS = vo.words, VO_TOTAL = vo.total;
  const TOTAL = Math.ceil((VO_TOTAL + (o.tail ?? 1.2)) * FPS);
  const fr = (t: number) => Math.round(t * FPS);
  const hits = (w: string, line: number) => WORDS.filter((x) => x.line === line && bare(x.w) === bare(w));
  /** onset (s) of the n-th occurrence of a word in a narration line */
  const W = (w: string, line: number, occ = 0) => {
    const h = hits(w, line);
    if (!h[occ]) throw new Error(`timeline: word "${w}" (#${occ}) not in line ${line}`);
    return h[occ].s;
  };
  const WE = (w: string, line: number, occ = 0) => {
    const h = hits(w, line);
    if (!h[occ]) throw new Error(`timeline: word "${w}" (#${occ}) not in line ${line}`);
    return h[occ].e;
  };
  const LINE0 = (line: number) => WORDS.find((x) => x.line === line)!.s;
  const LINE1 = (line: number) => [...WORDS].reverse().find((x) => x.line === line)!.e;

  // ---- caption cards: 1-2 words, small words ride with the next word of the same line ----
  const small = new Set(o.legacySmall ? (o.small ?? SMALL_FA) : (o.small ?? SMALL_FA).map(bare));
  const CARDS: Card[] = [];
  {
    const clean = (w: string) => w.replace(/[«»"]/g, "");
    let i = 0;
    while (i < WORDS.length) {
      const w = WORDS[i], next = WORDS[i + 1];
      const isSmall = small.has(bare(w.w)) || bare(w.w).length <= 2;
      if (isSmall && next && next.line === w.line) { CARDS.push({ text: clean(w.w) + " " + clean(next.w), a: w.s, b: next.e, line: w.line }); i += 2; }
      else { CARDS.push({ text: clean(w.w), a: w.s, b: w.e, line: w.line }); i += 1; }
    }
  }
  const early = (o.earlyFrames ?? 5) / FPS;
  /** the caption on screen at time t (hard switch a few frames before its first word) */
  const cardAt = (t: number): Card | null => {
    for (let k = 0; k < CARDS.length; k++) {
      const c = CARDS[k], nx = CARDS[k + 1];
      const end = nx && nx.line === c.line ? nx.a - early : Math.min(c.b + 0.45, nx ? nx.a - early : c.b + 0.6);
      if (t >= c.a - early && t < end) return c;
    }
    return null;
  };

  /** lightning: strikes (s) -> exposure 0..1 at time t */
  const flashOf = (strikes: number[]) => (t: number) => {
    let a = 0;
    for (const s of strikes) { const n = Math.floor((t - s) * FPS + 1e-6); if (n >= 0 && n < FLASH_ENV.length) a = Math.max(a, FLASH_ENV[n]); }
    return a;
  };

  return { FPS, WORDS, VO_TOTAL, TOTAL, fr, W, WE, LINE0, LINE1, CARDS, cardAt, flashOf };
}

// ---------------- named cues: the sound script's clock ----------------
/** Name the story's times as you write them: `const THROW = cue("throw", W("throws", 13) - LEAD)`. Pass CUES.all to
 *  makeFilm({ cues }); tools/plan.mjs writes them to <slug>/plan/plan.json and build-audio.cjs reads them
 *  (tools/lib/plancues.cjs), so no timing formula is written twice. Values: seconds, or arrays/objects of them. */
export function makeCues() {
  const all: Record<string, unknown> = {};
  const cue = <T>(name: string, v: T): T => { all[name] = v; return v; };
  return { cue, all };
}

// ---------------- the shot list ----------------
export type Shot<D> = { id: number; a: number; xf?: number; def: (t: number) => D };

/** Register shots in order with shot(id, startSeconds, def, dissolveFrames); SHOTS/frameDef/layersAt read the list. */
export function makeShots<D>(FPS: number, TOTAL: number) {
  const S: Shot<D>[] = [];
  const fr = (t: number) => Math.round(t * FPS);
  const shot = (id: number, a: number, def: (t: number) => D, xf = 0) => { S.push({ id, a, def, xf }); };
  let cache: (Shot<D> & { f0: number; f1: number })[] | null = null;
  const list = () => (cache ??= S.map((s, i) => ({ ...s, f0: fr(s.a), f1: i + 1 < S.length ? fr(S[i + 1].a) : TOTAL })));
  const shotAt = (f: number) => list().find((s) => f >= s.f0 && f < s.f1) ?? list()[list().length - 1];
  /** the frame definition of shot `id` at frame f (any f: dissolves render a shot a few frames outside its range) */
  const frameDef = (id: number, f: number): D => list()[id - 1].def(f / FPS);
  /** the layers at frame f: one shot, or two in a dissolve centred on the cut */
  const layersAt = (f: number): { id: number; alpha: number }[] => {
    for (const s of list()) {
      const x = s.xf ?? 0;
      if (x && f >= s.f0 - x / 2 && f < s.f0 + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.f0 - x / 2) + 1) / (x + 1) }];
    }
    return [{ id: shotAt(f).id, alpha: 1 }];
  };
  return { shot, list, shotAt, frameDef, layersAt };
}
