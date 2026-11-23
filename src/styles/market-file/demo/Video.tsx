// Market File · demo film «چرا شکلات یهو این‌قدر گرون شد؟» (vertical reel, ~45 s, silent: estimated narration
// timing). A pure function of time: one footage bed cut on the words, and on top of it the scene blocks below.
// Copy this file + script.ts + media.ts to src/vNN/, write your lines, map your clips, change the blocks.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Curve, DotGrid, HeroNumber, LineChart, PhaseBar, PhaseCard } from "../lib/charts";
import { BrandMark, BrandTile, Brow, Flood, Grain, Hud, floodOn, makeShake } from "../lib/chrome";
import { useFileFonts } from "../lib/fonts";
import { MapBox, NewsMap, mapXY, type LL } from "../lib/map";
import { Glass, Glitch, Row } from "../lib/marks";
import { Bed } from "../lib/media";
import { C, FA, INK, clamp, easeOut, io, kick, ramp } from "../lib/theme";
import { BigNum, Btn, ChipLabel, Head, MonoLbl, Src } from "../lib/type";
import { MEDIA } from "./media";
import { BROWS, DUR, FPS, HITS, SC, SHOTS, TL } from "./script";

const { at, E } = TL;
const shake = makeShake(HITS);
const FLOODS: [number, number][] = [
  [SC.flood, SC.years],
  [SC.end + 0.1, 1e9],
];

// ─── 01 · the hook: frame 0 is the cover (the whole question, three sizes, the chip already on «گرون») ─────
const Hook: React.FC<{ t: number }> = ({ t }) => {
  if (t >= SC.price) return null;
  const out = SC.price - 0.22;
  const o = 1 - ramp(t, out, out + 0.2);
  const hit = at(0, "گرون");
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 62% 30% at 50% 36%, rgba(6,6,7,.6) 0%, rgba(6,6,7,0) 100%)" }} />
      <Glitch t={t} at={hit} len={0.26} />
      <Head t={t} t0={-1} t1={out} y={466} size={92} align="center" x={60} w={960} lineAt={[-1]} lines={[["چرا", "شکلات"]]} />
      <Head t={t} t0={-1} t1={out} y={584} size={150} align="center" x={60} w={960} lineAt={[-1]} lines={[["یهو", "این‌قدر"]]} />
      <Head t={t} t0={-1} t1={out} y={760} size={196} align="center" x={40} w={1000} lineAt={[-1]} lines={[[{ w: "گرون", chip: -1, pulse: [hit] }, "شد؟"]]} />
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1390, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: o }}>
        <MonoLbl size={21} color={C.creamDim}>
          COCOA · MARKET FILE 01
        </MonoLbl>
        <span dir="rtl" style={{ fontFamily: FA, fontWeight: 700, fontSize: 32, color: C.creamDim }}>
          پرونده‌ی بازار · قیمتِ کاکائو
        </span>
      </div>
    </>
  );
};

// ─── 02 · the price: the chart draws on «توی یک سال», ×3 slams on «سه» ─────────────────────────────────────
const PRICE = [4.2, 4.6, 5.9, 6.9, 7.6, 9.8, 8.4, 7.8, 7.4, 7.3, 8.6, 10.4, 11.6]; // SAMPLE: thousand $ per ton, 12 months
const Price: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.price || t >= SC.source) return null;
  const out = SC.source - 0.2;
  const cardK = ramp(t, SC.priceDraw - 0.35, SC.priceDraw);
  const done = SC.priceDraw + 0.9;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(t, out, out + 0.2) }}>
      <Head t={t} t0={SC.price} y={340} size={110} lineAt={[SC.price + 0.02, SC.triple - 0.25]} lines={[["قیمتِ", "کاکائو،", "توی", "یک", "سال"], [{ w: "سه برابر", chip: SC.triple }, "شد"]]} />
      <Glass x={70} y={700} w={940} h={760} k={cardK}>
        <div dir="rtl" style={{ position: "absolute", right: 40, top: 30, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 44, color: C.cream }}>کاکائو</span>
          <MonoLbl size={20} color={C.creamDim}>
            USD / TON · 12 MONTHS
          </MonoLbl>
        </div>
        <div style={{ position: "absolute", left: 30, top: 24, opacity: easeOut(ramp(t, done - 0.1, done + 0.2)) }}>
          <BigNum size={64}>$11.6K</BigNum>
        </div>
        <div style={{ position: "absolute", left: 0, top: 130 }}>
          <LineChart t={t} a={SC.priceDraw} len={0.9} data={PRICE} lo={0} hi={13} w={940} h={470} grid={[4, 8, 12]} gridLabel={(v) => `$${v}K`} />
        </div>
        <div dir="rtl" style={{ position: "absolute", left: 40, right: 40, top: 616, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: easeOut(ramp(t, SC.triple - 0.1, SC.triple + 0.2)) }}>
          <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 40, color: C.creamDim }}>نسبت به یک سال پیش</span>
          <BigNum size={72} color={C.accent} style={{ transform: `scale(${1 + 0.12 * kick(t, SC.triple, 0.4)})` }}>
            ×2.8
          </BigNum>
        </div>
      </Glass>
      <Src y={1490} latin="SAMPLE DATA · SHAPE ONLY" fa="داده‌ی نمونه برای دمو" o={easeOut(cardK)} />
    </div>
  );
};

// ─── 03 · the source: ۶۰٪ lands on «درصد», then the map on «دو کشور»; each country lights on its name ──────
const BBOX: [number, number, number, number] = [-13.5, 2.0, 5.5, 13.5];
const MAP_W = 1080, MAP_H = 900, MAP_Y = 600;
const CI: LL = [-5.55, 7.55];
const GH: LL = [-1.03, 7.95];
const Source: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.source || t >= SC.dots) return null;
  const toMap = easeOut(ramp(t, SC.map - 0.15, SC.map + 0.2));
  const out = SC.dots - 0.2;
  const [cx, cy] = mapXY(BBOX, MAP_W, MAP_H, CI);
  const [gx, gy] = mapXY(BBOX, MAP_W, MAP_H, GH);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(t, out, out + 0.2) }}>
      {t < SC.map + 0.25 && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - toMap }}>
          <HeroNumber t={t} a={SC.sixty - 0.1} hit={SC.pct} from={40} to={60} pre="حدودِ" post="کاکائوی دنیا" y={520} />
        </div>
      )}
      {toMap > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: toMap }}>
          <MapBox y={MAP_Y} h={MAP_H}>
            <NewsMap
              t={t}
              bbox={BBOX}
              w={MAP_W}
              h={MAP_H}
              zoom={1 + 0.06 * ramp(t, SC.map, SC.dots)}
              origin={[-3.3, 7.6]}
              lit={[
                { id: "384", k: ramp(t, SC.ci - 0.1, SC.ci + 0.3) },
                { id: "288", k: ramp(t, SC.gh - 0.1, SC.gh + 0.3) },
              ]}
              labels={[
                { ll: [-9.6, 6.4], fa: "لیبریا", size: 28 },
                { ll: [-10.6, 10.6], fa: "گینه", size: 28 },
                { ll: [-6.2, 12.6], fa: "مالی", size: 30 },
                { ll: [-1.6, 12.4], fa: "بورکینافاسو", size: 28 },
                { ll: [-3.0, 3.6], fa: "خلیجِ گینه", size: 30, o: 0.9 },
              ]}
              pins={[
                { ll: CI, at: SC.ci, fa: "ساحل عاج", mono: "CÔTE D'IVOIRE", dx: -20, dy: -96 },
                { ll: GH, at: SC.gh, fa: "غنا", mono: "GHANA", dx: 40, dy: -96 },
              ]}
            />
          </MapBox>
          <Head t={t} t0={SC.map} y={340} size={118} lineAt={[SC.map + 0.02]} lines={[["فقط", "از", { w: "دو کشور", chip: SC.map }]]} />
          <ChipLabel k={ramp(t, SC.gh + 0.1, SC.gh + 0.4)} size={38} style={{ left: (cx + gx) / 2 - 230, top: MAP_Y + Math.max(cy, gy) + 92 }}>
            حدودِ ۶۰٪ کاکائوی جهان
          </ChipLabel>
          <div style={{ position: "absolute", left: 90, top: 1560 }}>
            <MonoLbl size={20} color={C.creamDim}>
              MAP · NATURAL EARTH · PUBLIC DOMAIN
            </MonoLbl>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 04 · the share as dots: 100 beans, 60 light up one by one on «شصت» ───────────────────────────────────
const Dots: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.dots || t >= SC.three) return null;
  const inK = easeOut(ramp(t, SC.dots, SC.dots + 0.3));
  const out = 1 - ramp(t, SC.three - 0.18, SC.three);
  const lab = easeOut(ramp(t, SC.dotsLit + 0.5, SC.dotsLit + 0.85));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: inK * out }}>
      <Head t={t} t0={SC.dots} y={340} size={96} lineAt={[SC.dots + 0.02, SC.dotsLit - 0.08]} lines={[["از", "هر", "۱۰۰", "دونه‌ی", "کاکائو،"], [{ w: "۶۰ تاش", chip: SC.dotsLit }, "از", "همین‌جاست."]]} />
      <Glass x={170} y={780} w={740} h={720} k={ramp(t, SC.dots + 0.05, SC.dots + 0.4)} />
      <DotGrid t={t} a={SC.dots + 0.1} lit={60} litAt={SC.dotsLit} x={220} y={820} cell={64} r={8} />
      <div dir="rtl" style={{ position: "absolute", left: 170, width: 740, top: 1530, display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: lab }}>
        <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 44, color: C.cream }}>
          ساحل عاج و غنا: <span style={{ color: C.accent }}>۶۰</span>
        </span>
        <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 36, color: C.creamDim }}>بقیه‌ی دنیا: ۴۰</span>
      </div>
    </div>
  );
};

// ─── 05 · three things at once: the hit, then each cause is a row that lands on its own words ──────────────
const CAUSES: [number, string, string][] = [
  [SC.c1, "هوای گرم و خشک", "محصولِ کمتر از هر درخت"],
  [SC.c2, "بیماریِ درخت‌ها", "ویروسی که درخت رو خشک می‌کنه"],
  [SC.c3, "درخت‌های پیر", "باغ‌هایی که دیگه بازده ندارن"],
];
const Causes: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.three || t >= SC.question) return null;
  const out = SC.question - 0.15;
  const listK = ramp(t, SC.c1 - 0.3, SC.c1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(t, out, out + 0.15) }}>
      <Head t={t} t0={SC.three} y={340} size={120} lineAt={[SC.three + 0.02, SC.threeHit - 0.08]} lines={[["پشتِ", "سرِ", "هم،"], [{ w: "سه اتفاق", chip: SC.threeHit }]]} />
      {listK > 0 && (
        <Glass x={90} y={880} w={900} h={490} k={listK}>
          {CAUSES.map(([a, title, sub], i) => (
            <Row key={i} t={t} at={a - 0.05} mark={a + 0.35} y={14 + i * 156} h={150} size={54} title={title} sub={sub} kind="warn" />
          ))}
        </Glass>
      )}
      <Glitch t={t} at={SC.threeHit} len={0.24} />
    </div>
  );
};

// ─── 06 · the real question: the accent flood grows from the centre on «این…» ─────────────────────────────
const Question: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.question || t >= SC.years + 0.3) return null;
  return (
    <>
      {t < SC.flood + 0.25 && <Head t={t} t0={SC.question} y={340} size={120} lineAt={[SC.question + 0.02, at(6, "سؤال") - 0.05]} lines={[["حالا"], [{ w: "سؤالِ اصلی", chip: at(6, "سؤال"), tail: ":" }]]} />}
      <Flood t={t} a={SC.flood} b={SC.years}>
        <Head t={t} t0={SC.flood} on="light" y={640} size={170} align="center" x={40} w={1000} lineAt={[SC.flood - 0.02, at(6, "کِی") - 0.05]} lines={[["این", "گرونی"], [{ w: "کِی", chip: at(6, "کِی") }, "تموم", "می‌شه؟"]]} />
        <div style={{ position: "absolute", left: 0, width: 1080, top: 1120, display: "flex", justifyContent: "center", opacity: easeOut(ramp(t, SC.flood + 0.4, SC.flood + 0.8)) }}>
          <MonoLbl size={21} color={INK.dim} weight={600}>
            THE REAL QUESTION
          </MonoLbl>
        </div>
      </Flood>
    </>
  );
};

// ─── 07 · three to five years: three phase cards and a running bar; «میوه» is the hot one ─────────────────
const Years: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.years || t >= SC.curve) return null;
  const out = SC.curve - 0.2;
  const five = at(7, "پنج");
  const push = 1 + 0.035 * ramp(t, SC.years, SC.curve);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(t, out, out + 0.2) }}>
      <Head t={t} t0={SC.years} y={340} size={110} lineAt={[SC.years + 0.02, SC.yearsHit - 0.05]} lines={[["درختِ", "تازه‌ی", "کاکائو"], [{ w: "۳ تا ۵ سال", chip: SC.yearsHit }, "طول", "می‌کشه"]]} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "540px 1150px" }}>
        <PhaseCard t={t} x={710} y={1000} w={280} top="سالِ ۰" big="کاشت" k={ramp(t, SC.years + 0.15, SC.years + 0.5)} hot={0} />
        <PhaseCard t={t} x={400} y={1000} w={280} top="سالِ ۱ تا ۲" big="رشد" k={ramp(t, SC.years + 0.3, SC.years + 0.65)} hot={0} />
        <PhaseCard t={t} x={90} y={1000} w={280} top="سالِ ۳ تا ۵" big="میوه" note="اولین محصول" k={ramp(t, SC.years + 0.45, SC.years + 0.8)} hot={easeOut(ramp(t, SC.fruit, SC.fruit + 0.3))} />
        <PhaseBar
          t={t}
          y={1332}
          segs={[
            [710, 280, SC.years + 0.2, SC.yearsHit],
            [400, 280, SC.yearsHit, five + 0.2],
            [90, 280, five + 0.2, SC.fruit],
          ]}
        />
      </div>
      <Src y={1420} latin="SAMPLE · A TYPICAL COCOA TREE" fa="معمولِ درختِ کاکائو" o={easeOut(ramp(t, SC.yearsHit, SC.yearsHit + 0.4))} />
    </div>
  );
};

// ─── 08 · slowly, not overnight: a schematic curve (labelled a scenario) ──────────────────────────────────
const Slowly: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.curve || t >= SC.verdict) return null;
  const out = SC.verdict - 0.2;
  const k = io(ramp(t, SC.curve + 0.2, E(8) + 0.2));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(t, out, out + 0.2) }}>
      <Head t={t} t0={SC.curve} y={340} size={110} lineAt={[SC.curve + 0.02, SC.overnight - 0.3]} lines={[["قیمت‌ها", { w: "آروم‌آروم", chip: SC.slow }], ["پایین", "میان،", { w: "نه یک‌شبه", slam: SC.overnight, tail: "." }]]} />
      <Glass x={90} y={900} w={900} h={520} k={ramp(t, SC.curve + 0.1, SC.curve + 0.45)}>
        <Curve k={k} w={900} h={520} f={(x) => 0.32 + 0.68 * Math.exp(-x * 1.7)} ticks={[[0, "امروز"], [0.5, "سالِ بعد"], [1, "دو سالِ بعد"]]} yLabel="قیمت" endLabel="آروم‌آروم" />
      </Glass>
      <Src y={1450} latin="SCENARIO · NOT A FORECAST" fa="سناریو، نه پیش‌بینی" o={easeOut(ramp(t, SC.curve + 0.6, SC.curve + 1.0))} />
    </div>
  );
};

// ─── 09 · the verdict: rows that stamp check / cross on their words ───────────────────────────────────────
const Verdict: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.verdict || t >= SC.end + 0.4) return null;
  const push = 1 + 0.04 * ramp(t, SC.v1 - 0.4, SC.end);
  return (
    <>
      <Head t={t} t0={SC.verdict} y={340} size={120} lineAt={[SC.verdict + 0.02]} lines={[[{ w: "خلاصه", chip: SC.verdict + 0.05 }, "اینکه:"]]} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "540px 1000px" }}>
        <Glass x={80} y={760} w={920} h={380} k={ramp(t, SC.v1 - 0.22, SC.v1 + 0.05)}>
          <Row t={t} at={SC.v1} mark={SC.v1m} y={22} h={160} size={52} title="گرون‌تر شده؟ آره." sub="نزدیکِ سه برابر، توی یک سال" kind="check" />
          <Row t={t} at={SC.v2} mark={SC.v2m} y={198} h={160} size={52} title="برای همیشه؟ نه." sub="قیمت‌ها آروم‌آروم برمی‌گردن" kind="cross" />
        </Glass>
        <div dir="rtl" style={{ position: "absolute", left: 0, width: 1080, top: 1190, textAlign: "center", opacity: easeOut(ramp(t, SC.v2m, SC.v2m + 0.4)) }}>
          <span style={{ fontFamily: FA, fontWeight: 800, fontSize: 36, color: C.creamDim, textShadow: "0 2px 14px rgba(0,0,0,.7)" }}>قیمتِ دقیقِ آینده رو کسی نمی‌دونه.</span>
        </div>
      </div>
    </>
  );
};

// ─── 10 · the end card: the accent rises from the bottom, the verdict in ink, the comment prompt, your brand ─
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < SC.end - 0.2) return null;
  const E0 = SC.end;
  const pulses = [TL.VOICE_END + 0.4, TL.VOICE_END + 1.1, TL.VOICE_END + 1.8];
  const drift = ramp(t, E0 + 0.3, E0 + 4);
  return (
    <Flood t={t} a={E0} mode="rise">
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.05 * drift}) translateY(${-10 * drift}px)`, transformOrigin: "540px 900px" }}>
        <Head t={t} t0={E0 + 0.12} on="light" y={400} size={176} align="center" x={65} w={950} lineAt={[E0 + 0.14, E0 + 0.32]} lines={[["گرون‌تر،", "آره."], [{ w: "همیشگی", chip: E0 + 0.5, tail: "،", pulse: pulses }, "نه."]]} />
        <div dir="rtl" style={{ position: "absolute", left: 0, width: 1080, top: 860, textAlign: "center", opacity: easeOut(ramp(t, SC.comment - 0.3, SC.comment + 0.05)), transform: `translateY(${(1 - easeOut(ramp(t, SC.comment - 0.3, SC.comment + 0.05))) * 20}px)` }}>
          <span style={{ fontFamily: FA, fontWeight: 900, fontSize: 60, color: C.ink }}>تو هم حسش کردی؟ تو کامنت بنویس.</span>
        </div>
        <div style={{ position: "absolute", left: 0, width: 1080, top: 1090, display: "flex", justifyContent: "center", opacity: easeOut(ramp(t, E0 + 0.9, E0 + 1.25)) }}>
          <BrandMark size={110} color={C.ink} />
        </div>
        <div style={{ position: "absolute", left: 0, width: 1080, top: 1300, display: "flex", justifyContent: "center", opacity: easeOut(ramp(t, E0 + 1.1, E0 + 1.45)), transform: `scale(${1 + 0.04 * kick(t, E0 + 1.6, 0.5)})` }}>
          <Btn v="ink" size={36} arrow shine={ramp(t, E0 + 1.5, E0 + 2.4)}>
            دنبال کن
          </Btn>
        </div>
      </div>
    </Flood>
  );
};

// ─── the film ──────────────────────────────────────────────────────────────────────────────────────────────
export const MarketFileAt: React.FC<{ t: number }> = ({ t }) => {
  const ok = useFileFonts();
  if (!ok) return <AbsoluteFill style={{ background: C.ink }} />;
  const [sx, sy] = shake(t);
  const light = floodOn(t, FLOODS);
  const chrome = t < SC.end + 0.25;
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
        <Bed t={t} shots={SHOTS} media={MEDIA} />
        <Hook t={t} />
        <Price t={t} />
        <Source t={t} />
        <Dots t={t} />
        <Causes t={t} />
        <Question t={t} />
        <Years t={t} />
        <Slowly t={t} />
        <Verdict t={t} />
        <EndCard t={t} />
      </AbsoluteFill>
      {chrome && (
        <>
          <div style={{ position: "absolute", left: 90, top: 244 }}>
            <BrandTile size={64} on={light ? "light" : "dark"} />
          </div>
          <Brow t={t} items={BROWS} on={light ? "light" : "dark"} />
        </>
      )}
      <Hud tl="YOUR BRAND — FILE 01" tr="COCOA · MARKET FILE" color={light ? INK.line : C.line2} labelColor={light ? INK.mute : C.creamMute} />
      <Grain opacity={0.08} seed={1 + (Math.floor(t * 12) % 6)} />
    </AbsoluteFill>
  );
};

export type DemoProps = { times?: number[] };
/** the demo; with `times` (Look) frame i shows film time times[i] */
export const MarketFileDemo: React.FC<DemoProps> = ({ times }) => {
  const f = useCurrentFrame();
  const t = times ? (times[f] ?? 0) : f / FPS;
  return <MarketFileAt t={clamp(t, 0, DUR)} />;
};
