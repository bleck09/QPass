-- CreateEnum
CREATE TYPE "TipoManilla" AS ENUM ('fisica', 'digital');

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "tipoManilla" "TipoManilla" NOT NULL DEFAULT 'fisica';
