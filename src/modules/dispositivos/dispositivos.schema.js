const { z } = require('zod');

// Enums baseados en la base de datos
const TiposDispositivo = ['CELULAR', 'COMPUTADOR', 'TABLET', 'TELEVISOR', 'IMPRESORA', 'BATERIA', 'CARGADOR', 'ELECTRODOMESTICO', 'OTRO'];
const EstadosFisicos = ['ENCIENDE', 'DANIADO', 'ROTO', 'COMPLETO', 'INCOMPLETO'];

// ── Crear Dispositivo ────────────────────────────────────────────────────────
const crearDispositivoSchema = z.object({
  tipo: z.enum(TiposDispositivo, { required_error: 'Tipo de dispositivo requerido' }),
  marca: z.string().min(1, 'Marca requerida'),
  modelo: z.string().optional(),
  serial_numero: z.string().optional(),
  descripcion: z.string().optional(),
  foto_url: z.string().url('Formato de URL inválido para la foto').optional(),
  estado_fisico: z.enum(EstadosFisicos).default('ENCIENDE'),
  anio_fabricacion: z.number().int().min(1980).max(new Date().getFullYear()).optional(),
});

// ── Actualizar Dispositivo ───────────────────────────────────────────────────
const actualizarDispositivoSchema = z.object({
  tipo: z.enum(TiposDispositivo).optional(),
  marca: z.string().min(1).optional(),
  modelo: z.string().optional(),
  serial_numero: z.string().optional(),
  descripcion: z.string().optional(),
  foto_url: z.string().url().optional(),
  estado_fisico: z.enum(EstadosFisicos).optional(),
  anio_fabricacion: z.number().int().min(1980).max(new Date().getFullYear()).optional(),
});

module.exports = {
  crearDispositivoSchema,
  actualizarDispositivoSchema,
};
