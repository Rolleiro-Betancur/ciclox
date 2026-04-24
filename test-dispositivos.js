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

async function testDispositivos() {
  const ts = Date.now();
  const emailUsuario = `ciudadano_disp_${ts}@test.com`;
  
  let tokenUsuario;

  console.log('--- PREPARACIÓN: Registrando Ciudadano ---');
  const resRegUser = await request('/api/auth/registro', 'POST', {
    nombre: 'Carlos Dispositivos', email: emailUsuario, contrasena: 'Pass123!', telefono: '3001112222', rol: 'USUARIO'
  });
  tokenUsuario = resRegUser.data.data.token;
  console.log(`✅ Ciudadano registrado (Token obtenido)`);

  console.log('\n=============================================');
  console.log('🚀 INICIANDO PRUEBAS DEL MÓDULO DE DISPOSITIVOS');
  console.log('=============================================\n');

  console.log('--- 1. POST /api/dispositivos (Crear Celular) ---');
  const resCrear = await request('/api/dispositivos', 'POST', {
    tipo: 'CELULAR',
    marca: 'Samsung',
    modelo: 'Galaxy S10',
    descripcion: 'Pantalla rota pero enciende',
    estado_fisico: 'ENCIENDE',
    anio_fabricacion: 2019
  }, tokenUsuario);
  console.log(`Status: ${resCrear.status}`);
  console.log(resCrear.data.data);
  const dispId = resCrear.data.data?.id;

  console.log('\n--- 2. GET /api/dispositivos (Listar todos) ---');
  const resListar = await request('/api/dispositivos', 'GET', null, tokenUsuario);
  console.log(`Status: ${resListar.status}`);
  console.log(resListar.data.data);

  console.log(`\n--- 3. GET /api/dispositivos/${dispId} (Obtener detalle) ---`);
  const resObtener = await request(`/api/dispositivos/${dispId}`, 'GET', null, tokenUsuario);
  console.log(`Status: ${resObtener.status}`);
  console.log(resObtener.data.data);

  console.log(`\n--- 4. PUT /api/dispositivos/${dispId} (Actualizar) ---`);
  const resActualizar = await request(`/api/dispositivos/${dispId}`, 'PUT', {
    descripcion: 'Pantalla rota, pero enciende. Incluye cargador.',
    estado_fisico: 'ROTO'
  }, tokenUsuario);
  console.log(`Status: ${resActualizar.status}`);
  console.log(resActualizar.data.data);

  console.log(`\n--- 5. DELETE /api/dispositivos/${dispId} (Soft Delete) ---`);
  const resEliminar = await request(`/api/dispositivos/${dispId}`, 'DELETE', null, tokenUsuario);
  console.log(`Status: ${resEliminar.status}`);
  console.log(resEliminar.data.data);

  console.log('\n--- 6. GET /api/dispositivos (Verificar que ya no sale en la lista) ---');
  const resListarVacia = await request('/api/dispositivos', 'GET', null, tokenUsuario);
  console.log(`Status: ${resListarVacia.status}`);
  console.log('Cantidad de dispositivos: ', resListarVacia.data.data?.length);
}

testDispositivos();
