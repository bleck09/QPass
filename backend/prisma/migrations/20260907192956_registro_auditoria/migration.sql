-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registros_auditoria_entidad_entidadId_idx" ON "registros_auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "registros_auditoria_actorId_idx" ON "registros_auditoria"("actorId");

-- CreateIndex
CREATE INDEX "registros_auditoria_createdAt_idx" ON "registros_auditoria"("createdAt");

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
