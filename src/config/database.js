// src/config/database.js
const { Pool } = require('pg');
const env = require('./env');
const logger = require('./logger');

const pool = new Pool({
  host: env.DB_HOST,
  port: parseInt(env.DB_PORT, 10),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,                  // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // desconectar clientes inactivos después de 30s
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.debug('Nueva conexión al pool de PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Error inesperado en cliente inactivo del pool', err);
  process.exit(-1);
});

/**
 * Ejecuta una query en el pool.
 * @param {string} text - Query SQL
 * @param {Array}  params - Parámetros
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtiene un cliente del pool para transacciones manuales.
 * Recuerda llamar client.release() cuando termines.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
