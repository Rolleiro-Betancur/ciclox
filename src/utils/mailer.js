const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT, 10),
  secure: env.SMTP_PORT === '465', // true for 465, false for other ports like 587
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Envía un correo electrónico
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} html - Contenido en formato HTML
 */
const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    logger.info(`📧 Correo enviado a ${to} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    logger.error(`❌ Error enviando correo a ${to}:`, error.message);
    return false;
  }
};

module.exports = { sendMail };
