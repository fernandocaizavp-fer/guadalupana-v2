/*
  Warnings:

  - You are about to drop the `Nota` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Nota" DROP CONSTRAINT "Nota_materiaId_fkey";

-- DropForeignKey
ALTER TABLE "Nota" DROP CONSTRAINT "Nota_matriculaId_fkey";

-- DropTable
DROP TABLE "Nota";

-- CreateTable
CREATE TABLE "Tarea" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "semestre" INTEGER NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaTarea" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION,
    "observacion" TEXT,
    "tareaId" INTEGER NOT NULL,
    "matriculaId" INTEGER NOT NULL,

    CONSTRAINT "NotaTarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotaTarea_tareaId_matriculaId_key" ON "NotaTarea"("tareaId", "matriculaId");

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaTarea" ADD CONSTRAINT "NotaTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaTarea" ADD CONSTRAINT "NotaTarea_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
