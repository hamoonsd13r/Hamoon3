// Style Index · fonts (all OFL or Apache 2.0, from public/fonts; the licence sits next to each file).
// useFonts() holds the frame until every face is in.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { F } from "./theme";

const LIST: [string, string, string?][] = [
  [F.fa, "fonts/Vazirmatn-Bold.ttf"],
  [F.faH, "fonts/Vazirmatn-Black.ttf"],
  [F.faS, "fonts/Vazirmatn-SemiBold.ttf"],
  [F.faHead, "fonts/Lalezar-Regular.ttf"],
  [F.inter, "fonts/Inter.ttf", "100 900"],
  [F.anton, "fonts/Anton-Regular.ttf"],
  [F.chakra, "fonts/ChakraPetch-Bold.ttf"],
  [F.playfair, "fonts/PlayfairDisplay-VF.ttf", "400 900"],
  [F.playfairI, "fonts/PlayfairDisplay-Italic-VF.ttf", "400 900"],
  [F.bodoni, "fonts/BodoniModa-VF.ttf", "400 900"],
  [F.bodoniI, "fonts/BodoniModa-Italic-VF.ttf", "400 900"],
  [F.shrikhand, "fonts/Shrikhand-Regular.ttf"],
  [F.rubikMono, "fonts/RubikMonoOne-Regular.ttf"],
  [F.bungee, "fonts/Bungee-Regular.ttf"],
  [F.bungeeShade, "fonts/BungeeShade-Regular.ttf"],
  [F.sedgwick, "fonts/SedgwickAveDisplay-Regular.ttf"],
  [F.marker, "fonts/PermanentMarker-Regular.ttf"],
  [F.wetPaint, "fonts/RubikWetPaint-Regular.ttf"],
  [F.apple, "fonts/HomemadeApple-Regular.ttf"],
  [F.reenie, "fonts/ReenieBeanie.ttf"],
  [F.press, "fonts/PressStart2P-Regular.ttf"],
  [F.unbounded, "fonts/Unbounded-VF.ttf", "200 900"],
  [F.syne, "fonts/Syne-VF.ttf", "400 800"],
  [F.grotesk, "fonts/SpaceGrotesk-VF.ttf", "300 700"],
  [F.monoton, "fonts/Monoton-Regular.ttf"],
  [F.instrument, "fonts/InstrumentSerif-Regular.ttf"],
  [F.instrumentI, "fonts/InstrumentSerif-Italic.ttf"],
  [F.cormorant, "fonts/CormorantGaramond-VF.ttf", "300 700"],
  [F.cormorantI, "fonts/CormorantGaramond-Italic-VF.ttf", "300 700"],
  [F.abril, "fonts/AbrilFatface-Regular.ttf"],
  [F.dmSerif, "fonts/DMSerifDisplay-Regular.ttf"],
  [F.dmSerifI, "fonts/DMSerifDisplay-Italic.ttf"],
  [F.bagel, "fonts/BagelFatOne-Regular.ttf"],
  [F.pinyon, "fonts/PinyonScript-Regular.ttf"],
  [F.rye, "fonts/Rye-Regular.ttf"],
  [F.vt, "fonts/VT323-Regular.ttf"],
  [F.orbitron, "fonts/Orbitron-VF.ttf", "400 900"],
  [F.yeseva, "fonts/YesevaOne-Regular.ttf"],
  [F.italiana, "fonts/Italiana-Regular.ttf"],
  [F.fraktur, "fonts/UnifrakturMaguntia-Book.ttf"],
  [F.michroma, "fonts/Michroma-Regular.ttf"],
  [F.caveat, "fonts/Caveat.ttf", "400 700"],
  [F.sniglet, "fonts/Sniglet-ExtraBold.ttf"],
  [F.bebas, "fonts/BebasNeue-Regular.ttf"],
  [F.baskerville, "fonts/LibreBaskerville.ttf"],
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
    .catch((e) => console.error("style-index fonts", e));
  return ready;
};

export const useFonts = () => {
  const [handle] = useState(() => delayRender("style-index fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontsReady().then(() => {
      setOk(true);
      continueRender(handle);
    });
  }, [handle]);
  return ok;
};
