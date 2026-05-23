// Scratch script to check notifications
require('dotenv').config();
const db = require('./src/config/database');

async function main() {
  try {
    const { rows } = await db.query(
      `SELECT id, usuario_id, titulo, mensaje, fecha_creacion 
       FROM notificaciones 
       ORDER BY fecha_creacion DESC 
       LIMIT 5`
    );
    console.log('NOTIFICACIONES RECIENTES:', rows);
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

main();
