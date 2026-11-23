// Hand-Drawn · a hand-drawn canvas film inside Remotion. The film is a plain HTML page (public/styles/hand-drawn/films)
// built on the canvas engine (public/styles/hand-drawn/engine, MIT © 2026 Alexey Fateev); it exposes
// window.__drawFrame(i), __NDRAW and __fps. This component loads it in an iframe at the composition's size, hides
// its controls, and draws film frame i = t × fps synchronously on every Remotion frame, so the render is exact.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile, useVideoConfig } from "remotion";

type FilmWin = Window & { __ready?: boolean; __error?: string; __drawFrame?: (i: number) => void; __NDRAW?: number; __fps?: number };

/** a film page by name (films/<name>.html), drawn at local time t (seconds) */
export const HandDrawnFilm: React.FC<{ film: string; t: number; ar?: "9:16" | "1:1" | "16:9"; query?: Record<string, string> }> = ({ film, t, ar = "9:16", query }) => {
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`hand-drawn film ${film}`, { timeoutInMilliseconds: 90000 }));
  const released = useRef(false);
  const src = `${staticFile(`styles/hand-drawn/films/${film}.html`)}?${new URLSearchParams({ ar, w: String(Math.min(width, height)), ...query }).toString()}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const poll = () => {
      if (!alive) return;
      const w = el.contentWindow as FilmWin | null;
      if (w?.__error) {
        console.error(`hand-drawn ${film}:`, w.__error);
        if (!released.current) { released.current = true; continueRender(handle); }
        return;
      }
      if (w?.__ready && w.__drawFrame && el.contentDocument) {
        const st = el.contentDocument.createElement("style");
        st.textContent = "html,body{margin:0!important;padding:0!important;background:#000!important;overflow:hidden!important;display:block!important}body>*:not(canvas){display:none!important}canvas{display:block!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;box-shadow:none!important}";
        el.contentDocument.head.appendChild(st);
        setReady(true);
        return;
      }
      setTimeout(poll, 40);
    };
    el.addEventListener("load", poll);
    poll();
    return () => {
      alive = false;
      el.removeEventListener("load", poll);
    };
  }, [film, handle]);

  useLayoutEffect(() => {
    if (!ready) return;
    const w = ref.current?.contentWindow as FilmWin | null;
    if (w?.__drawFrame) {
      const n = w.__NDRAW ?? 1;
      const i = Math.max(0, Math.min(n - 1, Math.round(t * (w.__fps ?? 24))));
      w.__drawFrame(i);
    }
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [ready, t, handle]);

  return <iframe ref={ref} src={src} title={film} style={{ position: "absolute", left: 0, top: 0, width, height, border: 0, display: "block", background: "#000" }} />;
};
