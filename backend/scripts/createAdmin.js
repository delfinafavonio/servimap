require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/prismaClient');

async function main() {
  const { ADMIN_NOMBRE, ADMIN_APELLIDO, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NOMBRE || !ADMIN_APELLIDO || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    throw new Error('Definí ADMIN_NOMBRE, ADMIN_APELLIDO, ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) sólo en tu entorno local.');
  }
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await prisma.usuario.findUnique({ where: { email } })) throw new Error('Ya existe un usuario con ese correo.');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.usuario.create({ data: { nombre: ADMIN_NOMBRE.trim(), apellido: ADMIN_APELLIDO.trim(), email, passwordHash, rol: 'ADMINISTRADOR', administrador: { create: {} } } });
  console.log(`Administrador creado: ${email}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
