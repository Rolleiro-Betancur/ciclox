const { z } = require('zod');

const historialQuerySchema = z.object({
  page: z.preprocess((a) => (a === undefined ? 1 : Number(a)), z.number().int().positive()),
  limit: z.preprocess((a) => (a === undefined ? 20 : Number(a)), z.number().int().positive().max(100)),
});

module.exports = {
  historialQuerySchema,
};
