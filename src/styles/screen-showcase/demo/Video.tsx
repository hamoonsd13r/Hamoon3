// Screen Showcase · demo film. Copy this file + script.ts (+ site.tsx if you keep a coded page) to src/vNN/, change
// the imports to ../styles/screen-showcase/lib/…, then swap the lines, the prompt, the code and the camera keys.
// With your own screen recording: <CamView clip={{ src: "vNN/clips/site.mp4", t0, from }} sw={1368} sh={918} …/>.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CamView } from "../lib/cam";
import { Backdrop, CH, Chip, Dots, StatusLine, TopBar, Win, enter } from "../lib/chrome";
import { Editor, PromptBox, Step } from "../lib/code";
import { useShowcaseFonts } from "../lib/fonts";
import { Subtitle } from "../lib/subtitle";
import { C, FA, FPS, MONO, TimeCtx, accentA, clamp, eio, eo, lerp, pop, ramp } from "../lib/theme";
import { CHUNKS, DUR, EDIT, EDIT_KEYS, HOOK_KEYS, K, PROMPT, PUB_KEYS, SC, TOUR_KEYS, TOUR_MARKS, sceneAt } from "./script";
import { DemoSite, SITE, SITE_H, SITE_W } from "./site";

export type DemoProps = { times?: number[] };

const BW = { x: 40, y: 300, w: 1000, h: 800 }; // browser window; content 1000 × 750
const AW = { x: 40, y: 330, w: 1000, h: 760 }; // app window
const TEAL = "#1F9E8F";
const mixHex = (a: string, b: string, u: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(",")})`;
};
const btnColor = (t: number) => mixHex(TEAL, C.accent, eo(ramp(t, K.swap, K.swap + 0.3)));
const AppIcon = () => <div style={{ width: 18, height: 18, borderRadius: 6, background: C.accent }} />;

const CODE = [
  "<!-- استودیو نورا · صفحه‌ی اصلی -->",
  '<header class="nav">',
  '  <a class="logo">استودیو نورا</a>',
  "  <nav>نمونه‌کارها · خدمات · نظرها · تماس</nav>",
  '  <a class="btn">رزرو جلسه</a>',
  "</header>",
  '<section class="hero">',
  '  <span class="badge">عکاسی با نور طبیعی</span>',
  "  <h1>عکس‌هایی که می‌مونن</h1>",
  '  <a class="btn">رزرو جلسه</a>',
  "</section>",
  "",
  ".hero {",
  "  min-height: 90vh;",
  "  display: grid;",
  "  grid-template-columns: 1fr 1fr;",
  "}",
  ".btn { background: var(--teal); border-radius: 999px; }",
  ".gallery { grid-template-columns: repeat(3, 1fr); gap: 24px; }",
];

// ── 1 · hook: the result first ────────────────────────────────────────────────────────────────────────────────
const Hook: React.FC<{ t: number }> = ({ t }) => {
  const ok = pop(t, K.how - 0.1);
  const secs = Math.round(lerp(96, 160, eio(ramp(t, 0.2, K.how))));
  const clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <>
      <Win {...BW} live url="yoursite.app" style={{ transform: `scale(${1 + 0.02 * (1 - eo(clamp(t / 0.8)))})` }}>
        <CamView t={t} keys={HOOK_KEYS} bw={BW.w} bh={BW.h - CH} sw={SITE_W} sh={SITE_H}>
          <DemoSite btn={TEAL} />
        </CamView>
      </Win>
      <div style={{ position: "absolute", left: 90, right: 140, top: 1140, display: "flex", justifyContent: "space-between", alignItems: "center", direction: "rtl" }}>
        <div style={{ padding: "16px 28px", borderRadius: 18, background: "rgba(16,17,23,.92)", border: `1.5px solid ${C.line}`, display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 30, color: C.dim }}>زمان ساخت</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 52, color: ok > 0 ? C.accent : C.text, direction: "ltr" }}>{clock}</span>
        </div>
        <Chip k={ok} accent>✓ آماده</Chip>
      </div>
    </>
  );
};

// ── 2 · the prompt types ──────────────────────────────────────────────────────────────────────────────────────
const Prompt: React.FC<{ t: number }> = ({ t }) => {
  const n = Math.round(PROMPT.length * ramp(t, K.typeA, K.typeB));
  return (
    <Win {...AW} kind="app" title="دستیار ساخت سایت" icon={<AppIcon />} style={enter(t, SC.prompt.t0)}>
      <div style={{ padding: "36px 40px", direction: "rtl" }}>
        <div style={{ fontFamily: FA, fontWeight: 800, fontSize: 52, color: C.text }}>چه بسازیم؟</div>
        <div style={{ marginTop: 8, marginBottom: 26, fontFamily: FA, fontWeight: 500, fontSize: 26, color: C.dim }}>فقط بگو چی می‌خوای؛ قدم‌به‌قدم می‌سازه.</div>
        <PromptBox t={t} text={PROMPT} n={n} caret />
      </div>
    </Win>
  );
};

// ── 3 · sent: the agent's steps ───────────────────────────────────────────────────────────────────────────────
const Run: React.FC<{ t: number }> = ({ t }) => {
  const t0 = SC.run.t0;
  const press = ramp(t, t0, t0 + 0.12) - ramp(t, t0 + 0.12, t0 + 0.3);
  const m = eio(ramp(t, t0 + 0.2, t0 + 0.65));
  return (
    <Win {...AW} kind="app" title="دستیار ساخت سایت" icon={<AppIcon />}>
      <div style={{ padding: "36px 40px", direction: "rtl" }}>
        <div style={{ opacity: 1 - m, height: (1 - m) * 118, overflow: "hidden" }}>
          <div style={{ fontFamily: FA, fontWeight: 800, fontSize: 52, color: C.text }}>چه بسازیم؟</div>
        </div>
        <div style={{ marginRight: m * 140 }}>
          <PromptBox t={t} text={PROMPT} n={PROMPT.length} caret={false} compact={m > 0.5} send={press} />
        </div>
        <Step t={t} k={eo(ramp(t, K.step1 - 0.3, K.step1))} n={1} text={t < K.structure ? "خواندن درخواست" : "درخواست خوانده شد"} busy={t < K.structure} />
        <Step t={t} k={eo(ramp(t, K.structure - 0.25, K.structure + 0.05))} n={2} text={t < K.style ? "ساختار" : "ساختار آماده"} file="index.html" busy={t < K.style} />
        <Step t={t} k={eo(ramp(t, K.style - 0.25, K.style + 0.05))} n={3} text="استایل" file="styles.css" busy />
      </div>
    </Win>
  );
};

// ── 4 · the code writes itself ────────────────────────────────────────────────────────────────────────────────
const Code: React.FC<{ t: number }> = ({ t }) => (
  <Editor t={t} p={0.04 + eo(ramp(t, SC.code.t0 - 0.05, K.codeEnd)) * 0.95} code={CODE} tabAt={[0, 0.62]} x={40} y={300} w={1000} h={1060} style={enter(t, SC.code.t0)} />
);

// ── 5 · the tour: menu, gallery, reviews ──────────────────────────────────────────────────────────────────────
const Tour: React.FC<{ t: number }> = ({ t }) => (
  <Win {...BW} live url="localhost:3000" style={enter(t, SC.tour.t0)}>
    <CamView t={t} keys={TOUR_KEYS} bw={BW.w} bh={BW.h - CH} sw={SITE_W} sh={SITE_H} marks={TOUR_MARKS} bg="#0B0C10">
      <DemoSite btn={TEAL} />
    </CamView>
  </Win>
);

// ── 6 · a live edit: «make the buttons orange» ───────────────────────────────────────────────────────────────
const Edit: React.FC<{ t: number }> = ({ t }) => {
  const n = Math.round(EDIT.length * ramp(t, K.editType, K.swap - 0.25));
  const sent = t >= K.swap - 0.15;
  const ok = pop(t, K.swap + 0.25);
  const b = SITE.heroBtn;
  return (
    <>
      <Win {...BW} live url="localhost:3000">
        <CamView t={t} keys={EDIT_KEYS} bw={BW.w} bh={BW.h - CH} sw={SITE_W} sh={SITE_H} ripples={[{ t: K.swap, x: b.x + b.w / 2, y: b.y + b.h / 2 }]} marks={[{ t0: K.swap + 0.2, t1: SC.edit.t1 - 0.05, ...b, label: "نارنجی شد", below: true }]}>
          <DemoSite btn={btnColor(t)} />
        </CamView>
      </Win>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1130 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 24px", borderRadius: 22, background: C.panel2, border: `1.5px solid ${accentA(sent ? 0.3 : 0.55)}`, direction: "rtl", opacity: clamp((t - SC.edit.t0) / 0.25) }}>
          <span style={{ flex: 1, fontFamily: FA, fontWeight: 500, fontSize: 34, color: C.text }}>
            {EDIT.slice(0, n)}
            {!sent ? <span style={{ color: C.accent, opacity: Math.floor(t * 3) % 2 ? 0.2 : 1 }}>▍</span> : null}
          </span>
          {sent && ok <= 0 ? <Dots t={t} /> : null}
          {ok > 0 ? <Chip k={ok} accent style={{ fontSize: 26, padding: "8px 18px" }}>✓ انجام شد</Chip> : null}
        </div>
      </div>
    </>
  );
};

// ── 7 · one click to publish ──────────────────────────────────────────────────────────────────────────────────
const PubBtn: React.FC<{ t: number }> = ({ t }) => {
  const press = ramp(t, K.click, K.click + 0.1) - ramp(t, K.click + 0.1, K.click + 0.28);
  const p = ramp(t, K.click, K.click + 0.7);
  const live = t >= K.click + 0.35;
  const k = eo(ramp(t, SC.publish.t0, SC.publish.t0 + 0.3));
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, height: 96, padding: "0 56px", borderRadius: 48, background: live ? C.green : C.accent, color: "#160A02", fontFamily: FA, fontWeight: 800, fontSize: 44, transform: `scale(${(0.9 + 0.1 * k) * (1 - 0.08 * press)})`, opacity: k, boxShadow: `0 24px 60px ${live ? "rgba(74,222,128,.35)" : accentA(0.4)}`, direction: "rtl" }}>
      {live ? "✓ منتشر شد" : "انتشار"}
      {p > 0 && p < 1 ? <div style={{ position: "absolute", left: "50%", top: "50%", width: 60 + 380 * eo(p), height: 60 + 380 * eo(p), marginLeft: -(30 + 190 * eo(p)), marginTop: -(30 + 190 * eo(p)), borderRadius: "50%", border: `5px solid ${live ? C.green : C.accent}`, opacity: 1 - p }} /> : null}
    </div>
  );
};
const Publish: React.FC<{ t: number }> = ({ t }) => {
  const live = t >= K.click + 0.35;
  const ok = pop(t, K.live - 0.05);
  return (
    <>
      <Win {...BW} live={live} url={live ? "nora-studio.app" : "localhost:3000"} style={enter(t, SC.publish.t0)}>
        <CamView t={t} keys={PUB_KEYS} bw={BW.w} bh={BW.h - CH} sw={SITE_W} sh={SITE_H}>
          <DemoSite btn={C.accent} />
        </CamView>
      </Win>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", justifyContent: "center" }}>
        {ok > 0 ? (
          <Chip k={ok} accent style={{ fontSize: 36, padding: "20px 36px" }}>
            <span style={{ fontFamily: MONO, fontSize: 34, direction: "ltr" }}>nora-studio.app</span> · آنلاینه
          </Chip>
        ) : (
          <PubBtn t={t} />
        )}
      </div>
    </>
  );
};

const SCENES: Record<string, React.FC<{ t: number }>> = { hook: Hook, prompt: Prompt, run: Run, code: Code, tour: Tour, edit: Edit, publish: Publish };

export const ScreenShowcaseAt: React.FC<{ t: number }> = ({ t }) => {
  const id = sceneAt(t);
  const Scene = SCENES[id];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop t={t} />
      <TopBar t={t} path="nora-studio" tag={SC[id].tag} />
      <Scene t={t} />
      <StatusLine left="AI model · deep" right={SC[id].status} />
      <Subtitle t={t} chunks={CHUNKS} />
      {t > DUR - 0.5 ? <AbsoluteFill style={{ background: "#000", opacity: ramp(t, DUR - 0.5, DUR) * 0.6 }} /> : null}
    </AbsoluteFill>
  );
};

export const ScreenShowcaseDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useShowcaseFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <ScreenShowcaseAt t={t} />
    </TimeCtx.Provider>
  );
};
