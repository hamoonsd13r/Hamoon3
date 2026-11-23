// Noir Studio · app screens built in code at true UI size (points), filled with YOUR data: a YouTube channel page, an
// Instagram profile, an AI chat (the prompt types word by word, the reply streams in), a comment sheet. Never grey
// skeleton bars: every card has real text, a picture (code-drawn thumbnail or your image) and numbers.
// Put a screen inside a <Phone> / <Tablet> from device.tsx; lift its numbers with <Lift> from kit.tsx.
import React from "react";
import { Img, staticFile } from "remotion";
import { C, F, IG_GRAD, clamp, ease, fmtK } from "./theme";
import { Icon, InstagramMark, YouTubeMark } from "./logos";

const P = 393; // phone screen width (pt)

/** a code-drawn thumbnail: a gradient of `hue`, a big title, a few shapes (or your image) */
export const Thumb: React.FC<{ w: number; h: number; hue: number; title: string; img?: string; dur?: string; r?: number; titleTop?: boolean }> = ({ w, h, hue, title, img, dur, r = 10, titleTop }) => (
  <div style={{ position: "relative", width: w, height: h, borderRadius: r, overflow: "hidden", background: `linear-gradient(135deg, hsl(${hue} 70% 34%), hsl(${(hue + 40) % 360} 60% 14%))`, flexShrink: 0 }}>
    {img ? (
      <Img src={staticFile(img)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", maxWidth: "none" }} />
    ) : (
      <>
        <div style={{ position: "absolute", right: -w * 0.12, top: -h * 0.25, width: w * 0.7, height: w * 0.7, borderRadius: "50%", background: `hsl(${(hue + 20) % 360} 85% 58% / 0.35)` }} />
        <div style={{ position: "absolute", left: w * 0.06, ...(titleTop ? { top: Math.min(h * 0.17, w * 0.15) * 2.2 } : { bottom: dur ? h * 0.2 : h * 0.1 }), width: w * 0.88, direction: "rtl", fontFamily: F.fa, fontSize: Math.min(h * 0.17, w * 0.15), lineHeight: 1.1, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{title}</div>
      </>
    )}
    {dur ? <div style={{ position: "absolute", right: 6, bottom: 6, padding: "1px 5px", borderRadius: 4, background: "rgba(0,0,0,0.8)", fontFamily: F.ui, fontWeight: 600, fontSize: h * 0.11, color: "#fff" }}>{dur}</div> : null}
  </div>
);

// ─── YouTube channel page ──────────────────────────────────────────────────────────────────────────────────────
export type YtVideo = { title: string; views: number; age: string; hue: number; dur?: string; img?: string };
export type YtChannelP = { name: string; handle: string; subs: number; count: number; videos: YtVideo[]; scroll?: number; hi?: number; hiA?: number; avatar?: string; bannerHue?: number };
/** the rows start at y = 330 + i·250 (thumbnail 361×203, then title and «views · age») */
export const YT_ROW_Y = (i: number) => 330 + i * 250;
export const YtChannel: React.FC<YtChannelP> = ({ name, handle, subs, count, videos, scroll = 0, hi = -1, hiA = 0, avatar, bannerHue = 18 }) => (
  <div style={{ position: "absolute", inset: 0, background: "#0f0f0f", color: "#f1f1f1", fontFamily: F.ui, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 54, background: "#0f0f0f", zIndex: 30 }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: -scroll }}>
      <div style={{ height: 54 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px" }}>
        <YouTubeMark size={26} />
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.4 }}>YouTube</span>
        <div style={{ flex: 1 }} />
        <Icon n="search" size={22} color="#f1f1f1" />
      </div>
      <div style={{ margin: "8px 14px 0", height: 66, borderRadius: 12, background: `linear-gradient(110deg, hsl(${bannerHue} 70% 30%), hsl(${(bannerHue + 30) % 360} 50% 12%))` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 6px" }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", background: `linear-gradient(135deg, hsl(${bannerHue} 80% 55%), hsl(${(bannerHue + 40) % 360} 70% 30%))`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", overflow: "hidden" }}>
          {avatar ? <Img src={staticFile(avatar)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0, 1)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 21, direction: "rtl", fontFamily: /[؀-ۿ]/.test(name) ? F.faB : F.ui }}>{name}</div>
          <div style={{ fontSize: 12.5, color: "#aaa", marginTop: 2 }}>
            {handle} · <b style={{ color: "#f1f1f1" }}>{fmtK(subs)}</b> subscribers · {count} videos
          </div>
        </div>
      </div>
      <div style={{ margin: "6px 14px", height: 34, borderRadius: 17, background: "#f1f1f1", color: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>Subscribe</div>
      <div style={{ display: "flex", gap: 22, padding: "10px 14px 0", fontSize: 14, fontWeight: 600, color: "#aaa", borderBottom: "1px solid #272727" }}>
        <span>Home</span>
        <span style={{ color: "#f1f1f1", borderBottom: "2px solid #f1f1f1", paddingBottom: 8 }}>Videos</span>
        <span>Shorts</span>
        <span>Playlists</span>
      </div>
      {videos.map((v, i) => (
        <div key={i} style={{ position: "absolute", left: 16, top: YT_ROW_Y(i), width: P - 32, outline: i === hi && hiA > 0 ? `3px solid rgba(255,106,31,${hiA})` : undefined, outlineOffset: 6, borderRadius: 12 }}>
          <Thumb w={P - 32} h={(P - 32) * 0.5625} hue={v.hue} title={v.title} img={v.img} dur={v.dur} />
          <div style={{ marginTop: 8, fontSize: 14.5, fontWeight: 600, lineHeight: 1.3, direction: "rtl", fontFamily: F.faB }}>{v.title}</div>
          <div style={{ fontSize: 12.5, color: "#aaa", marginTop: 3 }}>
            {fmtK(v.views)} views · {v.age}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Instagram profile ─────────────────────────────────────────────────────────────────────────────────────────
export type IgProfileP = { handle: string; name: string; posts: number; followers: number; following: number; bio: string[]; tiles: { hue: number; title: string; views?: number; img?: string }[]; scroll?: number };
/** where the followers number sits on the profile (for a Lift): screen pt */
export const IG_FOLLOWERS = { x: 196, y: 128, w: 80, h: 26 };
export const IgProfile: React.FC<IgProfileP> = ({ handle, name, posts, followers, following, bio, tiles, scroll = 0 }) => (
  <div style={{ position: "absolute", inset: 0, background: "#000", color: "#f5f5f5", fontFamily: F.ui, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 54, background: "#000", zIndex: 30 }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: -scroll }}>
      <div style={{ height: 54 }} />
      <div style={{ display: "flex", alignItems: "center", padding: "4px 16px", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 19 }}>{handle}</span>
        <div style={{ flex: 1 }} />
        <InstagramMark size={22} mono="#f5f5f5" />
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 18 }}>
        <div style={{ width: 82, height: 82, borderRadius: "50%", padding: 3, background: IG_GRAD() }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "3px solid #000", background: "linear-gradient(135deg, #3a3d44, #15171a)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28 }}>{handle.slice(0, 1).toUpperCase()}</div>
        </div>
        {[
          [posts, "posts"],
          [followers, "followers"],
          [following, "following"],
        ].map(([v, l]) => (
          <div key={l as string} style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{fmtK(v as number)}</div>
            <div style={{ fontSize: 12.5, color: "#ccc" }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 16px", direction: "rtl", fontFamily: F.vz, fontSize: 14, lineHeight: 1.45 }}>
        <div style={{ fontFamily: F.faB, fontSize: 15 }}>{name}</div>
        {bio.map((b, i) => (
          <div key={i}>{b}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, padding: "12px 16px" }}>
        {["Follow", "Message"].map((b) => (
          <div key={b} style={{ flex: 1, height: 32, borderRadius: 8, background: b === "Follow" ? C.igBlue : "#262626", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{b}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {tiles.map((tl, i) => (
          <div key={i} style={{ position: "relative", height: 174 }}>
            <Thumb w={130} h={174} hue={tl.hue} title={tl.title} img={tl.img} r={0} />
            {tl.views ? <div style={{ position: "absolute", left: 6, bottom: 6, fontSize: 12, fontWeight: 700, textShadow: "0 1px 3px #000" }}>▷ {fmtK(tl.views)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── AI chat (tablet) ──────────────────────────────────────────────────────────────────────────────────────────
/** a generic AI chat: the prompt types into the composer word by word (`words` = the times each word appears),
 *  is sent at `sendAt`, then the reply streams line by line from `replyAt`. Brand-neutral by default. */
export const AiChat: React.FC<{ t: number; w: number; h: number; model?: string; logo?: React.ReactNode; prompt: string; words: number[]; sendAt: number; reply: string[]; replyAt: number; lineDur?: number; greeting?: string; chips?: string[]; fs?: number }> = ({ t, w, h, model = "دستیار هوش مصنوعی", logo, prompt, words, sendAt, reply, replyAt, lineDur = 0.55, greeting = "امروز چی بسازیم؟", chips = ["ایده برای ویدیو", "نوشتن متن", "عنوان جذاب"], fs = 34 }) => {
  const toks = prompt.split(" ");
  const shown = toks.filter((_, i) => t >= (words[i] ?? Infinity)).join(" ");
  const sent = t >= sendAt;
  const caret = Math.floor(t * 2) % 2 === 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#1a1a1a", color: "#ececec", overflow: "hidden" }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, borderBottom: "1px solid #2a2a2a", direction: "rtl" }}>
        {logo ?? <div style={{ width: 26, height: 26, borderRadius: 8, background: C.accent }} />}
        <span style={{ fontFamily: F.faB, fontSize: fs * 0.8 }}>{model}</span>
      </div>
      <div style={{ position: "absolute", left: 36, right: 36, top: 100, bottom: 150, display: "flex", flexDirection: "column", gap: 22, direction: "rtl" }}>
        {!sent ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.2, display: "flex", flexDirection: "column", alignItems: "center", gap: 34, opacity: 1 - clamp((t - sendAt + 0.2) / 0.2) }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="wand" size={54} color={C.accent2} sw={2} />
            </div>
            <div style={{ fontFamily: F.faB, fontSize: fs * 1.35, color: "#f2f2f2" }}>{greeting}</div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, maxWidth: w * 0.86 }}>
              {chips.map((c) => (
                <div key={c} style={{ padding: "12px 24px", borderRadius: 999, border: "1px solid #3a3a3a", background: "#222", fontFamily: F.vz, fontSize: fs * 0.8, color: "#cfcfcf" }}>{c}</div>
              ))}
            </div>
          </div>
        ) : null}
        {sent ? (
          <div style={{ alignSelf: "flex-start", maxWidth: w * 0.82, padding: "18px 26px", borderRadius: 26, background: "#2f2f2f", fontFamily: F.vz, fontSize: fs, lineHeight: 1.5, opacity: ease.out(clamp((t - sendAt) / 0.25)) }}>{prompt}</div>
        ) : null}
        {sent && t < replyAt ? (
          <div style={{ display: "flex", gap: 10, padding: "6px 4px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "#9a9a9a", opacity: 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 0.9)) }} />
            ))}
          </div>
        ) : null}
        {reply.map((line, i) => {
          const a = replyAt + i * lineDur;
          if (t < a) return null;
          const u = clamp((t - a) / lineDur);
          const chars = [...line];
          return (
            <div key={i} style={{ fontFamily: F.vz, fontSize: fs * 0.94, lineHeight: 1.55, color: "#e6e6e6", alignSelf: "stretch" }}>
              {chars.slice(0, Math.max(1, Math.round(u * chars.length))).join("")}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 30, right: 30, bottom: 34, minHeight: 84, borderRadius: 28, background: "#2a2a2a", border: "1px solid #3a3a3a", display: "flex", alignItems: "center", padding: "14px 22px", gap: 14, direction: "rtl" }}>
        <div style={{ flex: 1, fontFamily: F.vz, fontSize: fs, lineHeight: 1.5, color: sent || !shown ? "#8e8e8e" : "#ececec" }}>
          {sent ? "پیام بده…" : shown || "پیام بده…"}
          {!sent && shown && caret ? <span style={{ color: C.accent }}>▍</span> : null}
        </div>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: shown && !sent ? "#ececec" : "#3a3a3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="up" size={24} color={shown && !sent ? "#1a1a1a" : "#8e8e8e"} sw={2.6} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, pointerEvents: "none" }} />
    </div>
  );
};

// ─── comment sheet ─────────────────────────────────────────────────────────────────────────────────────────────
/** an Instagram-style comment sheet: earlier comments, then yours typed and sent (with a heart on it) */
export const CommentSheet: React.FC<{ t: number; comments: { user: string; text: string }[]; mine: string; typeAt: number; sendAt: number }> = ({ t, comments, mine, typeAt, sendAt }) => {
  const chars = [...mine];
  const typed = chars.slice(0, Math.round(clamp((t - typeAt) / Math.max(0.3, sendAt - typeAt - 0.15)) * chars.length)).join("");
  const sent = t >= sendAt;
  const list = sent ? [...comments, { user: "you", text: mine }] : comments;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#121212", color: "#f5f5f5", fontFamily: F.ui }}>
      <div style={{ height: 6, width: 40, borderRadius: 3, background: "#555", margin: "10px auto" }} />
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 18, paddingBottom: 10, borderBottom: "1px solid #262626" }}>Comments</div>
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {list.map((c, i) => {
          const isMine = sent && i === list.length - 1;
          const k = isMine ? ease.outBack(clamp((t - sendAt) / 0.4)) : 1;
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", transform: `scale(${0.9 + 0.1 * k})`, opacity: k, transformOrigin: "0 50%" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: isMine ? C.accent : `hsl(${(i * 67) % 360} 40% 40%)`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#ddd" }}>{c.user}</div>
                <div style={{ fontFamily: F.vz, fontSize: 20, direction: "rtl", textAlign: "left", marginTop: 2 }}>{c.text}</div>
              </div>
              <div style={{ color: isMine ? C.red : "#777", fontSize: 16 }}>{isMine ? "♥" : "♡"}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 10, right: 10, bottom: 18, height: 46, borderRadius: 23, border: "1px solid #3a3a3a", display: "flex", alignItems: "center", padding: "0 16px", gap: 10 }}>
        <div style={{ flex: 1, fontFamily: F.vz, fontSize: 19, direction: "rtl", textAlign: "left", color: sent || !typed ? "#888" : "#f5f5f5" }}>{sent ? "Add a comment…" : typed || "Add a comment…"}</div>
        <span style={{ fontWeight: 700, fontSize: 14, color: typed && !sent ? C.igBlue : "#555" }}>Post</span>
      </div>
    </div>
  );
};
