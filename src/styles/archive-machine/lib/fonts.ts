// Archive Machine · fonts (public/fonts: Chakra Petch, Inter, Anton — all OFL). The film holds the first frame until they are in.
import { staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string?][] = [
  [F.hud, "fonts/ChakraPetch-Medium.ttf"],
  [F.hudB, "fonts/ChakraPetch-Bold.ttf"],
  [F.ui, "fonts/Inter.ttf", "100 900"],
  [F.title, "fonts/Anton-Regular.ttf"],
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
    .catch((e) => console.error("archive-machine fonts", e));
  return ready;
};
