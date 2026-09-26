-- AlterEnum
ALTER TYPE "EstadoSolicitudEvento" ADD VALUE 'cambios_solicitados';

-- AlterTable
ALTER TABLE "solicitudes_evento" ADD COLUMN     "cambiosPedidosEn" TIMESTAMP(3),
ADD COLUMN     "comentarioCambios" TEXT,
ADD COLUMN     "reenviadaEn" TIMESTAMP(3);
