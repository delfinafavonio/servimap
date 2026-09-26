# ServiMap

Aplicación responsive para conectar clientes con prestadores de servicios cercanos. Incluye autenticación por roles, perfiles profesionales, mapa con ubicación pública aproximada, solicitudes, calificaciones y administración.

## Stack

- Backend: Node.js, Express 5, PostgreSQL 17, Prisma 7, `@prisma/adapter-pg`, JWT en cookie HttpOnly y bcrypt.
- Frontend: React 19, Vite, React Router, Axios, Leaflet y OpenStreetMap.
- Calidad: Node Test Runner, Supertest, Vitest, Testing Library y ESLint.
- API: OpenAPI 3 y Swagger UI.

## Despliegue mínimo: Neon + Render + Vercel

### 1. Neon

Creá un proyecto PostgreSQL y copiá su cadena de conexión directa con TLS. No la guardes en Git. Render la recibirá como `DATABASE_URL` y Prisma 7 la leerá desde `backend/prisma7.config.ts`.

### 2. Backend en Render

Podés crear un Blueprint desde [`render.yaml`](render.yaml) o un Web Service con directorio raíz `backend`.

- Build: `npm ci && npm run prisma:generate && npm run db:deploy`
- Start: `npm start`
- Health check: `/api/health`
- Runtime: Node.js 22 o posterior

Variables requeridas:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://USUARIO:CLAVE@HOST/BASE?sslmode=require
JWT_SECRET=SECRETO_ALEATORIO_LARGO
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://TU-PROYECTO.vercel.app
CLOUDINARY_CLOUD_NAME=NOMBRE_DE_CLOUD
CLOUDINARY_API_KEY=API_KEY
CLOUDINARY_API_SECRET=API_SECRET
```

Render asigna `PORT` automáticamente; no hace falta definirlo. Después del primer despliegue, inicializá los oficios una vez desde Render Shell con `npm run seed`. El seed usa `upsert` y no borra datos.

Las fotos de perfil se validan como JPG, PNG o WebP de hasta 2 MB y se suben desde el backend a Cloudinary. Las tres variables `CLOUDINARY_*` deben existir en Render; nunca deben configurarse en Vercel ni exponerse con prefijo `VITE_`.

### 3. Frontend en Vercel

Importá el mismo repositorio y elegí `frontend` como Root Directory. Vercel detectará Vite; la configuración esperada es:

- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`

Variable requerida:

```dotenv
VITE_API_URL=https://TU-SERVICIO.onrender.com/api
```

[`frontend/vercel.json`](frontend/vercel.json) redirige las rutas de React Router a `index.html`. Cuando Vercel entregue la URL definitiva, copiá su origen exacto, sin barra final, a `CORS_ORIGIN` en Render y redesplegá el backend. Si agregás dominios adicionales, separalos con comas.

Las cookies de producción son `HttpOnly`, `Secure` y `SameSite=None`, necesarias porque Vercel y Render usan dominios diferentes. Para navegadores que bloqueen cookies de terceros, la opción más robusta es publicar frontend y API bajo subdominios propios del mismo dominio registrable.

## Instalación

Requiere Node.js 22 o posterior y PostgreSQL 17 en `localhost:5432`.

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Configurá `backend/.env` con valores locales. Como mínimo:

```dotenv
DATABASE_URL="postgresql://USUARIO:CLAVE@localhost:5432/servimap?schema=public"
PORT=3000
JWT_SECRET="UN_SECRETO_LARGO_Y_ALEATORIO"
JWT_EXPIRES_IN="8h"
CORS_ORIGIN="http://localhost:5173"
```

No versiones `.env`, contraseñas ni tokens. Prepará la base principal:

```powershell
npx prisma migrate deploy
npm run prisma:generate
npm run seed
npm run dev
```

En otra terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

## Autenticación

El frontend usa la cookie `servimap_session`, firmada como JWT, con `HttpOnly`, `SameSite=Strict` y `Secure` en producción. Axios envía cookies con `withCredentials`; el token no se almacena en `localStorage`. La API también acepta Bearer JWT para clientes externos. Registro y login tienen rate limiting.

## Base de pruebas aislada

`npm run test:integration` deriva automáticamente una conexión a `servimap_test` desde `DATABASE_URL`, crea esa base si no existe, aplica migraciones y ejecuta las pruebas. Antes de limpiar datos comprueba que `current_database()` sea exactamente `servimap_test`.

También podés definir explícitamente:

```dotenv
TEST_DATABASE_URL="postgresql://USUARIO:CLAVE@localhost:5432/servimap_test?schema=public"
TEST_JWT_SECRET="SECRETO_EXCLUSIVO_DE_PRUEBAS"
```

Nunca apuntes `TEST_DATABASE_URL` a `servimap`: el runner rechaza cualquier otro nombre.

## Seeds y demostración

Oficios idempotentes:

```powershell
cd backend
npm run seed
```

Datos completos de demo, también idempotentes:

```powershell
$env:DEMO_ADMIN_EMAIL="correo-local"
$env:DEMO_ADMIN_PASSWORD="clave-local"
$env:DEMO_CLIENT_EMAIL="correo-local"
$env:DEMO_CLIENT_PASSWORD="clave-local"
$env:DEMO_PROVIDER_EMAIL="correo-local"
$env:DEMO_PROVIDER_PASSWORD="clave-local"
npm run seed:demo
```

Las claves se toman exclusivamente del entorno. La guía de presentación está en [DEMO.md](DEMO.md).

## Scripts de calidad

Backend:

```powershell
npm test                   # unitarias, sin escribir en PostgreSQL
npm run test:integration   # recorrido real sobre servimap_test
npm run test:all
npm run prisma:validate
npx prisma migrate status
```

Frontend:

```powershell
npm test
npm run lint
npm run build
```

Auditoría:

```powershell
npm audit --omit=dev
```

## Roles

- Cliente: configura ubicación privada, busca profesionales, crea/cancela solicitudes y califica trabajos finalizados.
- Prestador: completa su perfil, foto por URL HTTP(S), ubicación privada, oficios, precios y disponibilidad; gestiona sus solicitudes.
- Administrador: consulta solicitudes, crea/edita/activa oficios y modera comentarios sin alterar puntajes.

Las coordenadas exactas del prestador sólo se devuelven en `/api/prestadores/me`. La búsqueda y el perfil público redondean las coordenadas a dos decimales.

## Migraciones

No edites migraciones aplicadas ni uses `prisma migrate reset` sobre bases con datos. La quinta migración añade unicidad de oficio, `CHECK` de puntaje e índices de consulta.

```powershell
npx prisma migrate status
npx prisma migrate deploy
```

## API

Los endpoints, cuerpos, filtros, respuestas y permisos están documentados en Swagger. Recursos principales:

- `/api/auth`
- `/api/oficios`
- `/api/prestadores`
- `/api/clientes`
- `/api/solicitudes`
- `/api/calificaciones`
