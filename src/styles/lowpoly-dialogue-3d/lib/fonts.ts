// Lowpoly Dialogue 3D · fonts (all OFL, from public/fonts). The canvases (laptop screen, robot face) draw text, so the
// film holds frame 0 until every font is in (useDialogueFonts) — otherwise the first frames draw a fallback font.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { FA, HUD, MONO, UI } from "./theme";

const LIST: [string, string, string?][] = [
  [FA, "fonts/Vazirmatn-SemiBold.ttf"],
  [UI, "fonts/Inter.ttf", "100 900"],
  [MONO, "fonts/IBMPlexMono-Medium.ttf"],
  [HUD, "fonts/ChakraPetch-SemiBold.ttf"],
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
    .catch((e) => console.error("lowpoly-dialogue-3d fonts", e));
  return ready;
};

export const useDialogueFonts = () => {
  const [handle] = useState(() => delayRender("lowpoly-dialogue-3d fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setOk(true));
  }, []);
  useEffect(() => {
    if (ok) continueRender(handle);
  }, [ok, handle]);
  return ok;
};
