-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('masculino', 'femenino', 'otro', 'prefiero_no_decir');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('ci', 'pasaporte', 'otro');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "pais" TEXT DEFAULT 'Bolivia',
ADD COLUMN     "sexo" "Sexo",
ADD COLUMN     "tipoDocumento" "TipoDocumento";
