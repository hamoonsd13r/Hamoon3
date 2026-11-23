// Talk Cutout · fonts (all SIL OFL, files in public/fonts). The films used commercial Persian display faces; the kit
// ships Lalezar (titles, captions) and Vazirmatn (labels, app text) instead. The film holds its first frame until
// they are in (delayRender), so no frame ever renders in a fallback face.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string?][] = [
  [F.ui, "fonts/Inter.ttf", "100 900"],
  [F.head, "fonts/Lalezar-Regular.ttf"],
  [F.vz, "fonts/Vazirmatn-Regular.ttf"],
  [F.vzB, "fonts/Vazirmatn-Bold.ttf"],
  [F.vzK, "fonts/Vazirmatn-Black.ttf"],
  [F.anton, "fonts/Anton-Regular.ttf"],
  [F.osd, "fonts/VT323-Regular.ttf"],
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
    .catch((e) => console.error("talk-cutout fonts", e));
  return ready;
};

/** call once at the top of a film: returns true when the fonts are in */
export const useTalkFonts = () => {
  const [handle] = useState(() => delayRender("talk-cutout fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
