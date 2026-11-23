// Archive Machine · HUD over the data world: the core's lock and tag (projected from the 3D camera), the archive search
// during the dive and the match. Thin, sparse, typed; nothing glows on its own.
import React from "react";
import * as THREE from "three";
import { CORE, camObj } from "../../lib/cam";
import { Label, Lock } from "../../lib/hud";
import { C, F, ease, hash, mix, ramp } from "../../lib/theme";
import { MATCH, WARP_A, WARP_GO } from "../../lib/world";

const project = (t: number, p: THREE.Vector3) => {
  const v = p.clone().project(camObj(t));
  return { x: ((v.x + 1) / 2) * 1920, y: ((1 - v.y) / 2) * 1080, ok: v.z < 1 };
};

/** the search lands: a bold lock on the lit district, the query and its score */
const MatchLock: React.FC<{ t: number }> = ({ t }) => {
  const k = ease.out(ramp(t, MATCH, MATCH + 0.12));
  const R = mix(260, 130, k), L = 44;
  const d = `M${960 - R} ${540 - R + L}V${540 - R}H${960 - R + L} M${960 + R - L} ${540 - R}H${960 + R}V${540 - R + L} M${960 + R} ${540 + R - L}V${540 + R}H${960 + R - L} M${960 - R + L} ${540 + R}H${960 - R}V${540 + R - L}`;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(40% 40% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)", opacity: k }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill="none" stroke={C.white} strokeWidth={4} />
        <path d="M940 540H980 M960 520V560" stroke={C.white} strokeWidth={2} opacity={0.8} />
      </svg>
      <Label x={960 + 130 + 30} y={540 - 130} text="MATCH  0.998" a={MATCH + 0.04} d={0.14} size={30} bold color={C.white} />
      <Label x={960 + 130 + 30} y={540 - 130 + 44} text="QUERY · «PEACE IN OUR TIME»" a={MATCH + 0.1} d={0.16} size={20} color={C.cyan} />
    </>
  );
};

export const DataHud: React.FC<{ t: number }> = ({ t }) => {
  const prog = 3.40;
  const c = project(t, CORE);
  // apparent size of the core on screen (for the lock)
  const edge = project(t, CORE.clone().add(new THREE.Vector3(4.2, 0, 0)));
  const r = Math.max(26, Math.abs(edge.x - c.x) * 1.15);
  const searching = t >= WARP_GO && t < MATCH;
  const n = Math.floor(2416903 * ease.out(ramp(t, WARP_GO, MATCH)) + hash(Math.floor(t * 30)) * 900);
  return (
    <>
      {t >= prog - 0.1 && t < 5.4 && c.ok ? <Lock cx={c.x} cy={c.y} r={r} a={prog - 0.1} label="HISTORY PROTOCOL" sub="STATUS  ·  ONLINE" /> : null}
      {t >= WARP_A && t < MATCH ? (
        <>
          <Label x={96} y={880} text="SEARCHING ARCHIVE" a={WARP_GO} size={26} bold />
          {searching ? (
            <div style={{ position: "absolute", left: 96, top: 920, fontFamily: F.hud, fontSize: 22, letterSpacing: 3, color: C.cyanDim, fontVariantNumeric: "tabular-nums" }}>
              {n.toLocaleString("en-US")} RECORDS · 1895–1975
            </div>
          ) : null}
        </>
      ) : null}
      {t >= MATCH ? <MatchLock t={t} /> : null}
    </>
  );
};
