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
  assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')));
  assert.equal(response.body.usuario.rol, rol);
  assert.equal(typeof response.body.token, 'string');
  assert.ok(response.body.token.length > 20);
  assert.equal(response.body.usuario.passwordHash, undefined);
  return { ...payload, usuario: response.body.usuario, token: response.body.token };
}

test('recorrido integral y reglas de seguridad sobre PostgreSQL aislado', async (t) => {
  await cleanDatabase();
  await seedOficios(); await seedOficios();
  assert.equal(await prisma.oficio.count(), 8, 'El seed debe ser idempotente');
  const catalog = await request(app).get('/api/oficios');
  assert.equal(catalog.status, 200); assert.equal(catalog.body.length, 8);
  assert.ok(catalog.body.every((item) => item.isActivo), 'El selector público debe recibir los oficios activos');

  await t.test('CORS autoriza producción y previews de Vercel, y rechaza otros orígenes', async () => {
    const allowedOrigins = ['https://servimap.vercel.app', 'https://servimap-git-entrega-orian.vercel.app'];
    for (const origin of allowedOrigins) {
      for (const path of ['/api/auth/registro', '/api/auth/login']) {
        const preflight = await request(app).options(path).set('Origin', origin).set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type');
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers['access-control-allow-origin'], origin);
        assert.match(preflight.headers['access-control-allow-methods'], /POST/);
        assert.match(preflight.headers['access-control-allow-headers'], /Content-Type/i);
        assert.equal(preflight.headers['access-control-allow-credentials'], 'true');
      }
      const corsPassword = `Cors-${password}`;
      const registration = await request(app).post('/api/auth/registro').set('Origin', origin).send({ nombre: 'Cors', apellido: 'Prueba', email: email('cors'), password: corsPassword, confirmacion: corsPassword, rol: 'CLIENTE' });
      assert.equal(registration.status, 201, registration.text);
      assert.equal(registration.headers['access-control-allow-origin'], origin);
      assert.equal(registration.headers['access-control-allow-credentials'], 'true');
    }
    const blockedOrigin = 'https://sitio-no-autorizado.example';
    const before = await prisma.usuario.count();
    const blockedPreflight = await request(app).options('/api/auth/registro').set('Origin', blockedOrigin).set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type');
    assert.equal(blockedPreflight.status, 403); assert.equal(blockedPreflight.headers['access-control-allow-origin'], undefined);
    const blockedPost = await request(app).post('/api/auth/registro').set('Origin', blockedOrigin).send({ nombre: 'Bloqueado', apellido: 'Prueba', email: email('bloqueado'), password, confirmacion: password, rol: 'CLIENTE' });
    assert.equal(blockedPost.status, 403); assert.equal(blockedPost.headers['access-control-allow-origin'], undefined);
    assert.equal(await prisma.usuario.count(), before, 'Un origen rechazado no debe crear usuarios');
  });

  const adminEmail = email('admin');
  const adminUser = await prisma.usuario.create({ data: { nombre: 'Admin', apellido: 'Prueba', email: adminEmail, passwordHash: await bcrypt.hash(password, 12), rol: 'ADMINISTRADOR', administrador: { create: {} } } });
  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password, rol: 'ADMINISTRADOR' })).status, 200);

  const client = request.agent(app); const clientData = await register(client, 'CLIENTE', 'cliente');
  const otherClient = request.agent(app); await register(otherClient, 'CLIENTE', 'cliente-ajeno');
  const provider = request.agent(app); const providerData = await register(provider, 'PRESTADOR', 'prestador');
  const otherProvider = request.agent(app); await register(otherProvider, 'PRESTADOR', 'prestador-ajeno');
  const coordinateFreeProvider = request.agent(app); await register(coordinateFreeProvider, 'PRESTADOR', 'prestador-sin-coordenadas');
  const sharedEmail = email('doble-cuenta');
  const sharedClientPassword = `Cliente-${password}`;
  const sharedProviderPassword = `Prestador-${password}`;
  const sharedClient = request.agent(app);
  const sharedProvider = request.agent(app);
  let sharedClientId;
  let sharedProviderId;

  await t.test('autenticación, JWT y roles', async () => {
    assert.equal((await request(app).post('/api/auth/registro').send({ nombre: 'A', apellido: 'B', email: email('bad'), password: 'corta', confirmacion: 'corta', rol: 'CLIENTE' })).status, 400);
    assert.equal((await request(app).post('/api/auth/registro').send({ ...clientData, confirmacion: password })).status, 409);
    assert.equal((await request(app).post('/api/auth/registro').send({ nombre: 'Admin', apellido: 'Ilegal', email: email('admin-publico'), password, confirmacion: password, rol: 'ADMINISTRADOR' })).status, 400);
    assert.equal((await request(app).post('/api/auth/login').send({ email: clientData.email, password: 'incorrecta', rol: 'CLIENTE' })).status, 401);
    const clientLogin = await request(app).post('/api/auth/login').send({ email: clientData.email, password, rol: 'CLIENTE' });
    assert.equal(clientLogin.status, 200); assert.equal(typeof clientLogin.body.token, 'string');
    const providerLogin = await request(app).post('/api/auth/login').send({ email: providerData.email, password, rol: 'PRESTADOR' });
    assert.equal(providerLogin.status, 200); assert.equal(typeof providerLogin.body.token, 'string');
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${providerLogin.body.token}`)).body.usuario.rol, 'PRESTADOR');
    assert.equal((await request(app).get('/api/prestadores/me').set('Authorization', `Bearer ${providerLogin.body.token}`)).status, 200);
    assert.equal((await request(app).post('/api/solicitudes').set('Authorization', `Bearer ${clientLogin.body.token}`).send({})).status, 400);
    const clientAsProvider = request.agent(app);
    assert.equal((await clientAsProvider.post('/api/auth/login').send({ email: clientData.email, password, rol: 'PRESTADOR' })).status, 401);
    assert.equal((await clientAsProvider.get('/api/auth/me')).status, 401);
    const providerAsClient = request.agent(app);
    assert.equal((await providerAsClient.post('/api/auth/login').send({ email: providerData.email, password, rol: 'CLIENTE' })).status, 401);
    assert.equal((await providerAsClient.get('/api/auth/me')).status, 401);
    const sharedBase = { nombre: 'Cuenta', apellido: 'Compartida', email: sharedEmail };
    let sharedResponse = await sharedClient.post('/api/auth/registro').send({ ...sharedBase, password: sharedClientPassword, confirmacion: sharedClientPassword, rol: 'CLIENTE' });
    assert.equal(sharedResponse.status, 201); sharedClientId = sharedResponse.body.usuario.id;
    sharedResponse = await sharedProvider.post('/api/auth/registro').send({ ...sharedBase, password: sharedProviderPassword, confirmacion: sharedProviderPassword, rol: 'PRESTADOR' });
    assert.equal(sharedResponse.status, 201); sharedProviderId = sharedResponse.body.usuario.id;
    assert.notEqual(sharedClientId, sharedProviderId);
    assert.equal((await request(app).post('/api/auth/registro').send({ ...sharedBase, password: sharedClientPassword, confirmacion: sharedClientPassword, rol: 'CLIENTE' })).status, 409);
    assert.equal((await request(app).post('/api/auth/registro').send({ ...sharedBase, password: sharedProviderPassword, confirmacion: sharedProviderPassword, rol: 'PRESTADOR' })).status, 409);
    assert.equal((await request(app).post('/api/auth/login').send({ email: sharedEmail.toUpperCase(), password: sharedClientPassword, rol: 'CLIENTE' })).body.usuario.id, sharedClientId);
    assert.equal((await request(app).post('/api/auth/login').send({ email: ` ${sharedEmail} `, password: sharedProviderPassword, rol: 'PRESTADOR' })).body.usuario.id, sharedProviderId);
    assert.equal((await request(app).post('/api/auth/login').send({ email: sharedEmail, password: sharedProviderPassword, rol: 'CLIENTE' })).status, 401);
    const loginAgent = request.agent(app);
    assert.equal((await loginAgent.post('/api/auth/login').send({ email: clientData.email, password, rol: 'CLIENTE' })).status, 200);
    assert.equal((await loginAgent.get('/api/auth/me')).status, 200);
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', 'Bearer inválido')).status, 401);
    const expired = jwt.sign({ sub: clientData.usuario.id, rol: 'CLIENTE' }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)).status, 401);
    assert.equal((await client.post('/api/oficios').send({ nombre: 'Prohibido', categoria: 'Prueba' })).status, 403);
    const inactive = request.agent(app); const inactiveData = await register(inactive, 'CLIENTE', 'inactivo');
    await prisma.usuario.update({ where: { id: inactiveData.usuario.id }, data: { isActivo: false } });
    assert.equal((await request(app).post('/api/auth/login').send({ email: inactiveData.email, password, rol: 'CLIENTE' })).status, 403);
    const logoutResponse = await loginAgent.post('/api/auth/logout');
    assert.equal(logoutResponse.status, 204); assert.match(logoutResponse.headers['set-cookie'][0], /servimap_session=;/);
    assert.equal((await loginAgent.get('/api/auth/me')).status, 401);
    assert.equal((await client.get('/api/prestadores/me')).status, 403);
    assert.equal((await provider.get('/api/clientes/me')).status, 403);
  });

  const electricidad = await prisma.oficio.findUnique({ where: { nombre: 'Electricidad' } });
  const carpinteria = await prisma.oficio.findUnique({ where: { nombre: 'Carpintería' } });
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
    response = await provider.put(`/api/prestadores/me/oficios/${electricidad.id}`).send({ precio: 31000, isDisponible: true });
    assert.equal(response.status, 200); assert.equal(Number(response.body.precio), 31000);
    response = await provider.put(`/api/prestadores/me/oficios/${electricidad.id}`).send({ modalidadPrecio: 'RANGO', precioMinimo: 20000, precioMaximo: 50000, precio: 999999, isDisponible: true });
    assert.equal(response.status, 200); assert.equal(response.body.modalidadPrecio, 'RANGO'); assert.equal(response.body.precio, null); assert.equal(Number(response.body.precioMinimo), 20000); assert.equal(Number(response.body.precioMaximo), 50000);
    assert.equal((await provider.put(`/api/prestadores/me/oficios/${electricidad.id}`).send({ modalidadPrecio: 'RANGO', precioMinimo: 50000, precioMaximo: 20000, isDisponible: true })).status, 400);
    assert.equal((await provider.put(`/api/prestadores/me/oficios/${electricidad.id}`).send({ modalidadPrecio: 'FIJO', precio: 0, isDisponible: true })).status, 400);
    response = await provider.put(`/api/prestadores/me/oficios/${electricidad.id}`).send({ modalidadPrecio: 'FIJO', precio: 31000, precioMinimo: 1, precioMaximo: 2, isDisponible: true });
    assert.equal(response.status, 200); assert.equal(Number(response.body.precio), 31000); assert.equal(response.body.precioMinimo, null); assert.equal(response.body.precioMaximo, null);
    const vidrieria = await admin.post('/api/oficios').send({ nombre: 'Vidriería', categoria: 'Construcción' });
    assert.equal(vidrieria.status, 201);
    response = await provider.put(`/api/prestadores/me/oficios/${vidrieria.body.id}`).send({ precio: 25000, isDisponible: true });
    assert.equal(response.status, 200); assert.equal(response.body.oficio.nombre, 'Vidriería'); assert.equal(Number(response.body.precio), 25000);
    const reloadedProfile = await provider.get('/api/prestadores/me');
    const savedVidrieria = reloadedProfile.body.oficios.find((item) => item.id === vidrieria.body.id);
    assert.equal(savedVidrieria.nombre, 'Vidriería'); assert.equal(savedVidrieria.precio, 25000);
    assert.equal(reloadedProfile.body.oficios.find((item) => item.id === electricidad.id).precio, 31000);
    assert.equal(await prisma.prestadorOficio.count({ where: { prestadorId: reloadedProfile.body.id, oficioId: electricidad.id } }), 1);
    await provider.put(`/api/prestadores/me/oficios/${vidrieria.body.id}`).send({ modalidadPrecio: 'RANGO', precioMinimo: 20000, precioMaximo: 50000, isDisponible: true });
    const persistedRange = (await provider.get('/api/prestadores/me')).body.oficios.find((item) => item.id === vidrieria.body.id);
    assert.equal(persistedRange.modalidadPrecio, 'RANGO'); assert.equal(persistedRange.precio, null); assert.equal(persistedRange.precioMinimo, 20000); assert.equal(persistedRange.precioMaximo, 50000);
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

    await coordinateFreeProvider.put(`/api/prestadores/me/oficios/${carpinteria.id}`).send({ precio: 25000, isDisponible: true });
    const coordinateFreeProfile = await coordinateFreeProvider.put('/api/prestadores/me').send({ descripcionProfesional: 'Carpintería a medida.', zonaCobertura: 'Centro', telefono: '1100000001', latitud: null, longitud: null, isDisponible: true });
    assert.equal(coordinateFreeProfile.status, 200); assert.equal(coordinateFreeProfile.body.isDisponible, true);
    const carpenters = await client.get(`/api/prestadores?oficioId=${carpinteria.id}`);
    assert.equal(carpenters.status, 200); assert.ok(carpenters.body.some((item) => item.id === coordinateFreeProfile.body.id));
    assert.ok((await client.get(`/api/prestadores?oficioId=${carpinteria.id}&zona=Centro`)).body.some((item) => item.id === coordinateFreeProfile.body.id));
    assert.ok(!(await client.get(`/api/prestadores?oficioId=${carpinteria.id}&latitud=-34.6&longitud=-58.4&distancia=10`)).body.some((item) => item.id === coordinateFreeProfile.body.id));

    await otherProvider.put(`/api/prestadores/me/oficios/${electricidad.id}`).send({ precio: 999, isDisponible: true });
    assert.equal((await provider.get('/api/prestadores/me')).body.oficios.find((item) => item.id === electricidad.id).precio, 31000);
    await provider.delete(`/api/prestadores/me/oficios/${vidrieria.body.id}`);
    assert.equal((await provider.get('/api/prestadores/me')).body.isDisponible, true, 'Quitar un oficio no debe desactivar al prestador si conserva otro disponible');
  });

  await t.test('cuentas con correo compartido mantienen perfiles y solicitudes aislados', async () => {
    await sharedClient.put('/api/clientes/me').send({ latitudUbicacion: -34.6, longitudUbicacion: -58.4 });
    await sharedProvider.put('/api/prestadores/me/oficios/' + electricidad.id).send({ precio: 25000, isDisponible: true });
    await sharedProvider.put('/api/prestadores/me').send({ descripcionProfesional: 'Perfil prestador independiente.', zonaCobertura: 'Centro', telefono: '1100000000', latitud: -34.61, longitud: -58.41, isDisponible: true });
    const clientProfile = await sharedClient.get('/api/clientes/me');
    const providerProfile = await sharedProvider.get('/api/prestadores/me');
    assert.equal(clientProfile.status, 200); assert.equal(providerProfile.status, 200);
    assert.equal(providerProfile.body.descripcionProfesional, 'Perfil prestador independiente.');
    assert.equal((await sharedClient.get('/api/prestadores/me')).status, 403);
    assert.equal((await sharedProvider.get('/api/clientes/me')).status, 403);
    const created = await sharedClient.post('/api/solicitudes').send({ prestadorId: providerProfile.body.id, oficioId: electricidad.id, descripcion: 'Solicitud entre cuentas independientes.' });
    assert.equal(created.status, 201);
    assert.ok((await sharedClient.get('/api/solicitudes')).body.some((item) => item.id === created.body.id));
    assert.ok((await sharedProvider.get('/api/solicitudes')).body.some((item) => item.id === created.body.id));
    assert.ok(!(await client.get('/api/solicitudes')).body.some((item) => item.id === created.body.id));
    assert.ok(!(await provider.get('/api/solicitudes')).body.some((item) => item.id === created.body.id));
  });

  const activeProvider = await prisma.prestador.findFirst({ where: { zonaCobertura: 'Palermo, Buenos Aires' } });
  assert.ok(activeProvider);

  await t.test('solicitudes, propiedad y concurrencia', async () => {
    const futureProposal = new Date(Date.now() + 86_400_000).toISOString();
    assert.equal((await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: plomeria.id, descripcion: 'Servicio no ofrecido' })).status, 400);
    const created = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Revisar tablero eléctrico del hogar.' });
    assert.equal(created.status, 201); assert.equal(created.body.estado, 'PENDIENTE');
    const id = created.body.id;
    assert.equal((await otherProvider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'PROPUESTA_ENVIADA', fechaPropuesta: futureProposal })).status, 403);
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'PROPUESTA_ENVIADA', fechaPropuesta: new Date(Date.now() - 86_400_000).toISOString() })).status, 400);
    const proposed = await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'PROPUESTA_ENVIADA', fechaPropuesta: futureProposal, notaPropuesta: 'Disponible por la tarde.' });
    assert.equal(proposed.status, 200); assert.equal(proposed.body.estado, 'PROPUESTA_ENVIADA'); assert.equal(proposed.body.notaPropuesta, 'Disponible por la tarde.');
    const visibleToClient = await client.get(`/api/solicitudes/${id}`);
    assert.equal(visibleToClient.status, 200); assert.equal(visibleToClient.body.estado, 'PROPUESTA_ENVIADA'); assert.equal(visibleToClient.body.fechaPropuesta, futureProposal);
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'PROPUESTA_ENVIADA', fechaPropuesta: futureProposal })).status, 409);
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'RECHAZADA' })).status, 409);
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'FINALIZADA' })).status, 409);
    assert.equal((await otherClient.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'ACEPTADA' })).status, 403);
    const accepted = await client.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'ACEPTADA' });
    assert.equal(accepted.status, 200); assert.equal(accepted.body.estado, 'ACEPTADA');
    assert.equal((await client.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'ACEPTADA' })).status, 409);
    assert.equal((await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'FINALIZADA' })).status, 409);
    await prisma.solicitud.update({ where: { id }, data: { fechaPropuesta: new Date(Date.now() - 60_000) } });
    const finalized = await provider.patch(`/api/solicitudes/${id}/estado`).send({ estado: 'FINALIZADA' });
    assert.equal(finalized.status, 200); assert.ok(finalized.body.fechaFinalizacion);
    const reloaded = await provider.get('/api/solicitudes');
    assert.ok(reloaded.body.some((item) => item.id === id && item.estado === 'FINALIZADA' && item.fechaFinalizacion));
    assert.ok(!(await otherProvider.get('/api/solicitudes')).body.some((item) => item.id === id));

    const cancellable = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Solicitud para cancelar.' });
    assert.equal((await client.patch(`/api/solicitudes/${cancellable.body.id}/estado`).send({ estado: 'CANCELADA' })).status, 200);
    const rejectable = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Solicitud para rechazar.' });
    assert.equal((await provider.patch(`/api/solicitudes/${rejectable.body.id}/estado`).send({ estado: 'RECHAZADA' })).status, 200);
    const proposalToReject = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Propuesta que rechazará el cliente.' });
    assert.equal((await provider.patch(`/api/solicitudes/${proposalToReject.body.id}/estado`).send({ estado: 'PROPUESTA_ENVIADA', fechaPropuesta: futureProposal })).status, 200);
    assert.equal((await client.patch(`/api/solicitudes/${proposalToReject.body.id}/estado`).send({ estado: 'CANCELADA' })).status, 200);
    assert.equal((await provider.patch(`/api/solicitudes/${proposalToReject.body.id}/estado`).send({ estado: 'FINALIZADA' })).status, 409);

    const concurrent = await client.post('/api/solicitudes').send({ prestadorId: activeProvider.id, oficioId: electricidad.id, descripcion: 'Prueba de concurrencia.' });
    const concurrentResults = await Promise.all([
      provider.patch(`/api/solicitudes/${concurrent.body.id}/estado`).send({ estado: 'PROPUESTA_ENVIADA', fechaPropuesta: futureProposal }),
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
    assert.equal((await secondSession.post('/api/auth/login').send({ email: clientData.email, password, rol: 'CLIENTE' })).status, 200);
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
