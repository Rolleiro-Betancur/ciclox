// src/modules/notificaciones/notificaciones.controller.js
const notificacionesService = require('./notificaciones.service');
const { success } = require('../../utils/response');

const listar = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { leida } = req.query;

    const { rows, meta } = await notificacionesService.listarNotificaciones(
      req.user.id,
      { leida, page, limit },
    );
    return success(res, rows, 200, meta);
  } catch (err) {
    next(err);
  }
};

const marcarLeida = async (req, res, next) => {
  try {
    const result = await notificacionesService.marcarLeida(req.params.id, req.user.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const marcarTodasLeidas = async (req, res, next) => {
  try {
    const result = await notificacionesService.marcarTodasLeidas(req.user.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, marcarLeida, marcarTodasLeidas };
