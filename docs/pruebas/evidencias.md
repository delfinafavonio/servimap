# Guía de evidencias

## Reglas

- Asociar cada evidencia con un identificador de [casos-de-prueba.md](casos-de-prueba.md).
- Registrar fecha/hora, entorno, versión o commit, navegador/dispositivo y resultado.
- Ocultar correos personales, cookies, JWT, contraseñas, cadenas de conexión y coordenadas exactas.
- Capturar el estado anterior y posterior sólo cuando ambos sean relevantes.
- No editar una captura de forma que altere el resultado; se permite censurar datos sensibles.
- Para automatización, conservar comando, código de salida y resumen de pruebas. No es necesario copiar logs con secretos.
- Usar nombres como `CP-AUT-01_2026-09-27_aprobado.png`.

## Evidencia recomendada por tipo

| Tipo de prueba | Evidencia mínima |
|---|---|
| Interfaz manual | Captura visible del resultado y URL sin parámetros sensibles |
| Responsive | Captura completa con tamaño de viewport registrado |
| API | Método, ruta, código HTTP y cuerpo sanitizado |
| Persistencia | Capturas antes y después de recargar, o consulta sanitizada |
| Automatizada | Comando, código de salida, cantidad de pruebas y archivo/suite |
| Error | Mensaje visible, pasos de reproducción y respuesta sanitizada si aplica |

## Plantilla reutilizable

```markdown
### Evidencia EV-XXX

- Caso: CP-XXX-00
- Fecha y hora:
- Responsable:
- Entorno y versión:
- Navegador/dispositivo:
- Resultado: APROBADO | FALLIDO | BLOQUEADO
- Archivo o enlace relativo:
- Observaciones:
- Datos ocultados:
```

## Registro de evidencias

| ID evidencia | Caso | Fecha | Entorno/versión | Tipo | Archivo o referencia | Resultado | Observaciones |
|---|---|---|---|---|---|---|---|
| EV-AUTO-BE-001 | CP-VAL-01, CP-SEG-01, CP-SOL-10, CP-CAL-02 | 2026-09-27 | Local, árbol de trabajo actual | Salida automatizada | `cd backend && npm test`: 7/7 aprobadas, código 0 | APROBADO | Ejecución sin PostgreSQL; salida observada en la sesión de creación de estos documentos |
| EV-AUTO-FE-001 | Casos con referencia Vitest en la matriz | 2026-09-27 | Local, árbol de trabajo actual | Salida automatizada | `cd frontend && npm test`: 25/25 aprobadas en 2 archivos, código 0 | APROBADO | APIs simuladas; no demuestra producción ni persistencia real en PostgreSQL |
| — | Casos manuales | — | — | Captura/registro | PENDIENTE DE REGISTRO | PENDIENTE DE REGISTRO | No había capturas manuales verificables incorporadas a `docs/pruebas/` |

