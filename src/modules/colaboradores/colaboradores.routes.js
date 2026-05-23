// src/modules/colaboradores/colaboradores.routes.js
const { Router }       = require('express');
const colaboradoresController = require('./colaboradores.controller');
const validate         = require('../../middlewares/validate.middleware');
const authMiddleware   = require('../../middlewares/auth.middleware');
const checkRole        = require('../../middlewares/role.middleware');
const {
  registrarColaboradorSchema,
  toggleActivoSchema,
  actualizarColaboradorSchema,
} = require('./colaboradores.schema');

// ── Router empresa (prefijo: /api/empresa/colaboradores) ──────────────────────
const empresaRouter = Router();

// POST /api/empresa/colaboradores   🔒 EMPRESA
empresaRouter.post(
  '/',
  authMiddleware,
  checkRole('EMPRESA'),
  validate(registrarColaboradorSchema),
  colaboradoresController.registrar,
);

// GET /api/empresa/colaboradores    🔒 EMPRESA
empresaRouter.get(
  '/',
  authMiddleware,
  checkRole('EMPRESA'),
  colaboradoresController.listar,
);

// PATCH /api/empresa/colaboradores/:id/toggle  🔒 EMPRESA
empresaRouter.patch(
  '/:id/toggle',
  authMiddleware,
  checkRole('EMPRESA'),
  validate(toggleActivoSchema),
  colaboradoresController.toggleActivo,
);

// PUT /api/empresa/colaboradores/:id  🔒 EMPRESA
empresaRouter.put(
  '/:id',
  authMiddleware,
  checkRole('EMPRESA'),
  validate(actualizarColaboradorSchema),
  colaboradoresController.actualizar,
);

// ── Router colaborador (prefijo: /api/colaboradores) ──────────────────────────
const colaboradorRouter = Router();

// GET /api/colaboradores/perfil     🔒 COLABORADOR
colaboradorRouter.get(
  '/perfil',
  authMiddleware,
  checkRole('COLABORADOR'),
  colaboradoresController.perfil,
);

module.exports = { empresaRouter, colaboradorRouter };
