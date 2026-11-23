// Talk Cutout · a channel-stats page (light, like a creator-studio app), drawn by code at page width 840 px. The films
// showed the speaker's OWN stats from her own screen recording, privacy-cleaned (pipeline/studio-blur.py): the channel
// name, every avatar, every video title and thumbnail blurred; the numbers sharp; the phone's status bar covered. This
// component follows the same rule (blur on by default) so the demo shows what a cleaned screen looks like. Numbers in
// the demo are SAMPLES and say so («نمونه»). With your own screenshot, use it instead (MEDIA → an <Img> at page size).
import React from "react";
import { C, F, accentA } from "../theme";
import { clamp, ease } from "../time";
import { Icon, YouTubeMark } from "../icons";
import { CodeThumb, type ThumbSpec } from "./thumb";

export const SP = { w: 840, h: 1480 }; // the page (world px)
/** where things sit on the page (page px) — scenes aim the camera and the lifts at these */
export const SP_AT = {
  header: { x: 420, y: 280 },
  cards: { x: 420, y: 620 }, // the 2×2 analytics grid (centre)
  views: { x: 40, y: 520, w: 370, h: 150 }, // the Views cell
  viewsNum: { x: 64, y: 586, w: 230, h: 64 }, // its number
  list: { x: 420, y: 1130 }, // the latest-content list (centre)
};

export type StudioStats = { subs: string; views: string; viewsUp: string; watch: string; newSubs: string; impressions: string };
export type StudioUpload = { when: string; views: string; thumb: ThumbSpec; title: string; at: number };

const TX = "#0f0f0f", SUB = "#606060", LINE = "#e6e6e6";
const blur = (on: boolean, px: number): React.CSSProperties => (on ? { filter: `blur(${px}px)` } : {});

const Cell: React.FC<{ x: number; y: number; label: string; value: string; up?: string; hi?: number; white?: number }> = ({ x, y, label, value, up, hi = 0, white = 0 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 370, height: 150, borderRadius: 18, background: "#fafafa", border: `1.5px solid ${LINE}`, boxShadow: hi > 0 ? `0 0 0 ${5 * hi}px ${C.accent}, 0 0 ${46 * hi}px ${accentA(0.5 * hi)}` : undefined }}>
    <div style={{ position: "absolute", left: 24, top: 20, fontSize: 21, fontWeight: 600, color: SUB }}>{label}</div>
    <div style={{ position: "absolute", left: 24, top: 62, fontSize: 52, fontWeight: 800, letterSpacing: -1.5, color: TX, opacity: 1 - white }}>{value}</div>
    {up ? (
      <div style={{ position: "absolute", right: 22, top: 78, fontSize: 20, fontWeight: 700, color: "#1e8e3e", display: "flex", alignItems: "center", gap: 4 }}>
        <svg width={16} height={16} viewBox="0 0 24 24">
          <path d="M12 5l7 9H5z" fill="#1e8e3e" />
        </svg>
        {up}
      </div>
    ) : null}
  </div>
);

export const StudioPage: React.FC<{
  t: number; stats: StudioStats; uploads: StudioUpload[]; channel: string; private?: boolean;
  hiViews?: number; whiteViews?: number; sample?: string;
}> = ({ t, stats, uploads, channel, private: priv = true, hiViews = 0, whiteViews = 0, sample = "نمونه" }) => (
  <div style={{ position: "relative", width: SP.w, height: SP.h, background: "#fff", fontFamily: F.ui, color: TX, direction: "ltr", overflow: "hidden" }}>
    {/* a generic status bar (never a recording of a real phone's: its clock, VPN or carrier) */}
    <div style={{ position: "absolute", left: 0, top: 0, width: SP.w, height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 56px 0", boxSizing: "border-box", fontSize: 26, fontWeight: 700 }}>
      <span>9:41</span>
      <span style={{ width: 46, height: 22, borderRadius: 6, border: "2.5px solid #111", position: "relative" }}>
        <span style={{ position: "absolute", left: 3, top: 3, right: 10, bottom: 3, borderRadius: 3, background: "#111" }} />
      </span>
    </div>
    {/* app bar */}
    <div style={{ position: "absolute", left: 0, top: 80, width: SP.w, height: 90, display: "flex", alignItems: "center", gap: 16, padding: "0 32px", boxSizing: "border-box" }}>
      <svg width={34} height={34} viewBox="0 0 24 24">
        <path d="M4 7h16M4 12h16M4 17h16" stroke={TX} strokeWidth={2.2} strokeLinecap="round" />
      </svg>
      <YouTubeMark size={42} />
      <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>Studio</span>
      <div style={{ flex: 1 }} />
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(140deg,#f3a45c,#a8531c)", ...blur(priv, 8) }} />
    </div>
    {/* channel header: name and avatar blurred, the number sharp */}
    <div style={{ position: "absolute", left: 32, top: 200, width: SP.w - 64, height: 170, display: "flex", alignItems: "center", gap: 26 }}>
      <div style={{ width: 120, height: 120, borderRadius: "50%", background: "linear-gradient(140deg,#f3a45c,#a8531c)", flex: "none", ...blur(priv, 12) }} />
      <div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.6, display: "inline-block", ...blur(priv, 11) }}>{channel}</div>
        <div style={{ fontSize: 22, color: SUB, marginTop: 8 }}>Current subscribers</div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{stats.subs}</div>
      </div>
    </div>
    {/* analytics */}
    <div style={{ position: "absolute", left: 20, top: 400, width: SP.w - 40, height: 470, borderRadius: 26, border: `1.5px solid ${LINE}` }}>
      <div style={{ position: "absolute", left: 24, top: 26, fontSize: 30, fontWeight: 800 }}>Channel analytics</div>
      <div style={{ position: "absolute", left: 24, top: 72, fontSize: 21, color: SUB }}>Last 28 days</div>
      <div style={{ position: "absolute", right: 22, top: 24, padding: "6px 16px", borderRadius: 12, background: "#fff4ec", border: `1.5px solid ${accentA(0.5)}`, fontFamily: F.vzB, fontSize: 24, color: "#b8460f", direction: "rtl" }}>{sample}</div>
    </div>
    <Cell x={SP_AT.views.x} y={SP_AT.views.y} label="Views" value={stats.views} up={stats.viewsUp} hi={hiViews} white={whiteViews} />
    <Cell x={430} y={520} label="Watch time (hours)" value={stats.watch} />
    <Cell x={40} y={690} label="Subscribers" value={stats.newSubs} />
    <Cell x={430} y={690} label="Impressions" value={stats.impressions} />
    {/* latest content: thumbnails and titles blurred, dates and views sharp */}
    <div style={{ position: "absolute", left: 32, top: 900, fontSize: 30, fontWeight: 800 }}>Latest content</div>
    {uploads.map((u, i) => {
      const k = t < u.at ? 0 : ease.outBack(clamp((t - u.at) / 0.4));
      const tick = clamp((t - u.at - 0.25) / 0.25);
      return (
        <div key={i} style={{ position: "absolute", left: 32, top: 960 + i * 128, width: SP.w - 64, height: 112, display: "flex", alignItems: "center", gap: 20, opacity: clamp(k * 2), transform: `translateX(${(1 - clamp(k)) * 40}px) scale(${0.96 + 0.04 * k})`, transformOrigin: "0% 50%" }}>
          <div style={{ width: 196, height: 110, borderRadius: 12, overflow: "hidden", flex: "none", ...blur(priv, 6) }}>
            <CodeThumb spec={u.thumb} w={196} h={110} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: 420, ...blur(priv, 7) }}>{u.title}</div>
            <div style={{ fontSize: 20, color: SUB, marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 8, background: tick > 0.5 ? "#e6f4ea" : "#f1f1f1", color: tick > 0.5 ? "#1e8e3e" : SUB, fontWeight: 700 }}>
                {tick > 0.5 ? <Icon n="check" size={16} color="#1e8e3e" sw={3} /> : null}
                Published
              </span>
              {u.when}
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: TX, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon n="eye" size={22} color={SUB} />
            {u.views}
          </div>
        </div>
      );
    })}
  </div>
);
