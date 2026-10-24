require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { pool } = require('./db');
const { generalLimiter } = require('./middleware/rateLimit');
const { attachSockets } = require('./sockets');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const drawingRoutes = require('./routes/drawings');
const regionRoutes = require('./routes/regions');
const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const io = new Server(server, { cors: { origin: allowedOrigins.length ? allowedOrigins : '*', methods: ['GET','POST'] } });
app.set('io', io); attachSockets(io);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(generalLimiter);
app.get('/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ ok:true, database:'connected', time:new Date().toISOString() }); }
  catch { res.status(503).json({ ok:false, database:'unavailable' }); }
});
app.use('/public', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/drawings', drawingRoutes);
app.use('/api/regions', regionRoutes);
app.get('/', (_req,res) => res.sendFile(path.join(__dirname, '..', 'public', 'world-chaos.html')));
app.use((err,_req,res,_next) => { console.error(err); res.status(500).json({ error:'حدث خطأ غير متوقع في الخادم' }); });
app.use((_req,res) => res.status(404).json({ error:'المسار غير موجود' }));
const port = Number(process.env.PORT || 4000);
async function start() {
  try { await pool.query('SELECT 1'); server.listen(port, () => console.log(`WORLD CHAOS / NILO يعمل على المنفذ ${port} مع MySQL`)); }
  catch (err) { console.error('فشل الاتصال بقاعدة MySQL:',err.message); process.exit(1); }
}
start();
