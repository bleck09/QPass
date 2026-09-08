-- Caducidad del saldo por evento + aceptación de términos en la compra.

-- AlterTable
ALTER TABLE "compras"
  ADD COLUMN "terminosAceptadosEn" TIMESTAMP(3),
  ADD COLUMN "versionTerminos" TEXT;

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN "diasParaRetiro" INTEGER NOT NULL DEFAULT 30;

-- Backfill: billeteras de eventos que YA terminaron -> fijar el plazo de retiro.
UPDATE "billeteras_evento" b
SET "expiraEn" = e."fechaFin" + (e."diasParaRetiro" || ' days')::interval
FROM "eventos" e
WHERE b."eventoId" = e."id" AND e."fechaFin" < now();
