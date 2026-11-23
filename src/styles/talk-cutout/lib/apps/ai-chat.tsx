// Talk Cutout · a generic AI chat app (dark, portrait tablet, screen pt 834×1194). Her own spoken words type themselves
// into the composer as she says them (each word types across its own spoken length, the word being typed glows accent
// and cools to cream) — those typed words ARE the captions there (hide the caption chunk). Then the send, the user
// bubble, a reply with step chips (spinner → ✓) and a result card. Which AI it is can stay a secret (hide: blurs the
// name and the mark; the comment CTA promises the answer in the DM).
import React from "react";
import { C, F, accentA } from "../theme";
import { clamp, ease, mix } from "../time";
import { Icon, MysteryMark, hideBlur } from "../icons";
import { TB } from "../device";

export const CU = {
  bg: "#1f1e1d",
  card: "#2a2927",
  card2: "#30302e",
  field: "#30302e",
  line: "rgba(250,249,245,0.10)",
  tx: "#faf9f5",
  dim: "rgba(250,249,245,0.62)",
  faint: "rgba(250,249,245,0.38)",
};

/** the prompt typed word by word on the narration: keys = the shown words with the spoken word's start/end */
export const makePrompt = (keys: { shown: string; s: number; e: number }[]) => {
  const spans = (t: number) => {
    const o: { w: string; hot: number }[] = [];
    for (const k of keys) {
      if (t < k.s) break;
      const d = Math.max(0.12, (k.e - k.s) * 0.85);
      const n = Math.max(1, Math.ceil(k.shown.length * clamp((t - k.s) / d)));
      o.push({ w: k.shown.slice(0, n), hot: 1 - clamp((t - k.s - d) / 0.35) });
    }
    return o;
  };
  return { spans, text: keys.map((k) => k.shown).join(" "), start: keys[0]?.s ?? 0, end: keys[keys.length - 1]?.e ?? 0 };
};

export type AiChip = { label: string; at: number; done: number };
export type AiChatP = {
  t: number;
  name?: string; // the app's name in the top bar
  hide?: boolean; // keep which AI it is a secret (blur its name and mark)
  greeting?: string; // the empty state
  placeholder?: string; // the empty composer
  attach?: { at: number; node: React.ReactNode }; // a chip that lands in the composer (an idea note, a file …)
  typed: { w: string; hot: number }[]; // makePrompt(...).spans(t)
  typingFrom: number; // when the first word starts (the greeting fades)
  sent: number; // film time of the send
  userText: string; // the prompt as sent
  reply?: { text: string; chips: AiChip[]; card?: { at: number; title: string; lines: string[] } };
};

const Spinner: React.FC<{ t: number }> = ({ t }) => (
  <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2.4px solid ${C.accent}`, borderTopColor: "transparent", transform: `rotate(${t * 540}deg)`, display: "inline-block" }} />
);

export const AiChat: React.FC<AiChatP> = ({ t, name = "AI", hide = true, greeting = "امروز چی بسازیم؟", placeholder = "پیام بده…", attach, typed, typingFrom, sent, userText, reply }) => {
  const isSent = t >= sent;
  const sendPress = clamp((t - (sent - 0.12)) / 0.24);
  const shrink = ease.inOut(clamp((t - sent) / 0.35));
  const a0 = attach ? ease.outBack(clamp((t - attach.at) / 0.45)) : 0;
  const replyA = clamp((t - (sent + 0.25)) / 0.4);
  const spin = isSent ? (t - sent) * 120 : 0;
  const hasText = typed.length > 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: CU.bg, color: CU.tx, overflow: "hidden" }}>
      {/* top bar */}
      <div style={{ position: "absolute", left: 0, top: 0, width: TB.w, height: 84, display: "flex", alignItems: "center", padding: "18px 28px 0", boxSizing: "border-box", gap: 14, fontFamily: F.ui, direction: "ltr", zIndex: 20, background: CU.bg, borderBottom: `1px solid ${CU.line}` }}>
        <MysteryMark size={32} hidden={hide} style={{ transform: `rotate(${spin * 0.1}deg)` }} />
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.3, display: "inline-block", ...hideBlur(7, hide) }}>{name}</span>
        <div style={{ flex: 1 }} />
        <div style={{ padding: "6px 12px", borderRadius: 10, background: CU.card, fontSize: 15, color: CU.dim }}>
          <span style={{ display: "inline-block", ...hideBlur(5.5, hide) }}>Model 2</span>
        </div>
      </div>
      {/* empty state */}
      {!isSent ? (
        <div style={{ position: "absolute", left: 0, top: 360, width: TB.w, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: (1 - clamp((t - sent + 0.2) / 0.2)) * (1 - 0.75 * clamp((t - typingFrom) / 0.6)) }}>
          <MysteryMark size={64} hidden={hide} />
          <div style={{ fontFamily: F.vzB, fontSize: 34, direction: "rtl" }}>{greeting}</div>
        </div>
      ) : null}
      {/* conversation */}
      {isSent ? (
        <>
          <div style={{ position: "absolute", right: 40, top: 110, display: "flex", direction: "ltr", opacity: ease.out(clamp((t - sent) / 0.3)) }}>{attach?.node}</div>
          <div style={{ position: "absolute", right: 40, top: attach ? 196 : 110, maxWidth: 640, padding: "16px 22px", borderRadius: 22, background: CU.card2, fontFamily: F.vz, fontSize: 25, lineHeight: 1.6, direction: "rtl", textAlign: "right", opacity: ease.out(clamp((t - sent) / 0.3)), transform: `translateY(${(1 - ease.out(clamp((t - sent) / 0.35))) * 60}px)` }}>
            {userText}
          </div>
          {reply ? (
            <div style={{ position: "absolute", left: 40, top: attach ? 330 : 250, width: TB.w - 80, opacity: replyA }}>
              <MysteryMark size={36} hidden={hide} />
              <div style={{ position: "absolute", left: 52, top: 0, right: 0, fontFamily: F.vz, fontSize: 24, lineHeight: 1.7, direction: "rtl", textAlign: "right", color: CU.tx }}>{reply.text}</div>
              <div style={{ position: "absolute", left: 52, top: 92, right: 0, display: "flex", flexWrap: "wrap", gap: 10, direction: "rtl" }}>
                {reply.chips.map((c, i) => {
                  const on = clamp((t - c.at) / 0.3), done = t >= c.done;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: done ? "rgba(127,209,139,0.12)" : CU.card, border: `1px solid ${done ? "rgba(127,209,139,0.35)" : CU.line}`, fontFamily: F.vzB, fontSize: 19, color: done ? "#bfe8c5" : CU.tx, opacity: ease.out(on), transform: `scale(${0.9 + 0.1 * ease.outBack(on)})` }}>
                      {done ? <Icon n="check" size={17} color="#7fd18b" sw={2.8} /> : <Spinner t={t - c.at} />}
                      {c.label}
                    </div>
                  );
                })}
              </div>
              {reply.card && t >= reply.card.at ? (
                <div style={{ position: "absolute", left: 52, right: 0, top: 170, padding: "22px 26px", borderRadius: 20, background: CU.card, border: `1px solid ${CU.line}`, direction: "rtl", opacity: ease.out(clamp((t - reply.card.at) / 0.4)), transform: `translateY(${(1 - ease.out(clamp((t - reply.card.at) / 0.45))) * 30}px)`, boxShadow: `0 0 0 ${2 * clamp((t - reply.card.at - 0.4) / 0.3) * (1 - clamp((t - reply.card.at - 1.6) / 0.5))}px ${accentA(0.7)}, 0 20px 50px rgba(0,0,0,0.35)` }}>
                  <div style={{ fontFamily: F.head, fontSize: 34, color: CU.tx }}>{reply.card.title}</div>
                  {reply.card.lines.map((l, i) => {
                    const k = ease.out(clamp((t - reply.card!.at - 0.25 - i * 0.22) / 0.35));
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, opacity: k, transform: `translateX(${(k - 1) * 20}px)` }}>
                        <span style={{ width: 34, height: 34, borderRadius: 10, background: accentA(0.16), border: `1px solid ${accentA(0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontWeight: 800, fontSize: 17, color: C.accent2, flex: "none" }}>{i + 1}</span>
                        <span style={{ fontFamily: F.vz, fontSize: 23, color: CU.tx, whiteSpace: "nowrap" }}>{l}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {/* composer */}
      <div style={{ position: "absolute", left: 32, top: mix(TB.h - 310, TB.h - 144, shrink), width: TB.w - 64, height: mix(290, 124, shrink), borderRadius: 26, background: CU.field, border: `1px solid ${CU.line}`, boxShadow: "0 12px 40px rgba(0,0,0,0.35)", zIndex: 10, opacity: mix(1, 0.45, shrink) }}>
        {!isSent && attach ? (
          <div style={{ position: "absolute", right: 18, top: 16, display: "flex", direction: "ltr", opacity: clamp(a0 * 2), transform: `translateY(${(1 - a0) * -120}px) scale(${0.6 + 0.4 * a0})`, transformOrigin: "100% 0%" }}>{attach.node}</div>
        ) : null}
        <div style={{ position: "absolute", right: 26, left: 26, top: isSent ? 24 : attach ? 102 : 40, fontFamily: F.vz, fontSize: 31, lineHeight: 1.45, direction: "rtl", textAlign: "right", color: hasText && !isSent ? CU.tx : CU.faint, overflow: "hidden", maxHeight: 136 }}>
          {!isSent && hasText ? (
            <>
              {typed.map((s, i) => (
                <React.Fragment key={i}>
                  {i ? " " : ""}
                  <span style={{ color: s.hot > 0 ? `rgb(${Math.round(250 - 5 * s.hot)},${Math.round(249 - 110 * s.hot)},${Math.round(245 - 200 * s.hot)})` : undefined }}>{s.w}</span>
                </React.Fragment>
              ))}
              <span style={{ display: "inline-block", width: 2.5, height: 30, background: C.accent, marginRight: 3, verticalAlign: -6, opacity: Math.sin(t * 9) > -0.2 ? 1 : 0 }} />
            </>
          ) : (
            placeholder
          )}
        </div>
        <div style={{ position: "absolute", left: 18, bottom: 14, display: "flex", gap: 12, alignItems: "center", direction: "ltr" }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${CU.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="plus" size={20} color={CU.dim} />
          </div>
        </div>
        <div style={{ position: "absolute", right: 16, bottom: 12, width: 44, height: 44, borderRadius: 12, background: hasText && !isSent ? C.accent : accentA(0.35), display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.15 * Math.sin(Math.PI * sendPress)})` }}>
          <Icon n="up" size={24} color="#fff" sw={2.6} />
        </div>
      </div>
    </div>
  );
};
