// src/modules/canjes/canjes.schema.js
const { z } = require('zod');

const crearCanjeSchema = z.object({
  recompensa_id: z
    .number({ required_error: 'recompensa_id es requerido' })
    .int()
    .positive('recompensa_id debe ser un entero positivo'),
});

const confirmarCanjeSchema = z.object({
  codigo_texto: z
    .string({ required_error: 'codigo_texto es requerido' })
    .min(1, 'codigo_texto no puede estar vacío'),
});

module.exports = { crearCanjeSchema, confirmarCanjeSchema };
