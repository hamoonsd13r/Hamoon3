// Submarine Vote · the cast: five cel characters drawn by code (SVG), each a simple shape with its own colour —
//   box = a mustard squircle with an antenna · bloom = a pink six-lobed blossom · ball = a charcoal ball
//   bot = a sky-blue capsule wearing a visor with LED eyes · star = a violet four-point star
// Poses (eyes, brows, mouth, arms, tilt, squash, sweat, tears, tremble, a waving arm) mix with mixPose.
// Local coordinates: origin at the feet (bottom centre), y up is negative. One unit = one world pixel at s = 1.
import React from "react";
import { F, clamp, lerp, noise } from "./theme";

export type Model = "box" | "bloom" | "ball" | "bot" | "star";
export const INK = "#0B0D12";
const SW = 7;

export type Mouth = "o" | "smile" | "flat" | "grit" | "wobble" | "frown" | "smirk";
export type Arms = "clasp" | "down" | "wave" | "glass" | "none";
export type Pose = {
  lookX: number; lookY: number; // -1..1
  blink: number; // 0 open … 1 closed
  brow: number; // -1 angry … +1 worried
  browY: number; // extra raise, px
  wide: number; // 0..1 fear
  mouth: Mouth;
  open: number; // 0..1
  arms: Arms;
  tilt: number; // degrees
  sq: number; // squash (+ wider and shorter)
  sweat: number; // 0..1
  tear: number; // 0..1
  shake: number; // tremble, px
  wave: number; // -1..1 swing of the waving arm
};
export const POSE: Pose = { lookX: 0, lookY: 0, blink: 0, brow: 0.7, browY: 0, wide: 0.6, mouth: "o", open: 0.5, arms: "clasp", tilt: 0, sq: 0, sweat: 0, tear: 0, shake: 1.6, wave: 0 };

const COL: Record<Model, { base: string; shade: string; light: string; deep: string }> = {
  box: { base: "#F2B33D", shade: "#C98A1F", light: "#FFD98A", deep: "#8C5A0E" },
  bloom: { base: "#E57AA6", shade: "#BF5583", light: "#FFB3D1", deep: "#8A3358" },
  ball: { base: "#474B58", shade: "#2A2D36", light: "#8A91A1", deep: "#17181D" },
  bot: { base: "#3FA2F6", shade: "#1F7AC9", light: "#9BD1FF", deep: "#0F4F8C" },
  star: { base: "#8C6BFF", shade: "#6A4BE0", light: "#C3B3FF", deep: "#4630A6" },
};

// ─── silhouettes ───────────────────────────────────────────────────────────────────────────────────────────
const f1 = (v: number) => v.toFixed(1);
const poly = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join("L") + "Z";
const superE = (a: number, b: number, n: number, cx: number, cy: number, steps = 80) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    pts.push([cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), cy + b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
  }
  return poly(pts);
};
const blossom = (R: number, amp: number, k: number, sy: number, cx: number, cy: number, steps = 120) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const r = R * (1 + amp * Math.cos(k * (th + Math.PI / 2)));
    pts.push([cx + r * Math.cos(th), cy + r * sy * Math.sin(th)]);
  }
  return poly(pts);
};
/** the four-point spark, fattened by d with round tips (offset of an astroid-like curve) */
const spark = (Rx: number, Ry: number, e: number, d: number, cx: number, cy: number) => {
  const q = 22;
  let path = "";
  const dirs: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  dirs.forEach(([sx, sy], k) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= q; i++) {
      // quadrants alternate direction so the outline keeps turning the same way
      const u = (i / q) * (Math.PI / 2);
      const th = k % 2 === 0 ? u : Math.PI / 2 - u;
      const c = Math.cos(th), s = Math.sin(th);
      const x = Rx * Math.pow(c, e), y = Ry * Math.pow(s, e);
      // outward normal of the concave arc (away from the centre)
      let nx = Ry * e * Math.pow(s, e - 1) * c, ny = Rx * e * Math.pow(c, e - 1) * s;
      const nl = Math.hypot(nx, ny);
      if (nl < 1e-6) { nx = th < 0.1 ? 0 : 1; ny = th < 0.1 ? 1 : 0; } else { nx /= nl; ny /= nl; }
      pts.push([cx + sx * (x + nx * d), cy + sy * (y + ny * d)]);
    }
    pts.forEach(([x, y], i) => {
      if (k === 0 && i === 0) path += `M${f1(x)},${f1(y)}`;
      else if (i === 0) path += `A${d},${d} 0 0 1 ${f1(x)},${f1(y)}`; // round cap around the tip
      else path += `L${f1(x)},${f1(y)}`;
    });
  });
  // close with the cap of the first tip
  const first = /M([-\d.]+),([-\d.]+)/.exec(path)!;
  return path + `A${d},${d} 0 0 1 ${first[1]},${first[2]}Z`;
};

type Geo = {
  d: string; // body outline
  cy: number; // body centre (y)
  hw: number; // half width at the shoulders
  top: number; // y of the top of the head
  eye: { x: number; y: number; rx: number; ry: number; pr: number };
  mouth: { x: number; y: number; k: number };
  sh: { x: number; y: number }; // shoulder (right side; mirrored for the left)
};
const GEO: Record<Model, Geo> = {
  box: { d: superE(104, 120, 4.6, 0, -120), cy: -120, hw: 100, top: -240, eye: { x: 40, y: -152, rx: 23, ry: 27, pr: 11 }, mouth: { x: 0, y: -103, k: 0.9 }, sh: { x: 92, y: -96 } },
  bloom: { d: blossom(108, 0.085, 6, 1.07, 0, -118), cy: -118, hw: 102, top: -243, eye: { x: 39, y: -142, rx: 28, ry: 33, pr: 13 }, mouth: { x: 0, y: -90, k: 1 }, sh: { x: 96, y: -92 } },
  ball: { d: superE(106, 103, 2.5, 0, -104), cy: -104, hw: 100, top: -207, eye: { x: 38, y: -128, rx: 27, ry: 27, pr: 12 }, mouth: { x: 0, y: -80, k: 1 }, sh: { x: 94, y: -82 } },
  bot: { d: superE(97, 126, 3.3, 0, -126), cy: -126, hw: 92, top: -252, eye: { x: 36, y: -158, rx: 15, ry: 15, pr: 0 }, mouth: { x: 0, y: -84, k: 0.95 }, sh: { x: 88, y: -88 } },
  star: { d: spark(120, 138, 3.1, 31, 0, -146), cy: -146, hw: 60, top: -315, eye: { x: 30, y: -156, rx: 21, ry: 25, pr: 10 }, mouth: { x: 0, y: -112, k: 0.8 }, sh: { x: 60, y: -110 } },
};
export const CHAR_TOP: Record<Model, number> = { box: GEO.box.top - 46, bloom: GEO.bloom.top, ball: GEO.ball.top - 30, bot: GEO.bot.top, star: GEO.star.top };
export const CHAR_HW: Record<Model, number> = { box: 104, bloom: 112, ball: 106, bot: 97, star: 151 };

// ─── pieces ────────────────────────────────────────────────────────────────────────────────────────────────
const Limb: React.FC<{ d: string; w: number; fill: string }> = ({ d, w, fill }) => (
  <>
    <path d={d} fill="none" stroke={INK} strokeWidth={w + SW * 2} strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} fill="none" stroke={fill} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </>
);

const Eye: React.FC<{ x: number; y: number; rx: number; ry: number; pr: number; p: Pose; lid: number; skin: string; id: string; side: number }> = ({ x, y, rx, ry, pr, p, lid, skin, id, side }) => {
  const w = 1 + 0.12 * p.wide;
  const RX = rx * w, RY = ry * w;
  const close = clamp(Math.max(p.blink, lid));
  const px = x + p.lookX * (RX - pr * 0.9) * 0.62, py = y + p.lookY * (RY - pr * 0.9) * 0.55;
  const r = pr * (1 - 0.22 * p.wide);
  const lidY = y - RY + close * RY * 2;
  return (
    <g>
      <clipPath id={id}>
        <ellipse cx={x} cy={y} rx={RX} ry={RY} />
      </clipPath>
      <ellipse cx={x} cy={y} rx={RX} ry={RY} fill="#fff" />
      <g clipPath={`url(#${id})`}>
        <ellipse cx={x} cy={y + RY * 0.95} rx={RX} ry={RY * 0.42} fill="#C9D4E6" opacity={0.4} />
        <circle cx={px} cy={py} r={r} fill={INK} />
        <circle cx={px - r * 0.34 * side * -1} cy={py - r * 0.36} r={r * 0.3} fill="#fff" />
        {p.tear > 0 && <ellipse cx={x} cy={y + RY * 0.72} rx={RX} ry={RY * 0.42 * p.tear} fill="#8FD4FF" opacity={0.85} />}
        {close > 0.02 && <rect x={x - RX - 4} y={y - RY - 6} width={RX * 2 + 8} height={Math.max(0, lidY - (y - RY - 6))} fill={skin} />}
        {close > 0.02 && close < 0.98 && <line x1={x - RX} y1={lidY} x2={x + RX} y2={lidY} stroke={INK} strokeWidth={5} />}
      </g>
      <ellipse cx={x} cy={y} rx={RX} ry={RY} fill="none" stroke={INK} strokeWidth={5} />
      {close >= 0.98 && <path d={`M${x - RX},${y} q${RX},${RY * 0.5} ${RX * 2},0`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />}
    </g>
  );
};

const MouthShape: React.FC<{ x: number; y: number; k: number; p: Pose; t: number; seed: number }> = ({ x, y, k, p, t, seed }) => {
  const o = clamp(p.open);
  const st = { stroke: INK, strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const DARK = "#3B1016", TONGUE = "#E9656E";
  switch (p.mouth) {
    case "o": {
      const rx = (11 + 7 * o) * k, ry = (7 + 15 * o) * k;
      return (
        <g>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={DARK} {...st} />
          {o > 0.3 && <ellipse cx={x} cy={y + ry * 0.55} rx={rx * 0.62} ry={ry * 0.4} fill={TONGUE} />}
        </g>
      );
    }
    case "wobble": {
      const a = 5 * k, w = 20 * k, ph = t * 18 + seed;
      const d = `M${x - w},${y + Math.sin(ph) * a} Q${x - w / 2},${y - a * 1.6 + Math.sin(ph + 1) * a} ${x},${y + Math.sin(ph + 2) * a} T${x + w},${y + Math.sin(ph + 3) * a}`;
      return <path d={d} fill="none" {...st} />;
    }
    case "grit": {
      const w = 25 * k, h = (11 + 8 * o) * k;
      return (
        <g>
          <rect x={x - w} y={y - h} width={w * 2} height={h * 2} rx={h * 0.8} fill="#fff" {...st} />
          <line x1={x - w} y1={y} x2={x + w} y2={y} stroke={INK} strokeWidth={3} />
          {[-0.5, 0, 0.5].map((u) => <line key={u} x1={x + u * w} y1={y - h} x2={x + u * w} y2={y + h} stroke={INK} strokeWidth={3} />)}
        </g>
      );
    }
    case "smile": {
      const w = 22 * k;
      if (o > 0.25) return <path d={`M${x - w},${y - 4} Q${x},${y + 30 * o * k + 8} ${x + w},${y - 4} Z`} fill={DARK} {...st} />;
      return <path d={`M${x - w},${y - 3} Q${x},${y + 15 * k} ${x + w},${y - 3}`} fill="none" {...st} />;
    }
    case "frown": {
      const w = 19 * k;
      return <path d={`M${x - w},${y + 7 * k} Q${x},${y - 11 * k - 8 * o} ${x + w},${y + 7 * k}`} fill="none" {...st} />;
    }
    case "smirk": {
      const w = 21 * k;
      return <path d={`M${x - w},${y + 2} Q${x + 2},${y + 8 * k} ${x + w},${y - 9 * k}`} fill="none" {...st} />;
    }
    default:
      return <line x1={x - 17 * k} y1={y} x2={x + 17 * k} y2={y} {...st} />;
  }
};

const Brows: React.FC<{ g: Geo; p: Pose; col?: string }> = ({ g, p, col = INK }) => {
  const { x, y, rx, ry } = g.eye;
  const top = y - ry * (1 + 0.12 * p.wide) - 13 - p.browY;
  const d = 11 * p.brow; // inner end up (worried) / down (angry)
  return (
    <g stroke={col} strokeWidth={8} strokeLinecap="round">
      <line x1={-x - rx * 0.9} y1={top + d * 0.7} x2={-x + rx * 0.75} y2={top - d} />
      <line x1={x + rx * 0.9} y1={top + d * 0.7} x2={x - rx * 0.75} y2={top - d} />
    </g>
  );
};

/** hands meeting on the chest / hanging / waving / pressed on a glass pane */
const ArmSet: React.FC<{ g: Geo; p: Pose; col: string; front: boolean; back?: boolean }> = ({ g, p, col, front, back }) => {
  const { sh } = g;
  const W = 30;
  if (p.arms === "none") return null;
  const arms: { d: string; hand: [number, number] }[] = [];
  const mk = (side: number, hx: number, hy: number, bend: number) => {
    const sx = side * sh.x, sy = sh.y;
    const mx = (sx + hx) / 2 + side * bend, my = (sy + hy) / 2 + Math.abs(bend) * 0.6;
    arms.push({ d: `M${f1(sx)},${f1(sy)} Q${f1(mx)},${f1(my)} ${f1(hx)},${f1(hy)}`, hand: [hx, hy] });
  };
  if (p.arms === "clasp") {
    if (!front) return null;
    mk(-1, -15, sh.y + 26, 26);
    mk(1, 15, sh.y + 26, 26);
  } else if (p.arms === "down") {
    if (front) return null;
    mk(-1, -sh.x - 20, sh.y + 62, 10);
    mk(1, sh.x + 20, sh.y + 62, 10);
  } else if (p.arms === "glass") {
    if (!front) return null;
    mk(-1, -sh.x - 4, sh.y - 60, 14);
    mk(1, sh.x + 4, sh.y - 60, 14);
  } else if (p.arms === "wave") {
    if (front !== !back) return null;
    // a real wave: the arm goes up past the head and swings from the shoulder
    const a = (-70 + p.wave * 21) * (Math.PI / 180);
    const hx = sh.x + 6 + Math.cos(a) * 150, hy = sh.y - 12 + Math.sin(a) * 150;
    mk(1, hx, hy, -14 - 8 * p.wave);
    if (!back) mk(-1, -sh.x - 18, sh.y + 58, 10);
    const [wx, wy] = arms[0].hand;
    const rot = (a * 180) / Math.PI + 90; // the hand points along the arm
    return (
      <g>
        <Limb d={arms[0].d} w={W} fill={col} />
        {/* an open hand: palm + three fingers and a thumb */}
        <g transform={`translate(${f1(wx)},${f1(wy)}) rotate(${f1(rot)})`}>
          {[[-17, -17, 10.5], [0, -24, 11.5], [17, -17, 10.5], [-25, 3, 9.5]].map(([fx, fy, fr], i) => (
            <circle key={i} cx={fx} cy={fy} r={fr} fill={col} stroke={INK} strokeWidth={SW} />
          ))}
          <circle cx={0} cy={0} r={23} fill={col} stroke={INK} strokeWidth={SW} />
          {[[-17, -17, 10.5], [0, -24, 11.5], [17, -17, 10.5], [-25, 3, 9.5]].map(([fx, fy, fr], i) => (
            <circle key={`f${i}`} cx={fx * 0.9} cy={fy * 0.9} r={fr - 3.4} fill={col} />
          ))}
        </g>
        {/* swing marks on both sides of the hand, strongest in mid-swing */}
        {[-1, 1].map((sd) =>
          [0, 1].map((i) => {
            const ox = wx + sd * (46 + i * 16), oy = wy - 10 + i * 5;
            const k = (1 - Math.abs(p.wave)) * (sd * p.wave < 0 ? 1 : 0.45);
            return <path key={`${sd}${i}`} d={`M${f1(ox)},${f1(oy - 18 + i * 4)} q${f1(sd * 9)},${f1(17 - i * 3)} 0,${f1(34 - i * 8)}`} fill="none" stroke="#EAF6FF" strokeWidth={5 - i} strokeLinecap="round" opacity={(0.2 + 0.6 * k) * (1 - 0.3 * i)} />;
          }),
        )}
        {arms.slice(1).map((ar, i) => (
          <g key={i}>
            <Limb d={ar.d} w={W} fill={col} />
            <circle cx={ar.hand[0]} cy={ar.hand[1]} r={W * 0.62} fill={col} stroke={INK} strokeWidth={SW} />
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      {arms.map((a, i) => (
        <g key={i}>
          <Limb d={a.d} w={W} fill={col} />
          <circle cx={a.hand[0]} cy={a.hand[1]} r={W * 0.62} fill={col} stroke={INK} strokeWidth={SW} />
          {p.arms === "glass" && <circle cx={a.hand[0]} cy={a.hand[1]} r={W * 0.3} fill="#fff" opacity={0.22} />}
        </g>
      ))}
    </g>
  );
};

/** Meta's visor: LED eyes on a dark lens */
const Visor: React.FC<{ g: Geo; p: Pose; t: number }> = ({ g, p, t }) => {
  const y = g.eye.y, w = 86, h = 45;
  const LED = "#9FE8FF";
  const ex = g.eye.x, ox = p.lookX * 9, oy = p.lookY * 6;
  const r = 13 + 4 * p.wide;
  const blink = clamp(p.blink);
  const eye = (sx: number, key: string) => {
    const cx = sx * ex + ox, cy = y + oy;
    if (p.tear > 0.5) {
      // "T T": crying
      const drip = 16 + 10 * (0.5 + 0.5 * Math.sin(t * 9 + sx));
      return (
        <g key={key} stroke={LED} strokeWidth={7} strokeLinecap="round">
          <line x1={cx - 13} y1={cy - 9} x2={cx + 13} y2={cy - 9} />
          <line x1={cx} y1={cy - 9} x2={cx} y2={cy - 9 + drip} />
        </g>
      );
    }
    if (blink > 0.6) return <line key={key} x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={LED} strokeWidth={7} strokeLinecap="round" />;
    return p.wide > 0.5 ? (
      <circle key={key} cx={cx} cy={cy} r={r} fill="none" stroke={LED} strokeWidth={7} />
    ) : (
      <rect key={key} x={cx - 11} y={cy - 13} width={22} height={26} rx={8} fill={LED} />
    );
  };
  return (
    <g>
      {/* strap */}
      <path d={`M${-g.hw - 2},${y - 6} L${-w + 6},${y - 10} M${g.hw + 2},${y - 6} L${w - 6},${y - 10}`} stroke={INK} strokeWidth={30} strokeLinecap="butt" />
      <path d={`M${-g.hw - 2},${y - 6} L${-w + 6},${y - 10} M${g.hw + 2},${y - 6} L${w - 6},${y - 10}`} stroke="#AEB6C4" strokeWidth={17} strokeLinecap="butt" />
      {/* shell */}
      <rect x={-w} y={y - h} width={w * 2} height={h * 2} rx={34} fill="#F3F5F9" stroke={INK} strokeWidth={SW} />
      <path d={`M${-w + 16},${y + h - 9} Q0,${y + h + 5} ${w - 16},${y + h - 9}`} fill="none" stroke="#C3CAD6" strokeWidth={9} strokeLinecap="round" />
      {/* lens */}
      <rect x={-w + 15} y={y - h + 13} width={w * 2 - 30} height={h * 2 - 26} rx={23} fill="#0D1422" stroke={INK} strokeWidth={4} />
      <path d={`M${-w + 28},${y - h + 24} Q${-w + 60},${y - h + 14} ${-w + 100},${y - h + 22}`} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.28} />
      <g style={{ filter: "drop-shadow(0 0 6px rgba(120,220,255,.9))" }}>{[eye(-1, "l"), eye(1, "r")]}</g>
    </g>
  );
};

let cid = 0;
export const Char: React.FC<{
  m: Model;
  x: number; y: number; s?: number;
  p: Pose;
  t: number;
  seed?: number;
  red?: number; // alarm light on the top edges, 0..1
  cool?: number; // white light from the pod behind, 0..1
  back?: boolean; // seen from behind (no face)
  flip?: boolean;
}> = ({ m, x, y, s = 1, p, t, seed = 0, red = 0, cool = 0.4, back, flip }) => {
  const id = React.useMemo(() => `ch86-${cid++}`, []);
  const g = GEO[m], c = COL[m];
  const jx = p.shake * noise(t * 15, seed + 3), jy = p.shake * 0.7 * noise(t * 19, seed + 11);
  const sx = (1 + p.sq * 0.06) * (flip ? -1 : 1), sy = 1 - p.sq * 0.06;
  const skin = c.base;
  const lid = m === "ball" ? 0.34 : m === "box" ? 0.12 : 0;
  return (
    <g transform={`translate(${f1(x + jx)},${f1(y + jy)}) scale(${s}) rotate(${f1(p.tilt)}) scale(${sx.toFixed(3)},${sy.toFixed(3)})`}>
      <defs>
        <clipPath id={`${id}-b`}>
          <path d={g.d} />
        </clipPath>
        <linearGradient id={`${id}-g`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.34" stopColor={c.base} />
          <stop offset="1" stopColor={c.shade} />
        </linearGradient>
        <linearGradient id={`${id}-red`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF2B2B" stopOpacity={0.85} />
          <stop offset="0.5" stopColor="#FF2B2B" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* behind the body */}
      {!back && <ArmSet g={g} p={p} col={c.base} front={false} />}
      {back && <ArmSet g={g} p={p} col="#C96A4B" front={false} back />}

      {m === "box" && (
        <g transform={`translate(26 ${g.top - 20}) rotate(14)`}>
          <line x1={0} y1={8} x2={-8} y2={34} stroke={INK} strokeWidth={13} strokeLinecap="round" />
          <line x1={0} y1={8} x2={-8} y2={34} stroke={c.base} strokeWidth={5} strokeLinecap="round" />
          <circle cx={2} cy={0} r={17} fill={c.light} stroke={INK} strokeWidth={6} />
        </g>
      )}
      {/* body */}
      <path d={g.d} fill={INK} stroke={INK} strokeWidth={SW * 2} strokeLinejoin="round" />
      <g clipPath={`url(#${id}-b)`}>
        <path d={g.d} fill={`url(#${id}-g)`} />
        {back && <path d={g.d} fill={c.deep} opacity={0.3} />}
        {/* cel shade on the lower right, soft light on the upper left */}
        <ellipse cx={g.hw * 0.95} cy={g.cy + 86} rx={g.hw * 1.25} ry={104} fill={c.deep} opacity={back ? 0.42 : 0.36} />
        <ellipse cx={-g.hw * 0.42} cy={g.top + 54} rx={g.hw * 0.42} ry={22} fill="#fff" opacity={back ? 0.16 : 0.26} transform={`rotate(-24 ${-g.hw * 0.42} ${g.top + 54})`} />
        {/* light from the pod behind: a cool rim on both flanks */}
        <path d={g.d} fill="none" stroke="#CFE9FF" strokeWidth={back ? 20 : 15} opacity={(back ? 0.42 : 0.3) * cool} />
        {/* the alarm lamp: red on the top edges */}
        <path d={g.d} fill="none" stroke={`url(#${id}-red)`} strokeWidth={30} opacity={red * 0.95} />
      </g>

      {!back && (m === "box" || m === "bloom" || m === "star") && (
        <g clipPath={`url(#${id}-b)`} opacity={0.34}>
          <ellipse cx={-g.eye.x - g.eye.rx * 0.9} cy={g.eye.y + g.eye.ry + 13} rx={15} ry={9} fill="#FF6F7D" />
          <ellipse cx={g.eye.x + g.eye.rx * 0.9} cy={g.eye.y + g.eye.ry + 13} rx={15} ry={9} fill="#FF6F7D" />
        </g>
      )}
      {/* face */}
      {!back && m !== "bot" && (
        <>
          <Eye {...g.eye} x={-g.eye.x} p={p} lid={lid} skin={skin} id={`${id}-el`} side={-1} />
          <Eye {...g.eye} p={p} lid={lid} skin={skin} id={`${id}-er`} side={1} />
          <Brows g={g} p={p} col={m === "ball" ? "#F1F2F6" : INK} />
        </>
      )}
      {!back && m === "bot" && <Visor g={g} p={p} t={t} />}
      {!back && <MouthShape x={g.mouth.x} y={g.mouth.y} k={g.mouth.k} p={p} t={t} seed={seed} />}
      {!back && p.tear > 0 && m !== "bot" && (
        <g fill="#9BDBFF" stroke={INK} strokeWidth={3}>
          {[-1, 1].map((sd) => {
            const u = (t * 0.9 + (sd > 0 ? 0.45 : 0) + seed * 0.13) % 1;
            return <path key={sd} d={`M${sd * g.eye.x},${g.eye.y + g.eye.ry + 2 + u * 34} q-7,12 0,17 q7,-5 0,-17`} opacity={p.tear * (1 - u * 0.6)} />;
          })}
        </g>
      )}
      {!back && p.sweat > 0 && (
        <path d={`M${g.hw * 0.72},${g.top + 46 + ((t * 26 + seed * 7) % 26)} q-8,14 0,20 q8,-6 0,-20`} fill="#BDE6FF" stroke={INK} strokeWidth={3} opacity={p.sweat} />
      )}

      {/* in front of the body */}
      {!back && <ArmSet g={g} p={p} col={c.base} front />}
      {back && <ArmSet g={g} p={p} col="#C96A4B" front back />}
    </g>
  );
};

/** speech-bubble name tag with the character's colour dot */
export const Tag: React.FC<{ m: Model; x: number; y: number; s?: number; label: string }> = ({ m, x, y, s = 1, label }) => {
  const w = 66 + label.length * 17.6, h = 52;
  return (
    <g transform={`translate(${f1(x)},${f1(y)}) scale(${s})`}>
      <path d={`M-9,${-2} L0,13 L9,-2 Z`} fill="#fff" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <rect x={-w / 2} y={-h} width={w} height={h} rx={15} fill="#fff" stroke={INK} strokeWidth={5} />
      <rect x={-8} y={-6} width={16} height={7} fill="#fff" />
      <circle cx={-w / 2 + 27} cy={-h / 2} r={13} fill={COL[m].base} stroke={INK} strokeWidth={4} />
      <text x={-w / 2 + 50} y={-h / 2 + 10} fontFamily={F.faB} fontWeight={700} fontSize={28} fill={INK}>
        {label}
      </text>
    </g>
  );
};

export { COL, GEO };
export const mixPose = (a: Pose, b: Pose, k: number): Pose => ({
  lookX: lerp(a.lookX, b.lookX, k), lookY: lerp(a.lookY, b.lookY, k), blink: lerp(a.blink, b.blink, k), brow: lerp(a.brow, b.brow, k),
  browY: lerp(a.browY, b.browY, k), wide: lerp(a.wide, b.wide, k), mouth: k < 0.5 ? a.mouth : b.mouth, open: lerp(a.open, b.open, k),
  arms: k < 0.5 ? a.arms : b.arms, tilt: lerp(a.tilt, b.tilt, k), sq: lerp(a.sq, b.sq, k), sweat: lerp(a.sweat, b.sweat, k),
  tear: lerp(a.tear, b.tear, k), shake: lerp(a.shake, b.shake, k), wave: lerp(a.wave, b.wave, k),
});
