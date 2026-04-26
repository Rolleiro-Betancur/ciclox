// src/modules/canjes/canjes.service.js
const db = require('../../config/database');
const { generarCodigo } = require('../../utils/codigo');
const { generarQR } = require('../../utils/qr');

const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

/**
 * Canjear una recompensa. Genera QR con vigencia 30 minutos.
 */
const crearCanje = async (usuarioId, recompensaId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Verificar que la recompensa exista y esté activa
    const { rows: recRows } = await client.query(
      `SELECT id, nombre, puntos_requeridos, valor_monetario, activo
       FROM recompensas WHERE id = $1`,
      [recompensaId],
    );
    const recompensa = recRows[0];
    if (!recompensa || !recompensa.activo) {
      throw opError('Recompensa no encontrada o inactiva', 'NOT_FOUND', 404);
    }

    // 2. Verificar saldo de puntos
    const { rows: puntosRows } = await client.query(
      `SELECT saldo_actual FROM puntos_usuario WHERE usuario_id = $1`,
      [usuarioId],
    );
    const saldo = puntosRows[0] ? puntosRows[0].saldo_actual : 0;
    if (saldo < recompensa.puntos_requeridos) {
      throw opError(
        `Puntos insuficientes. Necesitas ${recompensa.puntos_requeridos}, tienes ${saldo}`,
        'PUNTOS_INSUFICIENTES',
        400,
      );
    }

    // 3. Verificar que no tenga un canje pendiente
    const { rows: pendientes } = await client.query(
      `SELECT id FROM canjes
       WHERE usuario_id = $1 AND estado = 'PENDIENTE' AND fecha_expiracion > NOW()`,
      [usuarioId],
    );
    if (pendientes.length > 0) {
      throw opError('Ya tienes un canje activo sin usar', 'CANJE_PENDIENTE', 400);
    }

    // 4. Generar código y QR
    const codigoTexto = generarCodigo(6);
    const codigoQr = await generarQR(codigoTexto);

    // 5. Crear canje (vigencia 30 minutos)
    const { rows: canjeRows } = await client.query(
      `INSERT INTO canjes (
         usuario_id, recompensa_id, puntos_usados,
         codigo_qr, codigo_texto, fecha_expiracion
       ) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 minutes')
       RETURNING id::int, puntos_usados, codigo_qr, codigo_texto,
                 estado, fecha_creacion, fecha_expiracion`,
      [usuarioId, recompensaId, recompensa.puntos_requeridos, codigoQr, codigoTexto],
    );
    const canje = canjeRows[0];

    // 6. Descontar puntos (el trigger actualiza puntos_usuario)
    await client.query(
      `INSERT INTO movimientos_puntos (usuario_id, canje_id, cantidad, tipo, descripcion)
       VALUES ($1, $2, $3, 'CANJEADO_RECOMPENSA', $4)`,
      [usuarioId, canje.id, -recompensa.puntos_requeridos, recompensa.nombre],
    );

    await client.query('COMMIT');

    return {
      id: canje.id,
      recompensa: {
        nombre: recompensa.nombre,
        valor_monetario: recompensa.valor_monetario,
      },
      puntos_usados: canje.puntos_usados,
      codigo_qr: canje.codigo_qr,
      codigo_texto: canje.codigo_texto,
      estado: canje.estado,
      fecha_expiracion: canje.fecha_expiracion,
      vigencia_minutos: 30,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Historial de canjes del usuario.
 */
const listarCanjes = async (usuarioId) => {
  const { rows } = await db.query(
    `SELECT
       c.id::int,
       json_build_object('nombre', r.nombre, 'tipo', r.tipo) AS recompensa,
       c.puntos_usados,
       c.codigo_texto,
       c.estado,
       c.fecha_creacion,
       c.fecha_uso
     FROM canjes c
     JOIN recompensas r ON r.id = c.recompensa_id
     WHERE c.usuario_id = $1
     ORDER BY c.fecha_creacion DESC`,
    [usuarioId],
  );
  return rows;
};

/**
 * Detalle de un canje (para mostrar QR activo).
 */
const obtenerCanje = async (canjeId, usuarioId) => {
  const { rows } = await db.query(
    `SELECT
       c.id::int, c.puntos_usados, c.codigo_qr, c.codigo_texto,
       c.estado, c.fecha_creacion, c.fecha_expiracion, c.fecha_uso,
       json_build_object(
         'id', r.id::int, 'nombre', r.nombre, 'tipo', r.tipo,
         'valor_monetario', r.valor_monetario, 'porcentaje_descuento', r.porcentaje_descuento
       ) AS recompensa
     FROM canjes c
     JOIN recompensas r ON r.id = c.recompensa_id
     WHERE c.id = $1 AND c.usuario_id = $2`,
    [canjeId, usuarioId],
  );

  if (!rows[0]) throw opError('Canje no encontrado', 'NOT_FOUND', 404);
  return rows[0];
};

/**
 * Confirmar canje (aliado/empresa valida el QR).
 */
const confirmarCanje = async (canjeId, codigoTexto) => {
  const { rows } = await db.query(
    `SELECT id, estado, codigo_texto, fecha_expiracion FROM canjes WHERE id = $1`,
    [canjeId],
  );
  const canje = rows[0];
  if (!canje) throw opError('Canje no encontrado', 'NOT_FOUND', 404);

  if (canje.estado !== 'PENDIENTE') {
    throw opError(`Canje en estado ${canje.estado}, no se puede confirmar`, 'ESTADO_INVALIDO', 400);
  }
  if (new Date(canje.fecha_expiracion) < new Date()) {
    await db.query(`UPDATE canjes SET estado = 'EXPIRADO' WHERE id = $1`, [canjeId]);
    throw opError('El QR ha expirado', 'CANJE_EXPIRADO', 400);
  }
  if (canje.codigo_texto !== codigoTexto) {
    throw opError('Código inválido', 'CODIGO_INVALIDO', 400);
  }

  await db.query(
    `UPDATE canjes SET estado = 'EXITOSO', fecha_uso = NOW() WHERE id = $1`,
    [canjeId],
  );

  return { estado: 'EXITOSO', message: 'Canjeo exitoso' };
};

/**
 * Rechazar canje.
 */
const rechazarCanje = async (canjeId) => {
  const { rows } = await db.query(
    `SELECT id, estado FROM canjes WHERE id = $1`,
    [canjeId],
  );
  if (!rows[0]) throw opError('Canje no encontrado', 'NOT_FOUND', 404);
  if (rows[0].estado !== 'PENDIENTE') {
    throw opError('Solo se pueden rechazar canjes PENDIENTES', 'ESTADO_INVALIDO', 400);
  }

  // Devolver puntos al usuario
  const { rows: canjeRows } = await db.query(
    `SELECT usuario_id, puntos_usados FROM canjes WHERE id = $1`,
    [canjeId],
  );

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE canjes SET estado = 'RECHAZADO' WHERE id = $1`,
      [canjeId],
    );
    // Devolver puntos
    await client.query(
      `INSERT INTO movimientos_puntos (usuario_id, canje_id, cantidad, tipo, descripcion)
       VALUES ($1, $2, $3, 'GANADO_RECICLAJE', 'Devolución por canje rechazado')`,
      [canjeRows[0].usuario_id, canjeId, canjeRows[0].puntos_usados],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { estado: 'RECHAZADO', message: 'Canjeo rechazado' };
};

module.exports = {
  crearCanje,
  listarCanjes,
  obtenerCanje,
  confirmarCanje,
  rechazarCanje,
};
