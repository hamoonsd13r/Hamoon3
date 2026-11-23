// Inside App · the phone app (dark) — every piece measured on reference frames (720×1280) and drawn ×1.5.
// Pure presentational pieces; Segment.tsx drives them from the segment clock.
import React from "react";
import { Img, staticFile } from "remotion";
import { APP, C, F, s, type Attach } from "./theme";
import { ArrowUp, Close, Compose, Glyph, Hamburger, Mic, Play, Plus, Sliders } from "./icons";

const abs = (x: number, y: number, w: number, h: number): React.CSSProperties => ({ position: "absolute", left: s(x), top: s(y), width: s(w), height: s(h) });

/** width of a string in a loaded font (output px) — measured once per string */
const MEAS = new Map<string, number>();
export const lineW = (str: string, px: number, family = F.ui) => {
  const key = `${family}|${px}|${str}`;
  const hit = MEAS.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") return str.length * px * 0.52;
  const cv = document.createElement("canvas").getContext("2d")!;
  cv.font = `${px}px ${family}`;
  const w = cv.measureText(str).width;
  MEAS.set(key, w);
  return w;
};

// ── top bar ───────────────────────────────────────────────────────────────────────────────────────────────────
export const TopBar: React.FC<{ compose?: number }> = ({ compose = 1 }) => (
  <>
    <div style={{ ...abs(24, 27, 64, 64), borderRadius: "50%", background: C.panel, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Hamburger size={s(30)} />
    </div>
    <div style={{ ...abs(241, 27, 238, 64), borderRadius: s(32), background: C.panel, boxShadow: `inset 0 0 0 ${s(1)}px rgba(255,255,255,0.035)` }}>
      <div style={{ ...abs(120, 5, 113, 54), borderRadius: s(27), background: C.panelHi }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: s(120), height: s(64), display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: s(4), fontFamily: F.ui, fontSize: s(24.5), color: "#8F8B8E" }}>{APP.tabs[0]}</div>
      <div style={{ position: "absolute", left: s(120), top: 0, width: s(113), height: s(64), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontSize: s(24.5), color: C.text }}>{APP.tabs[1]}</div>
    </div>
    {compose > 0.001 ? (
      <div style={{ ...abs(632, 27, 64, 64), borderRadius: "50%", background: C.panel, display: "flex", alignItems: "center", justifyContent: "center", opacity: compose }}>
        <Compose size={s(27)} />
      </div>
    ) : null}
  </>
);

// ── attachments ───────────────────────────────────────────────────────────────────────────────────────────────
/** a thumbnail (clip/image) or a pasted-text chip, drawn into a w×h box (output px) */
export const AttachBox: React.FC<{ a: Attach; w: number; h: number; badge?: boolean; play?: boolean }> = ({ a, w, h, badge, play = true }) => {
  const k = w / s(146);
  if (a.kind === "pasted") {
    return (
      <div style={{ position: "relative", width: w, height: h, borderRadius: s(14) * k, background: "#2B282B", boxShadow: `inset 0 0 0 ${s(1)}px rgba(255,255,255,0.09)`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: s(13) * k, top: s(12) * k, right: s(10) * k, fontFamily: F.ui, fontSize: s(17.5) * k, lineHeight: 1.22, color: "#E9E6E8", letterSpacing: s(-0.15) * k }}>
          {a.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div style={{ position: "absolute", left: s(12) * k, bottom: s(12) * k, padding: `${s(3) * k}px ${s(7) * k}px`, borderRadius: s(5) * k, background: "#3E3A3E", fontFamily: F.ui, fontWeight: 700, fontSize: s(10.5) * k, letterSpacing: s(0.9) * k, color: "#B4B0B3" }}>PASTED</div>
        {badge ? <Badge k={k} /> : null}
      </div>
    );
  }
  if (a.kind === "swatch") {
    return (
      <div style={{ position: "relative", width: w, height: h, borderRadius: s(16) * k, overflow: "hidden", background: `linear-gradient(150deg, ${a.from}, ${a.to})` }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 4px 4px, rgba(255,255,255,.18) 1.2px, transparent 1.9px)", backgroundSize: "9px 9px", opacity: 0.55 }} />
        {a.label ? <div style={{ position: "absolute", left: 0, right: 0, top: "34%", textAlign: "center", fontFamily: F.ui, fontWeight: 800, fontSize: s(30) * k, color: "rgba(255,255,255,.92)", letterSpacing: s(1) * k }}>{a.label}</div> : null}
        {a.play && play ? (
          <div style={{ position: "absolute", left: s(9) * k, bottom: s(9) * k, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}>
            <Play size={s(19) * k} />
          </div>
        ) : null}
        {badge ? <Badge k={k} /> : null}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: s(16) * k, overflow: "hidden", background: "#111" }}>
      <Img src={staticFile(a.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {a.kind === "clip" && play ? (
        <div style={{ position: "absolute", left: s(9) * k, bottom: s(9) * k, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}>
          <Play size={s(19) * k} />
        </div>
      ) : null}
      {badge ? <Badge k={k} /> : null}
    </div>
  );
};
const Badge: React.FC<{ k: number }> = ({ k }) => (
  <div style={{ position: "absolute", right: s(10) * k, top: s(10) * k, width: s(27) * k, height: s(27) * k, borderRadius: "50%", background: "rgba(24,22,24,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Close size={s(15) * k} />
  </div>
);

// ── composer ──────────────────────────────────────────────────────────────────────────────────────────────────
/** composer geometry (reference px) for an attachment kind */
export const composerGeo = (a: Attach | null) => {
  if (!a) return { top: 694, h: 157, att: 0, textY: 746, iconY: 813 };
  const att = a.kind === "pasted" ? 123 : 146;
  const h = att + 156;
  const top = 850 - h;
  return { top, h, att, textY: top + 22 + att + 15 + 18, iconY: top + h - 10 - 28 };
};

export const Composer: React.FC<{
  attach: Attach | null; text: string; cursor: boolean; sendDown?: number; hideContent?: number; y?: number;
}> = ({ attach, text, cursor, sendDown = 0, hideContent = 0, y = 0 }) => {
  const g = composerGeo(attach);
  return (
    <div style={{ position: "absolute", left: s(18), top: s(g.top) + y, width: s(684), height: s(g.h), borderRadius: s(28), background: C.panel, boxShadow: `inset 0 0 0 ${s(1)}px ${C.border}` }}>
      <div style={{ opacity: 1 - hideContent }}>
        {attach ? (
          <div style={{ position: "absolute", left: s(22), top: s(22) }}>
            <AttachBox a={attach} w={s(attach.kind === "pasted" ? 123 : 146)} h={s(attach.kind === "pasted" ? 123 : 146)} badge />
          </div>
        ) : null}
        <div style={{ position: "absolute", left: s(24), top: s(g.textY - g.top - 19), height: s(38), display: "flex", alignItems: "center", fontFamily: F.ui, fontSize: s(28), color: C.text, whiteSpace: "pre" }}>
          {text}
          {cursor ? <span style={{ display: "inline-block", width: s(2.2), height: s(31), marginLeft: s(1.5), background: C.accent, borderRadius: s(1) }} /> : null}
        </div>
      </div>
      {/* icon row */}
      <div style={{ position: "absolute", left: s(60 - 18 - 13), top: s(g.iconY - g.top - 13) }}>
        <Plus size={s(26)} />
      </div>
      <div style={{ position: "absolute", left: s(116 - 18 - 14), top: s(g.iconY - g.top - 14) }}>
        <Sliders size={s(28)} />
      </div>
      <div style={{ position: "absolute", left: s(605 - 18 - 13), top: s(g.iconY - g.top - 14) }}>
        <Mic size={s(26)} c="#CFCBCE" />
      </div>
      <div style={{ position: "absolute", left: s(635 - 18), top: s(g.iconY - g.top - 28), width: s(56), height: s(56), borderRadius: s(14), background: C.send, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.07 * sendDown})`, filter: sendDown > 0 ? `brightness(${1 - 0.18 * sendDown})` : undefined }}>
        <ArrowUp size={s(28)} />
      </div>
    </div>
  );
};

export const Suggest: React.FC<{ cmd: string; desc: string; bottom: number; a: number }> = ({ cmd, desc, bottom, a }) =>
  a <= 0.001 ? null : (
    <div style={{ ...abs(18, bottom - 100, 684, 100), borderRadius: s(24), background: "#241F24", boxShadow: `inset 0 0 0 ${s(1)}px rgba(255,255,255,0.05)`, opacity: a, transform: `translateY(${(1 - a) * s(10)}px)` }}>
      <div style={{ ...abs(11, 10, 662, 80), borderRadius: s(17), background: C.sugg }}>
        <div style={{ position: "absolute", left: s(16), top: s(10), fontFamily: F.ui, fontSize: s(27), color: C.text }}>{cmd}</div>
        <div style={{ position: "absolute", left: s(16), top: s(47), fontFamily: F.ui, fontSize: s(19.5), color: C.desc }}>{desc}</div>
      </div>
    </div>
  );

// ── the input bar after sending ───────────────────────────────────────────────────────────────────────────────
export const InputBar: React.FC<{ a?: number; y?: number }> = ({ a = 1, y = 0 }) => (
  <div style={{ ...abs(18, 1162, 684, 90), top: s(1162) + y, borderRadius: s(45), background: "#1E1B1F", boxShadow: `inset 0 0 0 ${s(1)}px rgba(255,255,255,0.075)`, opacity: a }}>
    <div style={{ position: "absolute", left: s(39 - 13), top: s(45 - 13) }}>
      <Plus size={s(26)} />
    </div>
    <div style={{ position: "absolute", left: s(75), top: 0, height: s(90), display: "flex", alignItems: "center", fontFamily: F.ui, fontSize: s(29), color: C.text3 }}>{APP.placeholder}</div>
    <div style={{ position: "absolute", left: s(578 - 13), top: s(45 - 14) }}>
      <Mic size={s(26)} c="#CFCBCE" />
    </div>
    <div style={{ position: "absolute", left: s(615), top: s(17), width: s(56), height: s(56), borderRadius: s(14), background: "#2E2B2F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ArrowUp size={s(26)} />
    </div>
  </div>
);

// ── the assistant's status line ──────────────────────────────────────────────────────────────────────────────────────
/** spark + "Editing with match-cut..." typed in `n` characters; the spark turns while it works */
export const Status: React.FC<{ text: string; n: number; spark: number; spin: number; shimmer: number; white?: boolean; rtl?: boolean; y?: number }> = ({ text, n, spark, spin, shimmer, white, rtl, y = 270 }) => {
  if (spark <= 0.001) return null;
  const shown = text.slice(0, Math.max(0, Math.floor(n)));
  const base = white ? "#ECE9EB" : C.text2;
  // RTL lines are typed from a fixed right edge: the box gets the full line's width up front
  const line: React.CSSProperties = {
    position: "absolute", left: s(81), top: s(y - 17), height: s(34), display: "flex", alignItems: "center", whiteSpace: "pre",
    fontFamily: rtl ? F.vz : F.ui, fontSize: s(rtl ? 23 : 24.5), direction: rtl ? "rtl" : "ltr",
    width: rtl ? lineW(text, s(23), F.vz) + 4 : undefined,
  };
  // the "working" shimmer: a white copy of the line seen through a moving soft window (background-clip:text
  // renders as a white box in headless Chrome — v28 lesson)
  const p = shimmer * 160 - 30;
  return (
    <>
      <div style={{ position: "absolute", left: s(46 - 20), top: s(y - 20), width: s(40), height: s(40), transform: `scale(${spark})` }}>
        <Glyph size={s(40)} spin={spin} />
      </div>
      <div style={{ ...line, color: base }}>{shown}</div>
      {shimmer >= 0 && shimmer <= 1 ? (
        <div style={{ ...line, color: "#FFFFFF", WebkitMaskImage: `linear-gradient(100deg, transparent ${p - 18}%, #000 ${p}%, transparent ${p + 18}%)`, maskImage: `linear-gradient(100deg, transparent ${p - 18}%, #000 ${p}%, transparent ${p + 18}%)` }}>{shown}</div>
      ) : null}
    </>
  );
};

// ── the user's message (attachment above, command pill below), right-aligned ──────────────────────────────────
/** pill at y (reference px top), right edge 693; plain = grey bubble (unknown command) */
export const Pill: React.FC<{ cmd: string; y: number; plain?: boolean; a?: number }> = ({ cmd, y, plain, a = 1 }) => (
  <div style={{ position: "absolute", right: s(720 - 693), top: s(y), height: s(54), padding: `0 ${s(23)}px`, borderRadius: s(27), background: plain ? C.bubble : C.pill, display: "flex", alignItems: "center", fontFamily: F.ui, fontSize: s(28.5), color: plain ? C.text : C.pillText, opacity: a, whiteSpace: "pre" }}>
    {cmd}
  </div>
);
