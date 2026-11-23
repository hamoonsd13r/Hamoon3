# Snow Castle 3D · خط تولید (دستورها به ترتیب، از ریشه‌ی پروژه)

همه‌ی دستورها را از پوشه‌ی پروژه (جایی که `package.json` هست) بزن. کارت سبک: `styles/snow-castle-3d.md`.

## ۰. یک بار: دارایی‌های کامل (برای خروجی نهایی)
```bash
node src/styles/snow-castle-3d/pipeline/fetch-assets.mjs          # بافت 2k + آسمان 8k از Poly Haven (CC0)، حدود ۱۱۵MB
```
کیت نسخه‌ی سبک (بافت 1k و آسمان 2k) را دارد تا دمو فوراً پخش شود. برای فریم ثابت و تست همان کافی است.

## ۱. فیلم خودت
```bash
cp -r src/styles/snow-castle-3d/demo src/v01
```
در `src/v01/`: ایمپورت‌های `../lib/…` را به `../styles/snow-castle-3d/lib/…` عوض کن. فقط `film.ts` را ویرایش کن:
`DUR`، `SHOTS` (کلیدهای دوربین)، `duskAt` و `litAt` (ساعت نور) و `LOOK`.
در `src/Root.tsx` سه کامپوزیشن از `SnowCastleVideo` کپی‌شده بساز، مثل `Compositions.tsx` همین سبک: `V01` (1920×1080، ۳۰fps)، `V01-Look` (با `times` و `calculateMetadata`) و `V01-4K` (3840×2160 با `{ ss: 1.5 }`).

## ۲. کلید دوربین بدون رندر
```bash
npx tsx src/styles/snow-castle-3d/pipeline/probe.mts                 # زمین زیر هر کلید، فاصله تا زمین، آب، جنگل
npx tsx src/styles/snow-castle-3d/pipeline/probe.mts map             # نقشه‌ی ارتفاع هر ۱۰ متر
npx tsx src/styles/snow-castle-3d/pipeline/probe.mts fine 0 100 100 200 5
```

## ۳. فریم ثابت (یک صفحه، دنیا یک بار ساخته می‌شود)
```bash
node src/styles/snow-castle-3d/pipeline/look.mjs out/look --times 1.2,9,22,34 --sheet --comp V01-Look
node src/styles/snow-castle-3d/pipeline/look.mjs out/look --cams "62,16,176,-34,86,44,40" --reuse
node src/styles/snow-castle-3d/pipeline/look.mjs out/look --times 9 --dbg "skyexp=1.1,expo=1.2" --reuse
```
`--reuse` باندل را دوباره نمی‌سازد (فقط وقتی کد عوض نشده). سوییچ‌ها و عددهای `--dbg` در کارت هست.

## ۴. موزیک (سنتز با کد، بدون فایل و مجوز)
```bash
node src/styles/snow-castle-3d/pipeline/make-music.cjs out/music     # → out/music/mix.wav (−14 LUFS) + stem-*.wav + spec.png
```
فیلم با طول دیگر: `DUR` و `FILM_DUR` و میزان‌های `CH`/`ROOT`/`MEL` در همان فایل. زنگ هر فانوس از `litToFilm` می‌آید (معکوس `litAt`).

## ۵. رندر بی‌صدا
```bash
npx remotion render V01 out/v01-silent.mp4 --gl=angle --concurrency=1 --timeout=300000 --muted --crf=15
# 4K (ss 1.5 داخلی، GPU ≥ 8GB):
npx remotion render V01-4K out/v01-4k-silent.mp4 --gl=angle --concurrency=1 --timeout=300000 --muted --crf=14 --jpeg-quality=95
```

## ۶. بازبینی و چسباندن صدا
```bash
bash src/styles/snow-castle-3d/pipeline/review.sh out/v01-silent.mp4 out/review "1.2 15 30 38"
node src/styles/snow-castle-3d/pipeline/check-frames.cjs out/v01-silent.mp4 30
bash src/styles/snow-castle-3d/pipeline/final.sh out/v01-silent.mp4 out/music/mix.wav videos/01/final.mp4 1200
```
`final.sh` اول تعداد فریم را چک می‌کند، بعد BT.709 و نسخه‌ی گوشی (حدود ۲۷MB) می‌سازد.
