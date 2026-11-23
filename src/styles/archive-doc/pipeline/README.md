# مستند آرشیوی (Archive Doc) · خط تولید، به ترتیب

همه‌ی دستورها از ریشه‌ی پروژه. `NN` شماره‌ی ویدیوی توست.

## ۰. پژوهش
- `videos/NN-<slug>/direction.md`: سؤال فیلم، فصل‌ها، و جدول «عبارت ← شات ← منبع». هر عدد از پرونده‌ی رسمی با منبع.
- فقط فیلم و عکس آزاد (FOOTAGE.md): دولت آمریکا (NASA، NARA)، کتابخانه‌ی کنگره، Prelinger فقط با مجوز PD، آثار قبل از ۱۹۳۱. توضیح هر آیتم را بخوان؛ برچسب مجوز همیشه کافی نیست.

## ۱. فیلم و عکس
```bash
node tools/footage.mjs plan NN --text src/vNN/lines.txt --archive
node tools/footage.mjs find NN --archive
node tools/footage.mjs get …
```
- هر کلیپ را با ffmpeg ببُر (بدون صدا) و در `MEDIA` اسم بده: `{ src: "vNN/clips/x.mp4", dur: 12.4, ar: 4 / 3 }`.
- NTSC 720×480 با SAR 10:11: `-vf "scale=1440:1080,setsar=1"`؛ فیلم سوخته: `-vf "curves=all='0/0 0.6/0.52 1/0.86'"`.
- برای هر کلیپ کانتکت‌شیت ۴fps بگیر و بخش تمیز را پیدا کن (کات داخلی، تیتراژ، لوگو).

## ۲. صدا
```bash
node --env-file=.env tools/eleven-tts.mjs <voiceId> src/vNN/lines.txt public/vNN/voice.mp3 eleven_v4
node --env-file=.env tools/eleven-align.mjs public/vNN/voice.mp3 src/vNN/lines.txt src/vNN/words.json
```
- مکث قبل از عنوان و کارت فصل ۲.۵ تا ۳.۵ ثانیه (در `estimateWords` با `before`، و در صدای واقعی با `doc-build-vo`).

## ۳. فیلم
- `demo/{Video.tsx,script.ts}` ← `src/vNN/`، ایمپورت‌ها ← `../styles/archive-doc/lib/…`.
- `SHOTS`: یک شات برای هر عبارت، `at` روی کلمه؛ `TYPE`: کپشن‌ها، اسم‌ها، عنوان، فصل‌ها؛ `SCENES`: گزارش جوهری و کارت مشخصات.
- فیلم ۱۵ دقیقه‌ای را به فایل‌های فصل تقسیم کن تا هر بار فقط یک فصل را بخوانی و رندر کنی.

## ۴. بازبینی و رندر
```bash
node tools/look.mjs V-NN-Look "0.5,10,30,60,120" out/look --entry src/index.ts
node tools/render-chunks.mjs V-NN <frames> out/chunks out/vNN-silent.mp4 900 --muted --timeout=120000
```
- کانتکت‌شیت کل فیلم را ببین (هر ۲ ثانیه یک فریم): فریم سیاه، کلیپ تکراری، کپشن روی تصویر روشن.

## ۵. میکس و تحویل
- `tools/doc-mix.mjs` (AUDIO.md): صدا ‎-21، موزیک حدود ‎-33، افکت حدود ‎-40 LUFS، خروجی ‎-14.
- `node tools/finalize.mjs out/vNN-silent.mp4 out/mix.wav out/final vNN` و زیرنویس جدا با `tools/srt.mjs`.
