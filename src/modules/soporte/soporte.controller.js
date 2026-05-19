// src/modules/soporte/soporte.controller.js
const soporteService = require('./soporte.service');

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

module.exports = { enviarReporte };
