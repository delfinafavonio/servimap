const crypto = require('node:crypto');
const { ApiError } = require('./http');

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function uploadProfileImage(dataUrl, publicId) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match || !allowedTypes.has(match[1])) throw new ApiError(400, 'La foto debe ser JPG, PNG o WebP');
  const size = Buffer.byteLength(match[2], 'base64');
  if (size <= 0 || size > 2 * 1024 * 1024) throw new ApiError(400, 'La foto no puede superar los 2 MB');
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) throw new ApiError(503, 'La carga de fotos todavía no está configurada');
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'servimap/perfiles';
  const signature = crypto.createHash('sha1').update(`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`).digest('hex');
  const body = new FormData();
  body.set('file', dataUrl); body.set('api_key', CLOUDINARY_API_KEY); body.set('timestamp', String(timestamp));
  body.set('folder', folder); body.set('public_id', publicId); body.set('signature', signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new ApiError(502, 'No pudimos guardar la foto de perfil');
  return result.secure_url;
}

module.exports = { uploadProfileImage };
