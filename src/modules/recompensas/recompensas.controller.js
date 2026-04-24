// src/modules/recompensas/recompensas.controller.js
const { success } = require('../../utils/response');
const recompensasService = require('./recompensas.service');

const getAllRecompensas = async (req, res, next) => {
  try {
    const recompensas = await recompensasService.getAllRecompensas();
    return success(res, recompensas);
  } catch (error) {
    next(error);
  }
};

const getRecompensaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recompensa = await recompensasService.getRecompensaById(id);
    return success(res, recompensa);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRecompensas,
  getRecompensaById,
};
