-- CreateEnum
CREATE TYPE "EstadoCorteCaja" AS ENUM ('abierta', 'cerrada');

-- CreateTable
CREATE TABLE "cortes_caja" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "operadorId" INTEGER NOT NULL,
    "rol" "Rol" NOT NULL,
    "estado" "EstadoCorteCaja" NOT NULL DEFAULT 'abierta',
    "montoInicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "montoSistema" DECIMAL(10,2),
    "montoEsperado" DECIMAL(10,2),
    "montoDeclarado" DECIMAL(10,2),
    "diferencia" DECIMAL(10,2),
    "observacion" TEXT,
    "cerradaPorId" INTEGER,

    CONSTRAINT "cortes_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cortes_caja_eventoId_rol_idx" ON "cortes_caja"("eventoId", "rol");

-- CreateIndex
CREATE INDEX "cortes_caja_operadorId_abiertaEn_idx" ON "cortes_caja"("operadorId", "abiertaEn");

-- AddForeignKey
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_cerradaPorId_fkey" FOREIGN KEY ("cerradaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Una sola caja abierta por (operador, evento).
CREATE UNIQUE INDEX "cortes_caja_abierta_unica" ON "cortes_caja" ("operadorId", "eventoId") WHERE "estado" = 'abierta';
