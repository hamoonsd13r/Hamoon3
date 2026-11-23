// Noir Studio — explainer / promo reels about apps and online numbers: real-looking app screens built in code
// (YouTube channel, Instagram profile, AI chat, comment sheet) on phones and a tablet, numbers that lift off the
// screen on the word that says them, one clean colour of light per section with a giant word sliding behind,
// word-by-word captions, small voxel robot buddies on the light lines.
export { C, F, W, H, FPS, MUSIC, setPalette, IG_GRAD, clamp, ramp, mix, ease, hash, kf, jolt, punch, pop, inn, out, fmtK, fmtInt, SD, TimeCtx, useT, beatPulse, barPulse } from "./lib/theme";
export { useStudioFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export { World, camKF, drift, Captions, Punch, Lift, Scrim, Tag, Vid, type Cam, type Cap, type Rect } from "./lib/kit";
export { Backdrop, type Plate } from "./lib/backdrop";
export { Phone, Tablet, StatusBar, PH, TB } from "./lib/device";
export { YtChannel, IgProfile, AiChat, CommentSheet, Thumb, YT_ROW_Y, IG_FOLLOWERS, type YtVideo, type YtChannelP, type IgProfileP } from "./lib/apps";
export { YouTubeMark, InstagramMark, Icon, type IconName } from "./lib/logos";
export { AiLogo, type AiName } from "./lib/ai-logos";
export { Buddies, BUDDY_LOOKS, BUDDY_H, poseOf, type Cue, type Act, type ActKind, type BuddyLook, type Pose } from "./lib/buddy";
export { NoirStudioDemo, NoirStudioAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, SC, SEC, PLATES, CAPS, CAST, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
