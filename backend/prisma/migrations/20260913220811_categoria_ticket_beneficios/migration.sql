-- AlterTable
ALTER TABLE "categorias_ticket" ADD COLUMN "beneficios" TEXT[] NOT NULL DEFAULT '{}';

-- Preserva la vieja "descripcion" (si tenía texto) como el primer beneficio,
-- en vez de perderla al migrar a la lista.
UPDATE "categorias_ticket" SET "beneficios" = ARRAY["descripcion"] WHERE "descripcion" IS NOT NULL AND "descripcion" <> '';

-- AlterTable
ALTER TABLE "categorias_ticket" DROP COLUMN "descripcion";
