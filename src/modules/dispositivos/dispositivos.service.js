const db = require('../../config/database');

// ── Helper: crear error operacional ──────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

// ── Listar Dispositivos ──────────────────────────────────────────────────────
const obtenerDispositivos = async (ciudadanoId, { estado, tipo }) => {
  let query = `
    SELECT id, tipo, marca, modelo, serial_numero, descripcion, 
           estado_fisico, estado, foto_url, anio_fabricacion, fecha_registro
    FROM dispositivos
    WHERE ciudadano_id = $1 AND estado != 'CANCELADO'
  `;
  const params = [ciudadanoId];
  let idx = 2;

  if (estado) {
    query += ` AND estado = $${idx}`;
    params.push(estado);
    idx++;
  }
  
  if (tipo) {
    query += ` AND tipo = $${idx}`;
    params.push(tipo);
    idx++;
  }

  query += ` ORDER BY fecha_registro DESC`;

  const { rows } = await db.query(query, params);
  return rows;
};

// ── Crear Dispositivo ────────────────────────────────────────────────────────
const crearDispositivo = async (ciudadanoId, data) => {
  const { rows } = await db.query(
    `INSERT INTO dispositivos (
      ciudadano_id, tipo, marca, modelo, serial_numero, 
      descripcion, estado_fisico, foto_url, anio_fabricacion
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, tipo, marca, estado, estado_fisico`,
    [
      ciudadanoId,
      data.tipo,
      data.marca,
      data.modelo || null,
      data.serial_numero || null,
      data.descripcion || null,
      data.estado_fisico || 'ENCIENDE',
      data.foto_url || null,
      data.anio_fabricacion || 0,
    ]
  );

  return rows[0];
};

// ── Obtener Detalle de Dispositivo ───────────────────────────────────────────
const obtenerDispositivoPorId = async (id, ciudadanoId) => {
  const { rows } = await db.query(
    `SELECT * FROM dispositivos
     WHERE id = $1 AND ciudadano_id = $2`,
    [id, ciudadanoId]
  );

  if (!rows[0]) {
    throw opError('Dispositivo no encontrado o no pertenece al usuario', 'NOT_FOUND', 404);
  }

  return rows[0];
};

// ── Actualizar Dispositivo ───────────────────────────────────────────────────
const actualizarDispositivo = async (id, ciudadanoId, data) => {
  // Primero verificamos que exista y que esté en estado REGISTRADO
  const dispositivo = await obtenerDispositivoPorId(id, ciudadanoId);
  
  if (dispositivo.estado !== 'REGISTRADO') {
    throw opError('Solo se pueden editar dispositivos en estado REGISTRADO', 'BAD_REQUEST', 400);
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

  if (fields.length === 0) return dispositivo;

  // Filtramos por id y ciudadanoId para asegurar pertenencia
  values.push(id, ciudadanoId);
  
  const { rows } = await db.query(
    `UPDATE dispositivos
     SET ${fields.join(', ')}
     WHERE id = $${idx} AND ciudadano_id = $${idx + 1}
     RETURNING *`,
    values
  );

  return rows[0];
};

// ── Eliminar Dispositivo (Soft Delete) ───────────────────────────────────────
const eliminarDispositivo = async (id, ciudadanoId) => {
  const dispositivo = await obtenerDispositivoPorId(id, ciudadanoId);
  
  if (dispositivo.estado !== 'REGISTRADO') {
    throw opError('Solo se pueden eliminar dispositivos en estado REGISTRADO', 'BAD_REQUEST', 400);
  }

  // Soft Delete cambiando estado a CANCELADO
  await db.query(
    `UPDATE dispositivos SET estado = 'CANCELADO' WHERE id = $1`,
    [id]
  );

  return { message: 'Dispositivo eliminado correctamente' };
};

module.exports = {
  obtenerDispositivos,
  crearDispositivo,
  obtenerDispositivoPorId,
  actualizarDispositivo,
  eliminarDispositivo,
};
