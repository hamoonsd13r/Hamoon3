// Demo figure 1: a code-drawn notes app (an invented, unbranded app) printed on the page in the hook. Shows how a
// figure can be drawn instead of filmed: real text, real tags, a live selection, a new note sliding in.
import React from "react";
import { C, F } from "../lib/theme";
import { eOut5, mix, ramp } from "../lib/time";

const NOTES = [
  { t: "Kitchen repair", s: "Call the plumber before Friday — the tap again", tag: "home", d: "Today" },
  { t: "Client meeting", s: "Move the demo to 4:30, send the deck first", tag: "work", d: "Yesterday" },
  { t: "Trip notes", s: "The café by the river: quiet, good wifi", tag: "travel", d: "Mon" },
  { t: "Podcast idea", s: "Small habits that save an hour a week", tag: "ideas", d: "Sun" },
];
const TAGS: [string, number][] = [
  ["work", 41],
  ["home", 23],
  ["ideas", 37],
  ["travel", 19],
  ["people", 8],
];
const ui = (size: number, weight = 500, color = "#1F2328"): React.CSSProperties => ({ fontFamily: F.ui, fontSize: size, fontWeight: weight, color, whiteSpace: "nowrap", lineHeight: 1.15 });

export const NotesApp: React.FC<{ t: number; newAt: number }> = ({ t, newAt }) => {
  const nw = eOut5(ramp(t, newAt, newAt + 0.5));
  const count = t >= newAt + 0.2 ? 128 : 127;
  // the selection walks down the list, then jumps to the new note
  const sel = t < newAt ? Math.floor((t * 1.4) % 4) : -1;
  const rowH = 92;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F6F5F2" }}>
      {/* title bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, background: "#ECEAE5", borderBottom: "1px solid #D9D6CF", display: "flex", alignItems: "center", gap: 18, padding: "0 22px" }}>
        {["#E26A5A", "#E8B54A", "#B9B4AA"].map((c) => (
          <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />
        ))}
        <span style={{ ...ui(24, 700), marginLeft: 10 }}>Notes</span>
        <div style={{ marginLeft: 22, flex: 1, height: 38, borderRadius: 10, background: "#FFFFFF", border: "1px solid #D9D6CF", display: "flex", alignItems: "center", padding: "0 14px", gap: 10 }}>
          <svg width={18} height={18} viewBox="0 0 18 18">
            <circle cx={7.5} cy={7.5} r={5.5} fill="none" stroke="#8A8F98" strokeWidth={2} />
            <path d="M12 12 L16 16" stroke="#8A8F98" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
          <span style={ui(19, 500, "#8A8F98")}>Search all notes…</span>
        </div>
        <span style={{ ...ui(17, 700, C.paperHi), background: C.accent, borderRadius: 7, padding: "7px 11px", letterSpacing: "0.04em" }}>{count} NOTES</span>
      </div>
      {/* sidebar */}
      <div style={{ position: "absolute", left: 0, top: 64, bottom: 0, width: 196, background: "#EFEDE8", borderRight: "1px solid #D9D6CF", padding: "20px 0 0 22px", boxSizing: "border-box" }}>
        <div style={{ ...ui(16, 700, "#8A8F98"), letterSpacing: "0.1em" }}>TAGS · AUTO</div>
        {TAGS.map(([n, c], i) => (
          <div key={n} style={{ marginTop: i ? 14 : 18, display: "flex", justifyContent: "space-between", paddingRight: 22 }}>
            <span style={ui(21, 600, i === 1 && t >= newAt ? C.accent : "#1F2328")}># {n}</span>
            <span style={ui(19, 500, "#8A8F98")}>{c + (i === 1 && t >= newAt + 0.2 ? 1 : 0)}</span>
          </div>
        ))}
      </div>
      {/* the list */}
      <div style={{ position: "absolute", left: 196, right: 0, top: 64, bottom: 0, overflow: "hidden" }}>
        <div style={{ transform: `translateY(${mix(0, rowH, nw)}px)` }}>
          {NOTES.map((n, i) => (
            <Row key={n.t} n={n} sel={i === sel} />
          ))}
        </div>
        {nw > 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${(1 - nw) * -rowH}px)`, opacity: nw }}>
            <Row n={{ t: "30 days, one app", s: "Every note in one place — tagged by itself", tag: "home", d: "Now" }} sel fresh />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Row: React.FC<{ n: (typeof NOTES)[number]; sel?: boolean; fresh?: boolean }> = ({ n, sel, fresh }) => (
  <div style={{ height: 92, boxSizing: "border-box", padding: "16px 24px 0 26px", borderBottom: "1px solid #E2DFD8", background: sel ? (fresh ? "#FBE9DE" : "#FFFFFF") : "transparent", position: "relative" }}>
    {sel ? <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: C.accent }} /> : null}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={ui(24, 700)}>{n.t}</span>
      <span style={ui(17, 500, "#8A8F98")}>{n.d}</span>
    </div>
    <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
      <span style={{ ...ui(15, 700, C.accent), border: `1.5px solid ${C.accent}`, borderRadius: 6, padding: "2px 7px" }}>#{n.tag}</span>
      <span style={ui(19, 500, "#5B616B")}>{n.s}</span>
    </div>
  </div>
);
