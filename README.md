# WORLD CHAOS — NILO

منصة خريطة اجتماعية تتيح نشر رسائل ورسم آثار جغرافية. المشروع مبني على Node.js وExpress وSocket.IO وMySQL 8.

## تشغيل محلي
1. تحتاج Node.js 18+ وDocker.
2. انسخ `.env.example` إلى `.env` وغيّر كلمات المرور وJWT_SECRET.
3. شغّل `docker compose up -d` لتشغيل MySQL.
4. شغّل `npm install`.
5. شغّل `npm run db:init`.
6. شغّل `npm start` وافتح `http://localhost:4000`.

## الخريطة
- الصفحة الرئيسية من `public/world-chaos.html`.
- العالم لا يلتف بلا نهاية: `noWrap` وحدود جغرافية ثابتة.
- تصميم الخريطة مبسّط باستخدام طبقة CARTO داكنة خفيفة.
- تحميل الرسائل والرسومات مؤجل حتى استقرار تحريك الخريطة، ويُقيّد بنطاق الإحداثيات حول مركز العرض وحد أقصى للنتائج.
- عند النقر على الخريطة تظهر خيارات كتابة رسالة أو رسم مسار.
- الرسائل والرسومات تُحفظ في MySQL، والرسم يخزن كبيانات متجهة JSON لا كصورة.
- Socket.IO متوفر لدعم ميزات الوقت الحقيقي.

## متغيرات البيئة
راجع `.env.example`. لا ترفع `.env` أو أسرارًا إلى GitHub.

## API
- `GET /health`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/guest`
- `GET/POST /api/messages`
- `GET/POST /api/drawings`
- `GET /api/messages/random`
- `GET /api/regions/pulse`

ملاحظة: واجهات الرسائل والرسومات والحسابات تستخدم MySQL 8؛ مخطط البيانات في `sql/schema.sql`.
