const { z } = require('zod');

const puntoRecoleccionSchema = z.object({
  nombre: z.string().min(3, 'El nombre es muy corto'),
  direccion: z.string().min(5, 'La dirección es requerida'),
  barrio: z.string().optional(),
  ciudad: z.string().min(2, 'La ciudad es requerida'),
  latitud: z.number({ required_error: 'La latitud es requerida' }),
  longitud: z.number({ required_error: 'La longitud es requerida' }),
  descripcion: z.string().optional(),
  horario_atencion: z.string().optional(),
  telefono: z.string().optional(),
  tipos_aceptados: z.string().optional(), // Ej: "Celulares, Baterías, Laptops"
});

const actualizarPuntoSchema = puntoRecoleccionSchema.partial();

module.exports = {
  puntoRecoleccionSchema,
  actualizarPuntoSchema,
};
