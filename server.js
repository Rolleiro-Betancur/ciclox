// server.js — Entry point de Ciclox API
require('dotenv').config();

const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { pool } = require('./src/config/database');

const PORT = parseInt(env.PORT, 10);

const startServer = async () => {
  // Verificar conexión a la BD antes de arrancar
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('✅ Conexión a PostgreSQL establecida');
  } catch (err) {
    logger.error('❌ No se pudo conectar a PostgreSQL:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    logger.info(`🚀 Ciclox API corriendo en http://localhost:${PORT}`);
    logger.info(`📡 Ambiente: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
      await pool.end();
      logger.info('Pool de BD cerrado. Hasta pronto.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Manejo de promesas rechazadas no capturadas
  process.on('unhandledRejection', (reason) => {
    logger.error('Promesa rechazada no capturada:', reason);
  });
};

startServer();
