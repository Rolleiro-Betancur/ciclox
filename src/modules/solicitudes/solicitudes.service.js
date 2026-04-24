// src/modules/solicitudes/solicitudes.service.js
const db = require('../../config/database');
const logger = require('../../config/logger');
const notificacionesService = require('../notificaciones/notificaciones.service');

// ── Helper: error operacional ─────────────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

// ── Subquery reutilizable: dispositivos de una solicitud ─────────────────────
const dispositivosSQ = `
  SELECT
    d.id,
    d.tipo,
    d.marca,
    d.foto_url,
    sd.cantidad
  FROM solicitud_dispositivos sd
  JOIN dispositivos d ON d.id = sd.dispositivo_id
  WHERE sd.solicitud_id = s.id
`;

// ═════════════════════════════════════════════════════════════════════════════
// CIUDADANO — operaciones del usuario
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lista solicitudes del ciudadano autenticado.
 * Filtra por estado si se pasa el parámetro.
 */
const listarSolicitudesCiudadano = async (ciudadanoId, estado = null) => {
  const params = [ciudadanoId];
  let filtroEstado = '';
  if (estado) {
    params.push(estado);
    filtroEstado = `AND s.estado = $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT
       s.id::int,
       s.estado,
       s.tipo_recoleccion,
       s.direccion_recoleccion,
       s.ciudad,
       s.telefono_contacto,
       s.fecha_creacion,
       s.fecha_preferida,
       s.hora_estimada_inicio,
       s.hora_estimada_fin,
       (
         SELECT json_agg(json_build_object(
           'id',       d.id::int,
           'tipo',     d.tipo,
           'marca',    d.marca,
           'cantidad', sd.cantidad,
           'foto_url', d.foto_url
         ))
         FROM solicitud_dispositivos sd
         JOIN dispositivos d ON d.id = sd.dispositivo_id
         WHERE sd.solicitud_id = s.id
       ) AS dispositivos
     FROM solicitudes_recoleccion s
     WHERE s.ciudadano_id = $1 ${filtroEstado}
     ORDER BY s.fecha_creacion DESC`,
    params,
  );

  return rows;
};

/**
 * Detalle completo de una solicitud (visible para ciudadano Y empresa).
 * Verifica que el ciudadano sea dueño o que la empresa esté asignada.
 */
const obtenerSolicitudDetalle = async (solicitudId, userId, rol) => {
  const { rows } = await db.query(
    `SELECT
       s.id::int,
       s.estado,
       s.tipo_recoleccion,
       s.direccion_recoleccion,
       s.ciudad,
       s.departamento,
       s.referencia,
       s.telefono_contacto,
       s.fecha_creacion,
       s.fecha_preferida,
       s.hora_estimada_inicio,
       s.hora_estimada_fin,
       s.motivo_rechazo,
       s.comentario_empresa,
       s.fecha_aceptacion,
       s.fecha_recoleccion,
       s.ciudadano_id::int,
       -- empresa asignada
       CASE WHEN s.empresa_id IS NOT NULL THEN
         json_build_object('id', pe.usuario_id::int, 'nombre_empresa', pe.nombre_empresa)
       END AS empresa,
       -- recolector asignado
       CASE WHEN s.recolector_id IS NOT NULL THEN
         json_build_object(
           'id',                   r.id::int,
           'nombre',               r.nombre,
           'foto_url',             r.foto_url,
           'calificacion_promedio',r.calificacion_promedio
         )
       END AS recolector,
       -- dispositivos
       (
         SELECT json_agg(json_build_object(
           'id',       d.id::int,
           'tipo',     d.tipo,
           'marca',    d.marca,
           'cantidad', sd.cantidad,
           'foto_url', d.foto_url
         ))
         FROM solicitud_dispositivos sd
         JOIN dispositivos d ON d.id = sd.dispositivo_id
         WHERE sd.solicitud_id = s.id
       ) AS dispositivos
     FROM solicitudes_recoleccion s
     LEFT JOIN perfiles_empresa pe ON pe.usuario_id = s.empresa_id
     LEFT JOIN recolectores r ON r.id = s.recolector_id
     WHERE s.id = $1`,
    [solicitudId],
  );

  const sol = rows[0];
  if (!sol) throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);

  // Verificar acceso según rol
  if (rol === 'USUARIO' && Number(sol.ciudadano_id) !== Number(userId)) {
    throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
  }

  return sol;
};

/**
 * Crea una nueva solicitud de recolección.
 * Valida dispositivos (pertenecen al ciudadano, están en REGISTRADO) y
 * ejecuta la inserción en transacción:
 *   1. INSERT solicitudes_recoleccion
 *   2. INSERT solicitud_dispositivos (por cada dispositivo)
 *   3. UPDATE dispositivos.estado → EN_PROCESO_RECOLECCION
 *   4. INSERT movimientos_raee (tipo SOLICITUD_CREADA)
 */
const crearSolicitud = async (ciudadanoId, datos) => {
  const {
    tipo_recoleccion,
    dispositivos,
    direccion_recoleccion = null,
    ciudad = null,
    departamento = null,
    referencia = null,
    telefono_contacto = null,
    email_contacto = null,
    fecha_preferida = null,
    punto_recoleccion_id = null,
  } = datos;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Validar dispositivos: pertenecen al ciudadano y están en REGISTRADO
    const ids = dispositivos.map((d) => d.dispositivo_id);
    const { rows: devs } = await client.query(
      `SELECT id, estado FROM dispositivos
       WHERE id = ANY($1::bigint[]) AND ciudadano_id = $2`,
      [ids, ciudadanoId],
    );

    if (devs.length !== ids.length) {
      throw opError(
        'Uno o más dispositivos no existen o no te pertenecen',
        'DISPOSITIVO_NO_VALIDO',
        400,
      );
    }

    const noRegistrado = devs.find((d) => d.estado !== 'REGISTRADO');
    if (noRegistrado) {
      throw opError(
        `El dispositivo ${noRegistrado.id} ya tiene una solicitud activa`,
        'DISPOSITIVO_EN_USO',
        400,
      );
    }

    // 2. Insertar la solicitud
    const { rows: solRows } = await client.query(
      `INSERT INTO solicitudes_recoleccion (
         ciudadano_id, tipo_recoleccion,
         direccion_recoleccion, ciudad, departamento, referencia,
         telefono_contacto, fecha_preferida, punto_recoleccion_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id::int, estado`,
      [
        ciudadanoId,
        tipo_recoleccion,
        direccion_recoleccion,
        ciudad,
        departamento,
        referencia,
        telefono_contacto,
        fecha_preferida,
        punto_recoleccion_id,
      ],
    );
    const solicitud = solRows[0];

    // 3. Insertar solicitud_dispositivos + cambiar estado dispositivos
    for (const item of dispositivos) {
      await client.query(
        `INSERT INTO solicitud_dispositivos (solicitud_id, dispositivo_id, cantidad)
         VALUES ($1, $2, $3)`,
        [solicitud.id, item.dispositivo_id, item.cantidad],
      );

      await client.query(
        `UPDATE dispositivos SET estado = 'EN_PROCESO_RECOLECCION' WHERE id = $1`,
        [item.dispositivo_id],
      );

      // 4. Registrar en trazabilidad
      await client.query(
        `INSERT INTO movimientos_raee (dispositivo_id, responsable_id, solicitud_id, tipo, descripcion)
         VALUES ($1, $2, $3, 'SOLICITUD_CREADA', 'Solicitud de recolección creada')`,
        [item.dispositivo_id, ciudadanoId, solicitud.id],
      );
    }

    await client.query('COMMIT');

    return {
      id: Number(solicitud.id),
      estado: solicitud.estado,
      mensaje: 'Te notificaremos cuando sea aceptada',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Cancela una solicitud (solo si está en estado PENDIENTE).
 * Devuelve los dispositivos a estado REGISTRADO.
 */
const cancelarSolicitud = async (solicitudId, ciudadanoId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, estado, ciudadano_id FROM solicitudes_recoleccion WHERE id = $1`,
      [solicitudId],
    );
    const sol = rows[0];

    if (!sol) throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
    if (Number(sol.ciudadano_id) !== Number(ciudadanoId)) {
      throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
    }
    if (sol.estado !== 'PENDIENTE') {
      throw opError(
        'Solo se pueden cancelar solicitudes en estado PENDIENTE',
        'SOLICITUD_NO_CANCELABLE',
        400,
      );
    }

    // Cancelar solicitud
    await client.query(
      `UPDATE solicitudes_recoleccion SET estado = 'CANCELADA' WHERE id = $1`,
      [solicitudId],
    );

    // Devolver dispositivos a REGISTRADO
    await client.query(
      `UPDATE dispositivos SET estado = 'REGISTRADO'
       WHERE id IN (
         SELECT dispositivo_id FROM solicitud_dispositivos WHERE solicitud_id = $1
       )`,
      [solicitudId],
    );

    await client.query('COMMIT');
    return { message: 'Tu solicitud fue cancelada correctamente' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * El ciudadano califica al recolector después de una recolección completada.
 */
const calificarRecolector = async (solicitudId, ciudadanoId, datos) => {
  const { estrellas, comentario = null } = datos;

  const { rows } = await db.query(
    `SELECT id, estado, ciudadano_id, recolector_id FROM solicitudes_recoleccion WHERE id = $1`,
    [solicitudId],
  );
  const sol = rows[0];

  if (!sol) throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
  if (Number(sol.ciudadano_id) !== Number(ciudadanoId)) {
    throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
  }
  if (sol.estado !== 'RECOLECTADA' && sol.estado !== 'COMPLETADA') {
    throw opError(
      'Solo se puede calificar una solicitud ya recolectada',
      'ESTADO_INVALIDO',
      400,
    );
  }
  if (!sol.recolector_id) {
    throw opError('Esta solicitud no tiene un recolector asignado', 'SIN_RECOLECTOR', 400);
  }

  // Verificar que no haya calificado ya
  const { rows: existing } = await db.query(
    `SELECT id FROM calificaciones_recolector WHERE solicitud_id = $1`,
    [solicitudId],
  );
  if (existing.length > 0) {
    throw opError('Ya calificaste esta solicitud', 'YA_CALIFICADO', 400);
  }

  const { rows: cal } = await db.query(
    `INSERT INTO calificaciones_recolector (solicitud_id, recolector_id, ciudadano_id, estrellas, comentario)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, estrellas, comentario, fecha`,
    [solicitudId, sol.recolector_id, ciudadanoId, estrellas, comentario],
  );

  return cal[0];
};

// ═════════════════════════════════════════════════════════════════════════════
// EMPRESA — operaciones del panel empresarial
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lista solicitudes recibidas por la empresa (paginadas).
 * Las solicitudes recibidas son aquellas sin empresa asignada (pendientes globales)
 * O las que ya tienen esta empresa asignada.
 */
const listarSolicitudesEmpresa = async (empresaId, { estado, page, limit }) => {
  const offset = (page - 1) * limit;
  const params = [empresaId];
  let filtroEstado = '';

  if (estado) {
    params.push(estado);
    filtroEstado = `AND s.estado = $${params.length}`;
  }

  // Solicitudes pendientes (sin empresa) + las de esta empresa
  const { rows } = await db.query(
    `SELECT
       s.id::int,
       s.estado,
       s.tipo_recoleccion,
       s.direccion_recoleccion,
       s.ciudad,
       s.fecha_preferida,
       s.fecha_creacion,
       json_build_object(
         'id',       u.id::int,
         'nombre',   u.nombre,
         'telefono', u.telefono
       ) AS ciudadano,
       (
         SELECT json_agg(json_build_object(
           'tipo',     d.tipo,
           'marca',    d.marca,
           'cantidad', sd.cantidad
         ))
         FROM solicitud_dispositivos sd
         JOIN dispositivos d ON d.id = sd.dispositivo_id
         WHERE sd.solicitud_id = s.id
       ) AS dispositivos
     FROM solicitudes_recoleccion s
     JOIN usuarios u ON u.id = s.ciudadano_id
     WHERE (s.empresa_id = $1 OR (s.empresa_id IS NULL AND s.estado = 'PENDIENTE'))
     ${filtroEstado}
     ORDER BY s.fecha_creacion DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  const { rows: totalRow } = await db.query(
    `SELECT COUNT(*) AS total
     FROM solicitudes_recoleccion s
     WHERE (s.empresa_id = $1 OR (s.empresa_id IS NULL AND s.estado = 'PENDIENTE'))
     ${filtroEstado ? filtroEstado.replace(`$${params.length}`, '$2') : ''}`,
    estado ? [empresaId, estado] : [empresaId],
  );

  const total = parseInt(totalRow[0].total, 10);
  return { rows, total };
};

/**
 * Acepta una solicitud y asigna un recolector de la empresa.
 * La empresa debe poseer el recolector indicado.
 */
const aceptarSolicitud = async (solicitudId, empresaId, datos) => {
  const { recolector_id, hora_estimada_inicio, hora_estimada_fin, comentario_empresa = null } =
    datos;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Verificar solicitud existe y está PENDIENTE
    const { rows } = await client.query(
      `SELECT id, estado, empresa_id FROM solicitudes_recoleccion WHERE id = $1 FOR UPDATE`,
      [solicitudId],
    );
    const sol = rows[0];
    if (!sol) throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
    if (sol.estado !== 'PENDIENTE') {
      throw opError('Solo se pueden aceptar solicitudes PENDIENTES', 'ESTADO_INVALIDO', 400);
    }
    if (sol.empresa_id && Number(sol.empresa_id) !== Number(empresaId)) {
      throw opError('Esta solicitud ya fue tomada por otra empresa', 'SOLICITUD_TOMADA', 400);
    }

    // Verificar que el recolector pertenece a la empresa y está activo
    const { rows: rec } = await client.query(
      `SELECT id FROM recolectores WHERE id = $1 AND empresa_id = $2 AND activo = TRUE`,
      [recolector_id, empresaId],
    );
    if (!rec[0]) {
      throw opError(
        'Recolector no encontrado o inactivo',
        'RECOLECTOR_NO_VALIDO',
        400,
      );
    }

    const { rows: updated } = await client.query(
      `UPDATE solicitudes_recoleccion SET
         estado               = 'ACEPTADA',
         empresa_id           = $1,
         recolector_id        = $2,
         hora_estimada_inicio = $3,
         hora_estimada_fin    = $4,
         comentario_empresa   = $5,
         fecha_aceptacion     = NOW()
       WHERE id = $6
       RETURNING id::int, estado`,
      [empresaId, recolector_id, hora_estimada_inicio, hora_estimada_fin, comentario_empresa, solicitudId],
    );

    await client.query('COMMIT');

    // ── Notificar al ciudadano ──
    try {
      const { rows: solInfo } = await db.query(
        'SELECT ciudadano_id FROM solicitudes_recoleccion WHERE id = $1',
        [solicitudId]
      );
      if (solInfo[0]) {
        await notificacionesService.crearNotificacion({
          usuario_id: solInfo[0].ciudadano_id,
          titulo: '¡Tu solicitud fue aceptada!',
          mensaje: 'Ya estamos preparando tu recolección. Revisa los detalles en la app.',
          tipo: 'SOLICITUD_ACEPTADA',
          referencia_id: solicitudId,
          referencia_tipo: 'solicitud',
        });
      }
    } catch (err) {
      logger.error('Error enviando notificación (aceptarSolicitud):', err.message);
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
 * Rechaza una solicitud PENDIENTE.
 */
const rechazarSolicitud = async (solicitudId, empresaId, motivo_rechazo) => {
  const { rows } = await db.query(
    `SELECT id, estado FROM solicitudes_recoleccion WHERE id = $1`,
    [solicitudId],
  );
  const sol = rows[0];
  if (!sol) throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
  if (sol.estado !== 'PENDIENTE') {
    throw opError('Solo se pueden rechazar solicitudes PENDIENTES', 'ESTADO_INVALIDO', 400);
  }

  const { rows: updated } = await db.query(
    `UPDATE solicitudes_recoleccion SET
       estado         = 'RECHAZADA',
       empresa_id     = $1,
       motivo_rechazo = $2
     WHERE id = $3
     RETURNING id::int, estado, motivo_rechazo`,
    [empresaId, motivo_rechazo, solicitudId],
  );

  // Devolver dispositivos a REGISTRADO
  await db.query(
    `UPDATE dispositivos SET estado = 'REGISTRADO'
     WHERE id IN (
       SELECT dispositivo_id FROM solicitud_dispositivos WHERE solicitud_id = $1
     )`,
    [solicitudId],
  );

  return updated[0];
};

/**
 * Marca la solicitud en tránsito (recolector en camino).
 * Registra coordenadas y tiempo estimado en movimientos_raee.
 */
const marcarEnTransito = async (solicitudId, empresaId, datos) => {
  const {
    latitud_recolector = null,
    longitud_recolector = null,
    tiempo_estimado_minutos = null,
  } = datos;

  const { rows } = await db.query(
    `SELECT id, estado, empresa_id FROM solicitudes_recoleccion WHERE id = $1`,
    [solicitudId],
  );
  const sol = rows[0];
  if (!sol) throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
  if (Number(sol.empresa_id) !== Number(empresaId)) {
    throw opError('No autorizado para esta solicitud', 'FORBIDDEN', 403);
  }
  if (sol.estado !== 'ACEPTADA') {
    throw opError('La solicitud debe estar en estado ACEPTADA para marcar EN_TRANSITO', 'ESTADO_INVALIDO', 400);
  }

  await db.query(
    `UPDATE solicitudes_recoleccion SET estado = 'EN_TRANSITO' WHERE id = $1`,
    [solicitudId],
  );

  // Registrar en trazabilidad por cada dispositivo de la solicitud
  const { rows: items } = await db.query(
    `SELECT dispositivo_id FROM solicitud_dispositivos WHERE solicitud_id = $1`,
    [solicitudId],
  );

  for (const item of items) {
    await db.query(
      `INSERT INTO movimientos_raee
         (dispositivo_id, responsable_id, solicitud_id, tipo, descripcion, latitud, longitud)
       VALUES ($1, $2, $3, 'EN_TRANSITO', $4, $5, $6)`,
      [
        item.dispositivo_id,
        empresaId,
        solicitudId,
        tiempo_estimado_minutos
          ? `Recolector en camino — ETA ${tiempo_estimado_minutos} min`
          : 'Recolector en camino',
        latitud_recolector,
        longitud_recolector,
      ],
    );
  }

  // ── Notificar al ciudadano ──
  try {
    await notificacionesService.crearNotificacion({
      usuario_id: sol.ciudadano_id,
      titulo: '¡El recolector está en camino!',
      mensaje: datos.tiempo_estimado_minutos 
        ? `Llegará en aproximadamente ${datos.tiempo_estimado_minutos} minutos.`
        : 'Sigue la ubicación en tiempo real desde el mapa.',
      tipo: 'SOLICITUD_EN_TRANSITO',
      referencia_id: solicitudId,
      referencia_tipo: 'solicitud',
    });
  } catch (err) {
    logger.error('Error enviando notificación (marcarEnTransito):', err.message);
  }

  return {
    id: Number(solicitudId),
    estado: 'EN_TRANSITO',
    latitud_recolector,
    longitud_recolector,
    tiempo_estimado_minutos,
  };
};

/**
 * Marca la solicitud como recolectada y asigna puntos al ciudadano.
 * Transacción:
 *   1. UPDATE solicitudes_recoleccion → RECOLECTADA
 *   2. UPDATE dispositivos → RECOLECTADO
 *   3. INSERT movimientos_puntos (+puntos al ciudadano)
 *   4. INSERT movimientos_raee por dispositivo
 */
const marcarRecolectada = async (solicitudId, empresaId, datos) => {
  const { puntos_otorgados, evidencia_url = null } = datos;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, estado, empresa_id, ciudadano_id FROM solicitudes_recoleccion
       WHERE id = $1 FOR UPDATE`,
      [solicitudId],
    );
    const sol = rows[0];
    if (!sol) throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
    if (Number(sol.empresa_id) !== Number(empresaId)) {
      throw opError('No autorizado para esta solicitud', 'FORBIDDEN', 403);
    }
    if (sol.estado !== 'EN_TRANSITO') {
      throw opError('La solicitud debe estar EN_TRANSITO para marcar como recolectada', 'ESTADO_INVALIDO', 400);
    }

    // 1. Actualizar estado de la solicitud
    await client.query(
      `UPDATE solicitudes_recoleccion
       SET estado = 'RECOLECTADA', fecha_recoleccion = NOW()
       WHERE id = $1`,
      [solicitudId],
    );

    // 2. Actualizar dispositivos → RECOLECTADO + registrar trazabilidad
    const { rows: items } = await client.query(
      `SELECT dispositivo_id FROM solicitud_dispositivos WHERE solicitud_id = $1`,
      [solicitudId],
    );

    for (const item of items) {
      await client.query(
        `UPDATE dispositivos SET estado = 'RECOLECTADO' WHERE id = $1`,
        [item.dispositivo_id],
      );

      await client.query(
        `INSERT INTO movimientos_raee
           (dispositivo_id, responsable_id, solicitud_id, tipo, descripcion, evidencia_url)
         VALUES ($1, $2, $3, 'RECIBIDO_EMPRESA', 'Dispositivo recolectado', $4)`,
        [item.dispositivo_id, empresaId, solicitudId, evidencia_url],
      );
    }

    // 3. Asignar puntos al ciudadano
    const totalDispositivos = items.length;
    const descripcion = `Reciclaje de ${totalDispositivos} dispositivo${totalDispositivos > 1 ? 's' : ''}`;

    await client.query(
      `INSERT INTO movimientos_puntos (usuario_id, solicitud_id, cantidad, tipo, descripcion)
       VALUES ($1, $2, $3, 'GANADO_RECICLAJE', $4)`,
      [sol.ciudadano_id, solicitudId, puntos_otorgados, descripcion],
    );
    // El trigger trg_actualizar_puntos actualiza puntos_usuario automáticamente

    await client.query('COMMIT');

    // ── Notificar al ciudadano ──
    try {
      await notificacionesService.crearNotificacion({
        usuario_id: sol.ciudadano_id,
        titulo: '¡Dispositivos recolectados!',
        mensaje: `Has ganado ${puntos_otorgados} puntos por tu aporte al medio ambiente.`,
        tipo: 'SOLICITUD_RECOLECTADA',
        referencia_id: solicitudId,
        referencia_tipo: 'solicitud',
      });
    } catch (err) {
      logger.error('Error enviando notificación (marcarRecolectada):', err.message);
    }

    return {
      id: Number(solicitudId),
      estado: 'RECOLECTADA',
      puntos_otorgados,
      ciudadano_id: Number(sol.ciudadano_id),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  // Ciudadano
  listarSolicitudesCiudadano,
  obtenerSolicitudDetalle,
  crearSolicitud,
  cancelarSolicitud,
  calificarRecolector,
  // Empresa
  listarSolicitudesEmpresa,
  aceptarSolicitud,
  rechazarSolicitud,
  marcarEnTransito,
  marcarRecolectada,
};
