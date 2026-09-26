# Frontend de ServiMap

Cliente React 19 de ServiMap. Usa React Router, Axios, Leaflet/OpenStreetMap y la identidad visual verde petróleo, rosa apagado y crema.

## Configuración

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Variable requerida:

```dotenv
VITE_API_URL="http://localhost:3000/api"
```

El backend debe permitir `http://localhost:5173` en `CORS_ORIGIN`. La sesión usa una cookie JWT HttpOnly; Axios tiene `withCredentials` habilitado.

## Comandos

```powershell
npm run dev
npm test
npm run test:watch
npm run lint
npm run build
npm run preview
```

Las pruebas de componentes cubren login, autorización por rol, edición administrativa de oficios y búsqueda/mapa con coordenadas aproximadas.
