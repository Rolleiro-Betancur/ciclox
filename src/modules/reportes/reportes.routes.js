// src/modules/reportes/reportes.routes.js
const { Router } = require('express');
const ctrl      = require('./reportes.controller');
const auth      = require('../../middlewares/auth.middleware');
const checkRole = require('../../middlewares/role.middleware');

const router = Router();
router.use(auth, checkRole('EMPRESA'));

// GET /api/empresa/reportes — Listar reportes
router.get('/', ctrl.listar);

// POST /api/empresa/reportes — Generar reporte
router.post('/', ctrl.generar);

// GET /api/empresa/reportes/:id — Detalle de un reporte
router.get('/:id', ctrl.obtener);

module.exports = router;
