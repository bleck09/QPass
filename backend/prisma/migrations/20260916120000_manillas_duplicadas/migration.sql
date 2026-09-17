-- ============================================================================
-- Manillas duplicadas: estado de la manilla (CodigoQr.estado), verificación del
-- dueño real (RegistroIngreso tipo=verificacion_duplicado), CasoDuplicado,
-- AlertaManilla y el tipo de transacción ajuste_manual. Ver schema.prisma.
-- ============================================================================

-- CreateEnum
CREATE TYPE "EstadoManilla" AS ENUM ('activa', 'transferida', 'en_alerta', 'recuperada', 'cerrada');

-- CreateEnum
CREATE TYPE "ContextoAlertaManilla" AS ENUM ('control_acceso', 'entrega', 'recarga', 'venta', 'devolucion');

-- AlterEnum
ALTER TYPE "TipoRegistroIngreso" ADD VALUE 'verificacion_duplicado';

-- AlterEnum
ALTER TYPE "TipoTransaccion" ADD VALUE 'ajuste_manual';

-- AlterTable
ALTER TABLE "registros_ingreso" ADD COLUMN     "cuentaVerificada" BOOLEAN,
ADD COLUMN     "mostroCarnet" BOOLEAN,
ADD COLUMN     "ultimosDigitosCi" TEXT;

-- AlterTable
ALTER TABLE "codigos_qr" ADD COLUMN     "estado" "EstadoManilla" NOT NULL DEFAULT 'activa';

-- CreateTable
CREATE TABLE "casos_duplicado" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "entradaId" TEXT NOT NULL,
    "codigoCopiaId" TEXT NOT NULL,
    "codigoNuevoId" TEXT NOT NULL,
    "registroVerificacionId" TEXT NOT NULL,
    "fotoSospechoso" TEXT,
    "estado" "EstadoCaso" NOT NULL DEFAULT 'pendiente',
    "abiertoPorId" INTEGER NOT NULL,
    "recuperadoEn" TIMESTAMP(3),
    "recuperadoPorId" INTEGER,
    "sancion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casos_duplicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_manilla" (
    "id" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "codigoQrId" TEXT NOT NULL,
    "contexto" "ContextoAlertaManilla" NOT NULL,
    "operadorId" INTEGER NOT NULL,
    "puestoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_manilla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "casos_duplicado_registroVerificacionId_key" ON "casos_duplicado"("registroVerificacionId");

-- CreateIndex
CREATE INDEX "casos_duplicado_eventoId_estado_idx" ON "casos_duplicado"("eventoId", "estado");

-- CreateIndex
CREATE INDEX "casos_duplicado_entradaId_idx" ON "casos_duplicado"("entradaId");

-- CreateIndex
CREATE INDEX "casos_duplicado_codigoCopiaId_idx" ON "casos_duplicado"("codigoCopiaId");

-- CreateIndex
CREATE INDEX "alertas_manilla_casoId_createdAt_idx" ON "alertas_manilla"("casoId", "createdAt");

-- CreateIndex
CREATE INDEX "alertas_manilla_createdAt_idx" ON "alertas_manilla"("createdAt");

-- CreateIndex
CREATE INDEX "codigos_qr_eventoId_estado_idx" ON "codigos_qr"("eventoId", "estado");

-- AddForeignKey
ALTER TABLE "casos_duplicado" ADD CONSTRAINT "casos_duplicado_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_duplicado" ADD CONSTRAINT "casos_duplicado_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_duplicado" ADD CONSTRAINT "casos_duplicado_codigoCopiaId_fkey" FOREIGN KEY ("codigoCopiaId") REFERENCES "codigos_qr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_duplicado" ADD CONSTRAINT "casos_duplicado_codigoNuevoId_fkey" FOREIGN KEY ("codigoNuevoId") REFERENCES "codigos_qr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_duplicado" ADD CONSTRAINT "casos_duplicado_registroVerificacionId_fkey" FOREIGN KEY ("registroVerificacionId") REFERENCES "registros_ingreso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_duplicado" ADD CONSTRAINT "casos_duplicado_abiertoPorId_fkey" FOREIGN KEY ("abiertoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_duplicado" ADD CONSTRAINT "casos_duplicado_recuperadoPorId_fkey" FOREIGN KEY ("recuperadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_manilla" ADD CONSTRAINT "alertas_manilla_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "casos_duplicado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_manilla" ADD CONSTRAINT "alertas_manilla_codigoQrId_fkey" FOREIGN KEY ("codigoQrId") REFERENCES "codigos_qr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_manilla" ADD CONSTRAINT "alertas_manilla_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_manilla" ADD CONSTRAINT "alertas_manilla_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- Relleno de manillas existentes:
--   - las anuladas hasta hoy fueron reemplazos (perdida/dañada) -> transferida;
--   - las vigentes de eventos ya finalizados -> cerrada.
-- ============================================================================
UPDATE "codigos_qr" SET "estado" = 'transferida' WHERE "anulado" = true;

UPDATE "codigos_qr" c SET "estado" = 'cerrada'
FROM "eventos" e
WHERE c."eventoId" = e."id" AND e."estado" = 'finalizado' AND c."anulado" = false;
