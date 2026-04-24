// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Genera un JWT con el payload dado.
 * @param {{ id: number, email: string, rol: string }} payload
 * @returns {string}
 */
const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Verifica y decodifica un JWT.
 * @param {string} token
 * @returns {{ id: number, email: string, rol: string }}
 * @throws {jwt.JsonWebTokenError}
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
