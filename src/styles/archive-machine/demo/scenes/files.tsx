// Archive Machine · the files: the machine's origin (a supercomputer, mission control), the people in the archive
// (aircrew, a sailor), the wall of protected files, and the directive it cannot parse.
import React from "react";
import { staticFile } from "remotion";
import { Brackets, DataRain, Glitch, Label, ScreenTex, Vid } from "../../lib/hud";
import { C, F, clamp, ease, hash, jolt, mix, ramp, useT } from "../../lib/theme";
import { Plate, coverBox, still } from "../../lib/plate";

export const FILES_A = 5.62, FILES_B = 10.72;
export const COLLAGE_A = 6.58; // from here the files cover the 3D world full-frame

const DATA = "grayscale(1) sepia(0.6) hue-rotate(148deg) saturate(1.5) contrast(1.22) brightness(0.98)";
const FACE = "grayscale(1) sepia(0.5) hue-rotate(150deg) saturate(1.3) contrast(1.1) brightness(1.0)";

// ── «created»: two panels flying in over the data world ────────────────────────────────────────────────────
const Panel: React.FC<{ src: string; from: number; a: number; w: number; h: number; x: number; y: number; ry: [number, number]; z0: number; title: string; sub: string; side?: "l" | "r" }> = ({ src, from, a, w, h, x, y, ry, z0, title, sub }) => {
  const { t } = useT();
  if (t < a) return null;
  const k = ease.out(ramp(t, a, a + 0.32));
  const u = ramp(t, a, FILES_B);
  const rot = mix(ry[0], ry[1], u);
  const z = mix(z0, 0, k);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `perspective(2200px) translateZ(${z}px) rotateY(${rot}deg)`, opacity: k, transformStyle: "preserve-3d" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#031014", border: `2px solid ${C.cyanDim}`, boxShadow: "0 0 40px rgba(127,233,244,0.18)" }}>
        <Vid src={src} t0={a} from={from} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: DATA }} />
        <ScreenTex op={0.9} />
      </div>
      <div style={{ position: "absolute", left: 0, top: -64, fontFamily: F.hudB, fontSize: 26, letterSpacing: 4, color: C.cyan, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ position: "absolute", left: 0, top: h + 16, fontFamily: F.hud, fontSize: 19, letterSpacing: 4, color: C.cyanDim, whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  );
};

// ── «to help the Avengers»: hero files ─────────────────────────────────────────────────────────────────────
type Hero = { a: number; b: number; src: string; from: number; focus: [number, number]; face: [number, number, number]; id: string; role: string };
const HEROES: Hero[] = [
  { a: 6.58, b: 7.01, src: still("mem-pilot"), from: 1.0, focus: [50, 40], face: [0.42, 0.47, 0.11], id: "FILE 0417", role: "PILOT · B-17 · 1943" },
  { a: 7.01, b: 7.46, src: still("mem-gunner"), from: 5.0, focus: [55, 40], face: [0.56, 0.47, 0.11], id: "FILE 1092", role: "GUNNER · B-17 · 1943" },
  { a: 7.46, b: 7.94, src: still("ship-sailor"), from: 6.2, focus: [50, 38], face: [0.52, 0.43, 0.1], id: "FILE 2210", role: "SAILOR · USN · 1945" },
];

const HeroFile: React.FC<{ h: Hero; i: number }> = ({ h, i }) => {
  const { t } = useT();
  const { bw, bh } = coverBox(4 / 3, h.focus);
  const k = ease.out(ramp(t, h.a + 0.03, h.a + 0.22));
  const [u, v, r] = h.face;
  const R = mix(r * 2.2, r, k) * bw, x = u * bw, y = v * bh;
  const g = clamp(1 - (t - h.a) / 0.09);
  return (
    <Glitch amt={g * 0.6} seed={i * 7 + 3}>
      <Plate src={h.src} a={h.a} b={h.b} from={h.from} grade={FACE} focus={h.focus} push={[1.02, 1.08]}>
        <svg width={bw} height={bh} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g stroke={C.cyan} fill="none" strokeWidth={3} opacity={0.95}>
            <rect x={x - R} y={y - R} width={R * 2} height={R * 2} strokeDasharray={`${R * 0.45} ${R * 1.1}`} />
            <path d={`M${x - R - 24} ${y}H${x - R + 14} M${x + R - 14} ${y}H${x + R + 24}`} />
          </g>
        </svg>
      </Plate>
    </Glitch>
  );
};

// ── the wall of protected files ────────────────────────────────────────────────────────────────────────────
const Wall: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const { t } = useT();
  const cols = 7, rows = 4, w = 262, h = 196, gap = 12;
  const u = ramp(t, a, b);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg }}>
      <div style={{ position: "absolute", left: 960 - (cols * (w + gap)) / 2, top: 540 - (rows * (h + gap)) / 2, width: cols * (w + gap), height: rows * (h + gap), transform: `perspective(1800px) rotateY(${mix(-12, -4, u)}deg) rotateX(4deg) scale(${mix(1.06, 0.96, u)})` }}>
        {Array.from({ length: cols * rows }, (_, j) => {
          const d = a - 0.05 + 0.006 * j + 0.03 * hash(j * 3.3);
          const o = ease.out(ramp(t, d, d + 0.08));
          return (
            <div key={j} style={{ position: "absolute", left: (j % cols) * (w + gap), top: Math.floor(j / cols) * (h + gap), width: w, height: h, opacity: o, border: `1px solid ${C.cyanFaint}`, overflow: "hidden", background: "#031014" }}>
              <img src={staticFile(`styles/archive-machine/tiles/t${String(j % 28).padStart(2, "0")}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: DATA, maxWidth: "none" }} />
            </div>
          );
        })}
      </div>
      <Label x={96} y={82} text="PROTECTED  ·  1,204 FILES" a={a} d={0.2} size={26} bold />
    </div>
  );
};

// ── «I don't get it, the mission.» — the directive, floating in the city; the program tries to decode each line,
// fails, and the line is redacted ─────────────────────────────────────────────────────────────────────────────
const ROWS = ["MISSION", "SCOPE", "OBJECTIVE", "AUTHORITY"];
const ROW_N = [17, 11, 19, 14];
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@";
const scramble = (n: number, seed: number, t: number) => Array.from({ length: n }, (_, i) => GLYPHS[Math.floor(hash(seed * 31 + i * 7 + Math.floor(t * 30)) * GLYPHS.length)]).join("");
export const WALL_B = 8.34;
export const MISSION_HIT = 9.94;

const Dossier: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const { t } = useT();
  const err = 8.92;
  const k = ease.out(ramp(t, a, a + 0.3));
  const u = ramp(t, a, b);
  const ry = mix(-17, -9, u), rx = mix(4, 1.5, u), z = mix(-420, 0, k) + 60 * u;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 80% at 40% 50%, rgba(1,6,8,0.6), rgba(1,6,8,0.3) 100%)", opacity: k }} />
      <div style={{ position: "absolute", left: 150, top: 170, width: 980, height: 700, transform: `perspective(2000px) translateZ(${z}px) rotateY(${ry}deg) rotateX(${rx}deg)`, opacity: k }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(2,12,15,0.84)", border: `2px solid ${C.cyanDim}`, boxShadow: "0 0 60px rgba(127,233,244,0.16)" }} />
        <div style={{ position: "absolute", left: 56, top: 44, fontFamily: F.hudB, fontSize: 34, letterSpacing: 6, color: C.cyan, whiteSpace: "nowrap" }}>DIRECTIVE 01 · REMEMBER</div>
        <div style={{ position: "absolute", left: 56, top: 100, width: 868, height: 2, background: C.cyanFaint }} />
        {ROWS.map((label, j) => {
          const d = a + 0.1 + j * 0.13;
          const o = ease.out(ramp(t, d, d + 0.08));
          const typed = Math.ceil(ROW_N[j] * clamp((t - d) / 0.22));
          const redact = ease.inOut(ramp(t, d + 0.34, d + 0.52));
          return (
            <div key={label} style={{ position: "absolute", left: 56, top: 150 + j * 100, opacity: o, display: "flex", alignItems: "center", gap: 40 }}>
              <div style={{ width: 250, fontFamily: F.hud, fontSize: 28, letterSpacing: 5, color: C.cyanDim }}>{label}</div>
              <div style={{ position: "relative", fontFamily: F.hudB, fontSize: 32, letterSpacing: 6, color: C.white, whiteSpace: "pre" }}>
                {scramble(typed, j + 1, t)}
                <div style={{ position: "absolute", left: -6, top: -4, bottom: -4, width: `calc(${redact * 100}% + 12px)`, background: "#000", opacity: redact > 0 ? 1 : 0 }} />
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 56, top: 560, display: "flex", gap: 40, alignItems: "center", opacity: ease.out(ramp(t, err, err + 0.1)) }}>
          <div style={{ width: 250, fontFamily: F.hud, fontSize: 28, letterSpacing: 5, color: C.cyanDim }}>STATUS</div>
          <div style={{ fontFamily: F.hudB, fontSize: 34, letterSpacing: 6, color: C.red, opacity: Math.floor((t - err) * 6) % 2 === 0 ? 1 : 0.5 }}>UNRESOLVED</div>
        </div>
      </div>
      <DataRain a={a} b={b} cols={[1780, 1840]} op={0.3} />
    </div>
  );
};

/** «the mission»: one solid word slammed onto the city, torn apart into the dive */
const Mission: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const { t } = useT();
  const k = ease.out(ramp(t, a, a + 0.1));
  const s = mix(1.28, 1, k);
  const sh = jolt(t, a, 10, 34, 8);
  const split = clamp(1 - (t - a) / 0.12) * 10;
  const out = ramp(t, b - 0.28, b);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${sh}px, ${-sh * 0.6}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(1,5,7,0.62)" }} />
      <Glitch amt={out * 0.9} seed={41}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: F.title, fontSize: 400, letterSpacing: 18, marginRight: -18, color: C.white, lineHeight: 1, transform: `scale(${s})`, textShadow: `${split}px 0 0 rgba(255,60,60,0.55), ${-split}px 0 0 rgba(60,220,255,0.55), 0 0 60px rgba(127,233,244,0.22)` }}>MISSION</div>
        </div>
      </Glitch>
      <Label x={96} y={82} text="MISSION  ·  PARSE FAILED" a={a + 0.08} d={0.3} size={24} bold color={C.red} />
    </div>
  );
};

export const Files: React.FC<{ t: number }> = ({ t }) => {
  const created = 5.76;
  if (t < COLLAGE_A) {
    return (
      <>
        <Panel src={still("nasa-ames")} from={0} a={FILES_A} w={900} h={592} x={880} y={200} ry={[-20, -11]} z0={-600} title="FILE 0001  ·  ORIGIN" sub="NASA AMES  ·  SUPERCOMPUTER  ·  2019" />
        <Panel src={still("nasa-mcc")} from={0} a={created + 0.17} w={560} h={368} x={150} y={330} ry={[24, 16]} z0={-400} title="MEMORY" sub="NASA  ·  MISSION CONTROL  ·  1969" />
        <Brackets x={60} y={48} w={1800} h={984} a={FILES_A} color={C.cyanFaint} len={46} />
      </>
    );
  }
  const h = HEROES.findIndex((x) => t >= x.a && t < x.b);
  if (h >= 0) {
    const H = HEROES[h];
    return (
      <>
        <HeroFile h={H} i={h} key={h} />
        <ScreenTex op={0.6} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%), radial-gradient(55% 32% at 0% 0%, rgba(1,8,10,0.72), rgba(0,0,0,0) 100%), radial-gradient(55% 30% at 0% 100%, rgba(1,8,10,0.72), rgba(0,0,0,0) 100%)" }} />
        <Label x={96} y={82} text={H.id} a={H.a + 0.02} d={0.12} size={30} bold key={`id${h}`} />
        <Label x={96} y={124} text={H.role} a={H.a + 0.06} d={0.2} size={20} color={C.white} key={`r${h}`} />
        <div style={{ position: "absolute", left: 96, top: 930, display: "flex", alignItems: "center", gap: 16, opacity: ease.out(ramp(t, H.a + 0.1, H.a + 0.2)) }}>
          <div style={{ width: 14, height: 14, background: C.cyan }} />
          <div style={{ fontFamily: F.hudB, fontSize: 24, letterSpacing: 6, color: C.cyan }}>STATUS · PROTECT</div>
        </div>
        <DataRain a={HEROES[0].a} b={HEROES[2].b} cols={[1790, 1850]} op={0.28} />
      </>
    );
  }
  if (t < WALL_B) return <Wall a={7.94} b={WALL_B} />;
  if (t < MISSION_HIT) return <Dossier a={WALL_B} b={MISSION_HIT} />;
  return <Mission a={MISSION_HIT} b={FILES_B} />;
};
