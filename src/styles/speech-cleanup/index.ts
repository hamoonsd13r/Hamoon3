// Speech Cleanup — a tool, not a look: removes stutters, repeats, fillers and dead air from a long talking recording
// (a class, a podcast, a webinar) and writes a Final Cut Pro 7 XML that Premiere imports as a new sequence (+ markers).
// No composition. Card: styles/speech-cleanup.md · commands in order: pipeline/README.md · formats: pipeline/*.example.json
export const SPEECH_CLEANUP_TOOLS = [
  "envelope.cjs",
  "screen-activity.sh",
  "stt-chunks.mjs",
  "stt-patch.mjs",
  "fix-timing.mjs",
  "analyze.mjs",
  "dump-transcript.mjs",
  "review.mjs",
  "build-cuts.mjs",
  "make-xml.mjs",
  "render-audio.mjs",
  "joins.mjs",
  "compare-stt.mjs",
  "diag.mjs",
  "stt-window.mjs",
  "scribe.mjs",
  "prproj-media.cjs",
  "prproj-timeline.cjs",
] as const;
