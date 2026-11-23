// Living Codex · carved animal reliefs as engraved glyphs (fox, boar, snakes, vulture, scorpion),
// drawn in a 220×140 box, plus a few small line icons and a scale figure. Rendered as low relief: a lit fill,
// a highlight edge up-left, a shadow edge down-right, and an amber glow when the torch finds them.
import React from "react";
import { C, hexA, spline } from "./theme";

type P = [number, number];
const mirror = (pts: P[], cx = 110): P[] => pts.map(([x, y]) => [2 * cx - x, y]);

// fox, leaping, facing left
const FOX: P[] = [[12, 62], [26, 51], [40, 45], [46, 28], [56, 43], [72, 45], [102, 49], [140, 53], [162, 57], [182, 51], [204, 43], [219, 49], [206, 62], [182, 70], [168, 77],
  [178, 97], [192, 118], [184, 125], [167, 104], [150, 87], [112, 87], [86, 85], [72, 101], [57, 123], [47, 120], [60, 96], [52, 79], [36, 73], [24, 70], [15, 67]];
// boar, facing left, bristled back
const BOAR: P[] = [[10, 87], [12, 73], [30, 65], [50, 52], [60, 33], [71, 48], [90, 40], [118, 33], [152, 37], [181, 47], [197, 62], [205, 71], [215, 65], [208, 81],
  [201, 97], [197, 125], [184, 125], [184, 101], [160, 105], [112, 105], [92, 103], [86, 125], [72, 125], [72, 101], [52, 97], [32, 95], [16, 95]];
const BOAR_DETAIL = "M27,93 Q21,78 35,73 M44,62 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0";
const BRISTLES = Array.from({ length: 14 }, (_, i) => {
  const x = 86 + i * 7.2;
  const y = 40 - 7 * Math.sin((i / 13) * Math.PI) + i * 0.35;
  return `M${x.toFixed(1)},${(y + 3).toFixed(1)} L${(x - 2).toFixed(1)},${(y - 9).toFixed(1)}`;
}).join(" ");
// vulture: wings spread, head in profile
const VULT_L: P[] = [[92, 44], [64, 30], [36, 17], [19, 22], [30, 34], [13, 38], [28, 48], [15, 56], [34, 62], [25, 73], [52, 72], [86, 70]];
const VULTURE: P[] = [[110, 15], [98, 19], [86, 26], [91, 31], [97, 30], [102, 35], ...VULT_L, [92, 96], [100, 112], [110, 127], [120, 112], [128, 96],
  ...mirror(VULT_L).reverse(), [120, 34], [121, 22]];
const VULT_DETAIL = "M102,104 L98,122 M98,122 l-5,3 M98,122 l2,4 M118,104 L122,122 M122,122 l5,3 M122,122 l-2,4 M104,23 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0 M60,44 L40,30 M62,54 L32,46 M66,62 L36,62 M160,44 L180,30 M158,54 L188,46 M154,62 L184,62";
// scorpion, seen from above, tail curled to the right
const SC_BODY: P[] = [[110, 50], [124, 57], [131, 74], [129, 92], [119, 104], [110, 107], [101, 104], [91, 92], [89, 74], [96, 57]];
const SC_CLAW: P[] = [[96, 56], [84, 44], [74, 33], [62, 26], [57, 14], [66, 9], [72, 18], [77, 12], [83, 16], [80, 27], [88, 40], [100, 52]];
const SC_TAIL: P[] = [[110, 107], [112, 118], [121, 127], [137, 130], [151, 123], [158, 109], [155, 97]];
const SC_LEGS = [0, 1, 2, 3].map((i) => {
  const y = 64 + i * 10;
  return `M92,${y} L72,${y - 8 + i * 2} L58,${y + 6 + i * 4} M128,${y} L148,${y - 8 + i * 2} L162,${y + 6 + i * 4}`;
}).join(" ");

// snakes: tapered bodies around sine centrelines, head to the left
const snake = (y0: number, ph: number, amp = 9) => {
  const top: P[] = [], bot: P[] = [];
  for (let x = 206; x >= 34; x -= 4) {
    const u = (206 - x) / 172; // 0 at tail, 1 at head
    const y = y0 + amp * Math.sin(x / 20 + ph);
    const dy = (amp / 20) * Math.cos(x / 20 + ph);
    const n = Math.hypot(1, dy);
    const w = 1.5 + 4.2 * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.5);
    top.push([x - (dy / n) * w, y - (1 / n) * w]);
    bot.push([x + (dy / n) * w, y + (1 / n) * w]);
  }
  const hx = 34, hy = y0 + amp * Math.sin(hx / 20 + ph);
  const head: P[] = [[hx + 2, hy - 6], [hx - 10, hy - 5], [hx - 18, hy], [hx - 10, hy + 5], [hx + 2, hy + 6]];
  return [...top, ...head, ...bot.reverse()];
};

export type GlyphId = "fox" | "boar" | "snake" | "vulture" | "scorpion";
export const GLYPHS: Record<GlyphId, { body: string[]; detail?: string; label: string }> = {
  fox: { body: [spline(FOX)], detail: "M15,65 L31,64 M38,53 m-2.2,0 a2.2,2.2 0 1,0 4.4,0 a2.2,2.2 0 1,0 -4.4,0 M150,60 Q160,72 168,77", label: "Fox" },
  boar: { body: [spline(BOAR)], detail: `${BOAR_DETAIL} ${BRISTLES}`, label: "Boar" },
  snake: { body: [spline(snake(38, 0.2), true, 0.3), spline(snake(72, 1.9), true, 0.3), spline(snake(106, 3.6), true, 0.3)], label: "Snake" },
  vulture: { body: [spline(VULTURE)], detail: VULT_DETAIL, label: "Vulture" },
  scorpion: {
    body: [spline(SC_BODY), spline(SC_CLAW), spline(mirror(SC_CLAW))],
    detail: `${SC_LEGS} M96,68 Q110,72 124,68 M94,80 Q110,84 126,80 M95,92 Q110,96 125,92 ${spline(SC_TAIL, false)} M155,97 Q160,86 150,84`,
    label: "Scorpion",
  },
};

/** one carved relief. lit 0..1 = torchlight on it; carve 0..1 = how much of the outline is cut so far */
export const Relief: React.FC<{ id: GlyphId; x: number; y: number; s?: number; lit: number; carve: number; uid: string }> = ({ id, x, y, s = 1, lit, carve, uid }) => {
  const g = GLYPHS[id];
  const tailBeads = id === "scorpion";
  const dash = { strokeDasharray: "1000 1000", strokeDashoffset: 1000 * (1 - carve) };
  return (
    <svg width={220 * s + 40} height={140 * s + 40} viewBox={`${-20 / s} ${-20 / s} ${220 + 40 / s} ${140 + 40 / s}`} style={{ position: "absolute", left: x - (110 * s + 20), top: y - (70 * s + 20), overflow: "visible" }}>
      <defs>
        <linearGradient id={`rf${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`rgb(${150 + 70 * lit},${128 + 50 * lit},${100 + 20 * lit})`} />
          <stop offset="1" stopColor={`rgb(${70 + 60 * lit},${58 + 40 * lit},${46 + 14 * lit})`} />
        </linearGradient>
        <filter id={`rg${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={4 / s} /></filter>
      </defs>
      {/* glow */}
      {lit > 0.02 && g.body.map((d, i) => <path key={`g${i}`} d={d} fill="none" stroke={C.amber} strokeWidth={7 / s} opacity={0.55 * lit} filter={`url(#rg${uid})`} />)}
      {/* shadow edge (down-right), highlight edge (up-left), lit fill */}
      {g.body.map((d, i) => <path key={`s${i}`} d={d} transform={`translate(${2.2 / s},${2.6 / s})`} fill="rgba(0,0,0,0.55)" opacity={carve} />)}
      {g.body.map((d, i) => <path key={`f${i}`} d={d} fill={`url(#rf${uid})`} opacity={0.3 + 0.7 * carve} />)}
      {g.body.map((d, i) => <path key={`h${i}`} d={d} transform={`translate(${-1.1 / s},${-1.1 / s})`} fill="none" stroke={`rgba(255,236,200,${0.25 + 0.5 * lit})`} strokeWidth={1.1 / s} pathLength={1000} style={dash} />)}
      {g.body.map((d, i) => <path key={`o${i}`} d={d} fill="none" stroke={lit > 0.1 ? hexA(C.amber, 0.5 + 0.5 * lit) : "rgba(20,14,8,0.8)"} strokeWidth={1.4 / s} pathLength={1000} style={dash} />)}
      {g.detail && <path d={g.detail} fill="none" stroke={`rgba(30,18,8,${0.8 * carve})`} strokeWidth={1.6 / s} strokeLinecap="round" />}
      {g.detail && lit > 0.1 && <path d={g.detail} fill="none" stroke={hexA("#ffd8a0", 0.5 * lit)} strokeWidth={0.8 / s} strokeLinecap="round" transform={`translate(${-0.8 / s},${-0.8 / s})`} />}
      {tailBeads && SC_TAIL.map(([bx, by], i) => (
        <ellipse key={i} cx={bx} cy={by} rx={6 - i * 0.4} ry={5 - i * 0.3} fill={`url(#rf${uid})`} stroke={lit > 0.1 ? hexA(C.amber, 0.6 * lit) : "rgba(20,14,8,0.7)"} strokeWidth={1.2 / s} opacity={carve} />
      ))}
    </svg>
  );
};

/** a flat line glyph (for blueprints and network labels) */
export const GlyphLine: React.FC<{ id: GlyphId; x: number; y: number; s?: number; color?: string; a?: number; w?: number }> = ({ id, x, y, s = 1, color = C.bone, a = 1, w = 1.2 }) => {
  const g = GLYPHS[id];
  return (
    <g transform={`translate(${x - 110 * s},${y - 70 * s}) scale(${s})`} opacity={a}>
      {g.body.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth={w / s} />)}
    </g>
  );
};

// ── small line icons for the five roles (S20/S21), 48×48 centred on 0,0 ──────────────────────────
export const ROLE_ICON: Record<string, string> = {
  quarry: "M-18,14 L-18,-6 L6,-14 L18,-6 L18,14 Z M-18,-6 L6,2 L18,-6 M6,2 L6,14 M-6,-4 L-2,6 L-8,10",
  carve: "M-16,16 L4,-4 M4,-4 L10,-10 L14,-6 L8,0 Z M10,-16 L18,-8 M-4,-18 Q-14,-10 -6,-4",
  hunt: "M-20,18 L14,-16 M14,-16 L8,-4 M14,-16 L2,-10 M-12,10 L-16,6 M-8,6 L-12,2",
  grind: "M-20,10 Q0,20 20,10 L18,4 Q0,12 -18,4 Z M-10,0 Q0,-12 10,0 Q0,4 -10,0 Z",
  brew: "M-8,-18 L8,-18 M-6,-18 Q-6,-10 -14,-4 Q-18,8 -10,18 L10,18 Q18,8 14,-4 Q6,-10 6,-18 M-14,4 L14,4",
};
export const RoleIcon: React.FC<{ id: string; x: number; y: number; s?: number; color?: string; a?: number }> = ({ id, x, y, s = 1, color = C.bone, a = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={a}>
    <path d={ROLE_ICON[id]} fill="none" stroke={color} strokeWidth={1.6 / s} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

/** a 1.75 m human figure for scale (front view), feet at 0,0, height h px */
export const humanPath = (h: number) => {
  const k = h / 175;
  const P2: P[] = [[0, -150], [-9, -147], [-21, -142], [-26, -128], [-28, -100], [-29, -80], [-25, -78], [-21, -100], [-19, -96], [-17, -60], [-15, -30], [-14, -2], [-4, -2], [-3, -58], [0, -62],
    [3, -58], [4, -2], [14, -2], [15, -30], [17, -60], [19, -96], [21, -100], [25, -78], [29, -80], [28, -100], [26, -128], [21, -142], [9, -147]];
  const body = spline(P2.map(([x, y]) => [x * k, y * k] as P), true, 0.35);
  const head = `M${(-10 * k).toFixed(1)},${(-162 * k).toFixed(1)} a${(10 * k).toFixed(1)},${(12 * k).toFixed(1)} 0 1,0 ${(20 * k).toFixed(1)},0 a${(10 * k).toFixed(1)},${(12 * k).toFixed(1)} 0 1,0 ${(-20 * k).toFixed(1)},0`;
  return `${body} ${head}`;
};
