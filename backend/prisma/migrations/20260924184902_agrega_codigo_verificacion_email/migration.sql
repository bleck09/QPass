-- CreateTable
CREATE TABLE "codigos_verificacion_email" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_verificacion_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codigos_verificacion_email_email_idx" ON "codigos_verificacion_email"("email");
