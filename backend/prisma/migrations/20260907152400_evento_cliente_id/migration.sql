-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "clienteId" INTEGER;

-- CreateIndex
CREATE INDEX "categorias_ticket_eventoId_idx" ON "categorias_ticket"("eventoId");

-- CreateIndex
CREATE INDEX "codigos_qr_eventoId_anulado_idx" ON "codigos_qr"("eventoId", "anulado");

-- CreateIndex
CREATE INDEX "compras_compradorId_idx" ON "compras"("compradorId");

-- CreateIndex
CREATE INDEX "eventos_clienteId_idx" ON "eventos"("clienteId");

-- CreateIndex
CREATE INDEX "productos_puestoId_idx" ON "productos"("puestoId");

-- CreateIndex
CREATE INDEX "puestos_eventoId_idx" ON "puestos"("eventoId");

-- CreateIndex
CREATE INDEX "puestos_negocioId_eventoId_idx" ON "puestos"("negocioId", "eventoId");

-- CreateIndex
CREATE INDEX "venta_items_ventaId_idx" ON "venta_items"("ventaId");

-- CreateIndex
CREATE INDEX "venta_items_productoId_idx" ON "venta_items"("productoId");

-- CreateIndex
CREATE INDEX "ventas_puestoId_createdAt_idx" ON "ventas"("puestoId", "createdAt");

-- CreateIndex
CREATE INDEX "ventas_ayudanteId_createdAt_idx" ON "ventas"("ayudanteId", "createdAt");

-- CreateIndex
CREATE INDEX "ventas_entradaId_idx" ON "ventas"("entradaId");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: eventos nacidos de una SolicitudEvento aprobada
UPDATE "eventos" e
SET "clienteId" = s."clienteId"
FROM "solicitudes_evento" s
WHERE s."eventoId" = e."id" AND e."clienteId" IS NULL;

-- Respaldo: eventos con una Asignacion rol=Cliente pero sin solicitud vinculada
UPDATE "eventos" e
SET "clienteId" = a."usuarioId"
FROM "asignaciones_eventos" a
WHERE a."eventoId" = e."id" AND a."rol" = 'Cliente' AND e."clienteId" IS NULL;
