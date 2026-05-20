// src/modules/soporte/soporte.schema.js
const { z } = require('zod');

const crearSoporteEmpresaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  asunto: z.string().min(3, 'El asunto debe tener al menos 3 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
});

module.exports = {
  crearSoporteEmpresaSchema,
};
