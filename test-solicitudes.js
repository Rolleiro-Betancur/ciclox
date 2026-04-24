/**
 * test-solicitudes.js
 * Pruebas de integración completas para el módulo de solicitudes.
 *
 * Flujo del test:
 *  SETUP
 *    1. Registrar empresa + recolector
 *    2. Registrar usuario + dispositivo
 *
 *  CIUDADANO
 *    3.  GET  /api/solicitudes          → lista vacía
 *    4.  POST /api/solicitudes          → crear (domicilio)
 *    5.  GET  /api/solicitudes          → lista con 1
 *    6.  GET  /api/solicitudes/:id      → detalle
 *    7.  POST /api/solicitudes          → crear segunda (para cancelar)
 *    8.  PATCH /api/solicitudes/:id/cancelar
 *    9.  Validaciones de error (sin dispositivos, dispositivo en uso, etc.)
 *
 *  EMPRESA
 *   10.  GET  /api/empresa/solicitudes  → lista con solicitud pendiente
 *   11.  PATCH /api/empresa/solicitudes/:id/aceptar
 *   12.  PATCH /api/empresa/solicitudes/:id/en-transito
 *   13.  PATCH /api/empresa/solicitudes/:id/recolectada
 *
 *  CALIFICACIÓN
 *   14.  POST /api/solicitudes/:id/calificacion
 *
 *  SEGURIDAD
 *   15.  Sin token, rol incorrecto, ids inválidos
 */

require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;

// ── ANSI colors ───────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m', dim: '\x1b[2m',
};

let passed = 0, failed = 0;
let tokenEmpresa, tokenUsuario;
let recolectorId, dispositivoId, dispositivo2Id, solicitudId, solicitudParaCancelarId;


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
  section('SETUP — Registrar empresa, recolector y usuario con dispositivo');
  const ts = Date.now();

  // Registrar empresa
  const emp = await req('POST', '/api/auth/registro', {
    nombre: 'Empresa Sol ' + ts, email: `empSOL${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3001110000', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Sol Recicla', nit: '9001-' + ts, descripcion: 'Test' },
  });
  assert('Empresa registrada 201', emp.status === 201, emp.body);
  tokenEmpresa = emp.body?.data?.token;
  assert('JWT empresa presente', !!tokenEmpresa);
  const empresaId = emp.body?.data?.usuario?.id;

  // Crear recolector para la empresa
  const rec = await req('POST', '/api/empresa/recolectores', {
    nombre: 'Pedro Reco', telefono: '3009991111',
  }, tokenEmpresa);
  assert('Recolector creado 201', rec.status === 201, rec.body);
  recolectorId = rec.body?.data?.id;
  assert('recolectorId presente', typeof recolectorId === 'number', recolectorId);

  // Registrar usuario
  const usr = await req('POST', '/api/auth/registro', {
    nombre: 'Juan Sol ' + ts, email: `jSOL${ts}@test.com`,
    contrasena: 'Test1234!', telefono: '3001234567', rol: 'USUARIO',
  });
  assert('Usuario registrado 201', usr.status === 201, usr.body);
  tokenUsuario = usr.body?.data?.token;
  assert('JWT usuario presente', !!tokenUsuario);

  // Crear dispositivo para el usuario
  const dev = await req('POST', '/api/dispositivos', {
    tipo: 'CELULAR', marca: 'iPhone 11', modelo: 'A2111',
    serial_numero: 'IMEI' + ts, descripcion: 'Pantalla rota',
    estado_fisico: 'DANIADO', anio_fabricacion: 2019,
  }, tokenUsuario);
  assert('Dispositivo creado 201', dev.status === 201, dev.body);
  dispositivoId = dev.body?.data?.id;
  assert('dispositivoId presente', !!dispositivoId, dev.body?.data);

  // Segundo dispositivo (para solicitud que se cancelará)
  const dev2 = await req('POST', '/api/dispositivos', {
    tipo: 'TABLET', marca: 'Samsung', modelo: 'Tab S7',
    estado_fisico: 'ENCIENDE', anio_fabricacion: 2020,
  }, tokenUsuario);
  assert('Dispositivo 2 creado 201', dev2.status === 201, dev2.body);
  dispositivo2Id = dev2.body?.data?.id;
}

// ═════════════════════════════════════════════════════════════════════════════
async function testListarVacia() {
  section('GET /api/solicitudes — lista vacía inicial');
  const r = await req('GET', '/api/solicitudes', null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('success: true', r.body?.success === true);
  assert('data es array', Array.isArray(r.body?.data), r.body?.data);
  assert('Lista vacía', r.body?.data?.length === 0, r.body?.data?.length);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testCrearSolicitud() {
  section('POST /api/solicitudes — crear solicitud domicilio');

  const r = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [{ dispositivo_id: dispositivoId, cantidad: 1 }],
    direccion_recoleccion: 'Cll 138 b sur 45 12',
    ciudad: 'Medellín',
    departamento: 'Antioquia',
    telefono_contacto: '3128304576',
    fecha_preferida: '2026-06-01',
  }, tokenUsuario);

  assert('Status 201', r.status === 201, r.status);
  assert('success: true', r.body?.success === true);
  assert('Estado PENDIENTE', r.body?.data?.estado === 'PENDIENTE', r.body?.data?.estado);
  assert('id presente', typeof r.body?.data?.id === 'number', r.body?.data?.id);
  assert('mensaje presente', !!r.body?.data?.mensaje, r.body?.data?.mensaje);
  solicitudId = r.body?.data?.id;
}

async function testCrearSolicitudValidaciones() {
  section('POST /api/solicitudes — validaciones de error');

  // Sin dispositivos
  const sinDev = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [],
    direccion_recoleccion: 'Test', ciudad: 'Test', telefono_contacto: '123',
  }, tokenUsuario);
  assert('Sin dispositivos → 422', sinDev.status === 422, sinDev.status);

  // tipo_recoleccion inválido
  const badTipo = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'VOLADOR',
    dispositivos: [{ dispositivo_id: 9999, cantidad: 1 }],
  }, tokenUsuario);
  assert('Tipo inválido → 422', badTipo.status === 422, badTipo.status);

  // Dispositivo que no pertenece al usuario
  const noOwn = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [{ dispositivo_id: 999999, cantidad: 1 }],
    direccion_recoleccion: 'Test', ciudad: 'Test', telefono_contacto: '123',
  }, tokenUsuario);
  assert('Dispositivo ajeno → 400', noOwn.status === 400, noOwn.status);
  assert('Código DISPOSITIVO_NO_VALIDO', noOwn.body?.error?.code === 'DISPOSITIVO_NO_VALIDO', noOwn.body?.error?.code);

  // Dispositivo ya en proceso (el que creamos arriba ya está EN_PROCESO_RECOLECCION)
  const enUso = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [{ dispositivo_id: dispositivoId, cantidad: 1 }],
    direccion_recoleccion: 'Test', ciudad: 'Test', telefono_contacto: '123',
  }, tokenUsuario);
  assert('Dispositivo EN_USO → 400', enUso.status === 400, enUso.status);
  assert('Código DISPOSITIVO_EN_USO', enUso.body?.error?.code === 'DISPOSITIVO_EN_USO', enUso.body?.error?.code);

  // DOMICILIO sin dirección
  const sinDir = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [{ dispositivo_id: dispositivo2Id, cantidad: 1 }],
    ciudad: 'Medellín', telefono_contacto: '123',
    // falta direccion_recoleccion
  }, tokenUsuario);
  assert('DOMICILIO sin dirección → 422', sinDir.status === 422, sinDir.status);

  // PUNTO_RECOLECCION sin punto_recoleccion_id
  const sinPunto = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'PUNTO_RECOLECCION',
    dispositivos: [{ dispositivo_id: dispositivo2Id, cantidad: 1 }],
    // falta punto_recoleccion_id
  }, tokenUsuario);
  assert('PUNTO sin id → 422', sinPunto.status === 422, sinPunto.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testListarConSolicitud() {
  section('GET /api/solicitudes — después de crear');

  const r = await req('GET', '/api/solicitudes', null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('Al menos 1', r.body?.data?.length >= 1, r.body?.data?.length);

  const sol = r.body?.data?.find(s => s.id === solicitudId);
  if (!sol) {
    console.log('  DEBUG data:', JSON.stringify(r.body?.data));
    console.log('  DEBUG types:', typeof r.body?.data?.[0]?.id, typeof solicitudId);
  }
  assert('Solicitud creada aparece', !!sol, solicitudId);
  assert('Estado PENDIENTE', sol?.estado === 'PENDIENTE', sol?.estado);
  assert('dispositivos en respuesta', Array.isArray(sol?.dispositivos), sol?.dispositivos);

  // Filtro por estado
  const filtrado = await req('GET', '/api/solicitudes?estado=PENDIENTE', null, tokenUsuario);
  assert('Filtro ?estado=PENDIENTE → 200', filtrado.status === 200, filtrado.status);
  assert('Todas PENDIENTE', filtrado.body?.data?.every(s => s.estado === 'PENDIENTE'), filtrado.body?.data);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testDetalle() {
  section(`GET /api/solicitudes/${solicitudId} — detalle`);

  const r = await req('GET', `/api/solicitudes/${solicitudId}`, null, tokenUsuario);
  assert('Status 200', r.status === 200, r.status);
  assert('ID correcto', r.body?.data?.id === solicitudId || Number(r.body?.data?.id) === solicitudId);
  assert('dispositivos presentes', Array.isArray(r.body?.data?.dispositivos), r.body?.data?.dispositivos);
  assert('tipo_recoleccion DOMICILIO', r.body?.data?.tipo_recoleccion === 'DOMICILIO', r.body?.data?.tipo_recoleccion);

  // ID inexistente
  const nf = await req('GET', '/api/solicitudes/999999', null, tokenUsuario);
  assert('ID inexistente → 404', nf.status === 404, nf.status);

  // ID no numérico
  const bad = await req('GET', '/api/solicitudes/abc', null, tokenUsuario);
  assert('ID no numérico → 422', bad.status === 422, bad.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testCancelar() {
  section('PATCH /api/solicitudes/:id/cancelar — cancelar solicitud');

  // Crear segunda solicitud para cancelar
  const r = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [{ dispositivo_id: dispositivo2Id, cantidad: 1 }],
    direccion_recoleccion: 'Cra 50 #45-20',
    ciudad: 'Bogotá', telefono_contacto: '3001110000',
  }, tokenUsuario);
  assert('Segunda solicitud creada 201', r.status === 201, r.body);
  solicitudParaCancelarId = r.body?.data?.id;

  // Cancelar
  const cancel = await req('PATCH', `/api/solicitudes/${solicitudParaCancelarId}/cancelar`, null, tokenUsuario);
  assert('Cancelar → 200', cancel.status === 200, cancel.status);
  assert('Mensaje de cancelación', !!cancel.body?.data?.message, cancel.body?.data);

  // Verificar que quedó CANCELADA
  const check = await req('GET', `/api/solicitudes/${solicitudParaCancelarId}`, null, tokenUsuario);
  assert('Estado CANCELADA confirmado', check.body?.data?.estado === 'CANCELADA', check.body?.data?.estado);

  // Intentar cancelar de nuevo → debe fallar
  const dobleCancel = await req('PATCH', `/api/solicitudes/${solicitudParaCancelarId}/cancelar`, null, tokenUsuario);
  assert('Doble cancelar → 400', dobleCancel.status === 400, dobleCancel.status);
  assert('Código SOLICITUD_NO_CANCELABLE', dobleCancel.body?.error?.code === 'SOLICITUD_NO_CANCELABLE', dobleCancel.body?.error?.code);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testFlujoEmpresa() {
  section('EMPRESA — flujo completo: listar → aceptar → en-tránsito → recolectada');

  // Listar solicitudes empresa
  const lista = await req('GET', '/api/empresa/solicitudes', null, tokenEmpresa);
  assert('GET empresa/solicitudes → 200', lista.status === 200, lista.status);
  assert('success: true', lista.body?.success === true);
  assert('data es array', Array.isArray(lista.body?.data), lista.body?.data);
  assert('meta presente', !!lista.body?.meta, lista.body?.meta);
  assert('meta.total número', typeof lista.body?.meta?.total === 'number', lista.body?.meta?.total);

  const solicitudEnLista = lista.body?.data?.find(s => s.id === solicitudId || Number(s.id) === solicitudId);
  assert('Solicitud pendiente visible para empresa', !!solicitudEnLista, { solicitudId, data: lista.body?.data?.map(s => s.id) });

  // Aceptar
  const aceptar = await req('PATCH', `/api/empresa/solicitudes/${solicitudId}/aceptar`, {
    recolector_id: recolectorId,
    hora_estimada_inicio: '14:00',
    hora_estimada_fin: '17:00',
    comentario_empresa: 'Pasaremos el viernes entre 2 y 5pm',
  }, tokenEmpresa);
  assert('Aceptar → 200', aceptar.status === 200, aceptar.body);
  assert('Estado ACEPTADA', aceptar.body?.data?.estado === 'ACEPTADA', aceptar.body?.data?.estado);

  // Intentar aceptar de nuevo → error ESTADO_INVALIDO
  const dobleAceptar = await req('PATCH', `/api/empresa/solicitudes/${solicitudId}/aceptar`, {
    recolector_id: recolectorId,
    hora_estimada_inicio: '09:00',
    hora_estimada_fin: '12:00',
  }, tokenEmpresa);
  assert('Doble aceptar → 400', dobleAceptar.status === 400, dobleAceptar.status);

  // En tránsito
  const transito = await req('PATCH', `/api/empresa/solicitudes/${solicitudId}/en-transito`, {
    latitud_recolector: 6.2476,
    longitud_recolector: -75.5659,
    tiempo_estimado_minutos: 20,
  }, tokenEmpresa);
  assert('En tránsito → 200', transito.status === 200, transito.body);
  assert('Estado EN_TRANSITO', transito.body?.data?.estado === 'EN_TRANSITO', transito.body?.data?.estado);
  assert('latitud presente', transito.body?.data?.latitud_recolector === 6.2476, transito.body?.data?.latitud_recolector);

  // Recolectada
  const recolect = await req('PATCH', `/api/empresa/solicitudes/${solicitudId}/recolectada`, {
    puntos_otorgados: 1500,
    evidencia_url: 'https://cdn.ciclox.com/evidencias/foto1.jpg',
  }, tokenEmpresa);
  assert('Recolectada → 200', recolect.status === 200, recolect.body);
  assert('Estado RECOLECTADA', recolect.body?.data?.estado === 'RECOLECTADA', recolect.body?.data?.estado);
  assert('puntos_otorgados: 1500', recolect.body?.data?.puntos_otorgados === 1500, recolect.body?.data?.puntos_otorgados);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testCalificacion() {
  section(`POST /api/solicitudes/${solicitudId}/calificacion — calificar recolector`);

  const r = await req('POST', `/api/solicitudes/${solicitudId}/calificacion`, {
    estrellas: 5,
    comentario: 'Excelente servicio, muy puntual',
  }, tokenUsuario);
  assert('Calificación → 201', r.status === 201, r.body);
  assert('estrellas: 5', r.body?.data?.estrellas === 5, r.body?.data?.estrellas);

  // Calificar dos veces → error
  const doble = await req('POST', `/api/solicitudes/${solicitudId}/calificacion`, {
    estrellas: 3,
  }, tokenUsuario);
  assert('Doble calificación → 400', doble.status === 400, doble.status);
  assert('Código YA_CALIFICADO', doble.body?.error?.code === 'YA_CALIFICADO', doble.body?.error?.code);

  // Estrellas inválidas
  const badEst = await req('POST', `/api/solicitudes/${solicitudId}/calificacion`, {
    estrellas: 6,
  }, tokenUsuario);
  assert('Estrellas > 5 → 422', badEst.status === 422, badEst.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testSeguridad() {
  section('SEGURIDAD — auth y roles');

  // Sin token
  const sinToken = await req('GET', '/api/solicitudes');
  assert('Sin token → 401', sinToken.status === 401, sinToken.status);

  // Empresa no puede crear solicitudes de ciudadano
  const empCrea = await req('POST', '/api/solicitudes', {
    tipo_recoleccion: 'DOMICILIO',
    dispositivos: [{ dispositivo_id: 1, cantidad: 1 }],
    direccion_recoleccion: 'x', ciudad: 'x', telefono_contacto: '123',
  }, tokenEmpresa);
  assert('EMPRESA no puede crear solicitud ciudadano → 403', empCrea.status === 403, empCrea.status);
  assert('Código FORBIDDEN', empCrea.body?.error?.code === 'FORBIDDEN', empCrea.body?.error?.code);

  // Usuario no puede listar solicitudes empresa
  const usrLista = await req('GET', '/api/empresa/solicitudes', null, tokenUsuario);
  assert('USUARIO no puede listar empresa/solicitudes → 403', usrLista.status === 403, usrLista.status);

  // Usuario no puede aceptar
  const usrAcepta = await req('PATCH', `/api/empresa/solicitudes/${solicitudId}/aceptar`, {
    recolector_id: 1, hora_estimada_inicio: '09:00', hora_estimada_fin: '12:00',
  }, tokenUsuario);
  assert('USUARIO no puede aceptar → 403', usrAcepta.status === 403, usrAcepta.status);

  // Filtro estado inválido
  const badEstado = await req('GET', '/api/solicitudes?estado=INEXISTENTE', null, tokenUsuario);
  assert('Estado inválido en query → 422', badEstado.status === 422, badEstado.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function testEmpresaValidaciones() {
  section('EMPRESA — validaciones de schemas');

  // Aceptar sin recolector_id
  const sinRec = await req('PATCH', '/api/empresa/solicitudes/999/aceptar', {
    hora_estimada_inicio: '09:00',
    hora_estimada_fin: '12:00',
  }, tokenEmpresa);
  assert('Aceptar sin recolector_id → 422', sinRec.status === 422, sinRec.status);

  // Rechazar sin motivo
  const sinMotivo = await req('PATCH', '/api/empresa/solicitudes/999/rechazar', {}, tokenEmpresa);
  assert('Rechazar sin motivo → 422', sinMotivo.status === 422, sinMotivo.status);

  // Recolectada con puntos negativos
  const ptosNeg = await req('PATCH', '/api/empresa/solicitudes/999/recolectada', {
    puntos_otorgados: -100,
  }, tokenEmpresa);
  assert('puntos negativos → 422', ptosNeg.status === 422, ptosNeg.status);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Solicitudes${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
  console.log(`  ${c.dim}Target: ${BASE}${c.reset}`);

  try {
    await setup();
    await testListarVacia();
    await testCrearSolicitud();
    await testListarConSolicitud();
    await testDetalle();
    await testCrearSolicitudValidaciones();
    await testCancelar();
    await testFlujoEmpresa();
    await testCalificacion();
    await testSeguridad();
    await testEmpresaValidaciones();
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
