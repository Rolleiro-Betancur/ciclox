// src/modules/trazabilidad/trazabilidad.service.js
const db = require('../../config/database');

// ── Helper: error operacional ─────────────────────────────────────────────────
const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

// ═════════════════════════════════════════════════════════════════════════════
// CONSULTAS PÚBLICAS (ciudadano / empresa autenticados)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Obtener historial completo de movimientos RAEE de un dispositivo.
 * El usuario debe ser dueño del dispositivo o empresa responsable.
 */
const obtenerMovimientosDispositivo = async (dispositivoId, userId, rol) => {
  // 1. Obtener info del dispositivo
  const { rows: devRows } = await db.query(
    `SELECT id, tipo, marca, modelo, estado, ciudadano_id
     FROM dispositivos
     WHERE id = $1`,
    [dispositivoId],
  );

  const dispositivo = devRows[0];
  if (!dispositivo) {
    throw opError('Dispositivo no encontrado', 'NOT_FOUND', 404);
  }

  // 2. Verificar acceso según rol
  if (rol === 'USUARIO' && Number(dispositivo.ciudadano_id) !== Number(userId)) {
    throw opError('Dispositivo no encontrado', 'NOT_FOUND', 404);
  }

  // 3. Obtener movimientos ordenados cronológicamente
  const { rows: movimientos } = await db.query(
    `SELECT
       m.id::int,
       m.tipo,
       m.descripcion,
       m.ubicacion_origen,
       m.ubicacion_destino,
       m.latitud,
       m.longitud,
       m.evidencia_url,
       m.fecha,
       u.nombre AS responsable_nombre
     FROM movimientos_raee m
     LEFT JOIN usuarios u ON u.id = m.responsable_id
     WHERE m.dispositivo_id = $1
     ORDER BY m.fecha ASC`,
    [dispositivoId],
  );

  return {
    dispositivo: {
      id: Number(dispositivo.id),
      tipo: dispositivo.tipo,
      marca: dispositivo.marca,
      modelo: dispositivo.modelo,
      estado: dispositivo.estado,
    },
    movimientos,
  };
};

/**
 * Obtener ubicación en tiempo real del recolector para una solicitud EN_TRANSITO.
 * Busca el último movimiento de tipo EN_TRANSITO de la solicitud.
 */
const obtenerUbicacionRecolector = async (solicitudId, userId, rol) => {
  // 1. Verificar la solicitud
  const { rows: solRows } = await db.query(
    `SELECT
       s.id, s.estado, s.ciudadano_id, s.empresa_id,
       s.direccion_recoleccion,
       pr.latitud  AS latitud_destino,
       pr.longitud AS longitud_destino
     FROM solicitudes_recoleccion s
     LEFT JOIN puntos_recoleccion pr ON pr.id = s.punto_recoleccion_id
     WHERE s.id = $1`,
    [solicitudId],
  );

  const sol = solRows[0];
  if (!sol) {
    throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
  }

  // Verificar acceso
  if (
    rol === 'USUARIO' && Number(sol.ciudadano_id) !== Number(userId)
  ) {
    throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
  }

  if (sol.estado !== 'EN_TRANSITO') {
    throw opError(
      'La solicitud no está en tránsito actualmente',
      'ESTADO_INVALIDO',
      400,
    );
  }

  // 2. Obtener última posición conocida del recolector
  const { rows: movRows } = await db.query(
    `SELECT latitud, longitud, descripcion, fecha
     FROM movimientos_raee
     WHERE solicitud_id = $1 AND tipo = 'EN_TRANSITO'
     ORDER BY fecha DESC
     LIMIT 1`,
    [solicitudId],
  );

  const mov = movRows[0];

  // Extraer tiempo estimado de la descripción si existe
  let tiempo_estimado_minutos = null;
  if (mov && mov.descripcion) {
    const match = mov.descripcion.match(/ETA (\d+) min/);
    if (match) tiempo_estimado_minutos = parseInt(match[1], 10);
  }

  return {
    latitud_recolector: mov ? mov.latitud : null,
    longitud_recolector: mov ? mov.longitud : null,
    latitud_destino: sol.latitud_destino || null,
    longitud_destino: sol.longitud_destino || null,
    tiempo_estimado_minutos,
    estado: sol.estado,
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// EMPRESA — registrar movimientos manuales
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Registrar un movimiento de trazabilidad RAEE manualmente.
 * Solo empresas autenticadas pueden crear movimientos.
 *
 * Los tipos permitidos para la empresa son:
 * RECIBIDO_PUNTO, RECIBIDO_EMPRESA, EN_CLASIFICACION,
 * EN_DESMANTELAMIENTO, EN_RECICLAJE, RECICLADO, CERTIFICADO_EMITIDO
 */
const registrarMovimiento = async (empresaId, datos) => {
  const {
    dispositivo_id,
    solicitud_id = null,
    tipo,
    ubicacion_origen = null,
    ubicacion_destino = null,
    descripcion = null,
    latitud = null,
    longitud = null,
    evidencia_url = null,
  } = datos;

  // Tipos que la empresa puede registrar manualmente
  const tiposPermitidos = [
    'RECIBIDO_PUNTO',
    'RECIBIDO_EMPRESA',
    'EN_CLASIFICACION',
    'EN_DESMANTELAMIENTO',
    'EN_RECICLAJE',
    'RECICLADO',
    'CERTIFICADO_EMITIDO',
  ];

  if (!tiposPermitidos.includes(tipo)) {
    throw opError(
      `Tipo de movimiento no permitido. Use: ${tiposPermitidos.join(', ')}`,
      'TIPO_NO_PERMITIDO',
      400,
    );
  }

  // Verificar que el dispositivo existe
  const { rows: devRows } = await db.query(
    `SELECT id, estado FROM dispositivos WHERE id = $1`,
    [dispositivo_id],
  );
  if (!devRows[0]) {
    throw opError('Dispositivo no encontrado', 'NOT_FOUND', 404);
  }

  // Si se pasa solicitud_id, verificar que exista y pertenezca a la empresa
  if (solicitud_id) {
    const { rows: solRows } = await db.query(
      `SELECT id, empresa_id FROM solicitudes_recoleccion WHERE id = $1`,
      [solicitud_id],
    );
    if (!solRows[0]) {
      throw opError('Solicitud no encontrada', 'NOT_FOUND', 404);
    }
    if (Number(solRows[0].empresa_id) !== Number(empresaId)) {
      throw opError('No autorizado para esta solicitud', 'FORBIDDEN', 403);
    }
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Insertar movimiento
    const { rows: movRows } = await client.query(
      `INSERT INTO movimientos_raee (
         dispositivo_id, responsable_id, solicitud_id, tipo,
         ubicacion_origen, ubicacion_destino, descripcion,
         latitud, longitud, evidencia_url
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id::int, tipo, descripcion, fecha`,
      [
        dispositivo_id,
        empresaId,
        solicitud_id,
        tipo,
        ubicacion_origen,
        ubicacion_destino,
        descripcion,
        latitud,
        longitud,
        evidencia_url,
      ],
    );

    // Actualizar estado del dispositivo según el tipo de movimiento
    const estadoMap = {
      RECIBIDO_EMPRESA: 'RECOLECTADO',
      RECIBIDO_PUNTO: 'RECOLECTADO',
      EN_CLASIFICACION: 'EN_RECICLAJE',
      EN_DESMANTELAMIENTO: 'EN_RECICLAJE',
      EN_RECICLAJE: 'EN_RECICLAJE',
      RECICLADO: 'RECICLADO',
      CERTIFICADO_EMITIDO: 'RECICLADO',
    };

    const nuevoEstado = estadoMap[tipo];
    if (nuevoEstado) {
      await client.query(
        `UPDATE dispositivos SET estado = $1 WHERE id = $2`,
        [nuevoEstado, dispositivo_id],
      );
    }

    await client.query('COMMIT');
    return movRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  obtenerMovimientosDispositivo,
  obtenerUbicacionRecolector,
  registrarMovimiento,
};
