// The iOS keyboard (dark), measured on the reference: QuickType bar + three letter rows (+ the top of the fourth,
// which the phone's crop cuts off). `press` = the key held down right now (its callout balloon is drawn),
// `word` = what QuickType shows in its left slot (“ma). All sizes in reference pixels × s().
import React from "react";
import { C, F, s } from "./theme";
import { Backspace, Shift } from "./icons";

const ROW1 = "qwertyuiop".split("");
const ROW2 = "asdfghjkl".split("");
const ROW3 = "zxcvbnm".split("");
export const KB_TOP = 866; // reference px
const KW = 62.3, KH = 81, GAP = 9.08;
const R1 = 948, R2 = 1050, R3 = 1152, R4 = 1255;
const x1 = (i: number) => 8 + i * (KW + GAP);
const x2 = (i: number) => 43.5 + i * (KW + GAP);
const x3 = (i: number) => 115 + i * (KW + GAP);

/** where a letter key sits (reference px, top-left) */
export const keyRect = (ch: string) => {
  let i = ROW1.indexOf(ch);
  if (i >= 0) return { x: x1(i), y: R1 };
  i = ROW2.indexOf(ch);
  if (i >= 0) return { x: x2(i), y: R2 };
  i = ROW3.indexOf(ch);
  if (i >= 0) return { x: x3(i), y: R3 };
  return null;
};

const Key: React.FC<{ x: number; y: number; w?: number; fn?: boolean; children?: React.ReactNode }> = ({ x, y, w = KW, fn, children }) => (
  <div
    style={{
      position: "absolute", left: s(x), top: s(y), width: s(w), height: s(KH), borderRadius: s(9.5),
      background: fn ? C.keyFn : C.key, boxShadow: `0 ${s(1.2)}px 0 rgba(0,0,0,0.55)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: C.keyText, fontFamily: F.ui, fontSize: s(33), fontWeight: 400, lineHeight: 1, paddingBottom: s(4),
    }}
  >
    {children}
  </div>
);

export const Keyboard: React.FC<{ y?: number; press?: string | null; word?: string }> = ({ y = 0, press, word }) => {
  const pr = press ? keyRect(press) : null;
  return (
    <div style={{ position: "absolute", left: 0, top: s(KB_TOP) + y, width: s(720), height: s(1280 - KB_TOP) + 40, background: C.kb }}>
      <div style={{ position: "absolute", left: 0, top: -s(KB_TOP), width: s(720), height: s(1280) }}>
        {/* QuickType bar */}
        <div style={{ position: "absolute", left: s(240), top: s(885), width: s(1.2), height: s(34), background: "rgba(255,255,255,0.13)" }} />
        <div style={{ position: "absolute", left: s(480), top: s(885), width: s(1.2), height: s(34), background: "rgba(255,255,255,0.13)" }} />
        {word ? (
          <div style={{ position: "absolute", left: 0, top: s(880), width: s(240), height: s(36), textAlign: "center", fontFamily: F.ui, fontSize: s(25.5), color: "#DEDBE0", letterSpacing: s(-0.2) }}>
            {"“" + word}
          </div>
        ) : null}
        {ROW1.map((ch, i) => <Key key={ch} x={x1(i)} y={R1}>{ch}</Key>)}
        {ROW2.map((ch, i) => <Key key={ch} x={x2(i)} y={R2}>{ch}</Key>)}
        <Key x={8} y={R3} w={90} fn>
          <Shift size={s(27)} />
        </Key>
        {ROW3.map((ch, i) => <Key key={ch} x={x3(i)} y={R3}>{ch}</Key>)}
        <Key x={622} y={R3} w={90} fn>
          <Backspace size={s(28)} />
        </Key>
        {/* row 4 — only its top shows above the phone's crop */}
        <Key x={8} y={R4} w={90} fn />
        <Key x={187} y={R4} w={346} />
        <Key x={548} y={R4} w={164} fn />
        {/* the held key's callout */}
        {pr ? (
          <div
            style={{
              position: "absolute", left: s(pr.x + KW / 2 - 46), top: s(pr.y - 88), width: s(92), height: s(KH + 88), borderRadius: s(13),
              background: C.keyPop, boxShadow: `0 ${s(3)}px ${s(10)}px rgba(0,0,0,0.45)`,
              display: "flex", justifyContent: "center", color: "#F4F2F6", fontFamily: F.ui, fontSize: s(50), fontWeight: 400, paddingTop: s(14), lineHeight: 1.1,
            }}
          >
            {press}
          </div>
        ) : null}
      </div>
    </div>
  );
};
