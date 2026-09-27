-- Reutilización de números de matrícula tras archivar (activo=false):
-- la unicidad de (cursoId, matriculaNo) pasa a ser PARCIAL, aplicando SOLO a
-- las matrículas activas. Así, al archivar un estudiante su número queda libre
-- y puede reutilizarse; si no queda ninguno activo, el próximo vuelve a 001.
DROP INDEX "Matricula_cursoId_matriculaNo_key";

CREATE UNIQUE INDEX "Matricula_cursoId_matriculaNo_activo_key"
  ON "Matricula"("cursoId", "matriculaNo")
  WHERE "activo" = true;
