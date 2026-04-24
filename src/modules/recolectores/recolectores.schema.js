// src/modules/recolectores/recolectores.schema.js
const { z } = require('zod');

/**
 * Schema para crear un recolector.
 * POST /api/empresa/recolectores
 */
const crearRecolectorSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  telefono: z
    .string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional(),

  foto_url: z
    .string()
    .url('La foto_url debe ser una URL válida')
    .max(300)
    .optional(),
});

/**
 * Schema para actualizar un recolector.
 * PUT /api/empresa/recolectores/:id
 */
const actualizarRecolectorSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),

  telefono: z
    .string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional(),

  foto_url: z
    .string()
    .url('La foto_url debe ser una URL válida')
    .max(300)
    .optional(),

  activo: z.boolean().optional(),
});

module.exports = { crearRecolectorSchema, actualizarRecolectorSchema };
