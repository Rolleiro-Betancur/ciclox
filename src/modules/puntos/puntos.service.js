const db = require('../../config/database');

const opError = (message, code, statusCode) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
};

/**
 * Obtener saldo y resumen de puntos, junto con el progreso a la próxima recompensa
 */
const obtenerResumenPuntos = async (usuarioId) => {
  // 1. Obtener el saldo del usuario
  const { rows } = await db.query(
    `SELECT saldo_actual, total_ganado, total_canjeado 
     FROM puntos_usuario 
     WHERE usuario_id = $1`,
    [usuarioId]
  );

  let saldo = {
    saldo_actual: 0,
    total_ganado: 0,
    total_canjeado: 0
  };

  if (rows[0]) {
    saldo = {
      saldo_actual: Number(rows[0].saldo_actual),
      total_ganado: Number(rows[0].total_ganado),
      total_canjeado: Number(rows[0].total_canjeado)
    };
  }

  // 2. Determinar la próxima recompensa
  // Buscamos todas las recompensas activas ordenadas por puntos requeridos
  const { rows: recompensas } = await db.query(
    `SELECT nombre, puntos_requeridos 
     FROM recompensas 
     WHERE activo = TRUE 
     ORDER BY puntos_requeridos ASC`
  );

  let proxima_recompensa = null;

  if (recompensas.length > 0) {
    // Buscar la primera recompensa que requiera más puntos de los que tiene el usuario
    const proxima = recompensas.find(r => Number(r.puntos_requeridos) > saldo.saldo_actual);

    if (proxima) {
      const puntosRequeridos = Number(proxima.puntos_requeridos);
      const faltantes = puntosRequeridos - saldo.saldo_actual;
      // Porcentaje entero (ej: 75), limitado al 100% y que no sea negativo
      let porcentaje = Math.floor((saldo.saldo_actual / puntosRequeridos) * 100);
      if (porcentaje < 0) porcentaje = 0;
      if (porcentaje > 100) porcentaje = 100;

      proxima_recompensa = {
        nombre: proxima.nombre,
        puntos_requeridos: puntosRequeridos,
        puntos_faltantes: faltantes,
        progreso_porcentaje: porcentaje
      };
    } else {
      // Si el saldo supera a TODAS las recompensas, tomar la más alta y marcar 100%
      const masAlta = recompensas[recompensas.length - 1];
      proxima_recompensa = {
        nombre: masAlta.nombre,
        puntos_requeridos: Number(masAlta.puntos_requeridos),
        puntos_faltantes: 0,
        progreso_porcentaje: 100
      };
    }
  }

  return {
    ...saldo,
    proxima_recompensa
  };
};

/**
 * Obtener historial de movimientos de puntos del usuario de forma paginada
 */
const listarHistorialMovimientos = async (usuarioId, { page, limit }) => {
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    `SELECT 
       id::int, 
       cantidad, 
       tipo, 
       descripcion, 
       fecha 
     FROM movimientos_puntos 
     WHERE usuario_id = $1 
     ORDER BY fecha DESC 
     LIMIT $2 OFFSET $3`,
    [usuarioId, limit, offset]
  );

  const { rows: totalRow } = await db.query(
    `SELECT COUNT(*) AS total 
     FROM movimientos_puntos 
     WHERE usuario_id = $1`,
    [usuarioId]
  );

  const total = parseInt(totalRow[0].total, 10);

  return {
    rows,
    total
  };
};

module.exports = {
  obtenerResumenPuntos,
  listarHistorialMovimientos
};
