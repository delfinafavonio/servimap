const prisma = require('../prismaClient');
const { ApiError } = require('../utils/http');
const { parseCoordinates, parseBoolean, validateString, validateImageUrl } = require('../utils/validation');
const { uploadProfileImage } = require('../utils/imageUpload');

const perfilInclude = {
  usuario: { select: { nombre: true, apellido: true } },
  oficios: { include: { oficio: true } },
  solicitudes: {
    where: { estado: 'FINALIZADA' },
    select: { calificacion: true },
  },
};

function isComplete(prestador) {
  return Boolean(
    prestador.descripcionProfesional && prestador.zonaCobertura && prestador.telefono &&
    prestador.oficios?.some((item) => item.isDisponible && item.oficio.isActivo)
  );
}

function present(prestador, { privateView = false } = {}) {
  const ratings = prestador.solicitudes.map((item) => item.calificacion).filter(Boolean);
  const visibleReviews = ratings.filter((rating) => !rating.isModerada);
  return {
    id: prestador.id,
    nombre: `${prestador.usuario.nombre} ${prestador.usuario.apellido}`,
    descripcionProfesional: prestador.descripcionProfesional,
    fotoPerfil: prestador.fotoPerfil,
    zonaCobertura: prestador.zonaCobertura,
    latitud: prestador.latitud === null ? null : privateView ? Number(prestador.latitud) : Number(Number(prestador.latitud).toFixed(2)),
    longitud: prestador.longitud === null ? null : privateView ? Number(prestador.longitud) : Number(Number(prestador.longitud).toFixed(2)),
    telefono: prestador.telefono,
    isDisponible: prestador.isDisponible,
    perfilCompleto: isComplete(prestador),
    oficios: prestador.oficios.filter((item) => item.oficio.isActivo).map((item) => ({
      id: item.oficio.id,
      nombre: item.oficio.nombre,
      categoria: item.oficio.categoria,
      precio: item.precio === null ? null : Number(item.precio),
      modalidadPrecio: item.modalidadPrecio,
      precioMinimo: item.precioMinimo === null ? null : Number(item.precioMinimo),
      precioMaximo: item.precioMaximo === null ? null : Number(item.precioMaximo),
      isDisponible: item.isDisponible,
    })),
    promedioCalificaciones: ratings.length ? Number((ratings.reduce((sum, item) => sum + item.puntaje, 0) / ratings.length).toFixed(1)) : null,
    cantidadCalificaciones: ratings.length,
    trabajosFinalizados: prestador.solicitudes.length,
    resenas: visibleReviews.map(({ id, puntaje, comentario, fechaPublicacion }) => ({ id, puntaje, comentario, fechaPublicacion })),
  };
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function buscar(req, res) {
  const { oficioId, zona, texto, latitud, longitud, distancia, disponible } = req.query;
  const where = {
    isDisponible: disponible === 'false' ? undefined : true,
    descripcionProfesional: { not: null },
    zonaCobertura: { not: null },
    telefono: { not: null },
    oficios: { some: { isDisponible: true, oficio: { isActivo: true, ...(oficioId ? { id: oficioId } : {}) } } },
  };
  if (distancia !== undefined) {
    where.latitud = { not: null };
    where.longitud = { not: null };
  }
  if (zona) where.zonaCobertura = { contains: String(zona), mode: 'insensitive' };
  if (texto) {
    where.OR = [
      { descripcionProfesional: { contains: String(texto), mode: 'insensitive' } },
      { zonaCobertura: { contains: String(texto), mode: 'insensitive' } },
      { usuario: { nombre: { contains: String(texto), mode: 'insensitive' } } },
      { usuario: { apellido: { contains: String(texto), mode: 'insensitive' } } },
      { oficios: { some: { oficio: { nombre: { contains: String(texto), mode: 'insensitive' } } } } },
    ];
  }
  let results = (await prisma.prestador.findMany({ where, include: perfilInclude })).map(present);
  if (distancia !== undefined) {
    const coordinates = parseCoordinates(latitud, longitud);
    const radius = Number(distancia);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 500) throw new ApiError(400, 'La distancia debe estar entre 0 y 500 km');
    results = results.map((item) => ({ ...item, distanciaKm: Number(distanceKm(coordinates.latitud, coordinates.longitud, item.latitud, item.longitud).toFixed(1)) }))
      .filter((item) => item.distanciaKm <= radius).sort((a, b) => a.distanciaKm - b.distanciaKm);
  }
  res.json(results);
}

async function obtener(req, res) {
  const prestador = await prisma.prestador.findUnique({ where: { id: req.params.id }, include: perfilInclude });
  if (!prestador || !isComplete(prestador)) throw new ApiError(404, 'Prestador no encontrado');
  res.json(present(prestador));
}

async function miPerfil(req, res) {
  const prestador = await prisma.prestador.findUnique({ where: { id: req.usuario.prestador.id }, include: perfilInclude });
  res.json(present(prestador, { privateView: true }));
}

async function actualizarPerfil(req, res) {
  const data = {};
  if (req.body.descripcionProfesional !== undefined) data.descripcionProfesional = validateString(req.body.descripcionProfesional, 'descripcionProfesional', { max: 2000, optional: true });
  if (req.body.zonaCobertura !== undefined) data.zonaCobertura = validateString(req.body.zonaCobertura, 'zonaCobertura', { max: 120, optional: true });
  if (req.body.telefono !== undefined) data.telefono = validateString(req.body.telefono, 'telefono', { max: 40, optional: true });
  if (req.body.fotoPerfil !== undefined) data.fotoPerfil = validateImageUrl(req.body.fotoPerfil);
  if (req.body.isDisponible !== undefined) data.isDisponible = parseBoolean(req.body.isDisponible, 'isDisponible');
  Object.assign(data, parseCoordinates(req.body.latitud, req.body.longitud));
  const updated = await prisma.prestador.update({ where: { id: req.usuario.prestador.id }, data, include: perfilInclude });
  if (updated.isDisponible && !isComplete(updated)) {
    await prisma.prestador.update({ where: { id: updated.id }, data: { isDisponible: false } });
    updated.isDisponible = false;
  }
  res.json(present(updated, { privateView: true }));
}

async function subirFoto(req, res) {
  const fotoPerfil = await uploadProfileImage(req.body.dataUrl, `prestador-${req.usuario.prestador.id}`);
  const updated = await prisma.prestador.update({ where: { id: req.usuario.prestador.id }, data: { fotoPerfil }, include: perfilInclude });
  res.json(present(updated, { privateView: true }));
}

async function guardarOficio(req, res) {
  const oficio = await prisma.oficio.findFirst({ where: { id: req.params.oficioId, isActivo: true } });
  if (!oficio) throw new ApiError(404, 'Oficio activo no encontrado');
  const modalidadPrecio = req.body.modalidadPrecio || 'FIJO';
  if (!['FIJO', 'RANGO'].includes(modalidadPrecio)) throw new ApiError(400, 'La modalidad de precio no es válida');
  const parsePrice = (value) => value === '' || value === null || value === undefined ? null : Number(value);
  let precio = null; let precioMinimo = null; let precioMaximo = null;
  if (modalidadPrecio === 'FIJO') {
    precio = parsePrice(req.body.precio);
    if (precio === null || !Number.isFinite(precio) || precio <= 0 || precio > 9999999999.99) throw new ApiError(400, 'El precio fijo debe ser un importe positivo');
  } else {
    precioMinimo = parsePrice(req.body.precioMinimo); precioMaximo = parsePrice(req.body.precioMaximo);
    if (![precioMinimo, precioMaximo].every((value) => value !== null && Number.isFinite(value) && value > 0 && value <= 9999999999.99)) throw new ApiError(400, 'El rango debe contener importes positivos');
    if (precioMinimo > precioMaximo) throw new ApiError(400, 'El precio mínimo no puede superar al máximo');
  }
  const priceData = { modalidadPrecio, precio, precioMinimo, precioMaximo };
  const item = await prisma.prestadorOficio.upsert({
    where: { oficioId_prestadorId: { oficioId: oficio.id, prestadorId: req.usuario.prestador.id } },
    create: { oficioId: oficio.id, prestadorId: req.usuario.prestador.id, ...priceData, isDisponible: req.body.isDisponible === undefined ? true : parseBoolean(req.body.isDisponible, 'isDisponible') },
    update: { ...priceData, isDisponible: req.body.isDisponible === undefined ? true : parseBoolean(req.body.isDisponible, 'isDisponible') },
    include: { oficio: true },
  });
  res.json(item);
}

async function eliminarOficio(req, res) {
  const where = { oficioId_prestadorId: { oficioId: req.params.oficioId, prestadorId: req.usuario.prestador.id } };
  const item = await prisma.prestadorOficio.findUnique({ where });
  if (!item) throw new ApiError(404, 'El oficio no está asociado al perfil');
  await prisma.prestadorOficio.delete({ where });
  const remaining = await prisma.prestadorOficio.count({ where: { prestadorId: req.usuario.prestador.id, isDisponible: true, oficio: { isActivo: true } } });
  if (remaining === 0) await prisma.prestador.update({ where: { id: req.usuario.prestador.id }, data: { isDisponible: false } });
  res.status(204).end();
}

module.exports = { buscar, obtener, miPerfil, actualizarPerfil, subirFoto, guardarOficio, eliminarOficio, isComplete, present };
