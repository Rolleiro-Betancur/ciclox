// src/modules/reciclajes/reciclajes.service.js
const db = require('../../config/database');
const notificacionesService = require('../notificaciones/notificaciones.service');
const logger = require('../../config/logger');

const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

/**
 * Registrar proceso de reciclaje de un dispositivo.
 */
const crearReciclaje = async (empresaId, datos) => {
  const {
    dispositivo_id, metodologia, fecha_inicio,
    peso_kg = null, co2_evitado_kg = null,
    materiales_recuperados = null, residuos_peligrosos = null,
    observaciones = null,
  } = datos;

  // Verificar que el dispositivo existe y está en estado RECOLECTADO
  const { rows: devRows } = await db.query(
    `SELECT id, estado FROM dispositivos WHERE id = $1`,
    [dispositivo_id],
  );
  if (!devRows[0]) throw opError('Dispositivo no encontrado', 'NOT_FOUND', 404);
  if (!['RECOLECTADO', 'EN_RECICLAJE'].includes(devRows[0].estado)) {
    throw opError('El dispositivo debe estar RECOLECTADO para iniciar reciclaje', 'ESTADO_INVALIDO', 400);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO reciclajes (
         dispositivo_id, empresa_id, metodologia, fecha_inicio,
         peso_kg, co2_evitado_kg, materiales_recuperados,
         residuos_peligrosos, observaciones
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id::int, dispositivo_id, metodologia, estado, fecha_inicio`,
      [
        dispositivo_id, empresaId, metodologia, fecha_inicio,
        peso_kg, co2_evitado_kg, materiales_recuperados,
        residuos_peligrosos, observaciones,
      ],
    );

    // Actualizar estado del dispositivo
    await client.query(
      `UPDATE dispositivos SET estado = 'EN_RECICLAJE' WHERE id = $1`,
      [dispositivo_id],
    );

    // Registrar en trazabilidad
    await client.query(
      `INSERT INTO movimientos_raee (dispositivo_id, responsable_id, tipo, descripcion)
       VALUES ($1, $2, 'EN_RECICLAJE', $3)`,
      [dispositivo_id, empresaId, `Proceso de reciclaje iniciado — ${metodologia}`],
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Marcar reciclaje como completado.
 */
const completarReciclaje = async (reciclajeId, empresaId, datos) => {
  const { fecha_fin, certificado_url = null, numero_certificado = null } = datos;

  const { rows } = await db.query(
    `SELECT id, estado, empresa_id, dispositivo_id FROM reciclajes WHERE id = $1`,
    [reciclajeId],
  );
  const rec = rows[0];
  if (!rec) throw opError('Reciclaje no encontrado', 'NOT_FOUND', 404);
  if (Number(rec.empresa_id) !== Number(empresaId)) {
    throw opError('No autorizado', 'FORBIDDEN', 403);
  }
  if (rec.estado !== 'EN_PROCESO') {
    throw opError('El reciclaje ya fue completado', 'ESTADO_INVALIDO', 400);
  }

  const nuevoEstado = certificado_url ? 'CERTIFICADO' : 'COMPLETADO';

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: updated } = await client.query(
      `UPDATE reciclajes SET
         estado = $1, fecha_fin = $2,
         certificado_url = $3, numero_certificado = $4
       WHERE id = $5
       RETURNING id::int, estado, fecha_fin, numero_certificado`,
      [nuevoEstado, fecha_fin, certificado_url, numero_certificado, reciclajeId],
    );

    // Actualizar estado del dispositivo
    await client.query(
      `UPDATE dispositivos SET estado = 'RECICLADO' WHERE id = $1`,
      [rec.dispositivo_id],
    );

    // Registrar en trazabilidad
    await client.query(
      `INSERT INTO movimientos_raee (dispositivo_id, responsable_id, tipo, descripcion, evidencia_url)
       VALUES ($1, $2, 'RECICLADO', 'Proceso de reciclaje completado', $3)`,
      [rec.dispositivo_id, empresaId, certificado_url],
    );

    if (certificado_url) {
      await client.query(
        `INSERT INTO movimientos_raee (dispositivo_id, responsable_id, tipo, descripcion, evidencia_url)
         VALUES ($1, $2, 'CERTIFICADO_EMITIDO', $3, $4)`,
        [rec.dispositivo_id, empresaId, `Certificado ${numero_certificado || ''}`, certificado_url],
      );
    }

    await client.query('COMMIT');

    // ── Notificar al ciudadano ──
    try {
      const { rows: devRows } = await db.query(
        'SELECT ciudadano_id FROM dispositivos WHERE id = $1',
        [rec.dispositivo_id]
      );
      if (devRows[0]) {
        await notificacionesService.crearNotificacion({
          usuario_id: devRows[0].ciudadano_id,
          titulo: '¡Reciclaje completado!',
          mensaje: 'Tu dispositivo ha sido procesado exitosamente. Ya puedes descargar tu certificado.',
          tipo: 'RECICLAJE_COMPLETADO',
          referencia_id: rec.dispositivo_id,
          referencia_tipo: 'dispositivo',
        });
      }
    } catch (err) {
      logger.error('Error enviando notificación (completarReciclaje):', err.message);
    }

    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Listar reciclajes de la empresa (paginados).
 */
const listarReciclajes = async (empresaId, { estado, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const params = [empresaId];
  let filtro = '';

  if (estado) {
    params.push(estado);
    filtro = `AND r.estado = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT
       r.id::int, r.dispositivo_id::int, r.metodologia, r.estado,
       r.fecha_inicio, r.fecha_fin, r.peso_kg, r.co2_evitado_kg,
       r.materiales_recuperados, r.numero_certificado,
       d.tipo AS dispositivo_tipo, d.marca AS dispositivo_marca
     FROM reciclajes r
     JOIN dispositivos d ON d.id = r.dispositivo_id
     WHERE r.empresa_id = $1 ${filtro}
     ORDER BY r.fecha_registro DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  const { rows: totalRow } = await db.query(
    `SELECT COUNT(*) AS total FROM reciclajes r WHERE r.empresa_id = $1 ${filtro}`,
    estado ? [empresaId, estado] : [empresaId],
  );

  return { rows, total: parseInt(totalRow[0].total, 10) };
};

module.exports = { crearReciclaje, completarReciclaje, listarReciclajes };
