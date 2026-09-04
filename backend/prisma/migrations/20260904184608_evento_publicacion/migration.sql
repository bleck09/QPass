-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "publicadoEn" TIMESTAMP(3),
ADD COLUMN     "publicadoPorId" INTEGER;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_publicadoPorId_fkey" FOREIGN KEY ("publicadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: los eventos que ya existían antes de este cambio quedan publicados
-- (con la fecha en que se crearon) para no ocultar de golpe nada que ya estuviera
-- visible o vendiendo entradas. Solo los eventos NUEVOS nacen en borrador de acá
-- en adelante (el código nunca vuelve a tocar esta columna al crear un evento).
UPDATE "eventos" SET "publicadoEn" = "createdAt" WHERE "publicadoEn" IS NULL;
