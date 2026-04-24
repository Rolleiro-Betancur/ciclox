const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth.middleware');
const checkRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const controller = require('./puntos.controller');
const schema = require('./puntos.schema');

// Todas las rutas de puntos requieren estar autenticado como USUARIO
router.use(authMiddleware);
router.use(checkRole('USUARIO'));

// GET /api/puntos -> Saldo y resumen
router.get('/', controller.obtenerSaldo);

// GET /api/puntos/historial -> Historial de movimientos
router.get(
  '/historial',
  validate(schema.historialQuerySchema, 'query'),
  controller.obtenerHistorial
);

module.exports = router;
