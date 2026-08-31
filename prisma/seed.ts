import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@better-auth/utils/password";

function generateId(): string {
  return randomBytes(16).toString("hex");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEAMS = [
  { name: "Equipo Alpha", leader: "Cristopher Diaz" },
  { name: "Equipo Beta", leader: "Maria Garcia" },
];

const USERS = [
  // admin
  { name: "Carlos Admin", username: "admin", role: "admin", team: 0, email: "admin@horizon.local" },
  // managers
  { name: "Cristopher Diaz", username: "cdiaz", role: "manager", team: 0, email: "cristopher@horizon.local" },
  { name: "Maria Garcia", username: "mgarcia", role: "manager", team: 1, email: "maria@horizon.local" },
  // users (equipo Alpha)
  { name: "Ana Lopez", username: "alopez", role: "user", team: 0, email: "ana@horizon.local" },
  { name: "Carlos Ruiz", username: "cruiz", role: "user", team: 0, email: "cruiz@horizon.local" },
  // users (equipo Beta)
  { name: "Pedro Sanchez", username: "psanchez", role: "user", team: 1, email: "pedro@horizon.local" },
  { name: "Laura Martinez", username: "lmartinez", role: "user", team: 1, email: "laura@horizon.local" },
];

const WEBSITES = ["TrendKick", "PixelBay", "NovaShop", "QuickCart"];

async function main() {
  console.log("Seeding database...");

  await prisma.dailyReport.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.website.deleteMany();
  await prisma.team.deleteMany();

  const teams = await Promise.all(
    TEAMS.map((t) => prisma.team.create({ data: t })),
  );

  const password = "Password123!";
  const userPasswordHash = await hashPassword(password);

  const users = [];
  for (const u of USERS) {
    const created = await prisma.user.create({
      data: {
        id: generateId(),
        name: u.name,
        email: u.email,
        emailVerified: false,
        role: u.role,
        username: u.username,
        displayUsername: u.username,
        teamId: teams[u.team].id,
      },
    });
    await prisma.account.create({
      data: {
        id: generateId(),
        userId: created.id,
        providerId: "credential",
        issuer: "local:credential",
        accountId: created.id,
        password: userPasswordHash,
      },
    });
    users.push(created);
  }

  const admin = users[0];
  await prisma.user.update({
    where: { id: admin.id },
    data: { role: "admin" },
  });

  const websites = await Promise.all(
    WEBSITES.map((w) => prisma.website.create({ data: { name: w } })),
  );

  const userWorkers = users.filter((u) => u.role === "user");

  const now = new Date();
  const reports = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const reportsPerDay = 2 + Math.floor(Math.random() * 3);

    for (let j = 0; j < reportsPerDay; j++) {
      const user = userWorkers[Math.floor(Math.random() * userWorkers.length)];
      const website = websites[Math.floor(Math.random() * websites.length)];

      const startAmount = 100 + Math.random() * 400;
      const change = 5 + Math.random() * 80;
      const endAmount = startAmount + change;

      reports.push({
        userId: user.id,
        websiteId: website.id,
        date,
        startAmount: Math.round(startAmount * 100) / 100,
        endAmount: Math.round(endAmount * 100) / 100,
      });
    }
  }

  await prisma.dailyReport.createMany({ data: reports });

  console.log(`Created:
  - ${teams.length} teams
  - ${users.length} users (1 admin, ${users.filter((u) => u.role === "manager").length} managers, ${userWorkers.length} users)
  - ${websites.length} websites
  - ${reports.length} daily reports
  Common password for all accounts: ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
