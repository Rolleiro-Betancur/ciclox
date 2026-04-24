// src/modules/auth/auth.routes.js
const { Router } = require('express');
const authController = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const {
  registroSchema,
  loginSchema,
  recuperarContrasenaSchema,
  verificarCodigoSchema,
  cambiarContrasenaSchema,
  fcmTokenSchema,
} = require('./auth.schema');

const router = Router();

// POST /api/auth/registro
router.post('/registro', validate(registroSchema), authController.registro);

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/recuperar-contrasena
router.post(
  '/recuperar-contrasena',
  validate(recuperarContrasenaSchema),
  authController.recuperarContrasena,
);

// POST /api/auth/verificar-codigo
router.post(
  '/verificar-codigo',
  validate(verificarCodigoSchema),
  authController.verificarCodigo,
);

// POST /api/auth/cambiar-contrasena
router.post(
  '/cambiar-contrasena',
  validate(cambiarContrasenaSchema),
  authController.cambiarContrasena,
);

// POST /api/auth/fcm-token 🔒
router.post(
  '/fcm-token',
  authMiddleware,
  validate(fcmTokenSchema),
  authController.fcmToken,
);

module.exports = router;
