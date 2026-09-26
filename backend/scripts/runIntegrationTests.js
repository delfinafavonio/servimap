require('dotenv').config();
const { Client } = require('pg');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function testUrl() {
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  if (!process.env.TEST_DATABASE_URL) url.pathname = '/servimap_test';
  const database = url.pathname.slice(1);
  if (database !== 'servimap_test') throw new Error(`Base de prueba insegura: ${database}. Debe ser servimap_test.`);
  return url;
}

async function ensureDatabase(url) {
  const admin = new URL(url); admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', ['servimap_test']);
    if (!exists.rowCount) await client.query('CREATE DATABASE servimap_test');
  } finally { await client.end(); }
}

function runNode(args, env) {
  const result = spawnSync(process.execPath, args, { cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

async function main() {
  const url = testUrl();
  await ensureDatabase(url);
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), JWT_SECRET: process.env.TEST_JWT_SECRET || 'integration-secret-not-used-outside-tests' };
  runNode([require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], env);
  runNode(['--test', 'integration/api.integration.js'], env);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { testUrl, ensureDatabase, runNode };
