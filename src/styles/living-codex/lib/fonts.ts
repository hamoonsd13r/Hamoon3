// Living Codex · fonts (all OFL, from public/fonts). The film holds frame 0 until they are in (useCodexFonts).
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string][] = [
  [F.serif, "fonts/LibreBaskerville.ttf"],
  [F.label, "fonts/ChakraPetch-Light.ttf"],
  [F.fraktur, "fonts/UnifrakturMaguntia-Book.ttf"],
  [F.fa, "fonts/Vazirmatn-SemiBold.ttf"],
  [F.faBold, "fonts/Vazirmatn-Bold.ttf"],
];

let ready: Promise<void> | null = null;
export const fontsReady = () => {
  if (ready) return ready;
  if (typeof document === "undefined") return Promise.resolve();
  ready = Promise.all(
    LIST.map(async ([family, file]) => {
      const f = new FontFace(family, `url(${staticFile(file)})`);
      await f.load();
      document.fonts.add(f);
    }),
  )
    .then(() => undefined)
    .catch((e) => console.error("living-codex fonts", e));
  return ready;
};

export const useCodexFonts = () => {
  const [handle] = useState(() => delayRender("living-codex fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
