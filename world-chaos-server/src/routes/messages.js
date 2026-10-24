const express = require('express');
const { query } = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimit');
const { validate, messageSchema } = require('../middleware/validate');
const { cleanText, hashIp } = require('../utils/sanitize');

const router = express.Router();

function rowToMessage(r) {
  return {
    id: r.id,
    text: r.text,
    category: r.category,
    isAnonymous: r.is_anonymous,
    author: r.is_anonymous ? null : r.display_name || null,
    lat: r.lat,
    lng: r.lng,
    reactionCount: r.reaction_count,
    replyCount: r.reply_count,
    replyTo: r.reply_to,
    createdAt: r.created_at,
  };
}

// جلب الرسائل القريبة من إحداثيات معينة، مع دعم التصفح التدريجي ومستوى التقريب
// GET /api/messages?lat=..&lng=..&radiusKm=..&category=..&limit=..&cursor=..
router.get('/', optionalAuth, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = Math.min(parseFloat(req.query.radiusKm) || 500, 20000);
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const category = req.query.category;
  const cursor = req.query.cursor; // created_at ISO سابق، للتحميل التدريجي

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'يجب تمرير lat و lng صالحين' });
  }

  const params = [lng, lat, radiusKm * 1000];
  let where = `is_removed = false AND (visible_after IS NULL OR visible_after <= now())
    AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)`;
  if (category) { params.push(category); where += ` AND category = $${params.length}`; }
  if (cursor) { params.push(cursor); where += ` AND m.created_at < $${params.length}`; }
  params.push(limit);

  try {
    const sql = `
      SELECT m.id, m.text, m.category, m.is_anonymous, m.reaction_count, m.reply_count,
             m.reply_to, m.created_at, u.display_name,
             ST_Y(m.location::geometry) AS lat, ST_X(m.location::geometry) AS lng
      FROM messages m LEFT JOIN users u ON u.id = m.user_id
      WHERE ${where}
      ORDER BY m.created_at DESC
      LIMIT $${params.length}`;
    const result = await query(sql, params);
    const items = result.rows.map(rowToMessage);
    res.json({
      items,
      nextCursor: items.length === limit ? items[items.length - 1].createdAt : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر جلب الرسائل' });
  }
});

// رسالة عشوائية من أي مكان في العالم (DISCOVERY PORTAL)
router.get('/random', optionalAuth, async (_req, res) => {
  try {
    const result = await query(
      `SELECT m.id, m.text, m.category, m.is_anonymous, m.reaction_count, m.reply_count,
              m.reply_to, m.created_at, u.display_name,
              ST_Y(m.location::geometry) AS lat, ST_X(m.location::geometry) AS lng
       FROM messages m LEFT JOIN users u ON u.id = m.user_id
       WHERE m.is_removed = false AND (m.visible_after IS NULL OR m.visible_after <= now())
       OFFSET floor(random() * GREATEST((SELECT count(*) FROM messages WHERE is_removed=false),1))
       LIMIT 1`
    );
    if (!result.rowCount) return res.status(404).json({ error: 'لا توجد رسائل بعد' });
    res.json(rowToMessage(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر جلب رسالة عشوائية' });
  }
});

// نشر رسالة جديدة
router.post('/', optionalAuth, messageLimiter, validate(messageSchema), async (req, res) => {
  const { text, category, isAnonymous, location, visibility, visibleAfter, replyTo } = req.validated;
  const clean = cleanText(text);
  if (!clean) return res.status(400).json({ error: 'نص الرسالة فارغ بعد التعقيم' });

  const ipHash = hashIp(req.ip);
  try {
    const result = await query(
      `INSERT INTO messages (user_id, is_anonymous, text, category, location, visibility, visible_after, reply_to, client_ip_hash)
       VALUES ($1,$2,$3,$4, ST_SetSRID(ST_MakePoint($5,$6),4326)::geography, $7,$8,$9,$10)
       RETURNING id, text, category, is_anonymous, reaction_count, reply_count, reply_to, created_at,
                 ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng`,
      [
        req.user?.sub || null,
        isAnonymous,
        clean,
        category,
        location.lng,
        location.lat,
        visibility,
        visibleAfter || null,
        replyTo || null,
        ipHash,
      ]
    );
    if (replyTo) {
      await query('UPDATE messages SET reply_count = reply_count + 1 WHERE id = $1', [replyTo]);
    }
    const msg = rowToMessage(result.rows[0]);
    req.app.get('io')?.emit('message:new', msg); // بث فوري لكل العملاء المتصلين
    res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر نشر الرسالة' });
  }
});

// تفاعل (إعجاب) على رسالة — يدعم المجهولين ببصمة بسيطة من رأس الطلب
router.post('/:id/react', optionalAuth, async (req, res) => {
  const anonKey = req.user ? null : (req.headers['x-anon-key'] || req.ip);
  try {
    await query(
      `INSERT INTO reactions (message_id, user_id, anon_key) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [req.params.id, req.user?.sub || null, req.user ? null : String(anonKey)]
    );
    const result = await query(
      'UPDATE messages SET reaction_count = reaction_count + 1 WHERE id = $1 RETURNING reaction_count',
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'الرسالة غير موجودة' });
    res.json({ reactionCount: result.rows[0].reaction_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر تسجيل التفاعل' });
  }
});

// حذف رسالة — فقط صاحبها
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'UPDATE messages SET is_removed = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.sub]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'غير موجودة أو لا تملك صلاحية حذفها' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر حذف الرسالة' });
  }
});

module.exports = router;
