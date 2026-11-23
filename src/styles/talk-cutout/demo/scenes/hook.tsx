// Talk Cutout demo · the hook (TALK, 0 → «قدم 1»): «هر روز، هر هفته و هر ماه بازدید بیشتر؛ اونم فقط با سه تا قدم».
// Take A: she sits right of frame and points up-left; three glass cards land in the upper left, one per «هر …», each
// where her hand has just left (measured per take on her silhouette: pipeline/qc-silhouette.py), and roll from ~93 % of
// their value. On the jump cut into take B (centred) the day and the week fold into the month, which flies up into the
// band above her head; «3 قدم» lands on the wall right of her face (her shoulder cuts into it: it is BEHIND her).
import React from "react";
import { C, F } from "../../lib/theme";
import { YouTubeMark } from "../../lib/icons";
import { StepTile, ValueStack } from "../../lib/behind";
import { handPath, poseAt, type Pose } from "../../lib/talk";
import { HOOK_ROWS, K, T, TAKES } from "../script";

/** the placeholder subject's pose per take (with your footage this function is not used) */
export const poseOf = (t: number): Pose => {
  const talk = K.speaking(t);
  const p = poseAt(t, [
    // take A: right of frame, her left forearm raised beside her face, the finger pointing up-left at the cards
    // (the hand stays right of the card column and below the newest card: nothing of her ever covers a label)
    { a: -1, pose: { x: 800, y: 560, s: 1, tilt: -3, hand: { ...handPath(t, [[-1, 622, 660], [0.8, 628, 648], [1.6, 620, 664], [2.4, 630, 650], [3.3, 624, 662]]), point: -125 } } },
    { a: TAKES.B, pose: { x: 540, y: 482, s: 1, tilt: 1.5, hand: null } },
    { a: TAKES.C, pose: { x: 540, y: 474, s: 1.03, tilt: -1, hand: null } },
  ]);
  return { ...p, talk };
};

export const HookBehind: React.FC<{ t: number }> = ({ t }) => (
  <>
    <ValueStack
      t={t}
      rows={HOOK_ROWS}
      x={32} w={540} h={108} ys={[306, 424, 542]}
      source={
        <>
          <YouTubeMark size={32} />
          <span style={{ fontFamily: F.vzB, fontSize: 30, color: C.cream, whiteSpace: "nowrap" }}>بازدید کانال · نمونه</span>
        </>
      }
      fold={TAKES.B - 0.2}
      fly={[TAKES.B - 0.08, TAKES.B + 0.24]}
      pill={{ x: 212, w: 656, h: 88, y: 240 }}
      out={T.steps - 0.15}
    />
    {/* «3 قدم» on the wall right of her face; its lower-left corner tucks behind her shoulder */}
    <StepTile t={t} a={T.se - 0.05} wordAt={T.ghadam0 - 0.04} out={T.steps - 0.15} x={776} y={420} w={244} h={330} big="3" word="قدم" />
  </>
);
