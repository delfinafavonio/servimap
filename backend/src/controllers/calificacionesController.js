const prisma = require('../prismaClient');
const { ApiError } = require('../utils/http');
const { requireFields, validateRating, validateString, parseBoolean } = require('../utils/validation');

async function crear(req, res) {
  requireFields(req.body, ['solicitudId', 'puntaje', 'comentario']);
  const puntaje = validateRating(req.body.puntaje);
  const solicitud = await prisma.solicitud.findUnique({ where: { id: req.body.solicitudId }, include: { calificacion: true } });
  if (!solicitud || solicitud.clienteId !== req.usuario.cliente.id) throw new ApiError(403, 'No podés calificar esta solicitud');
  if (solicitud.estado !== 'FINALIZADA') throw new ApiError(409, 'Sólo se pueden calificar trabajos finalizados');
  if (solicitud.calificacion) throw new ApiError(409, 'La solicitud ya fue calificada');
  try { res.status(201).json(await prisma.calificacion.create({ data: { solicitudId: solicitud.id, puntaje, comentario: validateString(req.body.comentario, 'comentario', { max: 1000 }) } })); }
  catch (error) { if (error.code === 'P2002') throw new ApiError(409, 'La solicitud ya fue calificada'); throw error; }
}

async function listarModeracion(_req, res) {
  res.json(await prisma.calificacion.findMany({
    include: { solicitud: { include: { cliente: { include: { usuario: { select: { nombre: true, apellido: true } } } }, prestador: { include: { usuario: { select: { nombre: true, apellido: true } } } }, oficio: true } } },
    orderBy: { fechaPublicacion: 'desc' },
  }));
}

async function moderar(req, res) {
  requireFields(req.body, ['isModerada']);
  const isModerada = parseBoolean(req.body.isModerada, 'isModerada');
  if (isModerada && !String(req.body.motivo || '').trim()) throw new ApiError(400, 'El motivo de moderación es obligatorio');
  const existing = await prisma.calificacion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Calificación no encontrada');
  res.json(await prisma.calificacion.update({
    where: { id: existing.id },
    data: {
      isModerada,
      motivoModeracion: isModerada ? validateString(req.body.motivo, 'motivo', { max: 500 }) : null,
      fechaModeracion: isModerada ? new Date() : null,
    },
  }));
}

module.exports = { crear, listarModeracion, moderar };
