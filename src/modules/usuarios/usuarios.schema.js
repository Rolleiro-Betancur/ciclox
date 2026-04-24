const { z } = require('zod');

// Schema para actualizar perfil de usuario/ciudadano
const actualizarPerfilUsuarioSchema = z.object({
  nombre: z.string().min(2, 'Nombre muy corto').optional(),
  telefono: z.string().min(7, 'Teléfono muy corto').optional(),
  direccion: z.string().optional(),
  departamento: z.string().optional(),
});

// Schema para actualizar perfil de empresa
const actualizarPerfilEmpresaSchema = z.object({
  nombre_empresa: z.string().min(2, 'Nombre de empresa muy corto').optional(),
  nit: z.string().min(5, 'NIT muy corto').optional(),
  logo_url: z.string().url('URL de logo inválida').optional(),
  descripcion: z.string().optional(),
});

module.exports = {
  actualizarPerfilUsuarioSchema,
  actualizarPerfilEmpresaSchema,
};
