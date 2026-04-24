// src/modules/solicitudes/solicitudes.controller.js
const service = require('./solicitudes.service');
const { success, error } = require('../../utils/response');
const logger = require('../../config/logger');

// ── Helper: parsear id de params ──────────────────────────────────────────────
const parseId = (param, res) => {
  const id = parseInt(param, 10);
  if (isNaN(id)) {
    error(res, 'VALIDATION_ERROR', 'El id debe ser un número entero', 422);
    return null;
  }
  return id;
};

// ═════════════════════════════════════════════════════════════════════════════
// CIUDADANO
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/solicitudes
 * Lista solicitudes del usuario autenticado.
 * Query: ?estado=PENDIENTE|ACEPTADA|RECOLECTADA|RECHAZADA
 */
const listar = async (req, res, next) => {
  try {
    const ciudadanoId = req.user.id;
    const { estado } = req.query;

    const estadosValidos = ['PENDIENTE', 'ACEPTADA', 'EN_TRANSITO', 'RECOLECTADA', 'COMPLETADA', 'CANCELADA', 'RECHAZADA'];
    if (estado && !estadosValidos.includes(estado)) {
      return error(res, 'VALIDATION_ERROR', `Estado inválido. Valores: ${estadosValidos.join(', ')}`, 422);
    }

    const data = await service.listarSolicitudesCiudadano(ciudadanoId, estado || null);
    return success(res, data);
  } catch (err) {
    logger.error('solicitudes.listar: %o', err);
    next(err);
  }
};

/**
 * POST /api/solicitudes
 * Crea una nueva solicitud.
 */
const crear = async (req, res, next) => {
  try {
    const ciudadanoId = req.user.id;
    const data = await service.crearSolicitud(ciudadanoId, req.body);
    return success(res, data, 201);
  } catch (err) {
    logger.error('solicitudes.crear: %o', err);
    next(err);
  }
};

/**
 * GET /api/solicitudes/:id
 * Detalle completo de una solicitud.
 */
const obtener = async (req, res, next) => {
  try {
    const solicitudId = parseId(req.params.id, res);
    if (!solicitudId) return;

    const data = await service.obtenerSolicitudDetalle(solicitudId, req.user.id, req.user.rol);
    return success(res, data);
  } catch (err) {
    logger.error('solicitudes.obtener: %o', err);
    next(err);
  }
};

/**
 * PATCH /api/solicitudes/:id/cancelar
 * Cancela una solicitud PENDIENTE.
 */
const cancelar = async (req, res, next) => {
  try {
    const solicitudId = parseId(req.params.id, res);
    if (!solicitudId) return;

    const data = await service.cancelarSolicitud(solicitudId, req.user.id);
    return success(res, data);
  } catch (err) {
    logger.error('solicitudes.cancelar: %o', err);
    next(err);
  }
};

/**
 * POST /api/solicitudes/:id/calificacion
 * El ciudadano califica al recolector.
 */
const calificar = async (req, res, next) => {
  try {
    const solicitudId = parseId(req.params.id, res);
    if (!solicitudId) return;

    const data = await service.calificarRecolector(solicitudId, req.user.id, req.body);
    return success(res, data, 201);
  } catch (err) {
    logger.error('solicitudes.calificar: %o', err);
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// EMPRESA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/empresa/solicitudes
 * Lista solicitudes recibidas por la empresa (paginadas).
 * Query: ?estado=PENDIENTE&page=1&limit=20
 */
const listarEmpresa = async (req, res, next) => {
  try {
    const empresaId = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { estado } = req.query;

    const { rows, total } = await service.listarSolicitudesEmpresa(empresaId, {
      estado: estado || null,
      page,
      limit,
    });

    return success(res, rows, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error('solicitudes.listarEmpresa: %o', err);
    next(err);
  }
};

/**
 * PATCH /api/empresa/solicitudes/:id/aceptar
 * Acepta una solicitud y asigna recolector.
 */
const aceptar = async (req, res, next) => {
  try {
    const solicitudId = parseId(req.params.id, res);
    if (!solicitudId) return;

    const data = await service.aceptarSolicitud(solicitudId, req.user.id, req.body);
    return success(res, data);
  } catch (err) {
    logger.error('solicitudes.aceptar: %o', err);
    next(err);
  }
};

/**
 * PATCH /api/empresa/solicitudes/:id/rechazar
 * Rechaza una solicitud.
 */
const rechazar = async (req, res, next) => {
  try {
    const solicitudId = parseId(req.params.id, res);
    if (!solicitudId) return;

    const data = await service.rechazarSolicitud(
      solicitudId,
      req.user.id,
      req.body.motivo_rechazo,
    );
    return success(res, data);
  } catch (err) {
    logger.error('solicitudes.rechazar: %o', err);
    next(err);
  }
};

/**
 * PATCH /api/empresa/solicitudes/:id/en-transito
 * Marca que el recolector está en camino.
 */
const enTransito = async (req, res, next) => {
  try {
    const solicitudId = parseId(req.params.id, res);
    if (!solicitudId) return;

    const data = await service.marcarEnTransito(solicitudId, req.user.id, req.body);
    return success(res, data);
  } catch (err) {
    logger.error('solicitudes.enTransito: %o', err);
    next(err);
  }
};

/**
 * PATCH /api/empresa/solicitudes/:id/recolectada
 * Marca solicitud como recolectada y asigna puntos.
 */
const recolectada = async (req, res, next) => {
  try {
    const solicitudId = parseId(req.params.id, res);
    if (!solicitudId) return;

    const data = await service.marcarRecolectada(solicitudId, req.user.id, req.body);
    return success(res, data);
  } catch (err) {
    logger.error('solicitudes.recolectada: %o', err);
    next(err);
  }
};

module.exports = {
  // Ciudadano
  listar,
  crear,
  obtener,
  cancelar,
  calificar,
  // Empresa
  listarEmpresa,
  aceptar,
  rechazar,
  enTransito,
  recolectada,
};
