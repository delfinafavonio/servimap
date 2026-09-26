# Guía de demostración universitaria

## Preparación previa

1. Iniciá PostgreSQL 17 y verificá que exista la base `servimap`.
2. En `backend/.env`, configurá `DATABASE_URL`, `JWT_SECRET` y `CORS_ORIGIN=http://localhost:5173`.
3. Aplicá migraciones y cargá datos reproducibles:

```powershell
cd backend
npm install
npx prisma migrate deploy
npm run prisma:generate
npm run seed
```

4. Definí en la terminal los seis valores `DEMO_*_EMAIL` y `DEMO_*_PASSWORD` indicados en `.env.example`. Usá claves locales que no se compartan en diapositivas ni capturas.
5. Ejecutá:

```powershell
npm run seed:demo
```

Podés repetir el comando: actualiza los mismos usuarios y oficios sin duplicarlos.

## Inicio de servicios

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Abrí `http://localhost:5173`. Prepará tres perfiles del navegador o ventanas privadas para mantener separadas las sesiones.

## Recorrido sugerido

### Cliente

1. Iniciá sesión con el correo de `DEMO_CLIENT_EMAIL` y su clave local.
2. Entrá en “Mi ubicación” y guardá una ubicación para explicar el filtro de distancia.
3. Abrí “Buscar profesionales”, elegí Electricidad y mostrá lista y mapa.
4. Abrí el perfil “Profesional Demo” y enviá una solicitud.
5. Mostrá la solicitud como `PENDIENTE`.

### Prestador

1. Cambiá a la sesión configurada con `DEMO_PROVIDER_EMAIL`.
2. Mostrá descripción, oficio, precio, disponibilidad y ubicación privada en “Mi perfil”.
3. Abrí “Solicitudes”, aceptá la solicitud y luego marcala como finalizada.

### Cliente y calificación

1. Volvé a la sesión del cliente.
2. Abrí “Mis solicitudes”.
3. Calificá el trabajo con 1–5 estrellas y un comentario.
4. Regresá al perfil público y mostrá promedio, trabajo finalizado y reseña.

### Administrador

1. Iniciá sesión con `DEMO_ADMIN_EMAIL`.
2. En “Oficios”, creá uno temporal, editá su categoría y desactivalo.
3. En “Reseñas”, ocultá el comentario indicando un motivo.
4. Volvé al perfil público: el comentario desaparece, pero el puntaje sigue en el promedio.
5. Restaurá la reseña si querés repetir la demostración.

## Comprobación rápida antes de presentar

```powershell
cd backend
npm run prisma:validate
npm test
npm run test:integration

cd ../frontend
npm test
npm run lint
npm run build
```

Las pruebas de integración escriben exclusivamente en `servimap_test`; no alteran los datos preparados en `servimap`.
