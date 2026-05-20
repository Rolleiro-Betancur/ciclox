// src/modules/soporte/soporte.routes.js
const { Router } = require('express');
const ctrl = require('./soporte.controller');
const auth = require('../../middlewares/auth.middleware');
const checkRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { crearSoporteEmpresaSchema } = require('./soporte.schema');

const router = Router();

// POST /api/soporte/reporte — Enviar reporte por correo (requiere login)
router.post('/reporte', auth, ctrl.enviarReporte);

// POST /api/soporte/empresa — Crear ticket de soporte para empresa (requiere login y rol EMPRESA)
router.post(
  '/empresa',
  auth,
  checkRole('EMPRESA'),
  validate(crearSoporteEmpresaSchema),
  ctrl.crearSoporteEmpresa
);

module.exports = router;

