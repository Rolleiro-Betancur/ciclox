require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const db = require('./src/config/database');

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenUsuario, tokenEmpresa, usuarioId, empresaId, dispositivoId, solicitudId, recolectorId;

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
  section('SETUP — Preparar entorno de prueba');
  const ts = Date.now();

  // 1. Ciudadano
  const usr = await req('POST', '/api/auth/registro', {
    nombre: 'User Traza ' + ts, email: `traza${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3111111111', rol: 'USUARIO',
  });
  tokenUsuario = usr.body?.data?.token;
  usuarioId = usr.body?.data?.usuario?.id;

  // 2. Empresa
  const emp = await req('POST', '/api/auth/registro', {
    nombre: 'Empresa Traza ' + ts, email: `emp_traza${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3222222222', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Logistica S.A.', nit: 'NIT-'+ts }
  });
  tokenEmpresa = emp.body?.data?.token;
  empresaId = emp.body?.data?.usuario?.id;

  // 3. Crear un recolector para la empresa (necesario para aceptar solicitudes)
  const client = await db.getClient();
  try {
    const recRes = await client.query(
      'INSERT INTO recolectores (empresa_id, nombre, telefono) VALUES ($1, $2, $3) RETURNING id',
      [empresaId, 'Recolector Test', '3000000000']
    );
    recolectorId = recRes.rows[0].id;
  } finally {
    client.release();
  }

  // 4. Dispositivo
  const disp = await req('POST', '/api/dispositivos', {
    tipo: 'CELULAR', marca: 'Samsung', modelo: 'S20', serial_numero: 'SN'+ts, estado_fisico: 'ENCIENDE'
  }, tokenUsuario);
  dispositivoId = disp.body?.data?.id;

  // 5. Solicitud
  const sol = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [{ dispositivo_id: Number(dispositivoId), cantidad: 1 }],
    direccion_recoleccion: 'Cll Test 123', ciudad: 'Medellin', departamento: 'Antioquia',
    telefono_contacto: '3111111111', email_contacto: `traza${ts}@test.com`, fecha_preferida: '2026-05-01'
  }, tokenUsuario);
  solicitudId = sol.body?.data?.id;

  assert('Setup completado', !!solicitudId, sol.body);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testMovimientosDispositivo() {
  section('GET /api/trazabilidad/dispositivo/:id — Historial');
  
  const r = await req('GET', `/api/trazabilidad/dispositivo/${dispositivoId}`, null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('dispositivo presente', !!r.body?.data?.dispositivo, r.body?.data);
  assert('movimientos es un array', Array.isArray(r.body?.data?.movimientos), typeof r.body?.data?.movimientos);
  
  // Debería tener REGISTRO y SOLICITUD_CREADA
  assert('Tiene movimientos iniciales', r.body?.data?.movimientos?.length >= 2, r.body?.data?.movimientos?.length);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testUbicacionSolicitud() {
  section('GET /api/trazabilidad/solicitud/:id/ubicacion — Mapa');

  // Primero la empresa acepta la solicitud
  await req('PATCH', `/api/empresa/solicitudes/${solicitudId}/aceptar`, {
    recolector_id: Number(recolectorId),
    hora_estimada_inicio: '10:00',
    hora_estimada_fin: '12:00'
  }, tokenEmpresa);

  // Luego la marca en tránsito
  await req('PATCH', `/api/empresa/solicitudes/${solicitudId}/en-transito`, {
    latitud_recolector: 6.24,
    longitud_recolector: -75.58,
    tiempo_estimado_minutos: 15
  }, tokenEmpresa);
  
  const r = await req('GET', `/api/trazabilidad/solicitud/${solicitudId}/ubicacion`, null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('Estado es EN_TRANSITO', r.body?.data?.estado === 'EN_TRANSITO', r.body?.data?.estado);
  assert('Tiene coordenadas del recolector', r.body?.data?.latitud_recolector === 6.24, r.body?.data?.latitud_recolector);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testRegistrarMovimientoManual() {
  section('POST /api/empresa/trazabilidad — Movimiento Manual');
  
  const mov = {
    dispositivo_id: Number(dispositivoId),
    solicitud_id: Number(solicitudId),
    tipo: 'RECIBIDO_EMPRESA',
    descripcion: 'Llegó a bodega norte',
    ubicacion_destino: 'Bodega Norte',
    latitud: 6.2, longitud: -75.5
  };

  const r = await req('POST', '/api/empresa/trazabilidad', mov, tokenEmpresa);
  assert('Movimiento registrado 201', r.status === 201, r.status);
  assert('ID devuelto', !!r.body?.data?.id, r.body?.data);

  // Verificar en historial del dispositivo
  const check = await req('GET', `/api/trazabilidad/dispositivo/${dispositivoId}`, null, tokenUsuario);
  const movs = check.body?.data?.movimientos || [];
  const manual = movs.find(m => m.tipo === 'RECIBIDO_EMPRESA');
  assert('Aparece en el historial', !!manual, movs.length);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Trazabilidad${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);

  try {
    await setup();
    await testMovimientosDispositivo();
    await testUbicacionSolicitud();
    await testRegistrarMovimientoManual();
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
