// src/modules/soporte/soporte.controller.js
const soporteService = require('./soporte.service');
const { success } = require('../../utils/response');

const enviarReporte = async (req, res, next) => {
  try {
    const { mensaje } = req.body;
    const { nombre, email } = req.user; // viene del token JWT

    if (!mensaje || mensaje.trim().length < 10) {
      return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres.' });
    }

    await soporteService.enviarReporte({
      nombreColaborador: nombre,
      email,
      mensaje: mensaje.trim(),
    });

    return res.status(200).json({ ok: true, message: 'Reporte enviado correctamente.' });
  } catch (err) {
    next(err);
  }
};

const crearSoporteEmpresa = async (req, res, next) => {
  try {
    const { nombre, apellido, asunto, descripcion } = req.body;
    const empresaId = req.user.id; // viene de req.user (id del usuario autenticado)

    const soporte = await soporteService.crearSoporteEmpresa({
      empresaId,
      nombre,
      apellido,
      asunto,
      descripcion,
    });

    return success(res, soporte, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { enviarReporte, crearSoporteEmpresa };

