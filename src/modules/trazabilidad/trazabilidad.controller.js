// src/modules/trazabilidad/trazabilidad.controller.js
const trazabilidadService = require('./trazabilidad.service');
const { success } = require('../../utils/response');

// ── GET /api/trazabilidad/dispositivo/:dispositivoId ─────────────────────────
const obtenerMovimientos = async (req, res, next) => {
  try {
    const data = await trazabilidadService.obtenerMovimientosDispositivo(
      req.params.dispositivoId,
      req.user.id,
      req.user.rol,
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/trazabilidad/solicitud/:solicitudId/ubicacion ───────────────────
const obtenerUbicacion = async (req, res, next) => {
  try {
    const data = await trazabilidadService.obtenerUbicacionRecolector(
      req.params.solicitudId,
      req.user.id,
      req.user.rol,
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/trazabilidad/solicitud/:solicitudId ─────────────────────────────
const obtenerMovimientosSolicitud = async (req, res, next) => {
  try {
    const data = await trazabilidadService.obtenerMovimientosSolicitud(
      req.params.solicitudId,
      req.user.id,
      req.user.rol,
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/empresa/trazabilidad ──────────────────────────────────────────
const registrarMovimiento = async (req, res, next) => {
  try {
    const movimiento = await trazabilidadService.registrarMovimiento(
      req.user.id,
      req.body,
    );
    return success(res, movimiento, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  obtenerMovimientos,
  obtenerMovimientosSolicitud,
  obtenerUbicacion,
  registrarMovimiento,
};
