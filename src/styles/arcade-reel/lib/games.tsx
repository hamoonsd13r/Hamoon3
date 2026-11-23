// Arcade Reel · two code-drawn «gameplay» plates for the demo (no footage ships with the kit): a synthwave racer
// (sun, mountains, a neon grid, a road with moving dashes, a sports car from behind) and a space shooter (starfield,
// a ship that strafes and fires, an enemy formation that explodes on given times). Pure functions of t, 1080×1920.
// The rectangles in RACER / SHOOTER are where things sit on screen, for callouts.
import React from "react";
import { C, accentA, clamp, rng } from "./theme";

export const RACER = { car: { x: 300, y: 1490, w: 480, h: 250 }, road: { x: 150, y: 960, w: 780, h: 330 }, horizon: 840 };
export const SHOOTER = { enemies: { x: 170, y: 330, w: 740, h: 360 }, ship: { x: 400, y: 1400, w: 280, h: 260 } };

const HZ = RACER.horizon;
export const RacerPlate: React.FC<{ t: number; speed?: number }> = ({ t, speed = 1 }) => {
  const drive = t * 3.2 * speed;
  const sway = 16 * Math.sin(t * 1.3);
  const rows = Array.from({ length: 16 }, (_, i) => {
    const z = ((i - (drive % 1)) / 16) * 1 + 0.02;
    return HZ + 1080 * (1 / (1 / z + 0.4)) * 0.85;
  });
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="arSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E0418" />
          <stop offset="0.55" stopColor="#3A0D4C" />
          <stop offset="1" stopColor="#FF5A36" />
        </linearGradient>
        <linearGradient id="arSun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="1" stopColor="#FF2E6E" />
        </linearGradient>
        <clipPath id="arSunC">
          <circle cx={540} cy={HZ - 120} r={240} />
        </clipPath>
        <linearGradient id="arGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B0726" />
          <stop offset="1" stopColor="#07030C" />
        </linearGradient>
      </defs>
      <rect width={1080} height={HZ} fill="url(#arSky)" />
      <g clipPath="url(#arSunC)">
        <rect x={300} y={HZ - 360} width={480} height={480} fill="url(#arSun)" />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x={300} y={HZ - 170 + i * 30 + ((t * 18) % 30)} width={480} height={4 + i * 2.2} fill="#3A0D4C" />
        ))}
      </g>
      <polygon points={`0,${HZ} 120,${HZ - 150} 230,${HZ - 70} 360,${HZ - 200} 470,${HZ - 90} 520,${HZ} `} fill="#2A0A3A" />
      <polygon points={`560,${HZ} 660,${HZ - 120} 760,${HZ - 210} 880,${HZ - 80} 980,${HZ - 170} 1080,${HZ - 60} 1080,${HZ}`} fill="#240833" />
      <rect y={HZ} width={1080} height={1920 - HZ} fill="url(#arGround)" />
      {/* the neon grid: rows come at the lens, columns converge to the vanishing point */}
      <g stroke="#FF3D9A" strokeOpacity={0.45} strokeWidth={2}>
        {rows.filter((y) => y > HZ && y < 1920).map((y, i) => <line key={i} x1={0} x2={1080} y1={y} y2={y} strokeOpacity={0.15 + 0.5 * ((y - HZ) / (1920 - HZ))} />)}
        {Array.from({ length: 17 }, (_, i) => i - 8).map((k) => <line key={`v${k}`} x1={540 + k * 20} y1={HZ} x2={540 + k * 300} y2={1920} />)}
      </g>
      {/* the road */}
      <polygon points={`505,${HZ} 575,${HZ} 1010,1920 70,1920`} fill="#120C18" />
      <line x1={505} y1={HZ} x2={70} y2={1920} stroke={C.accent} strokeWidth={6} style={{ filter: `drop-shadow(0 0 10px ${accentA(0.9)})` }} />
      <line x1={575} y1={HZ} x2={1010} y2={1920} stroke={C.accent} strokeWidth={6} style={{ filter: `drop-shadow(0 0 10px ${accentA(0.9)})` }} />
      {Array.from({ length: 10 }, (_, i) => {
        const z0 = ((i + (drive % 1)) / 10) ** 2.2, z1 = ((i + 0.45 + (drive % 1)) / 10) ** 2.2;
        const y0 = HZ + (1920 - HZ) * z0, y1 = HZ + (1920 - HZ) * Math.min(1, z1);
        return <line key={i} x1={540} x2={540} y1={y0} y2={y1} stroke="#F2E9FF" strokeWidth={2 + 16 * z0} strokeOpacity={0.85} />;
      })}
      {/* speed streaks */}
      {Array.from({ length: 14 }, (_, i) => {
        const r = rng(i + 3);
        const side = r() > 0.5 ? 1 : -1;
        const p = ((t * (1.2 + r()) * speed + r()) % 1) ** 2;
        const x = 540 + side * (120 + 560 * p), y = HZ + 40 + 900 * p;
        return <line key={`s${i}`} x1={x} y1={y} x2={x + side * 60 * p} y2={y + 90 * p} stroke="#fff" strokeOpacity={0.35 * p} strokeWidth={3} />;
      })}
      {/* the car, from behind */}
      <g transform={`translate(${540 + sway} 1610)`}>
        <ellipse cx={0} cy={118} rx={250} ry={26} fill="rgba(0,0,0,.6)" />
        <rect x={-235} y={60} width={78} height={70} rx={14} fill="#050407" />
        <rect x={157} y={60} width={78} height={70} rx={14} fill="#050407" />
        <path d="M-230 70 Q-240 -10 -170 -30 L170 -30 Q240 -10 230 70 Q230 108 190 112 L-190 112 Q-230 108 -230 70 Z" fill="#1A1622" />
        <path d="M-150 -30 L-110 -120 Q-100 -134 -80 -134 L80 -134 Q100 -134 110 -120 L150 -30 Z" fill="#0F0C15" />
        <path d="M-120 -40 L-92 -110 L92 -110 L120 -40 Z" fill="#2B2440" opacity={0.9} />
        <rect x={-215} y={0} width={430} height={30} rx={10} fill={C.accent} style={{ filter: `drop-shadow(0 0 18px ${accentA(1)})` }} />
        <rect x={-200} y={6} width={400} height={8} rx={4} fill={C.accentHot} />
        <rect x={-70} y={50} width={140} height={40} rx={6} fill="#0B0910" stroke="#3A3446" strokeWidth={2} />
        <circle cx={-150} cy={100} r={10} fill="#2A2530" />
        <circle cx={150} cy={100} r={10} fill="#2A2530" />
      </g>
    </svg>
  );
};

export const ShooterPlate: React.FC<{ t: number; kills?: number[] }> = ({ t, kills = [] }) => {
  const stars = (layer: number, n: number, v: number, r: number) =>
    Array.from({ length: n }, (_, i) => {
      const g = rng(layer * 1000 + i);
      const x = g() * 1080, y = (g() * 1920 + t * v) % 1920;
      return <circle key={`${layer}-${i}`} cx={x} cy={y} r={r * (0.6 + g() * 0.8)} fill="#fff" opacity={0.25 + 0.6 * g()} />;
    });
  const sx = 540 + 150 * Math.sin(t * 1.1);
  const enemies = Array.from({ length: 15 }, (_, i) => {
    const c = i % 5, r = Math.floor(i / 5);
    const x = 250 + c * 145 + 30 * Math.sin(t * 1.6 + r), y = 420 + r * 110 + 10 * Math.sin(t * 2.2 + c);
    return { x, y, killAt: kills[i] };
  });
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="arNeb" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3B1C6B" stopOpacity={0.7} />
          <stop offset="1" stopColor="#05060F" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1080} height={1920} fill="#05060F" />
      <rect width={1080} height={1920} fill="url(#arNeb)" />
      {stars(1, 90, 60, 1.4)}
      {stars(2, 50, 160, 2)}
      {stars(3, 22, 380, 2.8)}
      {/* lasers */}
      {Array.from({ length: 6 }, (_, i) => {
        const age = ((t * 4 + i / 6) % 1);
        const x0 = 540 + 150 * Math.sin((t - age / 4) * 1.1);
        const y = 1430 - age * 1300;
        return <line key={`l${i}`} x1={x0} x2={x0} y1={y} y2={y - 70} stroke={C.accentHot} strokeWidth={6} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${accentA(1)})` }} />;
      })}
      {/* enemies */}
      {enemies.map((e, i) => {
        const dead = e.killAt !== undefined && t >= e.killAt;
        const since = dead ? t - (e.killAt as number) : 0;
        if (dead && since > 0.5) return null;
        return dead ? (
          <g key={i}>
            <circle cx={e.x} cy={e.y} r={20 + 160 * since} fill="none" stroke={C.accentHot} strokeWidth={8 * (1 - since * 2)} opacity={1 - since * 2} />
            <circle cx={e.x} cy={e.y} r={50 * (1 - since * 2)} fill={C.accent} opacity={clamp(1 - since * 2)} />
          </g>
        ) : (
          <g key={i} transform={`translate(${e.x} ${e.y})`}>
            <ellipse cx={0} cy={0} rx={48} ry={18} fill="#6E6A86" />
            <ellipse cx={0} cy={-10} rx={22} ry={16} fill="#B9F" opacity={0.85} />
            <circle cx={-26} cy={4} r={4} fill={C.accent} />
            <circle cx={0} cy={6} r={4} fill={C.accent} />
            <circle cx={26} cy={4} r={4} fill={C.accent} />
          </g>
        );
      })}
      {/* the ship */}
      <g transform={`translate(${sx} 1520)`}>
        <path d={`M0 ${-40 - 30 * Math.abs(Math.sin(t * 30))} L-18 40 L18 40 Z`} fill={C.accentHot} opacity={0.0} />
        <path d="M-16 70 L0 120 L16 70 Z" fill={C.accent} opacity={0.6 + 0.4 * Math.abs(Math.sin(t * 40))} style={{ filter: `drop-shadow(0 0 16px ${accentA(1)})` }} />
        <path d="M0 -110 L60 60 L0 30 L-60 60 Z" fill="#E7E5F2" />
        <path d="M0 -110 L22 -10 L0 0 L-22 -10 Z" fill="#7C8CFF" />
        <path d="M-60 60 L-120 90 L-50 30 Z" fill="#C9C6DA" />
        <path d="M60 60 L120 90 L50 30 Z" fill="#C9C6DA" />
      </g>
    </svg>
  );
};
