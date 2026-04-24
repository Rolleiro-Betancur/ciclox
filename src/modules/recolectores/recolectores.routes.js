// src/modules/recolectores/recolectores.routes.js
const { Router } = require('express');
const controller = require('./recolectores.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { crearRecolectorSchema, actualizarRecolectorSchema } = require('./recolectores.schema');

const router = Router();

// Todos los endpoints requieren JWT y rol EMPRESA
router.use(authMiddleware, checkRole('EMPRESA'));

/**
 * GET    /api/empresa/recolectores
 * Lista recolectores de la empresa autenticada.
 * Query: ?activo=true|false
 */
router.get('/', controller.listar);

/**
 * POST   /api/empresa/recolectores
 * Crea un nuevo recolector.
 */
router.post('/', validate(crearRecolectorSchema), controller.crear);

/**
 * GET    /api/empresa/recolectores/:id
 * Detalle de un recolector.
 */
router.get('/:id', controller.obtener);

/**
 * PUT    /api/empresa/recolectores/:id
 * Actualiza datos del recolector (nombre, telefono, foto_url, activo).
 */
router.put('/:id', validate(actualizarRecolectorSchema), controller.actualizar);

/**
 * DELETE /api/empresa/recolectores/:id
 * Soft-delete: activo → false.
 */
router.delete('/:id', controller.desactivar);

/**
 * GET    /api/empresa/recolectores/:id/calificaciones
 * Historial de calificaciones del recolector.
 * Query: ?page=1&limit=20
 */
router.get('/:id/calificaciones', controller.obtenerCalificaciones);

module.exports = router;
