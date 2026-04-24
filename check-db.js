require('dotenv').config();
const { pool } = require('./src/config/database');

const tablas = [
  'usuarios',
  'perfiles_empresa',
  'solicitudes_recoleccion',
  'movimientos_raee',
  'puntos_usuario',
  'movimientos_puntos',
  'calificaciones_recolector',
  'reportes_ambientales',
];

(async () => {
  for (const tabla of tablas) {
    try {
      const r = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tabla]);
      console.log(`\n📋 ${tabla.toUpperCase()}:`);
      r.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
    } catch (e) {
      console.log(`  ❌ Error en ${tabla}: ${e.message}`);
    }
  }
  pool.end();
})();
