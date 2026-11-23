// 05 · Collage Art — cut and torn paper in stop-motion (12 fps): a vintage profile with flowers for hair, torn colour
// fields, tape, a newspaper scrap, ephemera (stamp, ticket, moon, an engraved eye, a butterfly that flaps on twos) and a
// ransom-note title, every piece breathing on twos.
import React from "react";
import { F, PH, PW, ease, hash, stepT, tween } from "../theme";
import { Cut, Frame, Grain, Halftone, jitter, Paper, Sub, type PosterProps } from "../kit";

// the ephemera sheet (COL-03): pieces as [sx, sy, sw, sh] in image px
const BUTTERFLY: [number, number, number, number] = [8, 8, 696, 560];
const STAMP: [number, number, number, number] = [820, 36, 500, 472];
const TICKET: [number, number, number, number] = [72, 656, 568, 348];
const EYE: [number, number, number, number] = [44, 1076, 552, 552];
const MOON: [number, number, number, number] = [656, 1076, 672, 652];

/** a torn-paper outline round a box: ragged points every ~9 px */
const torn = (w: number, h: number, seed: number, amp = 5) => {
  const pts: string[] = [];
  const side = (x0: number, y0: number, x1: number, y1: number, k: number) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / 9));
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let i = 0; i < n; i++) {
      const u = i / n, o = (hash(seed * 31 + k * 7 + i * 1.7) - 0.5) * 2 * amp;
      pts.push(`${(x0 + (x1 - x0) * u + nx * o).toFixed(1)},${(y0 + (y1 - y0) * u + ny * o).toFixed(1)}`);
    }
  };
  side(0, 0, w, 0, 1);
  side(w, 0, w, h, 2);
  side(w, h, 0, h, 3);
  side(0, h, 0, 0, 4);
  return pts.join(" ");
};

/** a piece: slides in on twos from (dx, dy), then breathes (jitter) */
const piece = (t: number, at: number, dx: number, dy: number, seed: number, rot = 0, dur = 0.3) => {
  const ts = stepT(t, 12);
  const u = ease.out(Math.min(1, Math.max(0, (ts - at) / dur)));
  const [jx, jy, jr] = jitter(t, seed, 1.4, 12);
  return { u, transform: `translate(${(1 - u) * dx + jx}px, ${(1 - u) * dy + jy}px) rotate(${rot + jr * 1.2}deg)`, opacity: u > 0 ? 1 : 0 };
};

const RANSOM: { ch: string; bg: string; fg: string; font: string; size: number; r: number }[] = [
  { ch: "C", bg: "#111", fg: "#F4F0E6", font: F.abril, size: 92, r: -6 },
  { ch: "O", bg: "#F7D046", fg: "#111", font: F.bebas, size: 104, r: 4 },
  { ch: "L", bg: "#F4F0E6", fg: "#D63A2A", font: F.bodoni, size: 96, r: -3 },
  { ch: "L", bg: "#D63A2A", fg: "#F4F0E6", font: F.rubikMono, size: 74, r: 6 },
  { ch: "A", bg: "#F4F0E6", fg: "#111", font: F.playfairI, size: 100, r: -5 },
  { ch: "G", bg: "#2F5DA8", fg: "#F7D046", font: F.anton, size: 96, r: 3 },
  { ch: "E", bg: "#111", fg: "#F7D046", font: F.shrikhand, size: 86, r: -4 },
];

export const Collage: React.FC<PosterProps> = ({ t }) => {
  const blue = piece(t, 0, 420, 0, 1, -3);
  const red = piece(t, 0.06, -480, 0, 2, -7);
  const news = piece(t, 0.12, 0, 300, 3, 4);
  const grid = piece(t, 0.16, -300, 200, 4, -5);
  const her = piece(t, 0.04, -360, 0, 5, 0, 0.34);
  const fl = piece(t, 0.16, 120, -620, 6, 0, 0.34);
  return (
    <Frame bg="#E9DDC6">
      <Paper color="#E9DDC6" amt={0.6} id="col" />
      {/* orange halftone sun */}
      <div style={{ position: "absolute", left: 420, top: 120, width: 300, height: 300, borderRadius: "50%", overflow: "hidden", transform: `scale(${tween(t, 0, 0.3, ease.out)})` }}>
        <Halftone color="#FF6A1F" size={13} dot={0.42} angle={20} />
      </div>
      {/* a moon engraving pasted over the sun */}
      {(() => {
        const p = piece(t, 0.1, 260, -200, 30, 8);
        return <div style={{ position: "absolute", inset: 0, transform: p.transform, opacity: p.opacity }}><Sub id="COL-03" box={MOON} x={540} y={70} w={170} style={{ filter: "drop-shadow(3px 5px 4px rgba(40,25,10,0.35))" }} /></div>;
      })()}
      {/* torn fields */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g style={{ transform: blue.transform, opacity: blue.opacity, transformOrigin: "460px 600px" }}>
          <polygon points={torn(470, 600, 11, 6)} transform="translate(230, 330)" fill="#2F5DA8" />
        </g>
        <g style={{ transform: red.transform, opacity: red.opacity, transformOrigin: "200px 200px" }}>
          <polygon points={torn(440, 110, 12, 5)} transform="translate(-20, 150)" fill="#E2553A" />
          <text x={40} y={222} fontFamily={F.bebas} fontSize={56} letterSpacing="6" fill="#F4F0E6">CUT &amp; PASTE</text>
        </g>
        <g style={{ transform: grid.transform, opacity: grid.opacity, transformOrigin: "160px 900px" }}>
          <polygon points={torn(250, 260, 13, 4)} transform="translate(30, 770)" fill="#EEF2F3" />
          {Array.from({ length: 12 }, (_, i) => <line key={`h${i}`} x1={34} x2={276} y1={780 + i * 21} y2={780 + i * 21} stroke="#9FC3D6" strokeWidth={1} />)}
          {Array.from({ length: 12 }, (_, i) => <line key={`v${i}`} y1={774} y2={1026} x1={40 + i * 21} x2={40 + i * 21} stroke="#9FC3D6" strokeWidth={1} />)}
        </g>
      </svg>
      {/* her, with flowers for hair */}
      <div style={{ position: "absolute", inset: 0, transform: her.transform, opacity: her.opacity }}>
        <Cut id="COL-01" x={176} y={300} w={540} style={{ filter: "drop-shadow(4px 6px 6px rgba(40,25,10,0.35))" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, transform: fl.transform, opacity: fl.opacity }}>
        <Cut id="COL-02" x={390} y={130} w={360} style={{ filter: "drop-shadow(3px 5px 5px rgba(40,25,10,0.35))", transform: "rotate(14deg)" }} />
      </div>
      {/* ephemera: a stamp, a ticket stub, an engraved eye */}
      {(() => {
        const a = piece(t, 0.2, -240, -120, 31, -9), b = piece(t, 0.3, -300, 120, 32, -7), c = piece(t, 0.34, 260, 140, 33, 6);
        return (
          <>
            <div style={{ position: "absolute", inset: 0, transform: a.transform, opacity: a.opacity }}><Sub id="COL-03" box={STAMP} x={52} y={318} w={150} style={{ filter: "drop-shadow(2px 4px 4px rgba(40,25,10,0.35))" }} /></div>
            <div style={{ position: "absolute", inset: 0, transform: b.transform, opacity: b.opacity }}><Sub id="COL-03" box={TICKET} x={36} y={930} w={210} style={{ filter: "drop-shadow(2px 4px 4px rgba(40,25,10,0.35))" }} /></div>
            <div style={{ position: "absolute", inset: 0, transform: c.transform, opacity: c.opacity }}><Sub id="COL-03" box={EYE} x={548} y={760} w={140} style={{ filter: "drop-shadow(2px 4px 4px rgba(40,25,10,0.35))" }} /></div>
          </>
        );
      })()}
      {/* a butterfly landing on the flowers, flapping on twos */}
      {(() => {
        const ts = stepT(t, 12);
        const land = ease.out(Math.min(1, Math.max(0, (ts - 0.36) / 0.4)));
        const flap = 0.35 + 0.65 * Math.abs(Math.cos(ts * Math.PI * 3));
        const x = 470 + (1 - land) * 300 + Math.sin(ts * 2.4) * 6, y = 470 + (1 - land) * -260 + Math.sin(ts * 3.1) * 5;
        return ts >= 0.36 ? (
          <div style={{ position: "absolute", left: x, top: y, width: 150, height: 121, transform: `rotate(${-18 + Math.sin(ts * 2) * 6}deg) scaleX(${flap})`, filter: "drop-shadow(3px 6px 5px rgba(40,25,10,0.35))" }}>
            <Sub id="COL-03" box={BUTTERFLY} x={0} y={0} w={150} />
          </div>
        ) : null;
      })()}
      {/* newspaper scrap */}
      <div style={{ position: "absolute", left: 40, top: 560, width: 250, padding: "14px 16px", background: "#F4F0E6", boxShadow: "2px 4px 6px rgba(40,25,10,0.3)", transform: news.transform, opacity: news.opacity, fontFamily: F.baskerville, color: "#2A2521" }}>
        <div style={{ fontFamily: F.bodoni, fontWeight: 800, fontSize: 30, lineHeight: 1, letterSpacing: "-0.01em" }}>Made by hand,</div>
        <div style={{ fontFamily: F.bodoniI, fontSize: 30, lineHeight: 1.05, marginBottom: 8 }}>cut by heart.</div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ height: 5, marginTop: 6, width: `${70 + hash(i * 3.1) * 30}%`, background: "#8E857A", opacity: 0.6 }} />
        ))}
      </div>
      {/* tape */}
      {[
        [210, 300, -28, 0.1], [600, 360, 24, 0.14], [40, 556, -10, 0.2], [252, 760, 30, 0.22],
      ].map(([x, y, r, at], i) => {
        const p = piece(t, at, 0, 0, 20 + i, r, 0.08);
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 120, height: 34, background: "rgba(243,233,200,0.78)", transform: p.transform, opacity: p.opacity, clipPath: "polygon(0 10%, 6% 0, 12% 12%, 18% 0, 100% 0, 94% 50%, 100% 100%, 8% 100%, 0 88%)" }} />;
      })}
      {/* ransom-note title */}
      <div style={{ position: "absolute", left: 40, top: 1080, display: "flex", gap: 6 }}>
        {RANSOM.map((r, i) => {
          const p = piece(t, 0.26 + i * 0.06, 0, 0, 40 + i, r.r, 0.01);
          return (
            <div key={i} style={{ width: 86, height: 108, background: r.bg, color: r.fg, fontFamily: r.font, fontSize: r.size, lineHeight: "108px", textAlign: "center", boxShadow: "2px 3px 4px rgba(40,25,10,0.35)", transform: `${p.transform} scale(${p.u > 0 ? 1 : 0})` }}>
              {r.ch}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 500, top: 1010, fontFamily: F.reenie, fontSize: 92, color: "#111", transform: `rotate(-8deg)`, opacity: tween(t, 0.7, 0.8) }}>art</div>
      <Grain t={t} amt={0.12} blend="multiply" />
    </Frame>
  );
};
