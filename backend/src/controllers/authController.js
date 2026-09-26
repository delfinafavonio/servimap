const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { ApiError } = require('../utils/http');
const { normalizeEmail, requireFields, publicUser, validateString } = require('../utils/validation');

function tokenFor(usuario) {
  if (!process.env.JWT_SECRET) throw new ApiError(500, 'JWT_SECRET no está configurado');
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

function setSession(res, token) {
  const production = process.env.NODE_ENV === 'production';
  res.cookie('servimap_session', token, {
    httpOnly: true,
    sameSite: production ? 'none' : 'lax',
    secure: production,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSession(res) {
  const production = process.env.NODE_ENV === 'production';
  res.clearCookie('servimap_session', { httpOnly: true, sameSite: production ? 'none' : 'lax', secure: production, path: '/' });
}

async function registro(req, res) {
  requireFields(req.body, ['nombre', 'apellido', 'email', 'password', 'confirmacion', 'rol']);
  const { password, confirmacion, rol } = req.body;
  const nombre = validateString(req.body.nombre, 'nombre', { max: 80 });
  const apellido = validateString(req.body.apellido, 'apellido', { max: 80 });
  const email = normalizeEmail(req.body.email);
  if (!['CLIENTE', 'PRESTADOR'].includes(rol)) throw new ApiError(400, 'El rol debe ser CLIENTE o PRESTADOR');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'El correo no es válido');
  if (String(password).length < 8) throw new ApiError(400, 'La contraseña debe tener al menos 8 caracteres');
  if (password !== confirmacion) throw new ApiError(400, 'Las contraseñas no coinciden');

  const existing = await prisma.usuario.findUnique({ where: { email_rol: { email, rol } } });
  if (existing) throw new ApiError(409, 'Ya existe una cuenta con ese correo y rol');
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nombre, apellido, email, passwordHash, rol,
        ...(rol === 'CLIENTE' ? { cliente: { create: {} } } : { prestador: { create: {} } }),
      },
    });
    setSession(res, tokenFor(usuario));
    res.status(201).json({ usuario: publicUser(usuario) });
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'Ya existe una cuenta con ese correo y rol');
    throw error;
  }
}

async function login(req, res) {
  requireFields(req.body, ['email', 'password', 'rol']);
  if (!['CLIENTE', 'PRESTADOR', 'ADMINISTRADOR'].includes(req.body.rol)) throw new ApiError(400, 'El rol seleccionado no es válido');
  const email = normalizeEmail(req.body.email);
  const usuario = await prisma.usuario.findUnique({ where: { email_rol: { email, rol: req.body.rol } } });
  const valid = usuario ? await bcrypt.compare(req.body.password, usuario.passwordHash) : false;
  if (!valid) throw new ApiError(401, 'Correo o contraseña incorrectos');
  if (!usuario.isActivo) throw new ApiError(403, 'La cuenta está desactivada');
  setSession(res, tokenFor(usuario));
  res.json({ usuario: publicUser(usuario) });
}

async function me(req, res) {
  res.json({ usuario: publicUser(req.usuario) });
}

function logout(_req, res) {
  clearSession(res);
  res.status(204).end();
}

module.exports = { registro, login, me, logout };
