// Inside App · one command round inside the app, from its local clock l (seconds after the segment start, see PH):
// type "/cmd" on the keyboard → send → the message lands top right → "Editing with …" → result card develops through
// a dot screen → the card blows up to full screen on the hit → (the film hard-cuts to the next segment).
import React from "react";
import { C, clamp, ease, F, fullOf, mix, PH, s, TAU0, u, type Attach, type Seg } from "./theme";
import type { FxProps } from "./types";
import { Keyboard, KB_TOP } from "./keyboard";
import { AttachBox, Composer, composerGeo, InputBar, lineW, Pill, Status, Suggest, TopBar } from "./phone";

export const textW = lineW;

/** the typed text and the key held at time l */
export const typing = (cmd: string, typed: number, l: number) => {
  // "/" at PH.slash, then one letter every PH.key, then the autocomplete fills the rest at PH.auto
  if (l < PH.slash) return { text: "", press: null as string | null, word: "" };
  if (l >= PH.auto) return { text: cmd, press: null, word: cmd.slice(1) };
  const k = Math.min(typed, Math.floor((l - PH.slash) / PH.key));
  const text = cmd.slice(0, 1 + k);
  const tk = PH.slash + k * PH.key;
  const press = k >= 1 && l - tk < 0.085 ? cmd[k] : null;
  return { text, press, word: cmd.slice(1, 1 + k) };
};

/** bubble geometry (reference px): attachment box above a pill whose top is at PILL_Y, right edge 693 */
export const PILL_Y = 190;
export const bubbleAtt = (a: Attach) => {
  const w = a.kind === "pasted" ? 123 : 199;
  return { x: 693 - w, y: PILL_Y - 22 - w, w };
};
const CARD = { x: 27, y: 300, w: 466, h: 828 };

/** the result card: placeholder → dot-screen develop → effect; `ex` (0..1) blows it up to full screen */
export const ResultCard: React.FC<{ l: number; Fx?: React.FC<FxProps>; t0?: number }> = ({ l, Fx, t0 = PH.card }) => {
  const tau = l - t0;
  if (tau < 0) return null;
  const ex = ease.inOut(u(l, PH.expand, PH.full - PH.expand));
  const x = mix(s(CARD.x), 0, ex), y = mix(s(CARD.y), 0, ex), w = mix(s(CARD.w), 1080, ex), h = mix(s(CARD.h), 1920, ex);
  const k = w / 1080;
  const appear = ease.out(u(tau, 0, 0.07));
  const d = clamp((tau - (PH.dither - t0)) / (PH.sharp - PH.dither)); // develop 0..1
  const P = 9; // dot pitch (output px, constant on screen)
  const R = mix(0.7, P * 0.76, Math.pow(d, 1.35));
  const dotMask = `radial-gradient(circle at ${P / 2}px ${P / 2}px, #000 ${R}px, transparent ${R + 0.9}px)`;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: mix(s(22), 0, ex), overflow: "hidden", background: C.card, opacity: appear, transform: `scale(${mix(0.985, 1, appear)})` }}>
      {/* the empty card breathes a faint dot screen while the assistant works */}
      {d < 1 ? (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at ${P / 2}px ${P / 2}px, rgba(255,255,255,${0.035 + 0.025 * Math.sin(tau * 9)}) 1.1px, transparent 1.9px)`, backgroundSize: `${P}px ${P}px` }} />
      ) : null}
      {Fx && d > 0 ? (
        <div
          style={{
            position: "absolute", inset: 0,
            WebkitMaskImage: d < 1 ? dotMask : undefined, maskImage: d < 1 ? dotMask : undefined,
            WebkitMaskSize: d < 1 ? `${P}px ${P}px` : undefined, maskSize: d < 1 ? `${P}px ${P}px` : undefined,
            opacity: mix(0.4, 1, Math.min(1, d * 1.6)),
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${k})`, transformOrigin: "0 0", filter: d < 1 ? `blur(${(1 - d) * 7}px) saturate(${mix(0.6, 1, d)})` : undefined }}>
            <Fx tau={tau} full={fullOf(tau)} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const SegmentScreen: React.FC<{ seg: Seg; l: number; Fx?: React.FC<FxProps> }> = ({ seg, l, Fx }) => {
  const cmd = "/" + seg.id;
  // full screen: only the effect
  if (l >= PH.full) {
    return Fx ? <Fx tau={l - TAU0} full={1} /> : null;
  }
  const ty = typing(cmd, seg.typed, l);
  const g = composerGeo(seg.attach);
  const sendK = ease.inOut(u(l, PH.send, PH.sendDur - 0.02)); // keyboard + composer going down
  const compA = 1 - ease.out(u(l, PH.send, 0.07)); // the composer fades as it drops
  const sent = l >= PH.send;
  const fly = ease.inOut(u(l, PH.send - 0.01, PH.sendDur + 0.05)); // the message flying to the top right
  const landed = l >= PH.send + PH.sendDur;
  const suggestA = l < PH.slash ? 0 : l < PH.auto ? ease.out(u(l, PH.slash, 0.07)) : 1 - u(l, PH.auto, 0.05);
  const kbH = s(1280 - KB_TOP) + 40;

  // the flying message: attachment box + text, from the composer to the bubble
  const att0 = { x: 40, y: g.top + 22, w: seg.attach.kind === "pasted" ? 123 : 146 };
  const att1 = bubbleAtt(seg.attach);
  const ax = mix(att0.x, att1.x, fly), ay = mix(att0.y, att1.y, fly), aw = mix(att0.w, att1.w, fly);
  const tw = textW(cmd, s(28.5));
  const tx0 = s(42), ty0 = s(g.textY - 19);
  const tx1 = s(693 - 23) - tw, ty1 = s(PILL_Y + 8);

  // status line + spark
  const st = l - PH.status;
  const sparkK = st < 0 ? 0 : ease.outBack(clamp(st / 0.12));
  const statusText = `${seg.verb} with ${seg.id}...`;
  const nChars = st < 0 ? 0 : (st / 0.15) * statusText.length;
  const working = l < PH.expand;
  const spin = st < 0 ? 0 : st * (working ? 55 : 20); // the glyph turns slowly while the assistant works
  const shimmer = l > PH.status + 0.17 ? ((l - PH.status - 0.17) % 0.9) / 0.9 : -1;

  return (
    <>
      <TopBar compose={1 - ease.out(u(l, PH.send, 0.1))} />
      {/* compose phase */}
      {!landed ? (
        <>
          <Suggest cmd={cmd} desc={seg.desc} bottom={g.top - 15} a={suggestA * (1 - sendK)} />
          <div style={{ opacity: compA }}>
            <Composer attach={seg.attach} text={ty.text} cursor={!sent && (l < PH.auto + 0.04 || Math.floor((l - PH.auto) / 0.45) % 2 === 0)} sendDown={clamp(1 - Math.abs(l - (PH.send - 0.02)) / 0.05)} hideContent={sent ? 1 : 0} y={sendK * s(1162 - g.top) * 0.6} />
          </div>
          <div style={{ opacity: 1 - 0.7 * sendK }}>
            <Keyboard y={sendK * kbH} press={sent ? null : ty.press} word={sent ? "" : ty.word} />
          </div>
        </>
      ) : null}
      {/* the bottom input bar fades in as the composer goes */}
      {sent ? <InputBar a={ease.out(u(l, PH.send + 0.04, 0.1))} y={(1 - ease.out(u(l, PH.send + 0.04, 0.1))) * s(14)} /> : null}
      {/* the message: flying, then the bubble */}
      {sent ? (
        <>
          <div style={{ position: "absolute", left: s(ax), top: s(ay) }}>
            <AttachBox a={seg.attach} w={s(aw)} h={s(aw)} play />
          </div>
          {fly < 1 ? (
            <div style={{ position: "absolute", left: mix(tx0, tx1, fly), top: mix(ty0, ty1, fly), height: s(38), display: "flex", alignItems: "center", fontFamily: F.ui, fontSize: mix(s(28), s(28.5), fly), color: fly < 0.6 ? C.text : C.pillText, whiteSpace: "pre", opacity: 1 - u(fly, 0.75, 0.25) }}>
              {cmd}
            </div>
          ) : null}
          <Pill cmd={cmd} y={PILL_Y} a={u(fly, 0.55, 0.45)} />
        </>
      ) : null}
      {/* the assistant */}
      <Status text={statusText} n={nChars} spark={sparkK} spin={spin} shimmer={shimmer} />
      <ResultCard l={l} Fx={Fx} />
    </>
  );
};
