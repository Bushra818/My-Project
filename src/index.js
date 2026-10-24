require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const { generalLimiter } = require('./middleware/rateLimit');
const { attachSockets } = require('./sockets');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const drawingRoutes = require('./routes/drawings');
const regionRoutes = require('./routes/regions');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const io = new Server(server, {
  cors: { origin: allowedOrigins.length ? allowedOrigins : '*', methods: ['GET', 'POST'] },
});
app.set('io', io);
attachSockets(io);

app.use(helmet());
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : '*' }));
app.use(express.json({ limit: '2mb' })); // يكفي لبيانات الرسم المتجهة
app.use(generalLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/drawings', drawingRoutes);
app.use('/api/regions', regionRoutes);

// معالج أخطاء عام — لا يسرّب تفاصيل داخلية للعميل
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم' });
});

app.use((_req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`WORLD CHAOS server يعمل على المنفذ ${port}`);
});
