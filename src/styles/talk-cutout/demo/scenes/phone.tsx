// Talk Cutout demo · MOTION, steps 1 and 2 on one phone, every tap on the word that says it.
// Step 1 «قدم اول: توی یوتیوب، کانال‌های پربازدید موضوع خودت رو پیدا کن»: the splash opens into home on «یوتیوب» →
// search on «کانال‌های», the topic types itself → results on «پربازدید» → the channel row glows on «موضوع» → the channel
// opens on «پیدا» → Subscribe on «کن».
// Step 2 «قدم دوم: ببین کدوم ویدیوهاشون بیشتر دیده شده و چرا»: Videos on «ببین» → the Popular chip on «کدوم» → its most
// viewed row lights on «بیشتر» → 1.2M lifts off on «دیده» (the phone softens and darkens under it, so the number never
// sits on UI text) and «چرا؟» joins it on «چرا» → the phone sinks away, so «قدم 3» lands on a clean dark stage.
import React from "react";
import { C, F } from "../../lib/theme";
import { clamp, ease, pop } from "../../lib/time";
import { World, camKF, drift, toScreen, type Cam } from "../../lib/camera";
import { Phone } from "../../lib/device";
import { Lift } from "../../lib/kinetic";
import { LIST_Y, YtScreen, typedAt, type YtState } from "../../lib/apps/youtube";
import { QUERY, T, TOP_VIEWS, YT } from "../script";

const S = 2.05; // phone scale in the world
const SX = 540 - 196.5 * S, SY = 960 - 426 * S; // the screen's top-left (world px)
const pw = (x: number, y: number) => ({ x: SX + x * S, y: SY + y * S });

// ── the clock of this scene (all on words) ──
const SPLASH_OUT = T.ytb - 0.05;
const SEARCH_TAP = T.kanalha - 0.12;
const TYPE_A = T.kanalha - 0.04, TYPE_B = T.porbazdid - 0.04;
const RESULTS = T.porbazdid - 0.02;
const CH_TAP = T.peyda - 0.08;
const SUB_PRESS = T.kon1 + 0.02;
const VID_TAP = T.bebin - 0.04;
const POP_TAP = T.kodoom + 0.04;
const LIFT = { a: T.dide - 0.06, b: T.cheraE + 0.12 };
const AWAY = T.cheraE + 0.2;

const state = (t: number): YtState => {
  const tapU = (at: number) => clamp((t - at) / 0.35);
  if (t < SEARCH_TAP + 0.12) {
    return { page: "home", splash: 1 - clamp((t - SPLASH_OUT) / 0.25), splashG: ease.inOut(clamp((t - T.steps) / (SPLASH_OUT - T.steps))), tap: { x: 357, y: 76, u: tapU(SEARCH_TAP - 0.06) } };
  }
  if (t < CH_TAP + 0.12) {
    const results = clamp((t - RESULTS) / 0.42);
    return { page: "search", typed: typedAt(t, QUERY, TYPE_A, TYPE_B), results, hiChan: clamp((t - (T.mozoo - 0.05)) / 0.3), tap: results >= 1 ? { x: 150, y: 170, u: tapU(CH_TAP) } : undefined };
  }
  if (t < VID_TAP + 0.12) {
    return { page: "channel", tab: "home", hiStats: clamp((t - (CH_TAP + 0.2)) / 0.3), sub: clamp((t - SUB_PRESS) / 0.4), tap: t < VID_TAP - 0.3 ? { x: 196, y: 318, u: tapU(SUB_PRESS - 0.04) } : { x: 80, y: 372, u: tapU(VID_TAP - 0.04) } };
  }
  return {
    page: "channel", tab: "videos", sub: 1,
    popular: clamp((t - (POP_TAP + 0.04)) / 0.45),
    viewsHi: clamp((t - (T.bishtar2 - 0.12)) / 0.3),
    hiRow: clamp((t - (T.bishtar2 - 0.05)) / 0.3),
    tap: t < POP_TAP + 0.3 ? { x: 120, y: 419, u: tapU(POP_TAP - 0.04) } : undefined,
  };
};

const cam = (t: number): Cam => {
  const mid = pw(196, 426), top = pw(196, 150), res = pw(196, 220), stats = pw(196, 250), sub = pw(196, 318), chips = pw(196, 420), row = pw(196, LIST_Y + 150);
  return drift(
    camKF(t, [
      [T.steps - 0.05, { x: mid.x, y: mid.y + 60, s: 0.62, rx: 14, ry: -18 }],
      [T.steps + 0.55, { x: mid.x, y: mid.y, s: 0.95, rx: 4, ry: -6 }],
      [SPLASH_OUT + 0.3, { x: mid.x, y: mid.y + 20, s: 1.0 }],
      [SEARCH_TAP - 0.1, { x: top.x, y: top.y + 150, s: 1.1 }],
      [T.porbazdid + 0.25, { x: res.x, y: res.y + 300, s: 1.2 }],
      [CH_TAP, { x: res.x, y: res.y + 300, s: 1.16 }],
      [CH_TAP + 0.45, { x: stats.x, y: stats.y + 150, s: 1.12 }],
      [SUB_PRESS + 0.25, { x: sub.x, y: sub.y + 120, s: 1.2 }],
      [VID_TAP + 0.3, { x: chips.x, y: chips.y + 140, s: 1.14 }],
      [POP_TAP + 0.55, { x: row.x, y: row.y, s: 1.06 }],
      [T.cheraE + 0.3, { x: row.x, y: row.y + 40, s: 1.1 }],
      [T.step3, { x: row.x, y: row.y + 80, s: 1.5 }],
    ]),
    t,
    0.8,
  );
};

export const PhoneFlow: React.FC<{ t: number }> = ({ t }) => {
  const c = cam(t);
  const s = state(t);
  const liftDim = clamp((t - (LIFT.a + 0.12)) / 0.25) * (1 - clamp((t - (LIFT.b + 0.28)) / 0.12));
  const away = clamp((t - AWAY) / 0.5);
  const dim = Math.max(liftDim, 0.6 * away);
  // where «1.2M views» sits on screen when it lifts off (the first Popular row's meta line)
  const lc = cam(LIFT.a);
  const v0 = toScreen(lc, pw(176, LIST_Y + 254)), v1 = toScreen(lc, pw(236, LIST_Y + 270));
  const q = pop(t, T.chera - 0.03, 0.4);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - away, filter: dim > 0.01 ? `blur(${4.5 * dim + 6 * away}px) brightness(${1 - 0.4 * dim})` : undefined }}>
        <World cam={c}>
          <Phone x={540} y={960} s={S} glow={C.yt} glowA={0.5}>
            <YtScreen s={s} d={YT} />
          </Phone>
        </World>
      </div>
      <Lift t={t} a={LIFT.a} b={LIFT.b} from={{ x: v0.x, y: v0.y, w: v1.x - v0.x, h: v1.y - v0.y }} tx={540} ty={760} size={220} value={TOP_VIEWS} ink="rgb(255,121,41)"
        label={
          <div style={{ display: "flex", alignItems: "center", gap: 26, direction: "ltr" }}>
            <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 36, letterSpacing: 8, color: C.dim }}>VIEWS</span>
            {q > 0 ? <span style={{ fontFamily: F.head, fontSize: 84, lineHeight: 1, color: C.accent, direction: "rtl", display: "inline-block", transform: `scale(${q})` }}>چرا؟</span> : null}
          </div>
        } />
    </div>
  );
};
