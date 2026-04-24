// src/config/env.js
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // PostgreSQL
  DB_HOST: z.string().min(1, 'DB_HOST es requerido'),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string().min(1, 'DB_NAME es requerido'),
  DB_USER: z.string().min(1, 'DB_USER es requerido'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),

  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // BCrypt
  BCRYPT_ROUNDS: z.string().default('12'),

  // SMTP (Correo)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().min(1, 'SMTP_USER es requerido'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS es requerido'),
  SMTP_FROM: z.string().default('"Equipo Ciclox" <no-reply@ciclox.com>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
