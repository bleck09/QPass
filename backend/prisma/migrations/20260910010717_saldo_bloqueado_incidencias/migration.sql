-- AlterTable
ALTER TABLE "billeteras_evento" ADD COLUMN     "saldoBloqueado" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "incidencias_recarga" ADD COLUMN     "montoBloqueado" DECIMAL(10,2) NOT NULL DEFAULT 0;
