// src/modules/canjes/canjes.routes.js
const { Router } = require('express');
const ctrl       = require('./canjes.controller');
const auth       = require('../../middlewares/auth.middleware');
const checkRole  = require('../../middlewares/role.middleware');
const validate   = require('../../middlewares/validate.middleware');
const { crearCanjeSchema, confirmarCanjeSchema } = require('./canjes.schema');

const router = Router();
router.use(auth);

// POST /api/canjes — Canjear recompensa (genera QR)
router.post('/', checkRole('USUARIO'), validate(crearCanjeSchema), ctrl.crear);

// GET /api/canjes — Historial de canjes del usuario
router.get('/', checkRole('USUARIO'), ctrl.listar);

// GET /api/canjes/:id — Detalle de un canje (QR activo)
router.get('/:id', ctrl.obtener);

// PATCH /api/canjes/:id/confirmar — Confirmar canje (empresa/aliado)
router.patch('/:id/confirmar', checkRole('EMPRESA'), validate(confirmarCanjeSchema), ctrl.confirmar);

// PATCH /api/canjes/:id/rechazar — Rechazar canje (empresa/aliado)
router.patch('/:id/rechazar', checkRole('EMPRESA'), ctrl.rechazar);

module.exports = router;
