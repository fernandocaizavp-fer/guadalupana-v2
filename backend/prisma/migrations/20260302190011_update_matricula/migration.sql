/*
  Warnings:

  - You are about to drop the column `domicilioCalle` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `domicilioNo` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `nombreMadre` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `nombrePadre` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `nombreRepresentante` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `telefonoRepresentante` on the `Matricula` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Matricula" DROP COLUMN "domicilioCalle",
DROP COLUMN "domicilioNo",
DROP COLUMN "nombreMadre",
DROP COLUMN "nombrePadre",
DROP COLUMN "nombreRepresentante",
DROP COLUMN "telefonoRepresentante",
ADD COLUMN     "anioNacimiento" TEXT,
ADD COLUMN     "calle" TEXT,
ADD COLUMN     "centroformacionanterior" TEXT,
ADD COLUMN     "correoestudiante" TEXT,
ADD COLUMN     "cursoanterior" TEXT,
ADD COLUMN     "diaNacimiento" TEXT,
ADD COLUMN     "domiciliorepresentante" TEXT,
ADD COLUMN     "especialidad" TEXT,
ADD COLUMN     "lugarfechacertificado" TEXT,
ADD COLUMN     "lugarfechamatricula" TEXT,
ADD COLUMN     "mesNacimiento" TEXT,
ADD COLUMN     "nombremama" TEXT,
ADD COLUMN     "nombrepapa" TEXT,
ADD COLUMN     "nombrerepresentante" TEXT,
ADD COLUMN     "num" TEXT,
ADD COLUMN     "ocupacionmama" TEXT,
ADD COLUMN     "ocupacionpapa" TEXT,
ADD COLUMN     "ocupacionrepresentante" TEXT,
ADD COLUMN     "profesionmama" TEXT,
ADD COLUMN     "profesionpapa" TEXT,
ADD COLUMN     "telefonorepresentante" TEXT,
ADD COLUMN     "transversal" TEXT,
ADD COLUMN     "unidadeducativa" TEXT;
