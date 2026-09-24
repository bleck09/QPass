-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('manual', 'libelula');

-- AlterTable
ALTER TABLE "compras" ADD COLUMN     "libelulaCodigoRecaudacion" TEXT,
ADD COLUMN     "libelulaConfirmadoEn" TIMESTAMP(3),
ADD COLUMN     "libelulaFormaPago" TEXT,
ADD COLUMN     "libelulaIdTransaccion" TEXT,
ADD COLUMN     "libelulaUrlPago" TEXT,
ADD COLUMN     "metodoPago" "MetodoPago" NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX "compras_libelulaIdTransaccion_idx" ON "compras"("libelulaIdTransaccion");
