const { z } = require('zod');

const coord = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const messageSchema = z.object({
  text: z.string().min(1).max(500),
  category: z.enum(['عام', 'فني', 'أفكار', 'أسئلة', 'عشوائي']).default('عام'),
  isAnonymous: z.boolean().default(true),
  location: coord,
  visibility: z.enum(['public', 'unlisted']).default('public'),
  visibleAfter: z.string().datetime().optional(), // TIME CAPSULE
  replyTo: z.string().uuid().optional(),
});

const drawingPointSchema = z.object({ x: z.number(), y: z.number() });
const strokeSchema = z.object({
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  size: z.number().min(1).max(40),
  points: z.array(drawingPointSchema).min(2).max(4000),
});

const drawingSchema = z.object({
  location: coord,
  isAnonymous: z.boolean().default(true),
  mode: z.enum(['normal', 'ghost', 'live_trace']).default('normal'),
  ghostLifetimeSeconds: z.number().min(60).max(2592000).optional(), // دقيقة إلى 30 يوم
  strokes: z.array(strokeSchema).min(1).max(300),
});

const registerSchema = z.object({
  displayName: z.string().min(2).max(40),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const reportSchema = z.object({
  targetType: z.enum(['message', 'drawing']),
  targetId: z.string().uuid(),
  reason: z.string().min(3).max(300),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'بيانات غير صالحة', details: result.error.flatten() });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  validate,
  messageSchema,
  drawingSchema,
  registerSchema,
  loginSchema,
  reportSchema,
};
