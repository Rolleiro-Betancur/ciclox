require('dotenv').config();
const http = require('http');
const { pool } = require('./src/config/database');

const request = (path, method, body, token = null) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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
    req.write(data);
    req.end();
  });
};

async function testAll() {
  const emailRandom = `fulltest_${Date.now()}@example.com`;
  const passOriginal = 'Password123!';
  const passNueva = 'NuevaPassword456!';
  let jwtToken = '';

  console.log('--- 1. POST /api/auth/registro ---');
  const resRegistro = await request('/api/auth/registro', 'POST', {
    nombre: 'Usuario Full Test',
    email: emailRandom,
    contrasena: passOriginal,
    telefono: '3000000000',
    rol: 'USUARIO'
  });
  console.log(`Status: ${resRegistro.status}`);
  console.log(resRegistro.data.success ? '✅ Registro exitoso' : '❌ Fallo registro');

  console.log('\n--- 2. POST /api/auth/login ---');
  const resLogin = await request('/api/auth/login', 'POST', {
    email: emailRandom,
    contrasena: passOriginal
  });
  console.log(`Status: ${resLogin.status}`);
  if (resLogin.data.success) {
    console.log('✅ Login exitoso');
    jwtToken = resLogin.data.data.token;
  } else {
    console.log('❌ Fallo login');
  }

  console.log('\n--- 3. POST /api/auth/fcm-token (Protegido con JWT) ---');
  const resFcm = await request('/api/auth/fcm-token', 'POST', {
    fcm_token: 'token_dispositivo_firebase_abc123'
  }, jwtToken);
  console.log(`Status: ${resFcm.status}`);
  console.log(resFcm.data.success ? '✅ Token FCM guardado' : '❌ Fallo FCM');

  console.log('\n--- 4. POST /api/auth/recuperar-contrasena ---');
  const resRecuperar = await request('/api/auth/recuperar-contrasena', 'POST', {
    email: emailRandom
  });
  console.log(`Status: ${resRecuperar.status}`);
  console.log(resRecuperar.data.success ? '✅ Correo de recuperación solicitado' : '❌ Fallo recuperar');

  // Obtener el código directamente de la BD (simulando que leímos el correo)
  const resultDb = await pool.query('SELECT codigo_recuperacion FROM usuarios WHERE email = $1', [emailRandom]);
  const codigo = resultDb.rows[0].codigo_recuperacion;
  console.log(`[SIMULACIÓN] Código recibido en el correo: ${codigo}`);

  console.log('\n--- 5. POST /api/auth/verificar-codigo ---');
  const resVerificar = await request('/api/auth/verificar-codigo', 'POST', {
    email: emailRandom,
    codigo: codigo
  });
  console.log(`Status: ${resVerificar.status}`);
  console.log(resVerificar.data.success ? '✅ Código válido' : '❌ Fallo validar código');

  console.log('\n--- 6. POST /api/auth/cambiar-contrasena ---');
  const resCambiar = await request('/api/auth/cambiar-contrasena', 'POST', {
    email: emailRandom,
    codigo: codigo,
    nueva_contrasena: passNueva
  });
  console.log(`Status: ${resCambiar.status}`);
  console.log(resCambiar.data.success ? '✅ Contraseña cambiada' : '❌ Fallo cambiar contraseña');

  console.log('\n--- 7. POST /api/auth/login (Con nueva contraseña) ---');
  const resLoginNuevo = await request('/api/auth/login', 'POST', {
    email: emailRandom,
    contrasena: passNueva
  });
  console.log(`Status: ${resLoginNuevo.status}`);
  console.log(resLoginNuevo.data.success ? '✅ Login con nueva contraseña exitoso' : '❌ Fallo login nuevo');

  // Limpiar BD
  await pool.end();
}

testAll();
