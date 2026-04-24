const { Router } = require('express');
const usuariosController = require('./usuarios.controller');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const checkRole = require('../../middlewares/role.middleware');
const {
  actualizarPerfilUsuarioSchema,
  actualizarPerfilEmpresaSchema,
} = require('./usuarios.schema');

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authMiddleware);

// ── Perfil Ciudadano/Usuario ─────────────────────────────────────────────────
router.get('/perfil', usuariosController.obtenerPerfil);

router.put(
  '/perfil',
  validate(actualizarPerfilUsuarioSchema),
  usuariosController.actualizarPerfil
);

// ── Perfil Empresa ───────────────────────────────────────────────────────────
// Solo accesible si el token tiene rol 'EMPRESA'
router.get(
  '/empresa/perfil',
  checkRole('EMPRESA'),
  usuariosController.obtenerPerfilEmpresa
);

router.put(
  '/empresa/perfil',
  checkRole('EMPRESA'),
  validate(actualizarPerfilEmpresaSchema),
  usuariosController.actualizarPerfilEmpresa
);

module.exports = router;
