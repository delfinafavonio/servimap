const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { ApiError, asyncHandler } = require('../utils/http');
const { hasRole } = require('../utils/permissions');

const autenticar = asyncHandler(async (req, _res, next) => {
  const [scheme, bearerToken] = (req.headers.authorization || '').split(' ');
  const token = scheme === 'Bearer' ? bearerToken : req.cookies?.servimap_session;
  if (!token) throw new ApiError(401, 'Autenticación requerida');
  if (!process.env.JWT_SECRET) throw new ApiError(500, 'JWT_SECRET no está configurado');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Token inválido o vencido');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    include: { cliente: true, prestador: true, administrador: true },
  });
  if (!usuario || !usuario.isActivo) throw new ApiError(401, 'La sesión ya no es válida');
  req.usuario = usuario;
  next();
});

const autorizar = (...roles) => (req, _res, next) => {
  if (!hasRole(req.usuario, roles)) return next(new ApiError(403, 'No tenés permisos para esta acción'));
  next();
};

module.exports = { autenticar, autorizar };
