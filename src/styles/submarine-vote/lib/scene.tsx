// Submarine Vote · the flooding room, all drawn by code: riveted steel walls, a round hatch onto the escape pod with its
// seats, a hazard sign, pipes with a valve, an alarm lamp that sweeps red, and water that rises with a moving front,
// glints and ripples around whoever stands in it. Pure functions of t (1080×1920).
import React from "react";
import { Char, CHAR_TOP, INK, Tag, type Model, type Pose } from "./cast";
import { F, clamp, hash, lerp } from "./theme";

const HX = 540, HY = 555, HR = 250;

/** the room behind the cast; `seats` = how many pod seats are lit, `alarm` 0..1 */
export const Room: React.FC<{ t: number; seats?: number; lit?: number; alarm?: number }> = ({ t, seats = 4, lit = 0, alarm = 1 }) => {
  const sweep = (t * 140) % 360;
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="svWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1C2533" />
          <stop offset="0.6" stopColor="#121A25" />
          <stop offset="1" stopColor="#0A0F16" />
        </linearGradient>
        <radialGradient id="svPod" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#CFE9FF" stopOpacity={0.9} />
          <stop offset="1" stopColor="#2B4B6E" stopOpacity={1} />
        </radialGradient>
        <radialGradient id="svLamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FF3B30" stopOpacity={0.9} />
          <stop offset="1" stopColor="#FF3B30" stopOpacity={0} />
        </radialGradient>
        <clipPath id="svHatch">
          <circle cx={HX} cy={HY} r={HR - 34} />
        </clipPath>
      </defs>
      <rect width={1080} height={1920} fill="url(#svWall)" />
      {/* panels and rivets */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={i * 216} y1={0} x2={i * 216} y2={1920} stroke="#0A0E14" strokeWidth={6} />
      ))}
      {Array.from({ length: 10 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => <circle key={`${r}-${c}`} cx={c * 216 + 18} cy={120 + r * 190} r={6} fill="#2C3949" stroke="#070A0F" strokeWidth={2} />),
      )}
      {/* pipes and a valve wheel */}
      <rect x={0} y={150} width={1080} height={38} fill="#3A2226" stroke={INK} strokeWidth={4} />
      <rect x={0} y={205} width={1080} height={22} fill="#2A3340" stroke={INK} strokeWidth={4} />
      <g transform={`translate(150 410) rotate(${t * 20})`}>
        <circle r={70} fill="none" stroke="#C2342B" strokeWidth={14} />
        {[0, 60, 120].map((a) => <line key={a} x1={-70} y1={0} x2={70} y2={0} stroke="#C2342B" strokeWidth={10} transform={`rotate(${a})`} />)}
        <circle r={16} fill="#8A1F18" />
      </g>
      {/* the hatch onto the pod */}
      <circle cx={HX} cy={HY} r={HR} fill="#3B4656" stroke={INK} strokeWidth={8} />
      <circle cx={HX} cy={HY} r={HR - 22} fill="#566476" stroke={INK} strokeWidth={6} />
      <g clipPath="url(#svHatch)">
        <rect x={HX - HR} y={HY - HR} width={HR * 2} height={HR * 2} fill="url(#svPod)" />
        {Array.from({ length: 4 }, (_, i) => {
          const on = i < seats;
          const x = HX - 165 + i * 110;
          return (
            <g key={i} opacity={on ? 1 : 0.35}>
              <rect x={x - 38} y={HY - 40} width={76} height={120} rx={18} fill={i < lit ? "#FFE08A" : "#1B2B40"} stroke={INK} strokeWidth={5} />
              <rect x={x - 32} y={HY - 92} width={64} height={60} rx={14} fill={i < lit ? "#FFD15C" : "#22344C"} stroke={INK} strokeWidth={5} />
            </g>
          );
        })}
      </g>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={HX + Math.cos(a) * (HR - 11)} cy={HY + Math.sin(a) * (HR - 11)} r={6} fill="#22303F" />;
      })}
      {/* hazard sign */}
      <g transform={`translate(${HX - 170} ${HY + HR + 18})`}>
        <rect width={340} height={70} rx={12} fill="#F5C543" stroke={INK} strokeWidth={5} />
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${i * 40 - 20},70 L${i * 40 + 10},0 L${i * 40 + 30},0 L${i * 40},70 Z`} fill={INK} opacity={0.85} />)}
        <rect x={60} y={10} width={220} height={50} rx={10} fill="#F5C543" />
        <text x={170} y={48} textAnchor="middle" direction="rtl" fontFamily={F.fa} fontSize={34} fill={INK}>{`${"۴"} صندلی`}</text>
      </g>
      {/* the alarm lamp */}
      <g transform="translate(930 330)">
        <rect x={-46} y={-20} width={92} height={40} rx={10} fill="#2A2F38" stroke={INK} strokeWidth={5} />
        <path d="M-36 -20 Q0 -90 36 -20 Z" fill="#E0322A" stroke={INK} strokeWidth={5} opacity={0.6 + 0.4 * pulse * alarm} />
        <g transform={`rotate(${sweep})`} opacity={0.55 * alarm}>
          <path d="M0 -40 L700 -160 L700 80 Z" fill="url(#svLamp)" />
        </g>
      </g>
      <rect width={1080} height={1920} fill="#FF2B2B" opacity={0.07 * alarm * pulse} />
    </svg>
  );
};

/** the water in front of the cast: top at y (screen px), a moving front, glints */
export const Water: React.FC<{ t: number; y: number }> = ({ t, y }) => {
  const pts: string[] = [];
  for (let x = 0; x <= 1080; x += 20) pts.push(`${x},${(y + 10 * Math.sin(x * 0.012 + t * 2.4) + 6 * Math.sin(x * 0.031 - t * 3.1)).toFixed(1)}`);
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="svWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E7DB8" stopOpacity={0.82} />
          <stop offset="0.3" stopColor="#123E66" stopOpacity={0.92} />
          <stop offset="1" stopColor="#06182B" stopOpacity={0.98} />
        </linearGradient>
      </defs>
      <path d={`M0,1920 L${pts.join(" L")} L1080,1920 Z`} fill="url(#svWater)" />
      <polyline points={pts.join(" ")} fill="none" stroke="#BDE6FF" strokeWidth={5} opacity={0.75} />
      {Array.from({ length: 40 }, (_, i) => {
        const x = 1080 * hash(i * 3.1) + ((t * 30 * (hash(i) - 0.5)) % 60);
        const yy = y + 30 + 380 * hash(i * 7.7);
        const a = 0.15 + 0.35 * Math.abs(Math.sin(t * 2 + i));
        return <line key={i} x1={x} y1={yy} x2={x + 26 + 30 * hash(i * 2.2)} y2={yy} stroke="#CFEFFF" strokeWidth={3} strokeLinecap="round" opacity={a} />;
      })}
    </svg>
  );
};

export type Member = { m: Model; name: string; x: number; p: Pose; out?: number; seed?: number };
/** the cast standing in the water: feet at `feet` (below the surface), name tags above */
export const Lineup: React.FC<{ t: number; cast: Member[]; feet: number; s?: number; tags?: number; red?: number }> = ({ t, cast, feet, s = 0.95, tags = 1, red = 0.4 }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {cast.map((c, i) => {
      const o = 1 - clamp(c.out ?? 0);
      if (o <= 0) return null;
      const up = (c.out ?? 0) * 260;
      return (
        <g key={c.m} opacity={o}>
          <Char m={c.m} x={c.x} y={feet - up} s={s * lerp(1, 0.6, c.out ?? 0)} p={c.p} t={t} seed={c.seed ?? i * 3} red={red} cool={0.5} />
          {tags > 0 && <g opacity={tags}><Tag m={c.m} x={c.x} y={feet - up + (CHAR_TOP[c.m] - 20) * s} s={0.9} label={c.name} /></g>}
        </g>
      );
    })}
  </svg>
);
