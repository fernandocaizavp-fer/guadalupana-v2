-- CreateTable
CREATE TABLE "Asistencia" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaDetalle" (
    "id" SERIAL NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "asistenciaId" INTEGER NOT NULL,
    "matriculaId" INTEGER NOT NULL,

    CONSTRAINT "AsistenciaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservacionAsistencia" (
    "id" SERIAL NOT NULL,
    "observacion" TEXT NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,

    CONSTRAINT "ObservacionAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsistenciaDetalle_asistenciaId_matriculaId_key" ON "AsistenciaDetalle"("asistenciaId", "matriculaId");

-- CreateIndex
CREATE UNIQUE INDEX "ObservacionAsistencia_matriculaId_key" ON "ObservacionAsistencia"("matriculaId");

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaDetalle" ADD CONSTRAINT "AsistenciaDetalle_asistenciaId_fkey" FOREIGN KEY ("asistenciaId") REFERENCES "Asistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaDetalle" ADD CONSTRAINT "AsistenciaDetalle_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionAsistencia" ADD CONSTRAINT "ObservacionAsistencia_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionAsistencia" ADD CONSTRAINT "ObservacionAsistencia_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
