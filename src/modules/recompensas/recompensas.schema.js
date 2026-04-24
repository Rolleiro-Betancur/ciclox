// src/modules/recompensas/recompensas.schema.js
const { z } = require('zod');

const getRecompensaSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número válido'),
});

module.exports = {
  getRecompensaSchema,
};
