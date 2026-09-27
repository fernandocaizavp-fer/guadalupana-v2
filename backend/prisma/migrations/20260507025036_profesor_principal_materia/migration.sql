/*
  Warnings:

  - You are about to drop the column `profesorPrincipalId` on the `Curso` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Curso" DROP CONSTRAINT "Curso_profesorPrincipalId_fkey";

-- AlterTable
ALTER TABLE "Curso" DROP COLUMN "profesorPrincipalId";

-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "profesorPrincipalId" INTEGER;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_profesorPrincipalId_fkey" FOREIGN KEY ("profesorPrincipalId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
