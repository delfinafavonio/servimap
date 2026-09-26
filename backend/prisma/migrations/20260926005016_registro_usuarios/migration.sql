/*
  Warnings:

  - Added the required column `apellido` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "prestadores" ADD COLUMN     "telefono" TEXT,
ALTER COLUMN "descripcion_profesional" DROP NOT NULL,
ALTER COLUMN "zona_cobertura" DROP NOT NULL,
ALTER COLUMN "latitud" DROP NOT NULL,
ALTER COLUMN "longitud" DROP NOT NULL,
ALTER COLUMN "is_disponible" SET DEFAULT false;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "apellido" TEXT NOT NULL;
