# Matriz de casos de prueba

## Convenciones

- **Aprobado automatizado:** existe una prueba ejecutada satisfactoriamente en esta revisión. Su alcance puede ser unitario o con API simulada.
- **Pendiente de registro:** requiere ejecución manual o una suite con escritura que no fue ejecutada en esta tarea.
- Las referencias `FE` y `BE` apuntan respectivamente a las evidencias automatizadas de frontend y backend registradas en [evidencias.md](evidencias.md).

## A. Autenticación, sesión y autorización

| ID | Módulo | Funcionalidad | Rol | Precondiciones | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado/evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-AUT-01 | Registro | Alta de cliente | Visitante | Correo no usado como CLIENTE | Abrir registro cliente, completar y enviar | Nombre/apellido; correo normalizado; clave válida | Cuenta CLIENTE independiente; sesión iniciada; redirección a búsqueda | Procesamiento frontend de JWT cubierto; persistencia real no ejecutada | APROBADO automatizado parcial, FE; recorrido real PENDIENTE |
| CP-AUT-02 | Registro | Alta de prestador | Visitante | Correo no usado como PRESTADOR | Abrir registro prestador, completar y enviar | Datos válidos | Cuenta PRESTADOR; perfil propio; redirección a perfil | Procesamiento frontend de JWT cubierto; API real no ejecutada | APROBADO automatizado parcial, FE; recorrido real PENDIENTE |
| CP-AUT-03 | Registro | Duplicado dentro del mismo rol | Visitante | Cuenta existente | Repetir registro con mismo correo y rol | Mismo correo normalizado y rol | HTTP 409 y mensaje; no crear segunda cuenta | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-AUT-04 | Registro | Mismo correo en roles distintos | Visitante | Existe cuenta CLIENTE o PRESTADOR | Registrar el rol opuesto | Mismo correo; contraseña independiente | Se crea otro ID y perfil sin mezclar datos | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-AUT-05 | Registro | Exclusión de administrador público | Visitante | API disponible | Intentar registrar ADMINISTRADOR | `rol=ADMINISTRADOR` | HTTP 400; ninguna cuenta creada | Regla observada en controlador; no ejecutada contra API | PENDIENTE DE REGISTRO |
| CP-AUT-06 | Login | Acceso por correo, contraseña y rol | Cliente/Prestador | Cuenta activa | Seleccionar rol correcto e ingresar | Credenciales válidas | Usuario autenticado y redirección exclusiva a su rol | Credenciales y navegación de ambos roles verificadas con API simulada | APROBADO automatizado, FE |
| CP-AUT-07 | Login | Rol seleccionado incorrecto | Cliente/Prestador | Cuenta existente sólo en otro rol | Elegir rol opuesto e ingresar | Correo/clave válidos para otro rol | Error genérico; sin sesión ni redirección | Mensaje y ausencia de acceso cubiertos con API simulada | APROBADO automatizado, FE |
| CP-AUT-08 | Sesión | Persistencia al recargar | Usuario autenticado | JWT válido almacenado | Recargar una ruta protegida | Token emitido previamente | `/auth/me` restaura el usuario y Bearer acompaña la solicitud | Persistencia y cabecera Bearer verificadas con adaptador Axios simulado | APROBADO automatizado, FE |
| CP-AUT-09 | Sesión | Expiración del JWT | Usuario autenticado | Token expirado o respuesta 401 | Solicitar recurso protegido | JWT vencido | Limpiar sesión, informar vencimiento y volver a login | Limpieza y mensaje verificados con respuesta 401 simulada | APROBADO automatizado, FE |
| CP-AUT-10 | Sesión | Cierre explícito | Usuario autenticado | Menú de avatar visible | Abrir avatar; luego elegir Cerrar sesión | — | Abrir avatar no cierra; opción explícita limpia sesión | Interacción y navegación verificadas | APROBADO automatizado, FE |
| CP-AUT-11 | Autorización | Ruta de otro rol | Usuario autenticado | Entrar con CLIENTE | Navegar a ruta ADMINISTRADOR o PRESTADOR | URL protegida | Redirección; componente no renderizado | Ruta no autorizada verificada | APROBADO automatizado, FE |
| CP-AUT-12 | Autorización | Endpoint de otro rol | Usuario autenticado | Token válido de un rol | Invocar endpoint exclusivo ajeno | Bearer válido | HTTP 403; sin cambios | Regla de permisos unitarios aprobada; API real pendiente | APROBADO automatizado parcial, BE; integración PENDIENTE |

## B. Perfiles, fotos, oficios, precios y disponibilidad

| ID | Módulo | Funcionalidad | Rol | Precondiciones | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado/evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-PER-01 | Perfil prestador | Visualización propia | Prestador | Sesión válida | Abrir Mi perfil | Perfil existente o incompleto | Datos reales, métricas reales/0 y aviso si incompleto | Render y carga simulada verificados | APROBADO automatizado, FE |
| CP-PER-02 | Perfil prestador | Edición y recarga | Prestador | Perfil propio | Editar, guardar, volver y recargar | Descripción, zona, teléfono, coordenadas, disponibilidad | Persistencia exacta; no editar otro perfil | Guardado y retorno verificados con API simulada | APROBADO automatizado parcial, FE; persistencia DB PENDIENTE |
| CP-PER-03 | Perfil prestador | Perfil incompleto no disponible | Prestador | Falta descripción, zona, teléfono u oficio activo | Activar disponibilidad y guardar | Perfil incompleto | Backend fuerza disponibilidad falsa | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-PER-04 | Perfil cliente | Consulta y edición autorizada | Cliente | Sesión válida | Abrir Mi perfil, editar y guardar | Nombre, apellido, correo, coordenadas | Actualizar sólo el cliente autenticado | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-PER-05 | Fotos | Foto válida | Cliente/Prestador | Cloudinary configurado | Seleccionar y subir imagen | JPG/PNG/WebP de hasta 2 MB | URL persistente; avatar actualizado | No ejecutado por requerir servicio externo | PENDIENTE DE REGISTRO |
| CP-PER-06 | Fotos | Tipo o tamaño inválido | Cliente/Prestador | Formulario disponible | Intentar subir archivo inválido | GIF o imagen mayor a 2 MB | Rechazo antes de almacenar | Validación de backend aprobada | APROBADO automatizado, BE |
| CP-PER-07 | Oficios | Agregar oficio con precio fijo | Prestador | Oficio activo no asociado | Seleccionar oficio, FIJO, importe y agregar | Precio positivo | Asociación única; precio recuperado y formateado | Alta y visualización simuladas verificadas | APROBADO automatizado, FE |
| CP-PER-08 | Oficios | Actualizar asociación existente | Prestador | Oficio ya asociado | Seleccionarlo, modificar y actualizar | Nuevo precio/disponibilidad | Actualiza el registro existente sin duplicarlo | Actualización simulada y precarga verificadas | APROBADO automatizado, FE |
| CP-PER-09 | Oficios | Rango de precios y límites | Prestador | Oficio activo | Elegir RANGO y guardar; repetir con mínimo mayor | Mínimo/máximo positivos | Guardar rango válido; rechazar mínimo mayor; limpiar precio fijo contradictorio | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-PER-10 | Oficios | Quitar oficio propio | Prestador | Al menos un oficio asociado | Confirmar Quitar | ID del oficio propio | Eliminar sólo la asociación propia; si era la última, desactivar prestador | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |

## C. Búsqueda, mapa y perfil público

| ID | Módulo | Funcionalidad | Rol | Precondiciones | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado/evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-BUS-01 | Búsqueda | Prestador disponible por oficio | Cliente | Prestador completo, disponible y oficio disponible | Filtrar por oficio sin zona/distancia | Oficio activo | Mostrar tarjeta aunque no haya coordenadas | Caso con prestador sin coordenadas verificado con API simulada | APROBADO automatizado, FE |
| CP-BUS-02 | Búsqueda | Exclusión de inactivos/incompletos | Cliente | Prestadores con distintas condiciones | Buscar sin filtros | — | No mostrar prestador inactivo, indisponible o incompleto | Lógica observada; consulta real no ejecutada | PENDIENTE DE REGISTRO |
| CP-BUS-03 | Búsqueda | Texto por nombre/descripción/oficio | Cliente | Catálogo con coincidencias | Escribir texto y buscar | Texto parcial con mayúsculas variables | Coincidencias insensibles a mayúsculas | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-BUS-04 | Búsqueda | Filtro de zona | Cliente | Prestadores en zonas distintas | Informar zona y buscar | Texto parcial de zona | Sólo coincidencias de zona | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-BUS-05 | Distancia | Cualquier distancia sin ubicación | Cliente | Prestador sin coordenadas | No elegir radio y buscar | Sin latitud/longitud/distancia | No exigir coordenadas ni calcular distancia | Presentación sin coordenadas verificada con API simulada | APROBADO automatizado, FE |
| CP-BUS-06 | Distancia | Radio con coordenadas válidas | Cliente | Cliente y prestadores geolocalizados | Usar ubicación y seleccionar radio | Coordenadas y 0 < km ≤ 500 | Filtrar y ordenar por distancia; mostrar distancia calculada | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-BUS-07 | Geolocalización | Permiso denegado | Cliente | Navegador solicita ubicación | Rechazar permiso y buscar por oficio/zona | — | Mensaje claro; búsqueda normal sigue habilitada | Flujo de rechazo verificado | APROBADO automatizado, FE |
| CP-BUS-08 | Mapa | Marcadores y privacidad | Cliente | Resultados con/sin coordenadas | Observar mapa y perfil público | — | Marcador sólo con coordenadas; ubicación pública aproximada, nunca exacta | Marcador y coordenada pública simulados verificados; privacidad real pendiente | APROBADO automatizado parcial, FE |
| CP-BUS-09 | Perfil público | Datos, precios y reseñas | Visitante/Cliente | Prestador completo | Abrir Ver perfil | Oficios FIJO/RANGO | Mostrar datos reales, precios orientativos y sólo reseñas no moderadas | No ejecutado manualmente | PENDIENTE DE REGISTRO |

## D. Solicitudes y propuestas

| ID | Módulo | Funcionalidad | Rol | Precondiciones | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado/evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-SOL-01 | Solicitudes | Crear solicitud válida | Cliente | Prestador y oficio disponibles | Abrir modal, describir y enviar | Descripción 1–2000 caracteres | Crear PENDIENTE; confirmar sólo tras respuesta exitosa | Modal y confirmación posterior a API verificados con simulación | APROBADO automatizado, FE |
| CP-SOL-02 | Solicitudes | Oficio no ofrecido/indisponible | Cliente | Servicio inactivo o ajeno | Forzar envío | IDs existentes no asociados | HTTP 400; no crear solicitud | No ejecutado contra API | PENDIENTE DE REGISTRO |
| CP-SOL-03 | Privacidad | Listado aislado por identidad | Cliente/Prestador | Varias cuentas con solicitudes | Consultar `/solicitudes` | JWT de cada cuenta | Cada cuenta ve sólo sus solicitudes; admin ve todas | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-SOL-04 | Prestador | Pestañas de solicitudes | Prestador | Solicitudes en estados distintos | Alternar Pendientes, Propuestas, Rechazadas, Historial | — | Cada pestaña filtra y cuenta sus estados | Filtrado y estados verificados con API simulada | APROBADO automatizado, FE |
| CP-SOL-05 | Propuesta | Enviar fecha/hora futura | Prestador propietario | Solicitud PENDIENTE | Aceptar, completar modal y enviar | Fecha/hora futura; nota ≤1000 | Guardar y pasar a PROPUESTA_ENVIADA; cerrar modal al éxito | Payload y cambio de pestaña verificados con simulación | APROBADO automatizado, FE |
| CP-SOL-06 | Propuesta | Fecha pasada o hora pasada hoy | Prestador | Solicitud PENDIENTE | Ingresar valor inválido y enviar | Fecha pasada/hora anterior | Mensaje; ninguna llamada; conservar PENDIENTE | Validación frontend verificada | APROBADO automatizado, FE |
| CP-SOL-07 | Propuesta | Error de API | Prestador | Solicitud PENDIENTE | Enviar propuesta y simular error | Respuesta no exitosa | Modal y datos permanecen; no cambiar pestaña/estado | Verificado con API simulada | APROBADO automatizado, FE |
| CP-SOL-08 | Propuesta | Doble respuesta/concurrencia | Prestador | Solicitud PENDIENTE | Enviar dos operaciones concurrentes | Proponer y rechazar | Una operación actualiza; la otra recibe 409 | Máquina de estados unitaria aprobada; concurrencia real pendiente | APROBADO automatizado parcial, BE |
| CP-SOL-09 | Rechazo prestador | Confirmar o cancelar modal | Prestador propietario | Solicitud PENDIENTE | Abrir Rechazar; cancelar; repetir y confirmar | — | Cancelar no cambia; éxito mueve a Rechazadas; error conserva modal | Cancelación, error y éxito simulados verificados | APROBADO automatizado, FE |
| CP-SOL-10 | Transiciones | Matriz válida por rol | Cliente/Prestador/Admin | Estados conocidos | Intentar transiciones válidas e inválidas | Estados del enum | Sólo transiciones definidas; admin no modifica estado por endpoint | Reglas unitarias aprobadas | APROBADO automatizado, BE |
| CP-SOL-11 | Cliente | Ver propuesta | Cliente propietario | PROPUESTA_ENVIADA | Abrir Activas | Fecha, hora y nota guardadas | Mostrar propuesta y botones Aceptar/Rechazar | Visualización y acciones simuladas verificadas | APROBADO automatizado, FE |
| CP-SOL-12 | Cliente | Aceptar propuesta una vez | Cliente propietario | PROPUESTA_ENVIADA | Elegir Aceptar propuesta dos veces | — | Primera pasa a ACEPTADA; segunda se impide/rechaza | Primera acción frontend verificada; idempotencia API pendiente | APROBADO automatizado parcial, FE |
| CP-SOL-13 | Cliente | Rechazar propuesta | Cliente propietario | PROPUESTA_ENVIADA | Abrir confirmación y confirmar | — | Pasar a CANCELADA sólo tras éxito | Modal y actualización simulados verificados | APROBADO automatizado, FE |
| CP-SOL-14 | Cliente | Cancelar solicitud pendiente/aceptada | Cliente propietario | PENDIENTE o ACEPTADA | Abrir modal; Volver; repetir y confirmar | — | Volver no cambia; éxito pasa a CANCELADA; error conserva modal | Error, carga y prevención de doble clic verificados | APROBADO automatizado, FE |
| CP-SOL-15 | Finalización | Impedir finalización anticipada | Prestador propietario | ACEPTADA con horario futuro | Elegir Marcar finalizada | Fecha propuesta futura | Mensaje y estado ACEPTADA sin cambios | Validación frontend y regla unitaria verificadas | APROBADO automatizado, FE/BE |
| CP-SOL-16 | Finalización | Finalizar después del horario | Prestador propietario | ACEPTADA con horario cumplido | Marcar finalizada | Fecha propuesta pasada | Estado FINALIZADA y fecha de finalización persistida | No ejecutado contra API/DB | PENDIENTE DE REGISTRO |
| CP-SOL-17 | Historial | Persistencia y orden | Prestador | Varias FINALIZADAS | Abrir Historial y recargar | Fechas distintas | Más recientes primero; conservar fechas y propuesta | Orden y campos simulados verificados; recarga DB pendiente | APROBADO automatizado parcial, FE |
| CP-SOL-18 | Propiedad | Modificar solicitud ajena | Cliente/Prestador | Existe solicitud de otra cuenta | Invocar detalle/cambio de estado | ID ajeno | HTTP 403; ningún cambio | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |

## E. Calificaciones y administración

| ID | Módulo | Funcionalidad | Rol | Precondiciones | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado/evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-CAL-01 | Calificaciones | Calificar trabajo finalizado | Cliente propietario | Solicitud FINALIZADA sin calificación | Elegir puntaje, comentario y publicar | Puntaje 1–5; comentario ≤1000 | Crear una calificación asociada | No ejecutado contra API/DB | PENDIENTE DE REGISTRO |
| CP-CAL-02 | Calificaciones | Límites de puntaje | Cliente | Formulario/API disponible | Probar 1, 5, 0, 6 y 4,5 | Valores límite | Aceptar enteros 1–5; rechazar resto | Validación unitaria aprobada | APROBADO automatizado, BE |
| CP-CAL-03 | Calificaciones | Trabajo no finalizado o duplicado | Cliente | Solicitud pendiente/ya calificada | Publicar calificación | ID propio | HTTP 409; no duplicar | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-CAL-04 | Calificaciones | Solicitud ajena | Cliente | Conocer ID ajeno | Intentar calificar | ID ajeno | HTTP 403 | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-ADM-01 | Oficios | Crear oficio | Administrador | Sesión admin | Completar alta | Nombre/categoría únicos | Oficio creado y visible según estado | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-ADM-02 | Oficios | Editar y activar/desactivar | Administrador | Oficio existente | Editar categoría y cambiar estado | Datos válidos | Catálogo actualizado; inactivos ocultos al público | Edición de UI con API simulada verificada | APROBADO automatizado parcial, FE |
| CP-ADM-03 | Oficios | Nombre duplicado | Administrador | Dos oficios existentes | Renombrar uno con nombre repetido | Nombre duplicado | HTTP 409; conservar original | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |
| CP-ADM-04 | Moderación | Ocultar/restaurar reseña | Administrador | Calificación existente | Moderar con motivo; luego restaurar | Motivo ≤500 | Oculta comentario público sin cambiar puntaje; restaurar limpia motivo | No ejecutado en esta tarea | PENDIENTE DE REGISTRO |

## F. Validaciones, errores, navegación y responsive

| ID | Módulo | Funcionalidad | Rol | Precondiciones | Pasos | Datos de entrada | Resultado esperado | Resultado obtenido | Estado/evidencia |
|---|---|---|---|---|---|---|---|---|---|
| CP-VAL-01 | Validación | Campos, correo y coordenadas | Todos | Formularios/API disponibles | Enviar vacíos, correo inválido y coordenadas parciales/fuera de rango | Valores límite | Rechazo 400 o validación del formulario; sin escritura parcial | Validaciones de backend unitarias aprobadas | APROBADO automatizado, BE |
| CP-VAL-02 | Validación | Longitudes máximas | Cliente/Prestador/Admin | Formularios disponibles | Superar límites de descripción, nota, reseña o motivo | 2001/1001/501 caracteres | Rechazar o impedir exceso; mensaje comprensible | No ejecutado manualmente | PENDIENTE DE REGISTRO |
| CP-ERR-01 | Errores | Fallo de red/API | Todos | Simular backend inaccesible o error | Ejecutar guardado | — | Mostrar error; conservar formulario y estado previo | Algunos modales cubiertos con error simulado; revisión general pendiente | APROBADO automatizado parcial, FE |
| CP-ERR-02 | Seguridad | CORS de producción/preview | Visitante | Orígenes configurados | Preflight desde autorizado y no autorizado | Orígenes legítimo/ajeno | Autorizar sólo orígenes configurados; credenciales y headers correctos | Matcher CORS unitario aprobado; preflight real pendiente | APROBADO automatizado parcial, BE |
| CP-UX-01 | Navegación | Menús y enlaces por rol | Cliente/Prestador/Admin | Sesión de cada rol | Recorrer encabezado y rutas | — | Sólo navegación correspondiente; avatar no cierra sesión | Menú de avatar cubierto; recorrido completo pendiente | APROBADO automatizado parcial, FE |
| CP-UX-02 | Modales | Cierre seguro | Cliente/Prestador | Modal abierto | Cancelar, cerrar, Escape, cambiar pestaña | — | Sin cambios; bloquear cierre durante procesamiento cuando aplique | Modales de solicitudes cubiertos con simulación | APROBADO automatizado, FE |
| CP-UX-03 | Estados vacíos | Listas sin resultados | Cliente/Prestador/Admin | Sin registros aplicables | Abrir búsqueda/listas | — | Estado vacío claro sin datos ficticios ni error | No ejecutado manualmente | PENDIENTE DE REGISTRO |
| CP-UX-04 | Responsive | Escritorio y móvil | Todos | Aplicación accesible | Probar anchos 1440, 768 y 390 px | Viewports definidos | Sin desbordes; controles utilizables; mapa, tarjetas y modales legibles | No existen capturas verificables en esta documentación | PENDIENTE DE REGISTRO |

## Resumen de la matriz

- Total: **57 casos**.
- Con evidencia automatizada completa o parcial de esta revisión: **34 casos**.
- Pendientes de ejecución manual, integración o evidencia real: **23 casos**, más la validación real pendiente de los casos marcados como automatización parcial.
- Los resultados concretos y las limitaciones se registran en [ejecucion-y-resultados.md](ejecucion-y-resultados.md).

