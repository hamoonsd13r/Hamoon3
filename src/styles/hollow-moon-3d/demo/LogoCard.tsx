// Hollow Moon 3D · a text logo on a transparent 2000 × 670 card, for brands that have no logo file. Render it to a PNG,
// then trace it into the vector paths the film extrudes (the second line sits inside y 470…670, the --sub box):
//   npx remotion still Style-HollowMoon3D-LogoCard logo.png --props='{"main":"NOVA","sub":"STUDIO"}'
//   node tools/logo-trace.mjs logo.png src/vNN --accent=#FF5A1F --sub=0,470,2000,670 --only=paths --preview
// Heavy Latin capitals extrude best (default Inter at weight 800, OFL; thin faces turn into wire). The accent is a small
// diamond after the name.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";

export type LogoCardProps = { main?: string; sub?: string; accent?: string; font?: string; weight?: number };

export const LogoCard: React.FC<LogoCardProps> = ({ main = "YOUR BRAND", sub = "STUDIO", accent = "#FF5A1F", font = "Inter.ttf", weight = 800 }) => {
  const [h] = useState(() => delayRender("logo card font"));
  useEffect(() => {
    const face = new FontFace("LogoCardFace", `url(${staticFile(`fonts/${font}`)})`, { weight: "100 900" });
    face.load().then((f) => { document.fonts.add(f); continueRender(h); }).catch(() => continueRender(h));
  }, [font, h]);
  // the name shrinks to keep within ~1650 px; its row is centred on y = 300, the second line hangs at y = 512
  const size = Math.min(150, Math.round(1650 / Math.max(1, main.length * 1.02)));
  const top = 300 - size / 2;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top, width: 2000, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: size * 0.32, height: size }}>
          <span style={{ fontFamily: "LogoCardFace", fontWeight: weight, fontSize: size, color: "#fff", letterSpacing: "0.06em", lineHeight: 1 }}>{main}</span>
          <span style={{ width: size * 0.34, height: size * 0.34, background: accent, transform: "rotate(45deg)" }} />
          {sub ? (
            <span style={{ position: "absolute", right: size * 0.62, top: 512 - top, fontFamily: "LogoCardFace", fontWeight: Math.min(900, weight - 100), fontSize: Math.round(size * 0.34), color: "#fff", letterSpacing: "0.5em", marginRight: "-0.5em", lineHeight: 1, whiteSpace: "nowrap" }}>{sub}</span>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
