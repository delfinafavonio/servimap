const prisma = require('../prismaClient');

async function obtenerOficios(req, res) {
  try {
    const oficios = await prisma.oficio.findMany();
    res.json(oficios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los oficios', detalle: error.message });
  }
}

module.exports = { obtenerOficios };