-- CreateEnum
CREATE TYPE "MateriaGlobal" AS ENUM ('TEORIA', 'PRACTICA', 'ADMINISTRACION', 'CONTABILIDAD', 'TICS', 'INGLES', 'DESARROLLO', 'PROYECTOS', 'LEGISLACION', 'DISCIPLINA');

-- CreateTable
CREATE TABLE "RegistroNotaGlobal" (
    "id" SERIAL NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "materia" "MateriaGlobal" NOT NULL,
    "semestre" INTEGER NOT NULL,
    "nota" DOUBLE PRECISION NOT NULL,
    "registradoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroNotaGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroExamenGlobal" (
    "id" SERIAL NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "materia" "MateriaGlobal" NOT NULL,
    "nota" DOUBLE PRECISION NOT NULL,
    "registradoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroExamenGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAsistenciaGlobal" (
    "id" SERIAL NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "registradoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroAsistenciaGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistroNotaGlobal_matriculaId_materia_semestre_key" ON "RegistroNotaGlobal"("matriculaId", "materia", "semestre");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroExamenGlobal_matriculaId_materia_key" ON "RegistroExamenGlobal"("matriculaId", "materia");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroAsistenciaGlobal_matriculaId_key" ON "RegistroAsistenciaGlobal"("matriculaId");

-- AddForeignKey
ALTER TABLE "RegistroNotaGlobal" ADD CONSTRAINT "RegistroNotaGlobal_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroExamenGlobal" ADD CONSTRAINT "RegistroExamenGlobal_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAsistenciaGlobal" ADD CONSTRAINT "RegistroAsistenciaGlobal_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

