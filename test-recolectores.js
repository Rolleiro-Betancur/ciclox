/**
 * test-recolectores.js
 * Pruebas completas del módulo /api/empresa/recolectores
 *
 * Flujo:
 *  1. Registrar empresa de prueba  → obtener JWT
 *  2. GET    /api/empresa/recolectores          (lista vacía)
 *  3. POST   /api/empresa/recolectores          (crear)
 *  4. GET    /api/empresa/recolectores          (lista con 1)
 *  5. GET    /api/empresa/recolectores/:id      (detalle)
 *  6. PUT    /api/empresa/recolectores/:id      (actualizar)
 *  7. GET    /api/empresa/recolectores/:id/calificaciones
 *  8. DELETE /api/empresa/recolectores/:id      (soft-delete)
 *  9. GET    /api/empresa/recolectores?activo=false (verificar desactivado)
 * 10. Casos de error: sin token, rol incorrecto, id inexistente, body inválido
 */

require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;

// ── Colores ANSI ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red:   '\x1b[31m',
  yellow:'\x1b[33m',
  cyan:  '\x1b[36m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
};

// ── Estado global de la suite ─────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let token  = null;        // JWT empresa
let tokenUsuario = null;  // JWT usuario normal
let recolectorId = null;  // ID creado en el test POST

// ── Helpers ───────────────────────────────────────────────────────────────────

async function request(method, path, body = null, jwt = null) {
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
  if (condition) {
    console.log(`  ${c.green}✔${c.reset} ${name}`);
    passed++;
  } else {
    console.log(`  ${c.red}✘ ${name}${c.reset}`);
    if (actual !== undefined) {
      console.log(`    ${c.dim}→ Recibido: ${JSON.stringify(actual)}${c.reset}`);
    }
    failed++;
  }
}

function section(title) {
  console.log(`\n${c.cyan}${c.bold}▶ ${title}${c.reset}`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function setup() {
  section('SETUP — Registrar empresa y usuario de prueba');

  const ts = Date.now();

  // Empresa
  const emp = await request('POST', '/api/auth/registro', {
    nombre:     'EmpresaTest ' + ts,
    email:      `empresa_test_${ts}@ciclox.com`,
    contrasena: 'Empresa123!',
    telefono:   '3001234567',
    rol:        'EMPRESA',
    empresa: {
      nombre_empresa: 'EcoTest S.A.S',
      nit:            '900000001-' + (ts % 9),
      descripcion:    'Empresa de prueba para tests',
    },
  });
  assert('Registro empresa → 201', emp.status === 201, emp.body);
  token = emp.body?.data?.token;
  assert('JWT empresa presente', !!token);

  // Usuario normal (para test de rol incorrecto)
  const usr = await request('POST', '/api/auth/registro', {
    nombre:     'UsuarioTest ' + ts,
    email:      `usuario_test_${ts}@ciclox.com`,
    contrasena: 'Usuario123!',
    telefono:   '3009876543',
    rol:        'USUARIO',
  });
  assert('Registro usuario → 201', usr.status === 201, usr.body);
  tokenUsuario = usr.body?.data?.token;
  assert('JWT usuario presente', !!tokenUsuario);
}

async function testListarVacia() {
  section('GET /api/empresa/recolectores — lista inicial');

  const r = await request('GET', '/api/empresa/recolectores', null, token);
  assert('Status 200', r.status === 200, r.status);
  assert('success: true', r.body?.success === true);
  assert('data es array', Array.isArray(r.body?.data), r.body?.data);
}

async function testCrear() {
  section('POST /api/empresa/recolectores — crear recolector');

  // ── Caso feliz ──────────────────────────────────────────────────
  const r = await request('POST', '/api/empresa/recolectores', {
    nombre:   'Carlos Recolector',
    telefono: '3111234567',
    foto_url: 'https://cdn.ciclox.com/fotos/carlos.jpg',
  }, token);

  assert('Status 201', r.status === 201, r.status);
  assert('success: true', r.body?.success === true);
  assert('nombre correcto', r.body?.data?.nombre === 'Carlos Recolector', r.body?.data?.nombre);
  assert('activo: true por defecto', r.body?.data?.activo === true, r.body?.data?.activo);
  assert('calificacion_promedio: 0', r.body?.data?.calificacion_promedio === 0, r.body?.data?.calificacion_promedio);
  assert('id presente', typeof r.body?.data?.id === 'number', r.body?.data?.id);

  recolectorId = r.body?.data?.id;

  // ── Crear sin nombre (validación Zod) ───────────────────────────
  const bad = await request('POST', '/api/empresa/recolectores', {
    telefono: '3111111111',
  }, token);
  assert('Sin nombre → 422', bad.status === 422, bad.status);
  assert('Código VALIDATION_ERROR', bad.body?.error?.code === 'VALIDATION_ERROR', bad.body?.error?.code);

  // ── foto_url inválida ────────────────────────────────────────────
  const badUrl = await request('POST', '/api/empresa/recolectores', {
    nombre:   'Test URL',
    foto_url: 'no-es-url',
  }, token);
  assert('foto_url inválida → 422', badUrl.status === 422, badUrl.status);
}

async function testListarConRegistro() {
  section('GET /api/empresa/recolectores — después de crear');

  const r = await request('GET', '/api/empresa/recolectores', null, token);
  assert('Status 200', r.status === 200, r.status);
  assert('Al menos 1 recolector', r.body?.data?.length >= 1, r.body?.data?.length);

  const encontrado = r.body?.data?.find(rc => rc.id === recolectorId);
  assert('Recolector creado aparece en lista', !!encontrado, recolectorId);
  assert('solicitudes_activas presente', encontrado?.solicitudes_activas !== undefined, encontrado);

  // Filtro ?activo=true
  const filtrado = await request('GET', '/api/empresa/recolectores?activo=true', null, token);
  assert('Filtro activo=true → 200', filtrado.status === 200, filtrado.status);
  assert('Todos activos en resultado', filtrado.body?.data?.every(rc => rc.activo === true), filtrado.body?.data);
}

async function testObtenerDetalle() {
  section(`GET /api/empresa/recolectores/${recolectorId} — detalle`);

  const r = await request('GET', `/api/empresa/recolectores/${recolectorId}`, null, token);
  assert('Status 200', r.status === 200, r.status);
  assert('ID correcto', r.body?.data?.id === recolectorId, r.body?.data?.id);
  assert('nombre correcto', r.body?.data?.nombre === 'Carlos Recolector', r.body?.data?.nombre);
  assert('foto_url presente', !!r.body?.data?.foto_url, r.body?.data?.foto_url);

  // ID inexistente
  const notFound = await request('GET', '/api/empresa/recolectores/999999', null, token);
  assert('ID inexistente → 404', notFound.status === 404, notFound.status);
  assert('Código NOT_FOUND', notFound.body?.error?.code === 'NOT_FOUND', notFound.body?.error?.code);

  // ID no numérico
  const badId = await request('GET', '/api/empresa/recolectores/abc', null, token);
  assert('ID no numérico → 422', badId.status === 422, badId.status);
}

async function testActualizar() {
  section(`PUT /api/empresa/recolectores/${recolectorId} — actualizar`);

  // Actualizar nombre y telefono
  const r = await request('PUT', `/api/empresa/recolectores/${recolectorId}`, {
    nombre:   'Carlos R. Actualizado',
    telefono: '3199999999',
  }, token);
  assert('Status 200', r.status === 200, r.status);
  assert('Nombre actualizado', r.body?.data?.nombre === 'Carlos R. Actualizado', r.body?.data?.nombre);
  assert('Teléfono actualizado', r.body?.data?.telefono === '3199999999', r.body?.data?.telefono);

  // Actualizar solo activo (sin tocar otros campos)
  const rActivo = await request('PUT', `/api/empresa/recolectores/${recolectorId}`, {
    activo: false,
  }, token);
  assert('Desactivar vía PUT → 200', rActivo.status === 200, rActivo.status);
  assert('activo cambiado a false', rActivo.body?.data?.activo === false, rActivo.body?.data?.activo);

  // Reactivar
  const rReactivar = await request('PUT', `/api/empresa/recolectores/${recolectorId}`, {
    activo: true,
  }, token);
  assert('Reactivar vía PUT → 200', rReactivar.status === 200, rReactivar.status);
  assert('activo: true de nuevo', rReactivar.body?.data?.activo === true, rReactivar.body?.data?.activo);

  // foto_url inválida en PUT
  const badUrl = await request('PUT', `/api/empresa/recolectores/${recolectorId}`, {
    foto_url: 'no-url',
  }, token);
  assert('foto_url inválida en PUT → 422', badUrl.status === 422, badUrl.status);

  // ID inexistente en PUT (nombre >= 2 chars para pasar validación Zod)
  const notFound = await request('PUT', '/api/empresa/recolectores/999999', {
    nombre: 'Inexistente',
  }, token);
  assert('PUT id inexistente → 404', notFound.status === 404, notFound.status);
}

async function testCalificaciones() {
  section(`GET /api/empresa/recolectores/${recolectorId}/calificaciones`);

  const r = await request('GET', `/api/empresa/recolectores/${recolectorId}/calificaciones`, null, token);
  assert('Status 200', r.status === 200, r.status);
  assert('success: true', r.body?.success === true);
  assert('data.recolector presente', !!r.body?.data?.recolector, r.body?.data);
  assert('data.calificaciones es array', Array.isArray(r.body?.data?.calificaciones), r.body?.data?.calificaciones);
  assert('meta presente con total', typeof r.body?.meta?.total === 'number', r.body?.meta);

  // Paginación
  const paged = await request('GET', `/api/empresa/recolectores/${recolectorId}/calificaciones?page=1&limit=5`, null, token);
  assert('Paginación ?limit=5 → 200', paged.status === 200, paged.status);
  assert('meta.limit=5', paged.body?.meta?.limit === 5, paged.body?.meta?.limit);
}

async function testSoftDelete() {
  section(`DELETE /api/empresa/recolectores/${recolectorId} — soft-delete`);

  const r = await request('DELETE', `/api/empresa/recolectores/${recolectorId}`, null, token);
  assert('Status 200', r.status === 200, r.status);
  assert('Mensaje de confirmación', !!r.body?.data?.message, r.body?.data);
  assert('activo: false en respuesta', r.body?.data?.recolector?.activo === false, r.body?.data?.recolector);

  // Verificar que sigue existiendo pero inactivo
  const check = await request('GET', `/api/empresa/recolectores/${recolectorId}`, null, token);
  assert('Sigue existiendo tras DELETE', check.status === 200, check.status);
  assert('activo: false confirmado en GET', check.body?.data?.activo === false, check.body?.data?.activo);

  // Verificar filtro ?activo=false
  const listaInactivos = await request('GET', '/api/empresa/recolectores?activo=false', null, token);
  assert('Aparece en lista activo=false', listaInactivos.body?.data?.some(rc => rc.id === recolectorId), listaInactivos.body?.data);

  // DELETE id inexistente
  const notFound = await request('DELETE', '/api/empresa/recolectores/999999', null, token);
  assert('DELETE id inexistente → 404', notFound.status === 404, notFound.status);
}

async function testSeguridad() {
  section('SEGURIDAD — Auth y roles');

  // Sin token
  const sinToken = await request('GET', '/api/empresa/recolectores');
  assert('Sin token → 401', sinToken.status === 401, sinToken.status);
  assert('Código UNAUTHORIZED', sinToken.body?.error?.code === 'UNAUTHORIZED', sinToken.body?.error?.code);

  // Token inválido
  const badToken = await request('GET', '/api/empresa/recolectores', null, 'token.invalido.jwt');
  assert('Token inválido → 401', badToken.status === 401, badToken.status);

  // Rol USUARIO intentando crear recolector
  const rolMal = await request('POST', '/api/empresa/recolectores', {
    nombre: 'Test',
  }, tokenUsuario);
  assert('Rol USUARIO en ruta EMPRESA → 403', rolMal.status === 403, rolMal.status);
  assert('Código FORBIDDEN', rolMal.body?.error?.code === 'FORBIDDEN', rolMal.body?.error?.code);

  // Rol USUARIO intentando listar
  const rolMalGet = await request('GET', '/api/empresa/recolectores', null, tokenUsuario);
  assert('USUARIO no puede listar recolectores → 403', rolMalGet.status === 403, rolMalGet.status);
}

// ── Runner principal ──────────────────────────────────────────────────────────

async function runAll() {
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  🧪 Ciclox API — Tests Módulo Recolectores${c.reset}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
  console.log(`  ${c.dim}Target: ${BASE}${c.reset}`);

  try {
    await setup();
    await testListarVacia();
    await testCrear();
    await testListarConRegistro();
    await testObtenerDetalle();
    await testActualizar();
    await testCalificaciones();
    await testSoftDelete();
    await testSeguridad();
  } catch (err) {
    console.error(`\n${c.red}Error inesperado en los tests:${c.reset}`, err.message);
    process.exit(1);
  }

  // ── Resumen final ─────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
  console.log(`  Resultado: ${c.green}${passed} pasaron${c.reset}  |  ${failed > 0 ? c.red : c.dim}${failed} fallaron${c.reset}  |  Total: ${total}`);
  console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runAll();
