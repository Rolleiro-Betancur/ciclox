// src/utils/qr.js
const QRCode = require('qrcode');

/**
 * Genera un QR code en formato base64 (data URL).
 * @param {string} text - Texto o URL a codificar
 * @returns {Promise<string>} data URL base64
 */
const generarQR = async (text) => {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 2,
  });
};

module.exports = { generarQR };
