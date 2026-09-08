-- Billetera cashless POR EVENTO. Reemplaza el Usuario.saldo global: el saldo que
-- se recarga en un evento solo sirve en ese evento.

-- CreateTable
CREATE TABLE "billeteras_evento" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "eventoId" TEXT NOT NULL,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expiraEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billeteras_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billeteras_evento_eventoId_idx" ON "billeteras_evento"("eventoId");
CREATE UNIQUE INDEX "billeteras_evento_usuarioId_eventoId_key" ON "billeteras_evento"("usuarioId", "eventoId");

-- AddForeignKey
ALTER TABLE "billeteras_evento" ADD CONSTRAINT "billeteras_evento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billeteras_evento" ADD CONSTRAINT "billeteras_evento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: reconstruye el saldo por (usuario, evento) reproduciendo el ledger.
INSERT INTO "billeteras_evento" ("id", "usuarioId", "eventoId", "saldo", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."usuarioId", t."eventoId",
       SUM(CASE t."tipo"
             WHEN 'recarga'         THEN t."monto"
             WHEN 'venta'           THEN t."monto"
             WHEN 'ajuste'          THEN t."monto"
             WHEN 'reverso_consumo' THEN t."monto"
             WHEN 'consumo'         THEN -t."monto"
             WHEN 'devolucion'      THEN -t."monto"
             WHEN 'reverso_venta'   THEN -t."monto"
             ELSE 0 END),
       now(), now()
FROM "transacciones" t
GROUP BY t."usuarioId", t."eventoId";

-- El saldo global deja de existir.
ALTER TABLE "usuarios" DROP COLUMN "saldo";
