// Phone Assistant · phone screens at true UI size (393×852): the call with the assistant (voice orb, live
// transcript) and the SMS thread.
import React from "react";
import { BODY, C, FA, MONO, kick, ramp } from "./theme";
import { Aperture, Avatar, Bubble, Dots, Ico, Orb, PH, StatusBar, Wave, ease, emph } from "./ui";

export type Line = { at: number; me?: boolean; text: string; dur?: number; label?: string };

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

/** the stage behind a screen: void, the warm key light from the top right, a faint warm floor */
const ScreenBg: React.FC<{ glow?: number }> = ({ glow = 1 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 90% 45% at 88% 0%, rgba(255,154,74,${0.1 * glow}) 0%, rgba(255,154,74,0) 70%), radial-gradient(ellipse 80% 40% at 50% 34%, rgba(255,154,74,${0.07 * glow}) 0%, rgba(255,154,74,0) 70%), ${C.ink}` }} />
);

// ─── call ──────────────────────────────────────────────────────────────────────────────────────────────────
export const CallScreen: React.FC<{
  t: number;
  ringAt: number; // dialling starts
  connectAt: number; // answered
  name?: string;
  sub?: string;
  who?: "ai" | string; // "ai" (the assistant's orb) or a person's initial
  lines?: Line[];
  keep?: number; // how many transcript bubbles stay
  speaking?: boolean;
  endAt?: number;
  big?: boolean;
  /** the status-bar clock */ clock?: string;
}> = ({ t, ringAt, connectAt, name = "دستیار", sub, who = "ai", lines = [], keep = 3, speaking = true, endAt, big, clock }) => {
  const ringing = t < connectAt;
  const ended = endAt !== undefined && t >= endAt;
  const conK = ramp(t, connectAt, connectAt + 0.35);
  const vis = lines.filter((l) => t >= l.at).slice(-keep);
  const orbSize = big ? 200 : 140;
  const top0 = big ? 118 : 96;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ScreenBg />
      <StatusBar clock={clock} />
      {/* who */}
      <div style={{ position: "absolute", left: 0, top: top0, width: PH.w, display: "flex", justifyContent: "center" }}>
        {who === "ai" ? (
          <div style={{ width: orbSize, height: orbSize, position: "relative" }}>
            <Orb size={orbSize} t={t} amp={ringing ? 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 6)) : speaking ? undefined : 0.05} />
          </div>
        ) : (
          <div style={{ width: orbSize, height: orbSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: `scale(${1 + 0.05 * Math.sin(t * 5) * (ringing ? 1 : 0)})` }}>
              <Avatar size={orbSize * 0.7} letter={who} />
            </div>
          </div>
        )}
      </div>
      <div dir="rtl" style={{ position: "absolute", left: 0, top: top0 + orbSize + 4, width: PH.w, textAlign: "center" }}>
        <div style={{ fontFamily: FA, fontWeight: 800, fontSize: 30, color: C.fg, letterSpacing: 0, lineHeight: 1.3 }}>{name}</div>
        {sub && <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 17, color: C.accent300, marginTop: 2 }}>{sub}</div>}
        <div style={{ marginTop: 8, height: 26, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {ended ? (
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 17, color: C.fgMute }}>تماس تمام شد</span>
          ) : ringing ? (
            <>
              <Aperture t={t} size={22} />
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 17, color: C.fgDim }}>در حال تماس…</span>
            </>
          ) : (
            <>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: C.accent, boxShadow: "0 0 10px rgba(255,154,74,.7)" }} />
              <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 18, color: C.fgDim, direction: "ltr" }}>{fmt(t - connectAt)}</span>
            </>
          )}
        </div>
      </div>
      {/* live voice */}
      <div style={{ position: "absolute", left: (PH.w - 250) / 2, top: top0 + orbSize + (sub ? 112 : 92), opacity: conK * (ended ? 0.3 : 1) }}>
        <Wave t={t} w={250} h={38} active={speaking && !ringing} />
      </div>
      {/* live transcript, right under the voice (kept high so the reel's caption area never covers it) */}
      <div style={{ position: "absolute", left: 18, right: 18, top: top0 + orbSize + (sub ? 168 : 148), display: "flex", flexDirection: "column", gap: 12 }}>
        {vis.map((l, i) => {
          const age = vis.length - 1 - i;
          return (
            <div key={l.at} style={{ opacity: 1 - 0.3 * age }}>
              <Bubble me={l.me} text={l.text} k={ramp(t, l.at, l.at + 0.32)} type={ramp(t, l.at, l.at + (l.dur ?? 0.9))} size={21} maxW={330} label={l.label} />
            </div>
          );
        })}
      </div>
      {/* controls */}
      <div dir="ltr" style={{ position: "absolute", left: 0, top: PH.h - 112, width: PH.w, display: "flex", justifyContent: "center", gap: 34 }}>
        {(["mic", "speaker"] as const).map((n) => (
          <div key={n} style={{ width: 66, height: 66, borderRadius: 99, background: C.badge, boxShadow: `inset 0 0 0 1.5px ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico n={n} size={28} color={C.fgDim} />
          </div>
        ))}
        <div style={{ width: 66, height: 66, borderRadius: 99, background: `linear-gradient(180deg, #8A4B19, ${C.ember})`, boxShadow: "inset 0 1px 0 rgba(255,220,170,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico n="phoneDown" size={30} color={C.accentHot} />
        </div>
      </div>
    </div>
  );
};

// ─── SMS ───────────────────────────────────────────────────────────────────────────────────────────────────
export const SmsScreen: React.FC<{
  t: number;
  offline: number; // 0..1 internet gone
  typeFrom: number;
  typeTo: number;
  ask: string;
  sendAt: number;
  dotsAt: number;
  replyAt: number;
  reply: string;
  /** the sender shown in the header */ name?: string;
  /** an optional small card under the reply (e.g. a map pin, the forecast) */ card?: { icon: Parameters<typeof Ico>[0]["n"]; title: string; sub: string };
  /** the status-bar clock */ clock?: string;
}> = ({ t, offline, typeFrom, typeTo, ask, sendAt, dotsAt, replyAt, reply, name = "دستیار", card, clock }) => {
  const sent = t >= sendAt;
  const typed = ramp(t, typeFrom, typeTo);
  const ws = ask.split(" ");
  const shown = ws.slice(0, Math.round(typed * ws.length)).join(" ");
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ScreenBg glow={0.6} />
      <StatusBar offline={offline} sigLit={ramp(t, sendAt - 0.2, sendAt + 0.3)} clock={clock} />
      {/* header */}
      <div dir="rtl" style={{ position: "absolute", left: 0, top: 56, width: PH.w, height: 74, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", boxSizing: "border-box", borderBottom: `1px solid ${C.line}` }}>
        <Ico n="back" size={26} color={C.fgDim} />
        <Avatar size={42} ai t={t} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 20, color: C.fg, lineHeight: 1.2 }}>{name}</span>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 13.5, color: C.accent300 }}>پیامک</span>
        </div>
      </div>
      {/* the internet bar (the brand's offline pattern: thin bar, no filter) */}
      <div dir="rtl" style={{ position: "absolute", left: 16, right: 16, top: 140, height: 40, borderRadius: 12, background: C.badge, boxShadow: `inset 0 0 0 1.2px ${C.line2}`, display: "flex", alignItems: "center", gap: 9, padding: "0 12px", opacity: ease(ramp(offline, 0.4, 1)) }}>
        <Ico n="wifi" size={20} color={C.fgMute} slash={1} />
        <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 16, color: C.fgDim }}>اینترنت قطعه؛ پیامک کار می‌کنه</span>
      </div>
      {/* thread */}
      <div style={{ position: "absolute", left: 18, right: 18, top: 200, display: "flex", flexDirection: "column", gap: 14 }}>
        {sent && <Bubble me text={ask} k={ramp(t, sendAt, sendAt + 0.32)} size={21} tick={ramp(t, sendAt + 0.35, sendAt + 0.6)} />}
        {t >= dotsAt && t < replyAt && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Dots t={t} k={ramp(t, dotsAt, dotsAt + 0.2)} />
          </div>
        )}
        {t >= replyAt && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <Bubble text={reply} k={ramp(t, replyAt, replyAt + 0.32)} type={ramp(t, replyAt, replyAt + 0.9)} size={21} maxW={325} />
            {/* an optional small card under the reply */}
            {card ? (
            <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 16, background: `linear-gradient(180deg, ${C.badge}, ${C.cardHi})`, boxShadow: `0 0 0 1.2px ${C.line2}`, opacity: emph(ramp(t, replyAt + 0.7, replyAt + 1.05)), transform: `translateY(${(1 - emph(ramp(t, replyAt + 0.7, replyAt + 1.05))) * 12}px)` }}>
              <div style={{ transform: card.icon === "sun" ? `rotate(${t * 20}deg)` : undefined }}>
                <Ico n={card.icon} size={34} color={C.accent} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 19, color: C.fg }}>{card.title}</span>
                <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 15.5, color: C.fgMute }}>{card.sub}</span>
              </div>
            </div>
            ) : null}
          </div>
        )}
      </div>
      {/* compose */}
      <div dir="rtl" style={{ position: "absolute", left: 14, right: 14, top: PH.h - 104, height: 56, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 52, borderRadius: 26, background: C.badge, boxShadow: `inset 0 0 0 1.5px ${C.line2}`, display: "flex", alignItems: "center", padding: "0 18px", fontFamily: BODY, fontWeight: 500, fontSize: 19, color: !sent && shown ? C.fg : C.fgCap, overflow: "hidden", whiteSpace: "nowrap" }}>
          {!sent && shown ? (
            <>
              {shown}
              <span style={{ display: "inline-block", width: 2, height: 22, background: C.accent, marginRight: 3, opacity: Math.floor(t * 2.2) % 2 ? 1 : 0.15 }} />
            </>
          ) : (
            "پیامک"
          )}
        </div>
        <div style={{ width: 52, height: 52, borderRadius: 99, background: !sent && typed >= 1 ? C.accent : C.line2, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.12 * kick(t, sendAt - 0.08, 0.3)})` }}>
          <Ico n="send" size={24} color={!sent && typed >= 1 ? C.onAccent : C.fgMute} sw={2} style={{ transform: "scaleX(-1)" }} />
        </div>
      </div>
    </div>
  );
};

