-- CreateTable
CREATE TABLE "Supletorio" (
    "id" SERIAL NOT NULL,
    "valor" DOUBLE PRECISION,
    "materiaId" INTEGER NOT NULL,
    "matriculaId" INTEGER NOT NULL,

    CONSTRAINT "Supletorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supletorio_materiaId_matriculaId_key" ON "Supletorio"("materiaId", "matriculaId");

-- AddForeignKey
ALTER TABLE "Supletorio" ADD CONSTRAINT "Supletorio_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supletorio" ADD CONSTRAINT "Supletorio_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
