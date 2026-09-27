/*
  Warnings:

  - You are about to alter the column `titulo` on the `Anuncio` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - You are about to alter the column `imagen` on the `Anuncio` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `ramaArtesanal` on the `Curso` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `anioFormativo` on the `Curso` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `nombre` on the `Materia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `materiaParent` on the `Materia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to drop the column `anioNacimiento` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `calle` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `canton` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `centroformacionanterior` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `ciudad` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `conferidoPorA1` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `conferidoPorA2` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `correo` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `correoestudiante` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `cursoanterior` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `diaNacimiento` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `domiciliorepresentante` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `especialidad` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `fechaNacimiento` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `lugarfechacertificado` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `mesNacimiento` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `nacionalidad` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `nombremama` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `nombrepapa` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `nombrerepresentante` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `num` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `ocupacionmama` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `ocupacionpapa` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `ocupacionrepresentante` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `pais` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `parroquia` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `profesionmama` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `profesionpapa` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `provincia` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `telefonorepresentante` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `tipoBachiller` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `transversal` on the `Matricula` table. All the data in the column will be lost.
  - You are about to drop the column `unidadeducativa` on the `Matricula` table. All the data in the column will be lost.
  - You are about to alter the column `matriculaNo` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `tomo` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `pagina` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `apellidos` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `nombres` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `cedula` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `lugarfechamatricula` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `nivelEstudio` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `sexo` on the `Matricula` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `observacion` on the `NotaTarea` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `observacion` on the `ObservacionAsistencia` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(300)`.
  - You are about to alter the column `nombre` on the `Tarea` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - You are about to alter the column `nombre` on the `Usuario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `apellido` on the `Usuario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `correo` on the `Usuario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `password` on the `Usuario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(60)`.
  - You are about to alter the column `cedula` on the `Usuario` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - Added the required column `updatedAt` to the `Asistencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Curso` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Materia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Matricula` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `NotaDisciplina` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tarea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "NotaDisciplina_matriculaId_materiaId_key";

-- AlterTable
ALTER TABLE "Anuncio" ALTER COLUMN "titulo" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "imagen" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "Asistencia" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Curso" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "ramaArtesanal" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "anioFormativo" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "materiaParent" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "Matricula" DROP COLUMN "anioNacimiento",
DROP COLUMN "calle",
DROP COLUMN "canton",
DROP COLUMN "centroformacionanterior",
DROP COLUMN "ciudad",
DROP COLUMN "conferidoPorA1",
DROP COLUMN "conferidoPorA2",
DROP COLUMN "correo",
DROP COLUMN "correoestudiante",
DROP COLUMN "cursoanterior",
DROP COLUMN "diaNacimiento",
DROP COLUMN "domiciliorepresentante",
DROP COLUMN "especialidad",
DROP COLUMN "fechaNacimiento",
DROP COLUMN "lugarfechacertificado",
DROP COLUMN "mesNacimiento",
DROP COLUMN "nacionalidad",
DROP COLUMN "nombremama",
DROP COLUMN "nombrepapa",
DROP COLUMN "nombrerepresentante",
DROP COLUMN "num",
DROP COLUMN "ocupacionmama",
DROP COLUMN "ocupacionpapa",
DROP COLUMN "ocupacionrepresentante",
DROP COLUMN "pais",
DROP COLUMN "parroquia",
DROP COLUMN "profesionmama",
DROP COLUMN "profesionpapa",
DROP COLUMN "provincia",
DROP COLUMN "telefono",
DROP COLUMN "telefonorepresentante",
DROP COLUMN "tipoBachiller",
DROP COLUMN "transversal",
DROP COLUMN "unidadeducativa",
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "matriculaNo" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "tomo" SET DATA TYPE VARCHAR(5),
ALTER COLUMN "pagina" SET DATA TYPE VARCHAR(5),
ALTER COLUMN "apellidos" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "nombres" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "cedula" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "lugarfechamatricula" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "nivelEstudio" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "sexo" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "NotaDisciplina" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "NotaTarea" ALTER COLUMN "observacion" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "ObservacionAsistencia" ALTER COLUMN "observacion" SET DATA TYPE VARCHAR(300);

-- AlterTable
ALTER TABLE "Tarea" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(150);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "apellido" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "correo" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "password" SET DATA TYPE VARCHAR(60),
ALTER COLUMN "cedula" SET DATA TYPE VARCHAR(10);

-- CreateTable
CREATE TABLE "DatosPersonalesMatricula" (
    "id" SERIAL NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "anioNacimiento" VARCHAR(4),
    "mesNacimiento" VARCHAR(10),
    "diaNacimiento" VARCHAR(2),
    "pais" VARCHAR(30),
    "provincia" VARCHAR(30),
    "canton" VARCHAR(30),
    "parroquia" VARCHAR(30),
    "ciudad" VARCHAR(30),
    "nacionalidad" VARCHAR(30),
    "calle" VARCHAR(100),
    "num" VARCHAR(10),
    "transversal" VARCHAR(100),
    "telefono" VARCHAR(15),
    "correo" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosPersonalesMatricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatosFamiliaresMatricula" (
    "id" SERIAL NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "nombrepapa" VARCHAR(100),
    "profesionpapa" VARCHAR(60),
    "ocupacionpapa" VARCHAR(60),
    "nombremama" VARCHAR(100),
    "profesionmama" VARCHAR(60),
    "ocupacionmama" VARCHAR(60),
    "nombrerepresentante" VARCHAR(100),
    "ocupacionrepresentante" VARCHAR(60),
    "domiciliorepresentante" VARCHAR(150),
    "telefonorepresentante" VARCHAR(15),
    "correoestudiante" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosFamiliaresMatricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatosAcademicosMatricula" (
    "id" SERIAL NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "cursoanterior" VARCHAR(100),
    "unidadeducativa" VARCHAR(100),
    "centroformacionanterior" VARCHAR(100),
    "tipoBachiller" VARCHAR(60),
    "conferidoPorA1" VARCHAR(100),
    "conferidoPorA2" VARCHAR(100),
    "especialidad" VARCHAR(100),
    "lugarfechacertificado" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosAcademicosMatricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamenGrado" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION,
    "materiaId" INTEGER NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamenGrado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecuperacionPassword" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "expira" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecuperacionPassword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatosPersonalesMatricula_matriculaId_key" ON "DatosPersonalesMatricula"("matriculaId");

-- CreateIndex
CREATE UNIQUE INDEX "DatosFamiliaresMatricula_matriculaId_key" ON "DatosFamiliaresMatricula"("matriculaId");

-- CreateIndex
CREATE UNIQUE INDEX "DatosAcademicosMatricula_matriculaId_key" ON "DatosAcademicosMatricula"("matriculaId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamenGrado_materiaId_matriculaId_key" ON "ExamenGrado"("materiaId", "matriculaId");

-- AddForeignKey
ALTER TABLE "DatosPersonalesMatricula" ADD CONSTRAINT "DatosPersonalesMatricula_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatosFamiliaresMatricula" ADD CONSTRAINT "DatosFamiliaresMatricula_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatosAcademicosMatricula" ADD CONSTRAINT "DatosAcademicosMatricula_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamenGrado" ADD CONSTRAINT "ExamenGrado_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamenGrado" ADD CONSTRAINT "ExamenGrado_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
