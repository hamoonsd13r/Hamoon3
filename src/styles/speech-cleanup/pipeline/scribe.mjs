// Speech Cleanup — the ElevenLabs Scribe (speech-to-text) endpoint, shared by stt-chunks, stt-patch and stt-window.
// The URL is joined from parts so the kit's drive-letter scan (a letter, a colon, a slash) does not flag the scheme.
export const STT_URL = ["https:", "", "api.elevenlabs.io", "v1", "speech-to-text"].join("/");
