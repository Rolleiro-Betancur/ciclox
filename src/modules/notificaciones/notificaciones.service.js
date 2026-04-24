// src/modules/notificaciones/notificaciones.service.js
const db = require('../../config/database');

const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

/**
 * Listar notificaciones del usuario (paginadas).
 */
const listarNotificaciones = async (usuarioId, { leida, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const params = [usuarioId];
  let filtro = '';

  if (leida !== undefined && leida !== null) {
    params.push(leida === 'true' || leida === true);
    filtro = `AND n.leida = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT
       n.id::int,
       n.titulo,
       n.mensaje,
       n.tipo,
       n.leida,
       n.referencia_id::int,
       n.referencia_tipo,
       n.fecha_creacion
     FROM notificaciones n
     WHERE n.usuario_id = $1 ${filtro}
     ORDER BY n.fecha_creacion DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  // Contar no leídas
  const { rows: noLeidasRow } = await db.query(
    `SELECT COUNT(*) AS total_no_leidas
     FROM notificaciones
     WHERE usuario_id = $1 AND leida = FALSE`,
    [usuarioId],
  );

  return {
    rows,
    meta: {
      total_no_leidas: parseInt(noLeidasRow[0].total_no_leidas, 10),
    },
  };
};

/**
 * Marcar una notificación como leída.
 */
const marcarLeida = async (notificacionId, usuarioId) => {
  const { rows } = await db.query(
    `UPDATE notificaciones
     SET leida = TRUE, fecha_lectura = NOW()
     WHERE id = $1 AND usuario_id = $2
     RETURNING id::int, leida`,
    [notificacionId, usuarioId],
  );

  if (!rows[0]) throw opError('Notificación no encontrada', 'NOT_FOUND', 404);
  return rows[0];
};

/**
 * Marcar todas las notificaciones como leídas.
 */
const marcarTodasLeidas = async (usuarioId) => {
  const { rowCount } = await db.query(
    `UPDATE notificaciones
     SET leida = TRUE, fecha_lectura = NOW()
     WHERE usuario_id = $1 AND leida = FALSE`,
    [usuarioId],
  );

  return { message: `${rowCount} notificaciones marcadas como leídas` };
};

/**
 * Crear una notificación (uso interno por otros servicios).
 * También intenta enviar una notificación push si el usuario tiene un fcm_token.
 */
const crearNotificacion = async (datos) => {
  const {
    usuario_id, titulo, mensaje, tipo,
    referencia_id = null, referencia_tipo = null,
  } = datos;

  const { rows } = await db.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, referencia_id, referencia_tipo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id::int, titulo, tipo, fecha_creacion`,
    [usuario_id, titulo, mensaje, tipo, referencia_id, referencia_tipo],
  );

  const notificacion = rows[0];

  // Intentar enviar push notification
  try {
    const { rows: userRows } = await db.query(
      'SELECT fcm_token FROM usuarios WHERE id = $1',
      [usuario_id]
    );
    
    if (userRows[0] && userRows[0].fcm_token) {
      const { enviarPush } = require('../../utils/fcm');
      await enviarPush(userRows[0].fcm_token, {
        title: titulo,
        body: mensaje
      }, {
        tipo,
        referencia_id: String(referencia_id || ''),
        referencia_tipo: String(referencia_tipo || '')
      });
    }
  } catch (error) {
    const logger = require('../../config/logger');
    logger.error('Error al intentar enviar push notification:', error.message);
  }

  return notificacion;
};

module.exports = { listarNotificaciones, marcarLeida, marcarTodasLeidas, crearNotificacion };
