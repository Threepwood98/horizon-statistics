-- AlterEnum
BEGIN;
CREATE TYPE "Shift_new" AS ENUM ('AM', 'PM');
ALTER TABLE "public"."DailyReport" ALTER COLUMN "shift" DROP DEFAULT;
ALTER TABLE "DailyReport" ALTER COLUMN "shift" TYPE "Shift_new" USING ("shift"::text::"Shift_new");
ALTER TABLE "TurnoClose" ALTER COLUMN "shift" TYPE "Shift_new" USING ("shift"::text::"Shift_new");
ALTER TYPE "Shift" RENAME TO "Shift_old";
ALTER TYPE "Shift_new" RENAME TO "Shift";
DROP TYPE "public"."Shift_old";
ALTER TABLE "DailyReport" ALTER COLUMN "shift" SET DEFAULT 'AM';
COMMIT;

-- AlterTable
ALTER TABLE "DailyReport" ALTER COLUMN "shift" SET DEFAULT 'AM';