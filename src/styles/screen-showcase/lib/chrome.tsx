// Screen Showcase · chrome: the window frame (browser or app), the hard-cut entrance, chips, the coding-night
// backdrop, the top path bar and the bottom status line.
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FA, MONO, accentA, clamp, eo, ramp } from "./theme";

export const CH = 50; // window title bar height
export const Win: React.FC<{
  x: number; y: number; w: number; h: number; kind?: "browser" | "app"; url?: string; title?: string; live?: boolean;
  /** a small mark before the app title (your logo as a node) */ icon?: React.ReactNode;
  /** a button in the title bar (e.g. «انتشار»), drawn on the left */ action?: React.ReactNode;
  style?: React.CSSProperties; children?: React.ReactNode;
}> = ({ x, y, w, h, kind = "browser", url = "yoursite.app", title = "Your App", live, icon, action, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 24, overflow: "hidden", background: C.panel, border: `1px solid ${C.line}`, boxShadow: "0 40px 120px rgba(0,0,0,.7), 0 0 0 1px rgba(0,0,0,.4)", ...style }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: CH, background: C.chrome, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 10 }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.75 }} />)}
      {action ? <div style={{ marginLeft: 14 }}>{action}</div> : null}
      {kind === "browser" ? (
        <div style={{ margin: "0 auto", height: 30, minWidth: "46%", padding: "0 18px", borderRadius: 15, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, direction: "ltr" }}>
          {live ? <div style={{ width: 9, height: 9, borderRadius: 5, background: C.accent, boxShadow: `0 0 10px ${C.accent}` }} /> : null}
          <span style={{ fontFamily: /[؀-ۿ]/.test(url) ? FA : MONO, fontWeight: 500, fontSize: 19, color: C.dim }}>{url}</span>
        </div>
      ) : (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, direction: "rtl" }}>
          {icon}
          <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 20, color: C.dim }}>{title}</span>
        </div>
      )}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: CH, bottom: 0, overflow: "hidden" }}>{children}</div>
  </div>
);

/** window entrance on a hard cut: no fade (never an empty frame), a short scale + blur settle */
export const enter = (t: number, t0: number, d = 0.32): React.CSSProperties => {
  const k = eo(ramp(t, t0, t0 + d));
  return { transform: `scale(${1.045 - 0.045 * k})`, filter: k < 1 ? `blur(${(1 - k) * 8}px)` : undefined };
};

export const Chip: React.FC<{ k: number; children: React.ReactNode; accent?: boolean; style?: React.CSSProperties }> = ({ k, children, accent, style }) => (
  <div
    style={{
      opacity: clamp(k * 1.5), transform: `translateY(${(1 - k) * 18}px) scale(${0.9 + 0.1 * k})`, display: "inline-flex", alignItems: "center", gap: 12,
      padding: "14px 26px", borderRadius: 18, direction: "rtl", fontFamily: FA, fontWeight: 700, fontSize: 32,
      background: accent ? C.accent : "rgba(20,21,28,.92)", color: accent ? "#160A02" : C.text, border: `1.5px solid ${accent ? C.accent : "rgba(255,255,255,.12)"}`,
      boxShadow: "0 20px 50px rgba(0,0,0,.5)", whiteSpace: "nowrap", ...style,
    }}
  >
    {children}
  </div>
);

/** near-black, a slowly rising grid, two drifting colour glows, code scrolling far behind, a vignette */
export const Backdrop: React.FC<{ t: number; code?: string[] }> = ({ t, code = BG_CODE }) => (
  <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
    <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "60px 60px", backgroundPosition: `0 ${-(t * 14) % 60}px` }} />
    <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: 550, left: -420 + Math.sin(t * 0.21) * 60, top: 120 + Math.cos(t * 0.17) * 50, background: `radial-gradient(circle, ${C.glowA}, rgba(0,0,0,0) 62%)` }} />
    <div style={{ position: "absolute", width: 1200, height: 1200, borderRadius: 600, left: 380 + Math.cos(t * 0.19) * 60, top: 820 + Math.sin(t * 0.23) * 60, background: `radial-gradient(circle, ${C.glowB}, rgba(0,0,0,0) 62%)` }} />
    <div style={{ position: "absolute", left: 50, right: 50, top: 300, bottom: 260, overflow: "hidden", opacity: 0.05, direction: "ltr" }}>
      <div style={{ transform: `translateY(${-(t * 22) % 520}px)` }}>
        {Array.from({ length: 48 }, (_, i) => (
          <div key={i} style={{ fontFamily: MONO, fontSize: 24, lineHeight: "52px", color: C.text, whiteSpace: "nowrap" }}>{code[i % code.length]}</div>
        ))}
      </div>
    </div>
    <AbsoluteFill style={{ background: "radial-gradient(90% 70% at 50% 45%, rgba(7,8,11,0), rgba(7,8,11,.75))" }} />
  </AbsoluteFill>
);
const BG_CODE = [
  ".hero { min-height: 100vh; display: grid; place-items: center; }",
  "export default function Page() {",
  "  return <main>{items.map((p) => <Card key={p.id} {...p} />)}</main>;",
  "}",
  ".btn { border-radius: 999px; padding: 14px 28px; }",
  "npm run build && npm run deploy",
  ".grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }",
  ":root { --accent: #ff8a3d; --ink: #101218; }",
];

/** top line: a terminal path on the left, the section tag on the right */
export const TopBar: React.FC<{ t: number; path?: string; tag?: string }> = ({ t, path = "my-site", tag }) => (
  <>
    <div style={{ position: "absolute", left: 56, top: 236, fontFamily: MONO, fontSize: 25, color: C.dim, letterSpacing: 1, direction: "ltr" }}>
      <span style={{ color: C.accent }}>~/</span>
      {path}
      <span style={{ color: C.accent, opacity: Math.floor(t * 2) % 2 ? 0 : 1 }}>▍</span>
    </div>
    {tag ? (
      <div style={{ position: "absolute", right: 56, top: 232, display: "flex", alignItems: "center", gap: 14, direction: "rtl" }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: C.accent, boxShadow: `0 0 14px ${C.accent}` }} />
        <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 30, color: C.text }}>{tag}</div>
      </div>
    ) : null}
  </>
);

/** bottom status line (model · mode on the left, what is happening on the right) */
export const StatusLine: React.FC<{ left: string; right: string; y?: number }> = ({ left, right, y = 1600 }) => (
  <div style={{ position: "absolute", left: 56, right: 120, top: y, height: 44, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: MONO, fontSize: 21, color: C.faint, direction: "ltr" }}>
    <span>
      <span style={{ color: C.accent }}>●</span> {left}
    </span>
    <span style={{ color: C.dim }}>{right}</span>
  </div>
);

/** a pulsing three-dot «working» indicator */
export const Dots: React.FC<{ t: number; size?: number }> = ({ t, size = 10 }) => (
  <div style={{ display: "flex", gap: size * 0.7 }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ width: size, height: size, borderRadius: size / 2, background: C.accent, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(t * 8 - i * 0.9)) }} />
    ))}
  </div>
);
export const glowRing = (a: number) => `0 0 0 6px ${accentA(0.05 * a)}`;
