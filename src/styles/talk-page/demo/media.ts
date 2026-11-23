// Your own files (paths inside public/). Leave a name unset and the demo shows a labelled slot instead, so it always
// renders. In your copy (src/vNN/media.ts) point them at your files:
//   talk: a light proxy of your talk video for previews (pipeline/proxy.sh) — the final composite uses the original
//   clips: the screen recordings / b-roll you print on the page as figures (cut them to the length you need)
export const MEDIA: Record<string, string | undefined> = {
  talk: undefined, // e.g. "v01/talk-proxy.mp4"
  "app-tags.mp4": undefined, // e.g. "v01/clips/app-tags.mp4"
};
