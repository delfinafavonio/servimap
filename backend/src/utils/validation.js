const { ApiError } = require('./http');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || String(body[field]).trim() === '');
  if (missing.length) throw new ApiError(400, `Faltan campos obligatorios: ${missing.join(', ')}`);
}

function parseCoordinates(latitud, longitud) {
  if (latitud === undefined && longitud === undefined) return {};
  const latitudeEmpty = latitud === null || latitud === '';
  const longitudeEmpty = longitud === null || longitud === '';
  if (latitudeEmpty && longitudeEmpty) return { latitud: null, longitud: null };
  if (latitudeEmpty || longitudeEmpty) throw new ApiError(400, 'Las coordenadas deben indicarse juntas');
  const lat = Number(latitud);
  const lng = Number(longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, 'Las coordenadas no son válidas');
  }
  return { latitud: lat, longitud: lng };
}

function publicUser(usuario) {
  const { passwordHash, ...safeUser } = usuario;
  return safeUser;
}

function validateRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'El puntaje debe ser un entero entre 1 y 5');
  return rating;
}

function parseBoolean(value, field) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError(400, `${field} debe ser verdadero o falso`);
}

function validateString(value, field, { min = 1, max = 255, optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return value === '' ? null : value;
  const normalized = String(value ?? '').trim();
  if (normalized.length < min || normalized.length > max) throw new ApiError(400, `${field} debe tener entre ${min} y ${max} caracteres`);
  return normalized;
}

function validateImageUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = validateString(value, 'fotoPerfil', { max: 500 });
  let parsed;
  try { parsed = new URL(normalized); } catch { throw new ApiError(400, 'fotoPerfil debe ser una URL válida'); }
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new ApiError(400, 'fotoPerfil debe usar HTTP o HTTPS');
  return normalized;
}

module.exports = { normalizeEmail, requireFields, parseCoordinates, publicUser, validateRating, parseBoolean, validateString, validateImageUrl };
