// Explore Wall · demo film. Copy this file + script.ts (+ screens.tsx while you have no screenshots) to src/vNN/,
// change the imports to ../styles/explore-wall/lib/…, then put YOUR reel covers in TILES (`img: "vNN/tiles/x.jpg"`,
// `views`) and YOUR screenshots in the proof cards (`src`, rects read off the picture in px).
// One world for the whole film: the wall, flown by one camera; proof cards and totals float over it.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions, Lift, Scrim, World, camKF, type Cam } from "../lib/kit";
import { useWallFonts } from "../lib/fonts";
import { MosaicWall, cellCenter, CELL, wallSize } from "../lib/wall";
import { ProofShot, shotToFrame } from "../lib/proof";
import { C, F, FPS, SD, TimeCtx, beatPulse, clamp, ease, fmtV, mix, pop, ramp } from "../lib/theme";
import { CAPS, COLS, DUR, HERO, ROWS, SC, SLOT, TOTAL, WORDS, tileAt } from "./script";
import { INS, PRO, ProfileHeader, ReelInsights } from "./screens";

export type DemoProps = { times?: number[] };
const WALL = wallSize(COLS, ROWS);
const cc = (c: number, r: number) => cellCenter(c, r);

// ── the camera: a tilted pan over the wall → a dive into one reel → hold under the proof cards → the whole wall →
//    a push toward the empty slot ─────────────────────────────────────────────────────────────────────────────
const camAt = (t: number): Cam => {
  const hero = cc(HERO.c, HERO.r), slot = cc(SLOT.c, SLOT.r);
  return camKF(t, [
    [0, { x: cc(1, 2).x, y: WALL.h / 2, s: 0.92, rx: 10, ry: 12, rz: 2 }],
    [SC.dive - 0.35, { x: cc(7, 2).x, y: WALL.h / 2, s: 0.86, rx: 10, ry: -10, rz: -2 }],
    [SC.dive + 0.7, { x: hero.x, y: hero.y, s: 2.5, rx: 0, ry: 0, rz: 0 }],
    [SC.total - 0.1, { x: hero.x, y: hero.y, s: 2.7, rx: 0, ry: 0, rz: 0 }],
    [SC.total + 1.0, { x: WALL.w / 2, y: WALL.h / 2, s: 0.335, rx: 4, ry: 0, rz: 0 }],
    [SC.cta + 0.2, { x: WALL.w / 2, y: WALL.h / 2, s: 0.35, rx: 4, ry: 0, rz: 0 }],
    [SC.cta + 1.2, { x: slot.x, y: slot.y, s: 1.05, rx: 6, ry: 0, rz: 0 }],
    [DUR, { x: slot.x, y: slot.y, s: 1.12, rx: 6, ry: 0, rz: 0 }],
  ]);
};

/** the empty slot that closes the film: «ریلز بعدی مال توئه» */
const Slot: React.FC<{ t: number }> = ({ t }) => {
  const k = ease.out(clamp((t - SC.cta) / 0.5));
  if (k <= 0) return null;
  const p = beatPulse(t, 5);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.ig, border: `4px dashed ${C.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, opacity: k }}>
      <div style={{ width: 130, height: 130, borderRadius: 65, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.06 * p})`, boxShadow: `0 0 ${40 + 30 * p}px rgba(255,77,77,0.55)` }}>
        <svg width={64} height={64} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={3} strokeLinecap="round" /></svg>
      </div>
      <div style={{ direction: "rtl", textAlign: "center", fontFamily: F.fa, fontSize: 44, lineHeight: 1.25, color: C.cream }}>ریلز بعدی<br />مال توئه</div>
    </div>
  );
};

const Wall: React.FC<{ t: number }> = ({ t }) => {
  const cam = camAt(t);
  const proof = ramp(t, SC.dive + 0.55, SC.dive + 0.9) * (1 - ramp(t, SC.total - 0.1, SC.total + 0.4));
  // light accents: three cells ring on «گوشی» and «ایده»; the hero reel rings before the dive
  const blink = (c: number, r: number, a: number) => (t >= a ? Math.sin(Math.PI * clamp((t - a) / 1.1)) : 0);
  const hi = (c: number, r: number) => {
    if (c === HERO.c && r === HERO.r) return ramp(t, SC.dive - 0.5, SC.dive - 0.1) * (1 - ramp(t, SC.total - 0.2, SC.total));
    if (c === 3 && r === 1) return blink(c, r, SC.phone - 0.1);
    if (c === 5 && r === 3) return blink(c, r, SC.idea - 0.1);
    if (c === 6 && r === 0) return blink(c, r, SC.idea + 0.15);
    return 0;
  };
  return (
    <World cam={cam} persp={2600}>
      <MosaicWall cols={COLS} rows={ROWS} tile={tileAt} hi={hi} hiDim={0.45} dim={0.6 * proof} blur={6 * proof} cell={(c, r) => (c === SLOT.c && r === SLOT.r && t >= SC.cta ? <Slot t={t} /> : null)} />
    </World>
  );
};

// ── the proof cards ───────────────────────────────────────────────────────────────────────────────────────────
const card = (t: number, a: number, b: number) => {
  const i = ease.outBack(clamp((t - a) / 0.5)), o = ease.in(clamp((t - b) / 0.3));
  return { opacity: clamp(i) * (1 - o), transform: `translateY(${(1 - clamp(i)) * 120 - o * 80}px) scale(${0.92 + 0.08 * i})` };
};
const Insights: React.FC<{ t: number }> = ({ t }) => {
  const a = SC.dive + 0.55, b = SC.page - 0.3;
  if (t < a || t > b + 0.35) return null;
  const v = Math.round(mix(980_000, 1_204_318, ease.out(ramp(t, a + 0.2, SC.twoHundred + 0.25))));
  return (
    <div style={{ position: "absolute", inset: 0, ...card(t, a, b) }}>
      <ProofShot screen={<ReelInsights views={v.toLocaleString("en-US")} />} sw={INS.w} sh={INS.h} w={900} x={90} y={300} rings={[{ r: INS.views, k: ease.out(ramp(t, SC.seen - 0.1, SC.seen + 0.5)), pad: 18 }]} />
    </div>
  );
};
const PROF = { x: 90, y: 400, w: 900 };
const Profile: React.FC<{ t: number }> = ({ t }) => {
  const a = SC.page - 0.05, b = SC.total - 0.35;
  if (t < a || t > b + 0.35) return null;
  const u = ease.inOut(ramp(t, SC.from, SC.to + 0.3));
  const v = mix(1000, 18000, u);
  const txt = v < 10000 ? Math.round(v).toLocaleString("en-US") : fmtV(Math.round(v / 100) * 100);
  const f = shotToFrame(PRO.followers, { ...PROF, sw: PRO.w, sh: PRO.h });
  return (
    <div style={{ position: "absolute", inset: 0, ...card(t, a, b) }}>
      <ProofShot screen={<ProfileHeader followers={txt} />} sw={PRO.w} sh={PRO.h} {...PROF} hide={[PRO.user]} rings={[{ r: PRO.avatar, k: ease.out(ramp(t, a + 0.3, a + 0.9)), grad: true, pad: 6 }, { r: PRO.followers, k: ease.out(ramp(t, SC.to - 0.05, SC.to + 0.5)), pad: 12 }]} />
      <Lift t={t} a={SC.to + 0.35} b={b} from={f} tx={540} ty={1190} size={190} value={() => "18K"} roll={[SC.to + 0.35, SC.to + 0.36]} label={<span style={{ fontFamily: F.faB, fontSize: 42, color: C.dim, direction: "rtl" }}>دنبال‌کننده</span>} />
    </div>
  );
};

// ── the total over the whole wall ─────────────────────────────────────────────────────────────────────────────
const Total: React.FC<{ t: number }> = ({ t }) => {
  const a = SC.total + 0.6, b = SC.cta - 0.2;
  const k = pop(t, a), o = ease.in(clamp((t - b) / 0.3));
  if (k <= 0 || o >= 1) return null;
  const v = mix(30e6, TOTAL, ease.out(ramp(t, a, SC.fortyTwo + 0.8)));
  return (
    <>
      <Scrim a={0.8 * clamp(k) * (1 - o)} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", flexDirection: "column", alignItems: "center", opacity: clamp(k) * (1 - o), transform: `scale(${0.85 + 0.15 * k})` }}>
        <div style={{ fontFamily: F.ui, fontWeight: 850, fontSize: 300, lineHeight: 1, letterSpacing: -10, color: C.cream, direction: "ltr", textShadow: SD }}>{fmtV(v)}</div>
        <div style={{ marginTop: 18, width: 360, height: 6, borderRadius: 3, background: C.accent }} />
        <div style={{ marginTop: 22, direction: "rtl", fontFamily: F.faB, fontSize: 52, color: C.dim }}>بازدید · ۵۰ ریلز</div>
      </div>
    </>
  );
};

const Cta: React.FC<{ t: number }> = ({ t }) => {
  const k = pop(t, SC.word - 0.1);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", opacity: clamp(k), transform: `scale(${0.8 + 0.2 * k})` }}>
      <div style={{ direction: "rtl", padding: "18px 44px", borderRadius: 999, background: C.accent, color: "#fff", fontFamily: F.faB, fontSize: 54, boxShadow: "0 20px 50px rgba(255,77,77,0.4)" }}>کامنت کن: «دیوار»</div>
    </div>
  );
};

/** the 50-reels chip on «پنجاه» */
const Fifty: React.FC<{ t: number }> = ({ t }) => {
  const k = pop(t, SC.fifty - 0.05), o = ease.in(clamp((t - (SC.dive - 0.4)) / 0.3));
  if (k <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", justifyContent: "center", opacity: clamp(k) * (1 - o), transform: `scale(${0.8 + 0.2 * k})` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "16px 40px", borderRadius: 26, background: "rgba(11,14,20,0.82)", border: `1px solid ${C.line2}`, boxShadow: "0 20px 50px rgba(0,0,0,0.5)", direction: "rtl" }}>
        <span style={{ fontFamily: F.ui, fontWeight: 850, fontSize: 84, color: C.cream, lineHeight: 1 }}>50</span>
        <span style={{ fontFamily: F.faB, fontSize: 44, color: C.dim }}>ریلز · یک سال</span>
      </div>
    </div>
  );
};

export const ExploreWallAt: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: `radial-gradient(80% 60% at 50% 45%, ${C.bg2}, ${C.bg})` }}>
    <Wall t={t} />
    <AbsoluteFill style={{ background: "radial-gradient(75% 55% at 50% 47%, rgba(5,7,11,0) 55%, rgba(5,7,11,0.7))", pointerEvents: "none" }} />
    <Fifty t={t} />
    <Insights t={t} />
    <Profile t={t} />
    <Total t={t} />
    <Cta t={t} />
    <Captions t={t} caps={CAPS} words={WORDS} />
  </AbsoluteFill>
);

export const ExploreWallDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useWallFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <ExploreWallAt t={t} />
    </TimeCtx.Provider>
  );
};
void CELL;
