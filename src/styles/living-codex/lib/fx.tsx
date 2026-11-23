// Living Codex · light and atmosphere: rising embers, floating motes, stars, glows, vignette, a highlight sweep over
// text, a popping dot, small tracked labels and a thin frame with corner ticks. All deterministic in t.
import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { C, F, backOut, clamp, hexA, lerp, rng, wob } from "./theme";


// ── particles ───────────────────────────────────────────────────────────────────────────────────
type Box = [number, number, number, number];

/** rising sparks/embers (deterministic in t) */
export const Embers: React.FC<{ t: number; n?: number; seed?: number; box?: Box; rise?: number; size?: number; color?: string; opacity?: number; drift?: number; blend?: React.CSSProperties["mixBlendMode"] }> =
  ({ t, n = 40, seed = 1, box = [0, 200, 1920, 1080], rise = 80, size = 2.4, color = C.ember, opacity = 1, drift = 40, blend = "screen" }) => {
    const ps = useMemo(() => Array.from({ length: n }, (_, i) => {
      const r = rng(seed * 977 + i * 13);
      return { x: r(), y: r(), life: 3 + r() * 5, off: r() * 20, sp: 0.5 + r() * 0.9, ph: r() * 6.28, s: 0.5 + r(), fl: 3 + r() * 6 };
    }), [n, seed]);
    const [x0, y0, x1, y1] = box;
    const gid = `embA${seed}`;
    return (
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: blend, pointerEvents: "none" }}>
        <defs>
          <radialGradient id={gid}>
            <stop offset="0" stopColor="#fff4d0" />
            <stop offset="0.28" stopColor={color} stopOpacity="0.9" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        {ps.map((p, i) => {
          const age = (((t + p.off) % p.life) + p.life) % p.life;
          const k = age / p.life;
          const x = x0 + p.x * (x1 - x0) + Math.sin(age * 0.9 + p.ph) * drift * k + wob(t * 0.3 + i, i) * 8;
          const y = y1 - p.y * 0.35 * (y1 - y0) - age * rise * p.sp;
          const a = Math.pow(Math.sin(Math.PI * k), 1.2) * (0.55 + 0.45 * Math.sin(t * p.fl + p.ph)) * opacity;
          const r = size * p.s * (1 - 0.45 * k);
          if (a <= 0.01 || y < y0 - 40) return null;
          return <circle key={i} cx={x} cy={y} r={r * 3.2} fill={`url(#${gid})`} opacity={a} />;
        })}
      </svg>
    );
  };

/** slow floating dust motes (for light beams and dark rooms) */
export const Motes: React.FC<{ t: number; n?: number; seed?: number; box?: Box; size?: number; color?: string; opacity?: number; speed?: number }> =
  ({ t, n = 50, seed = 3, box = [0, 0, 1920, 1080], size = 1.6, color = C.bone, opacity = 0.5, speed = 1 }) => {
    const ps = useMemo(() => Array.from({ length: n }, (_, i) => {
      const r = rng(seed * 733 + i * 31);
      return { x: r(), y: r(), vx: (r() - 0.5) * 14, vy: -2 - r() * 8, s: 0.4 + r() * 1.2, ph: r() * 6.28, tw: 0.5 + r() * 1.5 };
    }), [n, seed]);
    const [x0, y0, x1, y1] = box;
    const w = x1 - x0, h = y1 - y0;
    return (
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
        {ps.map((p, i) => {
          const x = x0 + ((((p.x * w + p.vx * t * speed + wob(t * 0.2, i) * 20) % w) + w) % w);
          const y = y0 + ((((p.y * h + p.vy * t * speed) % h) + h) % h);
          const a = opacity * (0.45 + 0.55 * Math.sin(t * p.tw + p.ph) ** 2);
          return <circle key={i} cx={x} cy={y} r={size * p.s} fill={color} opacity={a} />;
        })}
      </svg>
    );
  };

/** twinkling star field */
export const Stars: React.FC<{ t: number; n?: number; seed?: number; opacity?: number; box?: Box; color?: string; scale?: number }> =
  ({ t, n = 220, seed = 7, opacity = 1, box = [0, 0, 1920, 1080], color = "#dfe6f2", scale = 1 }) => {
    const ps = useMemo(() => Array.from({ length: n }, (_, i) => {
      const r = rng(seed * 401 + i * 7);
      const big = r() < 0.08;
      return { x: r(), y: r(), s: big ? 1.3 + r() * 1.2 : 0.4 + r() * 0.8, a: 0.25 + r() * 0.75, tw: 0.6 + r() * 2.4, ph: r() * 6.28, big };
    }), [n, seed]);
    const [x0, y0, x1, y1] = box;
    return (
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
        {ps.map((p, i) => {
          const a = opacity * p.a * (0.6 + 0.4 * Math.sin(t * p.tw + p.ph));
          const x = x0 + p.x * (x1 - x0), y = y0 + p.y * (y1 - y0);
          return (
            <g key={i} opacity={a}>
              <circle cx={x} cy={y} r={p.s * scale} fill={color} />
              {p.big && <circle cx={x} cy={y} r={p.s * 4 * scale} fill={color} opacity={0.12} />}
            </g>
          );
        })}
      </svg>
    );
  };

// ── light ───────────────────────────────────────────────────────────────────────────────────────
/** a soft radial pool of light */
export const Glow: React.FC<{ x: number; y: number; r: number; color?: string; a?: number; blend?: React.CSSProperties["mixBlendMode"]; sy?: number }> =
  ({ x, y, r, color = C.amber, a = 0.5, blend = "screen", sy = 1 }) => (
    <div style={{ position: "absolute", left: x - r, top: y - r * sy, width: r * 2, height: r * 2 * sy, borderRadius: "50%", pointerEvents: "none",
      background: `radial-gradient(closest-side, ${color} 0%, ${hexA(color, 0.35)} 45%, ${hexA(color, 0)} 100%)`, opacity: a, mixBlendMode: blend }} />
  );

/** darkening from the edges (a local vignette on top of the film grade) */
export const Vignette: React.FC<{ a?: number; inner?: number }> = ({ a = 0.6, inner = 45 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 46%, rgba(4,5,9,0) ${inner}%, rgba(4,5,9,${a}) 100%)` }} />
);

/** text that gets a moving highlight sweep (a masked copy, not background-clip) */
export const Sweep: React.FC<{ children: React.ReactNode; p: number; style?: React.CSSProperties; color?: string; width?: number }> =
  ({ children, p, style, color = "#fff6dc", width = 18 }) => {
    const pos = lerp(-width, 100 + width, clamp(p));
    const m = `linear-gradient(100deg, transparent ${pos - width}%, #000 ${pos}%, transparent ${pos + width}%)`;
    return (
      <div style={{ position: "relative", ...style }}>
        <div>{children}</div>
        {p > 0 && p < 1 && (
          <div style={{ position: "absolute", inset: 0, color, WebkitMaskImage: m, maskImage: m, textShadow: `0 0 18px ${hexA(C.amber, 0.8)}` }}>{children}</div>
        )}
      </div>
    );
  };

/** a marker that pops in: scale 0.8 → 1 with a glow burst (0.4 s), then breathes */
export const PopDot: React.FC<{ x: number; y: number; t0: number; T: number; r?: number; color?: string }> = ({ x, y, t0, T, r = 6, color = C.amber }) => {
  const k = clamp((T - t0) / 0.4);
  if (k <= 0) return null;
  const s = 0.8 + 0.2 * backOut(k, 2.2);
  const burst = Math.exp(-Math.max(0, T - t0) * 3);
  const breathe = 0.75 + 0.25 * Math.sin((T - t0) * 3.2);
  return (
    <g opacity={clamp(k * 2)}>
      <circle cx={x} cy={y} r={r * 3.2 * s} fill={color} opacity={0.18 * breathe + 0.45 * burst} style={{ filter: "blur(6px)" }} />
      <circle cx={x} cy={y} r={r * s} fill={color} />
      <circle cx={x} cy={y} r={r * 0.45 * s} fill="#fff4dc" />
      <circle cx={x} cy={y} r={r + 26 * k} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.8 * (1 - k)} />
    </g>
  );
};

// ── small typographic pieces ───────────────────────────────────────────────────────────────────
export const Lbl: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; a?: number; align?: "left" | "center" | "right"; track?: number; font?: string; style?: React.CSSProperties }> =
  ({ x, y, children, size = 22, color = C.bone, a = 1, align = "left", track = 0.22, font = F.label, style }) => (
    <div style={{ position: "absolute", left: align === "left" ? x : align === "center" ? x - 1000 : x - 2000, top: y, width: align === "left" ? undefined : align === "center" ? 2000 : 2000,
      textAlign: align, fontFamily: font, fontSize: size, color, opacity: a, letterSpacing: `${track}em`, textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1, ...style }}>
      {children}
    </div>
  );

/** thin bone frame with corner ticks (museum plate) */
export const Frame: React.FC<{ x: number; y: number; w: number; h: number; a?: number; color?: string; tick?: number }> = ({ x, y, w, h, a = 1, color = C.bone, tick = 14 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: a, pointerEvents: "none" }}>
    <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1} />
    {[[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].map(([cx, cy, sx, sy], i) => (
      <path key={i} d={`M${cx - sx * 6},${cy + sy * tick} L${cx - sx * 6},${cy - sy * 6} L${cx + sx * tick},${cy - sy * 6}`} fill="none" stroke={color} strokeOpacity={0.8} strokeWidth={1.2} />
    ))}
  </svg>
);
