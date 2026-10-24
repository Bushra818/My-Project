const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');

// يزيل أي HTML/سكربتات من نص المستخدم — يسمح بنص عادي فقط (حماية من XSS)
function cleanText(input) {
  return sanitizeHtml(String(input || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

// هاش أحادي الاتجاه لعنوان IP — لا نخزن العنوان الحقيقي أبدًا، فقط بصمة لمنع الإساءة
function hashIp(ip) {
  const salt = process.env.JWT_SECRET || 'fallback-salt';
  return crypto.createHash('sha256').update(String(ip) + salt).digest('hex');
}

module.exports = { cleanText, hashIp };
