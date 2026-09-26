require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/prismaClient');
const { seedOficios } = require('./seed');

const required = ['DEMO_ADMIN_EMAIL', 'DEMO_ADMIN_PASSWORD', 'DEMO_CLIENT_EMAIL', 'DEMO_CLIENT_PASSWORD', 'DEMO_PROVIDER_EMAIL', 'DEMO_PROVIDER_PASSWORD'];

async function upsertUser({ email, password, nombre, apellido, rol }) {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const usuario = await prisma.usuario.upsert({
    where: { email: normalized },
    create: { email: normalized, passwordHash, nombre, apellido, rol },
    update: { passwordHash, nombre, apellido, isActivo: true },
  });
  if (rol === 'ADMINISTRADOR') await prisma.administrador.upsert({ where: { usuarioId: usuario.id }, create: { usuarioId: usuario.id }, update: {} });
  if (rol === 'CLIENTE') await prisma.cliente.upsert({ where: { usuarioId: usuario.id }, create: { usuarioId: usuario.id }, update: {} });
  if (rol === 'PRESTADOR') await prisma.prestador.upsert({
    where: { usuarioId: usuario.id },
    create: { usuarioId: usuario.id, descripcionProfesional: 'Profesional de confianza con experiencia comprobable.', zonaCobertura: 'Palermo, Buenos Aires', telefono: '11 0000 0000', latitud: -34.583, longitud: -58.425, isDisponible: true },
    update: { descripcionProfesional: 'Profesional de confianza con experiencia comprobable.', zonaCobertura: 'Palermo, Buenos Aires', telefono: '11 0000 0000', latitud: -34.583, longitud: -58.425, isDisponible: true },
  });
  return usuario;
}

async function main() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables de demo: ${missing.join(', ')}`);
  const oficios = await seedOficios();
  await upsertUser({ email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD, nombre: 'Admin', apellido: 'ServiMap', rol: 'ADMINISTRADOR' });
  await upsertUser({ email: process.env.DEMO_CLIENT_EMAIL, password: process.env.DEMO_CLIENT_PASSWORD, nombre: 'Cliente', apellido: 'Demo', rol: 'CLIENTE' });
  const providerUser = await upsertUser({ email: process.env.DEMO_PROVIDER_EMAIL, password: process.env.DEMO_PROVIDER_PASSWORD, nombre: 'Profesional', apellido: 'Demo', rol: 'PRESTADOR' });
  const provider = await prisma.prestador.findUnique({ where: { usuarioId: providerUser.id } });
  const electricidad = oficios.find((item) => item.nombre === 'Electricidad');
  await prisma.prestadorOficio.upsert({
    where: { oficioId_prestadorId: { oficioId: electricidad.id, prestadorId: provider.id } },
    create: { oficioId: electricidad.id, prestadorId: provider.id, precio: 25000, isDisponible: true },
    update: { precio: 25000, isDisponible: true },
  });
  console.log('Datos de demostración inicializados de forma idempotente.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
