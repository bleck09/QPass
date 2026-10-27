-- AlterTable
ALTER TABLE "productos_estado" ADD COLUMN     "esCortesia" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "puestos" ADD COLUMN     "cortesiasPorPersona" INTEGER;

-- CreateTable
CREATE TABLE "cortesias_entregadas" (
    "id" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "entradaId" TEXT NOT NULL,
    "productoBaseId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cortesias_entregadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cortesias_entregadas_entradaId_idx" ON "cortesias_entregadas"("entradaId");

-- CreateIndex
CREATE INDEX "cortesias_entregadas_productoBaseId_idx" ON "cortesias_entregadas"("productoBaseId");

-- CreateIndex
CREATE INDEX "cortesias_entregadas_ventaId_idx" ON "cortesias_entregadas"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "cortesias_entregadas_puestoId_entradaId_productoBaseId_key" ON "cortesias_entregadas"("puestoId", "entradaId", "productoBaseId");

-- AddForeignKey
ALTER TABLE "cortesias_entregadas" ADD CONSTRAINT "cortesias_entregadas_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortesias_entregadas" ADD CONSTRAINT "cortesias_entregadas_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortesias_entregadas" ADD CONSTRAINT "cortesias_entregadas_productoBaseId_fkey" FOREIGN KEY ("productoBaseId") REFERENCES "productos_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortesias_entregadas" ADD CONSTRAINT "cortesias_entregadas_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

