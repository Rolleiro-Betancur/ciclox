// src/modules/colaboradores/colaboradores.service.js
const db           = require('../../config/database');
const { hashPassword }   = require('../../utils/bcrypt');
const { generateToken }  = require('../../utils/jwt');
const { sendMail }       = require('../../utils/mailer');
const logger             = require('../../config/logger');

// ── Helper: error operacional ─────────────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code        = code;
  err.statusCode  = statusCode;
  err.isOperational = true;
  return err;
};

// ── Registrar colaborador (lo ejecuta la EMPRESA autenticada) ─────────────────
/**
 * Crea un usuario con rol COLABORADOR y su registro en la tabla colaboradores.
 * Al finalizar envía las credenciales por email.
 *
 * @param {number} empresaId   - id del usuario EMPRESA (req.user.id)
 * @param {object} datos       - campos validados por registrarColaboradorSchema
 */
const registrarColaborador = async (empresaId, datos) => {
  const { nombre, email, contrasena, telefono, tipo_documento, numero_documento } = datos;

  // 1. Verificar email único
  const existente = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existente.rows.length > 0) {
    throw opError('El email ya está registrado', 'EMAIL_DUPLICADO', 409);
  }

  // 2. Verificar que empresaId sea efectivamente una EMPRESA
  const empresa = await db.query(
    "SELECT id FROM usuarios WHERE id = $1 AND rol = 'EMPRESA'",
    [empresaId],
  );
  if (empresa.rows.length === 0) {
    throw opError('Solo las empresas pueden registrar colaboradores', 'FORBIDDEN', 403);
  }

  // 3. Hash de contraseña
  const contrasena_hash = await hashPassword(contrasena);

  // 4. Transacción: usuario + colaboradores
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 4a. Insertar en usuarios
    const { rows: usuarioRows } = await client.query(
      `INSERT INTO usuarios (nombre, email, contrasena, telefono, rol)
       VALUES ($1, $2, $3, $4, 'COLABORADOR')
       RETURNING id, nombre, email, rol`,
      [nombre, email, contrasena_hash, telefono],
    );
    const usuario = usuarioRows[0];

    // 4b. Insertar en colaboradores
    const { rows: colabRows } = await client.query(
      `INSERT INTO colaboradores
         (usuario_id, empresa_id, tipo_documento, numero_documento)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tipo_documento, numero_documento, activo, fecha_registro`,
      [usuario.id, empresaId, tipo_documento, numero_documento],
    );
    const colaborador = colabRows[0];

    await client.query('COMMIT');

    // 5. Enviar credenciales por email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                  padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2E7D32;">¡Bienvenido/a a Ciclox, ${nombre}!</h2>
        <p>Una empresa te ha registrado como colaborador en la plataforma Ciclox.
           Aquí están tus credenciales de acceso:</p>
        <div style="background:#f5f5f5; padding:16px; border-radius:6px; margin:20px 0;">
          <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin:4px 0;"><strong>Contraseña temporal:</strong> ${contrasena}</p>
        </div>
        <p style="color:#e53935; font-size:14px;">
          ⚠️ Por seguridad, cambia tu contraseña después de tu primer inicio de sesión.
        </p>
        <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
        <p style="color:#999; font-size:12px; text-align:center;">
          Equipo Ciclox | El ciclo de la tecnología
        </p>
      </div>
    `;

    await sendMail(email, '🎉 Tus credenciales de acceso a Ciclox', htmlContent);
    logger.info(`[COLABORADOR] Nuevo colaborador registrado: ${email} por empresa ${empresaId}`);

    // 6. Generar token para que la empresa lo entregue opcionalmente
    const token = generateToken({ id: usuario.id, email: usuario.email, rol: usuario.rol });

    return { token, usuario, colaborador };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ── Listar colaboradores de la empresa ────────────────────────────────────────
/**
 * Retorna todos los colaboradores asociados a la empresa autenticada.
 */
const obtenerColaboradores = async (empresaId) => {
  const { rows } = await db.query(
    `SELECT
       c.id,
       c.tipo_documento,
       c.numero_documento,
       c.activo,
       c.fecha_registro,
       u.nombre,
       u.email,
       u.telefono
     FROM colaboradores c
     JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.empresa_id = $1
     ORDER BY c.fecha_registro DESC`,
    [empresaId],
  );
  return rows;
};

// ── Perfil del colaborador autenticado ────────────────────────────────────────
/**
 * Retorna los datos del colaborador a partir de su usuario_id (req.user.id).
 */
const obtenerPerfil = async (usuarioId) => {
  const { rows } = await db.query(
    `SELECT
       c.id,
       c.tipo_documento,
       c.numero_documento,
       c.activo,
       c.fecha_registro,
       u.nombre,
       u.email,
       u.telefono,
       emp.nombre     AS empresa_nombre,
       emp.email      AS empresa_email
     FROM colaboradores c
     JOIN usuarios u   ON u.id   = c.usuario_id
     JOIN usuarios emp ON emp.id = c.empresa_id
     WHERE c.usuario_id = $1`,
    [usuarioId],
  );

  if (rows.length === 0) {
    throw opError('Perfil de colaborador no encontrado', 'NOT_FOUND', 404);
  }

  return rows[0];
};

// ── Activar / desactivar colaborador ─────────────────────────────────────────
/**
 * Cambia el estado activo de un colaborador.
 * Solo la empresa propietaria puede hacerlo.
 *
 * @param {number} colaboradorId - id de la tabla colaboradores
 * @param {number} empresaId     - id de la empresa autenticada
 * @param {boolean} activo       - nuevo estado
 */
const toggleActivo = async (colaboradorId, empresaId, activo) => {
  // Verificar propiedad
  const { rows } = await db.query(
    'SELECT id FROM colaboradores WHERE id = $1 AND empresa_id = $2',
    [colaboradorId, empresaId],
  );

  if (rows.length === 0) {
    throw opError('Colaborador no encontrado o no pertenece a tu empresa', 'NOT_FOUND', 404);
  }

  await db.query(
    `UPDATE colaboradores
     SET activo = $1, fecha_actualizacion = NOW()
     WHERE id = $2`,
    [activo, colaboradorId],
  );

  // Sincronizar también en la tabla usuarios
  await db.query(
    'UPDATE usuarios SET activo = $1 WHERE id = (SELECT usuario_id FROM colaboradores WHERE id = $2)',
    [activo, colaboradorId],
  );

  return { message: `Colaborador ${activo ? 'activado' : 'desactivado'} correctamente` };
};

module.exports = {
  registrarColaborador,
  obtenerColaboradores,
  obtenerPerfil,
  toggleActivo,
};
