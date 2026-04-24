const usuariosService = require('./usuarios.service');
const { success } = require('../../utils/response');

// ── GET /api/usuarios/perfil ─────────────────────────────────────────────────
const obtenerPerfil = async (req, res, next) => {
  try {
    const perfil = await usuariosService.obtenerPerfil(req.user.id);
    return success(res, perfil);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/usuarios/perfil ─────────────────────────────────────────────────
const actualizarPerfil = async (req, res, next) => {
  try {
    const perfilActualizado = await usuariosService.actualizarPerfil(req.user.id, req.body);
    return success(res, perfilActualizado);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/usuarios/empresa/perfil ─────────────────────────────────────────
const obtenerPerfilEmpresa = async (req, res, next) => {
  try {
    const perfilEmpresa = await usuariosService.obtenerPerfilEmpresa(req.user.id);
    return success(res, perfilEmpresa);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/usuarios/empresa/perfil ─────────────────────────────────────────
const actualizarPerfilEmpresa = async (req, res, next) => {
  try {
    const perfilActualizado = await usuariosService.actualizarPerfilEmpresa(req.user.id, req.body);
    return success(res, perfilActualizado);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  obtenerPerfil,
  actualizarPerfil,
  obtenerPerfilEmpresa,
  actualizarPerfilEmpresa,
};
