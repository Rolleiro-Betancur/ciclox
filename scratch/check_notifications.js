require('dotenv').config();
const { pool } = require('../src/config/database');
const notificacionesService = require('../src/modules/notificaciones/notificaciones.service');

(async () => {
  try {
    const { rows: colabs } = await pool.query(
      'SELECT usuario_id FROM colaboradores WHERE activo = TRUE'
    );
    console.log("Active collaborators:", colabs);

    for (const colab of colabs) {
      console.log(`Attempting to create notification for usuario_id: ${colab.usuario_id}`);
      try {
        const notif = await notificacionesService.crearNotificacion({
          usuario_id: colab.usuario_id,
          titulo: 'Nueva solicitud disponible (TEST)',
          mensaje: `Hay una nueva solicitud de recolección en Cali (CLL 12 # 34).`,
          tipo: 'NUEVA_SOLICITUD',
          referencia_id: 1,
          referencia_tipo: 'solicitud',
        });
        console.log("Success! Created notification:", notif);
      } catch (err) {
        console.error("Error creating notification:", err);
      }
    }
  } catch (e) {
    console.error("General error:", e);
  } finally {
    pool.end();
  }
})();
