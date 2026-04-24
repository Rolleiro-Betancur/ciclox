require('dotenv').config();
const http = require('http');

const request = (path, method, body, token = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(data);
    req.end();
  });
};

async function testUsuarios() {
  const ts = Date.now();
  const emailUsuario = `ciudadano_${ts}@test.com`;
  const emailEmpresa = `empresa_${ts}@test.com`;
  
  let tokenUsuario, tokenEmpresa;

  console.log('--- PREPARACIÓN: Registrando Ciudadano ---');
  const resRegUser = await request('/api/auth/registro', 'POST', {
    nombre: 'Carlos Ciudadano', email: emailUsuario, contrasena: 'Pass123!', telefono: '3001112222', rol: 'USUARIO'
  });
  tokenUsuario = resRegUser.data.data.token;
  console.log(`✅ Ciudadano registrado (Token obtenido)`);

  console.log('\n--- PREPARACIÓN: Registrando Empresa ---');
  const resRegEmp = await request('/api/auth/registro', 'POST', {
    nombre: 'Admin Empresa', email: emailEmpresa, contrasena: 'Pass123!', telefono: '3003334444', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Eco Test S.A.S', nit: `NIT-${ts}`, descripcion: 'Reciclaje inicial' }
  });
  tokenEmpresa = resRegEmp.data.data.token;
  console.log(`✅ Empresa registrada (Token obtenido)`);

  console.log('\n=============================================');
  console.log('🚀 INICIANDO PRUEBAS DEL MÓDULO DE USUARIOS');
  console.log('=============================================\n');

  // PRUEBAS DE CIUDADANO
  console.log('--- 1. GET /api/usuarios/perfil (Ciudadano) ---');
  const resGetPerfil = await request('/api/usuarios/perfil', 'GET', null, tokenUsuario);
  console.log(`Status: ${resGetPerfil.status}`);
  console.log(resGetPerfil.data.data);

  console.log('\n--- 2. PUT /api/usuarios/perfil (Ciudadano) ---');
  const resPutPerfil = await request('/api/usuarios/perfil', 'PUT', {
    direccion: 'Calle Falsa 123',
    departamento: 'Antioquia'
  }, tokenUsuario);
  console.log(`Status: ${resPutPerfil.status}`);
  console.log(resPutPerfil.data.data);

  // PRUEBAS DE EMPRESA
  console.log('\n--- 3. GET /api/usuarios/empresa/perfil (Empresa) ---');
  const resGetEmp = await request('/api/usuarios/empresa/perfil', 'GET', null, tokenEmpresa);
  console.log(`Status: ${resGetEmp.status}`);
  console.log(resGetEmp.data.data);

  console.log('\n--- 4. PUT /api/usuarios/empresa/perfil (Empresa) ---');
  const resPutEmp = await request('/api/usuarios/empresa/perfil', 'PUT', {
    descripcion: 'Actualizamos nuestra descripción corporativa',
    logo_url: 'https://ejemplo.com/logo-nuevo.png'
  }, tokenEmpresa);
  console.log(`Status: ${resPutEmp.status}`);
  console.log(resPutEmp.data.data);

  console.log('\n--- 5. PRUEBA DE SEGURIDAD: Ciudadano intentando acceder a perfil de Empresa ---');
  const resSeguridad = await request('/api/usuarios/empresa/perfil', 'GET', null, tokenUsuario);
  console.log(`Status: ${resSeguridad.status} (Debería ser 403)`);
  console.log(resSeguridad.data);
}

testUsuarios();
