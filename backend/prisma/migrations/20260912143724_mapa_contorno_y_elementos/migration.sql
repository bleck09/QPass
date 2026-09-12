-- CreateEnum
CREATE TYPE "TipoElementoMapa" AS ENUM ('entrada', 'banos', 'escenario', 'recargador', 'supervisor', 'otro');

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "contornoMapa" JSONB;

-- CreateTable
CREATE TABLE "elementos_mapa" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "tipo" "TipoElementoMapa" NOT NULL,
    "nombre" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ancho" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "alto" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "elementos_mapa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "elementos_mapa_eventoId_idx" ON "elementos_mapa"("eventoId");

-- AddForeignKey
ALTER TABLE "elementos_mapa" ADD CONSTRAINT "elementos_mapa_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
