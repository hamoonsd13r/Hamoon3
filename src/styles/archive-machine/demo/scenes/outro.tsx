// Archive Machine · the ending: the montage cuts to black, the machine writes its verdict, then the title slams in,
// breathes, and a last glitch takes it out. Replace the words with your film's last line.
import React from "react";
import { Glitch, Label } from "../../lib/hud";
import { C, END, F, clamp, ease, hash, punch, ramp, useT } from "../../lib/theme";

export const OUTRO_A = 17.85;
const SLAM = OUTRO_A + 0.62; // the title lands
const TITLE = "THE ARCHIVE REMEMBERS";

export const Outro: React.FC<{ t: number }> = ({ t }) => {
  const { frame } = useT();
  const u = ease.out(ramp(t, SLAM, SLAM + 0.22));
  const hitK = punch(t, SLAM, 9);
  const breathe = 1 + 0.012 * Math.min(1, Math.max(0, t - SLAM) / 2.4);
  const outK = ramp(t, END - 0.42, END - 0.06);
  const gl = clamp(hitK * 0.8 + outK * 1.4);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000" }}>
      <Label x={96} y={88} text="ARCHIVE  ·  1938 → 1965  ·  REVIEWED" a={OUTRO_A + 0.04} d={0.36} size={22} bold color={C.white} out={END - 0.3} />
      <Label x={96} y={126} text="VERDICT  ·  UNRESOLVED" a={OUTRO_A + 0.3} d={0.3} size={20} color={C.red} out={END - 0.3} />
      {t >= SLAM - 0.01 ? (
        <Glitch amt={gl} seed={Math.floor(frame / 2) + 7}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 470,
              textAlign: "center",
              fontFamily: F.title,
              fontSize: 128,
              lineHeight: 1,
              letterSpacing: 10 + 8 * (1 - u),
              color: C.white,
              opacity: u * (1 - outK) * (0.94 + 0.06 * hash(frame)),
              transform: `scale(${((1.08 - 0.08 * u) * breathe).toFixed(4)})`,
              textShadow: `0 0 ${(18 + 40 * hitK).toFixed(0)}px rgba(127,233,244,${(0.18 + 0.35 * hitK).toFixed(2)})`,
              whiteSpace: "nowrap",
            }}
          >
            {TITLE}
          </div>
        </Glitch>
      ) : null}
    </div>
  );
};
