/*
  Warnings:

  - You are about to drop the column `estudianteId` on the `Nota` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[materiaId,matriculaId]` on the table `Nota` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `matriculaId` to the `Nota` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Nota" DROP CONSTRAINT "Nota_estudianteId_fkey";

-- DropIndex
DROP INDEX "Nota_materiaId_estudianteId_key";

-- AlterTable
ALTER TABLE "Nota" DROP COLUMN "estudianteId",
ADD COLUMN     "matriculaId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Nota_materiaId_matriculaId_key" ON "Nota"("materiaId", "matriculaId");

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
