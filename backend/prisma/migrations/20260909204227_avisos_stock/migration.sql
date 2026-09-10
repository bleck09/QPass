-- CreateTable
CREATE TABLE "avisos_stock" (
    "id" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "productoBaseId" TEXT NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "puestoNombre" TEXT NOT NULL,
    "eventoNombre" TEXT NOT NULL,
    "ayudanteId" INTEGER NOT NULL,
    "ayudanteNombre" TEXT NOT NULL,
    "negocioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "stockRestante" INTEGER,
    "visto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avisos_stock_negocioId_visto_idx" ON "avisos_stock"("negocioId", "visto");
