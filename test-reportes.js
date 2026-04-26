require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const db = require('./src/config/database');

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenEmpresa, empresaId, reporteId;

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
  section('SETUP — Registrar empresa');
  const ts = Date.now();

  const emp = await req('POST', '/api/auth/registro', {
    nombre: 'Empresa Rep ' + ts, email: `rep${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3222222222', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Reportes S.A.', nit: 'NIT-REP-'+ts }
  });
  tokenEmpresa = emp.body?.data?.token;
  empresaId = emp.body?.data?.usuario?.id;

  assert('Empresa registrada', !!empresaId);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testGenerarReporte() {
  section('POST /api/empresa/reportes — Generar');
  
  const payload = {
    periodo_inicio: '2026-01-01',
    periodo_fin: '2026-12-31'
  };

  const r = await req('POST', '/api/empresa/reportes', payload, tokenEmpresa);
  assert('Status 201', r.status === 201, r.status);
  assert('ID devuelto', !!r.body?.data?.id, r.body?.data);
  reporteId = r.body?.data?.id;
}

// ═════════════════════════════════════════════════════════════════════════════
async function testListarReportes() {
  section('GET /api/empresa/reportes — Listar');
  const r = await req('GET', '/api/empresa/reportes', null, tokenEmpresa);
  assert('Status 200', r.status === 200, r.status);
  assert('Es un array', Array.isArray(r.body?.data), typeof r.body?.data);
  assert('Contiene el reporte', r.body?.data?.some(rep => rep.id === reporteId), r.body?.data?.length);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testDetalleReporte() {
  section('GET /api/empresa/reportes/:id — Detalle');
  const r = await req('GET', `/api/empresa/reportes/${reporteId}`, null, tokenEmpresa);
  assert('Status 200', r.status === 200, r.status);
  assert('Tiene desgloses', !!r.body?.data?.desglose_dispositivos, r.body?.data);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Reportes${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);

  try {
    await setup();
    await testGenerarReporte();
    await testListarReportes();
    await testDetalleReporte();
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
