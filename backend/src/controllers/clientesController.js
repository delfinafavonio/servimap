const prisma = require('../prismaClient');
const { parseCoordinates } = require('../utils/validation');

async function miPerfil(req, res) {
  res.json(await prisma.cliente.findUnique({ where: { id: req.usuario.cliente.id } }));
}

async function actualizarPerfil(req, res) {
  const coordinates = parseCoordinates(req.body.latitudUbicacion, req.body.longitudUbicacion);
  res.json(await prisma.cliente.update({
    where: { id: req.usuario.cliente.id },
    data: { latitudUbicacion: coordinates.latitud, longitudUbicacion: coordinates.longitud },
  }));
}

module.exports = { miPerfil, actualizarPerfil };
