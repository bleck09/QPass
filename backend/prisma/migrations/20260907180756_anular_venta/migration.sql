-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoTransaccion" ADD VALUE 'reverso_consumo';
ALTER TYPE "TipoTransaccion" ADD VALUE 'reverso_venta';

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "anuladaEn" TIMESTAMP(3),
ADD COLUMN     "anuladaPorId" INTEGER,
ADD COLUMN     "motivoAnulacion" TEXT;

-- CreateIndex
CREATE INDEX "ventas_anuladaEn_idx" ON "ventas"("anuladaEn");

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
