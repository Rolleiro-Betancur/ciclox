const { Router } = require('express');
const puntosController = require('./puntos-recoleccion.controller');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkRole = require('../../middlewares/role.middleware');
const {
  puntoRecoleccionSchema,
  actualizarPuntoSchema,
} = require('./puntos-recoleccion.schema');

const router = Router();

// ── Rutas de Empresa (Solo Rol EMPRESA) ──────────────────────────────────────
router.use(authMiddleware);
router.get('/mis-puntos', checkRole('EMPRESA'), puntosController.listarPorEmpresa);

// ── Rutas Públicas / Usuarios (Requieren Login pero cualquier Rol) ───────────
router.get('/', puntosController.listarTodos);
router.get('/:id', puntosController.obtenerDetalle); // Simplificado sin regex

router.post(
  '/',
  checkRole('EMPRESA'),
  validate(puntoRecoleccionSchema),
  puntosController.crearPunto
);

router.put(
  '/:id',
  checkRole('EMPRESA'),
  validate(actualizarPuntoSchema),
  puntosController.actualizarPunto
);

router.delete(
  '/:id',
  checkRole('EMPRESA'),
  puntosController.eliminarPunto
);

module.exports = router;
