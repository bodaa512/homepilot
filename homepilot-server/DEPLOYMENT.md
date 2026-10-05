# نشر HomePilot (Deployment)

الطريقة دي كلها **مجانية**: داتابيز على **MongoDB Atlas**، السيرفر على **Render**، والواجهة على **Vercel**.

```
المتصفح ──▶ Vercel (الواجهة)
               │  أي طلب يبدأ بـ /api
               ▼
            Render (السيرفر)  ──▶  MongoDB Atlas
```

الواجهة بتبعت طلبات `/api` لنفس دومينها، وVercel هو اللي بيحوّلها للسيرفر (ملف `homepilot-client/vercel.json`).
ده بيخلّي كوكي تسجيل الدخول (`SameSite=Strict`) يشتغل صح، ومفيش مشاكل CORS.

## الترتيب مهم
1. Atlas ← 2. Render ← 3. تعديل `vercel.json` ← 4. Vercel ← 5. ارجع لـ Render وظبّط `CLIENT_URL`.

## 1. الداتابيز — MongoDB Atlas
1. اعمل حساب على [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) وأنشئ Cluster مجاني (M0). اختار منطقة قريبة (مثلًا Frankfurt).
2. **Database Access** ← Add New Database User ← اسم وكلمة مرور (حروف وأرقام بس، من غير رموز).
3. **Network Access** ← Add IP Address ← `0.0.0.0/0` (لازم، لأن عناوين Render المجاني بتتغيّر).
4. **Connect** ← Drivers ← انسخ الرابط، واستبدل `<password>` بكلمة المرور، وحط `/homepilot` قبل علامة `?`:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/homepilot?retryWrites=true&w=majority
   ```

## 2. السيرفر — Render
New ← **Web Service** ← اربط الريبو، وبعدين:

| الخانة | القيمة |
|---|---|
| Root Directory | `homepilot-server` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

> ⚠️ لازم `--include=dev`: لأن `NODE_ENV=production` بيخلّي npm يتخطى TypeScript، والبناء يفشل من غيره.

**Environment Variables:**

| المتغير | القيمة |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `MONGO_URI` | رابط Atlas من الخطوة 1 |
| `JWT_SECRET` | قيمة عشوائية طويلة جديدة (تحت) |
| `JWT_REFRESH_SECRET` | قيمة عشوائية طويلة **مختلفة** |
| `TRUST_PROXY` | `2` |
| `CLIENT_URL` | مؤقتًا `https://temp.vercel.app`، وتتعدّل في الخطوة 5 |

لتوليد قيمة عشوائية (شغّلها مرتين):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

بعد النشر هتلاقي رابط زي `https://homepilot-api.onrender.com`. اتأكد إن `https://.../api/health` بيرد `{"status":"ok"}`.

**اختياري (مفيد):**
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`: على Render المجاني الملفات المرفوعة بتتمسح مع كل إعادة تشغيل، فـ Cloudinary (مجاني) بيحفظها فعلًا.
- `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM`: من غيرهم مفيش إيميلات (تفعيل ونسيت كلمة المرور مش هتوصل).
- `AI_API_KEY`: **سيبه فاضي** في النسخة العامة، لأن أي زائر هيقدر يصرف من رصيدك. لو عاوزه، استخدم مفتاح جديد وحط له حد صرف أقصى من لوحة Anthropic.
- `STRIPE_*`: سيبهم فاضيين في الديمو (الدفع هيرد «مش متظبّط»).

## 3. اربط الواجهة بالسيرفر
افتح `homepilot-client/vercel.json` وغيّر `CHANGE-ME.onrender.com` لرابط السيرفر من Render (من غير `https://`)، واحفظ ثم ارفع التعديل لـ GitHub.

## 4. الواجهة — Vercel
Add New ← **Project** ← اختار الريبو:

| الخانة | القيمة |
|---|---|
| Root Directory | `homepilot-client` |
| Framework Preset | Angular (بيتعرّف لوحده) |

ومن **Settings ← General ← Node.js Version** اختار أعلى نسخة متاحة (24.x)، لأن Angular 22 محتاج Node 22.22.3 أو أحدث.
لو Vercel ماعرفش مكان الناتج: Output Directory = `dist/homepilot-client/browser`.

## 5. أكمل الدايرة
ارجع Render ← Environment ← غيّر `CLIENT_URL` لرابط Vercel الحقيقي (من غير `/` في الآخر). السيرفر هيعيد التشغيل لوحده.

## تأكد إنه شغّال
1. افتح `https://رابط-vercel/api/health`: لازم يرد `{"status":"ok"}` (يثبت إن التحويل شغّال).
2. سجّل حساب، وادخل، واعمل **Refresh** للصفحة: لازم تفضل داخل.

## ملاحظات على الاستضافة المجانية
- **Render بينام** بعد 15 دقيقة من غير استخدام، وأول طلب بعدها بياخد حوالي دقيقة. حل مجاني: موقع [uptimerobot.com](https://uptimerobot.com) ← New Monitor ← HTTP(s) ← الرابط `https://رابط-render/api/health` ← كل 5 دقايق.
- كل تعديل بتعمله وترفعه على GitHub، Render وVercel بينشروه تلقائيًا.

## أدمن وباقات (من نفس بيئة الداتابيز)
```bash
npm run make-admin -- someone@example.com
npm run set-plan -- someone@example.com premium
```

## Docker (اختياري)
```bash
cd homepilot-server
cp .env.example .env
docker compose up --build -d
```
