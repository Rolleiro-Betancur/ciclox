const db = require('../../config/database');

// ── Helper: crear error operacional ──────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

// ── Listar todos los puntos (Público/Usuario) ────────────────────────────────
const obtenerTodosActivos = async (ciudad) => {
  let query = `SELECT * FROM puntos_recoleccion WHERE activo = TRUE`;
  const params = [];

  if (ciudad) {
    query += ` AND ciudad ILIKE $1`;
    params.push(`%${ciudad}%`);
  }

  query += ` ORDER BY nombre ASC`;
  const { rows } = await db.query(query, params);
  return rows;
};

// ── Listar puntos de una empresa específica ──────────────────────────────────
const obtenerPorEmpresa = async (empresaId) => {
  const { rows } = await db.query(
    `SELECT * FROM puntos_recoleccion WHERE empresa_id = $1 ORDER BY fecha_creacion DESC`,
    [empresaId]
  );
  return rows;
};

// ── Obtener un punto por ID ──────────────────────────────────────────────────
const obtenerPorId = async (id) => {
  const { rows } = await db.query(
    `SELECT p.*, u.nombre as empresa_nombre 
     FROM puntos_recoleccion p
     JOIN usuarios u ON u.id = p.empresa_id
     WHERE p.id = $1`,
    [id]
  );
  
  if (!rows[0]) {
    throw opError('Punto de recolección no encontrado', 'NOT_FOUND', 404);
  }
  
  return rows[0];
};

// ── Crear Punto (Empresa) ────────────────────────────────────────────────────
const crearPunto = async (empresaId, data) => {
  const { rows } = await db.query(
    `INSERT INTO puntos_recoleccion (
      empresa_id, nombre, direccion, barrio, ciudad, 
      latitud, longitud, descripcion, horario_atencion, 
      telefono, tipos_aceptados
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      empresaId,
      data.nombre,
      data.direccion,
      data.barrio || null,
      data.ciudad,
      data.latitud,
      data.longitud,
      data.descripcion || null,
      data.horario_atencion || null,
      data.telefono || null,
      data.tipos_aceptados || null
    ]
  );
  return rows[0];
};

// ── Actualizar Punto (Empresa) ────────────────────────────────────────────────
const actualizarPunto = async (id, empresaId, data) => {
  // Verificar que el punto exista y pertenezca a la empresa
  const punto = await obtenerPorId(id);
  if (punto.empresa_id != empresaId) {
    throw opError('No tienes permiso para editar este punto', 'FORBIDDEN', 403);
  }

  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }

  if (fields.length === 0) return punto;

  values.push(id);
  const { rows } = await db.query(
    `UPDATE puntos_recoleccion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
};

// ── Eliminar Punto (Empresa - Soft Delete) ───────────────────────────────────
const eliminarPunto = async (id, empresaId) => {
  const punto = await obtenerPorId(id);
  if (punto.empresa_id != empresaId) {
    throw opError('No tienes permiso para eliminar este punto', 'FORBIDDEN', 403);
  }

  await db.query(`UPDATE puntos_recoleccion SET activo = FALSE WHERE id = $1`, [id]);
  return { message: 'Punto desactivado correctamente' };
};

module.exports = {
  obtenerTodosActivos,
  obtenerPorEmpresa,
  obtenerPorId,
  crearPunto,
  actualizarPunto,
  eliminarPunto,
};
