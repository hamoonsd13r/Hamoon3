// Film A · «یه جمله، یه ویدئو» — reels feed → prompt → an editor assembles itself on the beat → what you'll learn →
// course features → hush → «ثبت‌نام شروع شد!». DOM + canvas, pure function of t.
import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BEAT, C, DROP, F, FEATS, FINAL, FPS, PROMPT, ROLL, SAFE_BOTTOM, SEND, STOP, STYLES, TYPE_A, TYPE_B, beat, clamp, ease, fa, hit, kick, lerp, ramp, rnd, useStoryFonts } from "../lib/theme";
import { CTA, En, Grain, Hush, LinkBox, Logo, Rise, SceneCanvas, glowText, hexA, slam } from "../lib/ui";

const ROW = 557; // feed card 300×533 + gap
const FEED_COLS = [0, 1, 2];

// ---------------- background ----------------
const Bg: React.FC<{ t: number }> = ({ t }) => {
  const p = t < STOP ? kick(t, 0, STOP, 0.14) : 0;
  const dark = t >= STOP && t < DROP ? 1 - ramp(t, ROLL, DROP) * 0.5 : 0;
  const boom = t >= DROP ? hit(t, DROP, 0.5) : 0;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.bg }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.5 * (1 - dark) }}>
        <defs>
          <pattern id="dots" width={36} height={36} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(t * 40) % 36})`}>
            <circle cx={18} cy={18} r={1.6} fill="rgba(255,255,255,0.13)" />
          </pattern>
        </defs>
        <rect width={1080} height={1920} fill="url(#dots)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 45% at 50% 62%, ${hexA(C.orange, 0.16 + p * 0.08 + boom * 0.35)}, transparent 70%)`, opacity: 1 - dark }} />
      {/* film-strip rulers on both edges */}
      {[0, 1].map((s) => (
        <svg key={s} width={34} height={1920} style={{ position: "absolute", top: 0, left: s ? 1080 - 34 : 0, opacity: 0.35 * (1 - dark) }}>
          {Array.from({ length: 50 }, (_, i) => {
            const y = ((i * 42 - t * 160) % 2100 + 2100) % 2100 - 90;
            return <rect key={i} x={s ? 6 : 12} y={y} width={i % 5 ? 10 : 16} height={3} fill="rgba(255,255,255,0.5)" />;
          })}
        </svg>
      ))}
    </>
  );
};

// ---------------- 1 · the reels feed (0–3.87) ----------------
const Feed: React.FC<{ t: number }> = ({ t }) => {
  const end = beat(8); // 3.87
  if (t > end + 0.5) return null;
  // flick up one row on every beat until the question lands, then freeze
  const freeze = beat(5); // 2.42
  const tt = Math.min(t, freeze);
  const n = Math.floor(tt / BEAT);
  const f = ease.out(clamp((tt - n * BEAT) / 0.26));
  const scroll = (n + f) * ROW * 0.62;
  const intro = 1 + (1 - ease.out(ramp(t, 0, 0.45))) * 0.18;
  const zoom = intro * (t > freeze ? 1 + ease.out(ramp(t, freeze, freeze + 0.3)) * 0.08 + hit(t, freeze, 0.08) * 0.05 : 1);
  // collapse into the prompt bar
  const col = ease.in(ramp(t, end - 0.12, end + 0.3));
  const glitch = hit(t, freeze, 0.09);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom * (1 - col * 0.75)}) translateY(${col * 120}px)`, opacity: 1 - col, transformOrigin: "50% 45%", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 240px, #000 1180px, transparent 1350px)" }}>
      {FEED_COLS.flatMap((ci) => {
        const off = ci === 1 ? ROW * 0.45 : 0;
        const sc = scroll * (ci === 1 ? 1.15 : 1);
        const r0 = Math.floor((sc - off - 260 - 100) / ROW);
        return Array.from({ length: 4 }, (_, q) => r0 + q).map((r) => {
          const x = 540 + (ci - 1) * 324 - 150;
          const y = 160 + r * ROW + off - sc;
          if (y < -560 || y > 1500) return null;
          const k = (((ci * 3 + r * 5) % 8) + 8) % 8;
          return (
            <div key={`${ci}-${r}`} style={{ position: "absolute", left: x + glitch * (rnd(r + ci) - 0.5) * 60, top: y, width: 300, height: 533, borderRadius: 26, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <SceneCanvas k={k} t={t + r * 1.3 + ci} w={300} h={533} />
              {/* reel UI: like + views */}
              <div style={{ position: "absolute", right: 14, bottom: 60, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                {[0, 1, 2].map((q) => (
                  <div key={q} style={{ width: 30, height: 30, borderRadius: 15, background: q === 0 ? hexA(C.orange, 0.9) : "rgba(255,255,255,0.75)" }} />
                ))}
              </div>
              <div style={{ position: "absolute", left: 14, bottom: 18, direction: "ltr", fontFamily: F.en, fontSize: 18, color: "rgba(255,255,255,0.85)" }}>{["1.2M", "860K", "3.4M", "540K", "2.1M", "910K", "4.8M", "1.7M"][k]} views</div>
            </div>
          );
        });
      })}
    </div>
  );
};

export const HookText: React.FC<{ t: number }> = ({ t }) => {
  const end = beat(8);
  if (t > end + 0.1) return null;
  const out = 1 - ramp(t, end - 0.12, end + 0.05);
  const q = slam(t, beat(5) - 0.04, 0.2);
  const glitch = hit(t, beat(5), 0.1);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl", textAlign: "center", opacity: out }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, height: 520, background: "linear-gradient(to bottom, transparent, rgba(4,5,8,0.88) 22%, rgba(4,5,8,0.88) 78%, transparent)" }} />
      <div style={{ position: "absolute", top: 560, width: 1080, fontFamily: F.head, fontSize: 92, color: C.ink, lineHeight: 1.2, opacity: 1 - ramp(t, beat(4) - 0.1, beat(4) + 0.1) * 0.55 }}>
        <Rise t={t} at={0.02}>ریلزهای</Rise> <Rise t={t} at={beat(1)}><En>AI</En></Rise> <Rise t={t} at={beat(2)}>رو</Rise> <Rise t={t} at={beat(2) + 0.12}>می‌بینی…</Rise>
      </div>
      <div style={{ position: "absolute", top: 680, width: 1080, fontFamily: F.text, fontSize: 56, color: C.dim }}>
        <Rise t={t} at={beat(4)} dy={30}>و از خودت می‌پرسی:</Rise>
      </div>
      <div style={{ position: "absolute", top: 760, width: 1080, fontFamily: F.head, fontSize: 132, lineHeight: 1.15, color: C.ink, ...q }}>
        {[[-6, 0, "#ff3d3d"], [6, 0, "#3dd6ff"]].map(([dx, dy, col], i) => (
          <div key={i} style={{ position: "absolute", width: 1080, color: col as string, opacity: glitch * 0.7, transform: `translate(${(dx as number) * glitch * 3}px, ${dy}px)`, mixBlendMode: "screen" }}>«اینو چطوری ساختن؟»</div>
        ))}
        <div style={{ position: "relative", textShadow: glowText(C.orange, 0.35, 30) }}>
          «اینو <span style={{ color: C.orange }}>چطوری</span> ساختن؟»
        </div>
      </div>
    </div>
  );
};

// ---------------- 2 · the prompt (3.87–5.81) ----------------
export const Prompt: React.FC<{ t: number; fade?: boolean }> = ({ t, fade = false }) => {
  const a = beat(8);
  if (t < a - 0.1 || t > beat(16)) return null;
  const inK = ease.back(ramp(t, a - 0.05, a + 0.35));
  // after send the bar flies to the top and shrinks into a "sent" bubble
  const up = ease.io(ramp(t, SEND + 0.1, beat(12) + 0.12));
  const out = 1 - ramp(t, beat(16) - 0.25, beat(16));
  const chars = Array.from(PROMPT);
  const n = Math.round(ramp(t, TYPE_A, TYPE_B) * chars.length);
  const typed = chars.slice(0, n).join("");
  const caretOn = t < SEND && Math.floor(t * 4) % 2 === 0;
  const press = hit(t, SEND, 0.12);
  const ring = ramp(t, SEND, SEND + 0.5);
  const y = lerp(820, 268, up);
  const sc = lerp(1, 0.72, up);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl", opacity: out }}>
      {/* header */}
      <div style={{ position: "absolute", top: 520, width: 1080, textAlign: "center", fontFamily: F.head, fontSize: 96, color: C.ink, opacity: 1 - up }}>
        <Rise t={t} at={a + 0.02}>جوابش؟</Rise> <Rise t={t} at={a + 0.22}>فقط</Rise> <Rise t={t} at={a + 0.38} style={{ color: C.orange, textShadow: glowText(C.orange, 0.5, 24) }}>یه جمله.</Rise>
      </div>
      {/* the bar */}
      <div style={{ position: "absolute", left: 70, top: y, width: 940, height: 150, transform: `scale(${sc * lerp(0.6, 1, inK)})`, transformOrigin: "50% 0", opacity: clamp(inK * 2) * (fade ? 1 - ease.in(up) : 1) }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 44, background: "rgba(22,24,30,0.92)", border: `2px solid ${hexA(C.orange, 0.35 + press * 0.6)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 ${30 + press * 60}px ${hexA(C.orange, 0.25 + press * 0.4)}` }} />
        <div style={{ position: "absolute", right: 34, top: -26, padding: "6px 20px", borderRadius: 999, background: C.orange, color: "#160700", fontFamily: F.enB, fontSize: 28, direction: "ltr" }}>AI</div>
        <div style={{ position: "absolute", right: 44, left: 150, top: 0, height: 150, display: "flex", alignItems: "center", fontFamily: F.text, fontSize: 46, color: C.ink, whiteSpace: "nowrap", overflow: "hidden" }}>
          {n === 0 && t < SEND ? <span style={{ color: C.faint }}>هر چی می‌خوای بگو…</span> : <span>{typed}</span>}
          <span style={{ display: "inline-block", width: 4, height: 54, marginRight: 6, background: C.orange, opacity: caretOn ? 1 : 0 }} />
        </div>
        {/* send */}
        <div style={{ position: "absolute", left: 26, top: 31, width: 88, height: 88, borderRadius: 44, background: n >= chars.length ? C.orange : "rgba(255,255,255,0.12)", transform: `scale(${1 - press * 0.25})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={44} height={44} viewBox="0 0 44 44">
            <path d="M22 34 V10 M11 21 L22 10 L33 21" stroke={n >= chars.length ? "#160700" : C.dim} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
        {ring > 0 && ring < 1 && <div style={{ position: "absolute", left: 70 - ring * 160, top: 75 - ring * 160, width: ring * 320, height: ring * 320, borderRadius: "50%", border: `${6 * (1 - ring)}px solid ${C.hot}`, opacity: 1 - ring }} />}
      </div>
      {/* the attached song: «برای این آهنگ» */}
      <SongChip t={t} at={a + 0.3} out={up} />
    </div>
  );
};

const SongChip: React.FC<{ t: number; at: number; out: number }> = ({ t, at, out }) => {
  const k = ease.back(ramp(t, at, at + 0.3));
  if (k <= 0 || out >= 1) return null;
  const p = kick(t, 0, STOP, 0.1);
  const fly = ease.in(out);
  return (
    <div style={{ position: "absolute", left: 170, top: 1010 - fly * 600, width: 740, height: 150, borderRadius: 30, background: "rgba(255,255,255,0.05)", border: `1.5px solid ${C.line}`, opacity: clamp(k * 3) * (1 - fly), transform: `scale(${lerp(0.7, 1, k) * (1 - fly * 0.6)})`, display: "flex", alignItems: "center", gap: 26, padding: "0 30px", direction: "rtl" }}>
      <div style={{ width: 92, height: 92, borderRadius: 22, background: `linear-gradient(135deg, ${C.hot}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + p * 0.08})` }}>
        <svg width={50} height={50} viewBox="0 0 50 50"><path d="M19 38 V12 L40 7 V33" stroke="#160700" strokeWidth={5} fill="none" strokeLinejoin="round" /><circle cx={14} cy={38} r={7} fill="#160700" /><circle cx={35} cy={33} r={7} fill="#160700" /></svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontFamily: F.en, fontSize: 30, color: C.ink, direction: "ltr", textAlign: "right" }}>my-song.mp3</span>
        <svg width={520} height={44}>
          {Array.from({ length: 52 }, (_, q) => {
            const hh = 6 + 34 * Math.abs(Math.sin(q * 0.55 + 1) * (0.35 + 0.65 * rnd(q + 3))) * (0.75 + p * 0.5);
            const played = q / 52 < ramp(t, at, beat(16));
            return <rect key={q} x={520 - (q + 1) * 10} y={22 - hh / 2} width={5} height={hh} rx={2.5} fill={played ? C.orange : "rgba(255,255,255,0.3)"} />;
          })}
        </svg>
      </div>
    </div>
  );
};

// ---------------- 3 · the editor builds itself (5.81–7.74) ----------------
type Clip = { tr: number; x: number; w: number; at: number; col: string; kind: "img" | "txt" | "wav" | "mus" };
const CLIPS: Clip[] = [
  { tr: 3, x: 0, w: 1, at: beat(12), col: "#5a3a2a", kind: "mus" },
  { tr: 0, x: 0, w: 0.22, at: beat(12) + BEAT * 0.5, col: "#ff7a3d", kind: "img" },
  { tr: 0, x: 0.23, w: 0.18, at: beat(13), col: "#ffb36b", kind: "img" },
  { tr: 1, x: 0.05, w: 0.3, at: beat(13) + BEAT * 0.5, col: "#f5f7fb", kind: "txt" },
  { tr: 0, x: 0.42, w: 0.26, at: beat(14), col: "#ff7a3d", kind: "img" },
  { tr: 2, x: 0.02, w: 0.4, at: beat(14) + BEAT * 0.5, col: "#bec6d2", kind: "wav" },
  { tr: 0, x: 0.69, w: 0.31, at: beat(15), col: "#ffb36b", kind: "img" },
  { tr: 1, x: 0.45, w: 0.35, at: beat(15) + BEAT * 0.25, col: "#f5f7fb", kind: "txt" },
  { tr: 2, x: 0.47, w: 0.5, at: beat(15) + BEAT * 0.5, col: "#bec6d2", kind: "wav" },
];
const TRACKS = ["تصویر", "متن", "صدا", "آهنگ"];

const Editor: React.FC<{ t: number }> = ({ t }) => {
  const a = beat(12); // 5.81
  const b = beat(16); // 7.74
  if (t < a - 0.1 || t > b + 0.6) return null;
  const inK = ease.out(ramp(t, a - 0.08, a + 0.3));
  const toBreak = ease.out(ramp(t, b - 0.08, b + 0.18)); // timeline drops away, preview grows (handled by Learn)
  const prog = ease.io(ramp(t, a + 0.1, b - 0.02));
  const ph = ramp(t, a + 0.35, b - 0.05);
  const done = hit(t, b - 0.02, 0.25);
  const sceneK = [1, 3, 5, 0][clamp(Math.floor((t - a) / BEAT), 0, 3)];
  const TL = { x: 60, y: 990, w: 960, h: 340 };
  const lane = (i: number) => TL.y + 92 + i * 58;
  const laneX0 = TL.x + 30, laneW = TL.w - 200;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl" }}>
      {/* title, right side */}
      <div style={{ position: "absolute", right: 70, top: 410, width: 560, textAlign: "right", opacity: 1 - toBreak }}>
        <div style={{ fontFamily: F.head, fontSize: 112, lineHeight: 1.05, color: C.ink }}>
          <Rise t={t} at={a}>ویدئوی</Rise> <Rise t={t} at={a + 0.12}>کامل،</Rise>
        </div>
        <div style={{ fontFamily: F.head, fontSize: 84, lineHeight: 1.15, color: C.ink, marginTop: 16 }}>
          <Rise t={t} at={beat(13)}>با</Rise> <Rise t={t} at={beat(13) + 0.1} style={{ color: C.orange }}>صدا</Rise> <Rise t={t} at={beat(13) + 0.2}>و</Rise> <Rise t={t} at={beat(13) + 0.3} style={{ color: C.orange }}>ادیت</Rise>
        </div>
        <div style={{ marginTop: 34 }}>
          <Rise t={t} at={beat(14) + 0.05} dy={40}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "12px 30px", borderRadius: 999, border: `2px solid ${C.orange}`, fontFamily: F.text, fontSize: 44, color: C.ink }}>
              فقط با <En s={0.95}>AI</En>
            </span>
          </Rise>
        </div>
      </div>
      {/* preview monitor, left side (Learn takes it over at the break) */}
      {t < b + 0.02 && (
        <div style={{ position: "absolute", left: 90, top: 410, width: 300, height: 533, borderRadius: 26, overflow: "hidden", border: `2px solid ${hexA(C.orange, 0.5)}`, boxShadow: `0 0 50px ${hexA(C.orange, 0.25)}`, opacity: inK, transform: `scale(${lerp(0.8, 1, inK)})` }}>
          <SceneCanvas k={sceneK} t={t} w={300} h={533} />
          <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 6, background: "rgba(255,255,255,0.15)" }}>
            <div style={{ width: `${ph * 100}%`, height: 6, background: C.orange, marginLeft: "auto" }} />
          </div>
          {hit(t, beat(13), 0.06) + hit(t, beat(14), 0.06) + hit(t, beat(15), 0.06) > 0.05 && <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0.5 * (hit(t, beat(13), 0.06) + hit(t, beat(14), 0.06) + hit(t, beat(15), 0.06)) }} />}
        </div>
      )}
      {/* timeline */}
      <div style={{ position: "absolute", left: TL.x, top: TL.y + toBreak * 140, width: TL.w, height: TL.h, borderRadius: 30, background: "rgba(16,18,24,0.94)", border: `1.5px solid ${C.line}`, opacity: inK * (1 - toBreak), transform: `translateY(${(1 - inK) * 80}px)` }}>
        <div style={{ position: "absolute", right: 30, top: 22, fontFamily: F.text, fontSize: 32, color: done > 0.02 || prog >= 1 ? C.hot : C.dim }}>
          {prog >= 1 ? "آماده‌ست ✓" : <>در حال ساخت… {fa(Math.round(prog * 100))}٪</>}
        </div>
        <div style={{ position: "absolute", left: 30, top: 34, width: 380, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.1)" }}>
          <div style={{ width: `${prog * 100}%`, height: 10, borderRadius: 5, background: C.orange, boxShadow: `0 0 ${16 + done * 30}px ${C.orange}` }} />
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: toBreak * 140, opacity: inK * (1 - toBreak) }}>
        {TRACKS.map((name, i) => (
          <g key={name}>
            <rect x={laneX0} y={lane(i)} width={laneW} height={46} rx={10} fill="rgba(255,255,255,0.035)" />
            <text x={TL.x + TL.w - 30} y={lane(i) + 33} textAnchor="end" direction="rtl" fontFamily={F.text} fontSize={28} fill={C.faint}>{name}</text>
          </g>
        ))}
        {CLIPS.map((c, i) => {
          const k = ramp(t, c.at - 0.16, c.at);
          if (k <= 0) return null;
          const land = hit(t, c.at, 0.1);
          const cx = laneX0 + laneW * (1 - c.x - c.w); // RTL: time runs right→left
          const w = laneW * c.w - 6;
          const dx = (1 - ease.out(k)) * -520;
          const y = lane(c.tr) + 3 - land * 6;
          return (
            <g key={i} transform={`translate(${dx},0)`} opacity={k}>
              <rect x={cx} y={y} width={w} height={40} rx={8} fill={c.col} opacity={c.kind === "mus" ? 0.9 : 0.95} />
              {c.kind === "img" && [0.2, 0.5, 0.8].map((q) => <rect key={q} x={cx + w * q - 14} y={y + 6} width={28} height={28} rx={4} fill="rgba(0,0,0,0.22)" />)}
              {c.kind === "txt" && <rect x={cx + 10} y={y + 16} width={w * 0.6} height={8} rx={4} fill="rgba(0,0,0,0.35)" />}
              {(c.kind === "wav" || c.kind === "mus") &&
                Array.from({ length: Math.floor(w / 9) }, (_, q) => {
                  const hh = 6 + 26 * Math.abs(Math.sin(q * 0.9 + i) * (0.4 + 0.6 * rnd(q + i * 40)));
                  return <rect key={q} x={cx + 4 + q * 9} y={y + 20 - hh / 2} width={4} height={hh} rx={2} fill={c.kind === "mus" ? C.hot : "#2a2d36"} />;
                })}
              {c.kind === "mus" && Array.from({ length: 9 }, (_, q) => <rect key={`b${q}`} x={cx + (w * q) / 8} y={y - 4} width={3} height={48} fill={C.orange} opacity={0.8} />)}
            </g>
          );
        })}
        {/* playhead */}
        {ph > 0 && (
          <g>
            <rect x={laneX0 + laneW * (1 - ph) - 2} y={lane(0) - 16} width={4} height={58 * 4 + 12} fill={C.orange} />
            <path d={`M${laneX0 + laneW * (1 - ph) - 12} ${lane(0) - 26} h24 l-12 14 z`} fill={C.orange} />
          </g>
        )}
      </svg>
    </div>
  );
};

// ---------------- 4 · break: what you'll learn, preview takes over (7.74–9.68) ----------------
const Learn: React.FC<{ t: number }> = ({ t }) => {
  const a = beat(16), b = beat(20);
  if (t < a - 0.02 || t > b + 0.4) return null;
  const grow = ease.io(ramp(t, a - 0.02, a + 0.42));
  const out = ease.in(ramp(t, b - 0.22, b + 0.02));
  const i = clamp(Math.floor((t - a + 0.02) / BEAT), 0, 3);
  const st = STYLES[i];
  const cut = hit(t, st.at, 0.07);
  // preview rect: from editor slot (90,410,300×533) to centre (300,470,480×853)
  const x = lerp(90, 300, grow), y = lerp(410, 470, grow), w = lerp(300, 480, grow);
  const h = (w * 16) / 9;
  const chipK = ease.back(ramp(t, st.at, st.at + 0.22));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl", opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 262, width: 1080, textAlign: "center", fontFamily: F.text, fontSize: 46, color: C.dim, opacity: grow }}>
        <Rise t={t} at={a + 0.05} dy={30}>تو این دوره یاد می‌گیری</Rise>
      </div>
      <div style={{ position: "absolute", top: 330, width: 1080, textAlign: "center", fontFamily: F.head, fontSize: 100, color: C.ink, opacity: grow, lineHeight: 1 }}>
        <Rise t={t} at={a + 0.2}>هر</Rise> <Rise t={t} at={a + 0.32} style={{ color: C.orange }}>ویدئویی</Rise> <Rise t={t} at={a + 0.44}>رو بسازی</Rise>
      </div>
      <div style={{ position: "absolute", left: x, top: y + out * -200, width: w, height: h, borderRadius: 32, overflow: "hidden", border: `2px solid ${hexA(C.orange, 0.6)}`, boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 ${60 + cut * 80}px ${hexA(C.orange, 0.3 + cut * 0.4)}`, transform: `scale(${1 + cut * 0.04 - out * 0.3}) rotate(${(i % 2 ? 1 : -1) * cut * 1.5}deg)` }}>
        <SceneCanvas k={st.scene} t={t} w={480} h={853} style={{ width: w, height: h }} />
        <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: cut * 0.45 }} />
      </div>
      <div style={{ position: "absolute", top: 1180 + out * -200, width: 1080, textAlign: "center" }}>
        <span style={{ display: "inline-block", padding: "14px 44px", borderRadius: 999, background: C.orange, color: "#160700", fontFamily: F.head, fontSize: 66, transform: `scale(${lerp(0.6, 1, chipK)})`, opacity: clamp(chipK * 3), boxShadow: `0 0 40px ${hexA(C.orange, 0.5)}` }}>{st.fa}</span>
      </div>
      {/* step dots */}
      <div style={{ position: "absolute", top: 1300, width: 1080, display: "flex", justifyContent: "center", gap: 14, direction: "rtl", opacity: grow }}>
        {STYLES.map((_, q) => <div key={q} style={{ width: q === i ? 40 : 12, height: 12, borderRadius: 6, background: q <= i ? C.orange : "rgba(255,255,255,0.2)" }} />)}
      </div>
    </div>
  );
};

// ---------------- 5 · features list builds on the beat (9.68–13.36) ----------------
export const Icon: React.FC<{ k: string; s?: number }> = ({ k, s = 84 }) => (
  <svg width={s} height={s} viewBox="0 0 84 84" fill="none" stroke={C.orange} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
    {k === "play" && <><rect x={8} y={14} width={68} height={56} rx={12} /><path d="M35 30 L54 42 L35 54 Z" fill={C.orange} /></>}
    {k === "grid" && <>{[0, 1].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={10 + c * 36} y={10 + r * 36} width={28} height={28} rx={7} fill={r === c ? C.orange : "none"} />))}</>}
    {k === "spark" && <><path d="M42 8 L49 35 L76 42 L49 49 L42 76 L35 49 L8 42 L35 35 Z" fill={C.orange} /></>}
    {k === "cam" && <><rect x={8} y={24} width={50} height={40} rx={9} /><path d="M58 38 L76 28 V60 L58 50" /><path d="M10 10 L74 74" stroke={C.hot} /></>}
  </svg>
);

export const Features: React.FC<{ t: number; solid?: boolean }> = ({ t, solid = false }) => {
  const a = beat(20);
  if (t < a - 0.1 || t >= STOP) return null;
  const head = ease.out(ramp(t, a, a + 0.3));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, direction: "rtl" }}>
      <div style={{ position: "absolute", top: 262, width: 1080, textAlign: "center", opacity: head, transform: `translateY(${(1 - head) * -40}px)` }}>
        <div style={{ fontFamily: F.text, fontSize: 42, color: C.dim }}>دوره‌ی جامع</div>
        <div style={{ fontFamily: F.head, fontSize: 84, color: C.ink, lineHeight: 1.15 }}>
          ویدئوسازی با <En>AI</En>
        </div>
      </div>
      {FEATS.map((f, i) => {
        const k = ramp(t, f.at - 0.02, f.at + 0.24);
        if (k <= 0) return null;
        const e = ease.back(k);
        const latest = i === FEATS.length - 1 || t < FEATS[i + 1].at;
        const p = kick(t, f.at, STOP, 0.12);
        const y = 470 + i * 214;
        return (
          <div key={i} style={{ position: "absolute", left: 90, top: y, width: 900, height: 188, borderRadius: 34, background: solid ? (latest ? "rgba(40,18,8,0.9)" : "rgba(10,11,15,0.86)") : latest ? "rgba(255,122,61,0.12)" : "rgba(255,255,255,0.045)", border: `2px solid ${latest ? C.orange : C.line}`, boxShadow: latest ? `0 0 ${40 + p * 40}px ${hexA(C.orange, 0.35)}` : "none", opacity: clamp(k * 3) * (latest ? 1 : 0.72), transform: `translateX(${(1 - e) * 700}px) rotate(${(1 - e) * -6}deg) scale(${latest ? 1 + p * 0.015 : 0.97})`, display: "flex", alignItems: "center", gap: 34, padding: "0 46px" }}>
            <Icon k={f.icon} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
              <span style={{ fontFamily: F.head, fontSize: 104, color: C.ink, direction: "rtl" }}>{f.big}</span>
              <span style={{ fontFamily: F.text, fontSize: 46, color: C.dim }}>{f.small}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------- 6 · hush background + 7 · drop burst ----------------
const HushBg: React.FC<{ t: number }> = ({ t }) => {
  if (t < STOP || t > DROP + 0.3) return null;
  const roll = ramp(t, ROLL, DROP);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#020203" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 40% at 50% 50%, ${hexA(C.orange, 0.06 + roll * roll * 0.35)}, transparent 70%)` }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2 + t * 0.3;
          const r0 = 200 + 600 * (1 - roll);
          const len = 40 + roll * roll * 900;
          return <line key={i} x1={540 + Math.cos(a) * r0} y1={820 + Math.sin(a) * r0} x2={540 + Math.cos(a) * (r0 + len)} y2={820 + Math.sin(a) * (r0 + len)} stroke={C.hot} strokeWidth={2 + roll * 3} opacity={0.08 + roll * 0.5} />;
        })}
      </svg>
    </div>
  );
};

const DropBg: React.FC<{ t: number }> = ({ t }) => {
  if (t < DROP - 0.02) return null;
  const k = t - DROP;
  const ring = (d: number) => ramp(k, d, d + 0.7);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* slow rotating rays */}
      <div style={{ position: "absolute", left: 540 - 1300, top: 820 - 1300, width: 2600, height: 2600, transform: `rotate(${k * 9}deg)`, background: `repeating-conic-gradient(from 0deg, ${hexA(C.orange, 0.11)} 0deg 5deg, transparent 5deg 15deg)`, WebkitMaskImage: "radial-gradient(circle, #000 0, #000 18%, transparent 52%)", opacity: ease.out(clamp(k * 3)) }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(55% 32% at 50% 44%, ${hexA(C.orange, 0.3 + hit(t, DROP, 0.4) * 0.5)}, transparent 75%)` }} />
      {[0, 0.12, BEAT].map((d, i) => {
        const r = ring(d);
        if (r <= 0 || r >= 1) return null;
        const s = ease.out(r) * 1500;
        return <div key={i} style={{ position: "absolute", left: 540 - s / 2, top: 820 - s / 2, width: s, height: s, borderRadius: "50%", border: `${10 * (1 - r)}px solid ${C.hot}`, opacity: (1 - r) * 0.8 }} />;
      })}
      {/* sparks */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 90 }, (_, i) => {
          const sp = 300 + rnd(i) * 1400;
          const a = rnd(i + 5) * Math.PI * 2;
          const life = 0.9 + rnd(i + 9) * 1.4;
          const q = clamp(k / life);
          if (q >= 1) return null;
          const d = sp * (1 - Math.exp(-k * 2.2)) / 2.2;
          const x = 540 + Math.cos(a) * d, y = 820 + Math.sin(a) * d + k * k * 160;
          if (y > 1340) return null;
          return <circle key={i} cx={x} cy={y} r={2 + rnd(i + 2) * 4} fill={i % 3 ? C.hot : "#fff"} opacity={1 - q} />;
        })}
        {/* drifting embers for the long hold */}
        {Array.from({ length: 30 }, (_, i) => {
          const y = 1340 - (((t - DROP) * (40 + rnd(i) * 60) + rnd(i + 4) * 1100) % 1100);
          return <circle key={`e${i}`} cx={80 + rnd(i + 7) * 920 + Math.sin(t + i) * 20} cy={y} r={1.5 + rnd(i) * 2} fill={C.hot} opacity={ease.out(clamp((t - DROP - 0.4) * 2)) * 0.5} />;
        })}
      </svg>
    </div>
  );
};

// ---------------- film ----------------
export const FilmA: React.FC<{ times?: number[]; audio?: string }> = ({ times, audio }) => {
  const ready = useStoryFonts();
  const frame = useCurrentFrame();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  const shake = t >= DROP ? hit(t, DROP, 0.15) * 14 : hit(t, beat(5), 0.1) * 8;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {ready && (
        <>
          <div style={{ position: "absolute", inset: 0, transform: `translate(${Math.sin(t * 97) * shake}px, ${Math.cos(t * 81) * shake}px)` }}>
            <Bg t={t} />
            <HushBg t={t} />
            <DropBg t={t} />
            <Feed t={t} />
            <HookText t={t} />
            <Prompt t={t} />
            <Editor t={t} />
            <Learn t={t} />
            <Features t={t} />
            <Hush t={t} />
            <CTA t={t} />
            <Logo w={360} t={t} at={FINAL} style={{ position: "absolute", left: 360, top: 300 }} />
          </div>
          <LinkBox t={t} />
          <Grain t={t} />
          <div style={{ position: "absolute", left: 0, top: SAFE_BOTTOM, width: 0, height: 0 }} />
        </>
      )}
      {audio && !times && (
        <Sequence from={0} layout="none">
          <Html5Audio src={staticFile(audio)} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
