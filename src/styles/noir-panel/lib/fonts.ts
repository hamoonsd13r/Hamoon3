// Noir Panel · fonts (all OFL, from public/fonts). The film holds frame 0 until they are in (useNoirFonts →
// delayRender), so a Persian line never flashes in a fallback face.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { FA, MONO } from "./theme";

const LIST: [string, string, string][] = [
  [FA, "fonts/Vazirmatn-Regular.ttf", "400 500"],
  [FA, "fonts/Vazirmatn-SemiBold.ttf", "600"],
  [FA, "fonts/Vazirmatn-Bold.ttf", "700 800"],
  [FA, "fonts/Vazirmatn-Black.ttf", "900"],
  [MONO, "fonts/IBMPlexMono-Regular.ttf", "400"],
  [MONO, "fonts/IBMPlexMono-Medium.ttf", "500"],
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
    .catch((e) => console.error("noir-panel fonts", e));
  return ready;
};

/** true once the fonts are in; blocks the render until then */
export const useNoirFonts = () => {
  const [handle] = useState(() => delayRender("noir-panel fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
