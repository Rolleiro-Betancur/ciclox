// src/middlewares/role.middleware.js
const { error } = require('../utils/response');

/**
 * Fábrica de middleware para verificar rol(es) del usuario autenticado.
 * Debe usarse DESPUÉS de authMiddleware.
 *
 * @param {...string} roles - Roles permitidos, ej: 'USUARIO', 'EMPRESA'
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get('/ruta', authMiddleware, checkRole('EMPRESA'), controller.fn);
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'UNAUTHORIZED', 'No autenticado', 401);
    }

    if (!roles.includes(req.user.rol)) {
      return error(
        res,
        'FORBIDDEN',
        `Acceso restringido a: ${roles.join(', ')}`,
        403,
      );
    }

    next();
  };
};

module.exports = checkRole;
