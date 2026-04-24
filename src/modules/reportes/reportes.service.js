// src/modules/reportes/reportes.service.js
const db = require('../../config/database');

const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

/**
 * Generar reporte ambiental para un periodo.
 * Agrega datos de reciclajes completados en el rango de fechas.
 */
const generarReporte = async (empresaId, datos) => {
  const { periodo_inicio, periodo_fin } = datos;

  // Agregar estadísticas del periodo
  const { rows: stats } = await db.query(
    `SELECT
       COUNT(DISTINCT r.dispositivo_id)::int AS total_dispositivos_gestionados,
       COUNT(DISTINCT sr.id)::int AS total_solicitudes_completadas,
       COALESCE(SUM(r.peso_kg), 0) AS total_peso_kg,
       COALESCE(SUM(r.co2_evitado_kg), 0) AS total_co2_evitado_kg
     FROM reciclajes r
     LEFT JOIN solicitud_dispositivos sd ON sd.dispositivo_id = r.dispositivo_id
     LEFT JOIN solicitudes_recoleccion sr ON sr.id = sd.solicitud_id
     WHERE r.empresa_id = $1
       AND r.fecha_inicio >= $2
       AND r.fecha_inicio <= $3`,
    [empresaId, periodo_inicio, periodo_fin],
  );

  const s = stats[0];

  // Desglose por tipo de dispositivo
  const { rows: desglose } = await db.query(
    `SELECT d.tipo, COUNT(*)::int AS cantidad
     FROM reciclajes r
     JOIN dispositivos d ON d.id = r.dispositivo_id
     WHERE r.empresa_id = $1
       AND r.fecha_inicio >= $2
       AND r.fecha_inicio <= $3
     GROUP BY d.tipo
     ORDER BY cantidad DESC`,
    [empresaId, periodo_inicio, periodo_fin],
  );

  // Desglose por metodología
  const { rows: desgloseMetodologia } = await db.query(
    `SELECT metodologia, COUNT(*)::int AS cantidad
     FROM reciclajes
     WHERE empresa_id = $1
       AND fecha_inicio >= $2
       AND fecha_inicio <= $3
     GROUP BY metodologia
     ORDER BY cantidad DESC`,
    [empresaId, periodo_inicio, periodo_fin],
  );

  const { rows: reporteRows } = await db.query(
    `INSERT INTO reportes_ambientales (
       empresa_id, periodo_inicio, periodo_fin,
       total_dispositivos_gestionados, total_solicitudes_completadas,
       total_peso_kg, total_co2_evitado_kg,
       desglose_dispositivos_json, desglose_metodologia_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id::int, periodo_inicio, periodo_fin,
               total_dispositivos_gestionados, total_solicitudes_completadas,
               total_peso_kg, total_co2_evitado_kg, estado`,
    [
      empresaId, periodo_inicio, periodo_fin,
      s.total_dispositivos_gestionados,
      s.total_solicitudes_completadas,
      s.total_peso_kg,
      s.total_co2_evitado_kg,
      JSON.stringify(desglose),
      JSON.stringify(desgloseMetodologia),
    ],
  );

  return reporteRows[0];
};

/**
 * Listar reportes de la empresa.
 */
const listarReportes = async (empresaId) => {
  const { rows } = await db.query(
    `SELECT
       id::int, periodo_inicio, periodo_fin,
       total_dispositivos_gestionados, total_solicitudes_completadas,
       total_peso_kg, total_co2_evitado_kg,
       estado, fecha_generacion
     FROM reportes_ambientales
     WHERE empresa_id = $1
     ORDER BY fecha_generacion DESC`,
    [empresaId],
  );
  return rows;
};

/**
 * Detalle de un reporte.
 */
const obtenerReporte = async (reporteId, empresaId) => {
  const { rows } = await db.query(
    `SELECT
       id::int, periodo_inicio, periodo_fin,
       total_dispositivos_gestionados, total_solicitudes_completadas,
       total_peso_kg, total_co2_evitado_kg,
       desglose_dispositivos_json, desglose_metodologia_json,
       estado, reporte_url, fecha_generacion
     FROM reportes_ambientales
     WHERE id = $1 AND empresa_id = $2`,
    [reporteId, empresaId],
  );

  if (!rows[0]) throw opError('Reporte no encontrado', 'NOT_FOUND', 404);

  // Parsear JSON si vienen como string
  const reporte = rows[0];
  if (typeof reporte.desglose_dispositivos_json === 'string') {
    reporte.desglose_dispositivos = JSON.parse(reporte.desglose_dispositivos_json);
  }
  if (typeof reporte.desglose_metodologia_json === 'string') {
    reporte.desglose_metodologia = JSON.parse(reporte.desglose_metodologia_json);
  }

  return reporte;
};

module.exports = { generarReporte, listarReportes, obtenerReporte };
