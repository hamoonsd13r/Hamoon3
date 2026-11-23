// Talk Cutout · the speaker's own video and the layers around her. One camera holds three layers:
//   1. the picture  (talk.mp4: her levelled take, frame-exact at film time)
//   2. BEHIND       (cards, numbers, logos, kinetic words: they sit on her wall)
//   3. the cut-out  (talk_fg.webm: the SAME frames with a steady solid alpha, so she stands in front of them)
// and FRONT things (comment sheet, DM, captions) are drawn after the camera, over her.
// No footage mapped? The placeholder subject (a code-drawn silhouette on a warm wall) plays the same role: the picture
// layer draws wall + subject, the cut-out layer draws the subject again through its own matte (an SVG clip of the
// same silhouette), so the behind/in-front layering reads exactly as it will with your footage.
import React from "react";
import { OffthreadVideo, Sequence } from "remotion";
import { useMedia } from "./media";
import { clamp, mix, useT } from "./time";
import { F } from "./theme";

// ── her video ───────────────────────────────────────────────────────────────────────────────────────────────────
export type TalkSrc = {
  fps: number; // frame rate of talk.mp4 / talk_fg.webm (the frames you extracted: 30)
  start?: number; // the source opens on black frames: hold the first lit frame (s) before it
  hold?: number; // the last frame to show (s): held under the DM / end card
  skip?: number[]; // single frames never shown (a black frame between two takes) → the frame before
  w?: number; h?: number; // frame size
};
/** her picture (fg = the cut-out) frame-exact at film time t (film time = source time: her voice is never edited) */
export const TalkVid: React.FC<{ src: string; s: TalkSrc; fg?: boolean }> = ({ src, s, fg }) => {
  const { t, frame } = useT();
  const fps = s.fps;
  let local = Math.round(t * fps);
  if (s.start !== undefined) local = Math.max(Math.round(s.start * fps), local);
  if (s.hold !== undefined) local = Math.min(Math.round(s.hold * fps), local);
  local = Math.max(0, local);
  while (s.skip?.includes(local)) local--;
  return (
    <Sequence from={frame - local} layout="none">
      <OffthreadVideo src={src} muted transparent={fg} style={{ position: "absolute", left: 0, top: 0, width: s.w ?? 1080, height: s.h ?? 1920 }} />
    </Sequence>
  );
};

// ── the placeholder subject ─────────────────────────────────────────────────────────────────────────────────────
export type Pose = {
  x: number; y: number; // head centre (frame px)
  s?: number; // scale (1 = a head 208 px wide)
  tilt?: number; // head tilt (deg)
  hand?: { x: number; y: number; point?: number } | null; // a raised forearm on the viewer's left, its hand at (x, y) frame px, the finger at `point` deg (−125 = up-left); null = arms down
  talk?: number; // 0..1: talking (a small bob)
};

/** the silhouette as SVG shapes (frame px). Same shapes for the picture and for the matte. */
const Shapes: React.FC<{ p: Pose; t: number; fill: string; rim?: string; H: number }> = ({ p, t, fill, rim, H }) => {
  const s = p.s ?? 1;
  const talk = p.talk ?? 0;
  const bob = talk * (2.4 * Math.sin(t * 7.3) + 1.4 * Math.sin(t * 11.7));
  const breath = 3 * Math.sin(t * 1.7);
  const hx = p.x + 1.5 * Math.sin(t * 0.7), hy = p.y + bob;
  const tilt = (p.tilt ?? 0) + talk * 1.1 * Math.sin(t * 4.1);
  const by = p.y + breath; // the body breathes, the head talks
  const X = (k: number) => p.x + k * s, Y = (k: number) => by + k * s;
  // shoulders: a soft trapezius slope into rounded shoulders, then the sleeves falling to the frame's bottom
  const torso =
    `M${X(-50)} ${Y(176)}` +
    ` C${X(-96)} ${Y(206)} ${X(-196)} ${Y(214)} ${X(-246)} ${Y(258)}` +
    ` C${X(-296)} ${Y(300)} ${X(-318)} ${Y(390)} ${X(-326)} ${Y(560)}` +
    ` L${X(-340)} ${H + 40} L${X(340)} ${H + 40} L${X(326)} ${Y(560)}` +
    ` C${X(318)} ${Y(390)} ${X(296)} ${Y(300)} ${X(246)} ${Y(258)}` +
    ` C${X(196)} ${Y(214)} ${X(96)} ${Y(206)} ${X(50)} ${Y(176)} Z`;
  // the neck narrows under the jaw
  const neck = `M${hx - 40 * s} ${hy + 86 * s} Q${hx - 44 * s} ${Y(150)} ${X(-58)} ${Y(196)} L${X(58)} ${Y(196)} Q${hx + 44 * s} ${Y(150)} ${hx + 40 * s} ${hy + 86 * s} Z`;
  // a raised forearm from the body's left edge (the upper arm stays inside the silhouette), the finger pointing. Filled
  // capsules, not strokes: an SVG clip path ignores strokes, and the matte must hold every part of her.
  let arm: React.ReactNode = null;
  if (p.hand) {
    const ex = X(-262), ey = Y(372);
    const fa = ((p.hand.point ?? -125) * Math.PI) / 180;
    arm = (
      <>
        <path d={capsule(ex, ey, p.hand.x, p.hand.y, 43 * s)} fill={fill} />
        <path d={capsule(p.hand.x, p.hand.y, p.hand.x + Math.cos(fa) * 62 * s, p.hand.y + Math.sin(fa) * 62 * s, 12 * s)} fill={fill} />
      </>
    );
  }
  // a fragment (no <g>): these shapes are also the children of a <clipPath>, where a group is not allowed
  return (
    <>
      <path d={torso} fill={fill} />
      <path d={neck} fill={fill} />
      <ellipse cx={hx} cy={hy} rx={100 * s} ry={124 * s} fill={fill} transform={`rotate(${tilt} ${hx} ${hy + 100 * s})`} />
      {arm}
      {rim ? (
        <>
          <path d={torso} fill="none" stroke={rim} strokeWidth={3} />
          <ellipse cx={hx} cy={hy} rx={100 * s} ry={124 * s} fill="none" stroke={rim} strokeWidth={3} transform={`rotate(${tilt} ${hx} ${hy + 100 * s})`} />
        </>
      ) : null}
    </>
  );
};

/** a filled capsule (a thick round-capped segment) as a path */
const capsule = (x1: number, y1: number, x2: number, y2: number, r: number) => {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * r, ny = Math.cos(a) * r;
  const f = (v: number) => v.toFixed(1);
  return `M${f(x1 + nx)} ${f(y1 + ny)} L${f(x2 + nx)} ${f(y2 + ny)} A${f(r)} ${f(r)} 0 0 0 ${f(x2 - nx)} ${f(y2 - ny)} L${f(x1 - nx)} ${f(y1 - ny)} A${f(r)} ${f(r)} 0 0 0 ${f(x1 + nx)} ${f(y1 + ny)} Z`;
};

/** the warm wall behind the placeholder subject (light, like most home walls: so every element on it is dark glass) */
const Wall: React.FC<{ t: number; W: number; H: number; light: { x: number; y: number } }> = ({ t, W, H, light }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #d8cfc2 0%, #cbc1b3 45%, #b2a898 100%)" }} />
    {/* soft vertical folds of a curtain */}
    <div style={{ position: "absolute", left: -60, top: 0, width: W + 120, height: H, background: "repeating-linear-gradient(90deg, rgba(60,45,30,0.06) 0px, rgba(255,255,255,0.05) 46px, rgba(60,45,30,0.06) 92px, rgba(60,45,30,0.02) 150px, rgba(60,45,30,0.06) 210px)", filter: "blur(14px)", transform: `translateX(${4 * Math.sin(t * 0.3)}px)` }} />
    {/* the key light pooling behind her head */}
    <div style={{ position: "absolute", left: light.x - W * 0.55, top: light.y - W * 0.55, width: W * 1.1, height: W * 1.1, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,247,234,0.55), rgba(255,247,234,0))" }} />
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 70% at 50% 40%, transparent 55%, rgba(40,30,20,0.28) 100%)" }} />
  </div>
);

let clipId = 0;
/** the placeholder subject. layer "picture": wall + her shadow + her; layer "cutout": her alone, through a matte that
 *  is the same silhouette (the stand-in for talk_fg.webm) */
export const Subject: React.FC<{ pose: Pose; layer: "picture" | "cutout"; W?: number; H?: number; label?: string }> = ({ pose, layer, W = 1080, H = 1920, label }) => {
  const { t } = useT();
  const id = React.useMemo(() => `tcsub${clipId++}`, []);
  const body = (
    <>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#30333a" />
          <stop offset="0.55" stopColor="#1d1f24" />
          <stop offset="1" stopColor="#121317" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stopColor="rgba(255,236,214,0.55)" />
          <stop offset="0.5" stopColor="rgba(255,236,214,0.08)" />
          <stop offset="1" stopColor="rgba(255,236,214,0.32)" />
        </linearGradient>
      </defs>
      <Shapes p={pose} t={t} fill={`url(#${id}f)`} rim={`url(#${id}r)`} H={H} />
    </>
  );
  if (layer === "cutout") {
    // the matte: the same silhouette as an SVG clip path; the cut-out = the subject seen through it
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <clipPath id={`${id}m`}>
            <Shapes p={pose} t={t} fill="#fff" H={H} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}m)`}>{body}</g>
      </svg>
    );
  }
  return (
    <>
      <Wall t={t} W={W} H={H} light={{ x: pose.x + 40, y: pose.y + 60 }} />
      {/* her shadow on the wall, a little right and down */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, filter: "blur(22px)", opacity: 0.2, transform: "translate(30px, 16px)" }}>
        <Shapes p={pose} t={t} fill="#2a2018" H={H} />
      </svg>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
        {body}
      </svg>
      {label ? (
        <div style={{ position: "absolute", left: 40, bottom: 40, padding: "8px 16px", borderRadius: 12, background: "rgba(20,18,16,0.55)", fontFamily: F.ui, fontWeight: 700, fontSize: 22, color: "rgba(244,238,230,0.78)", direction: "ltr", letterSpacing: 0.5 }}>{label}</div>
      ) : null}
    </>
  );
};

// ── the stage: picture → behind → cut-out, under one camera ─────────────────────────────────────────────────────
export type TalkStageP = {
  on: number; // 0..1 visibility (cross-fades with the motion sections)
  scale: number; // the punch-in camera on her (≤ 1.035 while something sits in the band above her head)
  origin?: string; // scale origin (her face): "540px 600px" vertical, "980px 430px" landscape
  shake?: number; // px (jolts on hits)
  blur?: number; // zoom-blur in/out of the motion sections
  dim?: number; // 0..1: the DM thread covers her: blur + darken
  picOn?: number; // 0..1: her own fade to black at the end (the backdrop shows through)
  behind?: React.ReactNode; // the things that sit BEHIND her
  front?: React.ReactNode; // over her (comment sheet, DM): outside the camera
  fg?: boolean; // draw the cut-out (only while something sits behind her: decoding the alpha video costs time)
  src?: TalkSrc; // her video's frame facts
  pose?: Pose; // the placeholder subject's pose (when talk.mp4 is not mapped)
  W?: number; H?: number;
};
export const TalkStage: React.FC<TalkStageP> = ({ on, scale, origin = "540px 600px", shake = 0, blur = 0, dim = 0, picOn = 1, behind, front, fg = true, src = { fps: 30 }, pose, W = 1080, H = 1920 }) => {
  const pic = useMedia("talk.mp4");
  const cut = useMedia("talk_fg.webm");
  if (on <= 0) return null;
  const s = { ...src, w: W, h: H };
  const p: Pose = pose ?? { x: W / 2, y: H * 0.26 };
  const filt = blur > 0.3 || dim > 0 ? `blur(${blur + 12 * dim}px) brightness(${1 - 0.45 * dim})` : undefined;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: on }}>
      <div style={{ position: "absolute", inset: 0, opacity: picOn, transformOrigin: origin, transform: `translateY(${shake}px) scale(${scale})`, filter: filt }}>
        {pic ? <TalkVid src={pic} s={s} /> : <Subject pose={p} layer="picture" W={W} H={H} label="YOUR TAKE · talk.mp4" />}
        {behind}
        {fg ? (cut ? <TalkVid src={cut} s={s} fg /> : pic ? null : <Subject pose={p} layer="cutout" W={W} H={H} />) : null}
      </div>
      {front}
    </div>
  );
};

/** a smooth pose change between two takes is a JUMP CUT in real footage: switch poses instantly at the cut time */
export const poseAt = (t: number, takes: { a: number; pose: Pose }[]) => {
  let k = 0;
  for (let i = 0; i < takes.length; i++) if (t >= takes[i].a) k = i;
  return takes[k].pose;
};
/** the raised hand travelling down over a take (the hook: cards appear where her hand has just left) */
export const handPath = (t: number, keys: [number, number, number][]) => {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, xa, ya] = keys[i - 1], [b, xb, yb] = keys[i];
      const u = clamp((t - a) / Math.max(1e-6, b - a));
      const e = u * u * (3 - 2 * u);
      return { x: mix(xa, xb, e), y: mix(ya, yb, e) };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l[1], y: l[2] };
};
