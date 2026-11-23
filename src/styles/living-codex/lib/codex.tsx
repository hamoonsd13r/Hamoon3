// Living Codex · ONE manuscript page in extreme macro by candlelight. A narrow focus band (tilt-shift depth of field:
// three copies of the page under screen-space masks) glides over the blackletter ink. A line writes itself with a wet
// ink tip; then the camera reads down the column to each named word, which turns to gold leaf with a gloss in the
// margin. Finally the camera pulls back and the page sinks into darkness. 1920×1080, `t` = seconds since the scene began.
import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { Glow, Motes } from "./fx";
import { C, F, clamp, easeInOut, fbm, flick, hexA, lerp, rng, sstep, vnoise } from "./theme";

// ── the page (page pixels) ──────────────────────────────────────────────────────────────────────
const PW = 2400, PH = 1700;
const COLX = [170, 1290], COLW = 960, ROW0 = 190, RH = 58, ROWS = 25;
const rowY = (r: number) => ROW0 + r * RH;
/** filler script (any language you like; Latin reads as «old record» without being legible content) */
export const CODEX_PHRASES = [
  "anno domini haroldus rex cecidit", "et willelmus dux normannorum", "regnum anglorum obtinuit", "proelium magnum apud hastingas",
  "carolus magnus imperator", "coronatus est romae", "nomina testium hugo odo", "rogerius matilda et adela", "kalendis ianuarii luna xii",
  "hoc anno fames magna fuit", "et pestis in civitate regia", "bellum inter francos et saxones", "alfredus rex danos vicit",
  "apud ethandun cum exercitu", "ricardus rex in terra sancta", "gesta regum et principum", "ludovicus filius eius regnavit",
  "obiit henricus rex mense iulio", "ecclesia sancti petri consecrata", "otto imperator in italiam venit", "et multi ceciderunt",
];
/** a named word on the page: row 7–20 of the first column, the word that turns gold, the rest of its line, a gloss */
export type CodexKey = { row: number; word: string; rest: string; gloss: string; at: number; x?: number };
const KEYX = [70, 20, 110, 40];

// a vellum sheet with fibres, foxing and a ruled grid, at a resolution that holds up in macro (made once per tab)
let vellum: string | null = null;
const vellumURL = () => {
  if (vellum) return vellum;
  const W = 1200, H = 850;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x / 90, y / 90, 3, 7);
      const fib = vnoise(x / 1.4, y / 36, 11) * 0.5 + vnoise(x / 28, y / 1.3, 13) * 0.5;
      const fox = Math.max(0, fbm(x / 26, y / 26, 2, 57) - 0.66) * 1.8;
      const v = 0.8 + (n - 0.5) * 0.24 + (fib - 0.5) * 0.07 - fox * 0.3;
      const i = (y * W + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, 234 * v + 10));
      img.data[i + 1] = Math.max(0, Math.min(255, 212 * v - 2));
      img.data[i + 2] = Math.max(0, Math.min(255, 166 * v - 16));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  vellum = c.toDataURL("image/jpeg", 0.92);
  return vellum;
};

const INK = "#2a170b", RUB = "#8a2414", GOLD = "#f0b85a", LEAF = "#b9801f";
type Line = { col: number; row: number; text: string; rubric: boolean };

const Page: React.FC<{ keys: CodexKey[]; lines: Line[]; gold: number[]; write: number; writeRow: number; writeText: string; tex: string }> = ({ keys, lines, gold, write, writeRow, writeText, tex }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, backgroundImage: `url(${tex})`, backgroundSize: "100% 100%", boxShadow: "0 60px 160px rgba(0,0,0,0.8)" }}>
    {/* ruling: pricked guide lines under the script */}
    {COLX.map((x) => (
      <div key={x} style={{ position: "absolute", left: x - 20, top: ROW0 - 30, width: COLW + 40, height: ROWS * RH,
        background: `repeating-linear-gradient(180deg, rgba(120,80,50,0) 0 ${RH - 12}px, rgba(120,80,50,0.18) ${RH - 12}px ${RH - 11}px, rgba(120,80,50,0) ${RH - 11}px ${RH}px)` }} />
    ))}
    {COLX.map((x) => <div key={`m${x}`} style={{ position: "absolute", left: x - 34, top: ROW0 - 40, width: 1, height: ROWS * RH + 20, background: "rgba(140,60,40,0.25)" }} />)}
    {/* the script */}
    {lines.map((l, i) => (
      <div key={i} style={{ position: "absolute", left: COLX[l.col], top: rowY(l.row) - 40, width: COLW, fontFamily: F.fraktur, fontSize: 36, lineHeight: "44px", color: INK, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden" }}>
        {l.rubric ? <><span style={{ color: RUB, fontSize: 54 }}>{l.text[0].toUpperCase()}</span>{l.text.slice(1)}</> : l.text}
      </div>
    ))}
    {/* the line being written now */}
    <div style={{ position: "absolute", left: COLX[0], top: rowY(writeRow) - 40, width: COLW, fontFamily: F.fraktur, fontSize: 36, lineHeight: "44px", color: INK, whiteSpace: "nowrap", clipPath: `inset(-20px ${(1 - write) * 100}% -20px 0)` }}>
      <span style={{ color: RUB, fontSize: 54 }}>{writeText[0]}</span>{writeText.slice(1)}
    </div>
    {write > 0 && write < 1 && (
      <div style={{ position: "absolute", left: COLX[0] + COLW * write - 4, top: rowY(writeRow) - 22, width: 9, height: 9, borderRadius: 5, background: "#1a0d05", boxShadow: `0 0 10px 3px ${hexA("#ffcf8a", 0.55)}` }} />
    )}
    {/* the named words: ink turns to gold leaf, a gold rule draws under it */}
    {keys.map((k, i) => {
      const g = gold[i];
      const x = COLX[0] + (k.x ?? KEYX[i % KEYX.length]), y = rowY(k.row);
      return (
        <React.Fragment key={`${k.word}${i}`}>
          <div style={{ position: "absolute", left: x, top: y - 40, fontFamily: F.fraktur, fontSize: 36, lineHeight: "44px", whiteSpace: "nowrap", color: INK, opacity: 0.92 }}>
            <span style={{ fontSize: 54, color: g > 0.02 ? `rgb(${lerp(138, 185, g)},${lerp(36, 128, g)},${lerp(20, 31, g)})` : RUB,
              textShadow: g > 0.02 ? `0 1px 0 ${hexA("#5a3208", g)}, 0 -1px 0 ${hexA("#ffe6a8", 0.8 * g)}, 0 0 ${16 * g}px ${hexA(GOLD, 0.55 * g)}` : undefined }}>{k.word}</span>{k.rest}
          </div>
          <div style={{ position: "absolute", left: x, top: y + 10, height: 3, width: (k.word.length * 27 + 10) * easeInOut(clamp(g * 1.4)), background: LEAF, boxShadow: `0 0 12px ${hexA(GOLD, 0.8)}`, opacity: Math.min(1, g * 2) }} />
        </React.Fragment>
      );
    })}
  </div>
);

type Cam = { cx: number; cy: number; s: number; rx: number };
const camLerp = (a: Cam, b: Cam, k: number): Cam => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)), rx: lerp(a.rx, b.rx, k) });

export type CodexProps = {
  t: number;
  keys: CodexKey[]; // up to ~4 words, read in order
  writeAt: number; // the written line finishes ~1.1 s after this
  writeText?: string;
  writeRow?: number;
  pullAt?: number; // pull-back starts (default: last word + 0.4)
  outAt?: number; // the page has sunk into darkness (default: pull-back end + 0.3)
  glossFont?: string; // F.fa for Persian glosses, F.label for Latin
  phrases?: string[];
};

export const CodexPage: React.FC<CodexProps> = ({ t, keys, writeAt, writeText = "In hoc libro scripta sunt gesta regum et nomina eorum", writeRow = 6, pullAt, outAt, glossFont = F.fa, phrases = CODEX_PHRASES }) => {
  const tex = useMemo(vellumURL, []);
  const lines = useMemo(() => {
    const r = rng(5);
    const out: Line[] = [];
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (col === 0 && (row === writeRow || keys.some((k) => k.row === row))) continue;
        const n = 2 + Math.floor(r() * 2);
        const text = Array.from({ length: n }, () => phrases[Math.floor(r() * phrases.length)]).join(" ");
        out.push({ col, row, text: text.length > 62 ? text.slice(0, 62) : text, rubric: row % 6 === 1 });
      }
    }
    return out;
  }, [keys, writeRow, phrases]);
  const tk = keys.map((k) => k.at);
  const last = tk[tk.length - 1] ?? writeAt + 1;
  const p0 = pullAt ?? last + 0.4;
  const pEnd = p0 + 1.6;
  const out = outAt ?? pEnd + 0.3;
  // camera keys: above the writing line, read it, then step down the column to each named word, then pull back
  const kx = (i: number) => COLX[0] + (keys[i].x ?? KEYX[i % KEYX.length]);
  const atKey = (i: number, dx = 0): Cam => ({ cx: kx(i) + 100 + dx, cy: rowY(keys[i].row) - 14, s: 2.5, rx: 52 });
  const camKeys: [number, Cam][] = [
    [Math.min(0, writeAt - 1.6), { cx: COLX[0] + 200, cy: rowY(writeRow) - 60, s: 2.8, rx: 54 }],
    [writeAt - 0.4, { cx: COLX[0] + 330, cy: rowY(writeRow) - 16, s: 2.6, rx: 53 }],
  ];
  if (keys.length) camKeys.push([tk[0] - 0.55, { cx: COLX[0] + 640, cy: rowY(writeRow) - 8, s: 2.5, rx: 52 }]);
  keys.forEach((_, i) => camKeys.push([tk[i] - 0.05, atKey(i)], [Math.min(tk[i] + 0.45, (tk[i + 1] ?? Infinity) - 0.15), atKey(i, 40)]));
  camKeys.push([pEnd, { cx: 1000, cy: 760, s: 0.9, rx: 34 }], [pEnd + 0.35, { cx: 1000, cy: 760, s: 0.85, rx: 32 }]);
  let i = 0;
  while (i + 1 < camKeys.length - 1 && camKeys[i + 1][0] <= t) i++;
  const [ta, ca] = camKeys[i], [tb, cb] = camKeys[i + 1];
  const cam = camLerp(ca, cb, easeInOut(clamp((t - ta) / Math.max(0.001, tb - ta))));

  const write = clamp((t - (writeAt - 0.9)) / 2.0);
  const gold = tk.map((w) => sstep(w - 0.12, w + 0.45, t));
  const fl = flick(t, 3);
  const open = sstep(-0.2, 0.9, t); // light comes up quickly (frame 0 is never black)
  const pull = sstep(p0, pEnd, t);
  const sink = sstep(out - 0.4, out, t);
  // depth of field: a narrow sharp band while we read, opening up as we pull back
  const half = lerp(5.5, 26, pull), soft = lerp(7, 16, pull);
  const band = (h: number, f: number) => {
    const a = 50 - h - f, b = 50 - h, d = 50 + h, e = 50 + h + f;
    const g = `linear-gradient(180deg, transparent ${a}%, black ${b}%, black ${d}%, transparent ${e}%)`;
    return { WebkitMaskImage: g, maskImage: g } as React.CSSProperties;
  };
  const plane = (blur: number) => (
    <div style={{ position: "absolute", inset: 0, perspective: 1100, perspectiveOrigin: "960px 470px", filter: blur > 0 ? `blur(${blur}px)` : undefined }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transformOrigin: "0 0", transform: `translate(960px, 540px) scale(${cam.s}) rotateX(${cam.rx}deg) translate(${-cam.cx}px, ${-cam.cy}px)` }}>
        <Page keys={keys} lines={lines} gold={gold} write={write} writeRow={writeRow} writeText={writeText} tex={tex} />
      </div>
    </div>
  );
  const bright = (0.82 + 0.18 * fl) * (0.35 + 0.65 * open) * (1 - 0.95 * sink);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: `brightness(${bright.toFixed(3)})` }}>
        {plane(10)}
        <AbsoluteFill style={band(half + soft, soft * 1.6)}>{plane(3.2)}</AbsoluteFill>
        <AbsoluteFill style={band(half, soft)}>{plane(0)}</AbsoluteFill>
        {/* candlelight from below right, the page falling off into shadow */}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 80% at ${62 + 3 * fl}% 78%, rgba(255,170,80,${0.16 + 0.08 * fl}) 0%, rgba(40,20,8,0) 55%, rgba(5,4,3,0.82) 100%)` }} />
      </AbsoluteFill>
      <Glow x={1250} y={980} r={520} color={C.ember} a={0.18 * open * (0.7 + 0.3 * fl) * (1 - sink)} />
      {keys.map((k, j) => {
        const nx = tk[j + 1] ?? p0 + 0.6;
        const a = gold[j] * (1 - sstep(nx - 0.2, nx + 0.15, t));
        if (a <= 0.01) return null;
        return (
          // in the page's empty left margin, level with the word (right edge at x 600), on a small dark pill
          <div key={`${k.gloss}${j}`} style={{ position: "absolute", right: 1920 - 600, top: 508, display: "flex", direction: "ltr", alignItems: "center", gap: 14, opacity: a,
            transform: `translateX(${-14 * (1 - gold[j])}px)`, fontFamily: glossFont, fontSize: glossFont === F.label ? 28 : 34, letterSpacing: glossFont === F.label ? "0.3em" : 0,
            textTransform: glossFont === F.label ? "uppercase" : undefined, color: GOLD, padding: "6px 14px 8px 18px", background: "rgba(12,8,4,0.62)", borderRadius: 2 }}>
            <span dir="auto">{k.gloss}</span>
            <span style={{ width: 40 * easeInOut(gold[j]), height: 2, background: GOLD, boxShadow: `0 0 10px ${hexA(GOLD, 0.8)}` }} />
          </div>
        );
      })}
      <Motes t={t} n={34} seed={5} box={[300, 120, 1700, 900]} size={2} color="#ffd9a0" opacity={0.45 * open * (1 - sink)} />
    </AbsoluteFill>
  );
};
