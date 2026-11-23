// Explore Wall demo · two «screenshots» drawn in code at phone-screenshot size (1080 px wide), so the demo needs no
// real screenshot. In your film: <ProofShot src="vNN/shots/insights.png" sw={1080} sh={…} …/> and read the rects
// (the number, the @username) straight off your screenshot in px.
import React from "react";
import { CodeTile } from "../lib/wall";
import { C, F } from "../lib/theme";

// ── reel insights ────────────────────────────────────────────────────────────────────────────────────────────
export const INS = { w: 1080, h: 1180, views: { x: 300, y: 560, w: 480, h: 110 }, thumb: { x: 390, y: 150, w: 300, h: 380 } };
export const ReelInsights: React.FC<{ views: string }> = ({ views }) => (
  <div style={{ position: "relative", width: INS.w, height: INS.h, background: C.ig, color: "#F5F5F7", fontFamily: F.ui }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", fontWeight: 700, fontSize: 44 }}>Reel insights</div>
    <div style={{ position: "absolute", left: INS.thumb.x, top: INS.thumb.y, width: INS.thumb.w, height: INS.thumb.h, borderRadius: 22, overflow: "hidden" }}>
      <CodeTile tile={{ views: 0, hue: 14, kind: 0, title: "پشت صحنه‌ی یه روز کاری" }} w={INS.thumb.w} h={INS.thumb.h} />
    </div>
    <div style={{ position: "absolute", left: INS.views.x, top: INS.views.y, width: INS.views.w, height: INS.views.h, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 96, letterSpacing: -2 }}>{views}</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 680, textAlign: "center", fontSize: 34, color: "#A8ADB7" }}>Views</div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 790, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
      {[["Likes", "86.4K"], ["Comments", "1,208"], ["Shares", "9,731"], ["Saves", "12.9K"]].map(([i, v]) => (
        <div key={i} style={{ height: 150, borderRadius: 26, background: "#151A22", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 40 }}>{v}</span>
          <span style={{ fontSize: 28, color: "#A8ADB7" }}>{i}</span>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 990, display: "flex", justifyContent: "space-between", fontSize: 34, color: "#A8ADB7" }}>
      <span>Accounts reached</span>
      <span style={{ color: "#F5F5F7", fontWeight: 700 }}>903,152</span>
    </div>
    <div style={{ position: "absolute", left: 80, right: 80, top: 1060, display: "flex", justifyContent: "space-between", fontSize: 34, color: "#A8ADB7" }}>
      <span>From non-followers</span>
      <span style={{ color: "#F5F5F7", fontWeight: 700 }}>91.6%</span>
    </div>
  </div>
);

// ── profile header ───────────────────────────────────────────────────────────────────────────────────────────
export const PRO = { w: 1080, h: 760, user: { x: 60, y: 40, w: 420, h: 64 }, avatar: { x: 60, y: 150, w: 230, h: 230 }, followers: { x: 520, y: 200, w: 230, h: 80 } };
export const ProfileHeader: React.FC<{ followers: string }> = ({ followers }) => (
  <div style={{ position: "relative", width: PRO.w, height: PRO.h, background: C.ig, color: "#F5F5F7", fontFamily: F.ui }}>
    <div style={{ position: "absolute", left: PRO.user.x, top: PRO.user.y, height: PRO.user.h, display: "flex", alignItems: "center", fontWeight: 700, fontSize: 52 }}>your.page.name</div>
    <div style={{ position: "absolute", left: PRO.avatar.x, top: PRO.avatar.y, width: PRO.avatar.w, height: PRO.avatar.h, borderRadius: "50%", padding: 8, boxSizing: "border-box", background: `linear-gradient(45deg, ${C.ig1}, ${C.ig2} 30%, ${C.ig3} 60%, ${C.ig4})` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `8px solid ${C.ig}`, boxSizing: "border-box", background: "linear-gradient(135deg, #3a3d44, #15171a)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 90 }}>Y</div>
    </div>
    {[["86", "posts", 330], [followers, "followers", PRO.followers.x], ["210", "following", 800]].map(([v, l, x]) => (
      <div key={l as string} style={{ position: "absolute", left: x as number, top: PRO.followers.y, width: PRO.followers.w, textAlign: "center" }}>
        <div style={{ height: PRO.followers.h, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 64 }}>{v}</div>
        <div style={{ fontSize: 34, color: "#C8CCD4" }}>{l}</div>
      </div>
    ))}
    <div style={{ position: "absolute", left: 60, right: 60, top: 430, direction: "rtl", fontFamily: F.vz, fontSize: 38, lineHeight: 1.5 }}>
      <div style={{ fontFamily: F.faB }}>آشپزی سریع</div>
      <div style={{ color: "#C8CCD4" }}>دستورهای ۶۰ ثانیه‌ای · هر پنجشنبه</div>
    </div>
    <div style={{ position: "absolute", left: 60, right: 60, top: 610, display: "flex", gap: 20 }}>
      {["Follow", "Message"].map((b) => (
        <div key={b} style={{ flex: 1, height: 84, borderRadius: 18, background: b === "Follow" ? "#4A5DF9" : "#262A33", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 36 }}>{b}</div>
      ))}
    </div>
  </div>
);
