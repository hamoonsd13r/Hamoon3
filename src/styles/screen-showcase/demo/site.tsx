// Screen Showcase demo · the «recording»: a finished landing page built in code at its real size (1368 × 2700 px),
// so the demo runs with no video. In your film, film YOUR screen recording instead (CamView `clip`), or keep a coded
// page like this one. SITE holds the source-pixel boxes the camera, the marks and the clicks aim at.
import React from "react";
import { FA, LATIN } from "../lib/theme";

export const SITE_W = 1368, SITE_H = 2700;
export const SITE = {
  nav: { x: 0, y: 0, w: 1368, h: 84 },
  menu: { x: 430, y: 20, w: 560, h: 44 },
  navBtn: { x: 60, y: 18, w: 190, h: 48 },
  hero: { x: 0, y: 84, w: 1368, h: 776 },
  heroBtn: { x: 1098, y: 695, w: 210, h: 70 },
  gallery: { x: 60, y: 900, w: 1248, h: 620 },
  services: { x: 60, y: 1600, w: 1248, h: 420 },
  reviews: { x: 60, y: 2090, w: 1248, h: 300 },
  footer: { x: 0, y: 2440, w: 1368, h: 260 },
  footBtn: { x: 574, y: 2590, w: 220, h: 70 },
};

const INK = "#14161C", PAPER = "#F6F3EE", MUTED = "#6B6F7A";

/** a code-drawn photograph: sky, sun, two ridges, water (or a portrait silhouette) */
export const Photo: React.FC<{ w: number; h: number; hue: number; kind?: "mount" | "sea" | "city" | "portrait" | "desert" | "flower"; r?: number }> = ({ w, h, hue, kind = "mount", r = 18 }) => {
  const id = `ph${hue}${kind}${w}`;
  const sky1 = `hsl(${hue} 70% 72%)`, sky2 = `hsl(${(hue + 30) % 360} 65% 46%)`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", borderRadius: r }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky2} />
          <stop offset="1" stopColor={sky1} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
      {kind === "portrait" ? (
        <>
          <circle cx={w * 0.5} cy={h * 0.42} r={h * 0.17} fill={`hsl(${hue} 30% 18%)`} />
          <path d={`M${w * 0.2} ${h} Q${w * 0.5} ${h * 0.5} ${w * 0.8} ${h} Z`} fill={`hsl(${hue} 30% 14%)`} />
          <circle cx={w * 0.5} cy={h * 0.42} r={h * 0.17} fill="none" stroke={`hsl(${(hue + 40) % 360} 90% 80%)`} strokeWidth={3} opacity={0.6} />
        </>
      ) : kind === "city" ? (
        <>
          {Array.from({ length: 9 }, (_, i) => {
            const bw = w / 9, bh = h * (0.3 + 0.45 * Math.abs(Math.sin(i * 2.3)));
            return <rect key={i} x={i * bw + 2} y={h - bh} width={bw - 4} height={bh} fill={`hsl(${hue} 25% ${12 + (i % 3) * 4}%)`} />;
          })}
          {Array.from({ length: 40 }, (_, i) => (
            <rect key={`w${i}`} x={((i * 37) % 9) * (w / 9) + 10 + ((i * 13) % 3) * 12} y={h - 30 - ((i * 53) % 7) * 22} width={6} height={9} fill="#FFD98A" opacity={0.85} />
          ))}
        </>
      ) : (
        <>
          <circle cx={w * 0.68} cy={h * (kind === "desert" ? 0.42 : 0.36)} r={h * 0.11} fill={`hsl(${(hue + 50) % 360} 95% 86%)`} opacity={0.95} />
          <path d={`M0 ${h * 0.62} L${w * 0.22} ${h * 0.42} L${w * 0.42} ${h * 0.58} L${w * 0.62} ${h * 0.38} L${w} ${h * 0.6} L${w} ${h} L0 ${h} Z`} fill={`hsl(${hue} 30% 32%)`} opacity={kind === "desert" ? 0 : 0.9} />
          <path d={`M0 ${h * 0.74} Q${w * 0.3} ${h * 0.6} ${w * 0.55} ${h * 0.72} T${w} ${h * 0.7} L${w} ${h} L0 ${h} Z`} fill={kind === "desert" ? `hsl(${hue} 60% 55%)` : `hsl(${hue} 30% 20%)`} />
          {kind === "sea" ? Array.from({ length: 6 }, (_, i) => <rect key={i} x={w * 0.1 + i * 23} y={h * 0.8 + i * 9} width={w * 0.5 - i * 30} height={3} fill="#fff" opacity={0.25} />) : null}
          {kind === "flower"
            ? Array.from({ length: 5 }, (_, i) => <circle key={i} cx={w * (0.2 + i * 0.15)} cy={h * (0.78 - (i % 2) * 0.06)} r={h * 0.05} fill={`hsl(${(hue + 160 + i * 20) % 360} 80% 70%)`} />)
            : null}
        </>
      )}
    </svg>
  );
};

const Btn: React.FC<{ color: string; children: React.ReactNode; ghost?: boolean; style?: React.CSSProperties }> = ({ color, children, ghost, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 70, padding: "0 40px", borderRadius: 999, background: ghost ? "transparent" : color, border: `2px solid ${ghost ? "#C9C4BB" : color}`, color: ghost ? INK : "#fff", fontFamily: FA, fontWeight: 700, fontSize: 26, boxShadow: ghost ? undefined : `0 14px 30px ${color}55`, ...style }}>{children}</div>
);

/** the page; `btn` = the buttons' colour (the demo changes it on the line «دکمه‌ها رو نارنجی کن») */
export const DemoSite: React.FC<{ btn: string }> = ({ btn }) => {
  const abs = (b: { x: number; y: number; w: number; h: number }): React.CSSProperties => ({ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h });
  return (
    <div style={{ position: "relative", width: SITE_W, height: SITE_H, background: PAPER, color: INK, direction: "rtl", fontFamily: FA, overflow: "hidden" }}>
      {/* nav */}
      <div style={{ ...abs(SITE.nav), borderBottom: "1px solid #E4DFD6", background: "#FBF9F5" }}>
        <div style={{ position: "absolute", right: 60, top: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: INK, display: "flex", alignItems: "center", justifyContent: "center", color: PAPER, fontWeight: 900, fontSize: 24 }}>ن</div>
          <span style={{ fontWeight: 900, fontSize: 30 }}>استودیو نورا</span>
        </div>
        <div style={{ ...abs({ x: SITE.menu.x, y: SITE.menu.y, w: SITE.menu.w, h: SITE.menu.h }), display: "flex", alignItems: "center", justifyContent: "space-around", fontSize: 24, fontWeight: 600, color: "#3A3D46" }}>
          <span>نمونه‌کارها</span>
          <span>خدمات</span>
          <span>نظرها</span>
          <span>تماس</span>
        </div>
        <div style={{ ...abs(SITE.navBtn) }}>
          <Btn color={btn} style={{ height: 48, fontSize: 21, padding: "0 26px" }}>رزرو جلسه</Btn>
        </div>
      </div>
      {/* hero */}
      <div style={{ ...abs(SITE.hero) }}>
        <div style={{ position: "absolute", right: 60, top: 150, width: 640 }}>
          <div style={{ display: "inline-block", padding: "8px 18px", borderRadius: 999, background: "#ECE6DC", fontSize: 22, fontWeight: 600, color: "#5A5E68" }}>عکاسی با نور طبیعی</div>
          <div style={{ marginTop: 26, fontWeight: 900, fontSize: 104, lineHeight: 1.12 }}>عکس‌هایی که<br />می‌مونن</div>
          <div style={{ marginTop: 22, fontSize: 30, lineHeight: 1.6, color: MUTED }}>پرتره، عروسی و عکس محصول؛ از جلسه‌ی اول تا آلبوم چاپی.</div>
          <div style={{ marginTop: 44, display: "flex", gap: 18 }}>
            <Btn color={btn}>رزرو جلسه</Btn>
            <Btn color={btn} ghost>دیدن نمونه‌ها</Btn>
          </div>
        </div>
        <div style={{ position: "absolute", left: 60, top: 70, width: 560, height: 640 }}>
          <div style={{ position: "absolute", left: 40, top: 0, borderRadius: 28, overflow: "hidden", boxShadow: "0 40px 80px rgba(20,22,28,.25)" }}>
            <Photo w={500} h={600} hue={24} kind="mount" r={28} />
          </div>
          <div style={{ position: "absolute", left: 0, top: 380, borderRadius: 20, overflow: "hidden", border: "8px solid #fff", boxShadow: "0 30px 60px rgba(20,22,28,.3)", transform: "rotate(-4deg)" }}>
            <Photo w={230} h={260} hue={330} kind="portrait" r={8} />
          </div>
        </div>
      </div>
      {/* gallery */}
      <div style={{ ...abs(SITE.gallery) }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 900, fontSize: 56 }}>نمونه‌کارها</span>
          <span style={{ fontSize: 24, color: MUTED }}>۲۴۰ جلسه در سال گذشته</span>
        </div>
        <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {([[200, "sea", "ساحل · صبح زود"], [24, "portrait", "پرتره · استودیو"], [270, "city", "شهر · شب"], [38, "desert", "کویر · غروب"], [140, "flower", "باغ · بهار"], [210, "mount", "کوه · ابری"]] as const).map(([hue, kind, cap], i) => (
            <div key={i}>
              <Photo w={400} h={220} hue={hue} kind={kind} />
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 600, color: "#3A3D46" }}>{cap}</div>
            </div>
          ))}
        </div>
      </div>
      {/* services */}
      <div style={{ ...abs(SITE.services) }}>
        <div style={{ fontWeight: 900, fontSize: 56 }}>خدمات</div>
        <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[["پرتره", "یک ساعت جلسه، ۱۵ عکس ادیت‌شده"], ["عروسی", "از آماده شدن تا آخر شب، آلبوم چاپی"], ["محصول", "عکس سفید و صحنه‌سازی برای فروشگاه"]].map(([h, d], i) => (
            <div key={h} style={{ height: 290, borderRadius: 26, background: "#fff", border: "1px solid #E7E1D7", padding: "34px 34px", boxSizing: "border-box" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: `${btn}22`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: LATIN, fontWeight: 800, fontSize: 30, color: btn }}>{i + 1}</div>
              <div style={{ marginTop: 22, fontWeight: 800, fontSize: 36 }}>{h}</div>
              <div style={{ marginTop: 10, fontSize: 24, lineHeight: 1.55, color: MUTED }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      {/* reviews */}
      <div style={{ ...abs(SITE.reviews), display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {[["«عکس‌ها از چیزی که فکر می‌کردیم قشنگ‌تر شد.»", "مریم و علی"], ["«عکس محصول‌هامون فروش رو بیشتر کرد.»", "فروشگاه گلدون"]].map(([q, n]) => (
          <div key={n} style={{ borderRadius: 26, background: "#EFEAE1", padding: "36px 40px", boxSizing: "border-box" }}>
            <div style={{ color: "#E8A33D", fontSize: 26, letterSpacing: 4 }}>★★★★★</div>
            <div style={{ marginTop: 14, fontWeight: 700, fontSize: 32, lineHeight: 1.5 }}>{q}</div>
            <div style={{ marginTop: 14, fontSize: 24, color: MUTED }}>{n}</div>
          </div>
        ))}
      </div>
      {/* footer CTA */}
      <div style={{ ...abs(SITE.footer), background: INK, color: PAPER, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ fontWeight: 900, fontSize: 60 }}>جلسه‌ی بعدی مال تو</div>
        <Btn color={btn}>رزرو جلسه</Btn>
      </div>
    </div>
  );
};
