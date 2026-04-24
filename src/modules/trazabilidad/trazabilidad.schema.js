// src/modules/trazabilidad/trazabilidad.schema.js
const { z } = require('zod');

// Tipos de movimiento que la empresa puede registrar manualmente
const TiposMovimiento = [
  'RECIBIDO_PUNTO',
  'RECIBIDO_EMPRESA',
  'EN_CLASIFICACION',
  'EN_DESMANTELAMIENTO',
  'EN_RECICLAJE',
  'RECICLADO',
  'CERTIFICADO_EMITIDO',
];

// ── Registrar movimiento RAEE (POST /api/empresa/trazabilidad) ──────────────
const registrarMovimientoSchema = z.object({
  dispositivo_id: z
    .number({ required_error: 'dispositivo_id es requerido' })
    .int()
    .positive('dispositivo_id debe ser un entero positivo'),
  solicitud_id: z.number().int().positive().optional().nullable(),
  tipo: z.enum(TiposMovimiento, {
    required_error: 'tipo es requerido',
    invalid_type_error: `tipo debe ser uno de: ${TiposMovimiento.join(', ')}`,
  }),
  ubicacion_origen: z.string().max(200).optional().nullable(),
  ubicacion_destino: z.string().max(200).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  latitud: z.number().min(-90).max(90).optional().nullable(),
  longitud: z.number().min(-180).max(180).optional().nullable(),
  evidencia_url: z.string().url('Formato de URL inválido').optional().nullable(),
});

module.exports = {
  registrarMovimientoSchema,
};
