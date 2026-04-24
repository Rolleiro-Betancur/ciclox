const service = require('./puntos.service');

const obtenerSaldo = async (req, res, next) => {
  try {
    const data = await service.obtenerResumenPuntos(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const obtenerHistorial = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await service.listarHistorialMovimientos(req.user.id, { page, limit });

    const totalPages = Math.ceil(result.total / limit) || 1;

    res.status(200).json({
      success: true,
      data: result.rows,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerSaldo,
  obtenerHistorial,
};
