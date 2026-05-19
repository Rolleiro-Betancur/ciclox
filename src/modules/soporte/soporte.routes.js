// src/modules/soporte/soporte.routes.js
const { Router } = require('express');
const ctrl = require('./soporte.controller');
const auth = require('../../middlewares/auth.middleware');

const router = Router();

// POST /api/soporte/reporte — Enviar reporte por correo (requiere login)
router.post('/reporte', auth, ctrl.enviarReporte);

module.exports = router;
