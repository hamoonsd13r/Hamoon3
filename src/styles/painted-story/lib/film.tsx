// Painted Story · the film engine. A film = a cut list on the narration clock + an overlay of cards.
// It picks the shot for time t, makes the cut (hard / soft crossfade / dip to black / whip), keeps every still moving
// (punch-in on a word; long stills punch in by themselves at a sentence start), shakes and darkens on every knock,
// lifts night shots for phones, adds vignette + grain, the part title / end card, and the mixed soundtrack.
// Every frame is a pure function of film time: `times` (a Look still) and a render give the same picture.
import React, { useMemo } from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Still, type Cam } from "./camera";
import { CCTV, Grain, LampOff, Night, Peep, RadioWave, Rain, Static, TV, Vignette } from "./atmos";
import { ArchClip } from "./media";
import { EndCard, PartTitle } from "./doc-cards";
import { useStoryFonts } from "./fonts";
import { ThemeCtx, type Theme } from "./theme";
import { TimeCtx, clamp, ease, noise1, pulseAt, ramp } from "./time";

export type StillFx = "rain" | "static" | "tv" | "peep" | "night" | "shake" | "cctv" | "wave";

export type Shot = {
  /** film seconds where the shot starts — always from the clock: L(n), Wd(n, "word") … */
  at: number;
  /** how it comes in: hard cut (default) · soft 0.7 s crossfade (day/scene changes) · dip through black · whip (fast slam) */
  cut?: "hard" | "soft" | "dip" | "whip";
  // ── A · a moving still (doc look): image id, or "arch:<name>" for an archival insert (lib/media)
  img?: string;
  cam?: Cam;
  fx?: number; // zoom focus 0..1
  fy?: number;
  punch?: number; // re-frame tighter (×zoom) on this time (a word)
  zoom?: number; // punch zoom, default 1.22 (auto punch on a still ≥ 9 s: 1.15)
  fxs?: StillFx[]; // code overlays on the still
  lampAt?: number; // the room drops into blue dark here (a word: «تاریکی»)
  opt?: boolean; // an extra still (close-up, second pose): the shot only exists once its image does
  // ── B · a composed frame (tale look): a plate World + cut-outs + graphics, all from t
  draw?: (t: number, t0: number, t1: number) => React.ReactNode;
};

export type StorySpec = {
  dur: number; // film length (seconds) = vo.total (+ room for the end card)
  shots: Shot[];
  img?: (id: string) => string; // image id → staticFile url
  have?: string[]; // ids that exist (pipeline/sync-images.mjs → imgs.json); a missing still borrows the nearest earlier one
  midBeat?: (a: number, b: number) => number; // clock.midBeat — enables the auto punch on long stills
  knocks?: number[]; // the knock motif's hits (from the audio build: knocks.json) → jolt + darker frame
  knockDark?: number; // darkening on a knock (0.22)
  knockShake?: number; // jolt size on a knock, px (9)
  overlay?: (t: number) => React.ReactNode; // cards, HUD, captions — frame px, above the vignette
  nightLift?: [number, number][]; // time ranges lifted +20% brightness (night reads too dark on a phone)
  endCard?: { at: number; title?: string; next?: string }; // the doc look's «ادامه دارد…» card
  series?: string; // series name above «قسمت N» on a part title
  grain?: number;
  vignette?: number;
  fadeIn?: number; // seconds from black at the start (0.35); 0 = the first frame is the full picture (Reels/Shorts covers)
  audio?: string; // the mix (public path), e.g. "v01/mix-norm.wav"
};

/** serialisable props of a film composition (parts are the same film with another window) */
export type StoryProps = {
  audio?: boolean; // false = silent (render silent, mux the mix afterwards)
  times?: number[]; // Look: frame i shows film time times[i]
  start?: number; // a part starts at this film time …
  pre?: number; // … after a title of `pre` seconds
  end?: number; // the part ends here (film time)
  card?: number; // end card at this film time
  part?: number; // part number for the title
  next?: string; // end card line («قسمت بعد: روزِ 2»)
};

export const partFrames = (fps: number, end: number, start = 0, pre = 0) => Math.ceil((end - start + pre) * fps);

export const StoryFilm: React.FC<StoryProps & { spec: StorySpec; theme: Theme }> = ({ spec, theme, audio = true, times, start = 0, pre = 0, end, card, part, next }) => {
  const frame = useCurrentFrame();
  const { fps, width: W } = useVideoConfig();
  const ok = useStoryFonts();
  const local = frame / fps;
  const t = times ? times[Math.min(frame, times.length - 1)] : local < pre ? start : start + (local - pre);

  const { shots, starts, ends, punches } = useMemo(() => {
    const have = spec.have ? new Set(spec.have) : null;
    const list = spec.shots.filter((s) => !s.opt || !have || (s.img && have.has(s.img)));
    const st = list.map((s) => s.at);
    const en = st.map((_, k) => (k + 1 < st.length ? st[k + 1] : spec.dur + 1));
    const pu = list.map((s, k) => {
      if (s.punch !== undefined) return { t: s.punch, z: s.zoom ?? 1.22 };
      if (!s.draw && spec.midBeat && en[k] - st[k] >= 9) {
        const m = spec.midBeat(st[k], en[k]);
        if (Number.isFinite(m)) return { t: m, z: 1.15 };
      }
      return undefined;
    });
    return { shots: list, starts: st, ends: en, punches: pu };
  }, [spec]);
  const haveSet = useMemo(() => (spec.have ? new Set(spec.have) : null), [spec]);

  const shotAt = (time: number) => {
    let k = 0;
    for (let i = 0; i < shots.length; i++) if (time >= starts[i] - (shots[i].cut === "soft" ? 0.35 : 0)) k = i;
    return k;
  };
  // a still that is still being generated borrows the nearest earlier one that exists
  const imgFor = (k: number) => {
    for (let j = k; j >= 0; j--) {
      const id = shots[j].img;
      if (id && !id.startsWith("arch:") && (!haveSet || haveSet.has(id))) return id;
    }
    return null;
  };
  const drawShot = (k: number) => {
    const sh = shots[k], t0 = starts[k], t1 = ends[k];
    if (sh.draw) return sh.draw(t, t0, t1);
    if (sh.img?.startsWith("arch:")) return <ArchClip name={sh.img.slice(5)} t={t} t0={t0} />;
    const id = imgFor(k);
    if (!id || !spec.img) return <AbsoluteFill style={{ background: theme.ink }} />;
    const fx = new Set(sh.fxs ?? []);
    return (
      <>
        <Still src={spec.img(id)} t={t} t0={t0} t1={t1} cam={sh.cam} fx={sh.fx} fy={sh.fy} punch={punches[k]} shake={fx.has("shake")} />
        {fx.has("tv") ? <TV /> : null}
        {fx.has("peep") ? <Peep /> : null}
        {fx.has("night") ? <Night /> : null}
        {fx.has("rain") ? <Rain t={t} a={0.8} /> : null}
        {fx.has("static") ? <Static t={t} a={0.7} /> : null}
        {fx.has("cctv") ? <CCTV t={t} t0={t0} /> : null}
        {sh.lampAt !== undefined ? <LampOff t={t} at={sh.lampAt} /> : null}
        {fx.has("wave") ? <RadioWave t={t} knocks={spec.knocks} /> : null}
      </>
    );
  };

  const k = shotAt(t);
  const sh = shots[k], t0 = starts[k];
  const nx = shots[k + 1];
  // soft: the previous shot stays underneath while this one fades in (0.35 s each side of the cut)
  const soft = sh.cut === "soft" && k > 0 && t < t0 + 0.35;
  const mixIn = soft ? ease.inOut(ramp(t, t0 - 0.35, t0 + 0.35)) : 1;
  // dip: sink to black, rise from it
  const dipIn = sh.cut === "dip" ? 1 - clamp((t - t0) / 0.35) : 0;
  const dipOut = nx?.cut === "dip" ? clamp((t - (nx.at - 0.35)) / 0.35) : 0;
  const dip = ease.inOut(Math.max(dipIn, dipOut));
  // whip: slams in sideways with motion blur
  const wu = sh.cut === "whip" ? ease.out(ramp(t, t0, t0 + 0.22)) : 1;
  // knocks: a jolt of the whole picture and a darker frame on every hit
  const kn = pulseAt(t, spec.knocks ?? []);
  const ks = (spec.knockShake ?? 9) * 0.8;
  const jx = noise1(t * 38, 3) * ks * kn, jy = noise1(t * 41, 7) * ks * 0.78 * kn;
  // night lift for phones
  let lift = 0;
  for (const [a, b] of spec.nightLift ?? []) lift = Math.max(lift, clamp((t - a) / 0.4) * (1 - clamp((t - b) / 0.6)));
  const filter = [wu < 1 ? `blur(${(1 - wu) * 22}px)` : "", lift > 0 ? `brightness(${(1 + 0.2 * lift).toFixed(3)}) contrast(${(1 - 0.07 * lift).toFixed(3)})` : ""].join(" ").trim();

  const filmEnd = end ?? spec.dur;
  const cardAt = card ?? spec.endCard?.at;
  const fi = spec.fadeIn ?? 0.35;
  const fadeIn = times || (fi <= 0 && pre <= 0) ? 1 : ramp(local, 0, pre > 0 ? Math.max(0.6, fi) : fi);
  const fadeOut = ramp(t, filmEnd - 0.8, filmEnd - 0.05);
  const showAudio = audio && !!spec.audio && !times && start === 0;
  return (
    <ThemeCtx.Provider value={theme}>
      <TimeCtx.Provider value={{ t, frame }}>
        <AbsoluteFill style={{ background: theme.ink, overflow: "hidden" }}>
          {ok ? (
            <>
              <div style={{ position: "absolute", inset: 0, transform: `translate(${jx + (1 - wu) * 260 * (W / 1080)}px, ${jy}px)`, filter: filter || undefined }}>
                {soft ? drawShot(k - 1) : null}
                <div style={{ position: "absolute", inset: 0, opacity: mixIn }}>{drawShot(k)}</div>
              </div>
              <Vignette a={spec.vignette ?? 0.42} />
              {kn > 0 ? <div style={{ position: "absolute", inset: 0, background: "#000", opacity: kn * (spec.knockDark ?? 0.22) }} /> : null}
              {dip > 0 ? <div style={{ position: "absolute", inset: 0, background: theme.ink, opacity: dip }} /> : null}
              {cardAt !== undefined && t >= cardAt - 0.4 ? null : spec.overlay?.(t)}
              {cardAt !== undefined ? <EndCard t={t} card={cardAt} title={spec.endCard?.title} next={next ?? spec.endCard?.next} /> : null}
              {pre > 0 && !times && part ? <PartTitle local={local} pre={pre} part={part} series={spec.series} /> : null}
            </>
          ) : null}
          <Grain t={t} a={spec.grain ?? 0.03} size={280} />
          <div style={{ position: "absolute", inset: 0, background: "#000", opacity: Math.max(1 - fadeIn, fadeOut), pointerEvents: "none" }} />
          {showAudio ? (
            <Sequence from={0} layout="none">
              <Html5Audio src={staticFile(spec.audio!)} volume={(f) => (end ? clamp((filmEnd - 0.4 - f / fps) / 0.35) : 1)} />
            </Sequence>
          ) : null}
        </AbsoluteFill>
      </TimeCtx.Provider>
    </ThemeCtx.Provider>
  );
};
