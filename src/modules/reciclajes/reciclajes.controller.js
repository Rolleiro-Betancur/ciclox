// src/modules/reciclajes/reciclajes.controller.js
const reciclajesService = require('./reciclajes.service');
const { success } = require('../../utils/response');

const crear = async (req, res, next) => {
  try {
    const reciclaje = await reciclajesService.crearReciclaje(req.user.id, req.body);
    return success(res, reciclaje, 201);
  } catch (err) {
    next(err);
  }
};

const completar = async (req, res, next) => {
  try {
    const result = await reciclajesService.completarReciclaje(req.params.id, req.user.id, req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const listar = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { estado } = req.query;
    const { rows, total } = await reciclajesService.listarReciclajes(req.user.id, { estado, page, limit });
    return success(res, rows, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { crear, completar, listar };
