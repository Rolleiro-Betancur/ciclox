// src/modules/recompensas/recompensas.routes.js
const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const recompensasController = require('./recompensas.controller');
const { getRecompensaSchema } = require('./recompensas.schema');

const router = express.Router();

// ── GET /api/recompensas ──────────────────────────────────────────────────────
router.get('/', authMiddleware, recompensasController.getAllRecompensas);

// ── GET /api/recompensas/:id ──────────────────────────────────────────────────
router.get(
  '/:id',
  authMiddleware,
  validate(getRecompensaSchema, 'params'),
  recompensasController.getRecompensaById
);

module.exports = router;
