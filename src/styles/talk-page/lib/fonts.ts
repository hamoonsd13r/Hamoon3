// Talk Page — fonts (all SIL OFL, in public/fonts): STIX Two Text, IBM Plex Mono, Caveat, Vazirmatn, Inter.
// Call useTalkPageFonts() once at the top of a composition; rendering waits until they are loaded.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

const FACES: [string, string, FontFaceDescriptors][] = [
  ["TPSerif", "fonts/STIXTwoText.ttf", { weight: "400 700" }],
  ["TPSerif", "fonts/STIXTwoText-Italic.ttf", { weight: "400 700", style: "italic" }],
  ["TPMono", "fonts/IBMPlexMono-Regular.ttf", { weight: "400" }],
  ["TPMono", "fonts/IBMPlexMono-Medium.ttf", { weight: "500" }],
  ["TPMono", "fonts/IBMPlexMono-SemiBold.ttf", { weight: "600 700" }],
  ["TPPen", "fonts/Caveat.ttf", { weight: "400 700" }],
  ["TPFa", "fonts/Vazirmatn-Regular.ttf", { weight: "400" }],
  ["TPFa", "fonts/Vazirmatn-SemiBold.ttf", { weight: "500 600" }],
  ["TPFa", "fonts/Vazirmatn-Bold.ttf", { weight: "700" }],
  ["TPFa", "fonts/Vazirmatn-Black.ttf", { weight: "800 900" }],
  ["TPUi", "fonts/Inter.ttf", { weight: "100 900" }],
];

let loading: Promise<unknown> | null = null;
export const useTalkPageFonts = () => {
  const [handle] = useState(() => delayRender("talk-page fonts"));
  useEffect(() => {
    loading ??= Promise.all(FACES.map(([family, file, d]) => new FontFace(family, `url('${staticFile(file)}')`, d).load().then((f) => document.fonts.add(f))));
    loading
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error("talk-page fonts", e);
        continueRender(handle);
      });
  }, [handle]);
};
