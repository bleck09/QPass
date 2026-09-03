-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "archivadoEn" TIMESTAMP(3),
ADD COLUMN     "archivadoPorId" INTEGER;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_archivadoPorId_fkey" FOREIGN KEY ("archivadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
