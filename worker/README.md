# واجهة طلبات التسعير

خدمة Cloudflare Worker تتحقق من طلبات التسعير وتحفظها في قاعدة D1، ثم تُشعر فريق المبيعات عبر Resend. بيئة التطوير المحلية لا ترسل أي بريد إلكتروني فعلي.

## المعاينة المحلية

```powershell
npm install
npm run db:migrate:local
npm run dev:api
```

شغّل جذر المشروع على `http://127.0.0.1:8000`. سيستخدم الموقع تلقائيًا واجهة API المحلية على `http://127.0.0.1:8787/api/quote`.

## إعداد بيئة الإنتاج

1. أنشئ قاعدة بيانات D1:

   ```powershell
   npx wrangler d1 create diamond-screen-quotes --location apac
   ```

2. استبدل `REPLACE_WITH_D1_DATABASE_ID` داخل `wrangler.toml` بمعرّف قاعدة البيانات الناتج.
3. وثّق `diamondscreen.com.sa` كنطاق إرسال في Resend، ثم أضف القيم السرية:

   ```powershell
   npx wrangler secret put RESEND_API_KEY --env production --config worker/wrangler.toml
   npx wrangler secret put IP_HASH_SALT --env production --config worker/wrangler.toml
   ```

4. طبّق ترحيل قاعدة البيانات ثم انشر الخدمة:

   ```powershell
   npx wrangler d1 migrations apply DB --remote --env production --config worker/wrangler.toml
   npx wrangler deploy --env production --config worker/wrangler.toml
   ```

5. اربط خدمة Cloudflare Worker بالنطاق `api.diamondscreen.com.sa`، وهو عنوان الخدمة المحدد في بيانات الموقع.

تُرسل إشعارات الإنتاج من `leads@diamondscreen.com.sa` إلى `info@diamondscreen.sa`. يمكن تغيير `EMAIL_FROM` أو `EMAIL_TO` داخل `wrangler.toml` عند الحاجة.

---

# Quote API

Cloudflare Worker that validates and stores quote requests in D1, then notifies the sales team through Resend. Local development never sends email.

## Local preview

```powershell
npm install
npm run db:migrate:local
npm run dev:api
```

Serve the repository root on `http://127.0.0.1:8000`. The website automatically uses the local API at `http://127.0.0.1:8787/api/quote`.

## Production setup

1. Create the D1 database:

   ```powershell
   npx wrangler d1 create diamond-screen-quotes --location apac
   ```

2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with the returned database ID.
3. Verify `diamondscreen.com.sa` as a sending domain in Resend, then add the secrets:

   ```powershell
   npx wrangler secret put RESEND_API_KEY --env production --config worker/wrangler.toml
   npx wrangler secret put IP_HASH_SALT --env production --config worker/wrangler.toml
   ```

4. Apply the database migration and deploy:

   ```powershell
   npx wrangler d1 migrations apply DB --remote --env production --config worker/wrangler.toml
   npx wrangler deploy --env production --config worker/wrangler.toml
   ```

5. Attach the Worker to `api.diamondscreen.com.sa`, which is the endpoint configured in the website metadata.

Production notifications are sent from `leads@diamondscreen.com.sa` to `info@diamondscreen.sa`. Change `EMAIL_FROM` or `EMAIL_TO` in `wrangler.toml` if needed.
