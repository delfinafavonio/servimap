const prisma = require('../prismaClient');
const { ApiError } = require('../utils/http');
const { normalizeEmail, parseCoordinates, validateString } = require('../utils/validation');
const { uploadProfileImage } = require('../utils/imageUpload');

const include = { usuario: { select: { nombre: true, apellido: true, email: true } } };

function present(cliente) {
  return { id: cliente.id, nombre: cliente.usuario.nombre, apellido: cliente.usuario.apellido, email: cliente.usuario.email, fotoPerfil: cliente.fotoPerfil, latitudUbicacion: cliente.latitudUbicacion === null ? null : Number(cliente.latitudUbicacion), longitudUbicacion: cliente.longitudUbicacion === null ? null : Number(cliente.longitudUbicacion) };
}

async function miPerfil(req, res) {
  res.json(present(await prisma.cliente.findUnique({ where: { id: req.usuario.cliente.id }, include })));
}

async function actualizarPerfil(req, res) {
  const coordinates = parseCoordinates(req.body.latitudUbicacion, req.body.longitudUbicacion);
  const userData = {};
  if (req.body.nombre !== undefined) userData.nombre = validateString(req.body.nombre, 'nombre', { max: 80 });
  if (req.body.apellido !== undefined) userData.apellido = validateString(req.body.apellido, 'apellido', { max: 80 });
  if (req.body.email !== undefined) { const email = normalizeEmail(req.body.email); if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'El correo no es válido'); userData.email = email; }
  try {
    const updated = await prisma.$transaction(async (transaction) => {
      if (Object.keys(userData).length) await transaction.usuario.update({ where: { id: req.usuario.id }, data: userData });
      return transaction.cliente.update({ where: { id: req.usuario.cliente.id }, data: { latitudUbicacion: coordinates.latitud, longitudUbicacion: coordinates.longitud }, include });
    });
    res.json(present(updated));
  } catch (error) { if (error.code === 'P2002') throw new ApiError(409, 'Ya existe una cuenta CLIENTE con ese correo'); throw error; }
}

async function subirFoto(req, res) {
  const fotoPerfil = await uploadProfileImage(req.body.dataUrl, `cliente-${req.usuario.cliente.id}`);
  const updated = await prisma.cliente.update({ where: { id: req.usuario.cliente.id }, data: { fotoPerfil }, include });
  res.json(present(updated));
}

module.exports = { miPerfil, actualizarPerfil, subirFoto };
