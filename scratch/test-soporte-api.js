// scratch/test-soporte-api.js
// Script para probar el endpoint POST /api/soporte/empresa vía HTTP

const http = require('http');
const https = require('https');

// Obtener la URL base desde los argumentos de consola o usar localhost por defecto
const baseUrl = process.argv[2] || 'http://localhost:3000';
console.log(`🧪 Iniciando pruebas HTTP del endpoint /api/soporte/empresa`);
console.log(`🌐 Target API: ${baseUrl}\n`);

// Helper para realizar peticiones HTTP/HTTPS
const request = (urlStr, method, body, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = JSON.stringify(body);
    
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const reqLib = url.protocol === 'https:' ? https : http;

    const req = reqLib.request(options, (res) => {
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
    req.write(data);
    req.end();
  });
};

async function run() {
  const ts = Date.now();
  const email = `empresa_soporte_${ts}@ciclox.com`;
  const contrasena = 'CicloxEmpresa123!';

  try {
    // 1. Registrar una nueva empresa
    console.log('1️⃣ Registrando empresa de prueba...');
    const regRes = await request(`${baseUrl}/api/auth/registro`, 'POST', {
      nombre: `Soporte Test ${ts}`,
      email: email,
      contrasena: contrasena,
      telefono: '3005554433',
      rol: 'EMPRESA',
      empresa: {
        nombre_empresa: `Empresa Soporte ${ts}`,
        nit: `90123456-${ts % 10}`,
        descripcion: 'Empresa para pruebas de soporte'
      }
    });

    console.log(`   Status: ${regRes.status}`);
    if (regRes.status !== 201 || !regRes.data?.success) {
      console.error('❌ Fallo al registrar empresa:', regRes.data);
      process.exit(1);
    }
    const token = regRes.data.data.token;
    console.log('   ✅ Registro de empresa exitoso. Token recibido.');

    // 2. Enviar el formulario de soporte con token de Empresa
    console.log('\n2️⃣ Enviando formulario de soporte de empresa (POST /api/soporte/empresa)...');
    const soporteRes = await request(`${baseUrl}/api/soporte/empresa`, 'POST', {
      nombre: 'Juan',
      apellido: 'Perez',
      asunto: 'Error en plataforma',
      descripcion: 'No se puede subir el archivo de certificados ambientales.'
    }, token);

    console.log(`   Status: ${soporteRes.status}`);
    if (soporteRes.status === 201 && soporteRes.data?.success) {
      console.log('   ✅ Formulario enviado con éxito!');
      console.log('   Datos guardados:', soporteRes.data.data);
    } else {
      console.error('   ❌ Fallo al enviar formulario:', soporteRes.data);
    }

    // 3. Probar validación Zod (enviando datos inválidos)
    console.log('\n3️⃣ Probando validación (datos inválidos)...');
    const valRes = await request(`${baseUrl}/api/soporte/empresa`, 'POST', {
      nombre: 'J', // muy corto
      apellido: '',
      asunto: 'Ok',
      descripcion: 'Corto'
    }, token);

    console.log(`   Status: ${valRes.status}`);
    if (valRes.status === 422) {
      console.log('   ✅ Validación Zod interceptó correctamente los datos inválidos (Status 422).');
      console.log('   Errores recibidos:', valRes.data.error.fields);
    } else {
      console.error('   ❌ Error: Se esperaba código 422 pero se recibió:', valRes.status, valRes.data);
    }

  } catch (error) {
    console.error('💥 Error inesperado durante el test:', error.message);
  }
}

run();
