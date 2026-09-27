/*
  Warnings:

  - A unique constraint covering the columns `[cedula]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Curso" ADD COLUMN     "profesorPrincipalId" INTEGER;

-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "esSubmateria" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "materiaParent" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "cedula" TEXT;

-- CreateTable
CREATE TABLE "NotaDisciplina" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaDisciplina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotaDisciplina_matriculaId_materiaId_key" ON "NotaDisciplina"("matriculaId", "materiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cedula_key" ON "Usuario"("cedula");

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_profesorPrincipalId_fkey" FOREIGN KEY ("profesorPrincipalId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaDisciplina" ADD CONSTRAINT "NotaDisciplina_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaDisciplina" ADD CONSTRAINT "NotaDisciplina_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
