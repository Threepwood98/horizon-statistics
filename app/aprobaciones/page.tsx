import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, InboxIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toKey, formatDateLabelUTC } from "@/lib/range";
import { ApprovalList } from "@/components/reportes/approval-list";

export default async function AprobacionesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true },
  });
  if (!user) redirect("/login");

  const role = user.role;
  if (role === "user") redirect("/");

  const isGlobal = role === "manager" || role === "admin";
  const canManage = isGlobal;

  const reports = await prisma.dailyReport.findMany({
    where: { status: "sent" },
    include: { user: { include: { team: true } }, website: true },
    orderBy: [{ date: "desc" }, { userId: "asc" }],
  });

  const visible = isGlobal
    ? reports
    : reports.filter((r) => r.user?.teamId === user.teamId);

  const groups = new Map<string, (typeof visible)[number][]>();
  for (const r of visible) {
    const key = `${r.userId}:${toKey(r.date)}`;
    const list = groups.get(key) || [];
    list.push(r);
    groups.set(key, list);
  }

  const groupList = Array.from(groups.entries())
    .map(([key, items]) => {
      const rows = items.map((r) => ({
        site: r.website?.name ?? "Sin sitio",
        start: Number(r.startAmount),
        end: Number(r.endAmount),
      }));
      return {
        id: items[0].id,
        reportIds: items.map((r) => Number(r.id)),
        userName: items[0].user?.name ?? "Desconocido",
        dateLabel: formatDateLabelUTC(toKey(items[0].date)),
        rows,
      };
    })
    .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel))
    .sort((a, b) => (a.userName < b.userName ? -1 : 1));

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
        <ApprovalList
          groups={groupList.map((g) => ({
            id: Number(g.id),
            reportIds: g.reportIds,
            userName: g.userName,
            dateLabel: g.dateLabel,
            rows: g.rows,
          }))}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
