const prisma = require('../prismaClient');
const { ApiError } = require('../utils/http');
const { requireFields, validateString } = require('../utils/validation');
const { canTransition } = require('../utils/solicitudes');

const include = {
  cliente: { select: { id: true, latitudUbicacion: true, longitudUbicacion: true, usuario: { select: { nombre: true, apellido: true } } } },
  prestador: { select: { id: true, latitud: true, longitud: true, usuario: { select: { nombre: true, apellido: true } } } },
  oficio: true,
  calificacion: true,
};

function distanceKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function present(solicitud, role) {
  const { latitudUbicacion, longitudUbicacion, ...cliente } = solicitud.cliente;
  const { latitud, longitud, ...prestador } = solicitud.prestador;
  const hasCoordinates = [latitudUbicacion, longitudUbicacion, latitud, longitud].every((value) => value !== null);
  return { ...solicitud, cliente, prestador, distanciaKm: role === 'PRESTADOR' && hasCoordinates ? Number(distanceKm(Number(latitud), Number(longitud), Number(latitudUbicacion), Number(longitudUbicacion)).toFixed(1)) : undefined };
}

async function crear(req, res) {
  requireFields(req.body, ['prestadorId', 'oficioId', 'descripcion']);
  const servicio = await prisma.prestadorOficio.findUnique({
    where: { oficioId_prestadorId: { oficioId: req.body.oficioId, prestadorId: req.body.prestadorId } },
    include: { oficio: true, prestador: true },
  });
  if (!servicio || !servicio.oficio.isActivo || !servicio.isDisponible || !servicio.prestador.isDisponible) {
    throw new ApiError(400, 'El prestador no ofrece actualmente ese oficio');
  }
  const solicitud = await prisma.solicitud.create({
    data: { clienteId: req.usuario.cliente.id, prestadorId: req.body.prestadorId, oficioId: req.body.oficioId, descripcion: validateString(req.body.descripcion, 'descripcion', { max: 2000 }) },
    include,
  });
  res.status(201).json(solicitud);
}

async function listar(req, res) {
  const where = req.usuario.rol === 'CLIENTE' ? { clienteId: req.usuario.cliente.id }
    : req.usuario.rol === 'PRESTADOR' ? { prestadorId: req.usuario.prestador.id } : {};
  const solicitudes = await prisma.solicitud.findMany({ where, include, orderBy: { fechaCreacion: 'desc' } });
  res.json(solicitudes.map((solicitud) => present(solicitud, req.usuario.rol)));
}

async function obtener(req, res) {
  const solicitud = await prisma.solicitud.findUnique({ where: { id: req.params.id }, include });
  if (!solicitud) throw new ApiError(404, 'Solicitud no encontrada');
  const owns = req.usuario.rol === 'ADMINISTRADOR' || solicitud.clienteId === req.usuario.cliente?.id || solicitud.prestadorId === req.usuario.prestador?.id;
  if (!owns) throw new ApiError(403, 'No tenés acceso a esta solicitud');
  res.json(present(solicitud, req.usuario.rol));
}

async function cambiarEstado(req, res) {
  requireFields(req.body, ['estado']);
  const solicitud = await prisma.solicitud.findUnique({ where: { id: req.params.id } });
  if (!solicitud) throw new ApiError(404, 'Solicitud no encontrada');
  const owns = req.usuario.rol === 'CLIENTE' ? solicitud.clienteId === req.usuario.cliente.id
    : req.usuario.rol === 'PRESTADOR' ? solicitud.prestadorId === req.usuario.prestador.id : false;
  if (!owns) throw new ApiError(403, 'No podés modificar esta solicitud');
  if (!canTransition(req.usuario.rol, solicitud.estado, req.body.estado)) {
    throw new ApiError(409, `Transición inválida de ${solicitud.estado} a ${req.body.estado}`);
  }
  const data = { estado: req.body.estado };
  if (req.usuario.rol === 'PRESTADOR' && req.body.estado === 'PROPUESTA_ENVIADA') {
    requireFields(req.body, ['fechaPropuesta']);
    const fechaPropuesta = new Date(req.body.fechaPropuesta);
    if (Number.isNaN(fechaPropuesta.getTime()) || fechaPropuesta <= new Date()) throw new ApiError(400, 'La fecha y el horario propuestos deben ser futuros');
    data.fechaPropuesta = fechaPropuesta;
    data.notaPropuesta = validateString(req.body.notaPropuesta, 'notaPropuesta', { max: 1000, optional: true }) || null;
  }
  if (req.usuario.rol === 'PRESTADOR' && req.body.estado === 'FINALIZADA') {
    if (!solicitud.fechaPropuesta || solicitud.fechaPropuesta > new Date()) {
      throw new ApiError(409, 'Todavía no podés finalizar el trabajo: esperá hasta la fecha y hora acordadas');
    }
    data.fechaFinalizacion = new Date();
  }
  const result = await prisma.solicitud.updateMany({ where: { id: solicitud.id, estado: solicitud.estado }, data });
  if (result.count !== 1) throw new ApiError(409, 'La solicitud fue modificada por otra operación. Actualizá la pantalla.');
  res.json(present(await prisma.solicitud.findUnique({ where: { id: solicitud.id }, include }), req.usuario.rol));
}

module.exports = { crear, listar, obtener, cambiarEstado };
