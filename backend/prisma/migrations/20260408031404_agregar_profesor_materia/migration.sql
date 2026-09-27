-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "profesorId" INTEGER;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
