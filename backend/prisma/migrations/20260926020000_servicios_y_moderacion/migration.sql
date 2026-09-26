-- Amplia la relacion ya existente entre prestadores y oficios sin recrearla.
ALTER TABLE "_OficioToPrestador"
ADD COLUMN "precio" DECIMAL(12,2),
ADD COLUMN "is_disponible" BOOLEAN NOT NULL DEFAULT true;

-- Conserva el puntaje y permite ocultar/moderar solamente el comentario.
ALTER TABLE "calificaciones"
ADD COLUMN "motivo_moderacion" TEXT,
ADD COLUMN "fecha_moderacion" TIMESTAMP(3);
