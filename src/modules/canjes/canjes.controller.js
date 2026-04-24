// src/modules/canjes/canjes.controller.js
const canjesService = require('./canjes.service');
const { success } = require('../../utils/response');

const crear = async (req, res, next) => {
  try {
    const canje = await canjesService.crearCanje(req.user.id, req.body.recompensa_id);
    return success(res, canje, 201);
  } catch (err) {
    next(err);
  }
};

const listar = async (req, res, next) => {
  try {
    const canjes = await canjesService.listarCanjes(req.user.id);
    return success(res, canjes);
  } catch (err) {
    next(err);
  }
};

const obtener = async (req, res, next) => {
  try {
    const canje = await canjesService.obtenerCanje(req.params.id, req.user.id);
    return success(res, canje);
  } catch (err) {
    next(err);
  }
};

const confirmar = async (req, res, next) => {
  try {
    const resultado = await canjesService.confirmarCanje(req.params.id, req.body.codigo_texto);
    return success(res, resultado);
  } catch (err) {
    next(err);
  }
};

const rechazar = async (req, res, next) => {
  try {
    const resultado = await canjesService.rechazarCanje(req.params.id);
    return success(res, resultado);
  } catch (err) {
    next(err);
  }
};

module.exports = { crear, listar, obtener, confirmar, rechazar };
