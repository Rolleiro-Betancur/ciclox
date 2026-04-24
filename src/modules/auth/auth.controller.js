// src/modules/auth/auth.controller.js
const authService = require('./auth.service');
const { success } = require('../../utils/response');

// ── POST /api/auth/registro ───────────────────────────────────────────────────
const registro = async (req, res, next) => {
  try {
    const result = await authService.registro(req.body);
    return success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/recuperar-contrasena ──────────────────────────────────────
const recuperarContrasena = async (req, res, next) => {
  try {
    const result = await authService.recuperarContrasena(req.body);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/verificar-codigo ──────────────────────────────────────────
const verificarCodigo = async (req, res, next) => {
  try {
    const result = await authService.verificarCodigo(req.body);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/cambiar-contrasena ────────────────────────────────────────
const cambiarContrasena = async (req, res, next) => {
  try {
    const result = await authService.cambiarContrasena(req.body);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/fcm-token 🔒 ──────────────────────────────────────────────
const fcmToken = async (req, res, next) => {
  try {
    const result = await authService.guardarFcmToken(req.user.id, req.body.fcm_token);
    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registro,
  login,
  recuperarContrasena,
  verificarCodigo,
  cambiarContrasena,
  fcmToken,
};
