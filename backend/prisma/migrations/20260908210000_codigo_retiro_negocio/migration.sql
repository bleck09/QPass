-- Código de retiro por (evento, negocio): el Usuario Negocio lo presenta en
-- Devoluciones para retirar sus ganancias del evento.

-- CreateTable
CREATE TABLE "codigos_retiro_negocio" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "negocioId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_retiro_negocio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "codigos_retiro_negocio_codigo_key" ON "codigos_retiro_negocio"("codigo");
CREATE INDEX "codigos_retiro_negocio_negocioId_idx" ON "codigos_retiro_negocio"("negocioId");
CREATE UNIQUE INDEX "codigos_retiro_negocio_eventoId_negocioId_key" ON "codigos_retiro_negocio"("eventoId", "negocioId");

-- AddForeignKey
ALTER TABLE "codigos_retiro_negocio" ADD CONSTRAINT "codigos_retiro_negocio_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "codigos_retiro_negocio" ADD CONSTRAINT "codigos_retiro_negocio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foto de la cara de quien cobra (obligatoria en el retiro de un negocio, por si
-- le roban el QR).
ALTER TABLE "transacciones" ADD COLUMN "fotoRostroUrl" TEXT;

-- Backfill: un código por cada negocio ya asignado a un evento.
INSERT INTO "codigos_retiro_negocio" ("id", "eventoId", "negocioId", "codigo", "createdAt")
SELECT gen_random_uuid()::text, a."eventoId", a."usuarioId",
       'NG-' || upper(substr(md5(random()::text || a."id"), 1, 12)),
       now()
FROM "asignaciones_eventos" a
WHERE a."rol" = 'UsuarioNegocio';
