# Painted Story · خط تولید (دستورها به ترتیب)

`PS` = `src/styles/painted-story/pipeline` · ویدیو = `01` (پوشه‌ها: `videos/01/` متن و عکس، `src/v01/` کد، `public/v01/` عکس و صدا، `out/` موقت).

## ۰. متن و برگه‌ی کارگردانی
- `direction.md` را به `videos/01/` کپی و پر کن: قالب (افقی یوتیوب یا عمودی ریلز)، کاراکتر، مکان‌ها، جدول «جمله ← تصویر ← حرکت».
- متن = `videos/01/lines.json` (همان قالب `tools/doc-voices.mjs`): `[{ "n": 1, "sp": "N", "fa": "…", "gap": 0.5 }]`.
  - هر جمله یک ضرب؛ دوم‌شخص («تو»)؛ کلمه‌های روزمره و جمله‌ی کامل.
  - جایی که صدا یا تق‌تق می‌آید `gap` بلند بده (۲.۲ تا ۳.۲ ثانیه).
  - گوینده‌ها: `N` راوی، بقیه نقش‌ها (`U` اینترکام، `M` همسایه، `X` صدای تقلیدی، `R` رادیو…).
- زمان‌بندی تخمینی تا صدا بیاید (شات‌ها از همین حالا روی کلمه‌ها می‌نشینند):
  `node PS/estimate-vo.mjs videos/01/lines.json src/v01/vo.json --lead 0.6 --tail 4.6`

## ۱. کد فیلم
- افقی: `src/styles/painted-story/demo/doc/` → `src/v01/` · عمودی: `demo/tale/` → `src/v01/`.
- در فایل‌های کپی‌شده `../../lib/` را به `../styles/painted-story/lib/` عوض کن.
- در `Root.tsx` سه کامپوزیشن بساز (مثل `Compositions.tsx` همین سبک): `V01` (کامل)، `V01-Look` (`times`) و اگر قسمت داری `V01-P2` (`start/pre/end/card/part/next`).

## ۲. عکس‌ها (کاربر می‌سازد؛ Claude پرامپت و PDF را آماده می‌کند)
1. اول **برگه‌ی کاراکتر** (و برای افقی، نقشه‌ی خانه). تا کاربر تأییدش نکرده، شات نساز.
2. «ref-combo» بساز: برگه‌ی کاراکتر بالا + مکان اصلی پایین، در یک عکس.
3. `prompts.json` را از `prompts.doc.example.json` یا `prompts.tale.example.json` کپی کن. یک پرامپت برای هر شات، و ID برابر اسم شات در `shots`.
4. PDF: `node PS/make-pack.mjs videos/01/prompts.json videos/01/pack.pdf --ref videos/01/ref-combo.jpg [--examples a.jpg,b.jpg] [--ids s001,s002]`
5. کاربر عکس‌ها را با ChatGPT یا اپ Gemini می‌سازد و در `videos/01/img/` می‌ریزد (روال هر کدام: `image-brief.md`).
6. انتقال به فیلم: `node PS/sync-images.mjs videos/01/img public/v01/img src/v01/imgs.json`
   - اگر عکس‌ها از دو مدل‌اند `--match` بزن.
   - اگر اسم ندارند و فقط ترتیب دارند `--order order.txt`. ترتیب آپلود با ترتیب PDF یکی نیست؛ هر عکس را از روی صحنه بشناس.
7. کات‌اوت‌ها (PNG شفاف): `node PS/cutouts.mjs videos/01/cut public/v01/cut src/v01/cutouts.json`. اگر پس‌زمینه سفید درآمد، `--white` بزن.

## ۳. صدا (روی حساب ElevenLabs خود کاربر)
- **کستینگ:** `node --env-file=.env PS/cast.mjs videos/01/cast.json videos/01/cast` (نمونه: `cast.example.json`). خروجی `cast-all.mp3` است؛ کاربر با گوش انتخاب می‌کند.
- **ساخت:** `voices.json` را از `voices.doc.example.json` یا `voices.tale.example.json` کپی کن، بعد:
  - `node --env-file=.env tools/doc-voices.mjs videos/01`
  - `node tools/doc-build-vo.mjs videos/01 public/v01/vo.wav src/v01/vo.json --lead 1.2 --tail 6 --tempo 1.08`
- **صدای نقش‌ها** (اینترکام، دریچه، رادیو، تقلیدی): `node PS/vo-fx.mjs public/v01/vo.wav src/v01/vo.json public/v01/vo-fx.wav videos/01/fx.json`

## ۴. فریم‌ها قبل از رندر
- `node tools/look.mjs V01-Look "0:60:5" out/look` (یا زمان‌های لحظه‌های مهم).
- بعد چند فریم کامل (`--scale 1`) از لحظه‌های کلیدی ببین: متن روی کاراکتر نیفتد، شب روی گوشی خوانا باشد، و UI در عمودی بالای y=236 نرود.

## ۵. افکت، موتیف تق‌تق، موزیک، میکس
- **افکت‌ها:** `node --env-file=.env tools/eleven-sfx.mjs PS/sfx.example.json videos/01/sfx/raw 2`، بعد `node tools/sfx-takes.mjs stats videos/01/sfx/raw`.
  - takeهای تقریباً بی‌صدا را کنار بگذار.
- **موتیف تق‌تق:** از **یک** ضربه‌ی تمیز ساخته می‌شود: `node PS/knock-motif.mjs videos/01/sfx/raw/knock_one-1.mp3 videos/01/sfx/motif`.
  - «سه ضربه»ی ساخته‌شده با AI نامنظم درمی‌آید، پس از آن استفاده نکن.
- **موزیک:** یا `node --env-file=.env tools/eleven-music-plan.mjs PS/music-plan.example.json public/v01/music/m1.mp3`، یا قطعه‌های CC0 آرام. هر فصل یک حس دارد و کراس‌فیدها روی شروع جمله‌اند.
- **برنامه‌ی صدا:** `events.json` را از `events.example.json` کپی کن، بعد:
  - `node PS/build-audio.mjs videos/01/events.json src/v01/vo.json out/audio --knocks src/v01/knocks.json`
  - در `Video.tsx`، `knocks` را از `src/v01/knocks.json` بخوان.
- **چک تعادل:**
  - `node tools/doc-mix.mjs out/audio/audio.json out/audio/mix.wav --stems` (با `--stems` فقط سه استم ساخته می‌شود)
  - `node PS/margin.mjs out/audio/mix-o1.wav out/audio/mix-o2.wav out/audio/mix-o3.wav src/v01/vo.json`
  - هر جمله باید دست‌کم ۱۰dB بالای بستر باشد. اگر نبود، `musicKeys` یا `musicEq` را عوض کن، افکت‌ها را به مکث‌ها ببر، یا `gain` آن جمله را بالا ببر.
- **میکس نهایی:** `node tools/doc-mix.mjs out/audio/audio.json out/audio/mix.wav` → `mix-norm.wav` (‎-14 LUFS).

## ۶. رندر و تحویل
- **کوتاه (تا ~۲ دقیقه):** `npx remotion render V01 out/v01-silent.mp4 --muted --concurrency=8 --crf=18`
- **بلند:** `node tools/render-chunks.mjs V01 <frames> out/chunks out/v01-silent.mp4 900 --muted`
  - تکه‌ای رندر می‌شود و قابل‌ادامه است.
  - فقط یک بازه: `--frames=a-b`.
- **تحویل:** `node tools/finalize.mjs out/v01-silent.mp4 out/audio/mix-norm.wav videos/01/final v01 --cover 2`. خروجی‌ها: فایل نهایی، نسخه‌ی گوشی زیر ۲۹MB و کاور.
- **یوتیوب:**
  - `node tools/srt.mjs src/v01/vo.json videos/01/final/v01.fa.srt` (فیلم افقی زیرنویس روی تصویر ندارد؛ SRT جدا می‌رود)
  - `node tools/youtube-pack.mjs videos/01/chapters.json videos/01/final --vo src/v01/vo.json --credits public/v01/img/CREDITS.md`
- **قسمت‌ها:**
  - `V01-P2` را رندر کن.
  - صدای همان پنجره را جدا کن: `node PS/part.mjs out/audio/mix-norm.wav out/p2.wav <start> <end> --pre 2.6`.
  - بعد finalize.
