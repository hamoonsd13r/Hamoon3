// Archive Doc · fonts (all shipped with the kit, OFL / free), loaded before the first frame.
import { staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string?][] = [
  [F.title, "fonts/Vazirmatn-Black.ttf"],
  [F.fa, "fonts/Vazirmatn-Bold.ttf"],
  [F.faS, "fonts/Vazirmatn-SemiBold.ttf"],
  [F.ui, "fonts/Vazirmatn-Regular.ttf", "400"],
  [F.ui, "fonts/Vazirmatn-SemiBold.ttf", "600"],
  [F.ui, "fonts/Vazirmatn-Bold.ttf", "700"],
  [F.ui, "fonts/Vazirmatn-Black.ttf", "900"],
  [F.mono, "fonts/VazirCode.ttf"],
  [F.lat, "fonts/LibreBaskerville.ttf"],
  [F.num, "fonts/Oswald.ttf", "200 700"],
];
let ready: Promise<void> | null = null;
export const archiveFonts = () => {
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
    .catch((e) => console.error("archive-doc fonts", e));
  return ready;
};
