const { Router } = require('express');
const dispositivosController = require('./dispositivos.controller');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const {
  crearDispositivoSchema,
  actualizarDispositivoSchema,
} = require('./dispositivos.schema');

const router = Router();

// Todas las rutas de dispositivos requieren autenticación
router.use(authMiddleware);

// GET /api/dispositivos
router.get('/', dispositivosController.obtenerDispositivos);

// POST /api/dispositivos
router.post(
  '/',
  validate(crearDispositivoSchema),
  dispositivosController.crearDispositivo
);

// GET /api/dispositivos/:id
router.get('/:id', dispositivosController.obtenerDispositivoPorId);

// PUT /api/dispositivos/:id
router.put(
  '/:id',
  validate(actualizarDispositivoSchema),
  dispositivosController.actualizarDispositivo
);

// DELETE /api/dispositivos/:id
router.delete('/:id', dispositivosController.eliminarDispositivo);

module.exports = router;
