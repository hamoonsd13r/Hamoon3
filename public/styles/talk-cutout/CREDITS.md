# Talk Cutout · sources

The style ships **no image, video or audio**. The demo's speaker is a code-drawn silhouette (`lib/talk.tsx`); every
phone, tablet, YouTube / Instagram / stats screen, thumbnail and card is drawn by code with invented sample data
(«نمونه»). Your own takes go in `public/v01/` after `pipeline/README.md` (steps 0–5) and are mapped in `demo/media.ts`.

| what | where | source | licence |
|---|---|---|---|
| AI company marks (openai, chatgpt, claude, deepseek, kimi, gemini, grok, qwen, mistral) | `lib/ai-logos.tsx` | lobehub icons-static-svg 1.45.0 | MIT (the marks are their owners' trademarks; shown only to name the products when the content is about AI models) |
| YouTube and Instagram marks | `lib/icons.tsx` | simple-icons path data | CC0 (trademarks of their owners; shown only inside the mock app screens) |
| Inter, Lalezar, Vazirmatn, Anton | `public/fonts/` (kit fonts) | Google Fonts | SIL OFL 1.1 |
| VT323 (the camcorder REC / tape counter of the landscape variant) | `public/fonts/VT323-Regular.ttf` + `VT323-OFL.txt` | Google Fonts (The VT323 Project Authors) | SIL OFL 1.1 |

Music and effects are never part of the kit: the demo plays silent. `pipeline/audio.config.json` points at the kit's
free libraries (`public/sfx-lib`, `public/kenney`, CC0) and at YOUR voice and song.
