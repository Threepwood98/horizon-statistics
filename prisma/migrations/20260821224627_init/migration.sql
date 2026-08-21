-- CreateTable
CREATE TABLE "Team" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "leader" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" BIGINT,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" BIGSERIAL NOT NULL,
    "workerId" BIGINT,
    "websiteId" BIGINT,
    "date" DATE NOT NULL,
    "startAmount" DECIMAL NOT NULL,
    "endAmount" DECIMAL NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_reports_worker_date" ON "DailyReport"("workerId", "date");

-- CreateIndex
CREATE INDEX "idx_reports_website_date" ON "DailyReport"("websiteId", "date");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;
