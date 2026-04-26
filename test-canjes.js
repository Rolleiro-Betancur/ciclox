require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const db = require('./src/config/database');

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenUsuario, tokenEmpresa, usuarioId, recompensaId, canjeId;

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
  section('SETUP — Registrar usuario y empresa');
  const ts = Date.now();

  const usr = await req('POST', '/api/auth/registro', {
    nombre: 'User Canjes ' + ts, email: `canje${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3001234567', rol: 'USUARIO',
  });
  tokenUsuario = usr.body?.data?.token;
  usuarioId = usr.body?.data?.usuario?.id;
  assert('Usuario registrado 201', usr.status === 201, usr.status);

  const emp = await req('POST', '/api/auth/registro', {
    nombre: 'Empresa Canjes ' + ts, email: `emp_canje${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3009998877', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Aliado Test', nit: '123-K' }
  });
  tokenEmpresa = emp.body?.data?.token;
  assert('Empresa registrada 201', emp.status === 201, emp.status);

  section('SETUP — Preparar puntos y recompensa');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    // 1. Darle puntos al usuario (1000 pts)
    await client.query('INSERT INTO movimientos_puntos (usuario_id, cantidad, tipo, descripcion) VALUES ($1, 1000, \'GANADO_RECICLAJE\', \'Test points\')', [usuarioId]);
    
    // 2. Crear una recompensa de 600 pts
    const rec = await client.query(`
      INSERT INTO recompensas (nombre, descripcion, tipo, puntos_requeridos, activo)
      VALUES ('Bono Test', 'Desc', 'BONO_CICLOX', 600, true)
      RETURNING id
    `);
    recompensaId = rec.rows[0].id;
    
    await client.query('COMMIT');
    assert('Puntos y recompensa preparados', true);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error setup:', err.message);
  } finally {
    client.release();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function testCrearCanje() {
  section('POST /api/canjes — Crear canje (usuario)');
  
  // Caso 1: Puntos insuficientes (por si acaso probamos con una de 2000)
  const fail = await req('POST', '/api/canjes', { recompensa_id: 999999 }, tokenUsuario);
  assert('Recompensa inexistente → 404', fail.status === 404, fail.status);

  // Caso 2: Éxito
  const res = await req('POST', '/api/canjes', { recompensa_id: Number(recompensaId) }, tokenUsuario);
  assert('Canje creado 201', res.status === 201, res.status);
  assert('QR generado', !!res.body?.data?.codigo_qr, res.body?.data);
  assert('Código texto presente', !!res.body?.data?.codigo_texto, res.body?.data?.codigo_texto);
  canjeId = res.body?.data?.id;

  // Caso 3: Canje pendiente (no dejar crear otro si hay uno activo)
  const double = await req('POST', '/api/canjes', { recompensa_id: Number(recompensaId) }, tokenUsuario);
  assert('Ya tiene canje pendiente → 400', double.status === 400, double.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testListarYDetalle() {
  section('GET /api/canjes — Listar e Historial');
  const list = await req('GET', '/api/canjes', null, tokenUsuario);
  assert('Lista obtenida 200', list.status === 200, list.status);
  assert('Contiene el canje creado', list.body?.data?.some(c => c.id === parseInt(canjeId)), list.body?.data?.length);

  section('GET /api/canjes/:id — Detalle individual');
  const det = await req('GET', `/api/canjes/${canjeId}`, null, tokenUsuario);
  assert('Detalle obtenido 200', det.status === 200, det.status);
  assert('Estado es PENDIENTE', det.body?.data?.estado === 'PENDIENTE', det.body?.data?.estado);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testConfirmarCanje() {
  section('PATCH /api/canjes/:id/confirmar — Confirmar (empresa)');
  
  // Requiere codigo_texto
  const canje = await req('GET', `/api/canjes/${canjeId}`, null, tokenUsuario);
  const codigo = canje.body?.data?.codigo_texto;

  const res = await req('PATCH', `/api/canjes/${canjeId}/confirmar`, { codigo_texto: codigo }, tokenEmpresa);
  assert('Canje confirmado 200', res.status === 200, res.status);
  assert('Estado final EXITOSO', res.body?.data?.estado === 'EXITOSO', res.body?.data?.estado);

  // Verificar que puntos bajaron (Saldo inicial 1000 - 600 = 400)
  const pts = await req('GET', '/api/puntos', null, tokenUsuario);
  assert('Saldo actualizado a 400', pts.body?.data?.saldo_actual === 400, pts.body?.data?.saldo_actual);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Canjes${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);

  try {
    await setup();
    await testCrearCanje();
    await testListarYDetalle();
    await testConfirmarCanje();
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
