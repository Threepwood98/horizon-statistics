import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@better-auth/utils/password";
import { localDateKey } from "../lib/range";

function generateId(): string {
  return randomBytes(16).toString("hex");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEAMS = [{ name: "Equipo Alpha" }, { name: "Equipo Beta" }];

type UserSeed = {
  name: string;
  username: string;
  role: "admin" | "manager" | "leader" | "user";
  team: number | null;
  email: string;
};

const USERS: UserSeed[] = [
  // globales (sin equipo): 1 admin, 1 manager
  { name: "Carlos Admin", username: "admin", role: "admin", team: null, email: "admin@horizon.local" },
  { name: "Sofia Manager", username: "smanager", role: "manager", team: null, email: "manager@horizon.local" },
  // Equipo Alpha: 1 leader + 5 users
  { name: "Cristopher Diaz", username: "cdiaz", role: "leader", team: 0, email: "cdiaz@horizon.local" },
  { name: "Ana Lopez", username: "alopez", role: "user", team: 0, email: "ana@horizon.local" },
  { name: "Carlos Ruiz", username: "cruiz", role: "user", team: 0, email: "cruiz@horizon.local" },
  { name: "Elena Vega", username: "evega", role: "user", team: 0, email: "elena@horizon.local" },
  { name: "Jorge Ferrer", username: "jferrer", role: "user", team: 0, email: "jorge@horizon.local" },
  { name: "Marta Ibañez", username: "mibanez", role: "user", team: 0, email: "marta@horizon.local" },
  // Equipo Beta: 1 leader + 5 users
  { name: "Maria Garcia", username: "mgarcia", role: "leader", team: 1, email: "mgarcia@horizon.local" },
  { name: "Pedro Sanchez", username: "psanchez", role: "user", team: 1, email: "pedro@horizon.local" },
  { name: "Laura Martinez", username: "lmartinez", role: "user", team: 1, email: "laura@horizon.local" },
  { name: "Hugo Romero", username: "hromero", role: "user", team: 1, email: "hugo@horizon.local" },
  { name: "Nora Campos", username: "ncampos", role: "user", team: 1, email: "nora@horizon.local" },
  { name: "Ivan Rojas", username: "irojas", role: "user", team: 1, email: "ivan@horizon.local" },
];

const WEBSITES = ["TrendKick", "PixelBay", "NovaShop", "QuickCart"];

async function main() {
  console.log("Seeding database...");

  await prisma.dailyReport.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.website.deleteMany();
  await prisma.team.deleteMany();

  const teams = await Promise.all(
    TEAMS.map((t) => prisma.team.create({ data: { ...t, leader: "" } })),
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
        teamId: u.team === null ? undefined : teams[u.team].id,
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

  // Asignar el leader de cada equipo (role leader) al campo Team.leader
  for (const u of USERS) {
    if (u.role === "leader" && u.team !== null) {
      const leaderUser = users.find((x) => x.username === u.username);
      await prisma.team.update({
        where: { id: teams[u.team!].id },
        data: { leader: leaderUser!.name },
      });
    }
  }

  const websites = await Promise.all(
    WEBSITES.map((w) => prisma.website.create({ data: { name: w } })),
  );

  const userWorkers = users.filter((u) => u.role === "user");
  const userById = new Map(users.map((u) => [u.id, u]));

  const now = new Date();
  const nowKey = localDateKey(now);
  const reports = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().slice(0, 10);
    const isToday = dateKey === nowKey;

    for (const worker of userWorkers) {
      const reportsForDay = 1 + Math.floor(Math.random() * 2);

      for (let j = 0; j < reportsForDay; j++) {
        const website = websites[Math.floor(Math.random() * websites.length)];
        const amount = 5 + Math.random() * 80;

        let status: "accepted" | "sent" | "draft";
        if (isToday) {
          // hoy: pendientes de aprobación o borradores
          status = Math.random() < 0.4 ? "sent" : "draft";
        } else {
          const roll = Math.random();
          status = roll < 0.75 ? "accepted" : roll < 0.9 ? "sent" : "draft";
        }

        reports.push({
          userId: worker.id,
          websiteId: website.id,
          date,
          amount: Math.round(amount * 100) / 100,
          status,
          sentAt: status === "draft" ? null : new Date(date.getTime() + 1000 * 60 * 60 * 12),
          acceptedAt:
            status === "accepted"
              ? new Date(date.getTime() + 1000 * 60 * 60 * 13)
              : null,
        });
      }
    }
  }

  await prisma.dailyReport.createMany({ data: reports });

  // Balance = suma de ganancias de reportes ACEPTADOS por equipo+sitio
  const balanceMap = new Map<string, number>();
  for (const r of reports) {
    if (r.status !== "accepted") continue;
    const teamId = userById.get(r.userId)?.teamId;
    if (teamId === undefined || teamId === null) continue;
    const key = `${teamId}:${r.websiteId}`;
    balanceMap.set(key, (balanceMap.get(key) || 0) + Number(r.amount));
  }

  const balances = [];
  for (const [key, balance] of balanceMap) {
    const [teamId, websiteId] = key.split(":").map(BigInt);
    balances.push({
      teamId,
      websiteId,
      balance: Math.round(balance * 100) / 100,
    });
  }
  await prisma.balance.createMany({ data: balances });

  const countByStatus = reports.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`Created:
  - ${teams.length} teams
  - ${users.length} users (${users.filter((u) => u.role === "admin").length} admin, ${users.filter((u) => u.role === "manager").length} manager, ${users.filter((u) => u.role === "leader").length} leader, ${userWorkers.length} users)
  - ${websites.length} websites
  - ${reports.length} daily reports (${JSON.stringify(countByStatus)})
  - ${balances.length} balances
  Common password for all accounts: ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
