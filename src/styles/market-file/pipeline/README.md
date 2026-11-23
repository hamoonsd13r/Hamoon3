# پرونده‌ی خبر (Market File) · خط تولید، به ترتیب

همه‌ی دستورها از ریشه‌ی پروژه اجرا می‌شوند. `NN` شماره‌ی ویدیوی توست (مثلاً `01`).

## ۰. واقعیت‌ها قبل از متن
- `direction-template.md` را در `videos/NN-<slug>/direction.md` کپی کن و پر کن: پیام اصلی، هر عدد با منبع و تاریخ، و جدول شات‌ها.
- عددی که منبع ندارد روی تصویر نمی‌آید. ادعای کسی را «ادعا» نشان بده (نقل‌قول + اسم/نقش + «نقل به مضمون» اگر عین جمله نیست)، نه واقعیت.
- پیش‌بینی قیمت، «بهترین/امن‌ترین» و وعده‌ی سود نه.

## ۱. متن
- هر جمله یک خط در `src/vNN/lines.txt`. جمله‌ی کامل و محاوره‌ی ساده (۱۲ تا ۱۶ جمله برای ۶۰ تا ۹۰ ثانیه).
- جمله‌ی اول = قلاب با فاعل و یک کلمه‌ی داغ (همان که چیپ می‌گیرد). یک جمله «سؤالِ اصلی» برای سیل رنگی، یک جمله‌ی جمع‌بندی، و یک درخواست آخر (کامنت).
- اسم لاتین را برای TTS آوایی بنویس (`AUDIO.md`).

## ۲. صدا
```bash
node --env-file=.env tools/eleven-tts.mjs <voiceId> src/vNN/lines.txt public/vNN/voice.mp3 eleven_v4
node --env-file=.env tools/eleven-align.mjs public/vNN/voice.mp3 src/vNN/lines.txt src/vNN/words-raw.json
node tools/vo-tighten.mjs public/vNN/voice.mp3 src/vNN/words-raw.json public/vNN/voice-tight.wav --sent 0.14 --comma 0.18
# حالا public/vNN/voice-tight.words.json زمان کلمه‌های صدای کوتاه‌شده است → کپی به src/vNN/words.json
```
- صدای راوی: لحن خبری آرام و بدون تگ احساس (stability 0.5، similarity 0.75). فقط مکث بین جمله‌ها و بعد از ویرگول کوتاه می‌شود، نه بین کلمه‌ها.
- اسم‌های خاص را با `tools/eleven-stt.mjs` چک کن؛ اگر غلط بود فقط همان جمله را دوباره بساز.

## ۳. کپی دمو و زمان‌ها
- `src/styles/market-file/demo/{Video.tsx,script.ts,media.ts}` → `src/vNN/`.
- در `script.ts`: `LINES` را با متن خودت عوض کن و `WORDS` را از فایل واقعی بخوان:
  `import REAL from "./words.json"; export const WORDS = normalizeWords(REAL as RawWord[]);`
- `SC` (زمان صحنه‌ها) را با `at(خط, "کلمه")` روی کلمه‌های خودت بنویس. هیچ عدد زمانی دستی ننویس.

## ۴. فوتیج (یک کلیپ برای هر عبارت)
```bash
node tools/footage.mjs plan NN --text src/vNN/lines.txt
node tools/footage.mjs find NN --modern --min 1080
node tools/footage.mjs get …        # روال کامل: FOOTAGE.md
```
- هر اسلات `SHOTS` یک کلیپ؛ هیچ کلیپی دو بار نیاید. فوتیج نرم یا ۷۲۰p → `panel: true`.
- رنگ فوتیج را به پالت نزدیک کن (`GRADE.mute` برای قرمز و سبز تند، `GRADE.mapbg` زیر نقشه و چارت).
- اعتبار هر کلیپ در `credit` همان کلیپ (پایین قاب نوشته می‌شود) و در کپشن.

## ۵. فریم‌ها قبل از رندر
```bash
node tools/look.mjs V-NN-Look "0,2.5,6,9.8,14,21,30" out/look --entry src/index.ts
```
- قاب امن: متن مهم x بین ۶۰ و ۹۲۰ و y بین ۲۴۰ و ۱۶۰۰. هیچ دو متنی روی هم. فریم ۰ = کاور (کل سؤال، چیپ روشن).

## ۶. رندر بی‌صدا
```bash
npx remotion render src/index.ts V-NN out/vNN-silent.mp4 --muted --crf=18
# ریلزِ بلندتر از ۹۰ ثانیه یا سیستم کم‌رم: node tools/render-chunks.mjs V-NN <frames> out/chunks out/vNN-silent.mp4 300 --muted
```
- DOM خالص، بدون GPU؛ حدود ۰.۱ ثانیه برای هر فریم ۱۰۸۰×۱۹۲۰.

## ۷. صدا: میکس
```bash
node tools/beat-map.mjs public/vNN/music.mp3 out/vNN-beats.json      # ضرب‌ها و دراپ‌های آهنگ
cp src/styles/market-file/pipeline/audio.example.json out/vNN-audio.json   # پر کن: start، lowpassUntil، bumps، stops، sfx
node src/styles/market-file/pipeline/build-audio.mjs out/vNN-audio.json --stems --nomusic
```
- آهنگ CC0 یا با مجوز (MUSIC.md). `start` را طوری بگذار که دراپ اول روی کلمه‌ی داغ قلاب بیفتد.
- افکت‌ها روی ضربه‌های تصویر (چیپ‌ها، سیل رنگی، مهر تیک/ضربدر)، هر کدام با `align: "peak"` یا `"onset"`.
- هدف: صدا ‎-20، موزیک حدود ‎-33 تا ‎-35، افکت حدود ‎-40 LUFS (خروجی `--stems` همین‌ها را چاپ می‌کند).

## ۸. تحویل
```bash
node tools/finalize.mjs out/vNN-silent.mp4 out/vNN-audio/mix.wav out/final vNN --nomusic out/vNN-audio/mix-nomusic.wav
```
- نسخه‌ی اصلی، نسخه‌ی گوشی (زیر ۲۹ مگ) و نسخه‌ی بی‌آهنگ. قبل از تحویل کانتکت‌شیت کل فیلم را ببین (هر ۰.۵ ثانیه یک فریم): فریم خالی، متن روی هم، عدد بدون منبع.
