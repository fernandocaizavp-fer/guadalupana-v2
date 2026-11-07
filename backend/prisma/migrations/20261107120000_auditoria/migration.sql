-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER,
    "rol" VARCHAR(20),
    "ip" VARCHAR(64),
    "accion" VARCHAR(20) NOT NULL,
    "entidad" VARCHAR(50) NOT NULL,
    "entidadId" VARCHAR(100),
    "antes" JSONB,
    "despues" JSONB,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "Auditoria"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_entidadId_idx" ON "Auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

