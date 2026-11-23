// Verdict Noir · the props of the lawyer's world, all drawn in code: walnut desk and grain, the brass nameplate
// «ATTORNEY AT LAW», the gavel and its sound block, manila case files, a typed contract, the legal pad with its
// to-do list and ticks, red ink stamps, a fountain pen, an analog clock, a request page that writes itself, a phone
// notification, profession cards, a hunter's reticle and law-book spines. All pure functions of their props.
import React from "react";
import { C, F, clamp, ease, hash, mix } from "./theme";

// ── materials ─────────────────────────────────────────────────────────────────────────────────────────────────
export const BRASS = "linear-gradient(135deg, #8A6A3A 0%, #B08D57 20%, #E2C68E 46%, #CDAE73 60%, #B08D57 78%, #876536 100%)";
export const WALNUT =
  "repeating-linear-gradient(91deg, rgba(0,0,0,0) 0 6px, rgba(0,0,0,0.16) 6px 8px, rgba(255,205,160,0.035) 8px 15px, rgba(0,0,0,0.08) 15px 17px, rgba(0,0,0,0) 17px 29px), linear-gradient(180deg, #4E301C 0%, #3A2213 55%, #26150B 100%)";
const svgUri = (s: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
/** real wood grain (feTurbulence stretched along x), rasterised once by the browser and cached (constant URI) */
export const WOOD_TEX = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'><filter id='w' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.0035 0.11' numOctaves='4' seed='11' stitchTiles='stitch'/><feColorMatrix values='0.55 0 0 0 0.06  0.32 0 0 0 0.03  0.17 0 0 0 0.012  0 0 0 0 1'/></filter><rect width='900' height='900' filter='url(#w)'/></svg>`,
);
/** the same grain running vertically (wall panels, desk front) */
export const WOOD_TEX_V = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'><filter id='w' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.11 0.0035' numOctaves='4' seed='5' stitchTiles='stitch'/><feColorMatrix values='0.55 0 0 0 0.06  0.32 0 0 0 0.03  0.17 0 0 0 0.012  0 0 0 0 1'/></filter><rect width='900' height='900' filter='url(#w)'/></svg>`,
);
/** faint paper fibre */
export const PAPER_TEX = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.18  0 0 0 0.09 0'/></filter><rect width='300' height='300' filter='url(#p)'/></svg>`,
);

// ── ink stamp ─────────────────────────────────────────────────────────────────────────────────────────────────
let inkId = 0;
/** a rubber-stamp impression: big Persian word in a double-ruled box, red, rotated, worn ink. Slams at `at`
 *  (1.7 → 1 in 0.11 s, then settles). Centre at (x, y). */
export const Stamp: React.FC<{
  t: number; at: number; text: string; x: number; y: number; size?: number; rot?: number; color?: string; seed?: number;
  fade?: number; sub?: string; box?: boolean;
}> = ({ t, at, text, x, y, size = 110, rot = -8, color = C.red, seed = 3, fade = 1, sub, box = true }) => {
  const id = React.useMemo(() => `vnink${inkId++}`, []);
  if (t < at - 0.12) return null;
  const u = clamp((t - (at - 0.11)) / 0.11);
  const fall = ease.in(u);
  const sc = u < 1 ? mix(1.75, 1, fall) : 1 + 0.025 * Math.exp(-(t - at) * 14) * Math.sin((t - at) * 40);
  const op = (u < 1 ? clamp(u * 1.6) * 0.55 : 0.94) * fade;
  const pad = size * 0.22;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, pointerEvents: "none" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={size * 0.028} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed={seed + 9} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4.8 0 0 0 3.75" result="m" />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
      </svg>
      <div
        style={{
          position: "absolute", left: 0, top: 0, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${sc})`, opacity: op,
          filter: `url(#${id})`, display: "flex", flexDirection: "column", alignItems: "center", whiteSpace: "nowrap",
          padding: box ? `${pad * 0.55}px ${pad * 1.1}px ${pad * 0.4}px` : 0,
          border: box ? `${Math.max(4, size * 0.07)}px solid ${color}` : undefined, borderRadius: size * 0.12,
        }}
      >
        {box ? <div style={{ position: "absolute", inset: size * 0.06, border: `${Math.max(2, size * 0.025)}px solid ${color}`, borderRadius: size * 0.07 }} /> : null}
        <div style={{ direction: "rtl", fontFamily: F.head, fontSize: size, lineHeight: 1.12, color }}>{text}</div>
        {sub ? <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: size * 0.26, letterSpacing: size * 0.05, color, marginTop: -size * 0.05 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

// ── nameplate ─────────────────────────────────────────────────────────────────────────────────────────────────
/** the lawyer's desk nameplate: dark walnut block with a brass plate «ATTORNEY AT LAW». `sheen` 0..1 sweeps a highlight
 *  across the brass; `lit` 0..1 dims it (lamp off). */
export const Nameplate: React.FC<{ w?: number; sheen?: number; lit?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ w = 520, sheen = -1, lit = 1, style, children }) => {
  const h = Math.round(w * 0.235);
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      {/* top face (bevel) */}
      <div style={{ position: "absolute", left: w * 0.015, right: w * 0.015, top: -h * 0.16, height: h * 0.2, borderRadius: "5px 5px 0 0", background: "linear-gradient(180deg, #6A4529, #4A2D19)", clipPath: "polygon(3% 0, 97% 0, 100% 100%, 0 100%)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: WALNUT, boxShadow: "0 26px 50px rgba(0,0,0,0.7), 0 6px 14px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,215,170,0.2), inset 0 -8px 14px rgba(0,0,0,0.5)" }} />
      <div
        style={{
          position: "absolute", left: w * 0.065, right: w * 0.065, top: h * 0.18, bottom: h * 0.18, borderRadius: 4, background: BRASS, overflow: "hidden",
          boxShadow: "inset 0 1px 0 rgba(255,246,222,0.75), inset 0 -2px 3px rgba(70,45,10,0.55), 0 1px 2px rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {/* engraved screws */}
        {[0.035, 0.965].map((p) => <div key={p} style={{ position: "absolute", left: `${p * 100}%`, top: "50%", width: w * 0.018, height: w * 0.018, marginLeft: -w * 0.009, marginTop: -w * 0.009, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #F2DDA8, #7A5A2C)" }} />)}
        <div style={{ fontFamily: F.serif, fontWeight: 700, fontSize: w * 0.064, letterSpacing: w * 0.009, color: "#36250E", textShadow: "0 1px 0 rgba(255,242,208,0.6)", whiteSpace: "nowrap", direction: "ltr" }}>ATTORNEY AT LAW</div>
        {sheen > 0 && sheen < 1 ? (
          <div style={{ position: "absolute", top: -10, bottom: -10, left: `${mix(-45, 125, ease.inOut(sheen))}%`, width: "22%", background: "linear-gradient(100deg, rgba(255,250,230,0), rgba(255,250,232,0.62), rgba(255,250,230,0))", transform: "skewX(-20deg)" }} />
        ) : null}
      </div>
      {lit < 1 ? <div style={{ position: "absolute", left: -2, right: -2, top: -h * 0.18, bottom: -2, borderRadius: 6, background: "#030304", opacity: 1 - lit }} /> : null}
      {children}
    </div>
  );
};

// ── case file (manila folder) ─────────────────────────────────────────────────────────────────────────────────
/** a closed manila folder #D9C9A3 with a red tab and a small «CASE FILE» label; `fa` = Persian title on the label */
export const CaseFolder: React.FC<{ w?: number; fa?: string; tab?: number; style?: React.CSSProperties; shade?: number; papers?: number }> = ({ w = 360, fa, tab = 0.08, style, shade = 0, papers = 2 }) => {
  const h = Math.round(w * 0.74);
  const tabW = w * 0.3;
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      {/* back panel + red tab */}
      <div style={{ position: "absolute", left: tab * w, top: -h * 0.09, width: tabW, height: h * 0.16, borderRadius: "10px 10px 0 0", background: `linear-gradient(180deg, ${C.red}, #B8231F)` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "#C9B68C", boxShadow: "0 18px 36px rgba(0,0,0,0.55), 0 3px 8px rgba(0,0,0,0.4)" }} />
      {/* paper edges peeking out */}
      {Array.from({ length: papers }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: w * (0.05 + i * 0.02), right: w * (0.07 - i * 0.015), top: h * (0.035 + i * 0.012), height: h * 0.2, background: i % 2 ? "#F4EEE2" : C.paper, borderRadius: 2, transform: `rotate(${(hash(i + w) - 0.5) * 1.6}deg)` }} />
      ))}
      {/* front panel */}
      <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.07, bottom: 0, borderRadius: "4px 4px 6px 6px", background: `${"linear-gradient(180deg, #E1D2AE 0%, #D9C9A3 40%, #CDBB92 100%)"}`, boxShadow: "inset 0 2px 0 rgba(255,250,235,0.6), 0 -1px 2px rgba(0,0,0,0.15)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: PAPER_TEX, opacity: 0.8, borderRadius: "inherit" }} />
        {/* label sticker */}
        <div style={{ position: "absolute", right: w * 0.08, top: h * 0.14, width: w * 0.5, padding: `${w * 0.02}px ${w * 0.03}px`, background: "#F7F2E6", borderRadius: 3, boxShadow: "0 1px 2px rgba(0,0,0,0.25)", borderTop: `${Math.max(3, w * 0.012)}px solid ${C.red}` }}>
          <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: Math.max(12, w * 0.062), letterSpacing: w * 0.006, color: "#5A4E3E", direction: "ltr", lineHeight: 1.15 }}>CASE FILE</div>
          {fa ? <div style={{ fontFamily: F.vzB, fontSize: Math.max(12, w * 0.075), color: C.inkOnPaper, direction: "rtl", textAlign: "right", lineHeight: 1.3, whiteSpace: "nowrap" }}>{fa}</div> : null}
        </div>
      </div>
      {shade > 0 ? <div style={{ position: "absolute", left: 0, right: 0, top: -h * 0.09, bottom: 0, background: "#000", opacity: shade, borderRadius: 6 }} /> : null}
    </div>
  );
};

// ── the lawyer's to-do list (legal pad) ───────────────────────────────────────────────────────────────────────
export const TASKS = ["بررسی پرونده‌ها", "تحقیق قوانین", "تنظیم قرارداد", "نوشتن لایحه", "جلسه با موکل"];
/** a tick drawn with progress p (0..1) */
export const Tick: React.FC<{ p: number; size: number; color: string; w?: number }> = ({ p, size, color, w = 0.16 }) => {
  if (p <= 0) return null;
  const L = 34;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d="M3 13.5 L9.2 19.5 L21.5 4" fill="none" stroke={color} strokeWidth={24 * w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L} strokeDashoffset={L * (1 - clamp(p))} />
    </svg>
  );
};
/** cream legal pad: maroon glued binding, faint blue rules, red margin on the right (Persian), header + task rows.
 *  ticks[i] = tick progress, tickColor per row (red = done by the assistant, ink = by hand), show[i] = row reveal 0..1 */
export const LegalPad: React.FC<{
  w: number; h: number; header?: string; tasks?: string[]; ticks?: number[]; tickColor?: string[]; show?: number[]; struck?: number[]; strikeColor?: string;
  fs?: number; rowH?: number; style?: React.CSSProperties; children?: React.ReactNode; dark?: number;
}> = ({ w, h, header = "کارهای امروز", tasks = TASKS, ticks = [], tickColor = [], show = [], struck = [], strikeColor = "rgba(26,23,20,0.8)", fs = 36, rowH = 74, style, children, dark = 0 }) => {
  const bind = Math.round(h * 0.06);
  const top = bind + rowH * 1.55;
  const margin = w - Math.max(78, w * 0.15);
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: C.paper, boxShadow: "0 30px 60px rgba(0,0,0,0.55), 0 6px 16px rgba(0,0,0,0.4)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: PAPER_TEX }} />
        {/* rules */}
        <div style={{ position: "absolute", left: 0, right: 0, top: top - rowH * 0.18, bottom: 0, backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${rowH - 2}px, rgba(70,112,175,0.32) ${rowH - 2}px ${rowH}px)` }} />
        {/* red double margin (right side, Persian) */}
        <div style={{ position: "absolute", top: bind, bottom: 0, left: margin, width: 2, background: "rgba(214,48,44,0.55)" }} />
        <div style={{ position: "absolute", top: bind, bottom: 0, left: margin + 6, width: 2, background: "rgba(214,48,44,0.4)" }} />
        {/* binding */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bind, background: "linear-gradient(180deg, #6E1512, #4A0B09)", boxShadow: "0 3px 6px rgba(0,0,0,0.35)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "rgba(0,0,0,0.35)" }} />
        </div>
        {/* header */}
        <div style={{ position: "absolute", right: w - margin + 22, top: bind + rowH * 0.42, direction: "rtl", fontFamily: F.vzB, fontSize: fs * 1.08, color: C.inkOnPaper, whiteSpace: "nowrap" }}>{header}</div>
        {tasks.map((tx, i) => {
          const sh = show[i] ?? 1;
          if (sh <= 0) return null;
          const y = top + i * rowH;
          const st = struck[i] ?? 0;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: margin + 22, top: y + rowH * 0.5 - fs * 0.42 - 20, width: fs * 0.82, height: fs * 0.82, border: `${Math.max(2.5, fs * 0.075)}px solid rgba(26,23,20,0.75)`, borderRadius: 4, opacity: sh }}>
                <div style={{ position: "absolute", left: -fs * 0.06, top: -fs * 0.22, width: fs * 1.0, height: fs * 1.0 }}>
                  <Tick p={ticks[i] ?? 0} size={fs * 1.0} color={tickColor[i] ?? C.inkOnPaper} />
                </div>
              </div>
              <div style={{ position: "absolute", right: w - margin + 22, top: y + rowH * 0.5 - fs * 0.78 - 20, direction: "rtl", fontFamily: F.vzB, fontSize: fs, lineHeight: 1.5, color: C.inkOnPaper, whiteSpace: "nowrap", opacity: sh, transform: `translateX(${(1 - ease.out(sh)) * -40}px)` }}>
                {tx}
                {st > 0 ? <div style={{ position: "absolute", right: 0, top: "56%", height: Math.max(3, fs * 0.09), width: `${st * 100}%`, background: strikeColor, borderRadius: 2 }} /> : null}
              </div>
            </React.Fragment>
          );
        })}
        {children}
        {dark > 0 ? <div style={{ position: "absolute", inset: 0, background: "#000", opacity: dark }} /> : null}
      </div>
    </div>
  );
};

// ── fountain pen ──────────────────────────────────────────────────────────────────────────────────────────────
/** black lacquer fountain pen, nib tip at the element's (0,0); extends along +x (rotate the wrapper) */
export const Pen: React.FC<{ len?: number }> = ({ len = 440 }) => {
  const k = len / 440;
  return (
    <svg width={460 * k} height={64 * k} viewBox="-10 -32 460 64" style={{ position: "absolute", left: -10 * k, top: -32 * k, overflow: "visible" }}>
      <defs>
        <linearGradient id="vnpenBody" x1="0" y1="-14" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5A5A62" />
          <stop offset="0.22" stopColor="#1A1A1F" />
          <stop offset="0.55" stopColor="#0B0B0E" />
          <stop offset="0.82" stopColor="#24242A" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
        <linearGradient id="vnpenGold" x1="0" y1="-14" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F6E2AE" />
          <stop offset="0.45" stopColor="#C49A55" />
          <stop offset="1" stopColor="#6E4E22" />
        </linearGradient>
        <linearGradient id="vnnib" x1="0" y1="-8" x2="0" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FBEFC8" />
          <stop offset="0.5" stopColor="#D2AC62" />
          <stop offset="1" stopColor="#8A6630" />
        </linearGradient>
      </defs>
      {/* nib */}
      <path d="M0 0 L46 -9 Q52 0 46 9 Z" fill="url(#vnnib)" />
      <path d="M2 0 L40 0" stroke="#5B4320" strokeWidth="1.2" />
      <circle cx="34" cy="0" r="2.2" fill="#5B4320" />
      {/* grip */}
      <path d="M44 -10 L104 -12 L104 12 L44 10 Q40 0 44 -10 Z" fill="url(#vnpenBody)" />
      <rect x="104" y="-13" width="9" height="26" rx="2" fill="url(#vnpenGold)" />
      {/* barrel */}
      <path d="M113 -14 L380 -15 Q392 -15 400 -12 L430 -9 Q440 0 430 9 L400 12 Q392 15 380 15 L113 14 Z" fill="url(#vnpenBody)" />
      <rect x="372" y="-15.5" width="7" height="31" rx="1.5" fill="url(#vnpenGold)" />
      <rect x="386" y="-14.5" width="3" height="29" rx="1" fill="url(#vnpenGold)" />
      {/* posted cap clip */}
      <path d="M240 -17 L392 -19 Q398 -19 398 -14 L398 -12 L246 -13 Z" fill="url(#vnpenGold)" opacity="0.95" />
      <path d="M120 -9 L360 -10" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// ── analog clock ──────────────────────────────────────────────────────────────────────────────────────────────
/** a wall / desk clock face; angles in degrees (0 = 12 o'clock) */
export const Clock: React.FC<{ r: number; h: number; m: number; s?: number; rim?: string; face?: string; ink?: string; sec?: string; roman?: boolean }> = ({ r, h, m, s, rim = "#2A1A10", face = C.paper, ink = "#1A1714", sec = C.red, roman = true }) => {
  const R = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  return (
    <svg width={r * 2} height={r * 2} viewBox="-100 -100 200 200" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id={`vncf${r}`} cx="0" cy="-20" r="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={face} />
          <stop offset="1" stopColor="#CDBF9F" />
        </radialGradient>
      </defs>
      <circle r="99" fill={rim} />
      <circle r="92" fill="#6E4B2E" opacity="0.6" />
      <circle r="88" fill={`url(#vncf${r})`} />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
        return <line key={i} x1={Math.sin(a) * (big ? 72 : 78)} y1={-Math.cos(a) * (big ? 72 : 78)} x2={Math.sin(a) * 84} y2={-Math.cos(a) * 84} stroke={ink} strokeWidth={big ? 3 : 1.1} />;
      })}
      {roman
        ? R.map((n, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <text key={n} x={Math.sin(a) * 58} y={-Math.cos(a) * 58 + 5} textAnchor="middle" fontFamily={F.serif} fontSize="14" fill={ink}>{n}</text>;
          })
        : null}
      <g transform={`rotate(${h})`}><path d="M-4 8 L-2.5 -44 L0 -50 L2.5 -44 L4 8 Z" fill={ink} /></g>
      <g transform={`rotate(${m})`}><path d="M-3 10 L-1.8 -66 L0 -72 L1.8 -66 L3 10 Z" fill={ink} /></g>
      {s !== undefined ? <g transform={`rotate(${s})`}><line x1="0" y1="16" x2="0" y2="-76" stroke={sec} strokeWidth="1.6" /><circle r="4" fill={sec} /></g> : null}
      <circle r="3" fill="#B08D57" />
    </svg>
  );
};

// ── a legal request page (drafted by a machine, line by line) ────────────────────────────────────────────────────────────────────
export const REQ_TYPES = ["دادخواست", "لایحه دفاعیه", "اظهارنامه", "شکوائیه", "درخواست تجدیدنظر", "دستور موقت", "تأمین خواسته", "واخواهی", "لایحه اعتراض", "درخواست رسیدگی", "اعتراض ثالث", "تأمین دلیل"];
export const REQ_BODY = [
  "ریاست محترم دادگاه عمومی حقوقی",
  "با سلام و احترام، به استحضار می‌رساند",
  "موکل اینجانب به استناد قرارداد پیوست",
  "تقاضای رسیدگی و صدور حکم مقتضی دارد.",
  "خواسته: الزام به انجام تعهدات قراردادی",
  "دلایل: قرارداد، مکاتبات و صورت‌جلسات",
  "مراتب جهت اقدام قانونی تقدیم می‌گردد.",
];
/** a cream A4-ish page with a Persian title and body; `wr` 0..1 = how much of the body is written (line by line,
 *  right → left, a light cursor at the writing edge); `titleW` 0..1 reveals the title */
export const ReqPage: React.FC<{ w?: number; title: string; no: number; wr: number; titleW?: number; /** footer mark opacity */ ai?: number; /** footer text */ by?: string; body?: string[]; style?: React.CSSProperties; children?: React.ReactNode }> = ({ w = 600, title, no, wr, titleW = 1, ai = 1, by = "AI DRAFT", body = REQ_BODY, style, children }) => {
  const h = Math.round(w * 1.333);
  const k = w / 600;
  const lines = body.length;
  const pos = wr * lines;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 4 * k, background: C.paper, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)", ...style }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: PAPER_TEX }} />
      <div style={{ position: "absolute", left: 46 * k, top: 40 * k, fontFamily: F.cond, fontWeight: 600, fontSize: 26 * k, letterSpacing: 2.5 * k, color: "#776A58", direction: "ltr" }}>
        REQUEST Nº {String(400 + no).padStart(4, "0")}
      </div>
      <div style={{ position: "absolute", right: 46 * k, top: 32 * k, fontFamily: F.cond, fontWeight: 600, fontSize: 26 * k, letterSpacing: 2.5 * k, color: C.red, direction: "ltr" }}>§</div>
      <div style={{ position: "absolute", right: 46 * k, top: 84 * k, direction: "rtl", fontFamily: F.vzB, fontSize: 54 * k, lineHeight: 1.35, color: C.inkOnPaper, whiteSpace: "nowrap", clipPath: `inset(-10% 0 -10% ${(1 - clamp(titleW)) * 100}%)` }}>
        {title}
      </div>
      <div style={{ position: "absolute", left: 46 * k, right: 46 * k, top: 178 * k, height: 3 * k, background: C.red, transformOrigin: "100% 50%", transform: `scaleX(${clamp(titleW)})` }} />
      {body.map((ln, i) => {
        const p = clamp(pos - i);
        if (p <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", right: 46 * k, top: (214 + i * 66) * k, width: 508 * k, height: 50 * k }}>
            <div style={{ position: "absolute", right: 0, top: 0, direction: "rtl", fontFamily: F.vz, fontSize: 28 * k, lineHeight: 1.6, color: "#2A2520", whiteSpace: "nowrap", clipPath: `inset(-20% 0 -20% ${(1 - p) * 100}%)` }}>{ln}</div>
            {p < 1 ? <div style={{ position: "absolute", left: `${(1 - p) * 100}%`, top: 8 * k, width: 4 * k, height: 36 * k, marginLeft: -2 * k, background: C.ai, boxShadow: `0 0 ${10 * k}px ${C.ai}` }} /> : null}
          </div>
        );
      })}
      {/* footer: who drafted it */}
      <div style={{ position: "absolute", left: 46 * k, bottom: 44 * k, display: "flex", alignItems: "center", gap: 12 * k, opacity: ai }}>
        <div style={{ width: 14 * k, height: 14 * k, borderRadius: "50%", background: "#B8231F", boxShadow: `0 0 ${8 * k}px rgba(184,35,31,.5)` }} />
        <div style={{ fontFamily: F.cond, fontWeight: 600, fontSize: 26 * k, letterSpacing: 2.5 * k, color: "#5B4F43", direction: "ltr" }}>{by}</div>
      </div>
      <div style={{ position: "absolute", right: 46 * k, bottom: 46 * k, width: 190 * k, borderTop: `${2 * k}px solid rgba(42,37,32,0.45)` }}>
        <div style={{ direction: "rtl", fontFamily: F.vz, fontSize: 26 * k, color: "#6B6055", marginTop: 6 * k, textAlign: "right" }}>امضا</div>
      </div>
      {children}
    </div>
  );
};


let uid = 0;
const useId = (p: string) => React.useMemo(() => `${p}${uid++}`, [p]);

// ── walnut ────────────────────────────────────────────────────────────────────────────────────────────────────
/** walnut planks: long fractal grain (SVG turbulence, deterministic), plank seams, a soft sheen */
export const Wood: React.FC<{ w: number; h: number; seed?: number; scale?: number; plank?: number; style?: React.CSSProperties }> = ({ w, h, seed = 3, scale = 1, plank = 260, style }) => {
  const id = useId("vnwood");
  const sw = Math.ceil(w / scale), sh = Math.ceil(h / scale);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden", background: "#2a170d", ...style }}>
      <svg width={sw} height={sh} style={{ position: "absolute", left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: "0 0", display: "block" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.0019 0.034" numOctaves={4} seed={seed} result="n" />
          <feColorMatrix in="n" type="matrix" values="1.25 0 0 0 -0.12  1.25 0 0 0 -0.12  1.25 0 0 0 -0.12  0 0 0 0 1" result="m" />
          <feComponentTransfer in="m">
            <feFuncR type="table" tableValues="0.05 0.088 0.14 0.205 0.27 0.31" />
            <feFuncG type="table" tableValues="0.027 0.048 0.078 0.115 0.15 0.175" />
            <feFuncB type="table" tableValues="0.015 0.026 0.04 0.058 0.072 0.085" />
          </feComponentTransfer>
        </filter>
        <rect width={sw} height={sh} filter={`url(#${id})`} />
      </svg>
      {/* fine grain + plank seams */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 ${plank - 3}px, rgba(0,0,0,0.55) ${plank - 3}px ${plank - 1}px, rgba(255,210,160,0.06) ${plank - 1}px ${plank}px), repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 9px, rgba(0,0,0,0.07) 9px 10px)` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,214,160,0.05), rgba(255,214,160,0) 40%, rgba(255,214,160,0.06) 70%, rgba(0,0,0,0) 100%)" }} />
    </div>
  );
};


// ── the gavel (side view: head axis vertical, handle to the right) and its sound block ────────────────────────
/** gavel sprite in a 640×240 box; head centre at (95,120), handle runs to x≈630 */
export const Gavel: React.FC<{ w?: number }> = ({ w = 640 }) => {
  const id = useId("vngv");
  const k = w / 640;
  return (
    <svg width={w} height={240 * k} viewBox="0 0 640 240" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24120a" />
          <stop offset="0.35" stopColor="#7a4626" />
          <stop offset="0.55" stopColor="#5a321a" />
          <stop offset="1" stopColor="#1e0f07" />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1e0f07" />
          <stop offset="0.3" stopColor="#6e3f22" />
          <stop offset="0.48" stopColor="#8a5530" />
          <stop offset="0.7" stopColor="#4a2814" />
          <stop offset="1" stopColor="#170b05" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6a4f22" />
          <stop offset="0.35" stopColor="#E2C68E" />
          <stop offset="0.6" stopColor="#B08D57" />
          <stop offset="1" stopColor="#4d3714" />
        </linearGradient>
      </defs>
      {/* handle (tapers, rounded knob at the end) */}
      <path d="M150 106 L560 100 Q600 98 622 104 Q638 112 622 128 Q600 136 560 134 L150 134 Z" fill={`url(#${id}h)`} />
      <path d="M160 109 L560 104" stroke="rgba(255,214,170,0.22)" strokeWidth={3} />
      {/* collar */}
      <rect x={146} y={98} width={18} height={44} rx={5} fill={`url(#${id}b)`} />
      {/* head: cylinder, axis vertical */}
      <rect x={40} y={8} width={110} height={224} rx={16} fill={`url(#${id}d)`} />
      <rect x={40} y={34} width={110} height={16} fill={`url(#${id}b)`} />
      <rect x={40} y={190} width={110} height={16} fill={`url(#${id}b)`} />
      <rect x={40} y={8} width={110} height={10} rx={5} fill="rgba(0,0,0,0.35)" />
      <rect x={40} y={222} width={110} height={10} rx={5} fill="rgba(0,0,0,0.45)" />
    </svg>
  );
};
/** the round sound block: a walnut cylinder with a brass band, seen from a low front angle (w × w*0.42);
 *  its top face centre is at (w/2, w*0.13) */
export const SoundBlock: React.FC<{ w?: number }> = ({ w = 320 }) => {
  const id = useId("vnsb");
  const h = w * 0.42, ry = w * 0.13, top = ry, bot = h - ry;
  const band = top + (bot - top) * 0.52;
  const side = (y0: number, y1: number) => `M0 ${y0} L0 ${y1} A ${w / 2} ${ry} 0 0 0 ${w} ${y1} L${w} ${y0} A ${w / 2} ${ry} 0 0 1 0 ${y0} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#120803" />
          <stop offset="0.28" stopColor="#5a321a" />
          <stop offset="0.42" stopColor="#7e4a26" />
          <stop offset="0.7" stopColor="#3a1f0e" />
          <stop offset="1" stopColor="#0d0602" />
        </linearGradient>
        <radialGradient id={`${id}t`} cx="0.42" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#9a6438" />
          <stop offset="0.55" stopColor="#6a3c1e" />
          <stop offset="1" stopColor="#3a1f0e" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4d3714" />
          <stop offset="0.35" stopColor="#E2C68E" />
          <stop offset="0.6" stopColor="#B08D57" />
          <stop offset="1" stopColor="#3a2a0e" />
        </linearGradient>
      </defs>
      <path d={side(top, bot)} fill={`url(#${id}s)`} />
      <path d={side(band, band + w * 0.03)} fill={`url(#${id}b)`} />
      <ellipse cx={w / 2} cy={top} rx={w / 2} ry={ry} fill={`url(#${id}t)`} />
      <ellipse cx={w / 2} cy={top} rx={w / 2 - 2} ry={ry - 1.5} fill="none" stroke="rgba(255,214,170,0.45)" strokeWidth={2.5} />
      <ellipse cx={w / 2} cy={top} rx={w * 0.36} ry={ry * 0.72} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={2} />
    </svg>
  );
};


// ── a typed contract page (top-down) ──────────────────────────────────────────────────────────────────────────
export const Contract: React.FC<{ w?: number }> = ({ w = 340 }) => {
  const h = w * 1.32;
  return (
    <div style={{ position: "relative", width: w, height: h, background: "linear-gradient(175deg, #f7f1e4, #ece3d1)", borderRadius: 3, boxShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: w * 0.07, textAlign: "center", fontFamily: F.serif, fontSize: w * 0.075, letterSpacing: 2, color: C.inkOnPaper }}>AGREEMENT</div>
      <div style={{ position: "absolute", left: w * 0.3, right: w * 0.3, top: w * 0.18, height: 2, background: "rgba(26,23,20,0.4)" }} />
      {Array.from({ length: 13 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: w * 0.1, width: w * (0.8 - (i % 4 === 3 ? 0.3 : 0.04 * (i % 3))), top: w * 0.26 + i * w * 0.07, height: 3, background: "rgba(26,23,20,0.28)", borderRadius: 2 }} />
      ))}
      <div style={{ position: "absolute", left: w * 0.1, top: h - w * 0.2, fontFamily: F.serif, fontSize: w * 0.05, color: "rgba(26,23,20,0.6)" }}>§ 12.4</div>
      <div style={{ position: "absolute", right: w * 0.1, top: h - w * 0.17, width: w * 0.32, height: 2, background: "rgba(26,23,20,0.5)" }} />
    </div>
  );
};

// ── job card icons (line art, viewBox 0 0 100 100) ────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ReactNode> = {
  surgeon: <path d="M6 56 H30 L38 34 L50 78 L60 46 L66 56 H94" />,
  pilot: <path d="M50 8 C55 8 56 16 56 24 V40 L90 60 V68 L56 58 V80 L66 88 V93 L50 89 L34 93 V88 L44 80 V58 L10 68 V60 L44 40 V24 C44 16 45 8 50 8 Z" />,
  ceo: <g><rect x="10" y="32" width="80" height="52" rx="6" /><path d="M36 32 V22 C36 18 38 16 42 16 H58 C62 16 64 18 64 22 V32 M10 54 H90 M44 54 V62 H56 V54" /></g>,
  code: <path d="M34 26 L12 50 L34 74 M66 26 L88 50 L66 74 M56 18 L44 82" />,
  lawyer: <g><path d="M50 12 V86 M30 86 H70 M18 26 H82 M50 12 L46 18 H54 Z" /><path d="M18 26 L6 54 H30 Z M82 26 L70 54 H94 Z" /><path d="M6 54 C10 62 26 62 30 54 M70 54 C74 62 90 62 94 54" /></g>,
  dentist: <path d="M30 14 C18 14 12 26 14 40 C16 54 22 58 24 72 C26 88 34 92 38 80 C41 70 44 62 50 62 C56 62 59 70 62 80 C66 92 74 88 76 72 C78 58 84 54 86 40 C88 26 82 14 70 14 C62 14 58 20 50 20 C42 20 38 14 30 14 Z" />,
  pharma: <g><rect x="18" y="36" width="64" height="28" rx="14" transform="rotate(-35 50 50)" /><path d="M41 63 L59 37" /></g>,
  banker: <path d="M12 86 H90 M22 86 V60 M40 86 V48 M58 86 V56 M76 86 V30 M18 50 L40 32 L56 42 L84 16 M70 16 H84 V30" />,
  oil: <path d="M50 10 C50 10 22 44 22 62 C22 78 35 90 50 90 C65 90 78 78 78 62 C78 44 50 10 50 10 Z M36 66 C36 74 42 80 50 80" />,
};
export type Job = { fa: string; en: string; icon: keyof typeof ICONS };
export const JOBS: Job[] = [
  { fa: "جراح", en: "SURGEON", icon: "surgeon" },
  { fa: "خلبان", en: "PILOT", icon: "pilot" },
  { fa: "مدیرعامل", en: "CEO", icon: "ceo" },
  { fa: "برنامه‌نویس", en: "SOFTWARE ENGINEER", icon: "code" },
  { fa: "وکیل", en: "LAWYER", icon: "lawyer" },
  { fa: "دندان‌پزشک", en: "DENTIST", icon: "dentist" },
  { fa: "داروساز", en: "PHARMACIST", icon: "pharma" },
  { fa: "بانکدار", en: "INVESTMENT BANKER", icon: "banker" },
  { fa: "مهندس نفت", en: "PETROLEUM ENGINEER", icon: "oil" },
];
/** a profession card: dark glass, line icon, Persian title, small English; `hot` 0..1 = targeted (red), `scan` 0..1 */
export const JobCard: React.FC<{ job: Job; w: number; h: number; hot?: number; scan?: number; lock?: number; dim?: number; idx?: number }> = ({ job, w, h, hot = 0, scan = 0, lock = 0, dim = 0 }) => {
  const ic = mix(0.0, 1, 1);
  const border = lock > 0 ? `rgba(229,50,45,${0.5 + 0.5 * lock})` : `rgba(244,238,230,${0.12 + 0.3 * scan})`;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 22, overflow: "hidden", background: lock > 0 ? `linear-gradient(170deg, rgba(90,13,13,${0.9 * lock}), rgba(20,8,8,${0.95}))` : "linear-gradient(170deg, #1d1d24, #121216)", border: `2px solid ${border}`, boxShadow: `0 24px 60px rgba(0,0,0,0.55)${lock > 0 ? `, 0 0 ${60 * lock}px rgba(229,50,45,${0.35 * lock})` : ""}`, filter: dim > 0 ? `brightness(${1 - 0.9 * dim}) saturate(${1 - 0.7 * dim})` : undefined }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(255,255,255,${0.04 + 0.05 * scan}), rgba(255,255,255,0) 40%)` }} />
      <svg width={w * 0.42} height={w * 0.42} viewBox="0 0 100 100" style={{ position: "absolute", left: w * 0.29, top: h * 0.17, overflow: "visible", opacity: ic }}>
        <g fill="none" stroke={lock > 0 ? C.red2 : hot > 0.5 ? C.cream : "rgba(244,238,230,0.82)"} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">{ICONS[job.icon]}</g>
      </svg>
      <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, top: h * 0.6, textAlign: "center", fontFamily: F.fa, fontSize: w * 0.15, color: lock > 0 ? "#fff" : C.cream, whiteSpace: "nowrap" }}>{job.fa}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.6 + w * 0.2, textAlign: "center", fontFamily: F.cond, fontWeight: 500, fontSize: 26, letterSpacing: 2, color: lock > 0 ? C.red2 : C.dim, whiteSpace: "nowrap" }}>{job.en}</div>
    </div>
  );
};

// ── the hunter's reticle (corner brackets + crosshair ticks; no circles) ──────────────────────────────────────
export const Reticle: React.FC<{ w: number; h: number; k?: number; lock?: number; color?: string; label?: string }> = ({ w, h, k = 1, lock = 0, color = C.red, label }) => {
  const L = Math.min(w, h) * 0.22;
  const sw = 7 + 3 * lock;
  const c = (x: number, y: number, sx: number, sy: number) => <path d={`M${x} ${y + sy * L} V${y} H${x + sx * L}`} />;
  return (
    <svg width={w + 40} height={h + 40} style={{ position: "absolute", left: -20, top: -20, overflow: "visible", opacity: k }}>
      <g transform="translate(20,20)" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="square" style={{ filter: `drop-shadow(0 0 ${8 + 14 * lock}px rgba(229,50,45,0.6))` }}>
        {c(0, 0, 1, 1)}{c(w, 0, -1, 1)}{c(0, h, 1, -1)}{c(w, h, -1, -1)}
        {/* centre ticks */}
        <path d={`M${w / 2} ${-18} V${18} M${w / 2} ${h - 18} V${h + 18} M${-18} ${h / 2} H${18} M${w - 18} ${h / 2} H${w + 18}`} strokeWidth={4} />
      </g>
      {label ? (
        <text x={20 + 4} y={h + 20 + 46} fill={color} style={{ fontFamily: F.cond, fontWeight: 600, fontSize: 28, letterSpacing: 3 }}>{label}</text>
      ) : null}
    </svg>
  );
};

/** law-book spines on a shelf (dim background) */
export const Books: React.FC<{ w: number; y: number; h?: number; seed?: number }> = ({ w, y, h = 230, seed = 1 }) => {
  const books: React.ReactNode[] = [];
  const cols = ["#3d1512", "#1d2a22", "#2b1d12", "#4a1d18", "#17202b", "#33261a", "#5a1c16"];
  let x = 0, i = 0;
  while (x < w) {
    const bw = 34 + Math.floor(hash(i * 7.3 + seed) * 30);
    const bh = h - Math.floor(hash(i * 3.1 + seed * 2) * 40);
    const col = cols[Math.floor(hash(i * 1.9 + seed * 5) * cols.length)];
    books.push(
      <div key={i} style={{ position: "absolute", left: x, top: y + (h - bh), width: bw - 3, height: bh, borderRadius: 3, background: `linear-gradient(90deg, rgba(0,0,0,0.45), ${col} 25%, ${col} 70%, rgba(0,0,0,0.5))` }}>
        <div style={{ position: "absolute", left: 3, right: 3, top: 18, height: 3, background: "rgba(226,198,142,0.55)" }} />
        <div style={{ position: "absolute", left: 3, right: 3, top: 25, height: 2, background: "rgba(226,198,142,0.4)" }} />
        <div style={{ position: "absolute", left: 6, right: 6, top: bh * 0.32, height: bh * 0.18, background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(226,198,142,0.35)", borderBottom: "1px solid rgba(226,198,142,0.35)" }} />
        <div style={{ position: "absolute", left: 3, right: 3, bottom: 22, height: 3, background: "rgba(226,198,142,0.45)" }} />
      </div>,
    );
    x += bw;
    i++;
  }
  return <>{books}</>;
};

/** a horizontal motion blur filter (SVG) for whip pans; returns [defs, cssFilter] */
export const useHBlur = (amt: number): [React.ReactNode, string | undefined] => {
  const id = useId("vnhb");
  const a = Math.max(0, amt);
  if (a < 0.5) return [null, undefined];
  return [
    <svg key="hb" width={0} height={0} style={{ position: "absolute" }}>
      <filter id={id} x="-30%" y="-5%" width="160%" height="110%">
        <feGaussianBlur stdDeviation={`${a.toFixed(1)} 0`} />
      </filter>
    </svg>,
    `url(#${id})`,
  ];
};

// ── phone (top-down, lying on the desk): a notification from the assistant ───────────────────────────────────
/** `wake` 0..1 lights the lock screen, `note` 0..1 drops the notification card in */
export const Phone: React.FC<{ w?: number; wake: number; note: number; app?: string; title?: string; line1?: string; line2?: string; clock?: string }> = ({ w = 300, wake, note, app = "LEGAL ASSISTANT", title = "دستیار حقوقی", line1 = "پرونده‌ی تازه خونده شد", line2 = "۳ بند مشکل‌دار پیدا شد", clock = "09:41" }) => {
  const h = Math.round(w * 2.05);
  const k = w / 300;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 44 * k, background: "linear-gradient(145deg, #2C2C33, #0B0B0E 40%, #17171B)", boxShadow: "0 30px 50px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(255,255,255,0.08)" }}>
      <div style={{ position: "absolute", inset: 11 * k, borderRadius: 34 * k, background: "#030304", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: wake, background: "radial-gradient(120% 70% at 50% 10%, #3A1A16 0%, #140A09 55%, #060505 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 46 * k, textAlign: "center", opacity: wake, fontFamily: F.ui, fontWeight: 200, fontSize: 64 * k, color: C.cream, direction: "ltr" }}>{clock}</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 128 * k, textAlign: "center", opacity: wake * 0.7, fontFamily: F.cond, fontWeight: 500, fontSize: 18 * k, letterSpacing: 3 * k, color: C.cream, direction: "ltr" }}>{app}</div>
        <div style={{ position: "absolute", left: 12 * k, right: 12 * k, top: 180 * k, borderRadius: 22 * k, padding: `${16 * k}px`, background: "rgba(40,30,30,0.92)", border: `1px solid rgba(229,50,45,0.45)`, opacity: clamp(note * 1.5), transform: `translateY(${(1 - ease.outBack(clamp(note))) * -60 * k}px) scale(${mix(0.92, 1, ease.out(clamp(note)))})`, boxShadow: `0 0 ${30 * k}px rgba(229,50,45,${0.3 * note})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * k, direction: "rtl" }}>
            <div style={{ width: 46 * k, height: 46 * k, borderRadius: 12 * k, background: C.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={30 * k} height={30 * k} viewBox="0 0 100 100"><g fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">{ICONS.lawyer}</g></svg>
            </div>
            <div style={{ fontFamily: F.vzB, fontSize: 25 * k, color: C.cream }}>{title}</div>
          </div>
          <div style={{ direction: "rtl", textAlign: "right", fontFamily: F.vzB, fontSize: 25 * k, color: C.cream, marginTop: 10 * k, lineHeight: 1.45, whiteSpace: "nowrap" }}>{line1}</div>
          <div style={{ direction: "rtl", textAlign: "right", fontFamily: F.vz, fontSize: 24 * k, color: "rgba(244,238,230,0.75)", lineHeight: 1.45, whiteSpace: "nowrap" }}>{line2}</div>
        </div>
      </div>
    </div>
  );
};
