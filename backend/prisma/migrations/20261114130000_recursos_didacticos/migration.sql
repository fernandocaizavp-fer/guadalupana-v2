-- CreateTable
CREATE TABLE "RecursoDidactico" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "tipo" VARCHAR(50) NOT NULL,
    "urlRecurso" TEXT NOT NULL,
    "archivoNombre" VARCHAR(255),
    "cursoId" INTEGER,
    "materiaId" INTEGER,
    "autorId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecursoDidactico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecursoDidactico_materiaId_idx" ON "RecursoDidactico"("materiaId");

-- CreateIndex
CREATE INDEX "RecursoDidactico_cursoId_idx" ON "RecursoDidactico"("cursoId");

-- CreateIndex
CREATE INDEX "RecursoDidactico_tipo_idx" ON "RecursoDidactico"("tipo");

-- CreateIndex
CREATE INDEX "RecursoDidactico_autorId_idx" ON "RecursoDidactico"("autorId");

-- AddForeignKey
ALTER TABLE "RecursoDidactico" ADD CONSTRAINT "RecursoDidactico_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoDidactico" ADD CONSTRAINT "RecursoDidactico_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoDidactico" ADD CONSTRAINT "RecursoDidactico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
