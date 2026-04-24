// src/modules/recompensas/recompensas.service.js
const { pool } = require('../../config/database');

// ── Helper: crear error operacional ──────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

/**
 * Obtener la lista de recompensas disponibles (activas).
 */
const getAllRecompensas = async () => {
  const { rows } = await pool.query(
    `SELECT id, nombre, descripcion, icono_url, tipo, puntos_requeridos,
            valor_monetario, porcentaje_descuento, aliados
     FROM recompensas
     WHERE activo = TRUE
     ORDER BY puntos_requeridos ASC`
  );

  return rows.map((row) => ({
    ...row,
    id: parseInt(row.id, 10),
    puntos_requeridos: parseInt(row.puntos_requeridos, 10),
    valor_monetario: row.valor_monetario ? parseFloat(row.valor_monetario) : null,
    porcentaje_descuento: row.porcentaje_descuento ? parseInt(row.porcentaje_descuento, 10) : null,
  }));
};

/**
 * Obtener detalle de una recompensa por ID.
 */
const getRecompensaById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, nombre, descripcion, icono_url, tipo, puntos_requeridos,
            valor_monetario, porcentaje_descuento, aliados
     FROM recompensas
     WHERE id = $1 AND activo = TRUE`,
    [id]
  );

  if (rows.length === 0) {
    throw opError('La recompensa no existe o no está activa', 'NOT_FOUND', 404);
  }

  const row = rows[0];
  return {
    ...row,
    id: parseInt(row.id, 10),
    puntos_requeridos: parseInt(row.puntos_requeridos, 10),
    valor_monetario: row.valor_monetario ? parseFloat(row.valor_monetario) : null,
    porcentaje_descuento: row.porcentaje_descuento ? parseInt(row.porcentaje_descuento, 10) : null,
  };
};

module.exports = {
  getAllRecompensas,
  getRecompensaById,
};
