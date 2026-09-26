-- Evita oficios duplicados y refuerza reglas que antes sólo vivían en la API.
CREATE UNIQUE INDEX "oficios_nombre_key" ON "oficios"("nombre");

ALTER TABLE "calificaciones"
ADD CONSTRAINT "calificaciones_puntaje_check" CHECK ("puntaje" BETWEEN 1 AND 5);

-- Índices para los filtros y listados más frecuentes.
CREATE INDEX "prestadores_is_disponible_idx" ON "prestadores"("is_disponible");
CREATE INDEX "prestadores_zona_cobertura_idx" ON "prestadores"("zona_cobertura");
CREATE INDEX "solicitudes_cliente_id_idx" ON "solicitudes"("cliente_id");
CREATE INDEX "solicitudes_prestador_id_idx" ON "solicitudes"("prestador_id");
CREATE INDEX "solicitudes_oficio_id_idx" ON "solicitudes"("oficio_id");
CREATE INDEX "solicitudes_estado_idx" ON "solicitudes"("estado");
