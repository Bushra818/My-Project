# WORLD CHAOS — الخادم الخلفي

خادم Node.js (Express + Socket.IO + PostgreSQL/PostGIS) يوفّر:
- نشر واسترجاع رسائل جغرافية (GeoChat) مع تحميل حسب المنطقة والتصفح التدريجي.
- حفظ رسومات جغرافية متجهة (WORLD CANVAS)، بما فيها وضع GHOST INK (تلاشٍ تدريجي) وبثّ LIVE TRACE لحظيًا.
- حسابات حقيقية + دخول مجهول (Guest)، مع JWT.
- حدود إغراق (Rate limiting)، تعقيم كامل للمدخلات (حماية XSS)، تحقق صارم عبر zod.
- WORLD PULSE: حساب المناطق الأكثر نشاطًا من بيانات حقيقية.
- إبلاغ وحظر بين المستخدمين.

## 1. المتطلبات
- Node.js 18 أو أحدث
- PostgreSQL 14+ مع امتداد PostGIS (أو Docker)

## 2. الإعداد المحلي

```bash
npm install
cp .env.example .env
# افتح .env وعدّل القيم، خاصة JWT_SECRET و DATABASE_URL
```

تشغيل قاعدة بيانات PostGIS سريعًا عبر Docker:

```bash
docker compose up -d
```

تهيئة الجداول:

```bash
npm run db:init
```

تشغيل الخادم:

```bash
npm run dev      # مع إعادة تشغيل تلقائية
# أو
npm start
```

الخادم يعمل افتراضيًا على `http://localhost:4000`. تحقق من الصحة عبر `GET /health`.

## 3. ربط الواجهة الأمامية (صفحة world-chaos.html)

الصفحة التجريبية التي بنيناها في المحادثة تعمل محليًا بالكامل (localStorage). لربطها بهذا الخادم الحقيقي، استبدل دوال التخزين المحلي بطلبات `fetch` إلى:

- `GET /api/messages?lat=..&lng=..&radiusKm=..` — الرسائل القريبة
- `POST /api/messages` — نشر رسالة `{ text, category, isAnonymous, location:{lat,lng} }`
- `GET /api/drawings?lat=..&lng=..` — الرسومات القريبة
- `POST /api/drawings` — حفظ رسم `{ location, isAnonymous, mode, strokes:[{color,size,points}] }`
- `POST /api/auth/guest` — جلسة زائر سريعة، يرجع `token` لاستخدامه في ترويسة `Authorization: Bearer <token>`
- اتصال Socket.IO على نفس عنوان الخادم للاستماع لـ `message:new` و `drawing:new` و `presence:count`

## 4. أهم مسارات API

| المسار | الطريقة | الوصف |
|---|---|---|
| `/api/auth/register` | POST | إنشاء حساب `{displayName,email,password}` |
| `/api/auth/login` | POST | تسجيل الدخول `{email,password}` |
| `/api/auth/guest` | POST | دخول مجهول مؤقت |
| `/api/messages` | GET/POST | جلب/نشر الرسائل الجغرافية |
| `/api/messages/random` | GET | رسالة عشوائية (DISCOVERY PORTAL) |
| `/api/messages/:id/react` | POST | تفاعل مع رسالة |
| `/api/messages/:id` | DELETE | حذف رسالتك (يتطلب تسجيل دخول) |
| `/api/drawings` | GET/POST | جلب/حفظ الرسومات الجغرافية |
| `/api/regions/pulse` | GET | المناطق الأكثر نشاطًا (WORLD PULSE) |
| `/api/regions/report` | POST | إبلاغ عن محتوى |
| `/api/regions/block/:userId` | POST | حظر مستخدم |

## 5. الاختبارات

```bash
npm test
```

تغطي الاختبارات تحقق صحة مخططات الإدخال (الرسائل والرسومات) دون الحاجة لقاعدة بيانات فعلية.

## 6. النشر إلى الإنتاج

- اختر استضافة تدعم عمليات Node.js دائمة التشغيل (Railway, Render, Fly.io, VPS عادي) — تجنّب الاستضافات "serverless" فقط لأن Socket.IO يحتاج اتصالًا مستمرًا.
- فعّل HTTPS عبر الاستضافة أو Reverse proxy (Nginx + Let's Encrypt).
- اضبط `CORS_ORIGINS` على نطاق الواجهة الأمامية الحقيقي فقط.
- لا تضع `.env` في Git؛ استخدم متغيرات بيئة الاستضافة مباشرة.
- أضف نسخًا احتياطية دورية لقاعدة البيانات (الرسائل والرسومات بيانات المستخدمين الأساسية).
- راقب السجلات (logs) لرصد محاولات الإغراق أو الإساءة رغم حدود Rate limiting المطبّقة.

## 7. ملاحظات أمان مطبّقة فعليًا في الكود

- لا يُخزَّن عنوان IP الحقيقي أبدًا — فقط هاش أحادي الاتجاه (`client_ip_hash`) لأغراض مكافحة الإساءة.
- كل نص مستخدم يمر عبر `sanitize-html` قبل التخزين (حماية XSS).
- كلمات المرور مُشفّرة بـ bcrypt (12 جولة).
- حدود الإغراق منفصلة للرسائل والرسومات، وقابلة للتعديل عبر `.env`.
- الحذف يتحقق من ملكية المحتوى قبل التنفيذ.
- JWT بمفتاح سري يجب تغييره إلزاميًا قبل الإنتاج (موجود في `.env.example` كقيمة وهمية فقط).
