import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, InboxIcon } from "lucide-react";

import prisma from "@/lib/prisma";
import { toKey } from "@/lib/range";
import { requireRole } from "@/lib/session";
import { isGlobalRole } from "@/lib/roles";
import { buildApprovalGroups, buildTeamGroups } from "@/lib/reports";
import { ApprovalList } from "@/components/reportes/approval-list";

export const metadata: Metadata = { title: "Aprobaciones" };

export default async function AprobacionesPage() {
  const user = await requireRole("admin", "manager", "leader");

  const role = user.role;
  const isGlobal = isGlobalRole(role);
  const canManage = isGlobal;

  const [reports, turnoCloses] = await Promise.all([
    prisma.dailyReport.findMany({
      where: {
        status: "sent",
        ...(isGlobal
          ? {}
          : { user: { is: { teamId: user.teamId } } }),
      },
      include: { user: { include: { team: true } }, website: true },
      orderBy: [{ date: "desc" }, { userId: "asc" }],
    }),
    prisma.turnoClose.findMany(),
  ]);

  const closedKeys = new Set(
    turnoCloses.map((t) => `${t.userId}:${toKey(t.date)}:${t.shift}`),
  );

  const groups = buildApprovalGroups(reports, closedKeys);
  const teamGroups = buildTeamGroups(groups);

  return (
    <div className="flex min-h-svh flex-col bg-background p-6 md:p-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon />
        Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <InboxIcon />
          Aprobaciones
        </h1>
        <p className="text-muted-foreground">
          Partes enviados por tu equipo{" "}
          {user.team ? `· ${user.team.name}` : isGlobal ? "· todos los equipos" : ""}
          {!canManage && role === "leader" && " · solo lectura"}
        </p>
      </div>

      <div className="mt-6 max-w-3xl">
        <ApprovalList teams={teamGroups} canManage={canManage} />
      </div>
    </div>
  );
}