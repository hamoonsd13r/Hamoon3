// Phone Assistant · set pieces: the calendar that locks a time, a contact card that rings, the task list that ticks
// itself off, a stopwatch, and the comment bar that types and posts. All pure functions of t.
import React from "react";
import { BODY, C, FA, MONO, kick, ramp, rng } from "./theme";
import { Aperture, Avatar, Ico, Tick, ease, emph, exitE, type IcoName } from "./ui";

const HOURS = ["۹", "۱۰", "۱۱", "۱۲"];
export const Calendar: React.FC<{ t: number; k: number; out?: number; lockAt: number; x?: number; y?: number; day?: string; pending?: string; locked?: string; time?: string; events?: [number, string][] }> = ({ t, k, out = 0, lockAt, x = 130, y = 560, day = "فردا", pending = "جلسه‌ی مهم", locked = "جلسه با سارا", time = "۱۱:۰۰", events = [[0, "جلسه‌ی تیم"], [3, "تحویل پروژه"]] }) => {
  const e = emph(k) * (1 - exitE(out));
  if (e <= 0.001) return null;
  const lk = ease(ramp(t, lockAt, lockAt + 0.45));
  const rowH = 96;
  const top0 = 120;
  const evY = top0 + rowH * (1 + lk) + 8; // asked for 10, then drops to 11
  const pulse = lk < 1 ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 820, height: 560, opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: `radial-gradient(ellipse 70% 50% at 95% 0%, rgba(255,154,74,.1), rgba(255,154,74,0) 70%), linear-gradient(180deg, ${C.cardHi}, ${C.card})`, boxShadow: `inset 0 1px 0 rgba(255,236,200,.075), 0 0 0 1.5px ${C.line}, 0 30px 80px rgba(0,0,0,.55)` }} />
      <div dir="rtl" style={{ position: "absolute", right: 40, top: 30, display: "flex", alignItems: "center", gap: 14 }}>
        <Ico n="calendar" size={40} />
        <span style={{ fontFamily: FA, fontWeight: 850, fontSize: 46, color: C.fg }}>{day}</span>
      </div>
      {HOURS.map((h, i) => (
        <div key={h} dir="rtl" style={{ position: "absolute", right: 40, left: 40, top: top0 + i * rowH, height: rowH, borderTop: `1.5px solid ${C.line}`, display: "flex", alignItems: "flex-start", paddingTop: 10 }}>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: C.fgCap, width: 60 }}>{h}</span>
        </div>
      ))}
      {/* the rest of the day */}
      {events.map(([row, label]) => (
        <div key={label as string} dir="rtl" style={{ position: "absolute", right: 120, left: 40, top: top0 + rowH * (row as number) + 8, height: rowH - 16, borderRadius: 20, background: C.badge, boxShadow: `inset 0 0 0 1.5px ${C.line2}`, display: "flex", alignItems: "center", padding: "0 26px", gap: 14 }}>
          <span style={{ width: 8, height: 40, borderRadius: 8, background: C.edge }} />
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 28, color: C.fgDim }}>{label}</span>
        </div>
      ))}
      {/* the meeting */}
      <div dir="rtl" style={{ position: "absolute", right: 120, left: 40, top: evY, height: rowH - 16, borderRadius: 20, background: lk > 0 ? `linear-gradient(180deg, rgba(255,208,168,${0.16 + 0.8 * lk}), rgba(245,164,37,${0.12 + 0.8 * lk}))` : "rgba(255,154,74,.08)", boxShadow: `inset 0 0 0 2px rgba(255,154,74,${0.45 + 0.4 * pulse})`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px" }}>
        <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 32, color: lk > 0.5 ? C.onAccent : C.fg }}>{lk > 0.5 ? locked : pending}</span>
        <span style={{ fontFamily: FA, fontWeight: 850, fontSize: 32, color: lk > 0.5 ? C.onAccent : C.accent }}>{lk > 0.5 ? time : "؟"}</span>
      </div>
    </div>
  );
};

/** the colleague's contact card (initial, no face) */
export const Contact: React.FC<{ t: number; k: number; out?: number; x: number; y: number; ring?: number; w?: number; name?: string; role?: string }> = ({ t, k, out = 0, x, y, ring = 0, w = 560, name = "سارا رحیمی", role = "همکار" }) => {
  const e = emph(k) * (1 - exitE(out));
  if (e <= 0.001) return null;
  const r = ring > 0 ? 0.5 + 0.5 * Math.sin(t * 9) : 0;
  return (
    <div dir="rtl" style={{ position: "absolute", left: x, top: y, width: w, height: 150, borderRadius: 30, background: `linear-gradient(180deg, ${C.cardHi}, ${C.card})`, boxShadow: `inset 0 1px 0 rgba(255,236,200,.075), 0 0 0 ${1.5 + 1.5 * ring}px rgba(255,154,74,${0.12 + 0.5 * ring}), 0 30px 80px rgba(0,0,0,.55)`, display: "flex", alignItems: "center", gap: 24, padding: "0 30px", boxSizing: "border-box", opacity: e, transform: `translateY(${(1 - e) * 26}px)` }}>
      <Avatar size={92} letter="س" />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontFamily: FA, fontWeight: 850, fontSize: 40, color: C.fg, lineHeight: 1.25 }}>{name}</span>
        <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: C.fgMute }}>{role}</span>
      </div>
      <div style={{ width: 70, height: 70, borderRadius: 99, background: ring > 0 ? C.accent : C.badge, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${ring > 0 ? Math.sin(t * 30) * 10 * r : 0}deg)`, boxShadow: ring > 0 ? "0 0 26px rgba(255,154,74,.5)" : `inset 0 0 0 1.5px ${C.line2}` }}>
        <Ico n="phone" size={34} color={ring > 0 ? C.onAccent : C.accent} />
      </div>
    </div>
  );
};

// ─── task list ─────────────────────────────────────────────────────────────────────────────────────────────
export type Task = { text: string; icon: IcoName; at: number; done: number; sub?: string; progress?: [number, number] };
/** the assistant's to-do: each row appears, works (aperture / a right-to-left bar), then ticks */
export const Tasks: React.FC<{ t: number; tasks: Task[]; x: number; y: number; w: number; k: number; out?: number; rowH?: number; size?: number; title?: string }> = ({ t, tasks, x, y, w, k, out = 0, rowH = 108, size = 34, title }) => {
  const e = emph(k) * (1 - exitE(out));
  if (e <= 0.001) return null;
  const th = title ? 88 : 24;
  const H = th + tasks.length * rowH + 20;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: H, opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: `radial-gradient(ellipse 70% 50% at 95% 0%, rgba(255,154,74,.1), rgba(255,154,74,0) 70%), linear-gradient(180deg, ${C.cardHi}, ${C.card})`, boxShadow: `inset 0 1px 0 rgba(255,236,200,.075), 0 0 0 1.5px ${C.line}, 0 30px 80px rgba(0,0,0,.55)` }} />
      {title && (
        <div dir="rtl" style={{ position: "absolute", right: 34, top: 26, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 26, color: C.accent300 }}>{title}</span>
        </div>
      )}
      {tasks.map((tk, i) => {
        const a = emph(ramp(t, tk.at, tk.at + 0.3));
        if (a <= 0.001) return null;
        const working = t >= tk.at + 0.15 && t < tk.done;
        const dk = ramp(t, tk.done, tk.done + 0.45);
        const pr = tk.progress ? ramp(t, tk.progress[0], tk.progress[1]) : 0;
        return (
          <div key={i} dir="rtl" style={{ position: "absolute", right: 30, left: 30, top: th + i * rowH, height: rowH - 14, display: "flex", alignItems: "center", gap: 20, opacity: a, transform: `translateX(${(1 - a) * -24}px)` }}>
            {working ? <Aperture t={t} size={size * 1.2} /> : <Tick k={dk} size={size * 1.2} />}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
              <span style={{ fontFamily: FA, fontWeight: 800, fontSize: size, color: dk > 0 ? C.fg : C.fgDim, lineHeight: 1.3 }}>{tk.text}</span>
              {tk.progress && (
                <div style={{ height: 8, borderRadius: 9, background: C.line2, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${pr * 100}%`, borderRadius: 9, background: `linear-gradient(270deg, ${C.accentHi}, ${C.accent})` }} />
                </div>
              )}
              {tk.sub && <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: size * 0.7, color: C.fgMute }}>{tk.sub}</span>}
            </div>
            <Ico n={tk.icon} size={size * 1.1} color={dk > 0 ? C.accent : C.fgCap} />
          </div>
        );
      })}
    </div>
  );
};

// ─── laptop + stopwatch ────────────────────────────────────────────────────────────────────────────────────
/** a laptop seen a little from above; its screen already shows the work done, then the lid closes (close 0→1) */
export const Stopwatch: React.FC<{ x: number; y: number; size: number; k: number; t: number; hit?: number }> = ({ x, y, size, k, t, hit = 0 }) => {
  const e = emph(k);
  if (e <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size * 1.12, opacity: e, transform: `scale(${0.8 + 0.2 * e + 0.08 * kick(t, hit, 0.4)})` }}>
      <div style={{ position: "absolute", left: size * 0.42, top: 0, width: size * 0.16, height: size * 0.12, borderRadius: 6, background: C.line2 }} />
      <div style={{ position: "absolute", left: 0, top: size * 0.12, width: size, height: size, borderRadius: 99, background: `radial-gradient(circle at 50% 35%, ${C.cardHi}, ${C.card})`, boxShadow: `inset 0 0 0 3px rgba(255,154,74,.55), 0 0 40px rgba(255,154,74,.18)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: size * 0.26, color: C.accent, direction: "ltr", letterSpacing: "0.02em" }}>00:00</span>
      </div>
    </div>
  );
};

// ─── media cards ───────────────────────────────────────────────────────────────────────────────────────────
/** the brand's image reveal: from brightness .12 / contrast 1.8 / blur 14 / scale 1.06 to normal, then a gold glint */
export const CommentBar: React.FC<{ t: number; x: number; y: number; w: number; k: number; typeAt: number; sendAt: number; text?: string; hint?: string }> = ({ t, x, y, w, k, typeAt, sendAt, text = "۲", hint = "یه کامنت بذار…" }) => {
  const e = emph(k);
  if (e <= 0.001) return null;
  const typed = t >= typeAt;
  const sent = t >= sendAt;
  const press = kick(t, sendAt - 0.06, 0.32);
  return (
    <div dir="rtl" style={{ position: "absolute", left: x, top: y, width: w, height: 112, borderRadius: 999, background: `linear-gradient(180deg, ${C.cardHi}, ${C.card})`, boxShadow: `inset 0 1px 0 rgba(255,236,200,.08), 0 0 0 ${1.5 + 1.5 * ramp(t, typeAt, typeAt + 0.2)}px rgba(255,154,74,${0.15 + 0.45 * ramp(t, typeAt, typeAt + 0.2) * (sent ? 0.4 : 1)}), 0 30px 80px rgba(0,0,0,.55)`, display: "flex", alignItems: "center", gap: 22, padding: "0 22px 0 18px", boxSizing: "border-box", opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
      <div style={{ width: 70, height: 70, borderRadius: 99, background: C.badge, boxShadow: `inset 0 0 0 1.5px ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ico n="user" size={36} color={C.fgMute} />
      </div>
      <div style={{ flex: 1, fontFamily: BODY, fontWeight: typed && !sent ? 700 : 500, fontSize: typed && !sent ? 52 : 34, color: typed && !sent ? C.fg : C.fgCap, display: "flex", alignItems: "center", gap: 8 }}>
        {typed && !sent ? (
          <>
            <span style={{ fontFamily: FA, fontWeight: 850 }}>{text}</span>
            <span style={{ display: "inline-block", width: 3, height: 44, background: C.accent, opacity: Math.floor(t * 2.2) % 2 ? 1 : 0.2 }} />
          </>
        ) : (
          hint
        )}
      </div>
      <div style={{ width: 76, height: 76, borderRadius: 99, background: typed && !sent ? C.accent : C.line2, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.14 * press})`, boxShadow: typed && !sent ? "0 0 24px rgba(255,154,74,.45)" : undefined }}>
        <Ico n="send" size={36} color={typed && !sent ? C.onAccent : C.fgMute} sw={2} style={{ transform: "scaleX(-1)" }} />
      </div>
    </div>
  );
};

/** the posted comment that lands above the bar */
export const PostedComment: React.FC<{ t: number; x: number; y: number; at: number; text?: string }> = ({ t, x, y, at, text = "۲" }) => {
  const e = emph(ramp(t, at, at + 0.4));
  if (e <= 0.001) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", right: x, top: y, display: "flex", alignItems: "center", gap: 18, opacity: e, transform: `translateY(${(1 - e) * 40}px)` }}>
      <div style={{ width: 62, height: 62, borderRadius: 99, background: C.badge, boxShadow: `inset 0 0 0 1.5px ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ico n="user" size={32} color={C.fgMute} />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 22, color: C.fgCap }}>همین الان</span>
        <span style={{ fontFamily: FA, fontWeight: 850, fontSize: 46, color: C.accent, lineHeight: 1.1 }}>{text}</span>
      </div>
    </div>
  );
};

export const seeded = rng;
