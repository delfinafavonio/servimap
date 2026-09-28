const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransition } = require('../src/utils/solicitudes');
const { normalizeEmail, parseCoordinates, publicUser, requireFields, validateRating } = require('../src/utils/validation');
const { hasRole } = require('../src/utils/permissions');
const { uploadProfileImage } = require('../src/utils/imageUpload');
const { createOriginMatcher } = require('../src/utils/cors');

test('normaliza correos sin exponer el hash del usuario', () => {
  assert.equal(normalizeEmail('  Persona@Ejemplo.COM '), 'persona@ejemplo.com');
  assert.deepEqual(publicUser({ id: '1', email: 'a@b.com', passwordHash: 'secreto' }), { id: '1', email: 'a@b.com' });
});

test('valida campos obligatorios y coordenadas', () => {
  assert.throws(() => requireFields({ nombre: '' }, ['nombre', 'email']), /nombre, email/);
  assert.deepEqual(parseCoordinates('-34.60', '-58.38'), { latitud: -34.6, longitud: -58.38 });
  assert.deepEqual(parseCoordinates(null, null), { latitud: null, longitud: null });
  assert.throws(() => parseCoordinates('-34.60', ''), /juntas/);
  assert.throws(() => parseCoordinates('100', '20'), /coordenadas/);
});

test('rechaza fotos de perfil con formato o tamaño inválido antes de subirlas', async () => {
  await assert.rejects(() => uploadProfileImage('data:image/gif;base64,R0lGODlh', 'perfil'), /JPG, PNG o WebP/);
  await assert.rejects(() => uploadProfileImage(`data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`, 'perfil'), /2 MB/);
});

test('CORS limita el comodín a previews del proyecto configurado', () => {
  const allowed = createOriginMatcher('https://servimap.vercel.app,https://servimap-*.vercel.app');
  assert.equal(allowed('https://servimap.vercel.app'), true);
  assert.equal(allowed('https://servimap-git-entrega-orian.vercel.app'), true);
  assert.equal(allowed('https://otro-proyecto.vercel.app'), false);
  assert.equal(allowed('https://servimap.vercel.app.atacante.example'), false);
});

test('aplica permisos estrictos por rol', () => {
  assert.equal(hasRole({ rol: 'ADMINISTRADOR' }, ['ADMINISTRADOR']), true);
  assert.equal(hasRole({ rol: 'CLIENTE' }, ['ADMINISTRADOR']), false);
  assert.equal(hasRole(null, ['CLIENTE']), false);
});

test('acepta sólo las transiciones de solicitud definidas por rol', () => {
  assert.equal(canTransition('PRESTADOR', 'PENDIENTE', 'PROPUESTA_ENVIADA'), true);
  assert.equal(canTransition('PRESTADOR', 'PENDIENTE', 'ACEPTADA'), false);
  assert.equal(canTransition('CLIENTE', 'PROPUESTA_ENVIADA', 'ACEPTADA'), true);
  assert.equal(canTransition('CLIENTE', 'PROPUESTA_ENVIADA', 'CANCELADA'), true);
  assert.equal(canTransition('PRESTADOR', 'ACEPTADA', 'FINALIZADA'), true);
  assert.equal(canTransition('CLIENTE', 'PENDIENTE', 'CANCELADA'), true);
  assert.equal(canTransition('CLIENTE', 'PENDIENTE', 'FINALIZADA'), false);
  assert.equal(canTransition('PRESTADOR', 'FINALIZADA', 'ACEPTADA'), false);
  assert.equal(canTransition('ADMINISTRADOR', 'PENDIENTE', 'ACEPTADA'), false);
});

test('calificaciones: sólo acepta enteros entre uno y cinco', () => {
  assert.equal(validateRating('5'), 5);
  assert.throws(() => validateRating(0), /entre 1 y 5/);
  assert.throws(() => validateRating(4.5), /entre 1 y 5/);
});
