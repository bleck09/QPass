-- CreateTable
CREATE TABLE "codigos_recuperacion" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_recuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cambios_password" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "origen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cambios_password_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "codigos_recuperacion" ADD CONSTRAINT "codigos_recuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios_password" ADD CONSTRAINT "cambios_password_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
