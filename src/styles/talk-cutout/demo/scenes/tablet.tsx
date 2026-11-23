// Talk Cutout demo · MOTION, step 3 «قدم سوم: ایده‌ی خودت رو به هوش مصنوعی بگو تا متن ویدیوت رو بنویسه». The tablet
// lands on «ایده‌ی»; her idea (a note chip) floats over it and drops into the composer on «رو»; the app lights up on
// «هوش مصنوعی»; her own words type themselves into the box as she says them («متن ویدیوم رو بنویس.»: the typed words are
// the captions there) and the send lands right after her last word, then the reply starts. The AI's name and mark stay
// blurred: which AI it is, is the CTA's promise.
import React from "react";
import { C, F, accentA } from "../../lib/theme";
import { clamp, ease, jolt, mix } from "../../lib/time";
import { World, camKF, drift, type Cam } from "../../lib/camera";
import { TB, Tablet } from "../../lib/device";
import { Icon } from "../../lib/icons";
import { AiChat, CU, makePrompt } from "../../lib/apps/ai-chat";
import { CodeThumb } from "../../lib/apps/thumb";
import { AI_REPLY, IDEA, PROMPT_KEYS, SEND, T } from "../script";

const S = 1.12; // tablet scale (834 pt → 934 px)
const PROMPT = makePrompt(PROMPT_KEYS);
const DROP = T.rooi - 0.05; // the idea drops into the composer
const comp = { x: 540, y: 960 + (TB.h / 2 - 190) * S }; // the composer area (world px)

const cam = (t: number): Cam =>
  drift(
    camKF(t, [
      [T.ide - 0.08, { x: 540, y: 1060, s: 0.66, rx: 14, ry: 18 }],
      [T.ide + 0.42, { x: 540, y: 1135, s: 0.92, rx: 3, ry: 4 }],
      [DROP + 0.42, { x: 620, y: comp.y - 150, s: 1.22, rx: 2, ry: 2 }],
      [T.hoosh3 + 0.5, { x: 705, y: comp.y - 116, s: 1.6 }],
      // the prompt types right-to-left from the composer's right edge: keep that edge in frame
      [T.matn, { x: 705, y: comp.y - 128, s: 1.66 }],
      [PROMPT.end + 0.02, { x: 690, y: comp.y - 146, s: 1.72 }],
      [SEND + 0.35, { x: 760, y: comp.y - 40, s: 2.1 }],
    ]),
    t,
    0.7,
  );

const IdeaChip: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.5, padding: `${size * 0.45}px ${size * 0.9}px`, borderRadius: 999, background: size > 30 ? "rgba(20,22,26,0.92)" : CU.card, border: `${size > 30 ? 2 : 1}px solid ${size > 30 ? C.accent : CU.line}`, whiteSpace: "nowrap", direction: "rtl" }}>
    <Icon n="bulb" size={size * 1.15} color={C.accent} sw={2.2} />
    <span style={{ fontFamily: F.vzB, fontSize: size, color: C.cream }}>{IDEA}</span>
  </div>
);

export const TabletScene: React.FC<{ t: number }> = ({ t }) => {
  const glow = clamp((t - (T.hoosh3 - 0.1)) / 0.4) * (1 - 0.6 * clamp((t - (T.hoosh3 + 1.2)) / 0.6));
  const kick = jolt(t, T.ide + 0.02, 22, 34, 8);
  // the idea chip over the tablet → into the composer (world px; the slot ≈ tablet pt (654, 930))
  const u = ease.out(clamp((t - (T.ide - 0.02)) / 0.3));
  const m = ease.inOut(clamp((t - DROP) / 0.38));
  const slot = { x: 540 + (654 - TB.w / 2) * S, y: 960 + (930 - TB.h / 2) * S };
  const bob = Math.sin(t * 2.2) * 7 * (1 - m);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${kick}px)` }}>
      <World cam={cam(t)}>
        <div style={{ position: "absolute", left: 540 - 700, top: 960 - 700, width: 1400, height: 1400, borderRadius: "50%", background: `radial-gradient(closest-side, ${accentA(0.3 * glow)}, transparent)`, filter: "blur(30px)" }} />
        <Tablet x={540} y={960} s={S} glow={C.accent} glowA={0.45 + 0.3 * glow}>
          <AiChat t={t} hide name="AI" attach={{ at: DROP + 0.3, node: <IdeaChip size={20} /> }} typed={PROMPT.spans(t)} typingFrom={PROMPT.start} sent={SEND} userText={PROMPT.text} reply={AI_REPLY} />
        </Tablet>
        <IdeaPreview t={t} />
        {u > 0 && m < 1 ? (
          <div style={{ position: "absolute", left: mix(540, slot.x, m), top: mix(1060, slot.y, m) + bob, transform: `translate(-50%,-50%) scale(${mix(0.72, 1, u) * mix(1, 0.42, m)}) rotate(${(1 - u) * -4 + m * 3}deg)`, opacity: u * (1 - clamp((m - 0.8) / 0.2)), boxShadow: "0 24px 70px rgba(0,0,0,0.55)", borderRadius: 999 }}>
            <IdeaChip size={40} />
          </div>
        ) : null}
      </World>
      {/* the send: a warm pulse right before the cut */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 40% at 62% 70%, ${accentA(0.3)}, transparent)`, opacity: clamp((t - (SEND - 0.02)) / 0.08) * (1 - clamp((t - SEND - 0.1) / 0.3)) * 0.8, pointerEvents: "none" }} />
    </div>
  );
};

/** the idea's own preview opens in the chat once it drops in (the tablet's empty middle must never be dark glass for
 *  seconds): a thumbnail of the planned video, its title and length (world px, above the composer) */
const IdeaPreview: React.FC<{ t: number }> = ({ t }) => {
  const a = DROP + 0.3;
  if (t < a || t > SEND + 0.3) return null;
  const u = ease.out(clamp((t - a) / 0.45)) * (1 - clamp((t - SEND) / 0.25));
  const W = 540, X = 700 - W / 2, Y = 852, TH = (W * 9) / 16;
  const zoom = 1.03 + 0.06 * clamp((t - a) / 4.5);
  return (
    <div style={{ position: "absolute", left: X, top: Y + (1 - u) * 46, width: W, borderRadius: 24, overflow: "hidden", background: "#25272c", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)", opacity: u, transform: `scale(${mix(0.94, 1, u)})`, transformOrigin: "50% 100%" }}>
      <CodeThumb spec={{ hue: 28, title: "NO KNEAD|60 SEC", motif: "loaf" }} w={W} h={TH} zoom={zoom} />
      <div style={{ position: "absolute", left: 14, top: 14, padding: "4px 12px", borderRadius: 8, background: "rgba(0,0,0,0.6)", fontFamily: F.ui, fontWeight: 800, fontSize: 18, letterSpacing: 2, color: C.accent2 }}>IDEA</div>
      <div style={{ position: "absolute", right: 12, top: TH - 40, padding: "3px 10px", borderRadius: 7, background: "rgba(0,0,0,0.8)", fontFamily: F.ui, fontWeight: 650, fontSize: 20, color: "#fff" }}>1:00</div>
      <div style={{ padding: "14px 18px 16px", direction: "rtl" }}>
        <div style={{ fontFamily: F.vzB, fontSize: 26, color: "#f1f1f1", whiteSpace: "nowrap" }}>{IDEA}</div>
        <div style={{ fontFamily: F.vz, fontSize: 20, color: "#aaa", marginTop: 4, whiteSpace: "nowrap" }}>ایده‌ی ویدیوی بعدی · برای کانال خودم</div>
      </div>
    </div>
  );
};
