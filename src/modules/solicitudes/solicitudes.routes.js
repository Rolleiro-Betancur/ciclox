// src/modules/solicitudes/solicitudes.routes.js
const { Router } = require('express');
const ctrl    = require('./solicitudes.controller');
const auth    = require('../../middlewares/auth.middleware');
const checkRole = require('../../middlewares/role.middleware');
const validate  = require('../../middlewares/validate.middleware');
const {
  crearSolicitudSchema,
  calificarSchema,
  aceptarSolicitudSchema,
  rechazarSolicitudSchema,
  enTransitoSchema,
  recolectadaSchema,
} = require('./solicitudes.schema');

// ── Router ciudadano: /api/solicitudes ────────────────────────────────────────
const router = Router();
router.use(auth);

/**
 * GET  /api/solicitudes
 * Lista solicitudes del usuario. ?estado=PENDIENTE|ACEPTADA|...
 */
router.get('/', checkRole('USUARIO'), ctrl.listar);

/**
 * POST /api/solicitudes
 * Crear nueva solicitud de recolección.
 */
router.post('/', checkRole('USUARIO'), validate(crearSolicitudSchema), ctrl.crear);

/**
 * GET  /api/solicitudes/:id
 * Detalle completo (ciudadano puede ver las suyas, empresa las asignadas).
 */
router.get('/:id', ctrl.obtener);

/**
 * PATCH /api/solicitudes/:id/cancelar
 * Cancelar solicitud PENDIENTE.
 */
router.patch('/:id/cancelar', checkRole('USUARIO'), ctrl.cancelar);

/**
 * POST /api/solicitudes/:id/calificacion
 * Calificar al recolector tras recolección completada.
 */
router.post('/:id/calificacion', checkRole('USUARIO'), validate(calificarSchema), ctrl.calificar);

// ── Router empresa: /api/empresa/solicitudes ─────────────────────────────────
const empresaRouter = Router();
empresaRouter.use(auth, checkRole('EMPRESA'));

/**
 * GET  /api/empresa/solicitudes
 * Listar solicitudes recibidas. ?estado=PENDIENTE&page=1&limit=20
 */
empresaRouter.get('/', ctrl.listarEmpresa);

/**
 * PATCH /api/empresa/solicitudes/:id/aceptar
 * Aceptar solicitud y asignar recolector.
 */
empresaRouter.patch('/:id/aceptar', validate(aceptarSolicitudSchema), ctrl.aceptar);

/**
 * PATCH /api/empresa/solicitudes/:id/rechazar
 */
empresaRouter.patch('/:id/rechazar', validate(rechazarSolicitudSchema), ctrl.rechazar);

/**
 * PATCH /api/empresa/solicitudes/:id/en-transito
 */
empresaRouter.patch('/:id/en-transito', validate(enTransitoSchema), ctrl.enTransito);

/**
 * PATCH /api/empresa/solicitudes/:id/recolectada
 */
empresaRouter.patch('/:id/recolectada', validate(recolectadaSchema), ctrl.recolectada);

module.exports = { router, empresaRouter };
