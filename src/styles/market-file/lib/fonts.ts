// Market File · fonts (all OFL, from public/fonts). The film holds frame 0 until they are in (useFileFonts →
// delayRender), so a Persian line never flashes in a fallback face and the headline fitter measures the real font.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { FA, LATIN, MONO } from "./theme";

const LIST: [string, string, string][] = [
  [FA, "fonts/Vazirmatn-Regular.ttf", "400"],
  [FA, "fonts/Vazirmatn-SemiBold.ttf", "600"],
  [FA, "fonts/Vazirmatn-Bold.ttf", "700 800"],
  [FA, "fonts/Vazirmatn-Black.ttf", "900"],
  [LATIN, "fonts/Inter.ttf", "100 900"],
  [MONO, "fonts/IBMPlexMono-Medium.ttf", "400 500"],
  [MONO, "fonts/IBMPlexMono-SemiBold.ttf", "600 900"],
];

let ready: Promise<void> | null = null;
export const fontsReady = () => {
  if (ready) return ready;
  if (typeof document === "undefined") return Promise.resolve();
  ready = Promise.all(
    LIST.map(async ([family, file, weight]) => {
      const f = new FontFace(family, `url(${staticFile(file)})`, { weight });
      await f.load();
      document.fonts.add(f);
    }),
  )
    .then(() => undefined)
    .catch((e) => console.error("market-file fonts", e));
  return ready;
};

/** true once the fonts are in; blocks the render until then */
export const useFileFonts = () => {
  const [handle] = useState(() => delayRender("market-file fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
