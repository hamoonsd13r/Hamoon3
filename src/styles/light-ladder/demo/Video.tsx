// Light Ladder · demo film. Copy this file + script.ts to src/vNN/, change the imports to ../styles/light-ladder/lib/…,
// then swap the lines, the level names and the beats (all cued on words).
// One light point is the hero: it lands on the first step, sits in the head, climbs the ruler; the upper steps stay ghosts.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useLadderFonts } from "../lib/fonts";
import { Backdrop, DotHead, Medallion, Orb, Stairs, Stamp, hop, stepTop, type Island, type StairGeo, type Step } from "../lib/stage";
import { C, FA, FPS, TimeCtx, back, easeOut, io, kick, lerp, lightA, ramp, win } from "../lib/theme";
import { Caps, LevelHead, Marker, Meter, Pill, Poll, Ruler, Tiles } from "../lib/ui";
import { CAP_HIDE, CHUNKS, K, SC, TL, WORDS, WORDS_BG } from "./script";

export type DemoProps = { times?: number[] };
const { S, E } = TL;

// ── the stairs (RTL: level 1 on the right) ────────────────────────────────────────────────────────────────────
const G: StairGeo = { floorY: 1250, x: [700, 445, 190], w: 220, d: [46, -32] };
const HMAX = [240, 420, 600];
const steps = (t: number, rise: number, ghost: [number, number], doubt: number): Step[] => [
  { h: HMAX[0] * rise, lit: ramp(t, K.narrow - 0.05, K.narrow + 0.3), name: "ANI", num: "LEVEL 01", fa: "محدود" },
  { h: HMAX[1] * rise, lit: 0, ghost: ghost[0], doubt, name: "AGI", num: "LEVEL 02", fa: "عمومی" },
  { h: HMAX[2] * rise, lit: 0, ghost: ghost[1], doubt, name: "ASI", num: "LEVEL 03", fa: "ابرهوش" },
];

const Hook: React.FC<{ t: number; k: number }> = ({ t, k }) => (
  <div style={{ position: "absolute", inset: 0, opacity: k }}>
    <DotHead t={t} x={220} y={640} s={1} k={1} islands={[{ x: 470, y: 300, r: 70, k: 0.5 + 0.5 * Math.sin(t * 2) ** 2 }]} dim={0.8} />
    <Orb x={760 + 14 * Math.sin(t * 1.3)} y={600 + 10 * Math.sin(t * 1.7)} r={16} pulse={kick(t, K.know, 0.5)} />
    <div dir="rtl" style={{ position: "absolute", left: 60, right: 60, top: 250, textAlign: "center", fontFamily: FA, fontWeight: 900, fontSize: 84, lineHeight: 1.3, color: C.fg, textShadow: "0 6px 40px rgba(0,0,0,.7)", transform: `scale(${1 + 0.04 * kick(t, K.know, 0.5)})` }}>
      فکر می‌کنی
      <br />
      <span style={{ color: C.lightHot, textShadow: `0 0 30px ${lightA(0.5)}` }}>هوش مصنوعی</span> رو
      <br />
      خوب می‌شناسی؟
    </div>
  </div>
);

const Ani: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const rise = io(ramp(t, S(2) - 0.1, S(2) + 0.5));
  const st = steps(t, rise, [0, 0], 0);
  const top0 = stepTop(G, st, 0);
  const land = ramp(t, K.narrow - 0.25, K.narrow + 0.05);
  const orb = land < 1 ? hop({ x: 540, y: 520 }, { x: top0.x, y: top0.y - 26 }, land, 220) : { x: top0.x, y: top0.y - 26 };
  const CHIPS = ["ترجمه", "عکس", "متن", "کد", "شطرنج"];
  const pos: [number, number][] = [[880, 560], [660, 470], [900, 760], [520, 640], [760, 900]];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      <LevelHead k={ramp(t, K.first - 0.1, K.first + 0.3)} name="ANI" fa="هوش مصنوعی محدود" en="ARTIFICIAL NARROW INTELLIGENCE" y={170} out={ramp(t, K.tools - 0.3, K.tools)} />
      <Stairs g={G} steps={st} t={t} />
      <Orb x={orb.x} y={orb.y} r={18} pulse={kick(t, K.narrow, 0.5) + kick(t, K.great, 0.5)} />
      {CHIPS.map((c, i) => (
        <Pill key={c} k={ramp(t, K.tools + i * 0.12, K.tools + 0.3 + i * 0.12)} fa={c} size={32} style={{ right: 1080 - pos[i][0], top: pos[i][1] - 200 }} />
      ))}
      <Marker k={ramp(t, K.here - 0.05, K.here + 0.35)} x={top0.x} y={top0.y - 60} label="ما اینجاییم" />
    </div>
  );
};

const ISLANDS = (t: number): Island[] => [
  { x: 470, y: 300, r: 70, k: 1 },
  { x: 300, y: 200, r: 60, k: ramp(t, S(4), S(4) + 0.3) },
  { x: 220, y: 420, r: 60, k: ramp(t, S(4) + 0.2, S(4) + 0.5) },
];
const Agi: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const fill = io(ramp(t, K.think - 0.1, K.learn + 0.6));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      <LevelHead k={ramp(t, K.second - 0.1, K.second + 0.3)} name="AGI" fa="هوش مصنوعی عمومی" en="ARTIFICIAL GENERAL INTELLIGENCE" y={150} size={130} />
      <DotHead t={t} x={540 - 320 * 0.92} y={520} s={0.92} k={1} islands={ISLANDS(t)} fill={fill} />
      <Orb x={540 + 100} y={520 + 240} r={14} k={1 - fill} />
      <Meter k={ramp(t, K.general, K.general + 0.3)} p={0.18 + 0.82 * fill} label="هوش عمومی انسان" start="ANI" end="سطح انسان" y={1250} />
    </div>
  );
};

const Asi: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const top = 430, bottom = 1300;
  const Y = (f: number) => bottom - f * (bottom - top);
  const climb = io(ramp(t, K.sup, K.people + 0.4));
  const f = lerp(0.12, 0.92, climb);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      <LevelHead k={ramp(t, K.third - 0.1, K.third + 0.3)} name="ASI" fa="ابرهوش مصنوعی" y={120} size={120} />
      <Ruler k={ramp(t, S(5), S(5) + 0.5)} marks={[[0.12, "انسان معمولی"], [0.42, "نابغه‌ها"], [0.92, "ابرهوش (فرضی)"]]} top={top} bottom={bottom} />
      <Medallion x={330} y={Y(0.42) + 90} size={130} k={ramp(t, K.smarter - 0.1, K.smarter + 0.3)} fa="اینشتین" en="EINSTEIN" initials="AE" />
      <Medallion x={680} y={Y(0.42) + 90} size={130} k={ramp(t, K.smarter + 0.1, K.smarter + 0.5)} fa="نیوتن" en="NEWTON" initials="IN" />
      <Orb x={900} y={Y(f)} r={18} pulse={kick(t, K.people, 0.5)} />
      <div style={{ position: "absolute", left: 900 - 2, top: Y(f), width: 4, height: Y(0.12) - Y(f), background: `linear-gradient(180deg, ${lightA(0.8)}, ${lightA(0)})` }} />
    </div>
  );
};

const Ghost: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const g = ramp(t, K.yet - 0.2, K.yet + 0.4);
  const st = steps(t, 1, [g, g], ramp(t, K.yet, K.yet + 0.4));
  const top0 = stepTop(G, st, 0);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      <Stairs g={G} steps={st} t={t} />
      <Orb x={top0.x} y={top0.y - 26} r={18} />
      <div style={{ position: "absolute", left: 200, top: 520, transform: "translateX(0)" }}>
        <Stamp k={ramp(t, K.built - 0.05, K.built + 0.25)} fa="هنوز ساخته نشده" en="NOT YET" size={52} rot={-7} />
      </div>
    </div>
  );
};

const Cta: React.FC<{ t: number; k: number }> = ({ t, k }) => (
  <div style={{ position: "absolute", inset: 0, opacity: k }}>
    <Poll t={t} k={ramp(t, S(7), S(7) + 0.4)} q="کِی به AGI می‌رسیم؟" options={["۵ سال دیگه", "۲۰ سال دیگه", "هیچ‌وقت"]} pick={0} pickAt={K.write + 0.1} y={460} />
    <Orb x={540} y={360} r={14} pulse={kick(t, K.when, 0.5)} />
  </div>
);

export const LightLadderAt: React.FC<{ t: number }> = ({ t }) => {
  const word = [...WORDS_BG].reverse().find(([a]) => t >= a)?.[1];
  const tilesK = win(t, SC.tiles[0], SC.tiles[1]);
  const lands = [K.ani, K.agi, K.asi];
  const hot = t >= K.asi ? -1 : t >= K.agi ? 1 : t >= K.ani ? 0 : -1;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Backdrop t={t} word={word} glow={0.8 + 0.4 * kick(t, K.narrow, 0.6)} floor={t >= SC.ani[0] && t < SC.ani[1] ? 1 : t >= SC.ghost[0] && t < SC.ghost[1] ? 1 : 0.4} />
      {t < SC.hook[1] && <Hook t={t} k={t <= 0 ? 1 : 1 - ramp(t, SC.hook[1] - 0.3, SC.hook[1])} />}
      {tilesK > 0 && <Tiles t={t} k={tilesK} letters={["N", "G", "S"]} times={lands} labels={["محدود", "عمومی", "ابرهوش"]} y={640} hot={hot} />}
      {t >= SC.ani[0] && t < SC.ani[1] && <Ani t={t} k={win(t, SC.ani[0], SC.ani[1])} />}
      {t >= SC.agi[0] && t < SC.agi[1] && <Agi t={t} k={win(t, SC.agi[0], SC.agi[1])} />}
      {t >= SC.asi[0] && t < SC.asi[1] && <Asi t={t} k={win(t, SC.asi[0], SC.asi[1])} />}
      {t >= SC.ghost[0] && t < SC.ghost[1] && <Ghost t={t} k={win(t, SC.ghost[0], SC.ghost[1])} />}
      {t >= SC.cta[0] && <Cta t={t} k={ramp(t, SC.cta[0], SC.cta[0] + 0.3)} />}
      <Caps t={t} words={WORDS} chunks={CHUNKS} hide={CAP_HIDE} />
    </AbsoluteFill>
  );
};

export const LightLadderDemo: React.FC<DemoProps> = ({ times }) => {
  const frame = useCurrentFrame();
  const ok = useLadderFonts();
  const t = times ? times[Math.min(frame, times.length - 1)] : frame / FPS;
  if (!ok) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <TimeCtx.Provider value={{ t, frame }}>
      <LightLadderAt t={t} />
    </TimeCtx.Provider>
  );
};
void back;
void easeOut;
void E;
