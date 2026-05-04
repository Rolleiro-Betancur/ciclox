// src/modules/colaboradores/colaboradores.schema.js
const { z } = require('zod');

// ── Registro de colaborador (lo hace la EMPRESA) ──────────────────────────────
const registrarColaboradorSchema = z.object({
  nombre:           z.string().min(2,  'Nombre requerido'),
  email:            z.string().email('Email inválido'),
  contrasena:       z.string().min(8,  'La contraseña debe tener al menos 8 caracteres'),
  telefono:         z.string().min(7,  'Teléfono requerido'),
  tipo_documento:   z.enum(
    ['CEDULA_CIUDADANIA', 'CEDULA_EXTRANJERIA', 'PASAPORTE', 'TARJETA_IDENTIDAD', 'NIT'],
    { message: 'tipo_documento inválido. Valores: CEDULA_CIUDADANIA, CEDULA_EXTRANJERIA, PASAPORTE, TARJETA_IDENTIDAD, NIT' },
  ),
  numero_documento: z.string().min(4,  'Número de documento requerido'),
});

// ── Toggle activo / inactivo ──────────────────────────────────────────────────
const toggleActivoSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es requerido' }),
});

module.exports = {
  registrarColaboradorSchema,
  toggleActivoSchema,
};
