// Talk Cutout — edit the student's OWN to-camera video into a course-ad / explainer reel: cards, numbers and logos sit
// BEHIND her (her cut-out on top), texts in the free band above her head; the method plays full-screen (a YouTube
// channel, an AI chat typing her words, a stats page with privacy blur, the comment sheet and the DM); word-by-word
// captions; steady light across takes, a clean voice, music at one steady level.
// Card: styles/talk-cutout.md · Demo: Style-TalkCutout (vertical), Style-TalkCutout-Wide (landscape), -Look stills.
// Your takes: pipeline/README.md (cuts → matte → steady alpha → levelled light → two layers), then demo/media.ts.
export { Compositions } from "./Compositions";
export { TalkCutoutFilm } from "./demo/Video";
export { TalkCutoutWide } from "./demo/VideoWide";
// lib
export { C, F, GLASS, IG_GRAD, SD, SECTION, accentA } from "./lib/theme";
export { TimeCtx, useT, clamp, mix, ease, kf, jolt, punch, pop, inn, out, vis, win, makeBeat, fmtK, fmtInt, hash, noise1 } from "./lib/time";
export { makeClock, norm, type Clock, type Word } from "./lib/words";
export { useTalkFonts, fontsReady } from "./lib/fonts";
export { MediaCtx, useMedia, Clip, type MediaMap } from "./lib/media";
export { TalkStage, TalkVid, Subject, poseAt, handPath, type Pose, type TalkSrc } from "./lib/talk";
export { ValueStack, StepTile, MarkArch, HeadPill, Tile, BigBehind, type ValueRow, type ArchMark } from "./lib/behind";
export { StepSlams, Lift, Scrim, Tag, Punch, type Rect } from "./lib/kinetic";
export { Captions, CapsWide, capAt, type Cap } from "./lib/captions";
export { Backdrop, type BgSection } from "./lib/backdrop";
export { World, camKF, drift, clampToPage, toScreen, type Cam } from "./lib/camera";
export { Phone, Tablet, StatusBar, Tap, PH, TB } from "./lib/device";
export { Icon, YouTubeMark, InstagramMark, MysteryMark, BrandMark, hideBlur } from "./lib/icons";
export { AiLogo, type AiName } from "./lib/ai-logos";
export { Grain, Vignette } from "./lib/fx";
export { YtScreen, typedAt, LIST_Y, ROW_H, type YtData, type YtState, type YtVideo, type YtChannel } from "./lib/apps/youtube";
export { AiChat, makePrompt, CU, type AiChatP, type AiChip } from "./lib/apps/ai-chat";
export { StudioPage, SP, SP_AT, type StudioStats, type StudioUpload } from "./lib/apps/studio";
export { IgComments, DmNotice, Bubble, Typing, GuideCard, type IgCm } from "./lib/apps/instagram";
export { CodeThumb, type ThumbSpec } from "./lib/apps/thumb";
export { WW, WH, LX, RX, CARD_SCALE, enter, Corners, Glass, Osd, Stamp, Big, OsdBar, Rec, TapeCounter, Stage, TapeCut, sub } from "./lib/wide";
