// Atlas Doc · fonts (all OFL, from public/fonts), loaded before the first frame.
import { staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string?][] = [
  [F.title, "fonts/Vazirmatn-Black.ttf"],
  [F.faB, "fonts/Vazirmatn-Bold.ttf"],
  [F.faS, "fonts/Vazirmatn-SemiBold.ttf"],
  [F.faL, "fonts/Vazirmatn-Regular.ttf"],
  [F.lat, "fonts/ChakraPetch-Medium.ttf", "500"],
  [F.lat, "fonts/ChakraPetch-SemiBold.ttf", "600"],
  [F.lat, "fonts/ChakraPetch-Bold.ttf", "700"],
];

let ready: Promise<void> | null = null;
export const docFonts = () => {
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
    .catch((e) => console.error("atlas-doc fonts", e));
  return ready;
};
