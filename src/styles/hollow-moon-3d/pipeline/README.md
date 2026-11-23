# Hollow Moon 3D · خط تولید (دستورها به ترتیب، از ریشه‌ی پروژه)

کارت سبک: `styles/hollow-moon-3d.md`. همه‌ی دستورها از پوشه‌ی پروژه (جایی که `package.json` هست).

## ۰. یک بار: دارایی‌ها و ساخت ماه (بدون این، هر فریم فقط این دو دستور را نشان می‌دهد)
```bash
node src/styles/hollow-moon-3d/pipeline/fetch-assets.mjs     # Poly Haven (CC0) + نقشه‌ی LROC ناسا · ~135MB · چند دقیقه
npx tsx src/styles/hollow-moon-3d/pipeline/bake.mts           # CPU، حدود ۱ دقیقه، ~2GB رم → moon/ و assets.json (ready)
```
خروجی‌ها: `public/styles/hollow-moon-3d/` (حدود ۲۸۰MB) و `.cache/hollow-moon-3d/` (ورودی‌های خام، حدود ۱۷۰MB؛ بعد از bake می‌شود پاکش کرد).

## ۱. لوگو و کلمه‌های برند
لوگوی PNG شفاف (≥ 1000px):
```bash
node tools/logo-trace.mjs logo.png src/v01 --accent=#FF5A1F --sub=x0,y0,x1,y1 --only=paths --preview
```
بدون فایل لوگو، از متن:
```bash
npx remotion still Style-HollowMoon3D-LogoCard out/logo.png --props='{"main":"NOVA","sub":"STUDIO"}'
node tools/logo-trace.mjs out/logo.png src/v01 --accent=#FF5A1F --sub=0,470,2000,670 --only=paths --preview
```
`logo-preview.svg` را قبل از رندر ببین. بعد در `film.ts`: `BRAND = { logo, inscription: ["NOVA", "STUDIO"], slit: false }`.

## ۲. فیلم خودت
```bash
cp -r src/styles/hollow-moon-3d/demo src/v01
```
در `src/v01/` ایمپورت‌های `../lib/…` را به `../styles/hollow-moon-3d/lib/…` عوض کن. فقط `film.ts`: `MUSIC`، `CUT`، `SHOTS`، `LOGO_T`، `BRAND`، `FAR_FLASHES`، `LOOK`.
در `src/Root.tsx` سه کامپوزیشن از `HollowMoonVideo` کپی‌شده، مثل `Compositions.tsx`: `V01`، `V01-Look`، `V01-4K`.

## ۳. موزیک و گرید زمان
```bash
node tools/beat-map.mjs music/song.mp3 out/beats.json                        # BPM و ضرب‌ها (کیک‌ها ~۳۰ms زود: +0.03)
node src/styles/hollow-moon-3d/pipeline/analyze-music.cjs music/song.mp3      # سه باند، ضربه‌های بزرگ، اولین صدا
```
`MUSIC.off` = ثانیه‌ی ضربه‌ی بزرگ اول آهنگ منهای دو میزان. آهنگ نداری؟ `pipeline/music-plan.json` با `tools/eleven-music-plan.mjs` (۳ تا ۴ take، بهترین را با `analyze-music` انتخاب کن).

## ۴. کلید دوربین بدون رندر
```bash
npx tsx src/styles/hollow-moon-3d/pipeline/pt.mts "sf(80,35,145) | sf(58,15,100) | 38"   # → رشته‌ی --cams
npx tsx src/styles/hollow-moon-3d/pipeline/pt.mts --keys       # دوربین‌های فیلم در شروع، وسط و پایان هر نما
npx tsx src/styles/hollow-moon-3d/pipeline/lightdir.mts        # نور از بالای قاب؟ (up > 0 یعنی دهانه کاسه دیده می‌شود)
npx tsx src/styles/hollow-moon-3d/pipeline/findc.mts           # دوربینِ روی پوسته با نور مایل
npx tsx src/styles/hollow-moon-3d/pipeline/clear.mts 2.5       # فاصله‌ی لنز از حلقه‌ها، میله، قفس، آب و پوسته در هر فریم
```

## ۵. فریم ثابت
```bash
node src/styles/hollow-moon-3d/pipeline/look.mjs out/look --times 0.6,3.7,18.47,31.6,33.6 --sheet --comp V01-Look
node src/styles/hollow-moon-3d/pipeline/look.mjs out/look --cams "<از pt.mts>" --reuse
```

## ۶. صدا
```bash
node src/styles/hollow-moon-3d/pipeline/build-audio.cjs --song music/song.mp3 --off 11.093 --bpm 130 --out out/audio --stems
node src/styles/hollow-moon-3d/pipeline/levels.cjs out/audio 0.5          # موزیک و طوفان پنجره‌به‌پنجره
node src/styles/hollow-moon-3d/pipeline/onset.cjs out/audio/mix.wav 3.70  # ضربه روی فریم صاعقه؟ (خطا < 10ms)
```
`--sfx <کتابخانه‌ی CC0 با sfx/<گروه>/<اسم>.wav>` اختیاری است؛ بدون آن افکت‌ها از `public/sfx-lib` کیت می‌آیند و باد سنتز می‌شود.

## ۷. رندر، بازبینی، چسباندن
```bash
npx remotion render V01 out/v01-silent.mp4 --gl=angle --concurrency=1 --timeout=300000 --muted --crf=15
bash src/styles/hollow-moon-3d/pipeline/review.sh out/v01-silent.mp4 out/review "0.6 3.7 18.5 31.6 34.6"
node src/styles/hollow-moon-3d/pipeline/check-frames.cjs out/v01-silent.mp4 30 3.69,7.38,11.08,14.77,22.15,25.85,29.54
bash src/styles/hollow-moon-3d/pipeline/final.sh out/v01-silent.mp4 out/audio/mix.wav videos/01/final.mp4 1050
```
