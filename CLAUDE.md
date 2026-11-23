# نصب کیت NFP-Alvana (فقط جلسه‌ی اول)

*نسخه‌ی اختصاصی هامون صداقت · 0911•••6535 · 223EF8B0*

این ریپو تازه ساخته شده است. کیت ساخت ویدیو در پنج فایل zip کنار همین فایل آپلود شده: `NFP-Alvana-Mobile-1-of-5.zip` تا `5-of-5`. هر کدام بخشی از کیت است و همه با هم در یک پوشه باز می‌شوند.
- کاربر از گوشی کار می‌کند. با او فارسی، خودمانی و کوتاه حرف بزن.
- با اولین پیام کاربر (مثلاً «راه‌اندازی کن»)، این کارها را پشت سر هم انجام بده:

1. **باز کردن کیت:**
   ```
   ls NFP-Alvana-Mobile-*-of-*.zip   # اگر یکی کم است (مثلاً 2-of-5)، به کاربر بگو کدام را آپلود نکرده و صبر کن
   rm -rf /tmp/kit && mkdir -p /tmp/kit
   for z in NFP-Alvana-Mobile-*-of-*.zip; do unzip -q -o "$z" -d /tmp/kit || python3 -m zipfile -e "$z" /tmp/kit; done
   cp -a /tmp/kit/nfp-alvana-mobile/. .
   ```
   - این دستور همین `CLAUDE.md` را با `CLAUDE.md` اصلی کیت جایگزین می‌کند.
   - بعدش `CLAUDE.md` تازه را بخوان، همچنین `.claude/skills/nfp-alvana/SETUP-CLOUD.md`.
2. **پاک کردن zipها:** `git rm -q --cached NFP-Alvana-Mobile-*-of-*.zip ; rm -f NFP-Alvana-Mobile-*-of-*.zip`
3. **نصب ابزارها:** `NFP_FORCE_SETUP=1 bash scripts/cloud-setup.sh`. چند دقیقه طول می‌کشد. بعد `node tools/cloud-doctor.mjs` را بزن.
4. **ذخیره روی main:**
   ```
   git add -A && git commit -q -m "NFP-Alvana kit installed" && git push origin HEAD:main
   ```
   - اگر push به main رد شد، شاخه را push کن.
   - بعد با `gh api repos/<owner>/<repo>/pulls -f title=... -f head=<branch> -f base=main` یک PR بساز.
   - با `gh api -X PUT repos/<owner>/<repo>/pulls/<n>/merge` آن را merge کن.
5. **اگر پیام اول کاربر درخواست ویدیو بود** (نه فقط «راه‌اندازی کن»)، بعد از نصب بلافاصله همان را طبق `CLAUDE.md` تازه انجام بده و آخرش گزارش نصب و لینک ویدیو را با هم بده.
6. **گزارش کوتاه به کاربر:**
   - چه آماده است.
   - چه کم است، با راهنمای ساده از روی گزارش doctor. مثلاً کلید ElevenLabs در Network secrets.
   - یک پیام نمونه برای اولین ویدیو.
   - یادآوری کن که برای هر ویدیو یک جلسه‌ی تازه روی همین ریپو باز کند.
