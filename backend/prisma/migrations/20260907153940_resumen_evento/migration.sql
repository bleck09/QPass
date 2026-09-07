-- CreateTable
CREATE TABLE "resumenes_evento" (
    "eventoId" TEXT NOT NULL,
    "entradasVendidas" INTEGER NOT NULL,
    "asistentes" INTEGER NOT NULL,
    "recaudado" DECIMAL(10,2) NOT NULL,
    "recargado" DECIMAL(10,2) NOT NULL,
    "consumido" DECIMAL(10,2) NOT NULL,
    "devuelto" DECIMAL(10,2) NOT NULL,
    "saldoRemanente" DECIMAL(10,2) NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumenes_evento_pkey" PRIMARY KEY ("eventoId")
);

-- AddForeignKey
ALTER TABLE "resumenes_evento" ADD CONSTRAINT "resumenes_evento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
