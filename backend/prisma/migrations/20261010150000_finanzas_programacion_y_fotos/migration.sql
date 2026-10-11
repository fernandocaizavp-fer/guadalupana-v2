-- CreateEnum
CREATE TYPE "EstadoDeuda" AS ENUM ('PENDIENTE', 'PAGADA', 'MORA');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('EN_REVISION', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('COMPROBANTE', 'EFECTIVO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "fotoPublicId" VARCHAR(255),
ADD COLUMN     "fotoUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "fechaFin" TIMESTAMP(3),
ADD COLUMN     "fechaInicio" TIMESTAMP(3),
ADD COLUMN     "horasTotales" INTEGER;

-- CreateTable
CREATE TABLE "ConceptoPago" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaMaxima" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deuda" (
    "id" SERIAL NOT NULL,
    "concepto" VARCHAR(150) NOT NULL,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "saldo" DECIMAL(10,2) NOT NULL,
    "fechaMaxima" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoDeuda" NOT NULL DEFAULT 'PENDIENTE',
    "estudianteId" INTEGER NOT NULL,
    "conceptoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comprobante" (
    "id" SERIAL NOT NULL,
    "metodo" "MetodoPago" NOT NULL DEFAULT 'COMPROBANTE',
    "urlImagen" VARCHAR(500),
    "publicId" VARCHAR(255),
    "montoAbonado" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'EN_REVISION',
    "motivoRechazo" VARCHAR(300),
    "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deudaId" INTEGER NOT NULL,

    CONSTRAINT "Comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deuda_estudianteId_idx" ON "Deuda"("estudianteId");

-- CreateIndex
CREATE UNIQUE INDEX "Deuda_estudianteId_conceptoId_key" ON "Deuda"("estudianteId", "conceptoId");

-- CreateIndex
CREATE INDEX "Comprobante_estado_idx" ON "Comprobante"("estado");

-- CreateIndex
CREATE INDEX "Comprobante_deudaId_idx" ON "Comprobante"("deudaId");

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "ConceptoPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_deudaId_fkey" FOREIGN KEY ("deudaId") REFERENCES "Deuda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

