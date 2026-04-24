// src/modules/auth/auth.schema.js
const { z } = require('zod');

// ── Registro ─────────────────────────────────────────────────────────────────
const empresaSchema = z.object({
  nombre_empresa: z.string().min(2, 'Nombre de empresa requerido'),
  nit: z.string().min(5, 'NIT requerido'),
  descripcion: z.string().optional(),
});

const registroSchema = z
  .object({
    nombre: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    contrasena: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    telefono: z.string().min(7, 'Teléfono requerido'),
    rol: z.enum(['USUARIO', 'EMPRESA']),
    empresa: empresaSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.rol === 'EMPRESA' && !data.empresa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Los datos de empresa son requeridos para el rol EMPRESA',
        path: ['empresa'],
      });
    }
  });

// ── Login ─────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  contrasena: z.string().min(1, 'Contraseña requerida'),
});

// ── Recuperar contraseña ──────────────────────────────────────────────────────
const recuperarContrasenaSchema = z.object({
  email: z.string().email('Email inválido'),
});

// ── Verificar código ──────────────────────────────────────────────────────────
const verificarCodigoSchema = z.object({
  email: z.string().email('Email inválido'),
  codigo: z.string().length(6, 'El código debe tener 6 dígitos'),
});

// ── Cambiar contraseña ────────────────────────────────────────────────────────
const cambiarContrasenaSchema = z.object({
  email: z.string().email('Email inválido'),
  codigo: z.string().length(6, 'El código debe tener 6 dígitos'),
  nueva_contrasena: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

// ── FCM Token ─────────────────────────────────────────────────────────────────
const fcmTokenSchema = z.object({
  fcm_token: z.string().min(1, 'FCM token requerido'),
});

module.exports = {
  registroSchema,
  loginSchema,
  recuperarContrasenaSchema,
  verificarCodigoSchema,
  cambiarContrasenaSchema,
  fcmTokenSchema,
};
