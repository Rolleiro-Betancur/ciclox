// src/modules/trazabilidad/trazabilidad.routes.js
const { Router } = require('express');
const ctrl       = require('./trazabilidad.controller');
const auth       = require('../../middlewares/auth.middleware');
const checkRole  = require('../../middlewares/role.middleware');
const validate   = require('../../middlewares/validate.middleware');
const { registrarMovimientoSchema } = require('./trazabilidad.schema');

// ── Router público (ciudadano/empresa): /api/trazabilidad ───────────────────
const router = Router();
router.use(auth);

/**
 * GET /api/trazabilidad/dispositivo/:dispositivoId
 * Historial completo de movimientos de un dispositivo.
 */
router.get('/dispositivo/:dispositivoId', ctrl.obtenerMovimientos);

/**
 * GET /api/trazabilidad/solicitud/:solicitudId/ubicacion
 * Ubicación en tiempo real del recolector (mapa).
 */
router.get('/solicitud/:solicitudId/ubicacion', ctrl.obtenerUbicacion);

// ── Router empresa: /api/empresa/trazabilidad ───────────────────────────────
const empresaRouter = Router();
empresaRouter.use(auth, checkRole('EMPRESA'));

/**
 * POST /api/empresa/trazabilidad
 * Registrar un movimiento RAEE manualmente.
 */
empresaRouter.post('/', validate(registrarMovimientoSchema), ctrl.registrarMovimiento);

module.exports = { router, empresaRouter };
