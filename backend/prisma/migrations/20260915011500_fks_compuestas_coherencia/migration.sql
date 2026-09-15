-- DropForeignKey
ALTER TABLE "categorias_ticket" DROP CONSTRAINT "categorias_ticket_diaEventoId_fkey";

-- DropForeignKey
ALTER TABLE "entradas" DROP CONSTRAINT "entradas_diaEventoId_fkey";

-- DropForeignKey
ALTER TABLE "puestos" DROP CONSTRAINT "puestos_puestoBaseId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "dias_evento_id_eventoId_key" ON "dias_evento"("id", "eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "puestos_base_id_negocioId_key" ON "puestos_base"("id", "negocioId");

-- AddForeignKey
ALTER TABLE "categorias_ticket" ADD CONSTRAINT "categorias_ticket_diaEventoId_eventoId_fkey" FOREIGN KEY ("diaEventoId", "eventoId") REFERENCES "dias_evento"("id", "eventoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_diaEventoId_eventoId_fkey" FOREIGN KEY ("diaEventoId", "eventoId") REFERENCES "dias_evento"("id", "eventoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puestos" ADD CONSTRAINT "puestos_puestoBaseId_negocioId_fkey" FOREIGN KEY ("puestoBaseId", "negocioId") REFERENCES "puestos_base"("id", "negocioId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Nota: estas FK compuestas son PREVENTIVAS. Se audito la BD antes de crearlas y no habia
-- ninguna fila incoherente (0 puestos con base de otro negocio, 0 categorias/entradas con
-- jornada de otro evento), asi que no hace falta backfill: se crean y validan al instante.
