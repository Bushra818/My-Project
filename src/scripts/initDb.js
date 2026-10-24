require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
async function main() {
 const schema = fs.readFileSync(path.join(__dirname,'..','..','sql','schema.sql'),'utf8');
 const connection = await pool.getConnection();
 try {
  const statements = schema.split(';').map(s=>s.trim()).filter(Boolean);
  for (const statement of statements) await connection.query(statement);
  console.log('تم تجهيز مخطط WORLD CHAOS على MySQL.');
 } finally { connection.release(); await pool.end(); }
}
main().catch(err=>{console.error('فشلت تهيئة MySQL:',err.message);process.exit(1)});
