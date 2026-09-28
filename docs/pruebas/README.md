# Documentación de pruebas funcionales de ServiMap

## Objetivo

Este conjunto de documentos define cómo verificar funcionalmente ServiMap y cómo registrar resultados reproducibles sin incluir credenciales, datos personales ni secretos. La documentación refleja las funcionalidades observables en el código del repositorio al 27 de septiembre de 2026.

## Alcance

Se cubren los roles CLIENTE, PRESTADOR y ADMINISTRADOR; autenticación; perfiles; catálogo y asociación de oficios; precios; disponibilidad; búsqueda; geolocalización; solicitudes; propuestas; cancelación, rechazo y finalización; calificaciones; moderación; validaciones; navegación y comportamiento responsive.

No se documentan como existentes chat, notificaciones, recuperación de contraseña ni pagos, porque no están implementados en el código revisado.

## Entorno de referencia

- Frontend: React, Vite, React Router, Axios, Leaflet y OpenStreetMap.
- Backend: Express, Prisma y PostgreSQL.
- Producción declarada: frontend en Vercel y API en Render.
- Automatización: Node Test Runner, Supertest, Vitest, Testing Library y Playwright.
- Base autorizada para automatizaciones con escritura: `servimap_test`.

Las pruebas manuales deben registrar la URL y versión realmente utilizadas. Nunca deben ejecutarse pruebas destructivas sobre la base principal.

## Metodología

1. Asociar cada ejecución con un caso de la matriz.
2. Preparar datos desechables sin reutilizar información personal real.
3. Ejecutar los pasos en el orden indicado.
4. Comparar el resultado observado con el esperado.
5. Registrar estado, entorno, observaciones y evidencia.
6. No marcar una prueba como aprobada sin evidencia verificable.

Los estados admitidos son `APROBADO`, `FALLIDO`, `BLOQUEADO` y `PENDIENTE DE REGISTRO`.

## Documentos

- [Plan de pruebas](plan-de-pruebas.md)
- [Casos de prueba](casos-de-prueba.md)
- [Ejecución y resultados](ejecucion-y-resultados.md)
- [Guía y registro de evidencias](evidencias.md)

## Uso recomendado

Antes de una entrega, ejecutar primero las pruebas unitarias sin base de datos. Las pruebas de integración y E2E sólo deben ejecutarse con una conexión confirmada a `servimap_test`. Completar después los recorridos manuales prioritarios en los navegadores y tamaños de pantalla definidos en el plan.

