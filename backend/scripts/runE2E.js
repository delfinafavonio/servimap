require('dotenv').config();
const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const bcrypt = require('bcryptjs');
const { testUrl, ensureDatabase, runNode } = require('./runIntegrationTests');

const backendDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(backendDir, '..', 'frontend');

async function waitFor(url, processRef) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (processRef.exitCode !== null) throw new Error(`El servidor terminó antes de responder: ${url}`);
    try { const response = await fetch(url); if (response.ok) return; } catch { /* todavía iniciando */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Tiempo agotado esperando ${url}`);
}

async function clean(prisma) {
  const [row] = await prisma.$queryRawUnsafe('SELECT current_database() AS name');
  if (row.name !== 'servimap_test') throw new Error(`Limpieza E2E bloqueada en ${row.name}`);
  await prisma.calificacion.deleteMany(); await prisma.solicitud.deleteMany(); await prisma.prestadorOficio.deleteMany();
  await prisma.administrador.deleteMany(); await prisma.cliente.deleteMany(); await prisma.prestador.deleteMany();
  await prisma.usuario.deleteMany(); await prisma.oficio.deleteMany();
}

async function main() {
  const url = testUrl(); await ensureDatabase(url);
  const secret = process.env.TEST_JWT_SECRET || crypto.randomBytes(32).toString('hex');
  const sharedEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), JWT_SECRET: secret };
  runNode([require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], sharedEnv);
  process.env.DATABASE_URL = url.toString(); process.env.JWT_SECRET = secret; process.env.NODE_ENV = 'test';
  const prisma = require('../src/prismaClient'); const { seedOficios } = require('./seed');
  await clean(prisma); await seedOficios();
  const password = `E2E!${crypto.randomBytes(18).toString('hex')}`;
  const suffix = crypto.randomUUID();
  const credentials = { E2E_PASSWORD: password, E2E_CLIENT_EMAIL: `cliente-${suffix}@servimap.test`, E2E_PROVIDER_EMAIL: `prestador-${suffix}@servimap.test`, E2E_ADMIN_EMAIL: `admin-${suffix}@servimap.test` };
  const admin = await prisma.usuario.create({ data: { nombre: 'Admin', apellido: 'E2E', email: credentials.E2E_ADMIN_EMAIL, passwordHash: await bcrypt.hash(password, 12), rol: 'ADMINISTRADOR' } });
  await prisma.administrador.create({ data: { usuarioId: admin.id } });

  const backend = spawn(process.execPath, ['src/index.js'], { cwd: backendDir, env: { ...sharedEnv, PORT: '3100', CORS_ORIGIN: 'http://127.0.0.1:5174' }, stdio: 'inherit' });
  const viteCli = path.resolve(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
  const frontend = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', '5174'], { cwd: frontendDir, env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:3100/api' }, stdio: 'inherit' });
  try {
    await Promise.all([waitFor('http://127.0.0.1:3100/api/health', backend), waitFor('http://127.0.0.1:5174', frontend)]);
    const playwrightCli = require.resolve('@playwright/test/cli', { paths: [frontendDir] });
    runNode([playwrightCli, 'test', '--config', path.resolve(frontendDir, 'playwright.config.js')], { ...sharedEnv, ...credentials, E2E_BASE_URL: 'http://127.0.0.1:5174', CHROME_PATH: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  } finally {
    backend.kill(); frontend.kill(); await clean(prisma); await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
