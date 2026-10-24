// اختبارات أساسية تعمل دون الحاجة لاتصال حقيقي بقاعدة بيانات، للتحقق من صحة البنية
const test = require('node:test');
const assert = require('node:assert');
const { z } = require('zod');

const { messageSchema, drawingSchema } = require('../src/middleware/validate');

test('messageSchema يرفض نصًا فارغًا', () => {
  const r = messageSchema.safeParse({ text: '', location: { lat: 1, lng: 1 } });
  assert.strictEqual(r.success, false);
});

test('messageSchema يقبل رسالة صالحة بقيم افتراضية', () => {
  const r = messageSchema.safeParse({ text: 'مرحبًا بالعالم', location: { lat: 15.5, lng: 32.55 } });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.category, 'عام');
  assert.strictEqual(r.data.isAnonymous, true);
});

test('messageSchema يرفض إحداثيات خارج النطاق', () => {
  const r = messageSchema.safeParse({ text: 'test', location: { lat: 999, lng: 1 } });
  assert.strictEqual(r.success, false);
});

test('drawingSchema يتطلب نقطتين على الأقل لكل مسار', () => {
  const r = drawingSchema.safeParse({
    location: { lat: 1, lng: 1 },
    strokes: [{ color: '#17e8c9', size: 4, points: [{ x: 1, y: 1 }] }],
  });
  assert.strictEqual(r.success, false);
});

test('drawingSchema يقبل مسارًا صالحًا', () => {
  const r = drawingSchema.safeParse({
    location: { lat: 1, lng: 1 },
    strokes: [{ color: '#17e8c9', size: 4, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }],
  });
  assert.strictEqual(r.success, true);
});
