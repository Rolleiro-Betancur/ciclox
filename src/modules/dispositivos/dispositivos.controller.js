const dispositivosService = require('./dispositivos.service');
const { success } = require('../../utils/response');

// ── GET /api/dispositivos ────────────────────────────────────────────────────
const obtenerDispositivos = async (req, res, next) => {
  try {
    const { estado, tipo } = req.query;
    const dispositivos = await dispositivosService.obtenerDispositivos(req.user.id, { estado, tipo });
    return success(res, dispositivos);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/dispositivos ───────────────────────────────────────────────────
const crearDispositivo = async (req, res, next) => {
  try {
    const nuevoDispositivo = await dispositivosService.crearDispositivo(req.user.id, req.body);
    return success(res, nuevoDispositivo, 201);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/dispositivos/:id ────────────────────────────────────────────────
const obtenerDispositivoPorId = async (req, res, next) => {
  try {
    const dispositivo = await dispositivosService.obtenerDispositivoPorId(req.params.id, req.user.id);
    return success(res, dispositivo);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/dispositivos/:id ────────────────────────────────────────────────
const actualizarDispositivo = async (req, res, next) => {
  try {
    const dispositivoActualizado = await dispositivosService.actualizarDispositivo(
      req.params.id, 
      req.user.id, 
      req.body
    );
    return success(res, dispositivoActualizado);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/dispositivos/:id ─────────────────────────────────────────────
const eliminarDispositivo = async (req, res, next) => {
  try {
    const resultado = await dispositivosService.eliminarDispositivo(req.params.id, req.user.id);
    return success(res, resultado);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  obtenerDispositivos,
  crearDispositivo,
  obtenerDispositivoPorId,
  actualizarDispositivo,
  eliminarDispositivo,
};
