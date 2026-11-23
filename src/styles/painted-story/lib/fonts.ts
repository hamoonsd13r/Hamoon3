// Painted Story · fonts (all OFL, from public/fonts). The film holds its first frame until they are loaded
// (useStoryFonts → delayRender), so Persian text never flashes in a fallback face.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

export const F = {
  fa: "PSFa", // Vazirmatn Black — Persian display words («روزِ», captions)
  faB: "PSFaB", // Vazirmatn Bold — labels, rules, chips
  faS: "PSFaS", // Vazirmatn SemiBold — UI body
  head: "PSHead", // Lalezar — big titles («ادامه دارد…»), hand-written notes
  num: "PSNum", // Chakra Petch SemiBold — Latin digits, HUD, clocks (all numbers are Latin digits)
  numM: "PSNumM", // Chakra Petch Medium
  serif: "PSSerif", // Libre Baskerville — the day number on the tale's day card, Latin titles
  cond: "PSCond", // Oswald — Latin stencils / printed notices
  cap: "PSCap", // Inter — Latin captions and UI
};

const LIST: [string, string, string?][] = [
  [F.fa, "fonts/Vazirmatn-Black.ttf"],
  [F.faB, "fonts/Vazirmatn-Bold.ttf"],
  [F.faS, "fonts/Vazirmatn-SemiBold.ttf"],
  [F.head, "fonts/Lalezar-Regular.ttf"],
  [F.num, "fonts/ChakraPetch-SemiBold.ttf"],
  [F.numM, "fonts/ChakraPetch-Medium.ttf"],
  [F.serif, "fonts/LibreBaskerville.ttf"],
  [F.cond, "fonts/Oswald.ttf", "200 700"],
  [F.cap, "fonts/Inter.ttf", "100 900"],
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
    .catch((e) => console.error("painted-story fonts", e));
  return ready;
};

/** true once the fonts are in; blocks the render until then */
export const useStoryFonts = () => {
  const [handle] = useState(() => delayRender("painted-story fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
