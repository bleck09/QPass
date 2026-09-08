-- §5.11 — motivo de devolución tipado (antes era texto libre en `nota`)
CREATE TYPE "MotivoDevolucion" AS ENUM ('retiro_efectivo', 'saldo_no_usado', 'error_recarga', 'otro');

-- §5.4 — Producto: estado + inventario + categoría
ALTER TABLE "productos"
  ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "stock" INTEGER,
  ADD COLUMN "categoria" TEXT;

-- §5.5 / §5.11 — aforo del recinto + coordenadas numéricas
ALTER TABLE "eventos"
  ADD COLUMN "latitud" DOUBLE PRECISION,
  ADD COLUMN "longitud" DOUBLE PRECISION,
  ADD COLUMN "aforoMaximo" INTEGER;

-- §5.11 — asistentes estimados que declara el cliente en la solicitud
ALTER TABLE "solicitudes_evento"
  ADD COLUMN "aforoEstimado" INTEGER;

-- §5.11 — motivo de la devolución (solo se llena en filas tipo=devolucion)
ALTER TABLE "transacciones"
  ADD COLUMN "motivoDevolucion" "MotivoDevolucion";

-- CreateIndex
CREATE INDEX "productos_puestoId_activo_idx" ON "productos"("puestoId", "activo");

-- Backfill: parsea el texto "lat, lng" que ya venía del MapaSelector a columnas numéricas.
UPDATE "eventos"
SET "latitud"  = NULLIF(trim(split_part("coordenadas", ',', 1)), '')::double precision,
    "longitud" = NULLIF(trim(split_part("coordenadas", ',', 2)), '')::double precision
WHERE "coordenadas" ~ '^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$';
