-- ============================================================================
-- 1) String libre -> enum, PRESERVANDO los datos.
--    Prisma genera DROP COLUMN + ADD COLUMN para este cambio, que borraria los
--    valores existentes (y ademas fallaria por el NOT NULL). Se hace con
--    ALTER ... TYPE ... USING, que castea en sitio.
--    Los valores en BD ya coinciden 1:1 con los del enum (auditado antes).
-- ============================================================================

-- CreateEnum
CREATE TYPE "OrigenCambioPassword" AS ENUM ('self', 'recuperacion');

-- CreateEnum
CREATE TYPE "TipoAvisoStock" AS ENUM ('sin_stock', 'bajo');

-- AlterTable (cast en sitio, sin perder filas)
ALTER TABLE "cambios_password"
  ALTER COLUMN "origen" TYPE "OrigenCambioPassword"
  USING "origen"::"OrigenCambioPassword";

-- AlterTable (cast en sitio, sin perder filas)
ALTER TABLE "avisos_stock"
  ALTER COLUMN "tipo" TYPE "TipoAvisoStock"
  USING "tipo"::"TipoAvisoStock";

-- ============================================================================
-- 2) updatedAt en las tablas que no lo tenian.
--    Se agrega nullable, se rellena con la fecha de creacion de cada fila (para
--    no inventar que todo se "actualizo" al correr la migracion) y recien
--    entonces se pone NOT NULL. El DEFAULT queda para que cualquier INSERT que
--    no pase por Prisma (SQL crudo) siga funcionando.
-- ============================================================================

ALTER TABLE "eventos"           ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "compras"           ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "entradas"          ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "categorias_ticket" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "puestos"           ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "ventas"            ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "codigos_qr"        ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "eventos"           SET "updatedAt" = "createdAt"  WHERE "updatedAt" IS NULL;
UPDATE "compras"           SET "updatedAt" = "createdAt"  WHERE "updatedAt" IS NULL;
UPDATE "entradas"          SET "updatedAt" = "createdAt"  WHERE "updatedAt" IS NULL;
UPDATE "categorias_ticket" SET "updatedAt" = "createdAt"  WHERE "updatedAt" IS NULL;
UPDATE "puestos"           SET "updatedAt" = "createdAt"  WHERE "updatedAt" IS NULL;
UPDATE "ventas"            SET "updatedAt" = "createdAt"  WHERE "updatedAt" IS NULL;
-- codigos_qr no tiene createdAt: su equivalente es generadoEn.
UPDATE "codigos_qr"        SET "updatedAt" = "generadoEn" WHERE "updatedAt" IS NULL;

ALTER TABLE "eventos"           ALTER COLUMN "updatedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "compras"           ALTER COLUMN "updatedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "entradas"          ALTER COLUMN "updatedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "categorias_ticket" ALTER COLUMN "updatedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "puestos"           ALTER COLUMN "updatedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ventas"            ALTER COLUMN "updatedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "codigos_qr"        ALTER COLUMN "updatedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
