// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const logger = require('./config/logger');
const errorMiddleware = require('./middlewares/error.middleware');

// ── Rutas por módulo ──────────────────────────────────────────────────────────
const authRoutes            = require('./modules/auth/auth.routes');
const usuariosRoutes        = require('./modules/usuarios/usuarios.routes');
const dispositivosRoutes    = require('./modules/dispositivos/dispositivos.routes');
const puntosRecoleccionRoutes = require('./modules/puntos-recoleccion/puntos-recoleccion.routes');
const recolectoresRoutes    = require('./modules/recolectores/recolectores.routes');
const { router: solicitudesRoutes, empresaRouter: empresaSolicitudesRoutes } =
  require('./modules/solicitudes/solicitudes.routes');
// Módulos pendientes de implementar:
const puntosRoutes       = require('./modules/puntos/puntos.routes');
const recompensasRoutes  = require('./modules/recompensas/recompensas.routes');
// const canjesRoutes       = require('./modules/canjes/canjes.routes');
// const trazabilidadRoutes = require('./modules/trazabilidad/trazabilidad.routes');
// const notificacionesRoutes = require('./modules/notificaciones/notificaciones.routes');
// const reciclajesRoutes   = require('./modules/reciclajes/reciclajes.routes');
// const reportesRoutes     = require('./modules/reportes/reportes.routes');

const app = express();

// ── Seguridad y utilidades ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HTTP logging ──────────────────────────────────────────────────────────────
app.use(
  morgan('dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── Rutas de la API ───────────────────────────────────────────────────────────
app.use('/api/auth',                    authRoutes);
app.use('/api/usuarios',                usuariosRoutes);
app.use('/api/dispositivos',            dispositivosRoutes);
app.use('/api/puntos-recoleccion',      puntosRecoleccionRoutes);
app.use('/api/solicitudes',             solicitudesRoutes);
app.use('/api/empresa/recolectores',    recolectoresRoutes);
app.use('/api/empresa/solicitudes',     empresaSolicitudesRoutes);
// Módulos pendientes de implementar:
app.use('/api/puntos',                puntosRoutes);
app.use('/api/recompensas',           recompensasRoutes);
// app.use('/api/canjes',                canjesRoutes);
// app.use('/api/trazabilidad',          trazabilidadRoutes);
// app.use('/api/notificaciones',        notificacionesRoutes);
// app.use('/api/empresa/reciclajes',    reciclajesRoutes);
// app.use('/api/empresa/reportes',      reportesRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Ruta ${req.originalUrl} no encontrada` },
  });
});

// ── Manejador global de errores (DEBE ir al final) ────────────────────────────
app.use(errorMiddleware);

module.exports = app;
