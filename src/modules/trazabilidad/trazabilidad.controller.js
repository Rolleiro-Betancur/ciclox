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
    const data = await trazabilidadService.obtenerUbicacionColaborador(
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

const db = require('../../config/database');
const getRoleIds = async (user) => {
  if (user.rol === 'EMPRESA') {
    return { empresaId: user.id, colaboradorId: null };
  } else if (user.rol === 'COLABORADOR') {
    const { rows } = await db.query('SELECT id, empresa_id FROM colaboradores WHERE usuario_id = $1', [user.id]);
    if (rows.length === 0) throw new Error('Colaborador no encontrado');
    return { empresaId: rows[0].empresa_id, colaboradorId: rows[0].id };
  }
  throw new Error('Rol no permitido');
};

// ── POST /api/empresa/trazabilidad ──────────────────────────────────────────
const registrarMovimiento = async (req, res, next) => {
  try {
    const { empresaId } = await getRoleIds(req.user);
    const movimiento = await trazabilidadService.registrarMovimiento(
      empresaId,
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
