// Screen Showcase · the AI app's own screens: the prompt box (types, then becomes a message), the agent's steps,
// and the code editor that writes real lines, syntax-coloured, scrolling as it goes.
import React from "react";
import { CH, Dots, Win } from "./chrome";
import { C, FA, MONO, accentA, clamp, faNum } from "./theme";

/** the prompt: `n` letters of `text` typed; `compact` = already sent (a message); `send` = 0…1 button press */
export const PromptBox: React.FC<{ t: number; text: string; n: number; caret: boolean; compact?: boolean; send?: number; model?: string }> = ({ t, text, n, caret, compact, send = 0, model = "AI model · deep" }) => (
  <div style={{ borderRadius: 26, background: C.panel2, border: `1.5px solid ${accentA(compact ? 0.35 : 0.5)}`, boxShadow: `0 0 0 6px ${accentA(0.05)}`, padding: compact ? "22px 28px" : "30px 34px 24px", direction: "rtl" }}>
    <div style={{ fontFamily: FA, fontWeight: 500, fontSize: compact ? 28 : 36, lineHeight: 1.65, color: C.text, minHeight: compact ? 0 : 240 }}>
      {text.slice(0, n)}
      {caret ? <span style={{ color: C.accent, opacity: Math.floor(t * 3) % 2 ? 0.2 : 1 }}>▍</span> : null}
    </div>
    {!compact ? (
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: "rgba(255,255,255,.06)", direction: "ltr" }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: C.accent }} />
          <span style={{ fontFamily: MONO, fontSize: 21, color: C.text }}>{model}</span>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.12 * send})`, boxShadow: `0 0 ${30 * send}px ${accentA(0.6)}` }}>
          <svg width={30} height={30} viewBox="0 0 24 24">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="#160A02" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    ) : null}
  </div>
);

/** one agent step: «قدم ۲ · ساختن · styles.css», with a working indicator or a tick */
export const Step: React.FC<{ t: number; k: number; n: number; text: string; file?: string; busy?: boolean }> = ({ t, k, n, text, file, busy }) => (
  <div style={{ marginTop: 16, padding: "20px 26px", borderRadius: 20, background: C.panel2, border: `1.5px solid ${busy ? accentA(0.45) : C.line}`, opacity: clamp(k * 1.5), transform: `translateY(${(1 - k) * 24}px)`, display: "flex", alignItems: "center", justifyContent: "space-between", direction: "rtl" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ fontFamily: FA, fontWeight: 700, fontSize: 30, color: C.text }}>قدم {faNum(n)}</span>
      <span style={{ fontFamily: FA, fontWeight: 500, fontSize: 28, color: C.dim }}>{text}</span>
      {file ? <span style={{ fontFamily: MONO, fontSize: 26, color: C.cyan, direction: "ltr" }}>{file}</span> : null}
    </div>
    {busy ? <Dots t={t} /> : <span style={{ fontFamily: MONO, fontSize: 28, color: C.green }}>✓</span>}
  </div>
);

// html / css tokens → colours
const TOK = /(<!--.*-->)|(<\/?[a-z0-9]+|\/?>)|("[^"]*"?)|(\b[a-z-]+(?==))|(var\(--[a-z]+\))|(^\s*[.:][a-z-]+(?=\s))|(\b[a-z-]+(?=:\s))|(\b\d+(?:\.\d+)?(?:deg|s|vh|px|fr|%)?\b)/g;
const colorize = (line: string) => {
  const out: [string, string][] = [];
  let last = 0;
  for (const m of line.matchAll(TOK)) {
    if (m.index! > last) out.push([line.slice(last, m.index), C.text]);
    const c = m[1] ? C.faint : m[2] ? C.cyan : m[3] ? C.yellow : m[4] ? C.violet : m[5] ? C.accentHi : m[6] ? C.pink : m[7] ? C.pink : C.accentHi;
    out.push([m[0], c]);
    last = m.index! + m[0].length;
  }
  if (last < line.length) out.push([line.slice(last), C.text]);
  return out;
};

/** the editor writing `code` (p = 0…1 of all letters), tabs on top, scrolling to keep the caret in view */
export const Editor: React.FC<{ t: number; p: number; code: string[]; files?: string[]; tabAt?: number[]; x: number; y: number; w: number; h: number; style?: React.CSSProperties; badge?: string }> = ({ t, p, code, files = ["index.html", "styles.css", "script.js"], tabAt = [0, 0.55], x, y, w, h, style, badge = "writing…" }) => {
  const total = code.join("\n").length;
  let left = Math.floor(total * p);
  const shown: { s: string; cur: boolean }[] = [];
  for (const l of code) {
    if (left < 0) break;
    shown.push({ s: l.slice(0, Math.max(0, left)), cur: left <= l.length });
    left -= l.length + 1;
  }
  const lh = 46, rows = Math.floor((h - CH - 110) / lh);
  const scroll = Math.max(0, shown.length - rows) * lh;
  const tab = tabAt.filter((a) => p >= a).length - 1;
  return (
    <Win x={x} y={y} w={w} h={h} kind="app" title={files[Math.max(0, tab)]} style={style}>
      <div style={{ display: "flex", gap: 4, padding: "12px 18px 0", borderBottom: `1px solid ${C.line}`, direction: "ltr" }}>
        {files.map((f, i) => (
          <div key={f} style={{ padding: "10px 20px", borderRadius: "12px 12px 0 0", fontFamily: MONO, fontSize: 21, color: i === tab ? C.text : C.faint, background: i === tab ? C.panel2 : "transparent", borderBottom: i === tab ? `2px solid ${C.accent}` : "2px solid transparent" }}>{f}</div>
        ))}
        <div style={{ marginLeft: "auto", alignSelf: "center", display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 10, background: accentA(0.1), direction: "ltr" }}>
          <Dots t={t} size={7} />
          <span style={{ fontFamily: MONO, fontSize: 18, color: C.accent }}>{badge}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, bottom: 0, overflow: "hidden", padding: "18px 0", direction: "ltr" }}>
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          {shown.map((l, i) => (
            <div key={i} style={{ display: "flex", height: lh, alignItems: "center", fontFamily: MONO, fontSize: 25, whiteSpace: "pre", background: l.cur ? "rgba(255,255,255,.035)" : "transparent" }}>
              <span style={{ width: 70, textAlign: "right", paddingRight: 22, color: C.faint }}>{i + 1}</span>
              <span style={{ unicodeBidi: "isolate" }}>
                {colorize(l.s).map(([s, c], j) => (
                  <span key={j} style={{ color: c }}>{s}</span>
                ))}
                {l.cur ? <span style={{ color: C.accent, opacity: Math.floor(t * 4) % 2 ? 0.25 : 1 }}>▍</span> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Win>
  );
};
