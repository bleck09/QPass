-- Catálogo base del negocio: puestos/catálogo definidos una vez y reutilizados
-- entre eventos. Migración DESTRUCTIVA (dev): se descartan los puestos, productos
-- y ventas actuales — el modelo cambió de raíz y no hay backfill posible.

-- 1) Soltar las ventas del ledger (contexto/trazabilidad, no dueño de saldo).
UPDATE "transacciones" SET "ventaId" = NULL;

-- 2) Borrar el mundo viejo de puestos/productos/ventas.
DELETE FROM "venta_items";
DELETE FROM "ventas";
DELETE FROM "puesto_ayudantes";
DELETE FROM "productos";
DELETE FROM "puestos";

-- ============================================================================
-- 3) Esquema nuevo (generado con `prisma migrate diff`).
-- ============================================================================

-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "productos_puestoId_fkey";

-- DropForeignKey
ALTER TABLE "venta_items" DROP CONSTRAINT "venta_items_productoId_fkey";

-- DropForeignKey
ALTER TABLE "ventas" DROP CONSTRAINT "ventas_puestoId_fkey";

-- DropIndex
DROP INDEX "venta_items_productoId_idx";

-- AlterTable
ALTER TABLE "puestos" DROP COLUMN "categoria",
DROP COLUMN "descripcion",
DROP COLUMN "logo",
DROP COLUMN "nombre",
ADD COLUMN     "puestoBaseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "venta_items" DROP COLUMN "productoId",
ADD COLUMN     "productoBaseId" TEXT NOT NULL;

-- DropTable
DROP TABLE "productos";

-- CreateTable
CREATE TABLE "puestos_base" (
    "id" TEXT NOT NULL,
    "negocioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "logo" TEXT,
    "categoria" TEXT,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puestos_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_base" (
    "id" TEXT NOT NULL,
    "puestoBaseId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "imagen" TEXT,
    "categoria" TEXT,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_estado" (
    "id" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "productoBaseId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "precio" DECIMAL(10,2),

    CONSTRAINT "productos_estado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puestos_base_negocioId_idx" ON "puestos_base"("negocioId");

-- CreateIndex
CREATE INDEX "productos_base_puestoBaseId_idx" ON "productos_base"("puestoBaseId");

-- CreateIndex
CREATE INDEX "productos_estado_puestoId_idx" ON "productos_estado"("puestoId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_estado_puestoId_productoBaseId_key" ON "productos_estado"("puestoId", "productoBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "puestos_eventoId_puestoBaseId_key" ON "puestos"("eventoId", "puestoBaseId");

-- CreateIndex
CREATE INDEX "venta_items_productoBaseId_idx" ON "venta_items"("productoBaseId");

-- AddForeignKey
ALTER TABLE "puestos_base" ADD CONSTRAINT "puestos_base_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_base" ADD CONSTRAINT "productos_base_puestoBaseId_fkey" FOREIGN KEY ("puestoBaseId") REFERENCES "puestos_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_estado" ADD CONSTRAINT "productos_estado_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_estado" ADD CONSTRAINT "productos_estado_productoBaseId_fkey" FOREIGN KEY ("productoBaseId") REFERENCES "productos_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puestos" ADD CONSTRAINT "puestos_puestoBaseId_fkey" FOREIGN KEY ("puestoBaseId") REFERENCES "puestos_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_productoBaseId_fkey" FOREIGN KEY ("productoBaseId") REFERENCES "productos_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
