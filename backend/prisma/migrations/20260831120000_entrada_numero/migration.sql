-- Entrada.numero: correlativo por evento, visible para el asistente ("entrada N.º 42").
-- Se asigna al aprobarse la Compra (ver ComprasService.aprobar).

-- AlterTable
ALTER TABLE "entradas" ADD COLUMN "numero" INTEGER;

-- Backfill: numera las entradas ya existentes por evento, en orden de creación.
WITH numeradas AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (PARTITION BY "eventoId" ORDER BY "createdAt", "id") AS rn
    FROM "entradas"
)
UPDATE "entradas" e
SET "numero" = n.rn
FROM numeradas n
WHERE e."id" = n."id";

-- CreateIndex
CREATE UNIQUE INDEX "entradas_eventoId_numero_key" ON "entradas"("eventoId", "numero");

-- CreateIndex
CREATE INDEX "entradas_usuarioId_idx" ON "entradas"("usuarioId");
