/*
  Warnings:

  - Made the column `diaEventoId` on table `entradas` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "entradas" DROP CONSTRAINT "entradas_diaEventoId_fkey";

-- AlterTable
ALTER TABLE "entradas" ALTER COLUMN "diaEventoId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "avisos_stock_puestoId_idx" ON "avisos_stock"("puestoId");

-- CreateIndex
CREATE INDEX "avisos_stock_productoBaseId_idx" ON "avisos_stock"("productoBaseId");

-- CreateIndex
CREATE INDEX "avisos_stock_ayudanteId_idx" ON "avisos_stock"("ayudanteId");

-- CreateIndex
CREATE INDEX "reportes_entrada_compraId_idx" ON "reportes_entrada"("compraId");

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_diaEventoId_fkey" FOREIGN KEY ("diaEventoId") REFERENCES "dias_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_entrada" ADD CONSTRAINT "reportes_entrada_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos_stock" ADD CONSTRAINT "avisos_stock_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos_stock" ADD CONSTRAINT "avisos_stock_productoBaseId_fkey" FOREIGN KEY ("productoBaseId") REFERENCES "productos_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos_stock" ADD CONSTRAINT "avisos_stock_ayudanteId_fkey" FOREIGN KEY ("ayudanteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos_stock" ADD CONSTRAINT "avisos_stock_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
