# مستند نقشه‌ای (Atlas Doc) · خط تولید، به ترتیب

همه‌ی دستورها از ریشه‌ی پروژه اجرا می‌شوند. `NN` شماره‌ی ویدیوی توست.

## ۰. پژوهش و متن
- `videos/NN-<slug>/direction.md`: سؤال اصلی، فصل‌ها (هر ۱ تا ۳ دقیقه یک فصل)، هر عدد با منبع و تاریخ، و فهرست فوتیج و عکس آزاد (FOOTAGE.md).
- متن نریشن: هر جمله یک خط در `src/vNN/lines.txt`؛ عددها را با حروف بنویس (همان‌طور که صدا می‌خواند)؛ روی تصویر رقم نشان داده می‌شود.
- شروع سرد ۲۰ تا ۴۵ ثانیه با قوی‌ترین تصویر (معمولاً نقشه از فضا) و سؤال فیلم.

## ۱. داده‌ی نقشه (یک بار برای هر فیلم)
```bash
node src/styles/atlas-doc/pipeline/geo-prep.mjs --bbox <lon0,lat0,lon1,lat1> --out src/vNN/geo.json --eps 0.03
```
- مرز کشورها، رودها و دریاچه‌ها از Natural Earth (مالکیت عمومی). جعبه را کمی بزرگ‌تر از دورترین نمای دوربین بگیر.
- جزئیات بیشتر برای نمای نزدیک: `--eps 0.01` (فایل بزرگ‌تر).

## ۲. تصویر ماهواره‌ای (اختیاری ولی همان «حس اتاق جنگ»)
```bash
node src/styles/atlas-doc/pipeline/tiles-get.mjs --out public/vNN/tiles --plan "4-5:<کل منطقه>" --plan "6-7:<کشور>" --plan "8-10:<جای نزدیک>"
```
- Sentinel-2 cloudless 2016 از EOX با مجوز CC BY 4.0. خط اعتبار روی نقشه (`SourceTag`) و در توضیحات ویدیو لازم است.
- هر زوم چهار برابر قبلی کاشی دارد؛ زوم‌های عمیق را فقط برای جاهایی بگیر که دوربین واقعاً نزدیک می‌رود. فیلم ۲۰ دقیقه‌ای حدود ۵۰ مگ.
- بدون کاشی، همان نقشه‌ی برداری تیره رندر می‌شود.

## ۳. صدا و زمان کلمه‌ها
```bash
node --env-file=.env tools/eleven-tts.mjs <voiceId> src/vNN/lines.txt public/vNN/voice.mp3 eleven_v4
node --env-file=.env tools/eleven-align.mjs public/vNN/voice.mp3 src/vNN/lines.txt src/vNN/words.json
```
- فیلم بلند: نریشن را جمله‌به‌جمله یا فصل‌به‌فصل بساز و با `tools/doc-build-vo.mjs` پشت هم بچین (AUDIO.md). مکث قبل از هر کارت فصل حدود ۲.۶ ثانیه.

## ۴. کپی دمو و ساختن فصل‌ها
- `src/styles/atlas-doc/demo/{Video.tsx,script.ts}` ← `src/vNN/`؛ ایمپورت‌ها را به `../styles/atlas-doc/lib/…` برگردان.
- در `script.ts`: `LINES`، `WORDS = normalizeWords(REAL)`، کارت‌ها (`CARDS`) و `SC` با `at(خط, "کلمه")`.
- هر فصل چند «بخش» (`Section`) است: نقشه (`Atlas` با کلیدهای دوربین `CamKey`)، فوتیج (`Clip`)، یا کارت دیتا. فیلم بلند را به چند فایل بخش تقسیم کن (هر فایل یک فصل) تا هر بار فقط همان را بخوانی و رندر کنی.
- فوتیج: نام هر کلیپ در `MEDIA` (`{ src, dur }`)؛ آرشیو ۴:۳ با `fit: "contain"`.

## ۵. فریم‌ها قبل از رندر
```bash
node tools/look.mjs V-NN-Look "0,8,20,45,90,130" out/look --entry src/index.ts --props props-tiles.json
```
- هر ۶۰ تا ۹۰ ثانیه یک لحظه‌ی بزرگ (پرواز نقشه، عدد غول‌پیکر، فوتیج کلیدی). هیچ نمای ثابت بیشتر از ۸ ثانیه.

## ۶. رندر
```bash
node tools/render-chunks.mjs V-NN <frames> out/chunks out/vNN-silent.mp4 900 --muted --props=props-tiles.json --timeout=120000
```
- DOM خالص، بدون GPU؛ حدود ۰.۱ تا ۰.۲ ثانیه برای هر فریم ۱۰۸۰p (نقشه با کاشی کندتر). فیلم ۲۰ دقیقه‌ای را تکه‌تکه رندر کن.

## ۷. میکس و تحویل
- میکس فیلم بلند: `tools/doc-mix.mjs` (AUDIO.md): صدا ‎-21، موزیک حدود ‎-33، افکت حدود ‎-39 LUFS، خروجی ‎-14.
- `node tools/finalize.mjs out/vNN-silent.mp4 out/mix.wav out/final vNN` و برای زیرنویس جدا `tools/srt.mjs`.
