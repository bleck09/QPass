-- §5.2 — cada recarga/devolución de efectivo se estampa con su caja abierta.
-- El arqueo cuadra sumando por corteCajaId, no por ventana de tiempo.

-- AlterTable
ALTER TABLE "transacciones" ADD COLUMN "corteCajaId" TEXT;

-- CreateIndex
CREATE INDEX "transacciones_corteCajaId_idx" ON "transacciones"("corteCajaId");

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_corteCajaId_fkey" FOREIGN KEY ("corteCajaId") REFERENCES "cortes_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: estampar las transacciones que caen dentro de una caja ABIERTA
-- (las cerradas ya tienen su montoSistema guardado).
UPDATE "transacciones" t
SET "corteCajaId" = c."id"
FROM "cortes_caja" c
WHERE c."estado" = 'abierta'
  AND t."operadorId" = c."operadorId"
  AND t."eventoId"   = c."eventoId"
  AND t."createdAt"  >= c."abiertaEn"
  AND t."tipo"::text = (CASE WHEN c."rol"::text = 'Devolucion' THEN 'devolucion' ELSE 'recarga' END)
  AND t."corteCajaId" IS NULL;
