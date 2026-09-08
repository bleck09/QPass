-- Jornadas del evento (DiaEvento). Una fiesta nocturna cruza medianoche y un
-- festival tiene varias noches: categoría de ticket, entrada, manilla y aforo
-- pasan a colgar de la jornada, no del evento entero.

-- CreateTable
CREATE TABLE "dias_evento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "orden" INTEGER NOT NULL,
    "aforoMaximo" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dias_evento_pkey" PRIMARY KEY ("id")
);

-- AlterTable — columnas nuevas (nullable primero, para el backfill)
ALTER TABLE "categorias_ticket" ADD COLUMN "diaEventoId" TEXT;
ALTER TABLE "entradas" ADD COLUMN "diaEventoId" TEXT;
ALTER TABLE "codigos_qr" ADD COLUMN "diaEventoId" TEXT;

-- Backfill: una jornada por evento existente (= el rango completo del evento).
INSERT INTO "dias_evento" ("id", "eventoId", "nombre", "inicio", "fin", "orden", "createdAt")
SELECT gen_random_uuid()::text, e."id", NULL, e."fecha", e."fechaFin", 1, CURRENT_TIMESTAMP
FROM "eventos" e;

-- Apuntar categorías / entradas / manillas a la jornada de su evento.
UPDATE "categorias_ticket" ct SET "diaEventoId" = d."id"
FROM "dias_evento" d WHERE d."eventoId" = ct."eventoId";

UPDATE "entradas" en SET "diaEventoId" = d."id"
FROM "dias_evento" d WHERE d."eventoId" = en."eventoId";

UPDATE "codigos_qr" q SET "diaEventoId" = d."id"
FROM "dias_evento" d WHERE d."eventoId" = q."eventoId";

-- Toda categoría pertenece a una jornada.
ALTER TABLE "categorias_ticket" ALTER COLUMN "diaEventoId" SET NOT NULL;

-- El aforo ahora vive en la jornada (DiaEvento.aforoMaximo).
ALTER TABLE "eventos" DROP COLUMN "aforoMaximo";

-- CreateIndex
CREATE INDEX "dias_evento_eventoId_orden_idx" ON "dias_evento"("eventoId", "orden");
CREATE INDEX "categorias_ticket_diaEventoId_idx" ON "categorias_ticket"("diaEventoId");
CREATE INDEX "codigos_qr_eventoId_diaEventoId_idx" ON "codigos_qr"("eventoId", "diaEventoId");
CREATE INDEX "entradas_diaEventoId_estadoIngreso_idx" ON "entradas"("diaEventoId", "estadoIngreso");

-- AddForeignKey
ALTER TABLE "dias_evento" ADD CONSTRAINT "dias_evento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categorias_ticket" ADD CONSTRAINT "categorias_ticket_diaEventoId_fkey" FOREIGN KEY ("diaEventoId") REFERENCES "dias_evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_diaEventoId_fkey" FOREIGN KEY ("diaEventoId") REFERENCES "dias_evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "codigos_qr" ADD CONSTRAINT "codigos_qr_diaEventoId_fkey" FOREIGN KEY ("diaEventoId") REFERENCES "dias_evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
