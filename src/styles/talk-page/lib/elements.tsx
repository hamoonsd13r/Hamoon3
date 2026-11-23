// Talk Page — content-free elements for the page's zone (zone coordinates, 0..safeW × 0..304) and for the table
// around the page (absolute frame coordinates: CallCard, PhoneRing, VoiceWave). Every one takes its cue times as props.
import React from "react";
import dots from "./world-dots.json";
import { paperBg } from "./page";
import { Count, DashPoly, Stamp, Stroke, Svg, Typed, bez } from "./pen";
import { C, F } from "./theme";
import { clamp, eInOut, eOut, eOut5, fade, hash, mix, pop, ramp, useT } from "./time";

const mono = (size: number, color: string = C.ink, weight = 600, spacing = "0.08em"): React.CSSProperties => ({ fontFamily: F.mono, fontSize: size, fontWeight: weight, letterSpacing: spacing, color, whiteSpace: "pre", lineHeight: 1 });
const serif = (size: number, weight = 600, color: string = C.ink): React.CSSProperties => ({ fontFamily: F.serif, fontSize: size, fontWeight: weight, color, lineHeight: 1.05, whiteSpace: "nowrap" });
/** a card pasted on the page */
export const CARD: React.CSSProperties = { position: "absolute", background: C.paperHi, border: `2px solid ${C.ink}`, borderRadius: 10, boxShadow: "0 3px 0 rgba(28,26,23,0.13)" };

// ---------------------------------------------------------------------------------------------------------------------
// rows: mono label + serif value (+ a meter)
// ---------------------------------------------------------------------------------------------------------------------
export const Row: React.FC<{ label: string; at: number; y: number; x?: number; labelW?: number; children: React.ReactNode }> = ({ label, at, y, x = 0, labelW = 170, children }) => {
  const t = useT();
  const p = eOut(ramp(t, at, at + 0.35));
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "baseline", gap: 22, opacity: p, transform: `translateX(${(1 - p) * 14}px)` }}>
      <span style={{ width: labelW, ...mono(21, C.label, 600, "0.14em") }}>{label}</span>
      <span style={{ position: "relative", ...serif(36, 500) }}>{children}</span>
    </div>
  );
};

/** n squares, `on` lit in the accent (they throb); one more lights at `upAt` with a small jolt */
export const Meter: React.FC<{ at: number; n?: number; on: number; upAt?: number }> = ({ at, n = 10, on, upAt }) => {
  const t = useT();
  const lit = upAt !== undefined && t >= upAt ? on + 1 : on;
  const jolt = upAt !== undefined ? Math.sin(ramp(t, upAt, upAt + 0.3) * Math.PI * 3) * 4 * (1 - ramp(t, upAt, upAt + 0.3)) : 0;
  return (
    <span style={{ display: "inline-flex", gap: 7, transform: `translate(${jolt}px, 4px)` }}>
      {Array.from({ length: n }, (_, i) => {
        const p = eOut(ramp(t, at + i * 0.07, at + i * 0.07 + 0.2));
        const isLit = i < lit;
        const throb = isLit ? 0.8 + 0.2 * Math.sin(t * 6 - i * 0.6) : 1;
        return <span key={i} style={{ width: 22, height: 28, border: `2px solid ${isLit ? C.accent : "rgba(28,26,23,0.35)"}`, background: isLit ? `rgba(210,86,30,${0.88 * p * throb})` : "transparent", opacity: 0.35 + 0.65 * p }} />;
      })}
    </span>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// pen clock: the hands spin through `hours` (the minute hand goes round, a sector fills in the accent)
// ---------------------------------------------------------------------------------------------------------------------
export const PenClock: React.FC<{ at: number; spinAt: number; hours: number; dur?: number; x?: number; y?: number; r?: number; label?: string }> = ({ at, spinAt, hours, dur = 1.2, x = 150, y = 150, r = 118, label }) => {
  const t = useT();
  const draw = eOut(ramp(t, at, at + 0.5)); // a quick pen circle: the zone is never a blank sheet while it draws
  const spin = eInOut(ramp(t, spinAt, spinAt + dur));
  const done = ramp(t, spinAt + dur, spinAt + dur + 0.1) * (1 - ramp(t, spinAt + dur + 0.1, spinAt + dur + 0.45));
  const hA = spin * hours * 30;
  const mA = spin * hours * 360;
  const pt = (a: number, k: number): [number, number] => [x + Math.cos(((a - 90) * Math.PI) / 180) * r * k, y + Math.sin(((a - 90) * Math.PI) / 180) * r * k];
  const [ex, ey] = pt(hA, 0.86);
  const sector = hA > 0.5 ? `M${x} ${y} L${x} ${y - r * 0.86} A ${r * 0.86} ${r * 0.86} 0 ${hA > 180 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)} Z` : "";
  return (
    <>
      <Svg>
        <g transform={`translate(${x} ${y}) scale(${1 + done * 0.04}) translate(${-x} ${-y})`}>
          {sector ? <path d={sector} fill="rgba(210,86,30,0.28)" /> : null}
          <Stroke d={`M${x} ${y - r} A ${r} ${r} 0 1 1 ${x - 0.1} ${y - r}`} p={draw} w={3.4} />
          {Array.from({ length: 12 }, (_, i) => {
            const [a0, b0] = pt(i * 30, 0.84);
            const [a1, b1] = pt(i * 30, i % 3 === 0 ? 0.7 : 0.76);
            return <Stroke key={i} d={`M${a0} ${b0} L${a1} ${b1}`} p={ramp(draw, 0.4 + i * 0.04, 0.6 + i * 0.04)} w={i % 3 === 0 ? 3 : 2} color={C.ink2} />;
          })}
          {draw > 0.8 ? (
            <>
              <line x1={x} y1={y} x2={pt(hA, 0.5)[0]} y2={pt(hA, 0.5)[1]} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
              <line x1={x} y1={y} x2={pt(mA, 0.76)[0]} y2={pt(mA, 0.76)[1]} stroke={C.ink} strokeWidth={3.4} strokeLinecap="round" />
              <circle cx={x} cy={y} r={7} fill={C.accent} />
            </>
          ) : null}
        </g>
      </Svg>
      {label ? <div style={{ position: "absolute", left: x - r, top: y + r + 14, width: r * 2, textAlign: "center", ...mono(21, C.label, 600, "0.14em"), opacity: draw }}>{label}</div> : null}
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// checklist: items enter, each box gets a tick or a cross on its word
// ---------------------------------------------------------------------------------------------------------------------
/** boxAt: the empty box is drawn early (the structure), the text inks in on `at` (the word), the mark on tick/cross */
export type CheckItem = { text: string; at: number; boxAt?: number; tick?: number; cross?: number; key?: boolean };
export const Checklist: React.FC<{ items: CheckItem[]; x?: number; y?: number; gap?: number; size?: number; title?: string; titleAt?: number }> = ({ items, x = 0, y = 0, gap = 62, size = 38, title, titleAt = 0 }) => {
  const t = useT();
  const off = title ? 44 : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {title ? <Typed text={title} at={titleAt} /> : null}
      {items.map((it, i) => {
        const p = eOut(ramp(t, it.at, it.at + 0.32));
        const b0 = it.boxAt ?? it.at;
        const bp = eInOut(ramp(t, b0, b0 + 0.35));
        const markAt = it.tick ?? it.cross;
        const m = markAt !== undefined ? eOut(ramp(t, markAt, markAt + 0.3)) : 0;
        const strike = it.cross !== undefined ? eOut(ramp(t, it.cross + 0.15, it.cross + 0.45)) : 0;
        if (bp <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: off + i * gap, display: "flex", alignItems: "center", gap: 20, whiteSpace: "nowrap" }}>
            <svg width={44} height={44} viewBox="0 0 50 50" style={{ overflow: "visible", flex: "none" }}>
              <Stroke d="M6 7 L44 5 L45 44 L5 45 Z" p={bp} w={2.6} />
              {it.cross !== undefined ? (
                <>
                  <Stroke d="M12 12 L39 40" p={ramp(m, 0, 0.5)} w={4.4} color={C.accent} />
                  <Stroke d="M39 11 L12 40" p={ramp(m, 0.5, 1)} w={4.4} color={C.accent} />
                </>
              ) : (
                <Stroke d="M10 26 L21 37 L46 2" p={m} w={4.6} color={it.key ? C.accent : C.ink} />
              )}
            </svg>
            <span style={{ position: "relative", ...serif(size, it.key ? 700 : 500, it.key ? C.accent : C.ink), opacity: p, transform: `translateX(${(1 - p) * 12}px)`, filter: p < 1 ? `blur(${(1 - p) * 5}px)` : undefined }}>
              {it.text}
              {strike > 0 ? (
                <svg style={{ position: "absolute", left: "-3%", width: "106%", top: "48%", height: 10, overflow: "visible", clipPath: `inset(-60% ${(1 - strike) * 100}% -60% -2%)` }} viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 6 L100 3" fill="none" stroke={C.accent} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// horizontal bars: a label, a bar that grows to its value, the number counts up at the end of the bar
// ---------------------------------------------------------------------------------------------------------------------
/** trackAt: the labels and empty dashed tracks are drawn early (the structure), each bar grows on its own word */
export type Bar = { label: string; value: number; at: number; key?: boolean; text?: string };
export const BarChart: React.FC<{ bars: Bar[]; max: number; x?: number; y?: number; w?: number; barH?: number; gap?: number; labelW?: number; title?: string; titleAt?: number; suffix?: string; trackAt?: number }> = ({
  bars,
  max,
  x = 0,
  y = 0,
  w = 560,
  barH = 46,
  gap = 34,
  labelW = 150,
  title,
  titleAt = 0,
  suffix = "",
  trackAt,
}) => {
  const t = useT();
  const off = title ? 50 : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {title ? <Typed text={title} at={titleAt} /> : null}
      {bars.map((b, i) => {
        const g = eOut5(ramp(t, b.at, b.at + 0.8));
        const len = Math.max(6, (b.value / max) * w * g);
        const show = trackAt !== undefined ? trackAt + i * 0.12 : b.at - 0.1;
        const p = eOut(ramp(t, show, show + 0.35));
        const grown = t >= b.at;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: off + i * (barH + gap), display: "flex", alignItems: "center", gap: 18, opacity: p, transform: `translateX(${(1 - p) * 12}px)`, whiteSpace: "nowrap" }}>
            <span style={{ width: labelW, ...mono(21, b.key && grown ? C.accent : C.label, 700, "0.14em") }}>{b.label}</span>
            <span style={{ position: "relative", width: grown ? len : w, height: barH }}>
              {/* the empty track waits for its word */}
              <span style={{ position: "absolute", left: 0, top: 0, width: w, height: barH, border: "2px dashed rgba(28,26,23,0.22)", borderRadius: 3, boxSizing: "border-box", opacity: 1 - eOut(ramp(t, b.at, b.at + 0.4)) * 0.6 }} />
              {grown ? (
                <span style={{ position: "absolute", left: 0, top: 0, width: len, height: barH, background: b.key ? C.accent : C.ink, borderRadius: 3, boxShadow: "0 2px 0 rgba(28,26,23,0.15)" }}>
                  {/* pen hatching on the ink bars */}
                  {!b.key ? <span style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(115deg, rgba(242,236,224,0.0) 0 9px, rgba(242,236,224,0.16) 9px 11px)" }} /> : null}
                </span>
              ) : null}
            </span>
            <span style={{ ...serif(44, 700, b.key ? C.accent : C.ink), opacity: grown ? 1 : 0 }}>{b.text ?? <Count to={b.value} at={b.at} dur={0.8} size={44} weight={700} color={b.key ? C.accent : C.ink} suffix={suffix} />}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// line chart: axes, a series drawn on, the head dot pulses; optional dashed "what next" fall/rise with a big "?"
// ---------------------------------------------------------------------------------------------------------------------
export const LineChart: React.FC<{ data: number[]; at: number; max: number; min?: number; w?: number; h?: number; title?: string; xLabels?: [number, string][]; next?: { at: number; to: number }; headColor?: string }> = ({
  data,
  at,
  max,
  min = 0,
  w = 600,
  h = 220,
  title,
  xLabels = [],
  next,
  headColor = C.accent,
}) => {
  const t = useT();
  const X0 = 60;
  const Y0 = 262;
  const cx = (i: number) => X0 + (i / (data.length - 1)) * w;
  const cy = (v: number) => Y0 - ((v - min) / (max - min)) * h;
  const d = data.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${cy(v).toFixed(1)}`).join(" ");
  const ex = cx(data.length - 1);
  const ey = cy(data[data.length - 1]);
  const lp = eInOut(ramp(t, at + 0.15, at + 1.25));
  const dotP = eOut(ramp(t, at + 1.15, at + 1.4));
  const pulse = 1 + 0.15 * Math.sin((t - at) * 6) * dotP;
  const fp = next ? eInOut(ramp(t, next.at, next.at + 0.55)) : 0;
  const qp = next ? eOut(ramp(t, next.at + 0.45, next.at + 0.8)) : 0;
  const hitQ = next ? ramp(t, next.at + 0.7, next.at + 0.8) * (1 - ramp(t, next.at + 0.8, next.at + 1.1)) : 0;
  const ny = next ? cy(next.to) : 0;
  return (
    <>
      <Svg>
        {[0.25, 0.5, 0.75].map((k, i) => (
          <Stroke key={i} d={`M${X0} ${Y0 - k * h} H${X0 + w + 40}`} p={eOut(ramp(t, at, at + 0.4))} w={1} color="rgba(28,26,23,0.12)" />
        ))}
        <Stroke d={`M${X0} ${Y0 - h - 10} V${Y0} H${X0 + w + 160}`} p={eInOut(ramp(t, at, at + 0.4))} w={2.4} color={C.ink3} />
        <Stroke d={d} p={lp} w={3.6} color={C.ink} />
        {dotP > 0 ? <circle cx={ex} cy={ey} r={9 * pulse} fill={headColor} stroke={C.ink} strokeWidth={2} opacity={dotP} /> : null}
        {next ? <DashPoly pts={bez([ex + 4, ey + 6], [ex + 56, ey + (ny - ey) * 0.1], [ex + 86, ny], [ex + 140, ny])} p={fp} w={4} color={C.accent} dash="10 10" /> : null}
      </Svg>
      {xLabels.map(([i, s]) => (
        <div key={s} style={{ position: "absolute", left: cx(i) - 26, top: Y0 + 8 }}>
          <Typed text={s} at={at + 0.2 + (i / data.length) * 1.0} size={21} caret={false} />
        </div>
      ))}
      {title ? (
        <div style={{ position: "absolute", left: X0 + 16, top: 0 }}>
          <Typed text={title} at={at + 0.1} />
        </div>
      ) : null}
      {next ? (
        <div style={{ position: "absolute", left: ex + 150, top: ny - 90, ...serif(112, 600, C.accent), fontStyle: "italic", opacity: qp, transform: `translateY(${(1 - qp) * 18}px) rotate(8deg) scale(${1 + hitQ * 0.08})`, filter: qp < 1 ? `blur(${(1 - qp) * 6}px)` : undefined }}>?</div>
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// dotted world map: dots sweep in west → east, sites pop with a ring, dashed routes arc between them
// ---------------------------------------------------------------------------------------------------------------------
const DOTS = dots as [number, number][];
const MW = 653;
const MX = (lon: number) => 103 + ((lon + 168) / 350) * MW;
const MY = (lat: number) => 40 + ((78 - lat) / 134) * 250;
export type Site = { lon: number; lat: number; at: number; label?: string; dx?: number; dy?: number; key?: boolean };
export const DotMap: React.FC<{ at: number; sites: Site[]; routes?: [number, number, number][]; title?: string; titleAt?: number }> = ({ at, sites, routes = [], title, titleAt }) => {
  const t = useT();
  return (
    <>
      <Svg>
        {DOTS.map(([lon, lat], i) => {
          const x = MX(lon);
          const o = ramp(t, at + ((x - 103) / MW) * 0.55, at + ((x - 103) / MW) * 0.55 + 0.18);
          return o > 0 ? <circle key={i} cx={x} cy={MY(lat)} r={1.55} fill={C.ink} opacity={0.4 * o} /> : null;
        })}
        {routes.map(([i, j, ra], k) => {
          const A: [number, number] = [MX(sites[i].lon), MY(sites[i].lat)];
          const B: [number, number] = [MX(sites[j].lon), MY(sites[j].lat)];
          const lift = Math.max(30, Math.abs(B[0] - A[0]) * 0.28);
          return <DashPoly key={`r${k}`} pts={bez(A, [mix(A[0], B[0], 0.3), Math.min(A[1], B[1]) - lift], [mix(A[0], B[0], 0.7), Math.min(A[1], B[1]) - lift], B)} p={eInOut(ramp(t, ra, ra + 0.6))} w={3} color={C.accent} dash="8 8" />;
        })}
        {sites.map((s, i) => {
          const p = ramp(t, s.at, s.at + 0.32);
          if (p <= 0) return null;
          const k = eOut(p) + Math.sin(p * Math.PI) * 0.35;
          const breathe = 1 + 0.06 * Math.sin(t * 3 + i);
          return (
            <g key={`s${i}`} transform={`translate(${MX(s.lon)} ${MY(s.lat)}) scale(${k * breathe})`}>
              <circle r={12} fill="none" stroke={C.accent} strokeWidth={2} opacity={0.6} />
              <circle r={6} fill={s.key ? C.accent : C.ink} />
            </g>
          );
        })}
      </Svg>
      {sites.map((s, i) =>
        s.label ? (
          <div key={`l${i}`} style={{ position: "absolute", left: MX(s.lon) + (s.dx ?? 16), top: MY(s.lat) + (s.dy ?? -34), ...mono(21, s.key ? C.accent : C.ink, 700, "0.1em"), opacity: pop(t, s.at + 0.15, 0.3), background: "rgba(242,236,224,0.85)", padding: "3px 6px 2px" }}>
            {s.label}
          </div>
        ) : null,
      )}
      {title ? (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Typed text={title} at={titleAt ?? at + 0.1} />
        </div>
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// a pen person (stick figure) and stairs: the person hops one step up on `hopAt`
// ---------------------------------------------------------------------------------------------------------------------
export const Person: React.FC<{ x: number; y: number; s?: number; at: number; color?: string; op?: number }> = ({ x, y, s = 1, at, color = C.ink, op = 1 }) => {
  const t = useT();
  const p = eInOut(ramp(t, at, at + 0.5));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={op}>
      <Stroke d="M0 -38 a14 14 0 1 1 0.1 0" p={p} w={3.2} color={color} />
      <Stroke d="M0 -10 L0 26 M0 26 L-14 54 M0 26 L14 54 M-20 6 L0 -4 L20 6" p={clamp(p * 1.2 - 0.2)} w={3.2} color={color} />
    </g>
  );
};

export const Steps: React.FC<{ at: number; labels: [string, number][]; from?: number; hopAt: number; keyStep?: number }> = ({ at, labels, from = 0, hopAt, keyStep }) => {
  const t = useT();
  const n = labels.length;
  const S = Array.from({ length: n + 1 }, (_, i) => [80 + i * (640 / n), 270 - i * (190 / n)] as [number, number]);
  const draw = eInOut(ramp(t, at, at + 0.7));
  const hop = eInOut(ramp(t, hopAt, hopAt + 0.45));
  const arc = Math.sin(hop * Math.PI) * 40;
  const stepW = 640 / n;
  const px = mix(S[from][0] + stepW * 0.5, S[from + 1][0] + stepW * 0.5, hop);
  const py = mix(S[from][1], S[from + 1][1], hop) - arc;
  const d = S.slice(0, n).map(([x, y], i) => `${i ? "V" : "M" + (x - 20) + " "}${y} H${x + stepW}`).join(" ");
  return (
    <>
      <Svg>
        <Stroke d={d} p={draw} w={4} color={C.ink} />
        <Person x={px} y={py - 58} at={at + 0.3} />
      </Svg>
      {labels.map(([s, la], i) => {
        const key = i === (keyStep ?? from + 1);
        return (
          <div key={s} style={{ position: "absolute", left: S[i][0] + 6, top: S[i][1] + 14, ...mono(21, key ? C.accent : C.label, key ? 700 : 600, "0.1em"), opacity: pop(t, la, 0.3) }}>
            {s}
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// flow: pasted cards joined by pen arrows (how something is built / works)
// ---------------------------------------------------------------------------------------------------------------------
export type FlowNode = { label: string; sub?: string; at: number; key?: boolean };
export const Flow: React.FC<{ nodes: FlowNode[]; y?: number; w?: number; h?: number; gap?: number; title?: string; titleAt?: number }> = ({ nodes, y = 50, w = 236, h = 116, gap = 34, title, titleAt = 0 }) => {
  const t = useT();
  return (
    <>
      {title ? (
        <div style={{ position: "absolute", left: 0, top: 4 }}>
          <Typed text={title} at={titleAt} />
        </div>
      ) : null}
      {nodes.map((n, i) => {
        const q = pop(t, n.at, 0.35);
        return (
          <div key={n.label} style={{ ...CARD, left: i * (w + gap), top: y, width: w, height: h, opacity: q, transform: `translateY(${(1 - q) * 14}px)` }}>
            <div style={{ position: "absolute", left: 18, top: 22, ...mono(22, n.key ? C.accent : C.ink, 700, "0.1em") }}>{n.label}</div>
            {n.sub ? <div style={{ position: "absolute", left: 18, top: 62, ...serif(27, 600) }}>{n.sub}</div> : null}
          </div>
        );
      })}
      <Svg>
        {nodes.slice(1).map((n, i) => {
          const x0 = (i + 1) * (w + gap) - gap + 2;
          const p = eInOut(ramp(t, n.at - 0.2, n.at + 0.1));
          return (
            <g key={i}>
              <Stroke d={`M${x0} ${y + h / 2} H${x0 + gap - 6}`} p={p} w={4} color={C.accent} />
              {p > 0.9 ? <path d={`M${x0 + gap - 16} ${y + h / 2 - 9} L${x0 + gap - 5} ${y + h / 2} L${x0 + gap - 16} ${y + h / 2 + 9}`} fill="none" stroke={C.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </g>
          );
        })}
      </Svg>
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// search: a pill where a question is typed, then the answer chip drops in under it
// ---------------------------------------------------------------------------------------------------------------------
/** placeholder: grey hint text while nothing is typed yet, so the bar is never an empty pill */
export const Search: React.FC<{ at: number; query: string; typeAt: number; result?: string; resultAt?: number; x?: number; y?: number; w?: number; rtl?: boolean; placeholder?: string }> = ({
  at,
  query,
  typeAt,
  result,
  resultAt = typeAt + 1,
  x = 0,
  y = 0,
  w = 560,
  rtl,
  placeholder,
}) => {
  const t = useT();
  const p = pop(t, at, 0.35);
  const r = result ? pop(t, resultAt, 0.35) : 0;
  const ws = query.split(" ");
  const shown = rtl ? ws.slice(0, Math.floor(ramp(t, typeAt, typeAt + ws.length * 0.16) * ws.length)).join(" ") : query.slice(0, Math.floor(ramp(t, typeAt, typeAt + query.length / 24) * query.length));
  const typing = t >= typeAt && shown.length < query.length;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>
      <div style={{ height: 62, borderRadius: 31, background: "rgba(251,248,241,0.97)", border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", gap: 12, padding: "0 20px", boxShadow: "0 8px 18px rgba(0,0,0,0.3)", direction: rtl ? "rtl" : "ltr" }}>
        <svg width={26} height={26} viewBox="0 0 26 26" style={{ flex: "none" }}>
          <circle cx={11} cy={11} r={7.5} fill="none" stroke={C.ink} strokeWidth={3} />
          <path d="M17 17 L23 23" stroke={C.ink} strokeWidth={3.4} strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: rtl ? F.fa : F.serif, fontSize: rtl ? 27 : 30, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden" }}>
          {shown.length === 0 && placeholder ? (
            <>
              <span style={{ color: C.accent, opacity: t > typeAt - 0.4 && t < typeAt ? 1 : 0 }}>▍</span>
              <span style={{ color: C.label, fontWeight: 500 }}>{placeholder}</span>
            </>
          ) : (
            <>
              {shown}
              <span style={{ color: C.accent, opacity: typing || (t > typeAt - 0.4 && t < typeAt) ? 1 : 0 }}>▍</span>
            </>
          )}
        </span>
      </div>
      {result && r > 0 ? (
        <div style={{ marginTop: 12, marginLeft: rtl ? 0 : 26, marginRight: rtl ? 26 : 0, display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: C.ink, color: C.paperHi, opacity: r, transform: `translateY(${(1 - r) * -10}px)`, boxShadow: "0 6px 14px rgba(0,0,0,0.35)", direction: rtl ? "rtl" : "ltr" }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: C.accent, flex: "none" }} />
          <span style={{ fontFamily: rtl ? F.fa : F.serif, fontSize: rtl ? 26 : 28, fontWeight: 600, whiteSpace: "nowrap" }}>{result}</span>
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// comments: the keyword is typed and sent, then the link lands in the DM
// ---------------------------------------------------------------------------------------------------------------------
/** others: comments already under the post (generic, no handles), so the sheet is never an empty box while he asks;
 *  the sent keyword slides in on top and pushes them down */
export type OtherComment = { who: string; text: string; at: number; rtl?: boolean };
export const CommentSheet: React.FC<{ at: number; word: string; typeAt: number; sendAt: number; dmAt?: number; dmText?: string; dmLink?: string; you?: string; rtlWord?: boolean; others?: OtherComment[] }> = ({
  at,
  word,
  typeAt,
  sendAt,
  dmAt,
  dmText = "Here's your link",
  dmLink = "your-link.com",
  you = "you · now",
  rtlWord,
  others = [],
}) => {
  const t = useT();
  const sheet = pop(t, at, 0.4);
  const typed = t >= typeAt;
  const sent = eInOut(ramp(t, sendAt, sendAt + 0.25));
  const dm = dmAt !== undefined ? pop(t, dmAt, 0.4) : 0;
  const wordStyle: React.CSSProperties = { fontFamily: rtlWord ? F.fa : F.serif, fontSize: rtlWord ? 38 : 44, fontWeight: 700, color: C.ink, lineHeight: 1.1, direction: rtlWord ? "rtl" : "ltr" };
  const ROW = 50; // one-line rows of the earlier comments
  const YOU_H = 86; // your two-line row pushes them down by this much
  return (
    <>
      <div style={{ ...CARD, left: 0, top: 10, width: 470, height: 282, borderRadius: 18, opacity: sheet, transform: `translateY(${(1 - sheet) * 20}px)` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 18, textAlign: "center", ...mono(21, C.label, 700, "0.12em") }}>COMMENTS</div>
        <div style={{ position: "absolute", left: 24, right: 24, top: 52, height: 1.5, background: C.rule }} />
        <div style={{ position: "absolute", left: 20, right: 20, top: 62, height: 132, overflow: "hidden" }}>
          {others.map((o, i) => {
            const p = pop(t, o.at, 0.3);
            return (
              <div key={i} style={{ position: "absolute", left: 4, top: 10 + i * ROW + sent * YOU_H, display: "flex", alignItems: "center", gap: 12, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, whiteSpace: "nowrap" }}>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: C.paper2, border: `2px solid ${C.ink3}`, flex: "none" }} />
                <span style={mono(21, C.label, 600, "0.04em")}>{o.who}</span>
                <span style={{ fontFamily: o.rtl ? F.fa : F.serif, fontSize: o.rtl ? 25 : 28, fontWeight: 500, color: C.ink, direction: o.rtl ? "rtl" : "ltr" }}>{o.text}</span>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 4, top: 8, display: "flex", alignItems: "center", gap: 14, opacity: sent, transform: `translateY(${(1 - sent) * -16}px)` }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: C.paper2, border: `2px solid ${C.accent}`, flex: "none" }} />
            <div>
              <div style={mono(21, C.label, 600, "0.06em")}>{you}</div>
              <div style={{ marginTop: 6, ...wordStyle }}>{word}</div>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 20, right: 20, top: 200, height: 62, borderRadius: 31, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", paddingLeft: 22, boxSizing: "border-box" }}>
          {/* the field empties the moment it is sent (the word is never in the field and the list at once) */}
          <span style={{ ...wordStyle, fontSize: rtlWord ? 30 : 34, opacity: typed && t < sendAt ? 1 : 0 }}>{word}</span>
          <span style={{ ...mono(22, C.label, 500, "0.04em"), position: "absolute", left: 22, opacity: !typed || t >= sendAt + 0.15 ? 0.8 : 0 }}>Add a comment…</span>
          <div style={{ position: "absolute", right: 8, top: 7, width: 44, height: 44, borderRadius: 22, background: typed && t < sendAt + 0.3 ? C.accent : C.ink3, transform: `scale(${1 - 0.15 * Math.sin(clamp((t - sendAt) / 0.25) * Math.PI)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={22} height={22} viewBox="0 0 22 22">
              <path d="M3 11 H18 M12 5 L18 11 L12 17" fill="none" stroke={C.paperHi} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      {dm > 0 ? (
        <div style={{ position: "absolute", left: 492, top: 40 + (1 - dm) * 24, width: 300, opacity: dm }}>
          <div style={{ ...mono(21, C.label, 700, "0.12em"), marginBottom: 8 }}>DIRECT · 1 NEW</div>
          <div style={{ ...CARD, position: "relative", padding: "16px 18px", borderRadius: 16 }}>
            <div style={{ ...serif(29, 600), whiteSpace: "normal", lineHeight: 1.2 }}>{dmText}</div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: C.paper2 }}>
              <svg width={22} height={22} viewBox="0 0 22 22" style={{ flex: "none" }}>
                <path d="M9 13 L13 9 M7.5 10.5 L5 13 a3.5 3.5 0 0 0 5 5 L12.5 15.5 M14.5 11.5 L17 9 a3.5 3.5 0 0 0 -5 -5 L9.5 6.5" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
              </svg>
              <span style={mono(21, C.ink, 700, "0.04em")}>{dmLink}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// player: a dark card with a play button that gets pressed, a progress bar, and anything drawn inside
// ---------------------------------------------------------------------------------------------------------------------
export const Player: React.FC<{ at: number; playAt: number; title: string; x?: number; y?: number; w?: number; h?: number; dur?: number; children?: React.ReactNode }> = ({ at, playAt, title, x = 60, y = 6, w = 740, h = 290, dur = 6, children }) => {
  const t = useT();
  const box = pop(t, at, 0.4);
  const play = eInOut(ramp(t, playAt, playAt + 0.3));
  const prog = clamp((t - playAt) / dur);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 16, background: C.dark, opacity: box, transform: `translateY(${(1 - box) * 16}px)`, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 22, top: 18, ...mono(21, C.cream, 700, "0.1em") }}>{title}</div>
      {children}
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(${w / 2} ${h / 2}) scale(${1 - 0.6 * play})`} opacity={1 - play}>
          <circle r={44} fill="rgba(237,228,210,0.92)" />
          <path d="M-12 -18 L20 0 L-12 18 Z" fill={C.dark} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 22, right: 22, bottom: 22, height: 6, borderRadius: 3, background: "rgba(237,228,210,0.22)" }}>
        <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 3, background: C.accent }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// quote and verdict
// ---------------------------------------------------------------------------------------------------------------------
export const Quote: React.FC<{ ws: { w: string; at: number; hl?: number }[]; size?: number; width?: number; rtl?: boolean }> = ({ ws, size = 56, width = 580, rtl }) => {
  const t = useT();
  return (
    <div style={{ fontFamily: rtl ? F.fa : F.serif, fontStyle: rtl ? undefined : "italic", fontWeight: rtl ? 700 : 500, fontSize: rtl ? size * 0.85 : size, lineHeight: rtl ? 1.4 : 1.12, color: C.ink, width, direction: rtl ? "rtl" : "ltr" }}>
      {ws.map((k, i) => {
        const p = eOut(ramp(t, k.at, k.at + 0.36));
        const hl = k.hl !== undefined ? eOut(ramp(t, k.hl, k.hl + 0.3)) : 0;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", zIndex: 0, marginRight: rtl ? 0 : "0.24em", marginLeft: rtl ? "0.24em" : 0, opacity: p, transform: `translateY(${(1 - p) * 0.4}em)`, filter: p < 1 ? `blur(${(1 - p) * 7}px)` : undefined }}>
            {k.hl !== undefined ? <span style={{ position: "absolute", left: "-0.1em", right: "-0.12em", top: "0.16em", bottom: "0.04em", background: C.mark, mixBlendMode: "multiply", transform: `scaleX(${hl}) skewX(-4deg)`, transformOrigin: rtl ? "100% 50%" : "0 50%", zIndex: -1, borderRadius: "0.12em" }} /> : null}
            {k.w}
          </span>
        );
      })}
    </div>
  );
};

/** the closing take: small label, one big line between pen quotes, an underline, an optional pen moon (good night) */
export const Verdict: React.FC<{ at: number; line: string; lineAt: number; label?: string; ulAt?: number; moonAt?: number; size?: number; rtl?: boolean }> = ({ at, line, lineAt, label = "MY TAKE", ulAt, moonAt, size = 64, rtl }) => {
  const t = useT();
  const q = pop(t, at, 0.4);
  const l = pop(t, lineAt, 0.3);
  const qm = pop(t, Math.min(at + 0.05, lineAt - 0.05), 0.3); // the quote marks open with the label, the line inks on its word
  const ul = ulAt !== undefined ? eInOut(ramp(t, ulAt, ulAt + 0.5)) : 0;
  const moon = moonAt !== undefined ? eInOut(ramp(t, moonAt, moonAt + 0.45)) : 0;
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 54, width: 800, textAlign: "center", opacity: q }}>
        <div style={mono(21, C.label, 600, "0.14em")}>{label}</div>
        <div style={{ marginTop: 14, fontFamily: rtl ? F.fa : F.serif, fontSize: rtl ? size * 0.85 : size, fontWeight: 700, color: C.ink, lineHeight: 1.15, opacity: l, transform: `translateY(${(1 - l) * 14}px)`, direction: rtl ? "rtl" : "ltr" }}>
          {line}
          <span style={{ color: C.accent }}>.</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 30, top: 60, ...serif(150, 700, C.accent), opacity: qm * 0.9, transform: `translateX(${(1 - qm) * 30}px)` }}>“</div>
      <div style={{ position: "absolute", left: 700, top: 60, ...serif(150, 700, C.accent), opacity: qm * 0.9, transform: `translateX(${(1 - qm) * -30}px)` }}>”</div>
      <Svg>
        <Stroke d="M170 196 C 310 186, 500 204, 630 190" p={ul} w={5} color={C.accent} />
        {moon > 0 ? (
          <g transform="translate(730 250)" opacity={moon}>
            <Stroke d="M0 -30 A 30 30 0 1 0 22 22 A 24 24 0 1 1 0 -30 Z" p={moon} w={3.6} color={C.ink} />
          </g>
        ) : null}
      </Svg>
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// the call card (absolute frame coordinates). The page steps aside while a phone on the table rings and talks:
// a narrow sheet on the left carries the call — ideas before the ring, the ring, the live transcript, «CALL ENDED».
// ---------------------------------------------------------------------------------------------------------------------
export type CallLine = { who: string; a: number; b: number; text: string };
export const CallCard: React.FC<{
  inAt: number;
  outAt: number;
  ringAt: number;
  answerAt: number;
  endAt: number;
  lines: CallLine[];
  /** speaker key → label; the first key is drawn as the caller side (accent bubble edge, left) */
  names: Record<string, string>;
  caller: string;
  title?: string;
  headline?: string;
  ideasTitle?: string;
  ideas?: [number, string][];
  x?: number;
  y?: number;
  w?: number;
}> = ({ inAt, outAt, ringAt, answerAt, endAt, lines, names, caller, title = "CALL ASSISTANT", headline, ideasTitle, ideas = [], x = 24, y = 1268, w = 470 }) => {
  const t = useT();
  const pin = eOut5(ramp(t, inAt, inAt + 0.55));
  const pout = eInOut(ramp(t, outAt, outAt + 0.5));
  if (pin <= 0 || pout >= 1) return null;
  const top = y + (1 - pin) * 700 + pout * 700;
  const rot = -0.6 + Math.sin(t * 0.5) * 0.08;
  const ringing = t >= ringAt && t < answerAt;
  const inCall = t >= answerAt && t < endAt + 0.05;
  const ended = t >= endAt;
  const first = Object.keys(names)[0];
  const ideaOp = 1 - eInOut(ramp(t, ringAt - 0.15, ringAt + 0.1));
  const ring = pop(t, ringAt, 0.25) * (1 - eInOut(ramp(t, (lines[0]?.a ?? answerAt) - 0.35, (lines[0]?.a ?? answerAt) - 0.05)));
  const secs = Math.max(0, Math.floor(Math.min(t, endAt) - answerAt));
  const timer = `00:${String(secs).padStart(2, "0")}`;
  const last = lines.filter((l) => t >= l.a).slice(-2);
  // after the answer the ring folds into a compact caller row, so the card is never empty before the first line
  const row = pop(t, (lines[0]?.a ?? answerAt) - 0.3, 0.3) * (1 - eInOut(ramp(t, endAt + 0.1, endAt + 0.4)));
  const reveal = (l: CallLine) => {
    const ws = l.text.split(" ");
    const n = Math.max(1, Math.ceil(ramp(t, l.a, l.b) * ws.length - 1e-6));
    return ws.slice(0, n).join(" ");
  };
  return (
    <div style={{ position: "absolute", left: x, top, width: w, height: 1980 - y, opacity: 1 - pout * 0.85, transform: `rotate(${rot}deg)`, transformOrigin: "50% 100%" }}>
      <div style={{ position: "absolute", left: 8, right: 8, top: -6, height: 80, background: "rgba(0,0,0,0.5)", filter: "blur(24px)", borderRadius: 28 }} />
      <div style={{ position: "absolute", inset: 0, background: paperBg, borderRadius: "4px 4px 0 0", boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 0 0 1px rgba(60,48,30,0.12)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 26, top: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 12, height: 12, background: C.accent, flex: "none" }} />
          <span style={mono(21, C.ink, 700, "0.1em")}>{title}</span>
        </div>
        <div style={{ position: "absolute", right: 26, top: 20, padding: "6px 10px 5px", borderRadius: 5, background: ringing ? C.accent : inCall ? C.ink : "transparent", border: ringing || inCall ? "none" : `2px solid ${C.ink3}`, ...mono(21, ringing || inCall ? C.paperHi : C.label, 700, "0.1em") }}>
          {ended ? "ENDED" : inCall ? timer : ringing ? "RINGING" : "READY"}
        </div>
        <div style={{ position: "absolute", left: 26, top: 66, width: w - 52, height: 1.5, background: C.rule }} />

        {/* before the ring: what it is for */}
        {ideaOp > 0.01 ? (
          <div style={{ position: "absolute", left: 26, top: 86, width: w - 52, opacity: ideaOp }}>
            {headline ? (
              <div style={{ ...serif(44, 600), opacity: pop(t, inAt + 0.1, 0.4) }}>
                {headline}
                <span style={{ color: C.accent }}>.</span>
              </div>
            ) : null}
            {ideasTitle ? <div style={{ marginTop: 10, ...mono(21, C.label, 600, "0.12em"), opacity: pop(t, (ideas[0]?.[0] ?? inAt) - 0.3, 0.3) }}>{ideasTitle}</div> : null}
            {ideas.map(([at, s], i) => {
              const q = pop(t, at, 0.3);
              const key = i === ideas.length - 1;
              return (
                <div key={s} style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 12, opacity: q, transform: `translateX(${(1 - q) * -20}px)` }}>
                  <svg width={26} height={26} style={{ flex: "none" }}>
                    <Stroke d="M4 14 L11 21 L23 5" p={eInOut(ramp(t, at + 0.1, at + 0.35))} w={4} color={key ? C.accent : C.ink} />
                  </svg>
                  <span style={serif(key ? 32 : 30, key ? 700 : 600)}>{s}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* the ring */}
        {ring > 0.01 ? (
          <div style={{ position: "absolute", left: 0, top: 86, width: w, height: 320, opacity: ring, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg width={200} height={150} style={{ overflow: "visible" }}>
              {[0, 1, 2].map((i) => {
                const ph = (t * 1.4 + i / 3) % 1;
                return <circle key={i} cx={100} cy={75} r={34 + ph * 46} fill="none" stroke={C.accent} strokeWidth={3} opacity={(1 - ph) * 0.8} />;
              })}
              <g transform={`translate(100 75) rotate(${t < answerAt ? Math.sin(t * 38) * 12 : 0})`}>
                <circle r={34} fill={C.accent} />
                <path d="M-14 -10 C -16 6, -6 16, 10 14 L14 6 L6 0 L0 6 C -4 4, -6 0, -6 -4 L0 -8 L-6 -16 Z" fill={C.paperHi} />
              </g>
            </svg>
            <div style={serif(40, 700)}>{caller}</div>
            <div style={{ marginTop: 10, ...mono(21, C.label, 600, "0.12em") }}>{t < answerAt ? "IS CALLING" : "CONNECTED"}</div>
          </div>
        ) : null}

        {/* the caller row (after the answer) */}
        {row > 0.01 ? (
          <div style={{ position: "absolute", left: 24, top: 84, width: w - 48, display: "flex", alignItems: "center", gap: 14, opacity: row, transform: `translateY(${(1 - row) * 10}px)` }}>
            <svg width={52} height={52} style={{ flex: "none" }}>
              <circle cx={26} cy={26} r={25} fill={C.accent} />
              <path d="M14 18 C 12 30, 22 40, 34 38 L38 32 L32 27 L27 32 C 23 30, 21 27, 21 23 L26 19 L21 13 Z" fill={C.paperHi} />
            </svg>
            <div>
              <div style={serif(32, 700)}>{caller}</div>
              <div style={{ marginTop: 6, ...mono(21, C.label, 600, "0.12em") }}>ON THE LINE</div>
            </div>
          </div>
        ) : null}

        {/* the transcript, line by line as it is said (the last two, stacked under the caller row) */}
        {lines.length && t >= lines[0].a - 0.2 ? (
          <div
            style={{
              position: "absolute",
              left: 22,
              top: 156,
              width: w - 44,
              height: 300,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: 10,
              opacity: pop(t, lines[0].a - 0.15, 0.3) * (1 - 0.85 * eInOut(ramp(t, endAt + 0.1, endAt + 0.4))),
            }}
          >
            {last.map((l) => {
              const q = pop(t, l.a, 0.25);
              const side = l.who === first;
              return (
                <div key={l.a} style={{ alignSelf: side ? "flex-start" : "flex-end", maxWidth: w - 90, opacity: q, transform: `translateY(${(1 - q) * 14}px)` }}>
                  <div style={{ ...mono(21, side ? C.accent : C.label, 700, "0.12em"), textAlign: side ? "left" : "right", marginBottom: 5 }}>{names[l.who] ?? l.who}</div>
                  <div style={{ padding: "11px 15px 12px", borderRadius: 12, background: side ? C.paperHi : C.ink, border: side ? `2px solid ${C.ink}` : "none", fontFamily: F.serif, fontSize: 29, fontWeight: 600, lineHeight: 1.18, color: side ? C.ink : C.paperHi }}>{reveal(l)}</div>
                </div>
              );
            })}
          </div>
        ) : null}
        <Stamp x={62} y={200} at={endAt + 0.2} text={`CALL ENDED · ${timer}`} size={28} rot={-6} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1980 - y - 300, bottom: 0, background: "linear-gradient(180deg, rgba(26,20,12,0) 0%, rgba(26,20,12,0.32) 45%, rgba(26,20,12,0.55) 100%)" }} />
      </div>
    </div>
  );
};

/** a pen loop around the real phone on the table (absolute frame coordinates), from `at` until `until` */
export const PhoneRing: React.FC<{ x: number; y: number; w: number; h: number; at: number; until: number }> = ({ x, y, w, h, at, until }) => {
  const t = useT();
  if (t < at || t > until + 0.3) return null;
  const pad = 1 - eInOut(ramp(t, until - 0.25, until));
  // the loop keeps a small tremble while it rings
  const sh = Math.sin(t * 40) * 1.6 * pad;
  return (
    <div style={{ position: "absolute", left: sh, top: 0, opacity: pad }}>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        {[0, 1].map((i) => {
          const ph = (t * 1.3 + i / 2) % 1;
          return <ellipse key={i} cx={x + w / 2} cy={y + h / 2} rx={w / 2 + 18 + ph * 40} ry={h / 2 + 14 + ph * 30} fill="none" stroke={C.accent} strokeWidth={2.4} opacity={(1 - ph) * 0.55 * pad} />;
        })}
      </svg>
      <RingAbs x={x} y={y} w={w} h={h} at={at + 0.05} />
    </div>
  );
};
const RingAbs: React.FC<{ x: number; y: number; w: number; h: number; at: number }> = ({ x, y, w, h, at }) => {
  const t = useT();
  const p = eInOut(ramp(t, at, at + 0.4));
  const mask = `conic-gradient(from 20deg at 50% 50%, #000 ${p * 372}deg, transparent ${p * 372 + 0.5}deg)`;
  return (
    <svg style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "visible", WebkitMaskImage: mask, maskImage: mask }} viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M 58 4 C 88 2, 101 30, 99 52 C 97 80, 70 98, 45 97 C 16 96, 1 74, 2 50 C 3 22, 26 5, 52 3 C 63 2, 72 6, 78 10" fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/** loudness envelope {fps, db[]} (pipeline/voice-env.cjs) → a 0..1 level at time t */
export const envLevel = (env: { fps: number; db: number[] }) => (t: number) => {
  const i = Math.round(t * env.fps);
  const v = env.db[Math.max(0, Math.min(env.db.length - 1, i))] ?? -90;
  return clamp((v + 50) / 36);
};

/** a live waveform drawn on the table while a voice speaks (absolute frame coordinates); colour = who is talking */
export const VoiceWave: React.FC<{ a: number; b: number; x: number; y: number; level: (t: number) => number; who: (t: number) => string | null; labels: Record<string, string>; accentKey: string; bars?: number }> = ({
  a,
  b,
  x,
  y,
  level,
  who,
  labels,
  accentKey,
  bars = 34,
}) => {
  const t = useT();
  const op = fade(t, a, b, 0.35);
  if (op <= 0) return null;
  const cur = who(t);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: op }}>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {Array.from({ length: bars }, (_, i) => {
          const tt = t - (bars - 1 - i) * 0.05;
          const v = level(tt) * (0.75 + 0.25 * hash(i, Math.floor(tt * 20)));
          const h = 6 + v * 120;
          return <rect key={i} x={x + i * 14} y={y - h / 2} width={7} height={h} rx={3.5} fill={who(tt) === accentKey ? C.accent : C.ink} opacity={0.9} />;
        })}
      </svg>
      {cur ? (
        <div style={{ position: "absolute", left: x, top: y - 106, padding: "6px 10px 5px", borderRadius: 5, background: cur === accentKey ? C.accent : C.ink, ...mono(21, C.paperHi, 700, "0.12em"), boxShadow: "0 3px 10px rgba(0,0,0,0.35)" }}>{labels[cur] ?? cur}</div>
      ) : null}
    </div>
  );
};
