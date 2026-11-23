// Archive Machine · what followed «peace in our time»: the agreement, then a cut on every hit through 1943–1965. One
// year chip in a fixed slot (it re-types only when the year or place changes) and one counter that runs across every
// cut, from the Great War's dead to 108 million.
import React from "react";
import { Glitch, Label } from "../../lib/hud";
import { C, F, clamp, ease, hash, kf, punch, ramp, useT } from "../../lib/theme";
import { Plate, coverBox, staticPhoto, still } from "../../lib/plate";

type M = { a: number; b: number; src: string; still?: boolean; aspect?: number; from?: number; focus?: [number, number]; push?: [number, number]; drift?: [number, number]; grade: string; year?: string; place?: string; lock?: [number, number, number, number]; note?: string };

const BW = "grayscale(1) contrast(1.3) brightness(1.0) sepia(0.12)";
const COL = "saturate(0.5) sepia(0.22) contrast(1.24) brightness(0.98)";

export const MONTAGE: M[] = [
  // the paper itself (13.76 → the cut into war on 14.18)
  { a: 13.76, b: 14.18, src: staticPhoto("c111333.jpg"), still: true, aspect: 3500 / 2669, focus: [38, 46], push: [1.25, 1.55], grade: BW, lock: [0.385, 0.45, 0.09, 0.12], note: "AGREEMENT · MUNICH · 30 · IX · 1938" },
  // what followed: bombers over Europe (The Memphis Belle, USAAF 1944 film), the bombs fall through the biggest hit …
  { a: 14.18, b: 14.78, src: still("mem-form"), focus: [50, 45], push: [1.06, 1.14], grade: BW, year: "1943", place: "EUROPE" },
  { a: 14.78, b: 15.85, src: still("mem-bombs"), focus: [50, 45], push: [1.04, 1.2], grade: BW, year: "1943", place: "EUROPE" },
  // … the atomic tests at Bikini (Operation Crossroads, US Navy 1946): the watchers, then the cloud on «too much»
  { a: 15.85, b: 16.45, src: still("xrd-watch"), focus: [50, 42], push: [1.08, 1.16], grade: BW, year: "1946", place: "BIKINI ATOLL" },
  { a: 16.45, b: 17.34, src: still("xrd-cloud"), focus: [48, 42], push: [1.02, 1.16], grade: "grayscale(1) contrast(1.2) brightness(1.05)", year: "1946", place: "BIKINI ATOLL" },
  { a: 17.34, b: 17.85, src: still("viet-huey"), focus: [45, 50], push: [1.08, 1.16], grade: COL, year: "1965", place: "VIETNAM" },
];
export const MONTAGE_A = MONTAGE[0].a, MONTAGE_B = MONTAGE[MONTAGE.length - 1].b;
const BOOM = 15.58;
const KICKS = [14.18, BOOM, 16.45];
const MUCH = 16.88;

/** war dead, rolling across the cuts: the Great War's ~20 M before the first frame, 108 M on «much» */
const dead = (t: number) => kf(t, [[14.18, 20_000_000], [14.78, 27_000_000], [BOOM, 46_000_000], [15.85, 61_000_000], [16.45, 84_000_000], [MUCH, 108_000_000]], (u) => u);

const Shot: React.FC<{ m: M; i: number }> = ({ m, i }) => {
  const { t } = useT();
  const aspect = m.aspect ?? 4 / 3;
  const focus = m.focus ?? [50, 50];
  const { bw, bh } = coverBox(aspect, focus);
  // two frames of tear on the cut, and again on the bomb's hit inside the Stuka shot
  const inBoom = m.a < BOOM && m.b > BOOM && t >= BOOM;
  const g = Math.max(clamp(1 - (t - m.a) / 0.09), inBoom ? clamp(1 - (t - BOOM) / 0.09) : 0);
  return (
    <Glitch amt={g * 0.7} seed={i * 13 + (inBoom ? 7 : 1)}>
      <Plate src={m.src} a={m.a} b={m.b} from={m.from} still={m.still} aspect={aspect} grade={m.grade} focus={focus} push={m.push} drift={m.drift}>
        {m.lock ? (
          <svg width={bw} height={bh} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {(() => {
              const [u, v, rw, rh] = m.lock!;
              const k = ease.out(ramp(t, m.a, m.a + 0.16));
              const W2 = rw * bw * (1.5 - 0.5 * k), H2 = rh * bh * (1.5 - 0.5 * k);
              const x = u * bw, y = v * bh, L = 30;
              const d = `M${x - W2} ${y - H2 + L}V${y - H2}H${x - W2 + L} M${x + W2 - L} ${y - H2}H${x + W2}V${y - H2 + L} M${x + W2} ${y + H2 - L}V${y + H2}H${x + W2 - L} M${x - W2 + L} ${y + H2}H${x - W2}V${y + H2 - L}`;
              return <path d={d} fill="none" stroke={C.white} strokeWidth={3} />;
            })()}
          </svg>
        ) : null}
      </Plate>
    </Glitch>
  );
};

export const Montage: React.FC<{ t: number }> = ({ t }) => {
  const i = MONTAGE.findIndex((m) => t >= m.a && t < m.b);
  if (i < 0) return null;
  const m = MONTAGE[i];
  let k = 0;
  for (const at of KICKS) k = Math.max(k, punch(t, at, 9) * (at === BOOM ? 1.6 : 1));
  const rolling = t > 14.2 && t < MUCH;
  const n = Math.round(dead(t) + (rolling ? hash(Math.floor(t * 40)) * 9999 : 0));
  // the chip re-types only when the year or place changes
  let c0 = i;
  while (c0 > 0 && MONTAGE[c0 - 1].year === m.year && MONTAGE[c0 - 1].place === m.place) c0--;
  const chipIn = ease.out(ramp(t, MONTAGE[c0].a, MONTAGE[c0].a + 0.12));
  const landed = ease.out(ramp(t, MUCH, MUCH + 0.12));
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.03 * k})` }}>
      <Shot m={m} i={i} key={i} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 95% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%), radial-gradient(60% 34% at 0% 0%, rgba(0,0,0,0.55), rgba(0,0,0,0) 100%), radial-gradient(70% 44% at 0% 100%, rgba(0,0,0,0.72), rgba(0,0,0,0) 100%)" }} />
      {m.year ? (
        <div style={{ position: "absolute", left: 96, top: 82, display: "flex", alignItems: "baseline", gap: 22, opacity: chipIn }}>
          <div style={{ fontFamily: F.hudB, fontSize: 76, color: C.white, letterSpacing: 4, lineHeight: 1, textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}>{m.year}</div>
          <div style={{ fontFamily: F.hudB, fontSize: 24, color: "rgba(234,248,250,0.92)", letterSpacing: 5, textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.6)" }}>{m.place}</div>
        </div>
      ) : null}
      {m.note ? <Label x={96} y={88} text={m.note} a={m.a + 0.04} d={0.22} size={22} bold color={C.white} /> : null}
      {t >= 14.18 ? (
        <div style={{ position: "absolute", left: 96, top: 862 }}>
          <div style={{ fontFamily: F.hudB, fontSize: 84, color: C.white, letterSpacing: 5, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: "0 2px 22px rgba(0,0,0,0.6)", transform: `scale(${1 + 0.06 * (1 - landed) * (t >= MUCH ? 1 : 0)})`, transformOrigin: "0 100%" }}>{n.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: F.hudB, fontSize: 22, color: "rgba(234,248,250,0.88)", letterSpacing: 6, marginTop: 10, textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.6)" }}>WAR DEAD · 20TH CENTURY</div>
        </div>
      ) : null}
    </div>
  );
};
