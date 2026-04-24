// src/middlewares/auth.middleware.js
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/**
 * Verifica que el request tenga un JWT válido en el header Authorization.
 * Inyecta req.user = { id, email, rol } si es válido.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'UNAUTHORIZED', 'Token de autorización requerido', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = payload; // { id, email, rol }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'UNAUTHORIZED', 'El token ha expirado', 401);
    }
    return error(res, 'UNAUTHORIZED', 'Token inválido', 401);
  }
};

module.exports = authMiddleware;
