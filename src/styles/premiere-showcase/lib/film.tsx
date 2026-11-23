// Premiere Showcase · a film on screen. `FilmView` plays YOUR film (a muted clip from public/, started at film time
// t0) or, when a film has no `src`, an animated scene drawn in code (the demo's eight «films»: dusk, city, sea,
// space, rain, neon, forest, desert), so the style runs with no footage at all.
import React from "react";
import { OffthreadVideo, Sequence, staticFile } from "remotion";
import { FPS, hash, useTF } from "./theme";

export type Film = {
  id: string;
  /** native size of the film (decides portrait / landscape / square screens) */ w: number; h: number;
  /** running time of the whole film (s) — shown on its chip and summed on the wall */ dur: number;
  label: string;
  /** your clip (public path) and where to start in it */ src?: string; from?: number;
  /** the demo's code scene */ kind?: number; hue?: number;
};

/** a muted clip that plays from its start at film time t0 (right in the render and in Look stills) */
const Clip: React.FC<{ src: string; t0: number; from?: number; rate?: number }> = ({ src, t0, from = 0, rate = 1 }) => {
  const { t, frame } = useTF();
  return (
    <Sequence from={frame - Math.round((t - t0) * FPS)} layout="none">
      <OffthreadVideo src={staticFile(src)} muted playbackRate={rate} trimBefore={Math.round(from * FPS)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", maxWidth: "none" }} />
    </Sequence>
  );
};

/** one of eight living code scenes; lt = local time (s) */
export const Scene: React.FC<{ kind: number; hue: number; lt: number; land?: boolean }> = ({ kind, hue, lt, land }) => {
  const W = land ? 1920 : 1080, H = land ? 1080 : 1920;
  const id = `sc${kind}-${hue}-${land ? 1 : 0}`;
  const sky = (a: string, b: string) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
    </>
  );
  const ridge = (y: number, amp: number, seed: number, fill: string, dx: number) => {
    let d = `M${-200 + dx} ${H}`;
    for (let i = 0; i <= 14; i++) {
      const x = -200 + dx + (i * (W + 400)) / 14;
      d += ` L${x.toFixed(0)} ${(y - amp * (0.4 + 0.6 * hash(seed + i * 3.1))).toFixed(0)}`;
    }
    return <path d={`${d} L${W + 200 + dx} ${H} Z`} fill={fill} />;
  };
  const k = kind % 8;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, display: "block" }}>
      {k === 0 ? (
        <>
          {sky(`hsl(${hue} 55% 22%)`, `hsl(${hue + 25} 75% 62%)`)}
          <circle cx={W * 0.62} cy={H * 0.5 + lt * 18} r={H * 0.07} fill={`hsl(${hue + 40} 95% 82%)`} />
          {ridge(H * 0.62, H * 0.16, hue, `hsl(${hue} 30% 22%)`, -lt * 8)}
          {ridge(H * 0.74, H * 0.12, hue + 9, `hsl(${hue} 30% 13%)`, -lt * 22)}
          {ridge(H * 0.86, H * 0.08, hue + 17, `hsl(${hue} 30% 7%)`, -lt * 46)}
        </>
      ) : k === 1 ? (
        <>
          {sky("#070a18", `hsl(${hue} 45% 18%)`)}
          {Array.from({ length: 14 }, (_, i) => {
            const bw = W / 14, bh = H * (0.25 + 0.4 * hash(i * 2.3 + hue));
            return <rect key={i} x={i * bw + 3} y={H * 0.82 - bh} width={bw - 6} height={bh} fill={`hsl(${hue} 25% ${9 + (i % 3) * 3}%)`} />;
          })}
          {Array.from({ length: 90 }, (_, i) => {
            const on = hash(i * 7.7 + Math.floor(lt * 2 + hash(i) * 5)) > 0.35;
            const bx = (i % 14) * (W / 14) + 14 + ((i * 13) % 3) * 22, by = H * 0.8 - 30 - ((i * 53) % 11) * 46;
            return on ? <rect key={`w${i}`} x={bx} y={by} width={12} height={18} fill="#FFD98A" opacity={0.85} /> : null;
          })}
          <rect y={H * 0.82} width={W} height={H * 0.18} fill="#06070c" />
          {Array.from({ length: 6 }, (_, i) => {
            const x = ((lt * (380 + i * 60) + i * 400) % (W + 600)) - 300;
            return <rect key={`c${i}`} x={i % 2 ? W - x : x} y={H * 0.86 + (i % 3) * 30} width={240} height={6} rx={3} fill={i % 2 ? "#ff5a4a" : "#fff2c8"} opacity={0.85} />;
          })}
        </>
      ) : k === 2 ? (
        <>
          {sky(`hsl(${hue} 60% 30%)`, `hsl(${hue + 30} 80% 70%)`)}
          <circle cx={W * 0.5} cy={H * 0.48} r={H * 0.09} fill={`hsl(${hue + 45} 100% 85%)`} opacity={0.95} />
          {Array.from({ length: 7 }, (_, i) => {
            const y = H * 0.55 + i * i * H * 0.009;
            let d = `M0 ${H}`;
            for (let x = 0; x <= W + 40; x += 40) d += ` L${x} ${(y + 10 * (1 + i * 0.4) * Math.sin(x * 0.012 - lt * (1.2 + i * 0.3) + i)).toFixed(1)}`;
            return <path key={i} d={`${d} L${W} ${H} Z`} fill={`hsl(${hue + 190} 45% ${30 - i * 3}%)`} opacity={0.92} />;
          })}
        </>
      ) : k === 3 ? (
        <>
          {sky("#02030a", `hsl(${hue} 50% 12%)`)}
          {Array.from({ length: 140 }, (_, i) => (
            <circle key={i} cx={((hash(i) * W + lt * 12 * (1 + hash(i * 3))) % W).toFixed(0)} cy={(hash(i * 2.1) * H).toFixed(0)} r={hash(i * 5) * 2.4 + 0.6} fill="#fff" opacity={0.3 + 0.7 * hash(i * 9 + Math.floor(lt * 3))} />
          ))}
          <g transform={`translate(${W * 0.55} ${H * 0.5}) rotate(${-18 + lt * 3})`}>
            <circle r={H * 0.13} fill={`hsl(${hue + 20} 55% 45%)`} />
            <ellipse rx={H * 0.24} ry={H * 0.04} fill="none" stroke={`hsl(${hue + 40} 70% 78%)`} strokeWidth={10} opacity={0.75} />
          </g>
          <line x1={W * 0.1 + lt * 60} y1={H * 0.2 + lt * 30} x2={W * 0.1 + lt * 60 - 200} y2={H * 0.2 + lt * 30 - 100} stroke="#fff" strokeWidth={4} opacity={0.6} />
        </>
      ) : k === 4 ? (
        <>
          {sky("#081320", `hsl(${hue} 40% 16%)`)}
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={hash(i * 3) * W} cy={hash(i * 4) * H} r={40 + hash(i) * 90} fill={i % 2 ? "#ffb35c" : "#7fc9ff"} opacity={0.12 + 0.1 * hash(i * 9)} />
          ))}
          {Array.from({ length: 70 }, (_, i) => {
            const y = ((hash(i * 1.3) * H + lt * (900 + hash(i) * 600)) % (H + 200)) - 100;
            return <line key={`r${i}`} x1={hash(i * 2.7) * W} y1={y} x2={hash(i * 2.7) * W - 10} y2={y + 70} stroke="#cfe8ff" strokeWidth={2.5} opacity={0.5} />;
          })}
        </>
      ) : k === 5 ? (
        <>
          {sky(`hsl(${hue} 70% 12%)`, `hsl(${hue + 60} 70% 22%)`)}
          {Array.from({ length: 9 }, (_, i) => {
            const x = ((i * W) / 6 + lt * (220 + i * 30)) % (W + 400) - 200;
            return <rect key={i} x={x} y={-200} width={70 + 40 * hash(i)} height={H + 400} fill={`hsl(${hue + i * 24} 90% 60%)`} opacity={0.32} transform={`rotate(14 ${W / 2} ${H / 2})`} />;
          })}
          <circle cx={W / 2} cy={H / 2} r={H * (0.16 + 0.02 * Math.sin(lt * 8))} fill="none" stroke="#fff" strokeWidth={8} opacity={0.5} />
        </>
      ) : k === 6 ? (
        <>
          {sky(`hsl(${hue} 30% 70%)`, `hsl(${hue} 25% 30%)`)}
          {[0, 1, 2].map((l) =>
            Array.from({ length: 12 }, (_, i) => {
              const x = ((i * W) / 9 + l * 70 - lt * (10 + l * 18)) % (W + 300) - 150, s = 0.6 + l * 0.35;
              return <path key={`${l}-${i}`} d={`M${x} ${H * (0.62 + l * 0.12)} l${60 * s} ${-260 * s} l${60 * s} ${260 * s} Z`} fill={`hsl(${hue + 100} 25% ${32 - l * 10}%)`} />;
            }),
          )}
          <rect y={H * 0.5} width={W} height={H * 0.2} fill="#fff" opacity={0.12 + 0.05 * Math.sin(lt)} />
        </>
      ) : (
        <>
          {sky(`hsl(${hue} 60% 55%)`, `hsl(${hue + 20} 80% 78%)`)}
          <circle cx={W * (0.3 + lt * 0.01)} cy={H * 0.36} r={H * 0.06} fill="#fff7dc" />
          {ridge(H * 0.7, H * 0.06, hue + 5, `hsl(${hue + 10} 55% 52%)`, -lt * 12)}
          {ridge(H * 0.82, H * 0.07, hue + 13, `hsl(${hue + 5} 55% 40%)`, -lt * 30)}
        </>
      )}
    </svg>
  );
};

/** a film inside any box: your clip if it has `src`, else its code scene; `t0` = when it starts on screen */
export const FilmView: React.FC<{ film: Film; t0: number; rate?: number }> = ({ film, t0, rate }) => {
  const { t } = useTF();
  if (film.src) return <Clip src={film.src} t0={t0} from={film.from} rate={rate} />;
  return <Scene kind={film.kind ?? 0} hue={film.hue ?? 20} lt={Math.max(0, t - t0) + (film.from ?? 0)} land={film.w > film.h} />;
};
