-- CreateIndex
CREATE INDEX "asignaciones_eventos_usuarioId_idx" ON "asignaciones_eventos"("usuarioId");

-- CreateIndex
CREATE INDEX "entradas_compraId_idx" ON "entradas"("compraId");

-- CreateIndex
CREATE INDEX "entradas_categoriaTicketId_idx" ON "entradas"("categoriaTicketId");

-- CreateIndex
CREATE INDEX "incidencias_recarga_entradaId_idx" ON "incidencias_recarga"("entradaId");

-- CreateIndex
CREATE INDEX "productos_estado_productoBaseId_idx" ON "productos_estado"("productoBaseId");

-- CreateIndex
CREATE INDEX "puesto_ayudantes_ayudanteId_idx" ON "puesto_ayudantes"("ayudanteId");

-- CreateIndex
CREATE INDEX "reportes_entrada_entradaId_idx" ON "reportes_entrada"("entradaId");

-- CreateIndex
CREATE INDEX "transacciones_usuarioId_eventoId_createdAt_idx" ON "transacciones"("usuarioId", "eventoId", "createdAt");

-- CreateIndex
CREATE INDEX "transacciones_ventaId_idx" ON "transacciones"("ventaId");

-- CreateIndex
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");

-- CreateIndex
CREATE INDEX "usuarios_negocioAsignadoId_idx" ON "usuarios"("negocioAsignadoId");
