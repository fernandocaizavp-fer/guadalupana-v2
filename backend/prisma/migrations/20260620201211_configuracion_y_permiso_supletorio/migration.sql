-- AlterTable
ALTER TABLE "Matricula" ADD COLUMN     "supletorioHabilitadoHasta" TIMESTAMP(3),
ADD COLUMN     "supletorioMotivo" VARCHAR(200);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "supletorioHabilitado" BOOLEAN NOT NULL DEFAULT false,
    "supletorioInicio" TIMESTAMP(3),
    "supletorioFin" TIMESTAMP(3),
    "notaMinima" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notaMaxima" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "notaAprobacion" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);
