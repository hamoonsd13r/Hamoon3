# Talk Page · خط تولید (ادیت ویدیوی خودِ گوینده با صفحه‌ی کاغذی)

همه را از ریشه‌ی پروژه بزن. `P=src/styles/talk-page/pipeline`. فایل اصلی ویدیو (مثلاً `talk.mov`) را **بیرون از `public/`** نگه دار: Remotion در هر رندر کل `public/` را در TEMP کپی می‌کند. TEMP را روی درایوی با جای خالی بگذار (`TEMP`/`TMP`).

| # | کار | دستور |
|---|---|---|
| 0 | پوشه‌ها | `mkdir -p work out/v01 public/v01` |
| 1 | شناخت ویدیو: استریم‌ها، fps، چرخش، **HDR یا نه**، بلندی صدا | `bash $P/probe.sh talk.mov` |
| 2 | پراکسی سبک برای Studio و Look (۵۴۰×۹۶۰، ۳۰fps، SDR) | `bash $P/proxy.sh talk.mov public/v01/talk-proxy.mp4` |
| 3 | متن و زمان هر کلمه (فقط صدا فرستاده می‌شود؛ حدود ۲۰ کرید در دقیقه) | `ffmpeg -i talk.mov -map 0:a:0 -ac 1 -ar 16000 work/voice16.wav` ← `node --env-file=.env tools/eleven-stt.mjs work/voice16.wav work/stt.json fas` ← `node $P/words.cjs work/stt.json work/words.txt src/v01/words.json` |
| 4 | کپی دمو | `cp -r src/styles/talk-page/demo src/v01` ← `sed -i 's#"\.\./lib/#"../styles/talk-page/lib/#g' src/v01/*.ts src/v01/*.tsx` ← در `src/v01/media.ts`: `talk: "v01/talk-proxy.mp4"` |
| 5 | برگه‌ی کارگردانی: جمله‌به‌جمله (حرف او ↔ تیتر ↔ علامت ↔ المان ↔ برچسب واقعیت) | `cp $P/direction.md videos/01/direction.md` |
| 6 | کد: `src/v01/beats.tsx` (زمان‌ها از `work/words.txt`)، طول (`DEMO_DUR` = طول ویدیو)، ثبت در `src/Root.tsx` | پایین را ببین |
| 7 | فریم‌های ثابت | `node tools/look.mjs V01-Look "0,2.5,6,…" out/v01/look` (هر بخش، هر ترنزیشن، شلوغ‌ترین قاب، پایان) |
| 8 | رندر نوار شفاف (ProRes 4444، فقط y ≥ OV_Y) | `bash $P/render-ov.sh V01-Overlay out/v01/ov.mov` |
| 9 | موزیک: یک بستر پیوسته با **یک بلندی ثابت** | `node $P/music-env.cjs song.mp3` (ساختار) ← `node tools/music-steady.mjs song.mp3 work/bed.wav --dur <طول> [--seg "0:16,32:32"]` |
| 10 | میکس: صدای دست‌نخورده + موزیک با یک gain ثابت | `bash $P/mix.sh talk.mov work/bed.wav work -20` ← `node tools/word-margin.mjs work/stem-voice.wav work/stem-music.wav work/stt.json` (کمینه ≥ ۱۰dB) |
| 11 | تصویر نهایی (اصل ۶۰fps + نوار؛ HDR خودکار به SDR) | `bash $P/composite.sh talk.mov out/v01/ov.mov 1000 out/v01/silent.mp4` |
| 12 | تحویل: نهایی + گوشی زیر ۲۹MB + بی‌موزیک + کاور | `node tools/finalize.mjs out/v01/silent.mp4 work/mix.wav out/v01 v01 --nomusic work/voice.wav --cover 0.5 --keep-range` |
| 13 | بازبینی با زمان دقیق هر کاشی | `bash $P/review-frames.sh out/v01/v01.mp4 out/v01/review 3 1000 0.5 12.4 …` |
| 14 | اصلاح چند ثانیه بدون رندر کامل (چند ثانیه، نه دقیقه) | `bash $P/patch-ov.sh V01-Overlay out/v01/ov.mov <از فریم> <تا فریم>` ← دوباره ۱۱ و ۱۲ |

**اختیاری:** موج زنده‌ی صدا روی میز (تماس، ویس) ← `node $P/voice-env.cjs talk.mov src/v01/env.json` و در کد `envLevel(env)` به `VoiceWave`.

## ثبت در `src/Root.tsx`
```tsx
import { Composition } from "remotion";
import { OV_Y, type TalkFilmProps } from "./styles/talk-page";
import { TalkPageDemo as V01, DEMO_DUR as V01_DUR, DEMO_LOOK as V01_LOOK } from "./v01/Video";
const looks = ({ props }: { props: TalkFilmProps }) => ({ durationInFrames: props.times?.length || Math.round(V01_DUR * 30) });
<Composition id="V01" component={V01} durationInFrames={Math.round(V01_DUR * 30)} fps={30} width={1080} height={1920} />
<Composition id="V01-Look" component={V01} durationInFrames={V01_LOOK.length} fps={30} width={1080} height={1920} defaultProps={{ times: V01_LOOK }} calculateMetadata={looks} />
<Composition id="V01-Overlay" component={V01} durationInFrames={Math.round(V01_DUR * 30)} fps={30} width={1080} height={1920 - OV_Y} defaultProps={{ overlay: true, ovY: OV_Y }} />
```
- `OV_Y` = بالای نوار. صفحه‌ی بلند (قلاب با فیگور بزرگ) ← `1000`. اگر صفحه هیچ‌وقت بلند نمی‌شود ← `1190` (نوار کوچک‌تر، رندر و فایل سبک‌تر). همان عدد را به `composite.sh` بده.
- طول کامپوزیشن‌ها = طول خود ویدیو (`ffprobe`). نوار ۳۰fps کافی است؛ ffmpeg هر فریمش را برای دو فریم ویدیوی ۶۰fps نگه می‌دارد.

## نکته‌های Scribe (روی گفتار فارسی خود گوینده)
- اسم برند و کلمه‌ی انگلیسی را آوایی یا غلط می‌نویسد. همان تکه را جدا با زبان `eng` بفرست تا شکل درست را ببینی. تیتر صفحه همیشه اسم **درست** را می‌نویسد.
- کلمه‌ی نیمه‌کاره را `--` می‌زند و نفس و خنده را `[…]`. زمان شروع کلمه معتبر است؛ پایان کلمه‌ی آخر جمله گاهی تا داخل مکث کش می‌آید.
- صدایی که از بلندگوی گوشی پخش می‌شود (تماس، ویس) گوینده‌ی جدا می‌گیرد ← `who` در `words.json`.
- عددی که گوینده می‌گوید را با منبع چک کن. اگر فرق دارد، روی کاغذ عدد درست بیاید و به کاربر بگو.
