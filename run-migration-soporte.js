require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ciclox_db',
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  try {
    const sqlPath = path.join(__dirname, 'database', 'migration_soporte_empresa.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Aplicando migración de soporte_empresa...');
    await pool.query(sql);
    console.log('✅ Migración de soporte_empresa completada con éxito.');
  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
  } finally {
    pool.end();
  }
})();
