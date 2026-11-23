# Shader Transitions · «ترنزیشن‌های شیدری» (دوازده گذر GLSL بین دو تصویر: گرداب، سوختن، گلیچ، لنز گرانشی، زوم سینمایی…)
**وضعیت:** ✅ کد آماده در Remotion (WebGL ساده) · `src/styles/shader-transitions/` · برگرفته از `@hyperframes/shader-transitions` (Apache-2.0، © 2026 HeyGen؛ متن مجوز: `LICENSE-Apache-2.0.txt`)
- `Style-ShaderTransitions` · عمودی 1080×1920، ۳۰fps، ۲۰ ثانیه (بی‌صدا): هفت عکس ناسا، دوازده ترنزیشن پشت‌سرهم، اسم هر کدام روی یک چیپ
- `Style-ShaderTransitions-Look` · props `{ times }` (پیش‌فرض: وسط هر ترنزیشن)

**مرجع:** کانتکت‌شیت `styles/previews/shader-transitions.jpg`.
**اسم‌های صدازدن:** «ترنزیشن شیدری»، «گذر گلیچ»، «گذر گرداب»، «ترنزیشن سینمایی».

## کی بزنیمش
- **گذر بین عکس‌ها یا فریم‌ها** در ریلز، اسلایدشو، معرفی محصول، پرتفولیو؛ روی ضرب آهنگ.
- **ورودی‌ها:** چند عکس (یا فریم‌هایی که با ffmpeg از کلیپ‌ها گرفته‌ای)، ضرب‌ها، انتخاب ترنزیشن.
- **کی نه:** گذر بین دو ویدیوی در حال پخش ← `@remotion/transitions` (fade، slide، wipe)؛ این سبک تصویر ثابت می‌گیرد.

## ظاهر
- **دوازده شیدر** (`lib/shaders.ts`): `domain-warp`، `ridged-burn`، `whip-pan`، `sdf-iris`، `ripple-waves`، `gravitational-lens`، `cinematic-zoom`، `chromatic-split`، `glitch`، `swirl-vortex`، `thermal-distortion`، `cross-warp-morph`.
- **رنگ لبه‌ها:** سه رنگ (`accent`: اصلی، تیره، روشن) در سوختن، لنز و پیچش؛ پیش‌فرض نارنجی و کهربایی.
- **صحنه** (`lib/ShaderStage.tsx`): عکس‌ها یک بار cover-fit و به بافت تبدیل می‌شوند؛ هر فریم یک لحظه کشیده می‌شود (`a`، `b`، `p`، `shader`).

## شروع سریع
1. **عکس‌ها:** در `public/<پوشه>/`؛ فهرست `slides: [{ src, focus }]` (`focus` نقطه‌ی مهم عکس، ۰ تا ۱).
2. **زمان:** برای هر گذر `p` از ۰ تا ۱ (با ease)؛ نمونه در `demo/Video.tsx` (نگه‌داشتن ۰.۸۵ ثانیه، گذر ۰.۷۵ ثانیه). گذر را روی ضرب آهنگ بگذار.
3. **در صحنه‌ی خودت:** `<ShaderStage slides={…} a={i} b={i + 1} p={p} shader="glitch" />` زیر لایه‌های متن.
4. **فریم‌ها:** `npx remotion render Style-ShaderTransitions-Look out/look --sequence --image-format=jpeg --scale=0.5 --gl=angle --concurrency=1`.

## نقشه‌ی کد
| فایل | چی | ~توکن | کی بازش کنم |
|---|---|---|---|
| `demo/Video.tsx` | فهرست عکس‌ها، زمان‌بندی، چیپ اسم | 1k | همیشه |
| `lib/ShaderStage.tsx` | صحنه‌ی WebGL | 1.8k | به‌ندرت |
| `lib/shaders.ts` | متن GLSL دوازده شیدر | 3.5k | فقط برای عوض کردن یک شیدر |

## دستورهای صحنه
- **یک یا دو نوع ترنزیشن در یک ویدیو** کافی است؛ دوازده‌تا پشت‌سرهم فقط برای نمایش است.
- **گذر تند (۰.۴ تا ۰.۸ ثانیه) روی ضرب؛** گذر کند شبیه اسلایدشو می‌شود.
- **سوختن و گرداب** برای لحظه‌ی اوج؛ **whip-pan و cinematic-zoom** برای ریتم معمولی.

## صدا
- برای هر گذر یک ووش یا گلیچ کوتاه (`tools/sfx-lib.mjs`)، ۱۲ تا ۱۸ دسی‌بل زیر صدا.

## درس‌ها
- **flash-through-white و light-leak** حذف شدند: فلاش سفید و نشت نور ارزان دیده می‌شوند.
- **رندر WebGL:** `--gl=angle --concurrency=1`؛ بوم با `preserveDrawingBuffer` تا اسکرین‌شات خالی نشود.
- **تصویرهای هم‌اندازه:** همه به اندازه‌ی کادر cover-fit می‌شوند، پس نسبت تصویر مهم نیست؛ فقط `focus` را درست بده.

## رندر و تحویل
- **رندر:** `npx remotion render Style-ShaderTransitions out/silent.mp4 --muted --crf=18 --gl=angle --concurrency=1`.
- **مجوز:** Apache-2.0؛ تغییرها در سر `lib/shaders.ts` نوشته شده‌اند. متن کامل مجوز کنار کد است و در کیت هم می‌ماند.
