require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const db = require('./src/config/database');

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenUsuario, tokenEmpresa, usuarioId, empresaId, dispositivoId, reciclajeId;

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
  section('SETUP — Registrar usuario, empresa y dispositivo RECOLECTADO');
  const ts = Date.now();

  const usr = await req('POST', '/api/auth/registro', {
    nombre: 'User Recicla ' + ts, email: `recicla${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3111111111', rol: 'USUARIO',
  });
  tokenUsuario = usr.body?.data?.token;
  usuarioId = usr.body?.data?.usuario?.id;

  const emp = await req('POST', '/api/auth/registro', {
    nombre: 'Empresa Recicla ' + ts, email: `emp_recicla${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3222222222', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Planta EcoRecicla', nit: 'NIT-PL-'+ts }
  });
  tokenEmpresa = emp.body?.data?.token;
  empresaId = emp.body?.data?.usuario?.id;

  // Crear dispositivo y forzarlo a RECOLECTADO en la DB para saltar flujo de recolección
  const disp = await req('POST', '/api/dispositivos', {
    tipo: 'COMPUTADOR', marca: 'Dell', modelo: 'Vostro', serial_numero: 'SN-D-'+ts
  }, tokenUsuario);
  dispositivoId = disp.body?.data?.id;

  const client = await db.getClient();
  try {
    await client.query('UPDATE dispositivos SET estado = \'RECOLECTADO\' WHERE id = $1', [dispositivoId]);
  } finally {
    client.release();
  }

  assert('Usuario registrado', usr.status === 201, usr.status);
  assert('Empresa registrada', emp.status === 201, emp.status);
  assert('Dispositivo creado', disp.status === 201, disp.status);

  assert('Setup completado', !!dispositivoId);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testCrearReciclaje() {
  section('POST /api/empresa/reciclajes — Iniciar proceso');
  
  const payload = {
    dispositivo_id: Number(dispositivoId),
    metodologia: 'DESMONTAJE_MANUAL',
    fecha_inicio: new Date().toISOString(),
    peso_kg: 2.5,
    co2_evitado_kg: 5.4,
    materiales_recuperados: 'Cobre, Aluminio, Plástico',
    observaciones: 'Batería en mal estado'
  };

  const r = await req('POST', '/api/empresa/reciclajes', payload, tokenEmpresa);
  assert('Status 201', r.status === 201, r.status);
  assert('ID devuelto', !!r.body?.data?.id, r.body?.data);
  assert('Estado es EN_PROCESO', r.body?.data?.estado === 'EN_PROCESO', r.body?.data?.estado);
  reciclajeId = r.body?.data?.id;

  // Verificar estado dispositivo
  const check = await req('GET', `/api/dispositivos/${dispositivoId}`, null, tokenUsuario);
  assert('Dispositivo ahora EN_RECICLAJE', check.body?.data?.estado === 'EN_RECICLAJE', check.body?.data?.estado);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testListarReciclajes() {
  section('GET /api/empresa/reciclajes — Listar');
  const r = await req('GET', '/api/empresa/reciclajes', null, tokenEmpresa);
  assert('Status 200', r.status === 200, r.status);
  const found = r.body?.data?.find(rec => Number(rec.id) === Number(reciclajeId));
  assert('Contiene el reciclaje', !!found, { id_buscado: reciclajeId, ids_encontrados: r.body?.data?.map(r => r.id) });
}

// ═════════════════════════════════════════════════════════════════════════════
async function testCompletarReciclaje() {
  section('PATCH /api/empresa/reciclajes/:id/completar — Finalizar');
  
  const payload = {
    fecha_fin: new Date().toISOString(),
    certificado_url: 'https://ciclox.com/certificados/001.pdf',
    numero_certificado: 'CERT-2026-001'
  };

  const r = await req('PATCH', `/api/empresa/reciclajes/${reciclajeId}/completar`, payload, tokenEmpresa);
  assert('Status 200', r.status === 200, r.status);
  assert('Estado es CERTIFICADO', r.body?.data?.estado === 'CERTIFICADO', r.body?.data?.estado);

  // Verificar estado final dispositivo
  const check = await req('GET', `/api/dispositivos/${dispositivoId}`, null, tokenUsuario);
  assert('Dispositivo ahora RECICLADO', check.body?.data?.estado === 'RECICLADO', check.body?.data?.estado);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Reciclajes${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);

  try {
    await setup();
    await testCrearReciclaje();
    await testListarReciclajes();
    await testCompletarReciclaje();
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
