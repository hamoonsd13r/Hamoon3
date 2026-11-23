// Talk Cutout demo · MOTION «هر هفته یه ویدیو منتشر کن و بعد از یه ماه، آمارت رو ببین». The stats page lands as a
// floating card with a «whose numbers» chip; its latest-content list fills one upload per word («هر»، «هفته»، «ویدیو»،
// «منتشر»), the camera rises to the analytics on «بعد از یه ماه», the Views cell lights on «ماه», and on «آمارت» its
// number lifts off toward the lens (the page goes nearly black under it: a white page under a lifted number reads
// as a ghost) — the screen's own value, no counter roll. Privacy blur on: name, avatars, titles, thumbnails.
import React from "react";
import { C, F, accentA } from "../../lib/theme";
import { clamp, ease, jolt, mix, pop } from "../../lib/time";
import { World, camKF, clampToPage, drift, toScreen, type Cam } from "../../lib/camera";
import { Lift, Scrim } from "../../lib/kinetic";
import { YouTubeMark } from "../../lib/icons";
import { SP, SP_AT, StudioPage } from "../../lib/apps/studio";
import { B, STATS, T, UPLOADS } from "../script";

const X0 = 540 - SP.w / 2, Y0 = 120; // the page in world px
const P = (x: number, y: number) => ({ x: X0 + x, y: Y0 + y });
export const LIFT_V = { a: T.amar - 0.02, b: T.talk2 - 0.18 };

const cam = (t: number): Cam => {
  const list = P(SP_AT.list.x, SP_AT.list.y + 40), cards = P(SP_AT.cards.x, SP_AT.cards.y);
  const v = P(SP_AT.views.x + SP_AT.views.w / 2, SP_AT.views.y + SP_AT.views.h / 2);
  const c = drift(
    camKF(t, [
      // the whole page lands small (the «whose numbers» chip sits above it), then pushes in on the list as it fills
      [T.har4 - 0.12, { x: 540, y: 940, s: 0.56, rx: 12, ry: -10 }],
      [T.har4 + 0.5, { x: 540, y: 920, s: 0.64, rx: 2, ry: -2 }],
      [T.video4 + 0.1, { x: 540, y: 990, s: 0.72 }],
      [T.montasher + 0.45, { x: list.x, y: list.y - 30, s: 0.98 }],
      [T.bad + 0.05, { x: list.x, y: list.y - 50, s: 1.0 }],
      [T.mah4 + 0.1, { x: cards.x, y: cards.y, s: 1.22 }],
      [LIFT_V.a - 0.08, { x: v.x + 40, y: v.y + 10, s: 1.6 }],
      [LIFT_V.a + 0.1, { x: v.x, y: v.y, s: 1.95 }],
      [T.talk2 + 0.1, { x: v.x - 6, y: v.y - 8, s: 2.02 }],
    ]),
    t,
    0.6,
  );
  return clampToPage(c, X0, SP.w);
};

export const ProofScene: React.FC<{ t: number }> = ({ t }) => {
  const c = cam(t);
  const land = ease.out(clamp((t - (T.har4 - 0.12)) / 0.42));
  const kick = jolt(t, LIFT_V.a + 0.02, 16, 30, 9);
  const hi = clamp((t - (T.mah4 - 0.05)) / 0.3);
  const dim = clamp((t - (LIFT_V.a + 0.1)) / 0.25);
  const lc = cam(LIFT_V.a);
  const na = toScreen(lc, P(SP_AT.viewsNum.x, SP_AT.viewsNum.y)), nb = toScreen(lc, P(SP_AT.viewsNum.x + SP_AT.viewsNum.w, SP_AT.viewsNum.y + SP_AT.viewsNum.h));
  const chip = pop(t, T.har4 + 0.25, 0.45);
  const chipOut = clamp((t - (T.video4 - 0.1)) / 0.25); // gone before the push brings the page under it
  const white = clamp((t - LIFT_V.a) / 0.06); // the page's own number goes as its lifted copy leaves: no double
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${kick}px)` }}>
      <div style={{ position: "absolute", left: -200, top: 260, width: 1480, height: 1500, background: `radial-gradient(closest-side, ${accentA(0.16)}, transparent)`, filter: "blur(40px)", opacity: land }} />
      <div style={{ position: "absolute", inset: 0, filter: dim > 0.01 ? `blur(${12 * dim}px) brightness(${1 - 0.8 * dim})` : undefined }}>
        <World cam={c}>
          <div style={{ position: "absolute", left: X0, top: Y0, width: SP.w, height: SP.h, borderRadius: 54, overflow: "hidden", boxShadow: "0 60px 160px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,255,255,0.10)", opacity: land, transform: `translateY(${(1 - land) * 120}px)` }}>
            <StudioPage t={t} stats={STATS} uploads={UPLOADS} channel="My Channel" hiViews={hi * (1 - dim)} whiteViews={white} />
          </div>
        </World>
      </div>
      <Scrim a={0.84 * dim} />
      {/* whose numbers these are */}
      {chip > 0 && chipOut < 1 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 238, display: "flex", justifyContent: "center", opacity: clamp(chip * 3) * (1 - chipOut), transform: `translateY(${(1 - clamp(chip)) * -30}px) scale(${mix(0.9, 1, clamp(chip))})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 30px", borderRadius: 999, background: "rgba(14,16,19,0.92)", border: "1.5px solid rgba(244,238,230,0.18)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", direction: "rtl" }}>
            <YouTubeMark size={44} />
            <span style={{ fontFamily: F.head, fontSize: 46, color: C.cream, whiteSpace: "nowrap" }}>آمار نمونه</span>
            <span style={{ fontFamily: F.vzB, fontSize: 32, color: C.dim, whiteSpace: "nowrap" }}>در 28 روز آخر</span>
          </div>
        </div>
      ) : null}
      {/* the hold keeps moving: a warm glow behind the number breathes on the beat, the lift pushes in slowly */}
      {t > LIFT_V.a + 0.3 && t < LIFT_V.b + 0.35 ? (
        <div style={{ position: "absolute", left: 20, top: 380, width: 1040, height: 760, borderRadius: "50%", background: `radial-gradient(closest-side, ${accentA(0.22)}, transparent)`, filter: "blur(30px)", opacity: clamp((t - LIFT_V.a - 0.3) / 0.5) * (1 - clamp((t - LIFT_V.b) / 0.3)) * (0.75 + 0.25 * B.beatPulse(t, 6)) }} />
      ) : null}
      <div style={{ position: "absolute", inset: 0, transformOrigin: "540px 760px", transform: `scale(${1 + 0.06 * ease.inOut(clamp((t - (LIFT_V.a + 0.5)) / Math.max(0.3, LIFT_V.b - LIFT_V.a - 0.5)))})` }}>
        <Lift t={t} a={LIFT_V.a} b={LIFT_V.b} from={{ x: na.x, y: na.y, w: nb.x - na.x, h: nb.y - na.y }} tx={540} ty={700} size={230} value={STATS.views} ink="#0f0f0f"
          label={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, direction: "rtl" }}>
              <div style={{ fontFamily: F.head, fontSize: 54, color: C.cream, whiteSpace: "nowrap" }}>بازدید در 28 روز آخر</div>
              <div style={{ padding: "8px 24px", borderRadius: 999, background: "rgba(244,238,230,0.07)", border: "1.5px solid rgba(244,238,230,0.16)", fontFamily: F.vzB, fontSize: 30, color: C.dim }}>نمونه</div>
            </div>
          } />
      </div>
    </div>
  );
};
