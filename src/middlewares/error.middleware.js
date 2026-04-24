// src/middlewares/error.middleware.js
const logger = require('../config/logger');

/**
 * Manejador global de errores de Express.
 * Debe registrarse ÚLTIMO en app.js con app.use(errorMiddleware).
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
  });

  // Errores operacionales marcados manualmente
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }

  // Error inesperado (bug, DB caída, etc.)
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : err.message,
    },
  });
};

module.exports = errorMiddleware;
