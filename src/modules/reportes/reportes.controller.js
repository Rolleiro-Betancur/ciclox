// src/modules/reportes/reportes.controller.js
const reportesService = require('./reportes.service');
const { success } = require('../../utils/response');

const generar = async (req, res, next) => {
  try {
    const reporte = await reportesService.generarReporte(req.user.id, req.body);
    return success(res, reporte, 201);
  } catch (err) {
    next(err);
  }
};

const listar = async (req, res, next) => {
  try {
    const reportes = await reportesService.listarReportes(req.user.id);
    return success(res, reportes);
  } catch (err) {
    next(err);
  }
};

const obtener = async (req, res, next) => {
  try {
    const reporte = await reportesService.obtenerReporte(req.params.id, req.user.id);
    return success(res, reporte);
  } catch (err) {
    next(err);
  }
};

module.exports = { generar, listar, obtener };
