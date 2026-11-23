// Light Swarm Epic · extra 2D pieces: the prompt bar, the views counter, the terminal and the finale countdown.
import React from "react";
import { AN, CH, COPY, TOTAL, W, clamp, ease, hit, ramp } from "./theme";
import { ACC, INK } from "./type";

/** a glass prompt bar: the text types itself, the return key lights on `enter` */
export const PromptBar: React.FC<{ t: number; t0: number; t1: number; text: string; enter: number }> = ({ t, t0, t1, text, enter }) => {
  if (t < t0 || t >= t1 + 0.25) return null;
  const u = ease.out(ramp(t, t0, t0 + 0.3));
  const out = 1 - ramp(t, t1, t1 + 0.25);
  const typeEnd = Math.max(t0 + 0.5, enter - 0.25);
  const n = Math.floor(text.length * clamp((t - t0 - 0.25) / (typeEnd - t0 - 0.25)));
  const caret = Math.floor(t * 2.4) % 2 === 0 && t < enter;
  const k = hit(t, enter, 0.18);
  return (
    <div style={{ position: "absolute", left: (W - 980) / 2, top: 890, width: 980, height: 92, opacity: u * out, transform: `translateY(${(20 * (1 - u)).toFixed(1)}px)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 46, background: "rgba(16,12,9,0.62)", border: "1px solid rgba(255,220,190,0.22)", boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 ${24 + 40 * k}px rgba(255,138,61,${0.12 + 0.4 * k})`, backdropFilter: "blur(10px)" }} />
      <div style={{ position: "absolute", left: 34, top: 0, height: 92, display: "flex", alignItems: "center", gap: 22 }}>
        <span style={{ fontFamily: CH, fontSize: 34, color: ACC }}>✦</span>
        <span style={{ fontFamily: CH, fontWeight: 500, fontSize: 36, color: INK, letterSpacing: "0.01em", whiteSpace: "pre" }}>
          {text.slice(0, n)}
          <span style={{ opacity: caret ? 1 : 0, color: ACC }}>|</span>
        </span>
      </div>
      <div style={{ position: "absolute", right: 16, top: 14, width: 64, height: 64, borderRadius: 32, background: k > 0.02 ? ACC : "rgba(255,240,225,0.1)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${(1 + 0.18 * k).toFixed(3)})` }}>
        <span style={{ fontFamily: CH, fontWeight: 700, fontSize: 30, color: k > 0.02 ? "#120b07" : "rgba(255,240,225,0.7)" }}>↑</span>
      </div>
    </div>
  );
};

/** the creator's views: rolls between keyframes, sits top-right under the brand */
export const Views: React.FC<{ t: number; keys: [number, number][]; on: [number, number][] }> = ({ t, keys, on }) => {
  const span = on.find(([a, b]) => t >= a && t < b + 0.3);
  if (!span) return null;
  const o = ease.out(ramp(t, span[0], span[0] + 0.35)) * (1 - ramp(t, span[1], span[1] + 0.3));
  let v = keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [ta, va] = keys[i];
    const [tb, vb] = keys[i + 1];
    if (t >= ta && t < tb) {
      const k = ease.out(ramp(t, ta, ta + Math.min(1.6, tb - ta)));
      v = va * Math.pow(vb / Math.max(1, va), k);
      break;
    }
    if (t >= tb) v = vb;
  }
  const num = Math.round(v).toLocaleString("en-US");
  const bump = keys.reduce((s, [a]) => s + hit(t, a, 0.15), 0);
  return (
    <div style={{ position: "absolute", right: 96, top: 120, display: "flex", flexDirection: "column", alignItems: "flex-end", opacity: o }}>
      <div style={{ fontFamily: CH, fontWeight: 500, fontSize: 15, letterSpacing: "0.42em", color: "rgba(255,240,225,0.6)" }}>VIEWS</div>
      <div style={{ fontFamily: AN, fontSize: 86, lineHeight: 1.05, color: INK, transform: `scale(${(1 + 0.08 * Math.min(1, bump)).toFixed(3)})`, transformOrigin: "100% 50%", textShadow: "0 0 30px rgba(255,138,61,0.3), 0 8px 30px rgba(0,0,0,0.6)" }}>{num}</div>
      <div style={{ width: 160, height: 2, background: ACC, marginTop: 4 }} />
    </div>
  );
};

/** 1966: an amber phosphor terminal, the lines type themselves */
export const Terminal: React.FC<{ t: number; t0: number; t1: number; lines: string[] }> = ({ t, t0, t1, lines }) => {
  if (t < t0 || t >= t1) return null;
  const o = ease.out(ramp(t, t0, t0 + 0.25)) * (1 - ramp(t, t1 - 0.12, t1));
  const per = (t1 - t0 - 0.4) / lines.length;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(18,10,4,0.82) 30%, rgba(0,0,0,0.95) 100%)" }} />
      <div style={{ position: "absolute", left: 300, top: 330, width: 1320, fontFamily: CH, fontWeight: 500, fontSize: 40, lineHeight: "74px", color: "#FFB26B", textShadow: "0 0 14px rgba(255,150,60,0.75), 0 0 2px #FFD9B0", letterSpacing: "0.04em" }}>
        {lines.map((l, i) => {
          const a = t0 + 0.2 + i * per;
          const n = Math.floor(l.length * clamp((t - a) / (per * 0.7)));
          if (t < a) return null;
          const caret = n < l.length || (i === lines.length - 1 && Math.floor(t * 2.5) % 2 === 0);
          return (
            <div key={i} style={{ whiteSpace: "pre", opacity: l.startsWith(">") ? 0.75 : 1 }}>
              {l.slice(0, n)}
              {caret && i === lines.findIndex((_, j) => t < t0 + 0.2 + (j + 1) * per || j === lines.length - 1) ? "█" : ""}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 5px)", mixBlendMode: "multiply" }} />
    </div>
  );
};

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
/** the finale: the countdown leaves the top and grows in the centre; the last ten seconds slam one by one; then LIVE */
export const FinaleTimer: React.FC<{ t: number; start: number; end: number }> = ({ t, start, end }) => {
  if (t < start) return null;
  const left = Math.max(0, end - t);
  const s = Math.ceil(left - 1e-6);
  const m = ease.io(ramp(t, start, Math.min(start + 5, end - 10)));
  if (t >= end) {
    const u = ease.expo(ramp(t, end, end + 0.25));
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: AN, fontSize: 230, color: INK, letterSpacing: "0.04em", transform: `scale(${(1.3 - 0.3 * u).toFixed(3)})`, opacity: u, textShadow: "0 0 50px rgba(255,138,61,0.45), 0 10px 50px rgba(0,0,0,0.7)" }}>{COPY.live}</div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 18, opacity: ease.out(ramp(t, end + 0.3, end + 0.8)) }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#FF4A2E", boxShadow: "0 0 16px #FF4A2E" }} />
          <span style={{ fontFamily: CH, fontWeight: 600, fontSize: 30, letterSpacing: "0.5em", color: INK }}>{COPY.brand}</span>
        </div>
      </div>
    );
  }
  if (left <= 10) {
    const k = ease.expo(ramp(t - Math.floor(t), 0, 0.12));
    const fr = t - Math.floor(t);
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontFamily: CH, fontWeight: 500, fontSize: 18, letterSpacing: "0.5em", color: "rgba(255,240,225,0.7)", marginBottom: 10 }}>{COPY.startsIn}</div>
        <div style={{ fontFamily: AN, fontSize: 420, lineHeight: 1, color: INK, transform: `scale(${(1.25 - 0.25 * k + 0.04 * fr).toFixed(3)})`, opacity: 0.35 + 0.65 * k, filter: k < 0.95 ? `blur(${(8 * (1 - k)).toFixed(1)}px)` : undefined, textShadow: "0 0 60px rgba(255,138,61,0.4), 0 10px 60px rgba(0,0,0,0.75)" }}>{s}</div>
      </div>
    );
  }
  const y = 44 + (690 - 44) * m;
  const sc = 1 + 1.9 * m;
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: W, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${sc.toFixed(3)})`, transformOrigin: "50% 0" }}>
      <div style={{ fontFamily: CH, fontWeight: 500, fontSize: 14, letterSpacing: "0.46em", paddingLeft: "0.46em", color: "rgba(255,240,225,0.6)" }}>{COPY.startsIn}</div>
      <div style={{ marginTop: 4, fontFamily: CH, fontWeight: 500, fontSize: 52, lineHeight: "1.08em", color: INK, textShadow: "0 0 22px rgba(255,150,70,0.35)" }}>{mmss(s)}</div>
      <div style={{ marginTop: 9, width: 232, height: 1, background: "rgba(255,240,225,0.16)" }}>
        <div style={{ width: `${(100 * left) / TOTAL}%`, height: 1, background: ACC, boxShadow: `0 0 8px ${ACC}` }} />
      </div>
    </div>
  );
};
