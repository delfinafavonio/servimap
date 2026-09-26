CREATE TYPE "ModalidadPrecio" AS ENUM ('FIJO', 'RANGO');

ALTER TABLE "_OficioToPrestador"
ADD COLUMN "modalidad_precio" "ModalidadPrecio" NOT NULL DEFAULT 'FIJO',
ADD COLUMN "precio_minimo" DECIMAL(12,2),
ADD COLUMN "precio_maximo" DECIMAL(12,2);

ALTER TABLE "_OficioToPrestador"
ADD CONSTRAINT "prestador_oficio_precios_coherentes_check" CHECK (
  (
    "modalidad_precio" = 'FIJO'
    AND "precio_minimo" IS NULL
    AND "precio_maximo" IS NULL
    AND ("precio" IS NULL OR "precio" > 0)
  )
  OR
  (
    "modalidad_precio" = 'RANGO'
    AND "precio" IS NULL
    AND "precio_minimo" IS NOT NULL
    AND "precio_maximo" IS NOT NULL
    AND "precio_minimo" > 0
    AND "precio_maximo" > 0
    AND "precio_minimo" <= "precio_maximo"
  )
);
