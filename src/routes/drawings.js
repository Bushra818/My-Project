const express = require('express');
const { query } = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { drawingLimiter } = require('../middleware/rateLimit');
const { validate, drawingSchema } = require('../middleware/validate');

const router = express.Router();

function rowToDrawing(r) {
  const createdAt = new Date(r.created_at);
  let fadeOpacity = 1;
  if (r.mode === 'ghost' && r.ghost_lifetime_seconds) {
    const ageSec = (Date.now() - createdAt.getTime()) / 1000;
    fadeOpacity = Math.max(0, 1 - ageSec / r.ghost_lifetime_seconds);
  }
  return {
    id: r.id,
    isAnonymous: r.is_anonymous,
    lat: r.lat,
    lng: r.lng,
    mode: r.mode,
    strokes: r.vector_data,
    ghostLifetimeSeconds: r.ghost_lifetime_seconds,
    fadeOpacity,
    createdAt: r.created_at,
  };
}

// جلب الرسومات القريبة من موقع (محمّلة حسب المنطقة لتفادي تحميل العالم كله)
router.get('/', optionalAuth, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = Math.min(parseFloat(req.query.radiusKm) || 500, 20000);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 150);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'يجب تمرير lat و lng صالحين' });
  }
  try {
    const result = await query(
      `SELECT id, is_anonymous, mode, vector_data, ghost_lifetime_seconds, created_at,
              ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
       FROM drawings
       WHERE is_removed = false
         AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
       ORDER BY created_at DESC LIMIT $4`,
      [lng, lat, radiusKm * 1000, limit]
    );
    const items = result.rows
      .map(rowToDrawing)
      .filter((d) => d.mode !== 'ghost' || d.fadeOpacity > 0.02); // أخفِ ما تلاشى كليًا
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر جلب الرسومات' });
  }
});

// حفظ رسم جغرافي جديد كبيانات متجهة (ليس صورة ثابتة)
router.post('/', optionalAuth, drawingLimiter, validate(drawingSchema), async (req, res) => {
  const { location, isAnonymous, mode, ghostLifetimeSeconds, strokes } = req.validated;
  try {
    const result = await query(
      `INSERT INTO drawings (user_id, is_anonymous, location, vector_data, mode, ghost_lifetime_seconds)
       VALUES ($1,$2, ST_SetSRID(ST_MakePoint($3,$4),4326)::geography, $5,$6,$7)
       RETURNING id, is_anonymous, mode, vector_data, ghost_lifetime_seconds, created_at,
                 ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng`,
      [
        req.user?.sub || null,
        isAnonymous,
        location.lng,
        location.lat,
        JSON.stringify(strokes),
        mode,
        ghostLifetimeSeconds || null,
      ]
    );
    const drawing = rowToDrawing(result.rows[0]);
    req.app.get('io')?.emit('drawing:new', drawing); // لدعم LIVE TRACE بين المستخدمين
    res.status(201).json(drawing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر حفظ الرسم' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'UPDATE drawings SET is_removed = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.sub]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'غير موجود أو لا تملك صلاحية حذفه' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر حذف الرسم' });
  }
});

module.exports = router;
