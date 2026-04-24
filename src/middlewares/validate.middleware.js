// src/middlewares/validate.middleware.js
const { error } = require('../utils/response');

/**
 * Middleware de validación con Zod.
 * Valida req.body contra el schema provisto.
 * Si falla, responde con 422 VALIDATION_ERROR detallando los campos.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/ruta', validate(miSchema), controller.fn);
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
          fields,
        },
      });
    }

    // Reemplaza el target con los datos parseados y coercionados por zod
    req[target] = result.data;
    next();
  };
};

module.exports = validate;
