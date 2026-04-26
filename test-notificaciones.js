require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const db = require('./src/config/database');

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenUsuario, usuarioId, notificacionId;

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
  section('SETUP — Registrar usuario y crear notificaciones');
  const ts = Date.now();

  const usr = await req('POST', '/api/auth/registro', {
    nombre: 'User Notif ' + ts, email: `notif${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3000000000', rol: 'USUARIO',
  });
  tokenUsuario = usr.body?.data?.token;
  usuarioId = usr.body?.data?.usuario?.id;

  const client = await db.getClient();
  try {
    const res = await client.query(`
      INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo)
      VALUES ($1, 'Test Notif', 'Mensaje de prueba', 'SISTEMA')
      RETURNING id
    `, [usuarioId]);
    notificacionId = res.rows[0].id;
  } finally {
    client.release();
  }

  assert('Setup completado', !!notificacionId);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testListarNotificaciones() {
  section('GET /api/notificaciones — Listar');
  const r = await req('GET', '/api/notificaciones', null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('Es un array', Array.isArray(r.body?.data), typeof r.body?.data);
  assert('Contiene la notificacion', r.body?.data?.length > 0, r.body?.data?.length);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testMarcarLeida() {
  section('PATCH /api/notificaciones/:id/leer — Marcar leída');
  const r = await req('PATCH', `/api/notificaciones/${notificacionId}/leer`, null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('leida es true', r.body?.data?.leida === true, r.body?.data?.leida);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Notificaciones${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);

  try {
    await setup();
    await testListarNotificaciones();
    await testMarcarLeida();
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
