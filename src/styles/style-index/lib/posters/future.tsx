// 03 · Futuristic — a graphite studio: giant 360° type, the headset wearer rising under it, a precise HUD that locks
// onto the visor with callouts, a scan line, one electric accent.
import React from "react";
import { F, PH, PW, ease, hash, mix, noise1, ramp, tween } from "../theme";
import { Img } from "remotion";
import { Frame, Grain, Letters, ar, img, type PosterProps } from "../kit";

const BG0 = "#24272D", BG1 = "#0A0B0E", INK = "#ECEFF4", BLUE = "#3D7BFF";
// the wearer (FUT-01, trimmed): 780 wide; the visor's centre in image px
const FW = 780, FH = FW * ar("FUT-01"), FX = -40, VX = 980, VY = 330, K = FW / 1536;

export const Future: React.FC<PosterProps> = ({ t }) => {
  const rise = tween(t, 0, 0.5, ease.expo);
  // she rises, then keeps a slow float upward (parallax against the type, which drifts less)
  const fy = 300 + (1 - rise) * 140 + Math.sin(t * 1.4) * 4 - ramp(t, 0.5, 6) * 26;
  const push = 1 + 0.045 * ramp(t, 0.3, 6); // a slow push-in on the visor, the whole poster
  const vx = FX + VX * K, vy = fy + VY * K; // the visor, on the poster
  const lock = tween(t, 0.2, 0.6, ease.expo);
  const scan = fy + 120 + ((t * 0.42) % 1) * 820;
  // a scan sweeping down across the visor every 0.9 s
  const vs = ((t - 0.5) % 0.9 + 0.9) % 0.9 / 0.9, vsOn = t > 0.5 ? Math.sin(Math.PI * vs) : 0;
  // live telemetry
  const lat = (4.2 + noise1(t * 3, 1) * 0.4).toFixed(1), fps = Math.round(90 + noise1(t * 2, 2) * 3);
  const call = (a: number) => tween(t, a, a + 0.3, ease.expo);
  const CALLS: [string, string, number, number, number, number][] = [
    ["VISOR", "HOLO-OLED", 30, 470, vx - 150, vy - 30],
    ["FIELD", `120° / ${fps}Hz`, 30, 598, vx - 140, vy + 40],
    ["LATENCY", `${lat} ms`, 30, 726, vx - 60, vy + 150],
  ];
  return (
    <Frame bg={BG1}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "62% 34%" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 55% at 58% 38%, ${BG0} 0%, #15171B 55%, ${BG1} 100%)` }} />
      {/* fine dot grid + horizon line */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(236,239,244,0.10) 1.1px, transparent 1.5px)", backgroundSize: "32px 32px", opacity: tween(t, 0, 0.3) }} />
      {/* giant type behind her */}
      <div style={{ position: "absolute", left: 0, top: 78 - ramp(t, 0.5, 6) * 10, width: PW, textAlign: "center", fontFamily: F.unbounded, fontWeight: 800, fontSize: 212, letterSpacing: "-0.06em", lineHeight: 1, color: INK, textShadow: "0 18px 50px rgba(0,0,0,0.5)" }}>
        <Letters text="360°" t={t} at={0.02} each={0.05} dur={0.34} letter={(u) => ({ opacity: u > 0 ? 1 : 0, transform: `translateY(${(1 - ease.expo(u)) * 150}px)`, filter: `blur(${(1 - u) * 8}px)` })} />
      </div>
      <div style={{ position: "absolute", left: 44, top: 54, fontFamily: F.chakra, fontSize: 17, letterSpacing: "0.3em", color: "rgba(236,239,244,0.7)", opacity: tween(t, 0.2, 0.4) }}>SPATIAL / 01</div>
      <div style={{ position: "absolute", right: 44, top: 54, fontFamily: F.chakra, fontSize: 17, letterSpacing: "0.3em", color: BLUE, opacity: tween(t, 0.26, 0.46) }}>● LIVE</div>
      {/* the wearer */}
      <div style={{ position: "absolute", left: FX, top: fy, width: FW, height: FH, opacity: tween(t, 0, 0.14), filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.6))" }}>
        <Img src={img("FUT-01")} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
      </div>
      {/* HUD locked onto the visor */}
      <svg width={PW} height={PH} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(${vx}, ${vy})`} opacity={lock}>
          <defs>
            <clipPath id="fvisor">
              <ellipse rx={150} ry={72} cx={0} cy={-6} />
            </clipPath>
          </defs>
          <g clipPath="url(#fvisor)" opacity={0.55 * vsOn}>
            <rect x={-160} y={-80 + vs * 150} width={320} height={3} fill="#9FC2FF" />
            <rect x={-160} y={-80 + vs * 150 - 26} width={320} height={26} fill="url(#fscan)" />
          </g>
          <defs>
            <linearGradient id="fscan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3D7BFF" stopOpacity={0} />
              <stop offset="1" stopColor="#3D7BFF" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <ellipse rx={200 * mix(1.4, 1, lock)} ry={118 * mix(1.4, 1, lock)} fill="none" stroke={INK} strokeWidth={1.4} strokeDasharray="3 9" transform={`rotate(${t * 24})`} opacity={0.7} />
          <ellipse rx={224} ry={134} fill="none" stroke={BLUE} strokeWidth={2} strokeDasharray={`${2 * Math.PI * 180 * 0.22 * lock} 2000`} transform={`rotate(${-40 + t * 55})`} />
          <ellipse rx={246} ry={148} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="1 14" transform={`rotate(${-t * 18})`} opacity={0.45 * lock} />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
            <path key={i} d={`M${sx * 150},${sy * 70} l${sx * 26},0 l0,${sy * 18}`} transform={`translate(${sx * 18 * (1 - lock)}, ${sy * 18 * (1 - lock)})`} stroke={INK} strokeWidth={2.4} fill="none" />
          ))}
          <circle r={4} fill={BLUE} />
        </g>
        {CALLS.map(([, , x, y, px, py], i) => {
          const u = call(0.34 + i * 0.08);
          const ex = mix(x + 158, px, u), ey = mix(y + 18, py, u);
          return (
            <g key={i} opacity={u > 0 ? 1 : 0}>
              <line x1={x + 158} y1={y + 18} x2={ex} y2={ey} stroke={INK} strokeWidth={1.2} opacity={0.75} />
              <circle cx={px} cy={py} r={4.5 * u} fill="none" stroke={BLUE} strokeWidth={2} />
            </g>
          );
        })}
        <line x1={0} x2={PW} y1={scan} y2={scan} stroke={BLUE} strokeWidth={1.2} opacity={0.35} />
      </svg>
      {CALLS.map(([k, v, x, y], i) => {
        const u = call(0.34 + i * 0.08);
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, width: 158, opacity: u, transform: `translateX(${(1 - u) * -30}px)` }}>
            <div style={{ fontFamily: F.chakra, fontSize: 15, letterSpacing: "0.32em", color: BLUE }}>{k}</div>
            <div style={{ fontFamily: F.unbounded, fontWeight: 400, fontSize: 17, letterSpacing: "0.01em", color: INK, marginTop: 4, whiteSpace: "nowrap" }}>{v}</div>
            <div style={{ marginTop: 8, height: 1, background: "rgba(236,239,244,0.3)" }} />
          </div>
        );
      })}
      {/* a live signal meter */}
      <div style={{ position: "absolute", left: 30, top: 380, display: "flex", alignItems: "flex-end", gap: 4, height: 40, opacity: tween(t, 0.6, 0.8) }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ width: 8, height: 6 + 32 * Math.abs(noise1(t * 6 + i * 1.7, 5)), background: i % 4 === 0 ? BLUE : "rgba(236,239,244,0.55)" }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 30, top: 428, fontFamily: F.chakra, fontSize: 14, letterSpacing: "0.3em", color: "rgba(236,239,244,0.55)", opacity: tween(t, 0.6, 0.8) }}>SIGNAL {String(Math.floor(hash(Math.floor(t * 8)) * 900 + 100))}</div>
      {/* the floor fades her out into the graphite; the name sits on it */}
      <div style={{ position: "absolute", left: 0, top: 930, width: PW, height: 350, background: `linear-gradient(180deg, rgba(10,11,14,0) 0%, rgba(10,11,14,0.85) 55%, ${BG1} 100%)` }} />
      <div style={{ position: "absolute", left: 0, top: 1118, width: PW, textAlign: "center", fontFamily: F.unbounded, fontWeight: 400, fontSize: 46, letterSpacing: "0.34em", marginLeft: "0.17em", color: INK, opacity: tween(t, 0.3, 0.6) }}>FUTURISTIC</div>
      <div style={{ position: "absolute", left: 160, top: 1190, width: 400 * tween(t, 0.4, 1.2, ease.inOut), height: 2, background: BLUE }} />
      <div style={{ position: "absolute", left: 0, top: 1210, width: PW, textAlign: "center", fontFamily: F.chakra, fontSize: 16, letterSpacing: "0.4em", color: "rgba(236,239,244,0.6)", opacity: tween(t, 0.5, 0.8) }}>
        WEARABLE · SPATIAL · {String(Math.round(mix(0, 2077, tween(t, 0.4, 1.4, ease.out)))).padStart(4, "0")}
      </div>
      </div>
      <Grain t={t} amt={0.06} />
    </Frame>
  );
};
