-- CreateEnum
CREATE TYPE "FormatoGrid" AS ENUM ('GRANDE', 'VERTICAL', 'HORIZONTAL', 'PEQUENA_1', 'PEQUENA_2');

-- AlterEnum
ALTER TYPE "EstadoComprobante" ADD VALUE 'ANULADO';

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'TRANSFERENCIA';

-- AlterTable
ALTER TABLE "GaleriaPublica" ADD COLUMN     "formatoGrid" "FormatoGrid" NOT NULL DEFAULT 'PEQUENA_1';

