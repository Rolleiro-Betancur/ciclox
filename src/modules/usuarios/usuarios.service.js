const db = require('../../config/database');

// ── Helper: crear error operacional ──────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

// ── Obtener Perfil Usuario ───────────────────────────────────────────────────
const obtenerPerfil = async (usuarioId) => {
  const { rows } = await db.query(
    `SELECT id, nombre, email, telefono, direccion, departamento, rol, fecha_registro
     FROM usuarios
     WHERE id = $1`,
    [usuarioId]
  );

  if (!rows[0]) {
    throw opError('Usuario no encontrado', 'NOT_FOUND', 404);
  }

  return rows[0];
};

// ── Actualizar Perfil Usuario ────────────────────────────────────────────────
const actualizarPerfil = async (usuarioId, data) => {
  // Construir la query dinámicamente según los campos enviados
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

  if (fields.length === 0) {
    return obtenerPerfil(usuarioId); // Nada que actualizar
  }

  values.push(usuarioId); // El ID siempre va de último
  
  const { rows } = await db.query(
    `UPDATE usuarios
     SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, nombre, email, telefono, direccion, departamento, rol`,
    values
  );

  return rows[0];
};

// ── Obtener Perfil Empresa ───────────────────────────────────────────────────
const obtenerPerfilEmpresa = async (usuarioId) => {
  const { rows } = await db.query(
    `SELECT pe.id, pe.usuario_id, pe.nombre_empresa, pe.nit, pe.logo_url, 
            pe.descripcion, pe.verificada, u.email, u.telefono, u.direccion
     FROM perfiles_empresa pe
     JOIN usuarios u ON u.id = pe.usuario_id
     WHERE pe.usuario_id = $1`,
    [usuarioId]
  );

  if (!rows[0]) {
    throw opError('Perfil de empresa no encontrado', 'NOT_FOUND', 404);
  }

  return rows[0];
};

// ── Actualizar Perfil Empresa ────────────────────────────────────────────────
const actualizarPerfilEmpresa = async (usuarioId, data) => {
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

  if (fields.length === 0) {
    return obtenerPerfilEmpresa(usuarioId);
  }

  values.push(usuarioId);
  
  const { rows } = await db.query(
    `UPDATE perfiles_empresa
     SET ${fields.join(', ')}
     WHERE usuario_id = $${idx}
     RETURNING id, usuario_id, nombre_empresa, nit, logo_url, descripcion, verificada`,
    values
  );

  if (!rows[0]) {
     throw opError('Perfil de empresa no encontrado', 'NOT_FOUND', 404);
  }

  return rows[0];
};

module.exports = {
  obtenerPerfil,
  actualizarPerfil,
  obtenerPerfilEmpresa,
  actualizarPerfilEmpresa,
};
