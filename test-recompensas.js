require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const db = require('./src/config/database');

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenUsuario, rewardId;

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
    nombre: 'Usuario Test Recompensas ' + ts, email: `rewards${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3001112233', rol: 'USUARIO',
  });
  assert('Usuario registrado 201', usr.status === 201, usr.body);
  tokenUsuario = usr.body?.data?.token;

  // Limpiar y crear datos semilla
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    // Eliminar recompensas previas para test limpio
    await client.query('DELETE FROM recompensas WHERE nombre LIKE \'TEST_%\'');
    
    const { rows } = await client.query(`
      INSERT INTO recompensas (nombre, descripcion, tipo, puntos_requeridos, porcentaje_descuento, aliados, activo)
      VALUES 
        ('TEST_Bono Ciclox', 'Descuento en tecnología', 'BONO_CICLOX', 600, 30, 'MovilClick', true),
        ('TEST_Mercaditos', 'Descuento en supermercados', 'MERCADITOS', 5000, NULL, 'Éxito', true)
      RETURNING id
    `);
    rewardId = rows[0].id;
    
    await client.query('COMMIT');
    assert('Recompensas de test insertadas', true);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error insertando recompensas:', err.message);
  } finally {
    client.release();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function testListarRecompensas() {
  section('GET /api/recompensas — Listar disponibles');
  const r = await req('GET', '/api/recompensas', null, tokenUsuario);
  
  assert('Status 200', r.status === 200, r.status);
  assert('data es un array', Array.isArray(r.body?.data), typeof r.body?.data);
  
  const found = r.body?.data?.filter(rec => rec.nombre.startsWith('TEST_'));
  assert('Contiene las recompensas de test', found.length >= 2, found.length);
  
  const bono = found.find(f => f.tipo === 'BONO_CICLOX');
  assert('Bono tiene campos correctos', bono && bono.porcentaje_descuento === 30 && bono.puntos_requeridos === 600, bono);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testDetalleRecompensa() {
  section('GET /api/recompensas/:id — Detalle de una recompensa');
  
  const r = await req('GET', `/api/recompensas/${rewardId}`, null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('ID coincide', r.body?.data?.id === parseInt(rewardId), r.body?.data?.id);
  assert('Nombre coincide', r.body?.data?.nombre === 'TEST_Bono Ciclox', r.body?.data?.nombre);
  
  // Test no encontrado
  const notFound = await req('GET', '/api/recompensas/999999', null, tokenUsuario);
  assert('ID inexistente → 404', notFound.status === 404, notFound.status);
  
  // Test validación
  const invalid = await req('GET', '/api/recompensas/abc', null, tokenUsuario);
  assert('ID no numérico → 422', invalid.status === 422, invalid.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Recompensas${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`  ${c.dim}Target: ${BASE}${c.reset}`);

  try {
    await setup();
    if (!tokenUsuario) throw new Error('No se pudo obtener el token de usuario');
    
    await testListarRecompensas();
    await testDetalleRecompensa();
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
