// Painted Story · word-by-word captions for the tall look (the wide doc look has none: YouTube gets an SRT).
// The narration is cut into phrase cards; a card lays out ALL its words from the start (unsaid ones invisible), so it
// never reflows — each word blurs up exactly while it is said. Quoted voices (intercom, neighbour…) are warm and wear
// «»; a mimicking voice is in the accent and jitters. Lines that already have a title card (a day card) are skipped.
import React from "react";
import { F } from "./fonts";
import { useTheme } from "./theme";
import { bare, type VoJson, type VoWord } from "./clock";
import { ease, hash, ramp } from "./time";

export type CapChunk = { line: number; sp: string; words: VoWord[]; t0: number; t1: number };

/** phrase cards from vo.json: break at . ! ? ؟ … ؛ :, at «،» once a card has 3+ words, or past `maxChars` */
export function makeChunks(vo: VoJson, maxChars = 34): CapChunk[] {
  const out: CapChunk[] = [];
  for (const seg of vo.segs) {
    const ws = vo.words.filter((w) => w.line === seg.n);
    let cur: VoWord[] = [];
    const flush = () => {
      if (cur.length) out.push({ line: seg.n, sp: seg.sp, words: cur, t0: cur[0].s, t1: 0 });
      cur = [];
    };
    ws.forEach((w, i) => {
      cur.push(w);
      const end = /[.!?؟…؛:]$/.test(w.w);
      const soft = /[،,]$/.test(w.w) && cur.length >= 3;
      const rest = ws.length - 1 - i;
      const chars = cur.reduce((a, x) => a + x.w.length + 1, 0);
      if (end || soft || (chars > maxChars && rest > 1) || i === ws.length - 1) flush();
    });
  }
  out.forEach((c, i) => {
    const next = out[i + 1];
    const lastE = c.words[c.words.length - 1].e;
    c.t1 = next ? Math.min(next.t0 - 0.04, lastE + 0.9) : lastE + 1.2;
  });
  return out;
}

export const Captions: React.FC<{
  t: number; chunks: CapChunk[]; skip?: number[]; y?: number; size?: number; maxWidth?: number;
  quoteSp?: string[]; mimicSp?: string[]; keywords?: string[];
  /** move one card off a character: return another top y for that chunk (e.g. a hand rising from the bottom) */
  yOf?: (c: CapChunk) => number | undefined;
}> = ({ t, chunks, skip = [], y = 1395, size = 54, maxWidth = 900, quoteSp = [], mimicSp = [], keywords = [], yOf }) => {
  const th = useTheme();
  const c = chunks.find((x) => t >= x.t0 - 0.06 && t < x.t1);
  if (!c || skip.includes(c.line)) return null;
  y = yOf?.(c) ?? y;
  const quote = quoteSp.includes(c.sp) || mimicSp.includes(c.sp);
  const mimic = mimicSp.includes(c.sp);
  const out = 1 - ease.in(ramp(t, c.t1 - 0.18, c.t1));
  const f = Math.floor(t * 24);
  const jit = mimic ? (hash(f * 1.9) > 0.8 ? (hash(f) - 0.5) * 10 : 0) : 0;
  const KW = new Set(keywords.map(bare));
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: y, display: "flex", justifyContent: "center", opacity: out, pointerEvents: "none" }}>
      <div style={{ textAlign: "center", maxWidth, lineHeight: 1.32, direction: "rtl", transform: `translateX(${jit}px)` }}>
        {c.words.map((w, i) => {
          const u = ease.out(ramp(t, w.s - 0.04, w.s + 0.12));
          const first = i === 0, last = i === c.words.length - 1;
          const text = (quote && first ? "«" : "") + w.w.replace(/\.\.\.$/, "…") + (quote && last ? "»" : "");
          const digits = /^[\d:.,]+$/.test(w.w);
          const color = mimic ? th.accent : quote ? th.warm : KW.has(bare(w.w)) ? th.accent : th.text;
          return (
            <span
              key={i}
              style={{
                fontFamily: digits ? F.num : F.fa, fontSize: digits ? size * 0.95 : size, color, opacity: u, display: "inline-block", margin: `0 ${size * 0.13}px`,
                transform: `translateY(${(1 - u) * 8}px)`, filter: u < 1 ? `blur(${(1 - u) * 3}px)` : undefined,
                textShadow: mimic ? `${th.sd}, 8px 5px 0 ${th.accent}47, -6px -3px 0 ${th.warm}2e` : th.sd,
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
