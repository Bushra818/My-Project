const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate, reportSchema } = require('../middleware/validate');
const { cleanText } = require('../utils/sanitize');

const router = express.Router();

// WORLD PULSE — أكثر المناطق نشاطًا، محسوبة من بيانات حقيقية عبر تجميع جغرافي شبكي
router.get('/pulse', async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        ROUND(ST_Y(location::geometry)::numeric, 0) AS grid_lat,
        ROUND(ST_X(location::geometry)::numeric, 0) AS grid_lng,
        count(*) AS activity
      FROM messages
      WHERE is_removed = false AND created_at > now() - interval '24 hours'
      GROUP BY grid_lat, grid_lng
      ORDER BY activity DESC
      LIMIT 20
    `);
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر حساب النشاط العالمي' });
  }
});

// إبلاغ عن محتوى مخالف
router.post('/report', requireAuth, validate(reportSchema), async (req, res) => {
  const { targetType, targetId, reason } = req.validated;
  try {
    await query(
      'INSERT INTO reports (target_type, target_id, reporter_user_id, reason) VALUES ($1,$2,$3,$4)',
      [targetType, targetId, req.user.sub, cleanText(reason)]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر إرسال الإبلاغ' });
  }
});

// حظر مستخدم آخر
router.post('/block/:userId', requireAuth, async (req, res) => {
  if (req.params.userId === req.user.sub) return res.status(400).json({ error: 'لا يمكنك حظر نفسك' });
  try {
    await query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.sub, req.params.userId]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر الحظر' });
  }
});

module.exports = router;
