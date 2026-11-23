# Style Index · «۲۰ استایل موشن‌دیزاین» (بیست سبک طراحی گرافیک، هر کدام یک پوستر متحرک ۶ ثانیه‌ای، و ریلز فهرستی)
**وضعیت:** ✅ کد آماده در Remotion · `src/styles/style-index/`
- `Style-StyleIndex` · عمودی 1080×1920، ۳۰fps، ریلز ۲۵ ثانیه‌ای: فهرست شماره‌دار، پوستر هر سبک در کارت، دیوار بیست پوستر، کامنت «ART» (بی‌صدا)
- `Style-StyleIndex-Look` · همان ریلز، props `{ times }`
- `Style-Poster` · یک پوستر 720×1280، ۶ ثانیه، props `{ id }` · `Style-Poster-Look` (`{ id, times }`) · `Style-PosterSheet` (`{ times, ids?, cols? }`)
- بیست سبک: Minimalism، Maximalism، Futuristic، Vector Art، Collage، Retro، Cyberpunk، Pop Art، Glassmorphism، Claymorphism (سه‌بعدی)، Pixel Art، Editorial، Y2K (سه‌بعدی)، Swiss، Surreal، Bohemian، Victorian، Graffiti، Aurora (سه‌بعدی)، Handwritten.

**مرجع:** ریلز «استایل‌های موشن‌دیزاین» (فهرست انگلیسی سمت چپ، پوستر متحرک هر سبک در کارت سمت راست، یک کارت روی هر ضرب). کانتکت‌شیت: `styles/previews/style-index.jpg`.
**اسم‌های صدازدن:** «۲۰ استایل»، «فهرست سبک‌ها»، «پوستر متحرک»، «استایل‌های طراحی گرافیک».

## کی بزنیمش
- **ریلز آموزشی و فهرستی:** «۱۰ سبک…»، «۲۰ ابزار…»، «انواع…» با یک نمونه‌ی دیدنی برای هر مورد و کامنت آخر.
- **پوستر متحرک تکی:** کاور، استوری، پس‌زمینه‌ی یک تیتر، یا نمونه‌ی یک سبک طراحی در ویدیوی دیگر.
- **کی نه:** خبر و مستند ← سبک‌های فوتیج؛ معرفی محصول ← سبک‌های محصول.

## ظاهر
- **ریلز** (`demo/Video.tsx`): زمینه‌ی کرم، قرص مشکی عنوان، فهرست شماره‌دار با Inter ایتالیک که روی هر اسم پر می‌شود، کارت پوستر با برچسب ریز و شمارنده‌ی `07 / 20`، بعد دیوار بیست پوستر، کلمه‌ی کامنت حرف‌به‌حرف، جعبه‌ی کامنت که ارسال می‌شود، و آیکون دایرکت روی ضربه‌ی آخر.
- **پوسترها** (`lib/posters/*.tsx`): هر کدام یک کامپوننت `({ t }) => JSX` در قاب 720×1280؛ سوژه‌ی بزرگ (کات‌اوت)، تایپ درشت لایه‌لایه با سوژه، تایپ ریز (تاریخ، برچسب، شماره) و حرکت دائمی. سه پوستر three.js دارند (`lib/three.tsx`).
- **کیت پوستر** (`lib/kit.tsx`): `Frame`، `Abs`، `Grain`، `Paper`، `Halftone`، `Cut` (کات‌اوت)، `Sub` (یک تکه از برگه‌ی چند کات‌اوت)، `Letters` (حرف‌به‌حرف)، `wipe`، `jitter`، `Vignette`.
- **تصویرها:** کات‌اوت‌های بی‌پس‌زمینه در `public/styles/style-index/img/*.webp` (اندازه‌ی اصلی در `lib/imgs.json`)، ابرها در `clouds/`، داده‌ی حروف سه‌بعدی در `type/`.
- **حروف:** بیش از ۳۰ فونت OFL یا Apache (Inter، Anton، Playfair، Bodoni Moda، Bungee، Monoton، Press Start 2P، …) و Vazirmatn و Lalezar برای فارسی. مجوز هر فونت کنار فایلش است.

## شروع سریع
1. **پوستر تکی:** `npx remotion render Style-Poster out/poster.mp4 --props='{"id":"retro"}' --gl=angle` (یا فایل JSON برای props).
2. **ریلز فهرستی تازه:**
   - کپی `demo/Video.tsx` به `src/vNN/`؛ فهرست را در `lib/registry.tsx` (`STYLES`: `id`، `name`، `tag`، `fa`، `en`، `C`) کوتاه یا بلند کن.
   - زمان اسم‌ها: بدون صدا روی گرید ۱ ثانیه‌ای؛ با صدا `WORDS` را از alignment پر کن (`{ i, w, t0, t1 }` برای هر اسم و `cta: true` برای جمله‌ی کامنت).
   - کلمه‌ی کامنت: `letters` در `Cta`.
3. **پوستر تازه:** یک فایل در `lib/posters/` با `Frame` و قطعه‌های `kit`؛ کات‌اوت تازه را در `img/` بگذار و اندازه‌اش را به `imgs.json` اضافه کن.
4. **فریم‌ها:** `npx remotion render Style-PosterSheet out/sheet --sequence --image-format=jpeg --gl=angle --concurrency=1` (همه‌ی پوسترها در یک قاب).

## نقشه‌ی کد
| فایل | چی | ~توکن | کی بازش کنم |
|---|---|---|---|
| `lib/registry.tsx` | فهرست بیست سبک | 0.9k | همیشه |
| `demo/Video.tsx` | ریلز: عنوان، فهرست، کارت، دیوار، کامنت | 5k | برای ریلز فهرستی |
| `lib/posters/<id>.tsx` | یک پوستر | 0.8k تا 3k | فقط همان پوستر |
| `lib/kit.tsx` | قطعه‌های مشترک پوستر | 1.5k | پوستر تازه |
| `lib/three.tsx` | لایه‌ی سه‌بعدی، حروف سه‌بعدی | 1.2k | پوستر سه‌بعدی تازه |
| `lib/theme.ts` · `lib/fonts.ts` | ابعاد، گرید ضرب، فونت‌ها، easing | 2.5k | به‌ندرت |

## API
- `STYLES: { id, name, tag, fa, en, C, three?, from? }[]` · `PosterProps = { t }`.
- `Cut({ id, x, y, w, h? })` · `Sub({ id, box: [sx, sy, sw, sh], x, y, w })` · `Letters({ text, t, at, … })` · `Grain({ t, amt })` · `Halftone({ color, size, dot, angle })`.
- `ThreeLayer({ t, build, load })` · `loadFont(name)` (حروف سه‌بعدی از `type/<name>.json`).
- ثابت‌ها: `PW 720`، `PH 1280`، `POSTER_SEC 6`، گرید ریلز: `STEP 1`، `CTA_AT 20`، `HIT 24`.

## دستورهای صحنه
- **قلاب:** عنوان و اولین پوستر از فریم ۰ (فریم اول کاور هم هست).
- **فهرست:** یک اسم و یک کارت روی هر ضرب (۲ ضرب = ۱ ثانیه در ۱۲۰BPM)؛ کارت از لحظه‌ی دیدنی پوستر شروع می‌شود (`from`).
- **دیوار:** کمی قبل از جمله‌ی کامنت باز می‌شود؛ کلمه‌ی کامنت حرف‌به‌حرف روی صدا، ارسال روی «کن»، دیوار به دایرکت پرواز می‌کند و روی ضربه‌ی آخر می‌پرد.

## صدا
- موزیک ۱۲۰BPM با ضرب‌های روشن؛ اسم‌ها روی ضرب. صدای راوی پرانرژی برای اسم‌ها (هر اسم جدا، روی گرید چیده شود).
- افکت: کلیک ریز برای هر کارت، ووش برای دیوار، پاپ برای حرف‌های کامنت، ضربه‌ی آخر.

## درس‌ها
- **پوسترها زنده رندر می‌شوند:** سه پوستر سه‌بعدی‌اند؛ ریلز و برگه را با `--gl=angle --concurrency=1` رندر کن (چند WebGL هم‌زمان با concurrency بالا تایم‌اوت می‌دهد).
- **قاب پوستر داخل کارت:** `transformOrigin: "0 0"` یا `translate` صریح، وگرنه پوستر جابه‌جا و بریده دیده می‌شود.
- **`ease.outBack(0)` دقیقاً صفر نیست:** نمایش/پنهان را روی زمان گیت کن، نه روی مقدار easing.
- **کات‌اوت:** تصویر بی‌پس‌زمینه؛ اندازه‌ی اصلی را در `imgs.json` نگه دار تا `Sub` درست ببُرد.

## رندر و تحویل
- **فلگ‌ها:** `--gl=angle --concurrency=1 --timeout=240000`.
- **رندر:** `npx remotion render V01 out/v01-silent.mp4 --muted --crf=18 --gl=angle --concurrency=1` ← میکس ← `node tools/finalize.mjs <silent.mp4> <mix.wav> <outDir> <name>`.
