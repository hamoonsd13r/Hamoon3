// Talk Cutout · the CTA apps (dark mode, phone pt 393 wide, drawn over the speaker in front of her): the comment sheet
// where the comment word types and posts, the DM notification that drops into the band above her head, and the DM
// thread that grows out of it (the guide she promised arrives message by message). Avatars are faceless gradient discs
// with an initial; users are sample handles you invent.
import React from "react";
import { C, F, IG_GRAD, accentA } from "../theme";
import { clamp, ease, mix } from "../time";
import { Icon } from "../icons";
import { PH } from "../device";

const TX = "#f5f5f5", SUB = "#a8a8a8";

export type IgCm = { user: string; text: string; ago: string; likes?: string; hue: number };
const isFa = (s: string) => /[؀-ۿ]/.test(s);

const Av: React.FC<{ size: number; hue: number; letter: string; you?: boolean }> = ({ size, hue, letter, you }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", flex: "none", background: you ? `linear-gradient(135deg, ${C.accent}, #a33a0c)` : `linear-gradient(135deg, hsl(${hue},38%,46%), hsl(${hue + 30},40%,26%))`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontWeight: 800, fontSize: size * 0.42, color: "rgba(255,255,255,0.92)" }}>
    {you ? <Icon n="user" size={size * 0.56} color="#fff" sw={2.2} /> : letter}
  </div>
);
const CmRow: React.FC<{ c: IgCm; you?: boolean; style?: React.CSSProperties; heart?: number }> = ({ c, you, style, heart = 0 }) => (
  <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "0 14px", ...style }}>
    <Av size={34} hue={c.hue} letter={c.user[0].toUpperCase()} you={you} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 7, alignItems: "baseline", fontSize: 13, fontWeight: 600, color: TX }}>
        {c.user}
        <span style={{ fontWeight: 400, color: SUB, fontSize: 12.5 }}>{c.ago}</span>
      </div>
      <div style={{ marginTop: 3, fontSize: 15.5, lineHeight: 1.45, color: TX, direction: isFa(c.text) ? "rtl" : "ltr", textAlign: "left", fontFamily: isFa(c.text) ? F.vz : F.ui, fontWeight: isFa(c.text) ? 400 : 600, unicodeBidi: "plaintext" }}>{c.text}</div>
      <div style={{ marginTop: 5, fontSize: 12.5, fontWeight: 600, color: SUB }}>Reply</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 8, width: 26 }}>
      <svg width={17} height={17} viewBox="0 0 24 24" style={{ transform: `scale(${1 + 0.35 * Math.sin(Math.PI * clamp(heart))})` }}>
        <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill={heart > 0.5 ? "#ff3040" : "none"} stroke={heart > 0.5 ? "#ff3040" : SUB} strokeWidth={2} />
      </svg>
      {c.likes ? <span style={{ fontSize: 11.5, color: SUB }}>{c.likes}</span> : null}
    </div>
  </div>
);

/** the comment sheet: `typed` = what the viewer has typed so far, `send` 0..1 the press, `posted` 0..1 the new
 *  comment sliding into the list, `hi` 0..1 an accent focus ring on the input box, `heart` the like on it */
export const IgComments: React.FC<{ comments: IgCm[]; typed: string; caret?: boolean; send?: number; posted?: number; hi?: number; mine?: IgCm; heart?: number; h?: number }> = ({ comments, typed, caret, send = 0, posted = 0, hi = 0, mine, heart = 0, h = 330 }) => {
  const pu = ease.out(clamp(posted));
  const emo = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];
  return (
    <div style={{ position: "relative", width: PH.w, height: h, background: "#16191d", borderRadius: "22px 22px 0 0", overflow: "hidden", fontFamily: F.ui, color: TX, direction: "ltr" }}>
      <div style={{ position: "absolute", left: PH.w / 2 - 20, top: 8, width: 40, height: 4, borderRadius: 2, background: "#3a3f45" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 22, textAlign: "center", fontSize: 15.5, fontWeight: 700 }}>Comments</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 52, height: 1, background: "#262a2f" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 64 }}>
        {mine ? (
          <div style={{ height: 70 * pu, opacity: pu, transform: `translateY(${(1 - pu) * -14}px)`, overflow: "hidden" }}>
            <CmRow c={mine} you heart={heart} style={{ background: accentA(0.14 * (1 - clamp(posted - 1))), paddingTop: 6, paddingBottom: 6 }} />
          </div>
        ) : null}
        {comments.map((c, i) => (
          <CmRow key={i} c={c} style={{ marginTop: i || mine ? 12 : 0 }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, background: "#16191d", borderTop: "1px solid #262a2f" }}>
        <div style={{ position: "absolute", left: 14, right: 14, top: 8, display: "flex", justifyContent: "space-between", fontSize: 22 }}>
          {emo.map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
        <div style={{ position: "absolute", left: 12, right: 12, top: 50, height: 44, display: "flex", alignItems: "center", gap: 10 }}>
          <Av size={34} hue={20} letter="" you />
          <div style={{ flex: 1, height: 42, borderRadius: 21, border: `1px solid ${hi > 0 ? accentA(0.4 + 0.6 * hi) : "#33383e"}`, boxShadow: hi > 0 ? `0 0 0 ${3 * hi}px ${accentA(0.28)}` : undefined, display: "flex", alignItems: "center", padding: "0 6px 0 14px", boxSizing: "border-box" }}>
            <div style={{ flex: 1, fontSize: typed ? 17 : 14.5, fontWeight: typed ? 700 : 400, color: typed ? TX : SUB, fontFamily: isFa(typed) ? F.vzB : F.ui, direction: "ltr", unicodeBidi: "plaintext" }}>
              {typed || "Add a comment..."}
              {caret ? <span style={{ display: "inline-block", width: 2, height: 19, background: C.igBlue, marginLeft: 2, verticalAlign: -3 }} /> : null}
            </div>
            {typed ? (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.igBlue, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.18 * Math.sin(Math.PI * clamp(send))})` }}>
                <Icon n="up" size={18} color="#fff" sw={2.6} />
              </div>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 800, color: SUB, border: `1.5px solid ${SUB}`, borderRadius: 5, padding: "1px 4px", marginRight: 6 }}>GIF</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** the DM notification's face (also drawn on the thread's box while it opens) */
export const DmNotice: React.FC<{ style?: React.CSSProperties; text?: string }> = ({ style, text = "یک پیام تازه در دایرکت 📩" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 30px", direction: "ltr", boxSizing: "border-box", ...style }}>
    <div style={{ width: 84, height: 84, borderRadius: 22, background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <Icon n="send" size={44} color="#fff" sw={2.4} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.ui, fontSize: 24, color: C.dim }}>
        <span style={{ fontWeight: 700, color: C.cream }}>Instagram</span>
        <span>now</span>
      </div>
      <div style={{ fontFamily: F.vzB, fontSize: 34, color: C.cream, direction: "rtl", textAlign: "right", marginTop: 6, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  </div>
);

const Ring: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: IG_GRAD, padding: 3, flex: "none", boxSizing: "border-box" }}>
    <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#3a2a1e", border: "3px solid #0c1014", boxSizing: "border-box" }} />
  </div>
);
export const Bubble: React.FC<{ t: number; at: number; children: React.ReactNode; wide?: boolean }> = ({ t, at, children, wide }) => {
  if (t < at) return null;
  const u = ease.outBack(clamp((t - at) / 0.4));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, direction: "ltr", opacity: clamp(u * 2), transform: `translateY(${(1 - clamp(u)) * 30}px) scale(${mix(0.9, 1, clamp(u))})`, transformOrigin: "0% 100%" }}>
      <Ring size={52} />
      <div style={{ maxWidth: wide ? 780 : 700, padding: "20px 28px", borderRadius: 34, background: "#262a2f", color: "#f5f5f5", fontFamily: F.vz, fontSize: 38, lineHeight: 1.5, direction: "rtl", textAlign: "right" }}>{children}</div>
    </div>
  );
};
export const Typing: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  if (t < at) return null;
  const u = ease.outBack(clamp((t - at) / 0.35));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, direction: "ltr", opacity: clamp(u * 2), transform: `translateY(${(1 - clamp(u)) * 24}px) scale(${mix(0.9, 1, clamp(u))})`, transformOrigin: "0% 100%" }}>
      <Ring size={52} />
      <div style={{ display: "flex", gap: 10, padding: "24px 28px", borderRadius: 34, background: "#262a2f" }}>
        {[0, 1, 2].map((i) => {
          const k = 0.5 + 0.5 * Math.sin((t - at) * 7 - i * 0.9);
          return <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: `rgba(245,245,245,${0.35 + 0.5 * k})`, transform: `translateY(${-6 * k}px)` }} />;
        })}
      </div>
    </div>
  );
};

/** a numbered guide card inside the DM (the thing the CTA promised) */
export const GuideCard: React.FC<{ t: number; at: number; title: string; items: string[]; glow?: number }> = ({ t, at, title, items, glow = 0 }) => {
  if (t < at) return null;
  const k0 = ease.outBack(clamp((t - at) / 0.45));
  return (
    <div style={{ marginLeft: 66, width: 760, borderRadius: 30, background: "#1d2126", border: `2px solid ${accentA(0.35 + 0.5 * glow)}`, boxShadow: glow > 0 ? `0 0 ${50 * glow}px ${accentA(0.4 * glow)}` : undefined, padding: "24px 30px", direction: "rtl", opacity: clamp(k0 * 2), transform: `translateY(${(1 - clamp(k0)) * 30}px) scale(${mix(0.92, 1, clamp(k0))})`, transformOrigin: "0% 0%", boxSizing: "border-box" }}>
      <div style={{ fontFamily: F.head, fontSize: 48, color: C.cream }}>{title}</div>
      {items.map((s, i) => {
        const k = ease.out(clamp((t - (at + 0.15 + i * 0.18)) / 0.3));
        // the card grows with each item (a card never waits half-empty for its rows)
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16 * k, maxHeight: 56 * k, overflow: "hidden", opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontWeight: 900, fontSize: 30, color: C.accentInk, flex: "none" }}>{i + 1}</div>
            <span style={{ fontFamily: F.vzB, fontSize: 33, color: C.cream, whiteSpace: "nowrap" }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
};
