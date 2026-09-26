require('dotenv').config();
const prisma = require('../src/prismaClient');

const OFICIOS_INICIALES = [
  ['Electricidad', 'Instalaciones'], ['Plomería', 'Instalaciones'],
  ['Gas', 'Instalaciones'], ['Pintura', 'Construcción'],
  ['Carpintería', 'Construcción'], ['Albañilería', 'Construcción'],
  ['Jardinería', 'Exterior'], ['Limpieza', 'Hogar'],
];

async function seedOficios(client = prisma) {
  const results = [];
  for (const [nombre, categoria] of OFICIOS_INICIALES) {
    results.push(await client.oficio.upsert({ where: { nombre }, create: { nombre, categoria, isActivo: true }, update: { categoria } }));
  }
  return results;
}

async function main() {
  const results = await seedOficios();
  console.log(`${results.length} oficios inicializados sin duplicados.`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

module.exports = { OFICIOS_INICIALES, seedOficios };
