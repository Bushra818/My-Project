const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('خطأ غير متوقع في اتصال قاعدة البيانات:', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
