-- DropIndex
DROP INDEX "Matricula_matriculaNo_key";

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_cursoId_matriculaNo_key" ON "Matricula"("cursoId", "matriculaNo");
