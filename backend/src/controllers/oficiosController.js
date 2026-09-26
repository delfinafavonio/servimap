const prisma = require('../prismaClient');
const { ApiError } = require('../utils/http');
const { requireFields, parseBoolean, validateString } = require('../utils/validation');

async function obtenerOficios(req, res) {
  const where = req.usuario?.rol === 'ADMINISTRADOR' ? {} : { isActivo: true };
  res.json(await prisma.oficio.findMany({ where, orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }] }));
}

async function obtenerOficio(req, res) {
  const oficio = await prisma.oficio.findFirst({ where: { id: req.params.id, ...(req.usuario?.rol === 'ADMINISTRADOR' ? {} : { isActivo: true }) } });
  if (!oficio) throw new ApiError(404, 'Oficio no encontrado');
  res.json(oficio);
}

async function crearOficio(req, res) {
  requireFields(req.body, ['nombre', 'categoria']);
  try {
    const oficio = await prisma.oficio.create({ data: { nombre: validateString(req.body.nombre, 'nombre', { max: 80 }), categoria: validateString(req.body.categoria, 'categoria', { max: 80 }), isActivo: req.body.isActivo === undefined ? true : parseBoolean(req.body.isActivo, 'isActivo') } });
    res.status(201).json(oficio);
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'Ya existe un oficio con ese nombre');
    throw error;
  }
}

async function actualizarOficio(req, res) {
  const oficio = await prisma.oficio.findUnique({ where: { id: req.params.id } });
  if (!oficio) throw new ApiError(404, 'Oficio no encontrado');
  const data = {};
  for (const key of ['nombre', 'categoria']) if (req.body[key] !== undefined) data[key] = validateString(req.body[key], key, { max: 80 });
  if (req.body.isActivo !== undefined) data.isActivo = parseBoolean(req.body.isActivo, 'isActivo');
  try { res.json(await prisma.oficio.update({ where: { id: oficio.id }, data })); }
  catch (error) { if (error.code === 'P2002') throw new ApiError(409, 'Ya existe un oficio con ese nombre'); throw error; }
}

module.exports = { obtenerOficios, obtenerOficio, crearOficio, actualizarOficio };
