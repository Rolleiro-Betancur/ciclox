// src/utils/codigo.js
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Genera un código alfanumérico aleatorio tipo "ED24FH".
 * @param {number} [length=6]
 * @returns {string}
 */
const generarCodigo = (length = 6) => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
};

module.exports = { generarCodigo };
