// src/utils/bcrypt.js
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const ROUNDS = parseInt(env.BCRYPT_ROUNDS, 10);

/**
 * Hashea una contraseña en texto plano.
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = (password) => bcrypt.hash(password, ROUNDS);

/**
 * Compara una contraseña en texto plano con un hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = { hashPassword, comparePassword };
