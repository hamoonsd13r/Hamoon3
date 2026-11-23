// Screen Showcase · captions in short chunks (≤ 5 words / ~20 letters, never split after a joining word), each word
// lighting up as it is said, key words in the accent. One chunk on screen at a time.
import React from "react";
import { C, FA, SHADOW, eo, ramp } from "./theme";
import type { Word } from "./words";

export type Chunk = { si: number; s: number; e: number; ws: { w: string; s: number; key: boolean }[] };
const clean = (w: string) => w.replace(/[:،,.؟?!«»"]/g, "");
const SUFFIX = new Set(["ها", "های", "هایی", "تر"]);
const GLUE_AFTER = new Set(["و", "در", "با", "از", "به", "که", "یا", "برای", "تا", "یه", "یک", "توی", "چه", "این", "اون"]);
const GLUE_BEFORE = new Set(["مصنوعی"]);

/** build the caption chunks once from the word list; `key` marks words drawn in the accent */
export const makeChunks = (words: Word[], key: RegExp = /$^/): Chunk[] => {
  const out: Chunk[] = [];
  for (const si of [...new Set(words.map((w) => w.si))]) {
    const toks: { w: string; raw: string; s: number; e: number }[] = [];
    for (const w of words.filter((x) => x.si === si)) {
      const c = clean(w.w);
      const p = toks[toks.length - 1];
      if (c === "مصنوعی" && p?.w === "هوش") {
        p.w += " " + c; p.raw += " " + w.w; p.e = w.e; // never wrap «هوش مصنوعی»
      } else if (SUFFIX.has(c) && p) {
        p.w += "‌" + c; p.raw = p.raw.replace(/[:،,.؟?!]$/, "") + "‌" + w.w; p.e = w.e;
      } else toks.push({ w: c, raw: w.w, s: w.s, e: w.e });
    }
    let cur: Chunk | null = null;
    toks.forEach((tk, i) => {
      if (!cur) cur = { si, s: tk.s, e: tk.e, ws: [] };
      cur.ws.push({ w: tk.w, s: tk.s, key: key.test(tk.w) });
      cur.e = tk.e;
      const last = i === toks.length - 1;
      const punct = /[:،,.؟?!؛]$/.test(tk.raw);
      const len = cur.ws.map((x) => x.w).join(" ").length;
      const glued = GLUE_AFTER.has(tk.w) || (!last && GLUE_BEFORE.has(toks[i + 1].w));
      if (last || punct || ((cur.ws.length >= 5 || len > 20) && !glued)) {
        out.push(cur);
        cur = null;
      }
    });
  }
  // a lone word joins the chunk before it (same sentence, short enough)
  for (let i = out.length - 1; i > 0; i--) {
    const c = out[i], p = out[i - 1];
    const len = [...p.ws, ...c.ws].map((x) => x.w).join(" ").length;
    if (c.ws.length === 1 && p.si === c.si && len <= 34) {
      p.ws.push(...c.ws);
      p.e = c.e;
      out.splice(i, 1);
    }
  }
  for (let i = 0; i < out.length; i++) out[i].e = i + 1 < out.length ? Math.min(out[i + 1].s, out[i].e + 1.2) : out[i].e + 1.2;
  return out;
};

export const Subtitle: React.FC<{ t: number; chunks: Chunk[]; hide?: boolean; y?: number }> = ({ t, chunks, hide, y = 1480 }) => {
  const ch = chunks.find((c) => t >= c.s - 0.02 && t < c.e);
  if (!ch || hide) return null;
  const k = eo(ramp(t, ch.s - 0.02, ch.s + 0.2));
  const out = 1 - ramp(t, ch.e - 0.1, ch.e);
  return (
    <div style={{ position: "absolute", left: 70, right: 120, top: y - 70, height: 140, display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{ fontFamily: FA, fontWeight: 700, fontSize: 56, lineHeight: 1.3, textAlign: "center", opacity: k * out, transform: `translateY(${(1 - k) * 16}px)`, filter: k < 1 ? `blur(${(1 - k) * 5}px)` : undefined, textShadow: SHADOW }}>
        {ch.ws.map((w, i) => {
          const on = t >= w.s - 0.03;
          return (
            <span key={i} style={{ color: on ? (w.key ? C.accent : C.text) : "rgba(242,241,245,0.3)" }}>
              {w.w}
              {i < ch.ws.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};
