const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'mi-app-db.cq1cm6iu6l76.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'postgres',
  password: 'ciclox12345',
  database: 'postgres',
});

async function run() {
  await client.connect();
  console.log('Conectado a la base de datos');
  const sql = fs.readFileSync(path.join(__dirname, 'migration_colaboradores.sql'), 'utf8');
  await client.query(sql);
  console.log('Migración completada exitosamente');
  await client.end();
}

run().catch(err => {
  console.error('Error ejecutando migración:', err);
  process.exit(1);
});
