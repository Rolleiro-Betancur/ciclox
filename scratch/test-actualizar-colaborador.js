// scratch/test-actualizar-colaborador.js
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

async function testActualizarColaborador() {
  const ts = Date.now();
  const emailEmpresaA = `empresa_a_${ts}@test.com`;
  const emailEmpresaB = `empresa_b_${ts}@test.com`;
  const emailColaborador = `colab_${ts}@test.com`;
  
  let tokenEmpresaA, tokenEmpresaB;
  let colaboradorId;

  console.log('--- 1. Registrando Empresa A ---');
  const resRegEmpA = await request('/api/auth/registro', 'POST', {
    nombre: 'Admin Empresa A', email: emailEmpresaA, contrasena: 'Pass123!', telefono: '3001111111', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Empresa A S.A.S', nit: `NIT-A-${ts}`, descripcion: 'Reciclaje A' }
  });
  tokenEmpresaA = resRegEmpA.data.data.token;
  console.log(`✅ Empresa A registrada.`);

  console.log('\n--- 2. Registrando Empresa B ---');
  const resRegEmpB = await request('/api/auth/registro', 'POST', {
    nombre: 'Admin Empresa B', email: emailEmpresaB, contrasena: 'Pass123!', telefono: '3002222222', rol: 'EMPRESA',
    empresa: { nombre_empresa: 'Empresa B S.A.S', nit: `NIT-B-${ts}`, descripcion: 'Reciclaje B' }
  });
  tokenEmpresaB = resRegEmpB.data.data.token;
  console.log(`✅ Empresa B registrada.`);

  console.log('\n--- 3. Registrando Colaborador bajo Empresa A ---');
  const resRegColab = await request('/api/empresa/colaboradores', 'POST', {
    nombre: 'Pepito Colaborador',
    email: emailColaborador,
    contrasena: 'Temporal123!',
    telefono: '3007654321',
    tipo_documento: 'CEDULA_CIUDADANIA',
    numero_documento: '1000999888'
  }, tokenEmpresaA);
  
  if (resRegColab.status !== 201) {
    console.error('❌ Error al registrar colaborador:', resRegColab.data);
    process.exit(1);
  }
  
  colaboradorId = resRegColab.data.data.colaborador.id;
  console.log(`✅ Colaborador registrado con ID: ${colaboradorId}`);

  console.log('\n--- 4. Empresa A actualiza datos del Colaborador (Éxito) ---');
  const resActualizar = await request(`/api/empresa/colaboradores/${colaboradorId}`, 'PUT', {
    nombre: 'Pepito Actualizado',
    telefono: '3159998887',
    tipo_documento: 'PASAPORTE',
    numero_documento: 'PAS1234567',
    contrasena: 'NuevaContrasena123!'
  }, tokenEmpresaA);

  console.log(`Status: ${resActualizar.status}`);
  console.log(resActualizar.data);
  if (resActualizar.status === 200 && resActualizar.data.data.nombre === 'Pepito Actualizado') {
    console.log('✅ Los campos permitidos se actualizaron correctamente.');
  } else {
    console.error('❌ Error al actualizar campos permitidos.');
  }

  console.log('\n--- 5. Empresa A intenta actualizar el correo del Colaborador (Debe ser rechazado/ignorado por esquema) ---');
  const resActualizarEmail = await request(`/api/empresa/colaboradores/${colaboradorId}`, 'PUT', {
    email: 'intento_cambio@test.com'
  }, tokenEmpresaA);

  console.log(`Status: ${resActualizarEmail.status}`);
  console.log(resActualizarEmail.data);
  if (resActualizarEmail.status === 400 || (resActualizarEmail.status === 200 && resActualizarEmail.data.data.email === emailColaborador)) {
    console.log('✅ Intento de cambiar correo evitado (esquema ignoró o rechazó el campo).');
  } else {
    console.error('❌ Falló la protección del correo electrónico.');
  }

  console.log('\n--- 6. Empresa B intenta actualizar Colaborador de Empresa A (Fallo esperado: 404 / No pertenece) ---');
  const resActualizarEmpresaB = await request(`/api/empresa/colaboradores/${colaboradorId}`, 'PUT', {
    nombre: 'Pepito Hackeado'
  }, tokenEmpresaB);

  console.log(`Status: ${resActualizarEmpresaB.status}`);
  console.log(resActualizarEmpresaB.data);
  if (resActualizarEmpresaB.status === 404) {
    console.log('✅ Autorización correcta: Empresa B no pudo modificar al colaborador.');
  } else {
    console.error('❌ Error de seguridad: Empresa B modificó un colaborador ajeno.');
  }

  console.log('\n--- 7. Validar nueva contraseña del Colaborador (Iniciando Sesión) ---');
  const resLogin = await request('/api/auth/login', 'POST', {
    email: emailColaborador,
    contrasena: 'NuevaContrasena123!'
  });

  console.log(`Status: ${resLogin.status}`);
  console.log(resLogin.data);
  if (resLogin.status === 200 && resLogin.data.data.token) {
    console.log('✅ Colaborador pudo iniciar sesión exitosamente con su nueva contraseña.');
  } else {
    console.error('❌ El colaborador no pudo iniciar sesión con la contraseña actualizada.');
  }
}

testActualizarColaborador();
