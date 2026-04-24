require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const db = require('./src/config/database');

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenUsuario, usuarioId;

// ── Helpers ───────────────────────────────────────────────────────────────────
async function req(method, path, body = null, jwt = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json };
}

function assert(name, condition, actual) {
  if (condition) { console.log(`  ${c.green}✔${c.reset} ${name}`); passed++; }
  else {
    console.log(`  ${c.red}✘ ${name}${c.reset}`);
    if (actual !== undefined) console.log(`    ${c.dim}→ ${JSON.stringify(actual)}${c.reset}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${c.cyan}${c.bold}▶ ${title}${c.reset}`);
}

// ═════════════════════════════════════════════════════════════════════════════
async function setup() {
  section('SETUP — Registrar usuario y crear recompensas semilla');
  const ts = Date.now();

  const usr = await req('POST', '/api/auth/registro', {
    nombre: 'Usuario Puntos ' + ts, email: `pts${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3001234567', rol: 'USUARIO',
  });
  assert('Usuario registrado 201', usr.status === 201, usr.body);
  tokenUsuario = usr.body?.data?.token;
  usuarioId = usr.body?.data?.usuario?.id;

  // Insertar recompensas en DB para probar el cálculo de "próxima recompensa"
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO recompensas (nombre, descripcion, tipo, puntos_requeridos, activo)
      VALUES 
        ('Recompensa 100', 'Desc', 'BONO_CICLOX', 100, true),
        ('Recompensa 500', 'Desc', 'BONO_CICLOX', 500, true),
        ('Recompensa 2000', 'Desc', 'MERCADITOS', 2000, true)
    `);
    await client.query('COMMIT');
    assert('Recompensas insertadas', true);
  } catch (err) {
    await client.query('ROLLBACK');
    console.log('Error insertando recompensas:', err.message);
  } finally {
    client.release();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function testSaldoInicial() {
  section('GET /api/puntos — saldo inicial en 0');
  const r = await req('GET', '/api/puntos', null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('saldo_actual es 0', r.body?.data?.saldo_actual === 0, r.body?.data?.saldo_actual);
  assert('total_ganado es 0', r.body?.data?.total_ganado === 0, r.body?.data?.total_ganado);
  assert('proxima_recompensa presente', !!r.body?.data?.proxima_recompensa, r.body?.data?.proxima_recompensa);
  assert('puntos_requeridos de próxima es 100', r.body?.data?.proxima_recompensa?.puntos_requeridos === 100, r.body?.data?.proxima_recompensa?.puntos_requeridos);
  assert('progreso es 0%', r.body?.data?.proxima_recompensa?.progreso_porcentaje === 0, r.body?.data?.proxima_recompensa?.progreso_porcentaje);
}

// ═════════════════════════════════════════════════════════════════════════════
async function simularMovimientos() {
  section('Simular movimientos de puntos en DB');
  
  // Insertar puntos directamente
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    // Insertar 2 movimientos (el trigger de PostgreSQL actualizará puntos_usuario)
    await client.query(`
      INSERT INTO movimientos_puntos (usuario_id, cantidad, tipo, descripcion, fecha)
      VALUES 
        ($1, 1000, 'GANADO_RECICLAJE', 'Reciclaje TV', NOW()),
        ($1, -400, 'CANJEADO_RECOMPENSA', 'Canje Bono', NOW() + interval '1 minute')
    `, [usuarioId]);
    
    await client.query('COMMIT');
    assert('Movimientos y saldos creados', true);
  } catch (err) {
    await client.query('ROLLBACK');
    console.log('Error simulando movimientos:', err.message);
  } finally {
    client.release();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function testSaldoConMovimientos() {
  section('GET /api/puntos — saldo actualizado');
  const r = await req('GET', '/api/puntos', null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('saldo_actual es 600', r.body?.data?.saldo_actual === 600, r.body?.data?.saldo_actual);
  assert('proxima_recompensa es Recompensa 2000', r.body?.data?.proxima_recompensa?.nombre === 'Recompensa 2000', r.body?.data?.proxima_recompensa?.nombre);
  assert('puntos_requeridos es 2000', r.body?.data?.proxima_recompensa?.puntos_requeridos === 2000, r.body?.data?.proxima_recompensa?.puntos_requeridos);
  assert('puntos_faltantes es 1400', r.body?.data?.proxima_recompensa?.puntos_faltantes === 1400, r.body?.data?.proxima_recompensa?.puntos_faltantes);
  
  // (600 / 2000) * 100 = 30%
  assert('progreso es 30%', r.body?.data?.proxima_recompensa?.progreso_porcentaje === 30, r.body?.data?.proxima_recompensa?.progreso_porcentaje);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testHistorial() {
  section('GET /api/puntos/historial — listado paginado');
  const r = await req('GET', '/api/puntos/historial', null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('data es array', Array.isArray(r.body?.data), typeof r.body?.data);
  assert('Contiene 2 movimientos', r.body?.data?.length === 2, r.body?.data?.length);
  
  // El último en insertarse es el canje, que tiene NOW() + 1 minuto, así que debería salir primero
  assert('Primer mov es el canje (-400)', r.body?.data?.[0]?.cantidad === -400, r.body?.data?.[0]?.cantidad);
  assert('meta existe', !!r.body?.meta, r.body?.meta);
  assert('meta.total es 2', r.body?.meta?.total === 2, r.body?.meta?.total);

  // Error de validación en paginación
  const bad = await req('GET', '/api/puntos/historial?limit=-5', null, tokenUsuario);
  assert('Límite negativo → 422', bad.status === 422, bad.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Puntos${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`  ${c.dim}Target: ${BASE}${c.reset}`);

  try {
    await setup();
    await testSaldoInicial();
    await simularMovimientos();
    await testSaldoConMovimientos();
    await testHistorial();
  } catch (err) {
    console.error(`\n${c.red}Error inesperado:${c.reset}`, err.message, err.stack);
    process.exit(1);
  }

  const total = passed + failed;
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`  Resultado: ${c.green}${passed} pasaron${c.reset}  |  ${failed > 0 ? c.red : c.dim}${failed} fallaron${c.reset}  |  Total: ${total}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
