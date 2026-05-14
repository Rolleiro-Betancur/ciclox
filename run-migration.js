require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ciclox_db',
  ssl: {
    rejectUnauthorized: false
  }
});
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const sqlPath = path.join(__dirname, 'database', 'migration_colaboradores.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Aplicando migración...');
    await pool.query(sql);
    console.log('✅ Migración completada con éxito.');
  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
  } finally {
    pool.end();
  }
})();
