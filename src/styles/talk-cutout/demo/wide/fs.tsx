// Talk Cutout · landscape FULL-SCREEN windows (the parts where she explains the method): her picture is hidden, the
// camcorder «films a screen» (Stage: dark, viewfinder corners, REC, tape counter). One clear idea at a time, big:
// the step list left (STEP n/3), the screen of that step right; the stats centred. Every change on its word.
import React from "react";
import { C, F, SD, accentA } from "../../lib/theme";
import { clamp, ease, inn, mix, pop } from "../../lib/time";
import { Glass, Osd, Stage, Stamp, sub } from "../../lib/wide";
import { Icon, MysteryMark, YouTubeMark, hideBlur } from "../../lib/icons";
import { CodeThumb } from "../../lib/apps/thumb";
import { makePrompt } from "../../lib/apps/ai-chat";
import { AI_REPLY, IDEA, PROMPT_KEYS, QUERY, SEND, STATS, T, TOP_VIEWS, UPLOADS, YT } from "../script";
import { FSW } from "./cues";

const Abs: React.FC<{ x: number; y: number; w: number; h?: number; s?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, s, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...s }}>{children}</div>
);

// ── the step list (left) ──
const STEPS: [string, number][] = [
  ["کانال‌های پربازدید", T.steps],
  ["پربازدیدترین‌ها و چرا", T.step2],
  ["متن ایده‌ات با هوش مصنوعی", T.step3],
];
const StepList: React.FC<{ t: number; a: number; b: number }> = ({ t, a, b }) => {
  const s = sub(t, a, b, 0.32, 0.22);
  if (s.on <= 0) return null;
  const cur = STEPS.reduce((k, x, i) => (t >= x[1] ? i : k), 0);
  return (
    <Abs x={130} y={250} w={640} s={s.style}>
      <Glass w={640} h={420}>
        <div style={{ position: "absolute", left: 30, right: 30, top: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Osd size={34} color={C.dim}>{`STEP ${cur + 1}/3`}</Osd>
          <span style={{ fontFamily: F.head, fontSize: 54, color: C.cream, direction: "rtl", textShadow: SD }}>فقط 3 قدم</span>
        </div>
        {STEPS.map(([label, at], i) => {
          const u = inn(t, at, 0.35);
          const act = i === cur, done = i < cur;
          return (
            <div key={i} style={{ position: "absolute", right: 26, left: 26, top: 100 + i * 100, height: 84, borderRadius: 20, display: "flex", alignItems: "center", gap: 18, direction: "rtl", padding: "0 18px", background: act ? accentA(0.16) : "transparent", border: `1.5px solid ${act ? accentA(0.7) : "rgba(244,238,230,0.06)"}`, opacity: t < at ? 0.4 : mix(0.4, 1, u) }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", flex: "none", background: act ? C.accent : done ? "rgba(244,238,230,0.9)" : "rgba(244,238,230,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done ? <Icon n="check" size={32} color="#111" sw={3.2} /> : <span style={{ fontFamily: F.ui, fontWeight: 900, fontSize: 30, color: act ? C.accentInk : C.dim }}>{i + 1}</span>}
              </div>
              <span style={{ fontFamily: F.head, fontSize: 44, color: act ? C.cream : done ? C.dim : C.faint, whiteSpace: "nowrap", textShadow: SD }}>{label}</span>
            </div>
          );
        })}
      </Glass>
    </Abs>
  );
};

// ── FS1 · the channel research (right) ──
const ChannelPanel: React.FC<{ t: number }> = ({ t }) => {
  const s = sub(t, FSW[0][0] + 0.05, FSW[0][1] - 0.15, 0.32, 0.22);
  if (s.on <= 0) return null;
  const page = t >= T.peyda - 0.06 ? "channel" : "search";
  const typedN = Math.max(0, Math.min(QUERY.length, Math.floor(((t - (T.kanalha - 0.04)) / (T.porbazdid - T.kanalha)) * QUERY.length)));
  const res = clamp((t - (T.porbazdid - 0.02)) / 0.35);
  const hiC = clamp((t - (T.mozoo - 0.05)) / 0.3);
  const popular = t >= T.kodoom + 0.04;
  const hi = clamp((t - (T.bishtar2 - 0.05)) / 0.25);
  const grid = popular ? YT.popular.concat(YT.latest) : YT.latest.concat(YT.popular);
  const bigV = pop(t, T.dide - 0.05, 0.42);
  // while the number is up, the panel under it softens and darkens (a number never sits on UI text)
  const dim = clamp((t - (T.dide + 0.05)) / 0.25);
  return (
    <Abs x={840} y={236} w={940} h={612} s={s.style}>
      <div style={{ position: "relative", width: 940, height: 612, borderRadius: 26, overflow: "hidden", background: "#0f0f0f", border: "1.5px solid rgba(244,238,230,0.16)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", fontFamily: F.ui, color: "#f1f1f1", direction: "ltr", filter: dim > 0.01 ? `blur(${3.5 * dim}px) brightness(${1 - 0.62 * dim})` : undefined }}>
        {page === "search" ? (
          <>
            <div style={{ position: "absolute", left: 28, top: 26, right: 28, height: 64, display: "flex", alignItems: "center", gap: 18 }}>
              <YouTubeMark size={48} />
              <div style={{ flex: 1, height: 56, borderRadius: 28, background: "#222", border: "1.5px solid #3a3a3a", display: "flex", alignItems: "center", padding: "0 24px", fontSize: 28, fontWeight: 600 }}>
                {QUERY.slice(0, typedN)}
                {res < 1 ? <span style={{ display: "inline-block", width: 3, height: 30, background: "#3ea6ff", marginLeft: 3 }} /> : null}
              </div>
              <Icon n="search" size={36} color="#f1f1f1" />
            </div>
            {/* the home feed fills the panel until the results land (never a tall empty panel under a bare search bar) */}
            {res < 1 ? (
              <div style={{ position: "absolute", left: 28, top: 118, display: "grid", gridTemplateColumns: "282px 282px 282px", columnGap: 20, rowGap: 18, opacity: (1 - res) * (typedN > 0 ? 0.42 : 1) }}>
                {YT.home.concat(YT.popular, YT.latest).filter((v, i, all) => all.findIndex((w) => w.title === v.title) === i).slice(0, 6).map((v, k) => {
                  const u = pop(t, FSW[0][0] + 0.12 + 0.05 * k, 0.35);
                  return (
                    <div key={k} style={{ width: 282, transform: `scale(${u})`, opacity: clamp(u * 3) }}>
                      <div style={{ width: 282, height: 159, borderRadius: 12, overflow: "hidden" }}>
                        <CodeThumb spec={v.thumb} w={282} h={159} />
                      </div>
                      <div style={{ marginTop: 8, fontSize: 17, fontWeight: 700, lineHeight: 1.2, height: 21, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{v.title}</div>
                      <div style={{ marginTop: 3, fontSize: 16, color: "#aaa" }}>{v.views} views</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {[YT.ch, { ...YT.ch, name: "Bread Basics", handle: "@bread-basics", subs: "31K", hue: 205, letter: "B" }, { ...YT.ch, name: "Sweet Oven", handle: "@sweet-oven", subs: "12K", hue: 340, letter: "W" }].map((ch, i) => {
              const k = ease.out(clamp((res - i * 0.15) / 0.6));
              const h = i === 0 ? hiC : 0;
              return (
                <div key={i} style={{ position: "absolute", left: 28, right: 28, top: 118 + i * 150, height: 132, borderRadius: 20, display: "flex", alignItems: "center", gap: 24, padding: "0 22px", background: h > 0 ? accentA(0.14 * h) : "rgba(255,255,255,0.03)", boxShadow: h > 0 ? `inset 0 0 0 ${2.5 * h}px ${accentA(0.85)}` : undefined, opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
                  <div style={{ width: 96, height: 96, borderRadius: "50%", background: `linear-gradient(140deg, hsl(${ch.hue}, 62%, 62%), hsl(${ch.hue + 20}, 58%, 30%))`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 42, flex: "none" }}>{ch.letter}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>{ch.name}</div>
                    <div style={{ fontSize: 22, color: "#aaa", marginTop: 4 }}>{ch.handle} · <span style={{ color: h > 0.5 ? C.accent2 : "#aaa", fontWeight: h > 0.5 ? 800 : 500 }}>{ch.subs} subscribers</span></div>
                  </div>
                  <div style={{ padding: "10px 24px", borderRadius: 24, background: "#f1f1f1", color: "#0f0f0f", fontSize: 22, fontWeight: 800 }}>Subscribe</div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div style={{ position: "absolute", left: 0, top: 0, width: 940, height: 104, background: `linear-gradient(100deg, hsl(${YT.ch.hue}, 55%, 30%), hsl(${YT.ch.hue + 25}, 60%, 50%) 60%, hsl(${YT.ch.hue + 35}, 70%, 70%))`, opacity: 0.9 }} />
            <div style={{ position: "absolute", left: 28, top: 72, width: 104, height: 104, borderRadius: "50%", border: "4px solid #0f0f0f", background: `linear-gradient(140deg, hsl(${YT.ch.hue}, 62%, 62%), hsl(${YT.ch.hue + 20}, 58%, 30%))`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 46 }}>{YT.ch.letter}</div>
            <div style={{ position: "absolute", left: 148, top: 112, fontSize: 38, fontWeight: 800 }}>{YT.ch.name}</div>
            <div style={{ position: "absolute", left: 148, top: 158, fontSize: 22, color: "#aaa", whiteSpace: "nowrap" }}>{YT.ch.handle} · <span style={{ color: "#f1f1f1", fontWeight: 800 }}>{YT.ch.subs} subscribers</span> · {YT.ch.videos} videos</div>
            <div style={{ position: "absolute", left: 28, top: 202, display: "flex", gap: 30, fontSize: 21, fontWeight: 700, color: "#aaa", alignItems: "center" }}>
              <span>Home</span>
              <span style={{ color: t >= T.bebin - 0.04 ? "#f1f1f1" : "#aaa", borderBottom: t >= T.bebin - 0.04 ? "3px solid #f1f1f1" : "3px solid transparent", paddingBottom: 6 }}>Videos</span>
              <span>Shorts</span>
              <span style={{ marginLeft: 300, padding: "4px 14px", borderRadius: 9, background: popular ? "#f1f1f1" : "#272727", color: popular ? "#0f0f0f" : "#f1f1f1", fontSize: 18, fontWeight: 800 }}>Popular</span>
              <span style={{ padding: "4px 14px", borderRadius: 9, background: popular ? "#272727" : "#f1f1f1", color: popular ? "#f1f1f1" : "#0f0f0f", fontSize: 18 }}>Latest</span>
            </div>
            <div style={{ position: "absolute", left: 28, top: 250, display: "grid", gridTemplateColumns: "282px 282px 282px", columnGap: 20, rowGap: 14 }}>
              {grid.slice(0, 6).map((v, k) => {
                const tgt = popular && k === 0;
                const u = popular ? pop(t, T.kodoom + 0.1 + 0.05 * k, 0.35) : 1;
                return (
                  <div key={`${popular}-${k}`} style={{ position: "relative", width: 282, transform: `scale(${u * (tgt ? 1 + 0.04 * hi : 1)})`, opacity: clamp(u * 3) * (hi > 0 && !tgt ? 1 - 0.45 * hi : 1), zIndex: tgt ? 2 : 1 }}>
                    <div style={{ position: "relative", width: 282, height: 159, borderRadius: 12, overflow: "hidden", boxShadow: tgt && hi > 0 ? `0 0 0 ${5 * hi}px ${C.accent}` : undefined }}>
                      <CodeThumb spec={v.thumb} w={282} h={159} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 17, fontWeight: 700, lineHeight: 1.2, height: 21, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{v.title}</div>
                    <div style={{ marginTop: 3, fontSize: 18, fontWeight: tgt && hi > 0 ? 900 : 500, color: tgt && hi > 0 ? C.accent2 : "#aaa" }}>{v.views} views</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      {/* «دیده شده»: the views of the top video, big, over its tile; «چرا؟» stamps on «چرا» */}
      {bigV > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 200, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 18, transform: `scale(${bigV})`, opacity: clamp(bigV * 3), direction: "ltr" }}>
          <span style={{ fontFamily: F.ui, fontWeight: 900, fontSize: 170, lineHeight: 1, color: C.cream, letterSpacing: -6, textShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>{TOP_VIEWS}</span>
          <Osd size={48} color={C.accent} glow>VIEWS</Osd>
        </div>
      ) : null}
      {t >= T.chera - 0.03 ? (
        <div style={{ position: "absolute", right: 70, top: 420 }}>
          <Stamp t={t} a={T.chera - 0.03} size={64} rot={-8} color={C.accent}>
            چرا؟
          </Stamp>
        </div>
      ) : null}
    </Abs>
  );
};

// ── FS2 · the AI (right): the idea in the box, her words type themselves, the send, the reply ──
const PROMPT = makePrompt(PROMPT_KEYS);
const ChatPanel: React.FC<{ t: number }> = ({ t }) => {
  const s = sub(t, FSW[1][0] + 0.05, FSW[1][1] - 0.1, 0.32, 0.2);
  if (s.on <= 0) return null;
  const sent = t >= SEND;
  const spans = PROMPT.spans(t);
  const glow = clamp((t - (T.hoosh3 - 0.1)) / 0.4);
  return (
    <Abs x={850} y={236} w={920} h={600} s={s.style}>
      <div style={{ position: "relative", width: 920, height: 600, borderRadius: 28, overflow: "hidden", background: "#1f1e1d", border: `1.5px solid ${accentA(0.2 + 0.5 * glow)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 ${60 * glow}px ${accentA(0.25 * glow)}`, color: "#faf9f5" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 84, display: "flex", alignItems: "center", gap: 16, padding: "0 28px", borderBottom: "1px solid rgba(250,249,245,0.1)", direction: "ltr", fontFamily: F.ui }}>
          <MysteryMark size={40} hidden />
          <span style={{ fontSize: 28, fontWeight: 700, display: "inline-block", ...hideBlur(7) }}>AI</span>
          <div style={{ flex: 1 }} />
          <span style={{ padding: "6px 14px", borderRadius: 10, background: "#2a2927", fontSize: 18, color: "rgba(250,249,245,0.6)", display: "inline-block", ...hideBlur(5) }}>Model 2</span>
        </div>
        {!sent ? (
          <div style={{ position: "absolute", right: 30, top: 108, width: 560, display: "flex", gap: 18, alignItems: "center", direction: "rtl", opacity: ease.out(clamp((t - (FSW[1][0] + 0.2)) / 0.4)) }}>
            <div style={{ width: 300, height: 169, borderRadius: 16, overflow: "hidden", flex: "none", border: "1px solid rgba(250,249,245,0.12)" }}>
              <CodeThumb spec={{ hue: 28, title: "NO KNEAD|60 SEC", motif: "loaf" }} w={300} h={169} zoom={1.03 + 0.05 * clamp((t - FSW[1][0]) / 3)} />
            </div>
            <div>
              <Osd size={26} color={C.accent2}>IDEA · 1:00</Osd>
              <div style={{ fontFamily: F.vzB, fontSize: 30, marginTop: 10, whiteSpace: "nowrap" }}>{IDEA}</div>
              <div style={{ fontFamily: F.vz, fontSize: 22, marginTop: 6, color: "rgba(250,249,245,0.6)", whiteSpace: "nowrap" }}>ایده‌ی ویدیوی بعدی</div>
            </div>
          </div>
        ) : null}
        {sent ? (
          <div style={{ position: "absolute", left: 30, right: 30, top: 110, direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ maxWidth: 700, padding: "16px 24px", borderRadius: 22, background: "#30302e", fontFamily: F.vz, fontSize: 30, lineHeight: 1.5 }}>{PROMPT.text}</div>
            </div>
            <div style={{ marginTop: 26, fontFamily: F.vz, fontSize: 28, lineHeight: 1.6, color: "rgba(250,249,245,0.9)", opacity: clamp((t - SEND - 0.15) / 0.3) }}>{AI_REPLY.text}</div>
            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {AI_REPLY.chips.map((c, i) => {
                const on = clamp((t - c.at) / 0.3), done = t >= c.done;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 14, background: done ? "rgba(127,209,139,0.12)" : "#2a2927", border: `1px solid ${done ? "rgba(127,209,139,0.35)" : "rgba(250,249,245,0.1)"}`, fontFamily: F.vzB, fontSize: 24, color: done ? "#bfe8c5" : "#faf9f5", opacity: ease.out(on), transform: `scale(${0.9 + 0.1 * ease.outBack(on)})` }}>
                    {done ? <Icon n="check" size={22} color="#7fd18b" sw={2.8} /> : <span style={{ width: 18, height: 18, borderRadius: "50%", border: `3px solid ${C.accent}`, borderTopColor: "transparent", transform: `rotate(${(t - c.at) * 540}deg)`, display: "inline-block" }} />}
                    {c.label}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {/* the composer */}
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, height: sent ? 90 : 210, borderRadius: 26, background: "#30302e", border: "1px solid rgba(250,249,245,0.1)", opacity: sent ? 0.5 : 1 }}>
          {!sent ? (
            <div style={{ position: "absolute", right: 18, top: 16, display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 14, background: "#2a2927", border: "1px solid rgba(250,249,245,0.1)", direction: "rtl" }}>
              <Icon n="bulb" size={26} color={C.accent} sw={2.2} />
              <span style={{ fontFamily: F.vzB, fontSize: 24 }}>{IDEA}</span>
            </div>
          ) : null}
          <div style={{ position: "absolute", right: 28, left: 90, top: sent ? 22 : 92, fontFamily: F.vz, fontSize: 36, direction: "rtl", textAlign: "right", color: spans.length && !sent ? "#faf9f5" : "rgba(250,249,245,0.4)" }}>
            {!sent && spans.length ? (
              <>
                {spans.map((x, i) => (
                  <React.Fragment key={i}>
                    {i ? " " : ""}
                    <span style={{ color: x.hot > 0 ? `rgb(${Math.round(250 - 5 * x.hot)},${Math.round(249 - 110 * x.hot)},${Math.round(245 - 200 * x.hot)})` : undefined }}>{x.w}</span>
                  </React.Fragment>
                ))}
                <span style={{ display: "inline-block", width: 3, height: 36, background: C.accent, marginRight: 3, verticalAlign: -6, opacity: Math.sin(t * 9) > -0.2 ? 1 : 0 }} />
              </>
            ) : (
              "پیام بده…"
            )}
          </div>
          <div style={{ position: "absolute", left: 18, bottom: 16, width: 56, height: 56, borderRadius: 16, background: spans.length && !sent ? C.accent : accentA(0.35), display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - 0.15 * Math.sin(Math.PI * clamp((t - (SEND - 0.12)) / 0.24))})` }}>
            <Icon n="up" size={30} color="#fff" sw={2.6} />
          </div>
        </div>
      </div>
    </Abs>
  );
};

// ── FS3 · publish weekly, then the stats (centred) ──
const Stats: React.FC<{ t: number }> = ({ t }) => {
  const s = sub(t, FSW[2][0] + 0.05, FSW[2][1] - 0.12, 0.32, 0.22);
  if (s.on <= 0) return null;
  const W = 1300, CW = 1236, CH = 230;
  // the line grows from the first upload (never an empty chart), slow at first, shooting up on «یه ماه»
  const draw = Math.pow(clamp((t - (FSW[2][0] + 0.35)) / (T.amar + 0.15 - FSW[2][0] - 0.35)), 1.8);
  const hot = clamp((t - (T.amar - 0.05)) / 0.3);
  const pts = Array.from({ length: 28 }, (_, i) => {
    const x = i / 27;
    const y = Math.pow(x, 1.45) * (0.86 + 0.14 * Math.sin(i * 1.7)) + 0.04 * Math.sin(i * 2.9);
    return [x * CW, CH - 12 - clamp(y) * (CH - 30)] as [number, number];
  });
  const path = pts.slice(0, Math.max(2, Math.ceil(pts.length * draw))).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <Abs x={(1920 - W) / 2} y={190} w={W} s={s.style}>
      {/* one upload a week */}
      <div style={{ height: 150, display: "flex", justifyContent: "center", gap: 26, direction: "ltr" }}>
        {UPLOADS.map((u, i) => {
          const k = t < u.at ? 0 : ease.outBack(clamp((t - u.at) / 0.4));
          return (
            <div key={i} style={{ position: "relative", width: 236, opacity: clamp(k * 2), transform: `translateY(${(1 - clamp(k)) * 30}px) scale(${0.9 + 0.1 * k})` }}>
              <div style={{ width: 236, height: 104, borderRadius: 14, overflow: "hidden", border: "1.5px solid rgba(244,238,230,0.16)" }}>
                <CodeThumb spec={u.thumb} w={236} h={104} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <Osd size={26} color={C.dim}>{u.when.toUpperCase()}</Osd>
                <Osd size={26} color={C.accent}>✓ LIVE</Osd>
              </div>
            </div>
          );
        })}
      </div>
      <Glass w={W} h={470} hot={hot * 0.6}>
        <div style={{ position: "absolute", left: 32, right: 32, top: 20, height: 60, display: "flex", alignItems: "center", gap: 14, direction: "ltr" }}>
          <YouTubeMark size={46} />
          <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 34, color: C.cream }}>Analytics</span>
          <span style={{ fontFamily: F.ui, fontSize: 24, color: C.faint }}>· Last 28 days</span>
          <div style={{ flex: 1 }} />
          <span style={{ padding: "6px 16px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(244,238,230,0.28)", fontFamily: F.vzB, fontSize: 26, color: C.dim, direction: "rtl" }}>نمونه‌ی نمایشی</span>
        </div>
        <div style={{ position: "absolute", left: 32, top: 92, display: "flex", gap: 14, direction: "ltr" }}>
          {[["Views", STATS.views, true], ["Watch time (h)", STATS.watch, false], ["Subscribers", STATS.newSubs, false]].map(([label, value, main], i) => (
            <div key={i} style={{ width: main ? 440 : 290, padding: "10px 18px 12px", borderBottom: `4px solid ${main ? (hot > 0 ? C.accent : C.cream) : "transparent"}`, opacity: main ? 1 : 0.6 }}>
              <div style={{ fontFamily: F.ui, fontSize: 24, fontWeight: 600, color: C.dim }}>{label as string}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: F.ui, fontSize: 58, fontWeight: 900, color: main && hot > 0 ? C.accent2 : C.cream, letterSpacing: -1 }}>{value as string}</span>
                {main && hot > 0 ? <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 26, color: C.accent, transform: `scale(${pop(t, T.amar, 0.4)})`, display: "inline-block" }}>▲ {STATS.viewsUp}</span> : null}
              </div>
            </div>
          ))}
        </div>
        <svg width={CW} height={CH} style={{ position: "absolute", left: 32, top: 224, overflow: "visible" }}>
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line key={g} x1={0} x2={CW} y1={CH - 12 - g * (CH - 30)} y2={CH - 12 - g * (CH - 30)} stroke="rgba(244,238,230,0.08)" strokeWidth={1.5} />
          ))}
          {draw > 0 ? <path d={path} fill="none" stroke={hot > 0 ? C.accent : C.cream} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" style={{ filter: hot > 0 ? `drop-shadow(0 0 8px ${C.accent})` : undefined }} /> : null}
        </svg>
      </Glass>
    </Abs>
  );
};

export const FullScreenWide: React.FC<{ t: number }> = ({ t }) => {
  const w = FSW.findIndex(([a, b]) => t >= a && t < b);
  if (w < 0) return null;
  return (
    <>
      <Stage t={t} />
      {w < 2 ? <StepList t={t} a={FSW[w][0] + 0.02} b={FSW[w][1] - 0.12} /> : null}
      {w === 0 ? <ChannelPanel t={t} /> : null}
      {w === 1 ? <ChatPanel t={t} /> : null}
      {w === 2 ? <Stats t={t} /> : null}
    </>
  );
};
