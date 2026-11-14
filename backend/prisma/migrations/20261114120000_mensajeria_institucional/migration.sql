-- CreateTable
CREATE TABLE "MensajeInterno" (
    "id" SERIAL NOT NULL,
    "remitenteId" INTEGER NOT NULL,
    "destinatarioId" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fechaLectura" TIMESTAMP(3),
    "materiaId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeInterno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensajeInterno_remitenteId_destinatarioId_idx" ON "MensajeInterno"("remitenteId", "destinatarioId");

-- CreateIndex
CREATE INDEX "MensajeInterno_destinatarioId_leido_idx" ON "MensajeInterno"("destinatarioId", "leido");

-- CreateIndex
CREATE INDEX "MensajeInterno_creadoEn_idx" ON "MensajeInterno"("creadoEn");

-- AddForeignKey
ALTER TABLE "MensajeInterno" ADD CONSTRAINT "MensajeInterno_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeInterno" ADD CONSTRAINT "MensajeInterno_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeInterno" ADD CONSTRAINT "MensajeInterno_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
