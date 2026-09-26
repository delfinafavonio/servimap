const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prismaClient');
const { seedOficios } = require('../scripts/seed');

const password = `T!${crypto.randomBytes(16).toString('hex')}`;
const email = (prefix) => `${prefix}-${crypto.randomUUID()}@servimap.test`;

async function cleanDatabase() {
  const [row] = await prisma.$queryRawUnsafe('SELECT current_database() AS name');
  assert.equal(row.name, 'servimap_test', 'La limpieza sólo puede ejecutarse en servimap_test');
  await prisma.calificacion.deleteMany();
  await prisma.solicitud.deleteMany();
  await prisma.prestadorOficio.deleteMany();
  await prisma.administrador.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.prestador.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.oficio.deleteMany();
}

async function register(agent, rol, prefix) {
  const payload = { nombre: prefix, apellido: 'Prueba', email: email(prefix), password, confirmacion: password, rol };
  const response = await agent.post('/api/auth/registro').send(payload);
  assert.equal(response.status, 201, response.text);
  assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Strict')));
  assert.equal(response.body.usuario.rol, rol);
  assert.equal(response.body.usuario.passwordHash, undefined);
  return { ...payload, usuario: response.body.usuario };
}

test('recorrido integral y reglas de seguridad sobre PostgreSQL aislado', async (t) => {
  await cleanDatabase();
  await seedOficios(); await seedOficios();
  assert.equal(await prisma.oficio.count(), 8, 'El seed debe ser idempotente');

  const adminEmail = email('admin');
  const adminUser = await prisma.usuario.create({ data: { nombre: 'Admin', apellido: 'Prueba', email: adminEmail, passwordHash: await bcrypt.hash(password, 12), rol: 'ADMINISTRADOR', administrador: { create: {} } } });
  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  const client = request.agent(app); const clientData = await register(client, 'CLIENTE', 'cliente');
  const otherClient = request.agent(app); await register(otherClient, 'CLIENTE', 'cliente-ajeno');
  const provider = request.agent(app); await register(provider, 'PRESTADOR', 'prestador');
  const otherProvider = request.agent(app); await register(otherProvider, 'PRESTADOR', 'prestador-ajeno');

  await t.test('autenticación, JWT y roles', async () => {
    assert.equal((await request(app).post('/api/auth/registro').send({ nombre: 'A', apellido: 'B', email: email('bad'), password: 'corta', confirmacion: 'corta', rol: 'CLIENTE' })).status, 400);
    assert.equal((await request(app).post('/api/auth/registro').send({ ...clientData, confirmacion: password })).status, 409);
    assert.equal((await request(app).post('/api/auth/registro').send({ nombre: 'Admin', apellido: 'Ilegal', email: email('admin-publico'), password, confirmacion: password, rol: 'ADMINISTRADOR' })).status, 400);
    assert.equal((await request(app).post('/api/auth/login').send({ email: clientData.email, password: 'incorrecta' })).status, 401);
    const loginAgent = request.agent(app);
    assert.equal((await loginAgent.post('/api/auth/login').send({ email: clientData.email, password })).status, 200);
    assert.equal((await loginAgent.get('/api/auth/me')).status, 200);
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', 'Bearer inválido')).status, 401);
    const expired = jwt.sign({ sub: clientData.usuario.id, rol: 'CLIENTE' }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)).status, 401);
    assert.equal((await client.post('/api/oficios').send({ nombre: 'Prohibido', categoria: 'Prueba' })).status, 403);
    const inactive = request.agent(app); const inactiveData = await register(inactive, 'CLIENTE', 'inactivo');
    await prisma.usuario.update({ where: { id: inactiveData.usuario.id }, data: { isActivo: false } });
    assert.equal((await request(app).post('/api/auth/login').send({ email: inactiveData.email, password })).status, 403);
    assert.equal((await loginAgent.post('/api/auth/logout')).status, 204);
    assert.equal((await loginAgent.get('/api/auth/me')).status, 401);
  });

  const electricidad = await prisma.oficio.findUnique({ where: { nombre: 'Electricidad' } });
  const plomeria = await prisma.oficio.findUnique({ where: { nombre: 'Plomería' } });

  await t.test('oficios, perfil, privacidad y búsqueda', async () => {
    assert.equal((await admin.post('/api/oficios').send({ nombre: 'Electricidad', categoria: 'Duplicado' })).status, 409);
    const edited = await admin.put(`/api/oficios/${plomeria.id}`).send({ nombre: 'Plomería', categoria: 'Reparaciones' });
    assert.equal(edited.status, 200); assert.equal(edited.body.categoria, 'Reparaciones');
    assert.equal((await admin.patch(`/api/oficios/${plomeria.id}/estado`).send({ isActivo: 'falso' })).status, 400);

    const profile = { descripcionProfesional: 'Electricista matriculado con experiencia en hogares.', zonaCobertura: 'Palermo, Buenos Aires', telefono: '11 1234 5678', fotoPerfil: 'https://images.example.test/perfil.jpg', latitud: -34.58321, longitud: -58.42567, isDisponible: true };
    let response = await provider.put('/api/prestadores/me').send(profile);
    assert.equal(response.status, 200); assert.equal(response.body.isDisponible, false, 'Perfil sin oficio no debe activarse');
    response = await provider.put(`/api/prestadores/me/oficios/${electricidad.id}`).send({ precio: 25000, isDisponible: true });
    assert.equal(response.status, 200); assert.equal(Number(response.body.precio), 25000);
    response = await provider.put('/api/prestadores/me').send(profile);
    assert.equal(response.status, 200); assert.equal(response.body.isDisponible, true);
    assert.equal(response.body.latitud, -34.58321, 'El dueño ve su coordenada privada');
    const providerId = response.body.id;

    await otherProvider.put('/api/prestadores/me').send({ descripcionProfesional: 'Perfil ajeno e incompleto', zonaCobertura: 'Córdoba', telefono: '351000000', latitud: -31.4, longitud: -64.18, isDisponible: true });
    const firstAfterOtherEdit = await prisma.prestador.findUnique({ where: { id: providerId } });
    assert.equal(firstAfterOtherEdit.zonaCobertura, 'Palermo, Buenos Aires');

    const byTrade = await client.get(`/api/prestadores?oficioId=${electricidad.id}`);
    assert.equal(byTrade.status, 200); assert.equal(byTrade.body.length, 1);
    assert.equal(byTrade.body[0].latitud, -34.58, 'La coordenada pública debe estar aproximada');
    assert.notEqual(byTrade.body[0].latitud, profile.latitud);
    assert.equal((await client.get('/api/prestadores?zona=Palermo')).body.length, 1);
    assert.equal((await client.get('/api/prestadores?latitud=-34.58&longitud=-58.42&distancia=10')).body.length, 1);
    assert.equal((await client.get('/api/prestadores?zona=Córdoba')).body.length, 0, 'Perfil incompleto/no disponible debe excluirse');
    const publicProfile = await client.get(`/api/prestadores/${providerId}`);
    assert.equal(publicProfile.body.latitud, -34.58);
  });

  const activeProvider = await prisma.prestador.findFirst({ where: { zonaCobertura: 'Palermo, Buenos Aires' } });
  assert.ok(activeProvider);

  await t.test('solicitudes, propiedad y concurrencia', async () => {
    const futureProposal = new Date(Date.now() + 86_400_000).toISOString();
    assert.equal((await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: plomeria.id, descripcion: 'Servicio no ofrecido' })).status, 400);
    const created = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Revisar tablero eléctrico del hogar.' });
    assert.equal(created.status, 201); assert.equal(created.body.estado, 'PENDIENTE');
    const id = created.body.id;
    assert.equal((await otherProvider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'ACEPTADA', fechaPropuesta: futureProposal })).status, 403);
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'ACEPTADA', fechaPropuesta: new Date(Date.now() - 86_400_000).toISOString() })).status, 400);
    const accepted = await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'ACEPTADA', fechaPropuesta: futureProposal, notaPropuesta: 'Disponible por la tarde.' });
    assert.equal(accepted.status, 200); assert.equal(accepted.body.notaPropuesta, 'Disponible por la tarde.');
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'RECHAZADA' })).status, 409);
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'FINALIZADA' })).status, 200);

    const cancellable = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Solicitud para cancelar.' });
    assert.equal((await client.patch(`/api/solicitudes/${cancellable.body.id}/estado`).send({ estado: 'CANCELADA' })).status, 200);
    const rejectable = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Solicitud para rechazar.' });
    assert.equal((await provider.patch(`/api/solicitudes/${rejectable.body.id}/estado`).send({ estado: 'RECHAZADA' })).status, 200);

    const concurrent = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Prueba de concurrencia.' });
    const concurrentResults = await Promise.all([
      provider.patch(`/api/solicitudes/${concurrent.body.id}/estado`).send({ estado: 'ACEPTADA', fechaPropuesta: futureProposal }),
      provider.patch(`/api/solicitudes/${concurrent.body.id}/estado`).send({ estado: 'RECHAZADA' }),
    ]);
    assert.deepEqual(concurrentResults.map((item) => item.status).sort(), [200, 409]);
  });

  const finished = await prisma.solicitud.findFirst({ where: { estado: 'FINALIZADA', prestadorId: activeProvider.id } });
  await t.test('calificaciones y moderación', async () => {
    const pending = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Aún pendiente para probar reseña.' });
    assert.equal((await client.post('/api/calificaciones').send({ solicitudId: pending.body.id, puntaje: 5, comentario: 'No debería publicarse.' })).status, 409);
    assert.equal((await otherClient.post('/api/calificaciones').send({ solicitudId: finished.id, puntaje: 5, comentario: 'Solicitud ajena.' })).status, 403);
    assert.equal((await client.post('/api/calificaciones').send({ solicitudId: finished.id, puntaje: 6, comentario: 'Fuera de rango.' })).status, 400);

    const secondSession = request.agent(app);
    assert.equal((await secondSession.post('/api/auth/login').send({ email: clientData.email, password })).status, 200);
    const ratings = await Promise.all([
      client.post('/api/calificaciones').send({ solicitudId: finished.id, puntaje: 5, comentario: 'Excelente trabajo y muy buena atención.' }),
      secondSession.post('/api/calificaciones').send({ solicitudId: finished.id, puntaje: 4, comentario: 'Intento simultáneo.' }),
    ]);
    assert.deepEqual(ratings.map((item) => item.status).sort(), [201, 409]);
    const rating = ratings.find((item) => item.status === 201).body;
    const beforeModeration = await client.get(`/api/prestadores/${activeProvider.id}`);
    assert.equal(beforeModeration.body.resenas.length, 1);
    const moderated = await admin.patch(`/api/calificaciones/${rating.id}/moderacion`).send({ isModerada: true, motivo: 'Contenido oculto para la demostración.' });
    assert.equal(moderated.status, 200); assert.equal(moderated.body.puntaje, rating.puntaje);
    const afterModeration = await client.get(`/api/prestadores/${activeProvider.id}`);
    assert.equal(afterModeration.body.resenas.length, 0); assert.equal(afterModeration.body.promedioCalificaciones, rating.puntaje);
  });

  assert.equal(adminUser.rol, 'ADMINISTRADOR');
});

test.after(async () => { await cleanDatabase(); await prisma.$disconnect(); });
