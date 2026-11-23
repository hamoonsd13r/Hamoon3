// Talk Cutout · the YouTube app (dark mode, phone screen pt 393×852) for the full-screen steps: splash → home → search
// (a query types itself) → results → a channel → its Videos tab → the Popular chip → the most-viewed row lights up.
// The screen is a pure function of a state object (YtState) that the scene computes from the narration's words, so
// every tap lands on the word that says it. Channel and videos come in as data: use a SAMPLE channel you invent (or
// your own channel), never a real third party's page, thumbnails or numbers. Thumbnails: CodeThumb, or your own images.
import React from "react";
import { C, F } from "../theme";
import { clamp, ease } from "../time";
import { Icon, YouTubeMark } from "../icons";
import { PH, StatusBar, Tap } from "../device";
import { CodeThumb, type ThumbSpec } from "./thumb";

const BG = "#0f0f0f", TX = "#f1f1f1", SUB = "#aaaaaa", CHIP = "#272727";

export type YtVideo = { title: string; views: string; ago: string; len: string; thumb: ThumbSpec };
export type YtChannel = { name: string; handle: string; subs: string; videos: string; desc: string; hue: number; letter: string };
export type YtData = { ch: YtChannel; home: YtVideo[]; latest: YtVideo[]; popular: YtVideo[]; suggest: string[]; homeChips?: string[] };

export type YtState = {
  page: "home" | "search" | "channel";
  splash?: number; // 1 = the YouTube splash covers the home page («وارد یوتیوب شو»)
  splashG?: number; // 0..1: the logo grows while the splash holds (never an empty black phone)
  typed?: string; results?: number; hiChan?: number; // search
  tab?: "home" | "videos"; hiStats?: number; sub?: number; popular?: number; hiRow?: number; viewsHi?: number; scroll?: number; // channel
  tap?: { x: number; y: number; u: number };
};
export const LIST_Y = 448; // first video row (pt) on the Videos tab
export const ROW_H = 292;

const Avatar: React.FC<{ ch: YtChannel; size: number }> = ({ ch, size }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(140deg, hsl(${ch.hue}, 62%, 62%), hsl(${ch.hue + 20}, 58%, 30%))`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.ui, fontWeight: 900, fontSize: size * 0.44, color: "rgba(255,255,255,0.95)", flex: "none" }}>{ch.letter}</div>
);

const hiColor = (k: number) => (k > 0 ? `rgba(255,${Math.round(241 - 120 * k)},${Math.round(241 - 200 * k)},1)` : SUB);

const VideoRow: React.FC<{ v: YtVideo; ch: YtChannel; y: number; hi?: number; viewsHi?: number }> = ({ v, ch, y, hi = 0, viewsHi = 0 }) => (
  <div style={{ position: "absolute", left: 0, top: y, width: PH.w }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: PH.w, height: 221, overflow: "hidden" }}>
      <CodeThumb spec={v.thumb} w={PH.w} h={221} />
      <div style={{ position: "absolute", right: 8, bottom: 8, padding: "1px 5px", borderRadius: 4, background: "rgba(0,0,0,0.8)", fontSize: 12.5, fontWeight: 600 }}>{v.len}</div>
      {hi > 0 ? <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 0 ${3.5 * hi}px ${C.accent}` }} /> : null}
    </div>
    <div style={{ position: "absolute", left: 12, top: 233 }}>
      <Avatar ch={ch} size={36} />
    </div>
    <div style={{ position: "absolute", left: 60, top: 230, width: 290, fontSize: 15.5, fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
    <div style={{ position: "absolute", left: 60, top: 254, fontSize: 12.5, color: SUB, whiteSpace: "nowrap" }}>
      {ch.name} · <span style={{ color: hiColor(viewsHi), fontWeight: viewsHi > 0 ? 700 : 400 }}>{v.views} views</span> · {v.ago}
    </div>
    <div style={{ position: "absolute", right: 6, top: 232 }}>
      <Icon n="dots" size={20} color={TX} sw={3} />
    </div>
  </div>
);

const Home: React.FC<{ d: YtData }> = ({ d }) => (
  <>
    <div style={{ position: "absolute", left: 0, top: 54, width: PH.w, height: 44, display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box", gap: 6 }}>
      <YouTubeMark size={30} />
      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.8 }}>YouTube</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 20 }}>
        <Icon n="cast" size={22} color={TX} />
        <Icon n="bell" size={22} color={TX} />
        <Icon n="search" size={22} color={TX} />
      </div>
    </div>
    <div style={{ position: "absolute", left: 12, top: 104, display: "flex", gap: 8, fontSize: 14, fontWeight: 600 }}>
      {(d.homeChips ?? ["All", "Cooking", "Music", "Gaming", "Live"]).map((c, i) => (
        <span key={c} style={{ padding: "6px 12px", borderRadius: 8, background: i === 0 ? TX : CHIP, color: i === 0 ? BG : TX }}>{c}</span>
      ))}
    </div>
    {d.home.map((v, i) => <VideoRow key={i} v={v} ch={d.ch} y={150 + ROW_H * i} />)}
  </>
);

const Search: React.FC<{ d: YtData; typed: string; results: number; hiChan: number }> = ({ d, typed, results, hiChan }) => (
  <>
    <div style={{ position: "absolute", left: 0, top: 54, width: PH.w, height: 44, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", boxSizing: "border-box" }}>
      <Icon n="back" size={24} color={TX} />
      <div style={{ flex: 1, height: 36, borderRadius: 18, background: CHIP, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, fontWeight: 600, color: typed ? TX : SUB }}>
        {typed || "Search YouTube"}
        {results < 1 ? <span style={{ display: "inline-block", width: 2, height: 19, background: "#3ea6ff", marginLeft: 2 }} /> : null}
      </div>
      <Icon n="mic" size={22} color={TX} />
    </div>
    {results < 1
      ? d.suggest.map((s, i) => (
          <div key={s} style={{ position: "absolute", left: 18, top: 120 + i * 46, display: "flex", alignItems: "center", gap: 16, fontSize: 16, color: TX, opacity: typed.length > 2 ? 1 - clamp(results * 2.5) : 0 }}>
            <Icon n="search" size={18} color={SUB} />
            {s}
          </div>
        ))
      : null}
    <div style={{ position: "absolute", left: 0, top: 112, width: PH.w, opacity: ease.out(clamp((results - 0.35) / 0.65)), transform: `translateY(${(1 - ease.out(clamp((results - 0.35) / 0.65))) * 20}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", borderRadius: 16, margin: "0 6px", background: hiChan > 0 ? `rgba(255,106,31,${0.14 * hiChan})` : undefined, boxShadow: hiChan > 0 ? `inset 0 0 0 ${2 * hiChan}px rgba(255,106,31,0.8)` : undefined }}>
        <Avatar ch={d.ch} size={92} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2 }}>{d.ch.name}</div>
          <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{d.ch.handle} · <span style={{ color: hiChan > 0.5 ? C.accent2 : SUB, fontWeight: hiChan > 0.5 ? 700 : 400 }}>{d.ch.subs} subscribers</span></div>
          <div style={{ marginTop: 8, display: "inline-block", padding: "6px 16px", borderRadius: 18, background: TX, color: BG, fontSize: 14, fontWeight: 700 }}>Subscribe</div>
        </div>
      </div>
      <VideoRow v={d.popular[0]} ch={d.ch} y={140} viewsHi={hiChan} />
    </div>
  </>
);

const Channel: React.FC<{ d: YtData; s: YtState }> = ({ d, s }) => {
  const videos = s.tab === "videos";
  const sc = s.scroll ?? 0;
  const pop = s.popular ?? 0;
  const sub = s.sub ?? 0;
  const tabBar = (
    <div style={{ position: "absolute", left: 0, top: 352, width: PH.w, height: 40, display: "flex", gap: 24, padding: "0 18px", boxSizing: "border-box", fontSize: 15, fontWeight: 600, color: SUB, borderBottom: "1px solid #272727", whiteSpace: "nowrap" }}>
      {["Home", "Videos", "Shorts", "Playlists", "Posts"].map((n, i) => {
        const on = (i === 1) === videos && i < 2;
        return (
          <span key={n} style={{ color: on ? TX : SUB, position: "relative" }}>
            {n}
            {on ? <span style={{ position: "absolute", left: 0, right: 0, bottom: -13, height: 2.5, background: TX }} /> : null}
          </span>
        );
      })}
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: -sc, width: PH.w }}>
      <div style={{ position: "absolute", left: 0, top: 54, width: PH.w, height: 44, display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box", gap: 18 }}>
        <Icon n="back" size={24} color={TX} />
        <div style={{ flex: 1 }} />
        <Icon n="cast" size={22} color={TX} />
        <Icon n="search" size={22} color={TX} />
        <Icon n="dots" size={24} color={TX} sw={3} />
      </div>
      <div style={{ position: "absolute", left: 16, top: 104, width: 361, height: 60, borderRadius: 12, overflow: "hidden", background: `linear-gradient(100deg, hsl(${d.ch.hue}, 55%, 30%), hsl(${d.ch.hue + 25}, 60%, 50%) 60%, hsl(${d.ch.hue + 35}, 70%, 70%))` }} />
      <div style={{ position: "absolute", left: 16, top: 180 }}>
        <Avatar ch={d.ch} size={86} />
      </div>
      <div style={{ position: "absolute", left: 116, top: 178, fontSize: 24, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.18 }}>{d.ch.name}</div>
      <div style={{ position: "absolute", left: 116, top: 210, fontSize: 13.5, color: TX, fontWeight: 600, whiteSpace: "nowrap" }}>{d.ch.handle}</div>
      <div style={{ position: "absolute", left: 116, top: 230, fontSize: 13.5, color: SUB, whiteSpace: "nowrap" }}>
        <span style={{ color: (s.hiStats ?? 0) > 0 ? hiColor(s.hiStats ?? 0) : TX, fontWeight: 700 }}>{d.ch.subs} subscribers</span> · {d.ch.videos} videos
      </div>
      <div style={{ position: "absolute", left: 16, top: 276, width: 361, fontSize: 13.5, color: SUB, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.ch.desc}</div>
      <div style={{ position: "absolute", left: 16, top: 300, width: 361, height: 36, borderRadius: 18, background: sub > 0.5 ? CHIP : TX, color: sub > 0.5 ? TX : BG, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 700, transform: `scale(${1 - 0.05 * Math.sin(Math.PI * clamp(sub * 2))})`, boxShadow: sub > 0 ? `0 0 0 ${2.5 * clamp(sub * 3)}px rgba(255,106,31,${0.9 * (1 - clamp((sub - 0.6) / 0.4))})` : undefined }}>
        {sub > 0.5 ? (
          <>
            <Icon n="bell" size={17} color={TX} /> Subscribed
          </>
        ) : (
          "Subscribe"
        )}
      </div>
      {tabBar}
      {videos ? (
        <>
          <div style={{ position: "absolute", left: 14, top: 404, display: "flex", gap: 8, fontSize: 14, fontWeight: 600 }}>
            {["Latest", "Popular", "Oldest"].map((c, i) => {
              const on = i === (pop >= 0.5 ? 1 : 0);
              return <span key={c} style={{ padding: "6px 13px", borderRadius: 8, background: on ? TX : CHIP, color: on ? BG : TX }}>{c}</span>;
            })}
          </div>
          {pop < 1 ? (
            <div style={{ position: "absolute", left: 0, top: 0, width: PH.w, opacity: 1 - ease.inOut(clamp(pop * 2)) }}>
              {d.latest.map((v, k) => <VideoRow key={k} v={v} ch={d.ch} y={LIST_Y + k * ROW_H} />)}
            </div>
          ) : null}
          {pop > 0.5 ? (
            <div style={{ position: "absolute", left: 0, top: (1 - ease.out(clamp((pop - 0.5) * 2))) * 40, width: PH.w, opacity: ease.out(clamp((pop - 0.5) * 2)) }}>
              {d.popular.map((v, k) => <VideoRow key={k} v={v} ch={d.ch} y={LIST_Y + k * ROW_H} hi={k === 0 ? s.hiRow : 0} viewsHi={k <= 1 ? s.viewsHi : 0} />)}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div style={{ position: "absolute", left: 16, top: 410, fontSize: 18, fontWeight: 800 }}>For You</div>
          <VideoRow v={d.popular[0]} ch={d.ch} y={446} />
          <VideoRow v={d.popular[1]} ch={d.ch} y={446 + ROW_H} />
        </>
      )}
    </div>
  );
};

const Splash: React.FC<{ u: number; g?: number }> = ({ u, g = 0 }) =>
  u > 0 ? (
    <div style={{ position: "absolute", inset: 0, background: BG, zIndex: 35, opacity: u, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: PH.w / 2 - 220, top: 426 - 220, width: 440, height: 440, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(255,0,51,${0.34 * g}), transparent)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, transform: `scale(${(1 + 0.08 * (1 - u)) * (1 + 0.55 * g)})` }}>
        <YouTubeMark size={64} />
        <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.6 }}>YouTube</span>
      </div>
    </div>
  ) : null;

/** the whole phone screen for state s */
export const YtScreen: React.FC<{ s: YtState; d: YtData }> = ({ s, d }) => (
  <div style={{ position: "absolute", inset: 0, background: BG, fontFamily: F.ui, color: TX, direction: "ltr", overflow: "hidden" }}>
    {s.page === "home" ? <Home d={d} /> : null}
    {s.page === "search" ? <Search d={d} typed={s.typed ?? ""} results={s.results ?? 0} hiChan={s.hiChan ?? 0} /> : null}
    {s.page === "channel" ? <Channel d={d} s={s} /> : null}
    <div style={{ position: "absolute", left: 0, bottom: 0, width: PH.w, height: 80, background: BG, borderTop: "1px solid #272727", display: "flex", justifyContent: "space-around", paddingTop: 10, boxSizing: "border-box", zIndex: 20 }}>
      {["home", "film", "plus", "bell", "user"].map((n) => (
        <Icon key={n} n={n} size={24} color={TX} />
      ))}
    </div>
    <Splash u={s.splash ?? 0} g={s.splashG ?? 0} />
    {s.tap ? <Tap x={s.tap.x} y={s.tap.y} u={s.tap.u} /> : null}
    <StatusBar />
  </div>
);

/** a query typed across [a, b] (letter by letter: Latin search text) */
export const typedAt = (t: number, word: string, a: number, b: number) => word.slice(0, Math.max(0, Math.min(word.length, Math.floor(((t - a) / (b - a)) * word.length))));
