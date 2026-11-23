// Premiere Showcase · fonts (all OFL, from public/fonts) + a canvas text measurer (kinetic lines fit the frame width
// with the real font). The film holds frame 0 until they are in (usePremiereFonts → delayRender).
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string][] = [
  [F.head, "fonts/Lalezar-Regular.ttf", "400"],
  [F.anton, "fonts/Anton-Regular.ttf", "400"],
  [F.fa, "fonts/Vazirmatn-Black.ttf", "400 900"],
  [F.faBold, "fonts/Vazirmatn-Bold.ttf", "400 900"],
  [F.faSemi, "fonts/Vazirmatn-SemiBold.ttf", "400 900"],
  [F.num, "fonts/ChakraPetch-SemiBold.ttf", "400 900"],
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
    .catch((e) => console.error("premiere-showcase fonts", e));
  return ready;
};

export const usePremiereFonts = () => {
  const [handle] = useState(() => delayRender("premiere-showcase fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};

const cache = new Map<string, number>();
let cv: HTMLCanvasElement | null = null;
/** width of `text` in px at `size` in `family` (after the fonts are in) */
export const measure = (text: string, family: string, size: number) => {
  const key = `${family}|${size}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") return text.length * size * 0.5;
  cv ??= document.createElement("canvas");
  const x = cv.getContext("2d")!;
  x.font = `${size}px ${family}`;
  const w = x.measureText(text).width;
  cache.set(key, w);
  return w;
};
