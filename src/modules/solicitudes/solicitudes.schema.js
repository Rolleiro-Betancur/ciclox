// src/modules/solicitudes/solicitudes.schema.js
const { z } = require('zod');

// ── Ítem de dispositivo dentro de una solicitud ──────────────────────────────
const dispositivoItemSchema = z.object({
  dispositivo_id: z
    .coerce
    .number({ required_error: 'dispositivo_id es requerido' })
    .int()
    .positive('dispositivo_id debe ser un entero positivo'),
  cantidad: z
    .coerce
    .number()
    .int()
    .positive('La cantidad debe ser mayor a 0')
    .default(1),
});

// ── Crear solicitud (USUARIO) ─────────────────────────────────────────────────
const crearSolicitudSchema = z
  .object({
    tipo_recoleccion: z.enum(['DOMICILIO', 'PUNTO_RECOLECCION'], {
      required_error: 'tipo_recoleccion es requerido',
      message: 'tipo_recoleccion debe ser DOMICILIO o PUNTO_RECOLECCION',
    }),

    dispositivos: z
      .array(dispositivoItemSchema)
      .min(1, 'Debe incluir al menos un dispositivo'),

    // Campos de domicilio (requeridos si tipo_recoleccion = DOMICILIO)
    direccion_recoleccion: z.string().max(300).optional(),
    ciudad: z.string().max(100).optional(),
    departamento: z.string().max(100).optional(),
    referencia: z.string().max(200).optional(),
    telefono_contacto: z.string().max(20).optional(),
    email_contacto: z.string().email().optional(),
    fecha_preferida: z.string().optional(), // 'YYYY-MM-DD'

    // Solo si tipo_recoleccion = PUNTO_RECOLECCION
    punto_recoleccion_id: z.number().int().positive().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.tipo_recoleccion === 'DOMICILIO') {
      if (!val.direccion_recoleccion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['direccion_recoleccion'],
          message: 'La dirección es requerida para recolección a domicilio',
        });
      }
      if (!val.ciudad) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ciudad'],
          message: 'La ciudad es requerida para recolección a domicilio',
        });
      }
      if (!val.telefono_contacto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['telefono_contacto'],
          message: 'El teléfono de contacto es requerido para recolección a domicilio',
        });
      }
    }
    if (val.tipo_recoleccion === 'PUNTO_RECOLECCION') {
      if (!val.punto_recoleccion_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['punto_recoleccion_id'],
          message: 'punto_recoleccion_id es requerido para tipo PUNTO_RECOLECCION',
        });
      }
    }
  });

// ── Calificar recolector (USUARIO) ────────────────────────────────────────────
const calificarSchema = z.object({
  estrellas: z
    .number({ required_error: 'Las estrellas son requeridas' })
    .int()
    .min(1, 'Mínimo 1 estrella')
    .max(5, 'Máximo 5 estrellas'),
  comentario: z.string().max(500).optional(),
});

// ── Aceptar solicitud (EMPRESA) ───────────────────────────────────────────────
const aceptarSolicitudSchema = z.object({
  recolector_id: z
    .number({ required_error: 'recolector_id es requerido' })
    .int()
    .positive(),
  hora_estimada_inicio: z
    .string({ required_error: 'hora_estimada_inicio es requerida' })
    .regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  hora_estimada_fin: z
    .string({ required_error: 'hora_estimada_fin es requerida' })
    .regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  comentario_empresa: z.string().max(500).optional(),
});

// ── Rechazar solicitud (EMPRESA) ──────────────────────────────────────────────
const rechazarSolicitudSchema = z.object({
  motivo_rechazo: z
    .string({ required_error: 'El motivo de rechazo es requerido' })
    .min(5, 'El motivo debe tener al menos 5 caracteres')
    .max(500),
});

// ── Marcar en tránsito (EMPRESA) ──────────────────────────────────────────────
const enTransitoSchema = z.object({
  latitud_recolector: z.number().optional(),
  longitud_recolector: z.number().optional(),
  tiempo_estimado_minutos: z.number().int().positive().optional(),
});

// ── Marcar recolectada (EMPRESA) ─────────────────────────────────────────────
const recolectadaSchema = z.object({
  puntos_otorgados: z
    .number({ required_error: 'puntos_otorgados es requerido' })
    .int()
    .positive('Los puntos deben ser un número positivo'),
  evidencia_url: z.string().url().optional(),
});

module.exports = {
  crearSolicitudSchema,
  calificarSchema,
  aceptarSolicitudSchema,
  rechazarSolicitudSchema,
  enTransitoSchema,
  recolectadaSchema,
};
