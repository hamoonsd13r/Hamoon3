// Noir Studio · fonts (all OFL, from public/fonts). The film holds frame 0 until they are in (useStudioFonts →
// delayRender), so a Persian word never flashes in a fallback face.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string][] = [
  [F.ui, "fonts/Inter.ttf", "100 900"],
  [F.head, "fonts/Lalezar-Regular.ttf", "400"],
  [F.fa, "fonts/Vazirmatn-Black.ttf", "400 900"],
  [F.faB, "fonts/Vazirmatn-Bold.ttf", "400 900"],
  [F.faS, "fonts/Vazirmatn-SemiBold.ttf", "400 900"],
  [F.vz, "fonts/Vazirmatn-Regular.ttf", "400"],
  [F.vz, "fonts/Vazirmatn-Bold.ttf", "600 900"],
  [F.anton, "fonts/Anton-Regular.ttf", "400"],
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
    .catch((e) => console.error("noir-studio fonts", e));
  return ready;
};

/** true once the fonts are in; blocks the render until then */
export const useStudioFonts = () => {
  const [handle] = useState(() => delayRender("noir-studio fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
