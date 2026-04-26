require('dotenv').config();

const { pool } = require('../src/config/database');

async function fix() {
  try {
    await pool.query('ALTER TABLE canjes ALTER COLUMN codigo_qr TYPE TEXT;');
    console.log('✅ Columna codigo_qr cambiada a TEXT');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fix();
