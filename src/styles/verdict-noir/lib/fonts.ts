// Verdict Noir · fonts (all OFL, from public/fonts). The film holds frame 0 until they are in (useVerdictFonts →
// delayRender), so no Persian line flashes in a fallback face.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string?][] = [
  [F.ui, "fonts/Inter.ttf", "100 900"],
  [F.head, "fonts/Lalezar-Regular.ttf"],
  [F.fa, "fonts/Vazirmatn-Black.ttf"],
  [F.vz, "fonts/Vazirmatn-Regular.ttf"],
  [F.vzB, "fonts/Vazirmatn-Bold.ttf"],
  [F.anton, "fonts/Anton-Regular.ttf"],
  [F.serif, "fonts/LibreBaskerville.ttf"],
  [F.cond, "fonts/Oswald.ttf", "200 700"],
];

let ready: Promise<void> | null = null;
export const fontsReady = () => {
  if (ready) return ready;
  if (typeof document === "undefined") return Promise.resolve();
  ready = Promise.all(
    LIST.map(async ([family, file, weight]) => {
      const f = new FontFace(family, `url(${staticFile(file)})`, weight ? { weight } : {});
      await f.load();
      document.fonts.add(f);
    }),
  )
    .then(() => undefined)
    .catch((e) => console.error("verdict-noir fonts", e));
  return ready;
};

/** true once the fonts are in; blocks the render until then */
export const useVerdictFonts = () => {
  const [handle] = useState(() => delayRender("verdict-noir fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
