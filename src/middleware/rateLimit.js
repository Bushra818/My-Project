const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);

const messageLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_MESSAGES || 8),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'لقد نشرت رسائل كثيرة بسرعة كبيرة — حاول لاحقًا.' },
});

const drawingLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX_DRAWINGS || 4),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'لقد نشرت رسومات كثيرة بسرعة كبيرة — حاول لاحقًا.' },
});

const generalLimiter = rateLimit({
  windowMs: 60000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { messageLimiter, drawingLimiter, generalLimiter };
