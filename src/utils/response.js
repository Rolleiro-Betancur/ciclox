// src/utils/response.js

/**
 * Envía una respuesta de éxito estándar.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} [statusCode=200]
 * @param {object} [meta] - Metadatos de paginación
 */
const success = (res, data, statusCode = 200, meta = null) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Envía una respuesta de error estándar.
 * @param {import('express').Response} res
 * @param {string} code    - Código de error (ej: 'NOT_FOUND')
 * @param {string} message - Mensaje legible
 * @param {number} [statusCode=500]
 */
const error = (res, code, message, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};

module.exports = { success, error };
