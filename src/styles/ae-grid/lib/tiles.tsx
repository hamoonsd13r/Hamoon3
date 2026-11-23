// AE Grid · the eight tiles (360×360 SVG each; the gears are a linked pair, 360×720). Flat shapes in three colours,
// keyframe-style motion (eased, small overshoots), and every motion loops exactly in 8 s.
import React from "react";
import { TILE, clamp, ease, loop, mix, type Pal } from "./theme";

type TP = { t: number; P: Pal };
const S: React.FC<{ h?: number; bg: string; children: React.ReactNode }> = ({ h = TILE, bg, children }) => (
  <svg width={TILE} height={h} viewBox={`0 0 ${TILE} ${h}`} style={{ display: "block" }}>
    <rect width={TILE} height={h} fill={bg} />
    {children}
  </svg>
);

/** R1C1 · three arches draw on, hold, and wipe off (twice per loop) */
export const Arches: React.FC<TP> = ({ t, P }) => {
  const tau = loop(t, 4);
  const cx = 180, cy = 196, base = 324;
  const A = [{ r: 132, c: P.D }, { r: 96, c: P.V }, { r: 60, c: P.D }];
  return (
    <S bg={P.L}>
      {A.map((a, i) => {
        const d = i * 0.16;
        const end = ease.inOut(clamp((tau - d) / 1.1));
        const start = ease.inOut(clamp((tau - 2.05 - d) / 1.1));
        if (end - start < 0.002) return null;
        return (
          <path key={i} d={`M ${cx - a.r} ${base} L ${cx - a.r} ${cy} A ${a.r} ${a.r} 0 0 1 ${cx + a.r} ${cy} L ${cx + a.r} ${base}`} pathLength={1}
            fill="none" stroke={a.c} strokeWidth={24} strokeDasharray={`${end - start} 2`} strokeDashoffset={-start} />
        );
      })}
      <rect x={34} y={330} width={292} height={8} rx={4} fill={P.D} opacity={0.9} />
    </S>
  );
};

/** R1C2 + R2C2 · three meshing gears across two tiles: every 0.5 s each advances exactly one tooth (small overshoot) */
const gearPath = (N: number, R: number, m: number, phaseDeg: number) => {
  const p = (2 * Math.PI) / N, Ro = R + 0.9 * m, Rr = R - 1.15 * m, ph = (phaseDeg * Math.PI) / 180;
  const v: string[] = [];
  for (let i = 0; i < N; i++) {
    const c = ph + i * p;
    for (const [a, r] of [[c - 0.3 * p, Rr], [c - 0.17 * p, Ro], [c + 0.17 * p, Ro], [c + 0.3 * p, Rr]]) v.push(`${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${v.join(" L ")} Z`;
};
const tick = (t: number, step: number) => {
  const f = loop(t, 8) * 30, k = Math.floor(f / 15), u = f - 15 * k;
  const v = u < 8 ? mix(0, 1.06, ease.inOut(u / 8)) : u < 12 ? mix(1.06, 1, ease.inOut((u - 8) / 4)) : 1;
  return step * (k + v);
};
type Deco = { d: number; p: [number, number]; c: string };
const ring = (n: number, r: number, d: number, c: string, a0 = 0): Deco[] => Array.from({ length: n }, (_, i) => ({ d, c, p: [r * Math.cos(a0 + (i * 2 * Math.PI) / n), r * Math.sin(a0 + (i * 2 * Math.PI) / n)] }));
const Gear: React.FC<{ c: [number, number]; N: number; R: number; phase: number; rot: number; body: string; deco: Deco[] }> = ({ c, N, R, phase, rot, body, deco }) => (
  <g transform={`translate(${c[0]} ${c[1]}) rotate(${rot.toFixed(3)})`}>
    <path d={gearPath(N, R, 16, phase)} fill={body} stroke={body} strokeWidth={4} strokeLinejoin="round" />
    {deco.map((x, i) => (
      <circle key={i} cx={x.p[0]} cy={x.p[1]} r={x.d / 2} fill={x.c} />
    ))}
  </g>
);
export const Gears: React.FC<TP> = ({ t, P }) => {
  const A = { N: 16, R: 128 }, B = { N: 12, R: 96 }, X = { N: 8, R: 64 };
  const tC: [number, number] = [180, 360 - A.R], bC: [number, number] = [180, 360 + B.R];
  const dd = (B.R + X.R) / Math.SQRT2, xC: [number, number] = [bC[0] + dd, bC[1] + dd];
  return (
    <svg width={TILE} height={720} viewBox="0 0 360 720" style={{ display: "block" }}>
      <rect width={360} height={360} fill={P.D} />
      <rect y={360} width={360} height={360} fill={P.V} />
      <Gear c={xC} N={X.N} R={X.R} phase={225} rot={tick(t, 360 / X.N)} body={P.D} deco={[{ d: 34, p: [0, 0], c: P.V }, { d: 12, p: [0, 0], c: P.D }]} />
      <Gear c={bC} N={B.N} R={B.R} phase={270} rot={tick(t, -360 / B.N)} body={P.L} deco={[...ring(3, 52, 34, P.D, -Math.PI / 2), { d: 40, p: [0, 0], c: P.D }, { d: 14, p: [0, 0], c: P.V }]} />
      <Gear c={tC} N={A.N} R={A.R} phase={90 - 360 / A.N / 2} rot={tick(t, 360 / A.N)} body={P.L} deco={[...ring(6, 74, 30, P.D), { d: 56, p: [0, 0], c: P.V }, { d: 16, p: [0, 0], c: P.D }]} />
    </svg>
  );
};

/** R1C3 · sand pours, then the hourglass flips 180° (the glass is symmetric, so the flip lands on the first frame) */
export const Hourglass: React.FC<TP> = ({ t, P }) => {
  const tau = loop(t, 4);
  const s = tau < 3.3 ? clamp(tau / 3.3) : 1;
  const flip = tau < 3.35 ? 0 : 180 * ease.outBack(clamp((tau - 3.35) / 0.6));
  const glass = "M 116 74 L 244 74 C 244 128 194 150 190 180 C 194 210 244 232 244 286 L 116 286 C 116 232 166 210 170 180 C 166 150 116 128 116 74 Z";
  const level = mix(100, 179, Math.pow(s, 0.85));
  const peak = mix(286, 214, Math.pow(s, 0.8));
  const id = "hg-clip";
  return (
    <S bg={P.V}>
      <defs>
        <clipPath id={id}>
          <path d={glass} />
        </clipPath>
      </defs>
      <g transform={`rotate(${flip.toFixed(3)} 180 180)`}>
        <path d={glass} fill={P.L} opacity={0.22} />
        <g clipPath={`url(#${id})`}>
          {s < 0.999 ? <rect x={100} y={level} width={160} height={180 - level} fill={P.D} /> : null}
          {s > 0.001 ? <path d={`M 96 290 L 96 ${peak + 26} Q 180 ${peak - 18} 264 ${peak + 26} L 264 290 Z`} fill={P.D} /> : null}
          {s > 0.01 && s < 0.99 ? <rect x={178.5} y={178} width={3} height={Math.max(0, peak - 172)} fill={P.D} /> : null}
        </g>
        <path d={glass} fill="none" stroke={P.L} strokeWidth={6} strokeLinejoin="round" />
        <rect x={86} y={52} width={188} height={20} rx={6} fill={P.L} />
        <rect x={86} y={288} width={188} height={20} rx={6} fill={P.L} />
        <rect x={94} y={72} width={8} height={216} fill={P.L} />
        <rect x={258} y={72} width={8} height={216} fill={P.L} />
      </g>
    </S>
  );
};

/** R2C1 · four two-colour discs; every 2 s a wave turns each one half a turn, in a circle */
export const Discs: React.FC<TP> = ({ t, P }) => {
  const C: [number, number][] = [[95, 95], [265, 95], [265, 265], [95, 265]];
  const r = 68;
  return (
    <S bg={P.D}>
      {C.map(([x, y], i) => {
        let a = 0;
        for (let k = 0; k < 4; k++) a += 180 * ease.outBack(clamp((loop(t, 8) - (2 * k + 0.4 + 0.16 * i)) / 0.55));
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(a + 45 * i).toFixed(3)})`}>
            <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z`} fill={P.V} />
            <path d={`M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0 Z`} fill={P.L} />
            <circle r={9} fill={P.D} />
          </g>
        );
      })}
    </S>
  );
};

/** R2C3 · three vertical switches flipping on and off (four flips each, so every one ends where it began) */
export const Toggles: React.FC<TP> = ({ t, P }) => {
  const T: number[][] = [[0.3, 2.3, 4.3, 6.3], [0.6, 1.6, 4.9, 6.0], [0.9, 3.0, 5.2, 7.1]];
  const start = [0, 1, 0];
  const tl = loop(t, 8);
  return (
    <S bg={P.L}>
      {[90, 180, 270].map((x, i) => {
        // walk the flips in order: inside a flip, ease from the current state to the other one (with overshoot)
        let cur = start[i], on = cur;
        for (const a of T[i]) {
          if (tl < a) break;
          const u = clamp((tl - a) / 0.32);
          if (u < 1) {
            on = mix(cur, 1 - cur, ease.outBack(u));
            break;
          }
          cur = 1 - cur;
          on = cur;
        }
        const k = clamp(on);
        const y = mix(244, 116, on);
        return (
          <g key={i}>
            <rect x={x - 34} y={72} width={68} height={216} rx={34} fill={P.D} />
            <rect x={x - 34} y={72} width={68} height={216} rx={34} fill={P.V} opacity={k} />
            <circle cx={x} cy={y} r={26} fill={P.L} />
          </g>
        );
      })}
    </S>
  );
};

/** R3C1 · four waves that flow and breathe */
export const Waves: React.FC<TP> = ({ t, P }) => {
  const cols = [P.L, P.D, P.L, P.D];
  const cyc = [2, -3, 3, -2];
  return (
    <S bg={P.V}>
      {[90, 150, 210, 270].map((y0, i) => {
        const A = 16 + 7 * Math.sin((2 * Math.PI * loop(t, 4)) / 4 + i * 0.8);
        const ph = (2 * Math.PI * cyc[i] * loop(t, 8)) / 8;
        const pts: string[] = [];
        for (let k = 0; k <= 60; k++) {
          const x = 32 + (296 * k) / 60;
          pts.push(`${x.toFixed(1)} ${(y0 + A * Math.sin((2 * Math.PI * (x - 32)) / 148 - ph)).toFixed(2)}`);
        }
        return <path key={i} d={`M ${pts.join(" L ")}`} fill="none" stroke={cols[i]} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </S>
  );
};

/** R3C2 · a cube tumbles up an endless staircase (one step a second; the stairs slide so it stays in frame) */
export const Stairs: React.FC<TP> = ({ t, P }) => {
  const w = 78, h = 52, s = 54;
  const tl = loop(t, 8), k = Math.floor(tl), u = tl - k;
  const c = ease.inOut(clamp(u / 0.55));
  const cam = k + ease.inOut(clamp((u - 0.12) / 0.8));
  const sx = (x: number) => x - cam * w + 141;
  const sy = (y: number) => y + cam * h + 262;
  const pts: string[] = [];
  for (let j = k - 6; j <= k + 7; j++) {
    pts.push(`${sx(j * w).toFixed(1)} ${sy(-j * h).toFixed(1)}`, `${sx((j + 1) * w).toFixed(1)} ${sy(-j * h).toFixed(1)}`);
  }
  const stairs = `M ${sx((k - 6) * w).toFixed(1)} 400 L ${pts.join(" L ")} L ${sx((k + 8) * w).toFixed(1)} 400 Z`;
  const land = clamp((u - 0.55) / 0.12) * (1 - clamp((u - 0.67) / 0.18));
  const cxw = (k + c) * w + w / 2, cyw = -(k + c) * h - s / 2 - 54 * Math.sin(Math.PI * c);
  const rot = 90 * (k + c);
  return (
    <S bg={P.L}>
      <path d={stairs} fill={P.D} />
      <g transform={`translate(${sx(cxw).toFixed(2)} ${(sy(cyw) + 3 * land).toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${(1 + 0.08 * land).toFixed(3)} ${(1 - 0.08 * land).toFixed(3)})`}>
        <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={5} fill={P.V} />
        <rect x={-s / 2 + 9} y={-s / 2 + 9} width={17} height={17} rx={4} fill={P.L} />
      </g>
    </S>
  );
};

/** R3C3 · a pendulum: a ring pulses at each end of the swing, and the dots below light as the bob passes */
export const Pendulum: React.FC<TP> = ({ t, P }) => {
  const piv: [number, number] = [180, 44], Lr = 206, max = 42;
  const tl = loop(t, 8);
  const th = max * Math.cos(Math.PI * tl);
  const rad = (d: number) => (d * Math.PI) / 180;
  const bob: [number, number] = [piv[0] + Lr * Math.sin(rad(th)), piv[1] + Lr * Math.cos(rad(th))];
  const ext = Math.round(tl), since = tl - ext;
  const ringP = since >= 0 && since < 0.55 ? since / 0.55 : -1;
  const at = (n: number): [number, number] => {
    const a = max * Math.cos(Math.PI * n);
    return [piv[0] + Lr * Math.sin(rad(a)), piv[1] + Lr * Math.cos(rad(a))];
  };
  const rc = ringP >= 0 ? at(ext) : bob;
  return (
    <S bg={P.D}>
      <path d={`M ${piv[0] + 236 * Math.sin(rad(-44))} ${piv[1] + 236 * Math.cos(rad(-44))} A 236 236 0 0 0 ${piv[0] + 236 * Math.sin(rad(44))} ${piv[1] + 236 * Math.cos(rad(44))}`} fill="none" stroke={P.L} strokeOpacity={0.14} strokeWidth={2} />
      {[-30, -15, 0, 15, 30].map((a, i) => {
        const g = Math.exp(-((th - a) * (th - a)) / (2 * 5 * 5));
        const x = piv[0] + 246 * Math.sin(rad(a)), y = piv[1] + 246 * Math.cos(rad(a));
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={9} fill={P.L} opacity={0.22} />
            <circle cx={x} cy={y} r={9 + 3 * g} fill={P.V} opacity={g} />
          </g>
        );
      })}
      {ringP >= 0 ? <circle cx={rc[0]} cy={rc[1]} r={mix(28, 74, ease.out(ringP))} fill="none" stroke={P.L} strokeWidth={mix(6, 1, ringP)} opacity={1 - ringP} /> : null}
      <line x1={piv[0]} y1={piv[1]} x2={bob[0]} y2={bob[1]} stroke={P.L} strokeWidth={6} strokeLinecap="round" />
      <circle cx={piv[0]} cy={piv[1]} r={10} fill={P.L} />
      <circle cx={bob[0]} cy={bob[1]} r={28} fill={P.V} />
      <circle cx={bob[0]} cy={bob[1]} r={9} fill={P.L} />
    </S>
  );
};
