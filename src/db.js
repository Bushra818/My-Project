const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'worldchaos',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'worldchaos',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 8),
  queueLimit: 0,
  charset: 'utf8mb4'
});
pool.on('connection', (connection) => connection.query("SET time_zone = '+00:00'"));
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return { rows, rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows || 0, insertId: rows.insertId };
}
module.exports = { pool, query };
