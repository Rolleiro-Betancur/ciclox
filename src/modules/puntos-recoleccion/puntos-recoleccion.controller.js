const puntosService = require('./puntos-recoleccion.service');
const { success } = require('../../utils/response');

// ── GET /api/puntos-recoleccion ──────────────────────────────────────────────
const listarTodos = async (req, res, next) => {
  try {
    const { ciudad } = req.query;
    const puntos = await puntosService.obtenerTodosActivos(ciudad);
    return success(res, puntos);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/puntos-recoleccion/mis-puntos ────────────────────────────────────
const listarPorEmpresa = async (req, res, next) => {
  try {
    const puntos = await puntosService.obtenerPorEmpresa(req.user.id);
    return success(res, puntos);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/puntos-recoleccion/:id ──────────────────────────────────────────
const obtenerDetalle = async (req, res, next) => {
  try {
    const punto = await puntosService.obtenerPorId(req.params.id);
    return success(res, punto);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/puntos-recoleccion ─────────────────────────────────────────────
const crearPunto = async (req, res, next) => {
  try {
    const nuevoPunto = await puntosService.crearPunto(req.user.id, req.body);
    return success(res, nuevoPunto, 201);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/puntos-recoleccion/:id ──────────────────────────────────────────
const actualizarPunto = async (req, res, next) => {
  try {
    const puntoActualizado = await puntosService.actualizarPunto(req.params.id, req.user.id, req.body);
    return success(res, puntoActualizado);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/puntos-recoleccion/:id ───────────────────────────────────────
const eliminarPunto = async (req, res, next) => {
  try {
    const resultado = await puntosService.eliminarPunto(req.params.id, req.user.id);
    return success(res, resultado);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listarTodos,
  listarPorEmpresa,
  obtenerDetalle,
  crearPunto,
  actualizarPunto,
  eliminarPunto,
};
