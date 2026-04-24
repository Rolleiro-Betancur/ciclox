// src/utils/fcm.js
const admin = require('firebase-admin');
const logger = require('../config/logger');

// Intentar inicializar Firebase Admin si existe la variable de entorno
// o si se provee el archivo de credenciales.
// Para este ejercicio, lo dejamos preparado pero con manejo de errores si no hay config.
let isInitialized = false;

try {
  // En un entorno real, usaríamos process.env.FIREBASE_CREDENTIALS_PATH
  // const serviceAccount = require(process.env.FIREBASE_CREDENTIALS_PATH);
  // admin.initializeApp({
  //   credential: admin.credential.cert(serviceAccount)
  // });
  // isInitialized = true;
  logger.info('Firebase Admin (FCM) preparado para configuración');
} catch (error) {
  logger.warn('FCM no inicializado: falta archivo de credenciales');
}

/**
 * Envía una notificación push a un token FCM específico.
 * 
 * @param {string} token - Token FCM del dispositivo destino
 * @param {object} notification - { title, body }
 * @param {object} data - Datos adicionales (opcional)
 */
const enviarPush = async (token, notification, data = {}) => {
  if (!token) return;

  if (!isInitialized) {
    logger.debug(`Push simulado a ${token}: ${notification.title} - ${notification.body}`);
    return;
  }

  try {
    const message = {
      notification,
      data,
      token,
    };

    const response = await admin.messaging().send(message);
    logger.info('Notificación push enviada exitosamente:', response);
    return response;
  } catch (error) {
    logger.error('Error enviando notificación push:', error.message);
  }
};

module.exports = { enviarPush };
