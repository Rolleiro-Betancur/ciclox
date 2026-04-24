// src/modules/recolectores/recolectores.controller.js
const service = require('./recolectores.service');
const { success, error } = require('../../utils/response');
const logger = require('../../config/logger');

/**
 * GET /api/empresa/recolectores
 * Lista todos los recolectores de la empresa autenticada.
 * Query params opcionales: ?activo=true|false
 */
const listar = async (req, res, next) => {
  try {
    const empresaId = req.user.id;
    const filtros = {};

    if (req.query.activo !== undefined) {
      filtros.activo = req.query.activo === 'true';
    }

    const recolectores = await service.listarRecolectores(empresaId, filtros);
    return success(res, recolectores);
  } catch (err) {
    logger.error('recolectores.listar error: %o', err);
    next(err);
  }
};

/**
 * GET /api/empresa/recolectores/:id
 * Detalle de un recolector.
 */
const obtener = async (req, res, next) => {
  try {
    const empresaId = req.user.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return error(res, 'VALIDATION_ERROR', 'El id del recolector debe ser un número', 422);
    }

    const recolector = await service.obtenerRecolectorPorId(id, empresaId);
    if (!recolector) {
      return error(res, 'NOT_FOUND', 'Recolector no encontrado', 404);
    }

    return success(res, recolector);
  } catch (err) {
    logger.error('recolectores.obtener error: %o', err);
    next(err);
  }
};

/**
 * POST /api/empresa/recolectores
 * Crea un recolector para la empresa.
 */
const crear = async (req, res, next) => {
  try {
    const empresaId = req.user.id;
    const recolector = await service.crearRecolector(empresaId, req.body);
    return success(res, recolector, 201);
  } catch (err) {
    logger.error('recolectores.crear error: %o', err);
    next(err);
  }
};

/**
 * PUT /api/empresa/recolectores/:id
 * Actualiza nombre, teléfono, foto_url o estado activo.
 */
const actualizar = async (req, res, next) => {
  try {
    const empresaId = req.user.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return error(res, 'VALIDATION_ERROR', 'El id del recolector debe ser un número', 422);
    }

    // Verificar que existe y pertenece a la empresa
    const existe = await service.obtenerRecolectorPorId(id, empresaId);
    if (!existe) {
      return error(res, 'NOT_FOUND', 'Recolector no encontrado', 404);
    }

    const recolectorActualizado = await service.actualizarRecolector(id, empresaId, req.body);
    return success(res, recolectorActualizado);
  } catch (err) {
    logger.error('recolectores.actualizar error: %o', err);
    next(err);
  }
};

/**
 * DELETE /api/empresa/recolectores/:id
 * Soft-delete: marca activo = false.
 */
const desactivar = async (req, res, next) => {
  try {
    const empresaId = req.user.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return error(res, 'VALIDATION_ERROR', 'El id del recolector debe ser un número', 422);
    }

    const recolector = await service.desactivarRecolector(id, empresaId);
    if (!recolector) {
      return error(res, 'NOT_FOUND', 'Recolector no encontrado', 404);
    }

    return success(res, {
      message: 'Recolector desactivado correctamente',
      recolector,
    });
  } catch (err) {
    logger.error('recolectores.desactivar error: %o', err);
    next(err);
  }
};

/**
 * GET /api/empresa/recolectores/:id/calificaciones
 * Historial de calificaciones de un recolector.
 * Query params: ?page=1&limit=20
 */
const obtenerCalificaciones = async (req, res, next) => {
  try {
    const empresaId = req.user.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return error(res, 'VALIDATION_ERROR', 'El id del recolector debe ser un número', 422);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const resultado = await service.listarCalificaciones(id, empresaId, page, limit);
    if (!resultado) {
      return error(res, 'NOT_FOUND', 'Recolector no encontrado', 404);
    }

    const { recolector, calificaciones, meta } = resultado;

    return success(res, { recolector, calificaciones }, 200, meta);
  } catch (err) {
    logger.error('recolectores.obtenerCalificaciones error: %o', err);
    next(err);
  }
};

module.exports = { listar, obtener, crear, actualizar, desactivar, obtenerCalificaciones };
