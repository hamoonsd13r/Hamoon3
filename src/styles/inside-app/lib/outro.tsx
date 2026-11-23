// Inside App · the outro: a fresh chat (greeting) → one more slash command → the assistant answers with the call to
// action → a card develops with a grid of every effect (each tile plays the effect live, row by row) → it blows up to
// full screen on a hit → on the next hit the title becomes the CTA and holds to the end. l = film time − outro start.
import React from "react";
import { APP, BEAT, C, F, PH, clamp, ease, hitPulse, mix, s, u } from "./theme";
import type { FxDef, FxProps } from "./types";
import { Keyboard } from "./keyboard";
import { Composer, composerGeo, InputBar, Pill, Status, Suggest, TopBar } from "./phone";
import { ResultCard, textW, typing } from "./segment";
import { Glyph } from "./icons";

export type OutroText = {
  cmd: string; // "/edits"
  desc: string; // the suggestion line
  reply: string; // the assistant's Persian answer (typed RTL)
  title: string; // grid page title
  sub: string; // small line under it
  cta: string; // the CTA title («کامنت کن «ادیت»»)
  ctaPill: string; // the CTA pill
};
export type Tile = { fx: FxDef; at?: number };

/** the grid page as an effect (1080×1920): each tile plays its effect (looped), titles on top */
export const makeGridPage = (tiles: Tile[], txt: OutroText, cols = 3): React.FC<FxProps> => ({ tau }) => {
  const P = BEAT.P;
  const ctaTau = 3 * P - PH.card;
  const rows = Math.ceil(tiles.length / cols);
  const gap = 24, top = 430, side = 70;
  const tw = (1080 - side * 2 - gap * (cols - 1)) / cols, th = tw * (16 / 9);
  const oldOut = ease.in(u(tau, ctaTau - 0.17, 0.13));
  const cta = ease.out(u(tau, ctaTau, 0.14));
  const pillIn = ease.out(u(tau, ctaTau + P / 2 - 0.05, 0.14));
  const kick = 1 + 0.025 * Math.exp(-Math.max(0, tau - ctaTau) * 7) * (tau >= ctaTau ? 1 : 0);
  const push = 1 + 0.035 * clamp((tau - 0.95) / 4.8);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.card, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 55%" }}>
        {tiles.map((tl, i) => {
          const x = side + (i % cols) * (tw + gap), y = top + Math.floor(i / cols) * (th + gap);
          const a = 0.12 + Math.floor(i / cols) * 0.13 + (i % cols) * 0.035;
          const d = clamp((tau - a) / 0.22);
          const loop = tl.fx.loop ?? 3;
          const T = (((tau + (tl.at ?? 0)) % loop) + loop) % loop;
          const Comp = tl.fx.Comp;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: tw, height: th, borderRadius: 18, overflow: "hidden", background: C.panel }}>
              {d > 0 ? (
                <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${tw / 1080})`, transformOrigin: "0 0", opacity: d }}>
                  <Comp tau={T} full={1} tile />
                </div>
              ) : null}
              {d < 1 ? <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 4.5px 4.5px, rgba(255,255,255,${0.05 + 0.25 * d}) ${mix(0.5, 6.6, d)}px, transparent ${mix(0.5, 6.6, d) + 0.9}px)`, backgroundSize: "9px 9px", opacity: 1 - d }} /> : null}
            </div>
          );
        })}
        {rows > 0 ? null : null}
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 220, textAlign: "center", opacity: 1 - oldOut, transform: `translateY(${-oldOut * 12}px)`, filter: oldOut > 0.02 ? `blur(${oldOut * 6}px)` : undefined }}>
        <div style={{ fontFamily: F.fa, fontSize: 82, color: "#FFFFFF", direction: "rtl", lineHeight: 1.25 }}>{txt.title}</div>
        <div style={{ fontFamily: F.ui, fontSize: 26, color: C.pillText, marginTop: 12, letterSpacing: 0.2 }}>{txt.sub}</div>
      </div>
      {cta > 0.001 ? (
        <div style={{ position: "absolute", left: 0, width: 1080, top: 200, textAlign: "center", opacity: cta, transform: `scale(${mix(1.06, 1, cta) * kick})`, filter: cta < 0.98 ? `blur(${(1 - cta) * 10}px)` : undefined }}>
          <div style={{ fontFamily: F.fa, fontSize: 90, color: "#FFFFFF", direction: "rtl", lineHeight: 1.25 }}>{txt.cta}</div>
          <div style={{ display: "inline-block", opacity: pillIn, transform: `translateY(${(1 - pillIn) * 14}px)`, marginTop: 14, padding: "10px 30px 13px", borderRadius: 14, background: C.send, fontFamily: F.vzB, fontSize: 37, color: "#FFFFFF", direction: "rtl" }}>{txt.ctaPill}</div>
        </div>
      ) : null}
    </div>
  );
};

export const Outro: React.FC<{ l: number; Grid: React.FC<FxProps>; txt: OutroText }> = ({ l, Grid, txt }) => {
  if (l >= PH.full) return <Grid tau={l - PH.card} full={1} />;
  const ty = typing(txt.cmd, 3, l);
  const g = composerGeo(null);
  const sendK = ease.inOut(u(l, PH.send, PH.sendDur - 0.02));
  const compA = 1 - ease.out(u(l, PH.send, 0.07));
  const sent = l >= PH.send;
  const fly = ease.inOut(u(l, PH.send - 0.01, PH.sendDur + 0.05));
  const landed = l >= PH.send + PH.sendDur;
  const suggestA = l < PH.slash ? 0 : l < PH.auto ? ease.out(u(l, PH.slash, 0.07)) : 1 - u(l, PH.auto, 0.05);
  const kbH = s(1280 - 866) + 40;
  const greet = 1 - ease.out(u(l, PH.send, 0.1));
  const PILLY = 158;
  const tw = textW(txt.cmd, s(28.5));
  const st = l - PH.status;
  const sparkK = st < 0 ? 0 : ease.outBack(clamp(st / 0.12));
  const n = st < 0 ? 0 : (st / 0.45) * txt.reply.length;
  return (
    <>
      <TopBar compose={1} />
      {greet > 0.001 ? (
        <div style={{ opacity: greet }}>
          <div style={{ position: "absolute", left: s(360 - 24), top: s(222 - 24), width: s(48), height: s(48) }}>
            <Glyph size={s(48)} spin={l * 10} breathe={1 + 0.03 * hitPulse(l)} />
          </div>
          <div style={{ position: "absolute", left: 0, width: 1080, top: s(300 - 24), textAlign: "center", fontFamily: F.ui, fontSize: s(35.5), color: "#E9EAEE", letterSpacing: s(-0.4) }}>{APP.greeting}</div>
        </div>
      ) : null}
      {!landed ? (
        <>
          <Suggest cmd={txt.cmd} desc={txt.desc} bottom={g.top - 15} a={suggestA * (1 - sendK)} />
          <div style={{ opacity: compA }}>
            <Composer attach={null} text={ty.text} cursor={!sent} sendDown={clamp(1 - Math.abs(l - (PH.send - 0.02)) / 0.05)} hideContent={sent ? 1 : 0} y={sendK * s(1162 - g.top) * 0.6} />
          </div>
          <div style={{ opacity: 1 - 0.7 * sendK }}>
            <Keyboard y={sendK * kbH} press={sent ? null : ty.press} word={sent ? "" : ty.word} />
          </div>
        </>
      ) : null}
      {sent ? <InputBar a={ease.out(u(l, PH.send + 0.04, 0.1))} /> : null}
      {sent ? (
        <>
          {fly < 1 ? (
            <div style={{ position: "absolute", left: mix(s(42), s(693 - 23) - tw, fly), top: mix(s(g.textY - 19), s(PILLY + 8), fly), height: s(38), display: "flex", alignItems: "center", fontFamily: F.ui, fontSize: s(28.5), color: C.text, whiteSpace: "pre", opacity: 1 - u(fly, 0.75, 0.25) }}>{txt.cmd}</div>
          ) : null}
          <Pill cmd={txt.cmd} y={PILLY} plain a={u(fly, 0.55, 0.45)} />
        </>
      ) : null}
      <Status text={txt.reply} n={n} spark={sparkK} spin={st * 40} shimmer={-1} white rtl />
      <ResultCard l={l} Fx={Grid} />
    </>
  );
};
