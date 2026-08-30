-- Anexo C — infraestructura de la migración a NestJS.

-- CreateTable: idempotencia de operaciones sensibles (C10)
CREATE TABLE "solicitudes_idempotentes" (
    "clave" TEXT NOT NULL,
    "respuesta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_idempotentes_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE INDEX "solicitudes_idempotentes_createdAt_idx" ON "solicitudes_idempotentes"("createdAt");

-- CreateIndex: refuerza en la BD la regla "un solo CodigoQr activo por Entrada" (C4).
-- Prisma no expresa índices parciales en el schema, por eso va en SQL manual.
CREATE UNIQUE INDEX "codigos_qr_entrada_activo_unico" ON "codigos_qr" ("entradaId") WHERE "anulado" = false;
