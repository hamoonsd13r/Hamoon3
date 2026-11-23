// Phone Assistant · fonts (all OFL, from public/fonts). The film holds frame 0 until they are in (usePhoneFonts →
// delayRender), so a Persian line never flashes in a fallback face.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { BODY, FA, MONO } from "./theme";

const LIST: [string, string, string][] = [
  [FA, "fonts/Vazirmatn-Regular.ttf", "400 500"],
  [FA, "fonts/Vazirmatn-SemiBold.ttf", "600"],
  [FA, "fonts/Vazirmatn-Bold.ttf", "700 800"],
  [FA, "fonts/Vazirmatn-Black.ttf", "850 900"],
  [BODY, "fonts/Vazirmatn-Regular.ttf", "400 500"],
  [BODY, "fonts/Vazirmatn-SemiBold.ttf", "600"],
  [BODY, "fonts/Vazirmatn-Bold.ttf", "700 900"],
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
    .catch((e) => console.error("phone-assistant fonts", e));
  return ready;
};

export const usePhoneFonts = () => {
  const [handle] = useState(() => delayRender("phone-assistant fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
