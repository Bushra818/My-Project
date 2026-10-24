const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');
const { cleanText } = require('../utils/sanitize');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.display_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// إنشاء حساب
router.post('/register', validate(registerSchema), async (req, res) => {
  const { displayName, email, password } = req.validated;
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'البريد الإلكتروني مستخدم مسبقًا' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (display_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, display_name, email, created_at`,
      [cleanText(displayName), email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken({ id: user.id, display_name: user.display_name }), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر إنشاء الحساب' });
  }
});

// تسجيل الدخول
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated;
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    if (user.is_banned) return res.status(403).json({ error: 'هذا الحساب محظور' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    res.json({
      token: signToken(user),
      user: { id: user.id, display_name: user.display_name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر تسجيل الدخول' });
  }
});

// دخول مجهول مؤقت (يولّد هوية مؤقتة دون بريد/كلمة مرور)
router.post('/guest', async (req, res) => {
  try {
    const name = cleanText(req.body?.displayName || 'زائر-' + Math.floor(Math.random() * 99999));
    const result = await query(
      `INSERT INTO users (display_name, is_anonymous_default) VALUES ($1, true)
       RETURNING id, display_name, created_at`,
      [name]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken({ id: user.id, display_name: user.display_name }), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'تعذر إنشاء جلسة زائر' });
  }
});

module.exports = router;
