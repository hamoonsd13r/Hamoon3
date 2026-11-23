// Submarine Vote · fonts (all OFL, from public/fonts). The film holds frame 0 until they are in (useVoteFonts).
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string?][] = [
  [F.ui, "fonts/Inter.ttf", "100 900"],
  [F.fa, "fonts/Vazirmatn-Black.ttf"],
  [F.faB, "fonts/Vazirmatn-Bold.ttf"],
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
    .catch((e) => console.error("submarine-vote fonts", e));
  return ready;
};

export const useVoteFonts = () => {
  const [handle] = useState(() => delayRender("submarine-vote fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
