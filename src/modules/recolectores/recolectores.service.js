// src/modules/recolectores/recolectores.service.js
const pool = require('../../config/database');

/**
 * Obtiene todos los recolectores activos e inactivos de la empresa.
 * El filtro ?activo=true|false es opcional.
 *
 * @param {number} empresaId   - ID del usuario con rol EMPRESA (req.user.id)
 * @param {object} [filtros]
 * @param {boolean} [filtros.activo] - filtrar por activo/inactivo
 */
const listarRecolectores = async (empresaId, filtros = {}) => {
  const params = [empresaId];
  const condiciones = ['r.empresa_id = $1'];

  if (filtros.activo !== undefined) {
    params.push(filtros.activo);
    condiciones.push(`r.activo = $${params.length}`);
  }

  const where = condiciones.join(' AND ');

  const { rows } = await pool.query(
    `SELECT
       r.id::int,
       r.nombre,
       r.telefono,
       r.foto_url,
       r.calificacion_promedio,
       r.total_calificaciones,
       r.activo,
       r.fecha_registro,
       -- solicitudes activas asignadas al recolector (útil para la UI)
       COUNT(sr.id) FILTER (
         WHERE sr.estado IN ('ACEPTADA', 'EN_TRANSITO')
       )::int AS solicitudes_activas
     FROM recolectores r
     LEFT JOIN solicitudes_recoleccion sr ON sr.recolector_id = r.id
     WHERE ${where}
     GROUP BY r.id
     ORDER BY r.activo DESC, r.nombre ASC`,
    params,
  );

  return rows;
};

/**
 * Obtiene el detalle de un recolector verificando que pertenezca a la empresa.
 *
 * @param {number} id        - ID del recolector
 * @param {number} empresaId - ID del usuario con rol EMPRESA
 */
const obtenerRecolectorPorId = async (id, empresaId) => {
  const { rows } = await pool.query(
    `SELECT
       r.id::int,
       r.nombre,
       r.telefono,
       r.foto_url,
       r.calificacion_promedio,
       r.total_calificaciones,
       r.activo,
       r.fecha_registro
     FROM recolectores r
     WHERE r.id = $1 AND r.empresa_id = $2`,
    [id, empresaId],
  );

  return rows[0] || null;
};

/**
 * Crea un nuevo recolector asociado a la empresa autenticada.
 *
 * @param {number} empresaId
 * @param {{ nombre: string, telefono?: string, foto_url?: string }} datos
 */
const crearRecolector = async (empresaId, datos) => {
  const { nombre, telefono = null, foto_url = null } = datos;

  const { rows } = await pool.query(
    `INSERT INTO recolectores (empresa_id, nombre, telefono, foto_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id::int, nombre, telefono, foto_url,
               calificacion_promedio, total_calificaciones, activo, fecha_registro`,
    [empresaId, nombre, telefono, foto_url],
  );

  return rows[0];
};

/**
 * Actualiza los datos de un recolector.
 * Permite actualizar: nombre, telefono, foto_url, activo.
 *
 * @param {number} id        - ID del recolector
 * @param {number} empresaId - ID de la empresa (para autorización)
 * @param {object} datos     - Campos a actualizar
 */
const actualizarRecolector = async (id, empresaId, datos) => {
  // Construir SET dinámico para actualizar solo los campos enviados
  const campos = [];
  const valores = [];
  let idx = 1;

  if (datos.nombre !== undefined) {
    campos.push(`nombre = $${idx++}`);
    valores.push(datos.nombre);
  }
  if (datos.telefono !== undefined) {
    campos.push(`telefono = $${idx++}`);
    valores.push(datos.telefono);
  }
  if (datos.foto_url !== undefined) {
    campos.push(`foto_url = $${idx++}`);
    valores.push(datos.foto_url);
  }
  if (datos.activo !== undefined) {
    campos.push(`activo = $${idx++}`);
    valores.push(datos.activo);
  }

  if (campos.length === 0) {
    // Nada que actualizar → retornar el recolector sin tocar la BD
    return obtenerRecolectorPorId(id, empresaId);
  }

  valores.push(id);       // $n
  valores.push(empresaId); // $n+1

  const { rows } = await pool.query(
    `UPDATE recolectores
     SET ${campos.join(', ')}
     WHERE id = $${idx} AND empresa_id = $${idx + 1}
     RETURNING id::int, nombre, telefono, foto_url, calificacion_promedio,
               total_calificaciones, activo, fecha_registro`,
    valores,
  );

  return rows[0] || null;
};

/**
 * Desactiva un recolector (soft-delete → activo = false).
 * No borra el registro para conservar historial de solicitudes.
 *
 * @param {number} id        - ID del recolector
 * @param {number} empresaId - ID de la empresa
 * @returns {object|null}    - Recolector actualizado o null si no existe
 */
const desactivarRecolector = async (id, empresaId) => {
  const { rows } = await pool.query(
    `UPDATE recolectores
     SET activo = FALSE
     WHERE id = $1 AND empresa_id = $2
     RETURNING id::int, nombre, activo`,
    [id, empresaId],
  );

  return rows[0] || null;
};

/**
 * Obtiene el historial de calificaciones de un recolector.
 * Incluye paginación.
 *
 * @param {number} id        - ID del recolector
 * @param {number} empresaId
 * @param {number} page
 * @param {number} limit
 */
const listarCalificaciones = async (id, empresaId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  // Verificar que el recolector pertenece a la empresa
  const recolector = await obtenerRecolectorPorId(id, empresaId);
  if (!recolector) return null;

  const { rows: calificaciones } = await pool.query(
    `SELECT
       c.id,
       c.estrellas,
       c.comentario,
       c.fecha,
       u.nombre  AS ciudadano_nombre,
       sr.id     AS solicitud_id
     FROM calificaciones_recolector c
     JOIN usuarios u ON u.id = c.ciudadano_id
     JOIN solicitudes_recoleccion sr ON sr.id = c.solicitud_id
     WHERE c.recolector_id = $1
     ORDER BY c.fecha DESC
     LIMIT $2 OFFSET $3`,
    [id, limit, offset],
  );

  const { rows: totalRow } = await pool.query(
    `SELECT COUNT(*) AS total FROM calificaciones_recolector WHERE recolector_id = $1`,
    [id],
  );

  const total = parseInt(totalRow[0].total, 10);

  return {
    recolector,
    calificaciones,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  listarRecolectores,
  obtenerRecolectorPorId,
  crearRecolector,
  actualizarRecolector,
  desactivarRecolector,
  listarCalificaciones,
};
