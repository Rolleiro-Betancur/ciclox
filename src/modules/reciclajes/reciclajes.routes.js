// src/modules/reciclajes/reciclajes.routes.js
const { Router } = require('express');
const ctrl       = require('./reciclajes.controller');
const auth       = require('../../middlewares/auth.middleware');
const checkRole  = require('../../middlewares/role.middleware');

const router = Router();
router.use(auth, checkRole('EMPRESA'));

// POST /api/empresa/reciclajes
router.post('/', ctrl.crear);

// PATCH /api/empresa/reciclajes/:id/completar
router.patch('/:id/completar', ctrl.completar);

// GET /api/empresa/reciclajes
router.get('/', ctrl.listar);

module.exports = router;
