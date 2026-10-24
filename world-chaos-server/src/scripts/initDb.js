require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function main() {
  const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('تهيئة قاعدة البيانات…');
  await pool.query(sql);
  console.log('تم إنشاء الجداول بنجاح.');
  await pool.end();
}

main().catch((err) => {
  console.error('فشلت تهيئة قاعدة البيانات:', err);
  process.exit(1);
});
