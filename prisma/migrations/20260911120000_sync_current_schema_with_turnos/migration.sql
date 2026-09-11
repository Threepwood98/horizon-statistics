-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MANANA', 'TARDE');

-- DropForeignKey
ALTER TABLE "DailyReport" DROP CONSTRAINT "DailyReport_workerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_workerId_fkey";

-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_teamId_fkey";

-- DropIndex
DROP INDEX "idx_reports_worker_date";

-- DropIndex
DROP INDEX "User_workerId_key";

-- AlterTable
ALTER TABLE "DailyReport" DROP COLUMN "endAmount",
DROP COLUMN "startAmount",
DROP COLUMN "submittedAt",
DROP COLUMN "workerId",
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "amount" DECIMAL NOT NULL,
ADD COLUMN     "marked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalAmount" DECIMAL,
ADD COLUMN     "originalWebsiteId" BIGINT,
ADD COLUMN     "rectified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "resentAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "shift" "Shift" NOT NULL DEFAULT 'MANANA',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "workerId",
ADD COLUMN     "teamId" BIGINT;

-- DropTable
DROP TABLE "Worker";

-- CreateTable
CREATE TABLE "Balance" (
    "id" BIGSERIAL NOT NULL,
    "teamId" BIGINT NOT NULL,
    "websiteId" BIGINT NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoClose" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" "Shift" NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnoClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Balance_websiteId_idx" ON "Balance"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Balance_teamId_websiteId_key" ON "Balance"("teamId", "websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "TurnoClose_userId_date_shift_key" ON "TurnoClose"("userId", "date", "shift");

-- CreateIndex
CREATE INDEX "idx_reports_user_date" ON "DailyReport"("userId", "date");

-- CreateIndex
CREATE INDEX "idx_reports_status_date" ON "DailyReport"("status", "date");

-- CreateIndex
CREATE INDEX "idx_reports_blocked_site" ON "DailyReport"("websiteId", "status", "date", "shift");

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoClose" ADD CONSTRAINT "TurnoClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
