# Talk Cutout · خط تولید (دستورها به ترتیب، از ریشه‌ی پروژه)

کارت سبک: `styles/talk-cutout.md`. سلیقه و قانون‌های ادیت: `EDIT.md` کیت.
پایتون ۳.۱۰ به بالا با `pip install rembg onnxruntime pillow numpy scipy` (بهتر در یک venv: `-I` بسته‌هایی را که با `pip install --user` نصب شده‌اند نمی‌بیند). ffmpeg روی PATH (با libvpx برای VP9 آلفا). مدل isnet بار اول دانلود می‌شود (`U2NET_HOME`).
همه‌ی کارهای سنگین (فریم‌ها، ماسک‌ها) در `work/v01/` (بیرون از `public/`؛ Remotion در هر رندر کل public را کپی می‌کند).
```bash
P=src/styles/talk-cutout/pipeline
PY=python        # مک و لینوکس: python3 · پایتون همیشه با -I
```
اسم پوشه‌ها نمونه است (`v01`)؛ عددهای فریم پایین (`3-1295`، `69-77`…) هم نمونه‌اند: عدد خودِ فیلمت را از step 1 بردار.

## ۰. فریم‌ها، صدا و ساعت کلمه‌ها
```bash
bash $P/extract.sh me.mp4 work/v01 30          # فریم‌های f_*.jpg (۵۰/۶۰fps → ۲۵/۳۰) + voice/raw.wav؛ HDR گوشی خودش tone-map می‌شود
# متن دقیق داری (هر جمله یک خط): همسوسازی
node --env-file=.env tools/eleven-align.mjs work/v01/voice/raw.wav script.txt src/v01/words.json
# متن دقیق نداری: STT و جمله‌ها با زمان شروعشان (از روی معنی، نه نقطه)
node --env-file=.env tools/eleven-stt.mjs work/v01/voice/raw.wav work/v01/voice/stt.json fas
node $P/words-from-stt.mjs work/v01/voice/stt.json src/v01/words.json --starts 0,4.56,10.38
```
قبل از صدا هم می‌شود چید: `node $P/stub-words.mjs script.txt src/v01/words.json` (زمان تخمینی). صدای او **هرگز** بریده یا کش داده نمی‌شود: زمان فیلم = زمان منبع.

## ۱. برداشت‌ها و کات‌ها
```bash
"$PY" -I $P/probe-cuts.py work/v01/frames --fps 30 --out work/v01/takes.json
```
جامپ‌کات‌ها، فریم‌های سیاه (`skip`) و اولین فریم روشن (`start`) را چاپ می‌کند. لایت‌لیک یا فید خودش را برداشت جدا حساب کن.

## ۲. ماسک (rembg isnet، دو پروسه کنار هم)
```bash
"$PY" -I $P/matte.py work/v01/frames work/v01/mattes 0 2 3-1295 &
"$PY" -I $P/matte.py work/v01/frames work/v01/mattes 1 2 3-1295
```
فقط بازه‌هایی که خودش روی صفحه است (بخش‌های تمام‌صفحه ماسک نمی‌خواهند).

## ۳. آلفای توپر و بی‌پرپر برای لایه‌ی برش + چک در نرخ کامل فریم
```bash
"$PY" -I $P/fg-alpha.py work/v01/mattes work/v01/fg --takes work/v01/takes.json
# دیوار رنگی (بنفش، آبی) آستین‌ها را از isnet می‌گیرد: «او = هرچه دیوار نیست»
"$PY" -I $P/fg-alpha.py work/v01/mattes work/v01/fg --takes work/v01/takes.json --frames work/v01/frames --wall b-g:0.12:0.22 [--band 1760-1840]
"$PY" -I $P/qc-flicker.py work/v01/fg --takes work/v01/takes.json --heat work/v01/qc
"$PY" -I $P/qc-silhouette.py work/v01/fg --prefix fa_ --takes work/v01/takes.json
```
- پرپر را با کانتکت‌شیت نمی‌شود دید؛ `qc-flicker` باید برای هر بازه چند هزار پیکسل باشد، نه صدها هزار، و در heat map روی آستین و مو چیزی نباشد.
- `qc-silhouette` جای خالی هر برداشت را می‌دهد (بالای سر، کنار صورت). کارت‌ها را **فقط** همان‌جا بچین.

## ۴. رنگ طبیعی و نور ثابت
```bash
"$PY" -I $P/grade.py still all work/v01/frames/f_00200.jpg work/v01/mattes/m_00200.png work/v01/look_{look}.jpg   # مقایسه
"$PY" -I $P/grade.py clip natural work/v01/frames work/v01/mattes work/v01/graded
"$PY" -I $P/level.py work/v01/graded work/v01/level --takes work/v01/takes.json --face face.json --leave 69-77 --hold 1296-1348:1295
```
- `face.json`: جعبه‌ی صورت هر برداشت `{"A":[y0,y1,x0,x1],"*":[…]}` (روی یک فریم از هر برداشت اندازه بگیر).
- `--leave`: لایت‌لیک خودش. `--hold`: فید به سیاه (gain فریم مرجع همان برداشت؛ بدون این، فید ×۱.۱۴ روشن می‌شود).

## ۵. دو لایه، با یک ماتریس رنگ + چک آلفا
```bash
bash $P/encode-layers.sh work/v01/level work/v01/fg public/v01 30 3     # 3 = اولین فریم روشن
"$PY" -I $P/qc-alpha.py public/v01/talk_fg.webm work/v01/fg
```
بعد در `src/v01/media.ts`: `MEDIA = { "talk.mp4": "v01/talk.mp4", "talk_fg.webm": "v01/talk_fg.webm" }` و `SRC = { fps: 30, start: 0.1, hold: …, skip: [134] }`.

## ۶. فیلم: کپی دمو، چیدمان، فریم‌ها، رندر بی‌صدا
```bash
cp -r src/styles/talk-cutout/demo src/v01
sed -i 's#"\.\./lib/#"../styles/talk-cutout/lib/#g; s#"\.\./\.\./lib/#"../../styles/talk-cutout/lib/#g' src/v01/*.ts* src/v01/scenes/*.tsx src/v01/wide/*.ts*
node $P/captions.mjs src/v01/words.json captions.config.json src/v01/captions.ts   # importFrom: "../styles/talk-cutout/lib/captions"
```
- `script.ts` (کیوها روی کلمه‌ها: `at(si, "کلمه")`)، `scenes/hook.tsx` (جای کارت‌ها از step 3)، `scenes/*` و `media.ts` را عوض کن.
- در `src/Root.tsx` مثل `Compositions.tsx`: `V01-Silent` (`TalkCutoutFilm`) و `V01-Look`.
```bash
node tools/look.mjs V01-Look "0.4,2.3,4.7,9,13,18,22.5,25,28.2,30.5" out/v01-look       # ۱۰ تا ۱۲ لحظه، یک کانتکت‌شیت
node tools/render-chunks.mjs V01-Silent <frames> out/v01-chunks out/v01-silent.mp4 300 --muted --concurrency=4 --timeout=180000
bash $P/review-sheets.sh out/v01-silent.mp4 out/v01-review 0.5                         # هر نیم ثانیه، زمان دقیق
```

## ۷. صدای خودش: فقط تمیز
```bash
bash $P/voice.sh work/v01/voice/raw.wav public/v01/voice-clean.wav
```

## ۸. موزیک با یک بلندی ثابت + میکس + اندازه‌گیری
```bash
node tools/beat-map.mjs song.mp3 work/v01/beats.json                                    # داون‌بیت‌ها
node $P/music-steady.mjs song.mp3 <start> <dur> public/v01/music-steady.wav              # یک تکه‌ی پیوسته، تراز
node $P/build-audio.mjs audio.config.json --stems                                       # نمونه: pipeline/audio.config.json
node $P/margin.mjs public/v01/mix.st-voice.wav public/v01/mix.st-music.wav src/v01/words.json
bash $P/phone-band.sh public/v01/mix.st-music.wav
node $P/build-audio.mjs audio.config.json --nomusic
```
هدف: صدا ‎−21، موزیک در باند گوشی حدود ‎−38، افکت‌ها ‎−38 تا ‎−42 LUFS؛ فاصله‌ی کلمه‌ها از موزیک کمینه ≥ ۹ و میانه حدود ۲۰dB. خروجی ‎−14.

## ۹. تحویل: اصلی + گوشی + بی‌آهنگ + کاور
```bash
node tools/finalize.mjs out/v01-silent.mp4 public/v01/mix.wav videos/v01 v01 --nomusic public/v01/mix-nomusic.wav --cover 0.4 --frames <frames>
```

## ابزارهای کناری
- `studio-blur.py`: تار کردن اسم کانال، آواتارها، عنوان و تامنیل ویدیوها در اسکرین آمار خودت (اول `--test` برای دیدن جعبه‌ها).
- `stub-words.mjs`: زمان تخمینی برای چیدن قبل از صدا. `captions.config.json` و `audio.config.json`: نمونه‌ی دمو.
- `direction.md`: قالب برگه‌ی کارگردانی.
