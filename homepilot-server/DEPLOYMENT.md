# نشر HomePilot (Deployment)

دليل مختصر لنشر HomePilot على بيئة حقيقية، بعد التطوير المحلي.

## 1. قاعدة البيانات — MongoDB Atlas

1. أنشئ حساب مجاني على [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. أنشئ Cluster مجاني (M0)
3. من Network Access، اسمح بالوصول من عنوان IP الخاص بالسيرفر (أو `0.0.0.0/0` مؤقتًا للاختبار فقط)
4. من Database Access، أنشئ مستخدمًا بكلمة مرور
5. انسخ الـ connection string، هيكون شكله:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/homepilot
   ```
   وحطه في `MONGO_URI` بالسيرفر.

## 2. الباك إند — عن طريق Docker

```bash
cd homepilot-server
cp .env.example .env   # ثم عدّل القيم الحقيقية
docker compose up --build -d
```

هيشغّل الباك إند وقاعدة بيانات MongoDB محلية معًا. للإنتاج الحقيقي، استخدم MongoDB Atlas بدل الـ container المحلي (احذف خدمة `mongo` من `docker-compose.yml` وحط الـ `MONGO_URI` بتاع Atlas في `.env`).

### أو عن طريق Render / Railway (بدون Docker)

1. اربط الريبو بحساب [Render](https://render.com) أو [Railway](https://railway.app)
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. ضيف كل متغيرات `.env` في إعدادات الـ Environment Variables بلوحة التحكم
5. تأكد إن `CLIENT_URL` بيشاور على دومين الفرونت إند الحقيقي بعد نشره (مش localhost)

## 3. الفرونت إند

```bash
cd homepilot-client
npm install
npm run build --configuration production
```

الناتج هيكون في `dist/homepilot-client/browser` — ارفعه على أي استضافة static:

- **Vercel / Netlify**: اربط الريبو، حدد `homepilot-client` كـ root directory، وBuild command: `ng build --configuration production`، وOutput directory: `dist/homepilot-client/browser`
- **مهم**: قبل الـ build، عدّل `src/environments/environment.prod.ts` بحيث `apiUrl` يشاور على دومين الباك إند الحقيقي بعد نشره.

## 4. متغيرات بيئة الإنتاج المهمة

| المتغير | ملاحظة |
|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **لازم** تكون قيم عشوائية طويلة وسرية جديدة، مختلفة عن أي قيمة استُخدمت في التطوير |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | دومين الفرونت إند الحقيقي (بدون `/` في الآخر) |
| `MONGO_URI` | رابط Atlas الحقيقي |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | مفاتيح Live Mode وقت الإطلاق الفعلي، مش Test Mode |

## 5. Webhook الخاص بـ Stripe في الإنتاج

من لوحة Stripe: Developers → Webhooks → Add endpoint، وحط:
```
https://your-backend-domain.com/api/payments/webhook
```
انسخ الـ Signing secret الناتج وحطه في `STRIPE_WEBHOOK_SECRET`.

## 6. بعد النشر — تفعيل حساب أدمن

```bash
npm run make-admin -- someone@example.com
```
(شغّلها من نفس السيرفر أو من بيئة متصلة بنفس قاعدة البيانات)
