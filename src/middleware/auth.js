const jwt = require('jsonwebtoken');

// يقرأ التوكن إن وجد ويضع req.user، دون إجبار تسجيل الدخول (يدعم الزوار المجهولين)
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_e) {
      req.user = null;
    }
  }
  next();
}

// يفرض تسجيل الدخول لمسارات تحتاج حسابًا فعليًا (مثل حذف المحتوى، الإشراف)
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'تسجيل الدخول مطلوب' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' });
  }
}

module.exports = { optionalAuth, requireAuth };
