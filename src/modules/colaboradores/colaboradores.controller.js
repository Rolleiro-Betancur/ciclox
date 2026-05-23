// src/modules/colaboradores/colaboradores.controller.js
const colaboradoresService = require('./colaboradores.service');
const { success } = require('../../utils/response');

// ── POST /api/empresa/colaboradores ──────────────────────────────────────────
const registrar = async (req, res, next) => {
  try {
    const result = await colaboradoresService.registrarColaborador(req.user.id, req.body);
    return success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/empresa/colaboradores ────────────────────────────────────────────
const listar = async (req, res, next) => {
  try {
    const result = await colaboradoresService.obtenerColaboradores(req.user.id);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/colaboradores/perfil ─────────────────────────────────────────────
const perfil = async (req, res, next) => {
  try {
    const result = await colaboradoresService.obtenerPerfil(req.user.id);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/empresa/colaboradores/:id/toggle ───────────────────────────────
const toggleActivo = async (req, res, next) => {
  try {
    const colaboradorId = parseInt(req.params.id, 10);
    const { activo }    = req.body;
    const result = await colaboradoresService.toggleActivo(colaboradorId, req.user.id, activo);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/empresa/colaboradores/:id ─────────────────────────────────────────
const actualizar = async (req, res, next) => {
  try {
    const colaboradorId = parseInt(req.params.id, 10);
    const result = await colaboradoresService.actualizarColaborador(colaboradorId, req.user.id, req.body);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = { registrar, listar, perfil, toggleActivo, actualizar };
