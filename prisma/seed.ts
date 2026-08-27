import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.dailyReport.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.website.deleteMany();
  await prisma.team.deleteMany();

  // Create teams
  const team1 = await prisma.team.create({
    data: { name: "Equipo Alpha", leader: "Cristopher Diaz" },
  });
  const team2 = await prisma.team.create({
    data: { name: "Equipo Beta", leader: "Maria Garcia" },
  });

  // Create workers
  const workers = await Promise.all([
    prisma.worker.create({
      data: { name: "Cristopher Diaz", teamId: team1.id },
    }),
    prisma.worker.create({
      data: { name: "Ana Lopez", teamId: team1.id },
    }),
    prisma.worker.create({
      data: { name: "Carlos Ruiz", teamId: team1.id },
    }),
    prisma.worker.create({
      data: { name: "Maria Garcia", teamId: team2.id },
    }),
    prisma.worker.create({
      data: { name: "Pedro Sanchez", teamId: team2.id },
    }),
    prisma.worker.create({
      data: { name: "Laura Martinez", teamId: team2.id },
    }),
  ]);

  // Create websites
  const websites = await Promise.all([
    prisma.website.create({ data: { name: "TrendKick" } }),
    prisma.website.create({ data: { name: "PixelBay" } }),
    prisma.website.create({ data: { name: "NovaShop" } }),
    prisma.website.create({ data: { name: "QuickCart" } }),
  ]);

  // Generate 30 days of reports
  const now = new Date();
  const reports = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // 2-4 reports per day
    const reportsPerDay = 2 + Math.floor(Math.random() * 3);

    for (let j = 0; j < reportsPerDay; j++) {
      const worker = workers[Math.floor(Math.random() * workers.length)];
      const website = websites[Math.floor(Math.random() * websites.length)];

      const startAmount = 100 + Math.random() * 400;
      const change = -20 + Math.random() * 80; // -20 to +60
      const endAmount = startAmount + change;

      reports.push({
        workerId: worker.id,
        websiteId: website.id,
        date,
        startAmount: Math.round(startAmount * 100) / 100,
        endAmount: Math.round(endAmount * 100) / 100,
      });
    }
  }

  await prisma.dailyReport.createMany({ data: reports });

  console.log(`Created:
  - 2 teams
  - ${workers.length} workers
  - ${websites.length} websites
  - ${reports.length} daily reports`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
