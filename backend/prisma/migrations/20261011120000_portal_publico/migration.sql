-- CreateEnum
CREATE TYPE "EstadoProspecto" AS ENUM ('PENDIENTE', 'CONTACTADO');

-- CreateTable
CREATE TABLE "PosibleMatricula" (
    "id" SERIAL NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "especialidadInteres" VARCHAR(100) NOT NULL,
    "estado" "EstadoProspecto" NOT NULL DEFAULT 'PENDIENTE',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosibleMatricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnuncioPublico" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "contenido" TEXT NOT NULL,
    "imagenUrl" VARCHAR(500),
    "fechaPublicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AnuncioPublico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GaleriaPublica" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "imagenUrl" VARCHAR(500) NOT NULL,
    "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GaleriaPublica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarioPublico" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "CalendarioPublico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosibleMatricula_estado_idx" ON "PosibleMatricula"("estado");

-- CreateIndex
CREATE INDEX "CalendarioPublico_fechaFin_idx" ON "CalendarioPublico"("fechaFin");

