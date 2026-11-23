// Submarine Vote · the voice screen: a phone, the speaking character big in the middle (its mouth follows the words),
// its name, the words being said (each appears when it is said, the chunk's room reserved up front), a recorder
// waveform, and the rest of the cast along the bottom — the one being named gets a red ring, the saved ones light up.
import React from "react";
import { Char, COL, POSE, type Model, type Pose } from "./cast";
import { F, clamp, hash, kick, lerp, out3, ramp } from "./theme";
import type { Word } from "./words";

/** speaking amplitude 0..1 from the word times (use a real envelope if you have one) */
export const ampOf = (words: Word[], t: number) => {
  let v = 0;
  for (const w of words) if (t >= w.s - 0.03 && t <= w.e + 0.05) v = Math.max(v, 0.55 + 0.45 * hash(w.s * 13.7));
  return v * (0.7 + 0.3 * Math.abs(Math.sin(t * 41)));
};

/** the line in chunks of ≤ n words; returns the chunk being said */
export const chunkOf = (words: Word[], t: number, n = 3) => {
  const chunks: Word[][] = [];
  for (let i = 0; i < words.length; i += n) chunks.push(words.slice(i, i + n));
  let cur = -1;
  chunks.forEach((c, i) => {
    if (t >= c[0].s - 0.05) cur = i;
  });
  return cur < 0 ? null : chunks[cur];
};

const Wave: React.FC<{ words: Word[]; t: number }> = ({ words, t }) => {
  const W = 616, N = 77, SPAN = 2.0;
  return (
    <svg width={W} height={170} viewBox={`0 -85 ${W} 170`} style={{ position: "absolute", left: (1080 - W) / 2, top: 1062 - 85, overflow: "visible" }}>
      <line x1={0} y1={0} x2={W} y2={0} stroke="#fff" strokeWidth={1.6} opacity={0.5} />
      {Array.from({ length: N }, (_, i) => {
        const tt = t - ((N - 1 - i) / N) * SPAN;
        const v = ampOf(words, tt) * (0.55 + 0.45 * Math.abs(Math.sin(tt * 61)));
        const h = 3 + 150 * Math.pow(v, 1.1);
        return <rect key={i} x={i * (W / N)} y={-h / 2} width={4.2} height={h} rx={2.1} fill="#fff" opacity={0.92} />;
      })}
    </svg>
  );
};

export const PhoneScreen: React.FC<{
  who: Model;
  names: Record<Model, string>;
  cast: Model[];
  words: Word[]; // the words of this line
  t: number;
  t0: number; // when this screen cut in
  accuse?: Model;
  accuseAt?: number; // when the accused's name is said
  saved?: number; // how many of the others light up (0..4)
  pose?: Partial<Pose>;
}> = ({ who, names, cast, words, t, t0, accuse, accuseAt = 0, saved = 0, pose = {} }) => {
  const col = COL[who];
  const a = ampOf(words, t);
  const inK = out3(ramp(t, t0, t0 + 0.22));
  const float = Math.sin(t * 1.3) * 5;
  const others = cast.filter((m) => m !== who);
  const ch = chunkOf(words, t);
  const named = accuse ? clamp((t - accuseAt) / 0.18) : 0;
  const pop = accuse ? kick(t, accuseAt, 0.45) : 0;
  const p: Pose = { ...POSE, shake: 0.6, mouth: a > 0.05 ? "o" : "flat", open: 0.15 + 0.85 * a, wide: 0.4, ...pose };
  const PX = 128, PY = 128, PW = 824, PH = 1688, R = 104;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#020205", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -200, background: `radial-gradient(60% 46% at 50% 54%, ${col.shade}88, rgba(0,0,0,0) 70%)`, opacity: 0.55 + 0.25 * a }} />
      <div style={{ position: "absolute", left: PX, top: PY + float, width: PW, height: PH, transform: `scale(${lerp(0.972, 1, inK)})` }}>
        <div style={{ position: "absolute", inset: -7, borderRadius: R + 7, background: "linear-gradient(145deg,#3a3b40,#131316 30%,#0c0c0e 70%,#2a2b30)", boxShadow: "0 30px 90px rgba(0,0,0,.8)" }} />
        <div style={{ position: "absolute", inset: 10, borderRadius: R - 8, background: "#14161E", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 46% at 50% 104%, ${col.base}66, rgba(0,0,0,0) 100%)`, opacity: 0.8 + 0.2 * a }} />
          <div style={{ position: "absolute", left: -300 + ((t - t0) * 190) % 1700, top: -200, width: 160, height: 2200, transform: "rotate(18deg)", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.035), rgba(255,255,255,0))" }} />
        </div>
        <div style={{ position: "absolute", left: (PW - 264) / 2, bottom: 30, width: 264, height: 9, borderRadius: 5, background: "rgba(255,255,255,.28)" }} />
        <div style={{ position: "absolute", left: (PW - 404) / 2, top: 6, width: 404, height: 98, borderRadius: "0 0 46px 46px", background: "#040405" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${float}px) scale(${lerp(0.972, 1, inK)})`, transformOrigin: "50% 50%" }}>
        {/* the speaker */}
        <div style={{ position: "absolute", left: 540 - 300, top: 470 - 300, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(closest-side, ${col.light}AA, rgba(0,0,0,0) 62%)`, opacity: 0.35 + 0.5 * a, transform: `scale(${1 + 0.08 * a})` }} />
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <Char m={who} x={540} y={700} s={1.25 * (1 + 0.03 * a)} p={p} t={t} seed={7} cool={0.2} />
        </svg>
        <div style={{ position: "absolute", left: 0, width: 1080, top: 728, textAlign: "center", direction: "rtl", fontFamily: F.fa, fontSize: 60, color: "#fff" }}>{names[who]}</div>
        {/* the words */}
        {ch && (
          <div dir="rtl" style={{ position: "absolute", left: 0, width: 1080, top: 850, height: 120, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 22, fontFamily: F.fa, fontSize: 80, color: "#fff", whiteSpace: "nowrap", textShadow: "0 4px 18px rgba(0,0,0,.55)" }}>
            {ch.map((w, i) => {
              const k = out3(ramp(t, w.s - 0.03, w.s + 0.14));
              return (
                <span key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 16}px)`, color: accuse && names[accuse] && w.w.includes(names[accuse]) ? "#FF6B5E" : "#fff" }}>
                  {w.w}
                </span>
              );
            })}
          </div>
        )}
        <Wave words={words} t={t} />
        {/* the rest of the cast */}
        {others.map((m, i) => {
          const x = 273 + i * 178;
          const isNamed = m === accuse;
          const lit = isNamed ? named : saved > i ? 1 : 0;
          const pp = isNamed ? pop : 0;
          return (
            <div key={m} style={{ position: "absolute", left: x - 80, top: 1300, width: 160, textAlign: "center" }}>
              {isNamed && <div style={{ position: "absolute", left: 80 - 70, top: -10, width: 140, height: 140, borderRadius: 36, opacity: named, border: "5px solid #FF4B3E", boxShadow: "0 0 26px rgba(255,60,50,.65), inset 0 0 18px rgba(255,60,50,.35)", transform: `scale(${1 + 0.3 * pp})` }} />}
              <svg width={160} height={130} viewBox="-80 -150 160 130" style={{ overflow: "visible", transform: `scale(${1 + 0.25 * pp + 0.06 * lit})`, filter: lit > 0.5 ? "none" : "grayscale(.85) brightness(.75)" }}>
                <Char m={m} x={0} y={-10} s={0.42} p={{ ...POSE, shake: 0, wide: isNamed ? 1 : 0.5, mouth: isNamed ? "o" : "flat", open: isNamed ? 0.8 : 0.2 }} t={t} seed={i} cool={0} />
              </svg>
              <div style={{ marginTop: 6, fontFamily: F.faB, fontSize: 30, color: lit > 0.5 ? "#fff" : "#8E90A0" }}>{names[m]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
