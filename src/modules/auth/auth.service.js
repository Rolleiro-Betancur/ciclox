// src/modules/auth/auth.service.js
const db = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/bcrypt');
const { generateToken } = require('../../utils/jwt');
const { generarCodigo } = require('../../utils/codigo');
const { sendMail } = require('../../utils/mailer');
const logger = require('../../config/logger');

// ── Helper: crear error operacional ──────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

// ── Registro ──────────────────────────────────────────────────────────────────

/**
 * Registra un nuevo usuario (USUARIO o EMPRESA).
 * Usa transacción para garantizar atomicidad al crear perfil de empresa.
 */
const registro = async ({ nombre, email, contrasena, telefono, rol, empresa }) => {
  // 1. Verificar email único
  const existente = await db.query(
    'SELECT id FROM usuarios WHERE email = $1',
    [email],
  );
  if (existente.rows.length > 0) {
    throw opError('El email ya está registrado', 'EMAIL_DUPLICADO', 409);
  }

  // 2. Hash de contraseña
  const contrasena_hash = await hashPassword(contrasena);

  // 3. Transacción: insertar usuario + perfil empresa si aplica
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO usuarios (nombre, email, contrasena, telefono, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol`,
      [nombre, email, contrasena_hash, telefono, rol],
    );
    const usuario = rows[0];

    // 4. Si es EMPRESA, crear perfil en perfiles_empresa
    if (rol === 'EMPRESA' && empresa) {
      await client.query(
        `INSERT INTO perfiles_empresa (usuario_id, nombre_empresa, nit, descripcion)
         VALUES ($1, $2, $3, $4)`,
        [usuario.id, empresa.nombre_empresa, empresa.nit, empresa.descripcion ?? null],
      );
    }

    await client.query('COMMIT');

    const token = generateToken({ id: usuario.id, email: usuario.email, rol: usuario.rol });
    return { token, usuario };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Autentica un usuario por email y contraseña.
 */
const login = async ({ email, contrasena }) => {
  const { rows } = await db.query(
    `SELECT id, nombre, email, contrasena, rol, activo
     FROM usuarios
     WHERE email = $1`,
    [email],
  );

  const usuario = rows[0];

  if (!usuario) {
    throw opError('Credenciales inválidas', 'UNAUTHORIZED', 401);
  }

  if (!usuario.activo) {
    throw opError('Cuenta desactivada', 'UNAUTHORIZED', 401);
  }

  const passwordValida = await comparePassword(contrasena, usuario.contrasena);
  if (!passwordValida) {
    throw opError('Credenciales inválidas', 'UNAUTHORIZED', 401);
  }

  const token = generateToken({ id: usuario.id, email: usuario.email, rol: usuario.rol });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    },
  };
};

// ── Recuperar contraseña ──────────────────────────────────────────────────────

/**
 * Genera un código OTP de 6 dígitos y lo guarda directamente en la tabla usuarios.
 * (columnas: codigo_recuperacion, codigo_expiracion)
 * NOTA: El envío de email debe implementarse con nodemailer / SendGrid / etc.
 */
const recuperarContrasena = async ({ email }) => {
  const { rows } = await db.query(
    'SELECT id FROM usuarios WHERE email = $1',
    [email],
  );

  // Por seguridad, siempre responde éxito aunque el email no exista
  if (rows.length === 0) {
    logger.warn(`Recuperación solicitada para email no registrado: ${email}`);
    return { message: 'Código enviado al correo' };
  }

  const codigo = generarCodigo(6);
  const expira_en = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  await db.query(
    `UPDATE usuarios
     SET codigo_recuperacion = $1, codigo_expiracion = $2
     WHERE id = $3`,
    [codigo, expira_en, rows[0].id],
  );

  // Enviar email real con nodemailer
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #2E7D32;">Recuperación de Contraseña - Ciclox</h2>
      <p>Hola,</p>
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código para continuar con el proceso:</p>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 4px; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333;">${codigo}</span>
      </div>
      <p style="color: #666; font-size: 14px;">Este código expirará en 15 minutos.</p>
      <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">Equipo Ciclox | El ciclo de la tecnología</p>
    </div>
  `;

  await sendMail(email, '🔑 Código de recuperación de contraseña', htmlContent);
  logger.info(`[DEV] Código de recuperación para ${email}: ${codigo}`);

  return { message: 'Código enviado al correo' };
};

// ── Verificar código ──────────────────────────────────────────────────────────

/**
 * Verifica el código OTP almacenado en usuarios.codigo_recuperacion.
 */
const verificarCodigo = async ({ email, codigo }) => {
  const { rows } = await db.query(
    `SELECT id, codigo_recuperacion, codigo_expiracion
     FROM usuarios
     WHERE email = $1`,
    [email],
  );

  const usuario = rows[0];

  if (!usuario || usuario.codigo_recuperacion !== codigo) {
    throw opError('Código inválido', 'CODIGO_INVALIDO', 400);
  }

  if (!usuario.codigo_expiracion || new Date() > new Date(usuario.codigo_expiracion)) {
    throw opError('El código ha expirado', 'CODIGO_EXPIRADO', 400);
  }

  return { valid: true };
};

// ── Cambiar contraseña ────────────────────────────────────────────────────────

/**
 * Verifica el código y actualiza la contraseña. Limpia el código al terminar.
 */
const cambiarContrasena = async ({ email, codigo, nueva_contrasena }) => {
  // Reutiliza la verificación
  await verificarCodigo({ email, codigo });

  const nueva_hash = await hashPassword(nueva_contrasena);

  await db.query(
    `UPDATE usuarios
     SET contrasena = $1,
         codigo_recuperacion = NULL,
         codigo_expiracion = NULL
     WHERE email = $2`,
    [nueva_hash, email],
  );

  return { message: 'Contraseña actualizada correctamente' };
};

// ── FCM Token ─────────────────────────────────────────────────────────────────

/**
 * Registra o actualiza el token FCM del usuario autenticado.
 */
const guardarFcmToken = async (usuarioId, fcm_token) => {
  await db.query(
    `UPDATE usuarios SET fcm_token = $1 WHERE id = $2`,
    [fcm_token, usuarioId],
  );
  return { message: 'FCM token actualizado' };
};

module.exports = {
  registro,
  login,
  recuperarContrasena,
  verificarCodigo,
  cambiarContrasena,
  guardarFcmToken,
};
