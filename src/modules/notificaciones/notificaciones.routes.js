// src/modules/notificaciones/notificaciones.routes.js
const { Router } = require('express');
const ctrl = require('./notificaciones.controller');
const auth = require('../../middlewares/auth.middleware');

const router = Router();
router.use(auth);

// GET /api/notificaciones — Listar notificaciones del usuario
router.get('/', ctrl.listar);

// PATCH /api/notificaciones/:id/leer — Marcar una como leída
router.patch('/:id/leer', ctrl.marcarLeida);

// PATCH /api/notificaciones/leer-todas — Marcar todas como leídas
router.patch('/leer-todas', ctrl.marcarTodasLeidas);

module.exports = router;
