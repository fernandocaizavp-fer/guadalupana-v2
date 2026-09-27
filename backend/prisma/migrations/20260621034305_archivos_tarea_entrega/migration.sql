-- CreateTable
CREATE TABLE "ArchivoTarea" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "resourceType" VARCHAR(20),
    "nombreOriginal" VARCHAR(255) NOT NULL,
    "tipo" VARCHAR(120),
    "tamano" INTEGER,
    "tareaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoTarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaTarea" (
    "id" SERIAL NOT NULL,
    "comentario" VARCHAR(500),
    "tareaId" INTEGER NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntregaTarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoEntrega" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "resourceType" VARCHAR(20),
    "nombreOriginal" VARCHAR(255) NOT NULL,
    "tipo" VARCHAR(120),
    "tamano" INTEGER,
    "entregaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoEntrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntregaTarea_tareaId_matriculaId_key" ON "EntregaTarea"("tareaId", "matriculaId");

-- AddForeignKey
ALTER TABLE "ArchivoTarea" ADD CONSTRAINT "ArchivoTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaTarea" ADD CONSTRAINT "EntregaTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaTarea" ADD CONSTRAINT "EntregaTarea_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoEntrega" ADD CONSTRAINT "ArchivoEntrega_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "EntregaTarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
