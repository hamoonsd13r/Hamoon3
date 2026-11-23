// Mirror Hall · the whole song's lyrics on screen. The words are the song's own (the lyrics
// in the MP3's tags), timed on Scribe's word times (words.json): each word appears the moment it is sung, never
// before, and the line's space is reserved from its first word. The wordless chops and melismas get no line.
// Each line sits where it does not cross her (or her mother): its place is chosen from her box on screen over the
// line's whole time (bottom centre first, then the bottom corners, then the top).
import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import WORDS from "./base/words.json";
import { clamp } from "./base/lib89";
import { herBoxAt } from "./dirH";

type Word = { w: string; a: number; b: number };
const W = WORDS as Word[];

/** [first, last] word index in words.json, and the line as the song writes it (when Scribe heard it otherwise) */
// Your song: put its aligned words in base/words.json ([{ w, a, b }]) and list the lines here as
// [first word index, last word index, the line as the song writes it (optional)]. Empty = no lyrics.
const LINES: [number, number, string?][] = [];

type Pos = "b" | "br" | "bl" | "t" | "tr" | "tl";
type Card = { words: Word[]; from: number; to: number; pos: Pos; split: number };
const FS = 40; // px (on the 1080 frame)
const LH = 56; // line height
const CH = 22.5; // the width of a character of Libre Baskerville at 40 px, about
const SIDE = 120;
const WRAP = 640; // a corner line longer than this goes on two lines (it keeps clear of her)
const textW = (ws: Word[]) => ws.map((w) => w.w).join(" ").length * CH;
/** where a corner line breaks: the word that halves it best (0 = one line) */
const splitOf = (ws: Word[]) => {
  if (textW(ws) <= WRAP || ws.length < 3) return 0;
  const SMALL = new Set(["i", "a", "the", "of", "to", "in", "and", "for", "when", "my", "your"]);
  const tot = textW(ws);
  let best = 1, bd = 1e9;
  for (let k = 1; k < ws.length; k++) {
    const last = ws[k - 1].w;
    const d = Math.abs(textW(ws.slice(0, k)) - textW(ws.slice(k))) / tot + (SMALL.has(last.toLowerCase().replace(/[^a-z]/g, "")) ? 0.6 : 0) - (/[,;]$/.test(last) ? 0.15 : 0);
    if (d < bd) (bd = d), (best = k);
  }
  return best;
};
const rectOf = (pos: Pos, ws: Word[]): [number, number, number, number] => {
  const sp = pos.length === 1 ? 0 : splitOf(ws);
  const w = sp ? Math.max(textW(ws.slice(0, sp)), textW(ws.slice(sp))) : textW(ws);
  const extra = sp ? LH : 0;
  const y = pos[0] === "b" ? [946 - extra, 1032] : [62, 148 + extra];
  if (pos.length === 1) return [960 - w / 2 - 16, y[0], 960 + w / 2 + 16, y[1]];
  return pos[1] === "l" ? [SIDE - 16, y[0], SIDE + w + 16, y[1]] : [1920 - SIDE - w - 16, y[0], 1920 - SIDE + 16, y[1]];
};
const overlap = (a: number[], b: number[]) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

const CARDS: Card[] = (() => {
  const raw = LINES.map(([i0, i1, text]) => {
    const stt = W.slice(i0, i1 + 1);
    const toks = text ? text.split(" ") : stt.map((w) => w.w);
    // align from the end; a word Scribe missed at the start goes a quarter second before the next
    const words: Word[] = toks.map((w, k) => {
      const j = stt.length - toks.length + k;
      if (j >= 0) return { w, a: stt[j].a, b: stt[j].b };
      return { w, a: stt[0].a - 0.25 * -j, b: stt[0].a - 0.25 * (-j - 1) };
    });
    return words;
  });
  const PREF: Record<Pos, number> = { b: 0, bl: 0.03, br: 0.035, t: 0.12, tl: 0.15, tr: 0.155 };
  let prev: Pos = "bl";
  return raw.map((words, i) => {
    const next = raw[i + 1]?.[0].a ?? 1e9;
    const last = words[words.length - 1];
    const from = words[0].a, to = Math.min(next - 0.12, last.b + 1.1, 209.8);
    // where: least overlap with her box over the line's time (a little preference for the bottom centre)
    const order: Pos[] = ["b", "bl", "br", "t", "tl", "tr"];
    const sum = new Map<Pos, number>(order.map((p) => [p, 0]));
    let n = 0;
    for (let t = from; t <= to + 0.31; t += 0.1) {
      const box = herBoxAt(t);
      n++;
      if (!box) continue;
      for (const p of order) {
        const r = rectOf(p, words);
        sum.set(p, sum.get(p)! + overlap(r, box) / ((r[2] - r[0]) * (r[3] - r[1])));
      }
    }
    const score = (p: Pos) => sum.get(p)! / Math.max(1, n) + PREF[p] - (p === prev ? 0.06 : 0) + order.indexOf(p) * 1e-4;
    const pos = [...order].sort((x, y) => score(x) - score(y))[0];
    prev = pos;
    return { words, from, to, pos, split: pos.length === 1 ? 0 : splitOf(words) };
  });
})();
export const LYRIC_CARDS_H = CARDS.map((c) => ({ text: c.words.map((w, i) => (c.split && i === c.split ? "/ " : "") + w.w).join(" "), from: c.from, to: c.to, pos: c.pos }));

const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

export const LyricsH: React.FC<{ t: number }> = ({ t }) => {
  const [handle] = useState(() => delayRender("v89h lyrics font"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = new FontFace("V89Lyric", `url(${staticFile("fonts/LibreBaskerville.ttf")})`);
    f.load()
      .then((ff) => {
        (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff);
        setReady(true);
        continueRender(handle);
      })
      .catch(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  if (!ready) return null;
  const card = CARDS.find((c) => t >= c.from && t < c.to + 0.3);
  if (!card) return null;
  const out = 1 - ease((t - card.to) / 0.3);
  const bottom = card.pos[0] === "b";
  // a soft dark band under the words while the line is up (white text stays readable on the mirror light)
  const shade = 0.45 * out * ease((t - card.from) / 0.2);
  const align = card.pos.length === 1 ? "center" : card.pos[1] === "l" ? "left" : "right";
  const lines = card.split ? [card.words.slice(0, card.split), card.words.slice(card.split)] : [card.words];
  const word = (w: Word, i: number, n: number) => {
    const k = ease((t - w.a) / 0.14);
    return (
      <span key={i} style={{ display: "inline-block", marginRight: i < n - 1 ? "0.3em" : 0, opacity: k, transform: `translateY(${(1 - k) * 8}px)`, filter: k < 1 ? `blur(${((1 - k) * 4).toFixed(2)}px)` : undefined }}>
        {w.w}
      </span>
    );
  };
  return (
    <>
      <div
        style={{
          position: "absolute", left: 0, right: 0, height: 250, pointerEvents: "none",
          ...(bottom ? { bottom: 0 } : { top: 0 }),
          background: `linear-gradient(to ${bottom ? "bottom" : "top"}, rgba(2,3,8,0), rgba(2,3,8,${shade.toFixed(3)}))`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SIDE,
          right: SIDE,
          top: (bottom ? 1004 - (lines.length - 1) * LH : 120) - 44,
          textAlign: align,
          fontFamily: "V89Lyric, Georgia, serif",
          fontSize: FS,
          lineHeight: `${LH}px`,
          letterSpacing: "0.02em",
          color: "#f4f1ea",
          opacity: out,
          textShadow: "0 0 18px rgba(0,0,0,0.9), 0 2px 3px rgba(0,0,0,0.75)",
          whiteSpace: "nowrap",
        }}
      >
        {lines.map((ws, li) => (
          <div key={li}>{ws.map((w, i) => word(w, i, ws.length))}</div>
        ))}
      </div>
    </>
  );
};
