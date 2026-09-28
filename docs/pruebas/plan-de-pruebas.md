# Plan de pruebas funcionales

## 1. Objetivos

- Verificar que cada rol pueda realizar únicamente las acciones autorizadas.
- Validar que los datos guardados se recuperen sin mezclarse entre cuentas.
- Comprobar la máquina de estados de solicitudes y sus restricciones temporales.
- Confirmar validaciones, mensajes de error y prevención de operaciones duplicadas.
- Revisar navegación, persistencia de sesión y presentación responsive.
- Mantener trazabilidad entre requisito, caso, ejecución y evidencia.

## 2. Funcionalidades cubiertas

| Área | Cobertura prevista |
|---|---|
| Autenticación | Registro público de CLIENTE/PRESTADOR, correo normalizado por rol, login, logout, persistencia, expiración y rutas protegidas |
| Perfiles | Consulta y edición de perfiles, fotos, datos autorizados y privacidad de coordenadas |
| Oficios y precios | Catálogo, alta/actualización por prestador, modalidad fija/rango, disponibilidad y eliminación |
| Búsqueda | Oficio, texto/nombre, zona, distancia, geolocalización denegada y mapa |
| Solicitudes | Creación, listados por propietario, propuesta, aceptación, rechazo, cancelación, concurrencia, finalización e historial |
| Calificaciones | Alta sobre trabajo finalizado, límites, unicidad y moderación administrativa |
| Administración | Gestión de catálogo, activación/desactivación y moderación de reseñas |
| Interfaz | Estados vacíos, errores de API, modales, navegación y responsive |

## 3. Roles involucrados

- **CLIENTE:** busca prestadores disponibles, administra su perfil y sus solicitudes, acepta/rechaza propuestas y califica trabajos finalizados.
- **PRESTADOR:** completa su perfil, configura servicios/precios/disponibilidad, responde solicitudes y finaliza trabajos.
- **ADMINISTRADOR:** administra oficios, consulta solicitudes y modera comentarios.
- **Visitante:** consulta catálogo y perfiles públicos completos, o accede a registro/login.

## 4. Condiciones previas

- Versión o commit bajo prueba identificado.
- Backend y frontend accesibles mediante las URLs declaradas para el entorno.
- Catálogo de oficios cargado.
- Para pruebas con escritura automatizada, `TEST_DATABASE_URL` debe apuntar inequívocamente a `servimap_test`.
- Variables necesarias configuradas sin registrarlas en evidencias.
- Cuentas desechables diferenciadas por rol.
- Para fotos, almacenamiento externo configurado; si no lo está, el caso queda bloqueado y se registra la causa.
- Reloj del sistema correcto para validar propuestas y finalización.

## 5. Datos de prueba

Usar valores sintéticos, únicos por ejecución:

- Correos con dominio reservado o controlado para pruebas; nunca correos personales.
- Contraseñas de prueba que cumplan el mínimo de ocho caracteres y no coincidan con credenciales reales.
- Descripciones sin datos sensibles, de 1 a 2000 caracteres.
- Notas de propuesta de hasta 1000 caracteres.
- Puntajes enteros de 1 a 5.
- Precios positivos dentro del máximo admitido; rangos con mínimo menor o igual al máximo.
- Coordenadas válidas sólo cuando el caso las requiera.
- Fechas futuras para propuestas y pasadas/futuras controladas para límites temporales.

## 6. Procedimiento general

1. Confirmar entorno y versión.
2. Preparar cuentas y perfiles requeridos.
3. Ejecutar el caso sin alterar datos ajenos.
4. Registrar solicitudes y respuestas relevantes sin copiar JWT, cookies o contraseñas.
5. Capturar sólo la interfaz o metadatos necesarios.
6. Limpiar únicamente datos desechables cuando exista un procedimiento seguro y autorizado.

## 7. Pruebas manuales y automatizadas

Las **manuales** verifican el comportamiento observable en navegador: aspecto responsive, modales, navegación, mensajes, permisos del navegador y recorridos entre usuarios. Su resultado debe registrarse por ejecución y acompañarse con evidencia.

Las **automatizadas** son repetibles y comparan resultados programáticamente. En este repositorio existen:

- `cd backend && npm test`: reglas unitarias sin escritura en PostgreSQL.
- `cd frontend && npm test`: componentes, formularios, sesión y flujos simulados de API.
- `cd backend && npm run test:integration`: API y PostgreSQL; escribe exclusivamente en `servimap_test` y no debe ejecutarse sin confirmar la base.
- `cd backend && npm run test:e2e`: recorrido real con navegador y escritura en `servimap_test`.

Una prueba automatizada aprobada no sustituye la revisión manual visual ni demuestra por sí sola el estado de producción.

## 8. Criterios de aceptación

- Todos los casos críticos de autenticación, autorización, creación de solicitudes y propuestas están aprobados.
- No existen accesos cruzados entre identidades o roles.
- Las transiciones inválidas y operaciones duplicadas son rechazadas sin alterar el estado previo.
- Los datos persisten al recargar cuando corresponde.
- Los errores son comprensibles y no exponen información sensible.
- No se observan bloqueos en los anchos de escritorio y móvil acordados.
- Cada resultado manual tiene evidencia asociada.

## 9. Criterios de finalización

- Matriz revisada y casos aplicables ejecutados.
- Fallos críticos resueltos o aceptados explícitamente por el equipo.
- Casos bloqueados documentados con causa y responsable de seguimiento.
- Registro de ejecución y evidencias actualizado.
- Ausencia de secretos, tokens y datos personales en la documentación.

## 10. Priorización

- **P0:** autenticación, permisos, aislamiento de datos y máquina de estados.
- **P1:** perfiles, oficios/precios, búsqueda y flujo completo de solicitud.
- **P2:** fotos, administración, geolocalización, responsive y estados vacíos.

