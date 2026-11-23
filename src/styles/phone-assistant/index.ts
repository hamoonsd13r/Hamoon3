// Phone Assistant — reels about a voice / SMS assistant or any phone-first service: one phone carries the story
// (an incoming call answered by a voice orb with a live transcript, an SMS thread), obsidian cards take over when the
// story leaves the phone (tasks that tick themselves off, a calendar that locks a time, a stopwatch, a comment bar).
export { C, FA, BODY, MONO, FPS, W, H, VOICE, setPalette, accentA, easeOut, clamp, ramp, lerp, win, kick, io, rng, voiceAmp, TimeCtx, useT } from "./lib/theme";
export { usePhoneFonts, fontsReady } from "./lib/fonts";
export { estimateWords, normalizeWords, makeTimeline, type Word, type RawWord, type Timeline } from "./lib/words";
export * from "./lib/ui";
export { CallScreen, SmsScreen, type Line } from "./lib/screens";
export { Calendar, Contact, Tasks, Stopwatch, CommentBar, PostedComment, type Task } from "./lib/props";
export { Caption, Headline, makeChunks, type Chunk } from "./lib/caption";
export { PhoneAssistantDemo, PhoneAssistantAt, type DemoProps } from "./demo/Video";
export { LINES, WORDS, TL, SC, CHUNKS, LOOK, FRAMES, DUR } from "./demo/script";
export { Compositions } from "./Compositions";
